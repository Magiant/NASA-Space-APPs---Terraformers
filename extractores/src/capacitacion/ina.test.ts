import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { COLUMNAS, cargarIna, normalizarCsv, type Destino, type Fila, type Resultado } from './ina.js';
import { crearDestino, fetchConReintentos } from './supabase.js';

const cabecera = COLUMNAS.join(',');
// Enlaces sintéticos usados únicamente con el destino simulado: nunca se consultan.
const fila = (id: number) => `INA,Curso ${id},siembra,papa,,40,CR3,https://ina.ac.cr/prueba-local/${id}`;
const csv = (n = 3) => [cabecera, ...Array.from({ length: n }, (_, i) => fila(i))].join('\n');
function memoria() {
  const filas = new Map<string, Fila>();
  const lotes: number[] = [];
  const resultados: Resultado[] = [];
  const destino: Destino = {
    async iniciar() { return 1; },
    async comprobarCultivos(ids) { assert.deepEqual(ids, ['papa']); },
    async upsert(datos, clave) {
      assert.equal(clave, 'url');
      lotes.push(datos.length);
      for (const dato of datos) filas.set(dato.url, dato);
    },
    async finalizar(_id, resultado) { resultados.push(resultado); },
  };
  return { destino, filas, lotes, resultados };
}

test('muestra: tres cursos, horas reales y desconocidos null', async () => {
  const muestra = await readFile(new URL('../../../docs/capacitacion/ejemplo-prueba.csv', import.meta.url), 'utf8');
  const filas = normalizarCsv(muestra);
  assert.deepEqual(filas.map(f => f.duracion_horas), [60, 80, 96]);
  assert.ok(filas.every(f => f.modalidad === null && f.provincias === null));
  const m = memoria();
  await assert.rejects(cargarIna(async () => muestra, m.destino), /solo se permiten/);
  assert.equal(m.lotes.length, 0);
});

test('CSV maneja BOM, comillas, comas, decimales y sin dato', () => {
  const filas = normalizarCsv(`\uFEFF${cabecera}\r\nINA,"Siembra, mantenimiento",sin dato,-999,,"40,5",CR1|CR5,https://ina.ac.cr/prueba-local/x`);
  assert.equal(filas[0].titulo, 'Siembra, mantenimiento');
  assert.equal(filas[0].duracion_horas, 40.5);
  assert.equal(filas[0].tema, null);
  assert.equal(filas[0].cultivo_id, null);
  assert.deepEqual(filas[0].provincias, ['CR1', 'CR5']);
  assert.equal(normalizarCsv(`${cabecera}\n${fila(1).replace(',40,', ',-999,')}`)[0].duracion_horas, null);
});

test('rechaza horas inválidas, modalidad y códigos de provincia', () => {
  for (const invalida of [fila(0).replace(',40,', ',0,'), fila(0).replace(',40,', ',abc,'),
    fila(0).replace(',CR3,', ',CR30110,'), fila(0).replace('papa,,', 'papa,remota,')])
    assert.throws(() => normalizarCsv(`${cabecera}\n${invalida}`));
});

test('rechaza cabeceras duplicadas, URLs repetidas y página general', () => {
  assert.throws(() => normalizarCsv(cabecera.replace('tema', 'titulo')), /Cabecera/);
  assert.throws(() => normalizarCsv(`${csv()}\n${fila(0)}`), /URL repetida/);
  assert.throws(() => normalizarCsv(`${cabecera}\n${fila(0).replace('/prueba-local/0', '/SitePages/nucleos/Agropecuario.aspx')}`), /página general/);
});

test('251 filas: lotes 250 + 1; segunda ejecución no duplica cursos', async () => {
  const m = memoria();
  const pausas: number[] = [];
  for (let i = 0; i < 2; i++) await cargarIna(async () => csv(251), m.destino, async ms => { pausas.push(ms); });
  assert.deepEqual(m.lotes, [250, 1, 250, 1]);
  assert.equal(m.filas.size, 251);
  assert.deepEqual(pausas, [500, 500]);
  assert.equal(m.resultados[1].estado, 'ok');
});

test('fila inválida en segundo lote impide TODAS las escrituras y registra error', async () => {
  const m = memoria();
  await assert.rejects(cargarIna(async () => `${csv(250)}\n${fila(250).replace(',40,', ',mal,')}`, m.destino));
  assert.equal(m.lotes.length, 0);
  assert.equal(m.resultados[0].estado, 'error');
  assert.equal(m.resultados[0].registros, 0);
});

