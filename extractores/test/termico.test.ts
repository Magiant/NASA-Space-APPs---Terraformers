// Pruebas sin red del análisis térmico (olas de calor, cultivos y plagas) y del punto representativo.
// Adaptadas de las pruebas del prototipo "clima NASA por distrito" (docs/temperatura-termica.md).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { OlaCalor } from '@terraformes/compartido'
import {
  cobertura, detectarOlas, evaluarCultivo, evaluarPlaga, fechaZona, percentil, rangoFechas,
  umbralesOla, validarPerfilesPlaga, type Dia, type PerfilPlaga,
} from '../src/clima/termico.ts'
import { filasOlas } from '../src/clima/olas.ts'
import { contienePunto, puntoRepresentativo } from '../src/comun/geometria.ts'

const dia = (fecha: string, t: number | null = 20, tx: number | null = 30, tn: number | null = 10): Dia =>
  ({ fecha, temp_media_c: t, temp_max_c: tx, temp_min_c: tn })
const umbral30 = Array(12).fill(30)

// ---------- Fechas ----------

test('rangoFechas incluye ambos extremos y cruza meses y años bisiestos', () => {
  assert.deepEqual(rangoFechas('2024-02-28', '2024-03-01'), ['2024-02-28', '2024-02-29', '2024-03-01'])
  assert.equal(rangoFechas('1992-02-01', '1992-02-29').length, 29)
})

test('fecha local de Costa Rica cuando en UTC ya es el día siguiente', () => {
  assert.equal(fechaZona('America/Costa_Rica', new Date('2026-11-15T00:30:00Z')), '2026-11-14')
})

// ---------- Umbrales ----------

test('percentil con interpolación lineal', () => {
  assert.equal(percentil([10, 20, 30, 40, 50], 50), 30)
  assert.equal(percentil([10, 20], 90), 19)
  assert.equal(percentil([], 90), null)
})

test('umbral de ola: exige años suficientes por mes', () => {
  const hist = [
    ...rangoFechas('1991-02-01', '1991-02-28').map((f) => dia(f, 10, 20, 0)),
    ...rangoFechas('1992-02-01', '1992-02-29').map((f) => dia(f, 30, 40, 20)),
  ]
  assert.equal(typeof umbralesOla(hist, { aniosMin: 2 })[1], 'number') // febrero con 2 años
  assert.equal(umbralesOla(hist, { aniosMin: 3 })[1], null)           // pide 3 años: no hay umbral
  assert.equal(umbralesOla(hist)[0], null)                            // enero sin datos
})

// ---------- Olas de calor ----------

test('olas: conserva eventos que cruzan de mes y cuenta los días de cada mes', () => {
  const dias = ['2025-04-29', '2025-04-30', '2025-05-01', '2025-05-02', '2025-05-03'].map((f) => dia(f, 22, 31, 15))
  const r = detectarOlas(dias, umbral30, { diasOla: 3, mes: '2025-05' })
  assert.equal(r.length, 1)
  assert.equal(r[0].dias_totales, 5)
  assert.equal(r[0].dias_en_mes, 3)
  assert.equal(r[0].inicio, '2025-04-29')
  assert.equal(r[0].abierta_al_cierre_serie, true)
  assert.equal(r[0].temp_max_pico_c, 31)
})

test('olas: un dato faltante o un salto de fecha rompe la racha', () => {
  const conFaltante = [dia('2025-05-01', 20, 31), dia('2025-05-02', 20, 31), dia('2025-05-03', 20, null), dia('2025-05-04', 20, 31), dia('2025-05-05', 20, 31)]
  assert.equal(detectarOlas(conFaltante, umbral30).length, 0)
  const conSalto = [dia('2025-05-01', 20, 31), dia('2025-05-02', 20, 31), dia('2025-05-04', 20, 31)]
  assert.equal(detectarOlas(conSalto, umbral30).length, 0)
})

test('olas: igual al umbral no cuenta; mes sin umbral no genera olas', () => {
  const justo = ['2025-05-01', '2025-05-02', '2025-05-03'].map((f) => dia(f, 20, 30))
  assert.equal(detectarOlas(justo, umbral30).length, 0)
  const sinUmbral = Array(12).fill(null)
  assert.equal(detectarOlas(justo.map((d) => ({ ...d, temp_max_c: 45 })), sinUmbral).length, 0)
})

test('filas de olas_calor: forma válida para Zod, umbral del mes de inicio y ola cerrada', () => {
  const hist = [
    ...rangoFechas('2023-05-01', '2023-05-31').map((f) => dia(f, 20, 28)),
    ...rangoFechas('2024-05-01', '2024-05-31').map((f) => dia(f, 20, 28)),
    ...['2024-06-01'].map((f) => dia(f, 20, 28)),
  ]
  for (const f of ['2024-05-10', '2024-05-11', '2024-05-12', '2024-05-13']) hist.find((d) => d.fecha === f)!.temp_max_c = 35
  const filas = filasOlas('CR30101', 'nasa-power', hist)
  assert.equal(filas.length, 1)
  assert.equal(filas[0].dias, 4)
  assert.equal(filas[0].abierta, false)
  assert.equal(filas[0].umbral_c, 28)
  assert.doesNotThrow(() => OlaCalor.array().parse(filas))
})

// ---------- Cultivos ----------

const req = { cultivo_id: 'prueba', temp_opt_min_c: 18, temp_opt_max_c: 24, temp_abs_min_c: 5, temp_abs_max_c: 35 }

test('cultivos: la media aceptable no oculta extremos fuera de tolerancia', () => {
  const r = evaluarCultivo([dia('2025-05-01', 22, 36, 10)], req)
  assert.equal(r.estado, 'fuera_tolerancia_por_extremos')
  assert.equal(r.dias_sobre_max_abs, 1)
})

test('cultivos: apto, fuera del óptimo y sin requisitos', () => {
  assert.equal(evaluarCultivo([dia('2025-05-01', 22, 30, 15)], req).estado, 'apto')
  assert.equal(evaluarCultivo([dia('2025-05-01', 26, 30, 15)], req).estado, 'fuera_rango_optimo')
  assert.equal(evaluarCultivo([dia('2025-05-01')], { ...req, temp_abs_max_c: null }).estado, 'sin_requisitos')
})

test('cobertura insuficiente: no aprueba un cultivo ni avisa de una plaga', () => {
  const dias = [dia('2025-05-01', 22, 30, 15)]
  assert.equal(cobertura(dias, 31) < 0.9, true)
  assert.equal(evaluarCultivo(dias, req, { diasEsperados: 31 }).estado, 'datos_insuficientes')
  const p: PerfilPlaga = { id: 'p', nombre: 'P', fuente: 'Ficha de prueba', media_favorable_min_c: 20, media_favorable_max_c: 25, dias_favorables_alerta: 1 }
  assert.equal(evaluarPlaga(dias, p, { diasEsperados: 31 }).estado, 'datos_insuficientes')
})

// ---------- Plagas ----------

test('plagas: se exige el rango de la especie; más calor no equivale siempre a más riesgo', () => {
  const p: PerfilPlaga = { id: 'prueba', nombre: 'Plaga sintética', fuente: 'Solo prueba automatizada', media_favorable_min_c: 20, media_favorable_max_c: 25, dias_favorables_alerta: 2 }
  const r = evaluarPlaga([dia('2025-05-01', 23), dia('2025-05-02', 40)], p)
  assert.equal(r.dias_favorables, 1)
  assert.equal(r.estado, 'umbral_termico_no_alcanzado')
  assert.equal(evaluarPlaga([dia('2025-05-01', 23), dia('2025-05-02', 24)], p).estado, 'condiciones_favorables')
})

test('perfiles de plaga: rechaza umbrales sin fuente o imposibles; acepta lista vacía', () => {
  const base: PerfilPlaga = { id: 'x', nombre: 'X', fuente: 'Ficha SFE', media_favorable_min_c: 20, media_favorable_max_c: 25, dias_favorables_alerta: 2 }
  assert.throws(() => validarPerfilesPlaga([{ ...base, fuente: '' }]))
  assert.throws(() => validarPerfilesPlaga([{ ...base, media_favorable_min_c: 30 }]))
  assert.throws(() => validarPerfilesPlaga([{ ...base, dias_favorables_alerta: 0 }]))
  assert.deepEqual(validarPerfilesPlaga([]), [])
  assert.equal(validarPerfilesPlaga([base]).length, 1)
})

// ---------- Punto representativo ----------

test('geometría: un centroide en un hueco o entre partes se reemplaza por un punto interior', () => {
  const exterior = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
  const hueco = [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]]
  const conHueco = puntoRepresentativo({ type: 'Polygon', coordinates: [exterior, hueco] })
  assert.equal(conHueco.metodo, 'punto_interior_parte_mayor')
  assert.equal(contienePunto(conHueco.punto, [exterior, hueco]), true)

  const isla = [[20, 0], [21, 0], [21, 1], [20, 1], [20, 0]]
  const separado = puntoRepresentativo({ type: 'MultiPolygon', coordinates: [[exterior], [isla]] })
  assert.equal(contienePunto(separado.punto, [exterior]), true) // cae en la parte grande, no en la isla

  const forma_c = [[0, 0], [10, 0], [10, 2], [2, 2], [2, 8], [10, 8], [10, 10], [0, 10], [0, 0]]
  const c = puntoRepresentativo({ type: 'Polygon', coordinates: [forma_c] })
  assert.equal(contienePunto(c.punto, [forma_c]), true)
})