test('cultivo inexistente y archivo ilegible se registran sin guardar cursos', async () => {
  const m = memoria();
  m.destino.comprobarCultivos = async () => { throw new Error('cultivo_id inexistente'); };
  await assert.rejects(cargarIna(async () => csv(), m.destino), /inexistente/);
  await assert.rejects(cargarIna(async () => { throw new Error('Archivo ilegible'); }, m.destino), /ilegible/);
  assert.equal(m.lotes.length, 0);
  assert.equal(m.resultados.length, 2);
});

test('fallo en lote posterior registra cuántas filas sí se guardaron', async () => {
  const m = memoria();
  const original = m.destino.upsert;
  m.destino.upsert = async (filas, clave) => {
    if (filas.length === 1) throw new Error('Base no disponible');
    await original(filas, clave);
  };
  await assert.rejects(cargarIna(async () => csv(251), m.destino, async () => {}), /no disponible/);
  assert.equal(m.resultados[0].registros, 250);
  assert.equal(m.resultados[0].estado, 'error');
});

test('cabecera sola produce sin_cambios; archivo vacío produce error', async () => {
  const m = memoria();
  m.destino.comprobarCultivos = async ids => { assert.deepEqual(ids, []); };
  assert.equal((await cargarIna(async () => cabecera, m.destino)).estado, 'sin_cambios');
  await assert.rejects(cargarIna(async () => '', m.destino), /cabecera/);
});

test('si falla el registro de inicio no se lee ni se guarda', async () => {
  const m = memoria();
  m.destino.iniciar = async () => { throw new Error('Sin auditoría'); };
  await assert.rejects(cargarIna(async () => { assert.fail('No debe leer'); }, m.destino), /auditoría/);
  assert.equal(m.lotes.length, 0);
});

test('429 respeta Retry-After y 503 reintenta; 400 e INSERT de registro no reintentan', async () => {
  const pausas: number[] = [];
  let llamadas = 0;
  const mock: typeof fetch = async () => {
    llamadas++;
    return llamadas === 1 ? new Response('', { status: 429, headers: { 'Retry-After': '3' } })
      : llamadas === 2 ? new Response('', { status: 503 }) : new Response('{}');
  };
  await fetchConReintentos(mock, async ms => { pausas.push(ms); })('https://example.invalid', {
    method: 'POST', headers: { Prefer: 'resolution=merge-duplicates' },
  });
  assert.deepEqual(pausas, [3000, 2000]);
  for (const [method, status] of [['GET', 400], ['POST', 503]] as const) {
    let intentos = 0;
    await fetchConReintentos(async () => { intentos++; return new Response('', { status }); }, async () => {})
      ('https://example.invalid', { method });
    assert.equal(intentos, 1);
  }
});

test('adaptador Supabase envía on_conflict=url, columnas esperadas y auditoría', async () => {
  const fetchAnterior = globalThis.fetch;
  const urlAnterior = process.env.SUPABASE_URL;
  const keyAnterior = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const peticiones: { url: URL; method: string; body: unknown; headers: Headers }[] = [];
  try {
    process.env.SUPABASE_URL = 'https://example.invalid';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'clave-ficticia-de-prueba';
    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      peticiones.push({ url, method, body, headers: new Headers(init?.headers) });
      if (url.pathname.endsWith('/cultivos'))
        return Response.json([{ id: 'papa' }]);
      if (url.pathname.endsWith('/extracciones')) return Response.json({ id: 12 });
      return new Response(null, { status: 201 });
    };
    await cargarIna(async () => csv(), crearDestino());
    const upsert = peticiones.find(p => p.url.pathname.endsWith('/capacitaciones'))!;
    assert.equal(upsert.url.searchParams.get('on_conflict'), 'url');
    assert.match(upsert.headers.get('prefer')!, /resolution=merge-duplicates/);
    assert.deepEqual(Object.keys((upsert.body as Fila[])[0]).sort(), [...COLUMNAS].sort());
    assert.equal(peticiones.at(-1)!.method, 'PATCH');
    assert.equal((peticiones.at(-1)!.body as Resultado).estado, 'ok');
  } finally {
    globalThis.fetch = fetchAnterior;
    if (urlAnterior === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = urlAnterior;
    if (keyAnterior === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = keyAnterior;
  }
});
