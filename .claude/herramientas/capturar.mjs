// Herramienta de los agentes de revisión (.claude/agents): abre la web en un navegador sin ventana, recorre las
// páginas pedidas en varios anchos de pantalla y deja capturas, el texto visible y una lista de problemas que se
// pueden detectar solos (página más ancha que la pantalla, "undefined" o "NaN" a la vista, botones muy chicos,
// imágenes sin descripción, errores de la consola).
//
// Necesita la web corriendo en modo demo (datos de ejemplo, sin tocar Supabase):
//   VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npm run dev -w web -- --port 5199 --strictPort
//
// Uso:
//   node .claude/herramientas/capturar.mjs --rutas=sembrar,precios,zona/CR30101 [--anchos=360,390,768,1280]
//        [--tema=crema|azul] [--idioma=es|en] [--entrar] [--salida=<carpeta>] [--origen=http://localhost:5199]
//
//   --entrar   entra con la cuenta demo (agricultor@demo.cr) para ver las páginas privadas (mi-finca, dron…).
//   Rutas útiles: (vacío = inicio) sembrar zona/CR30101 cultivo/frijol precios alertas capacitaciones ajustes
//   creditos ingresar registrarse mi-finca fincas/nueva siembras/nueva siembras/s1 siembras/s1/cerrar
//   reportar-plaga historial dron
//
// Deja en la carpeta de salida (por defecto %TEMP%/terrafarm-revision/<fecha>): <ruta>-<ancho>-<n>.png,
// <ruta>-<ancho>.txt y reporte.json. Los PNG se pueden abrir con la herramienta Read para mirarlos.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const arg = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=') ?? d;
const ORIGEN = arg('origen', 'http://localhost:5199');
const RUTAS = arg('rutas', '').split(',').map((r) => r.trim().replace(/^#?\/?/, ''));
const ANCHOS = arg('anchos', '360,390,768,1280').split(',').map(Number);
const TEMA = arg('tema', 'crema');
const IDIOMA = arg('idioma', 'es');
const ENTRAR = process.argv.includes('--entrar');
const SALIDA = arg('salida', join(tmpdir(), 'terrafarm-revision', new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')));
mkdirSync(SALIDA, { recursive: true });

const NAVEGADORES = [
  process.env.NAVEGADOR,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);
const NAVEGADOR = NAVEGADORES.find((n) => existsSync(n));
if (!NAVEGADOR) throw new Error('No encontré Edge ni Chrome. Indique la ruta con la variable NAVEGADOR.');
try { await fetch(ORIGEN); } catch { throw new Error(`La web no responde en ${ORIGEN}. Levántela en modo demo (ver arriba).`); }

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const perfil = mkdtempSync(join(tmpdir(), 'tf-revision-'));
const nav = spawn(NAVEGADOR, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${perfil}`, 'about:blank'], { stdio: 'ignore' });
let puerto = '';
for (let i = 0; i < 100 && !puerto; i++) { await esperar(200); const f = join(perfil, 'DevToolsActivePort'); if (existsSync(f)) puerto = readFileSync(f, 'utf8').split('\n')[0]; }
const pagina = (await (await fetch(`http://127.0.0.1:${puerto}/json`)).json()).find((t) => t.type === 'page');

const ws = new WebSocket(pagina.webSocketDebuggerUrl);
let id = 0; const pendientes = new Map(); const consola = [];
ws.onmessage = (e) => {
  const m = JSON.parse(String(e.data));
  if (m.id && pendientes.has(m.id)) { pendientes.get(m.id)(m); pendientes.delete(m.id); return; }
  if (m.method === 'Runtime.exceptionThrown') consola.push('Excepción: ' + (m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text).split('\n')[0]);
  // Los avisos de React Router sobre su próxima versión no son errores de la página.
  if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning') && !JSON.stringify(m.params.args).includes('Future Flag')) {
    consola.push(`console.${m.params.type}: ` + m.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 300));
  }
};
await new Promise((r, x) => { ws.onopen = r; ws.onerror = x; });
const cmd = (method, params = {}) => new Promise((r) => { const i = ++id; pendientes.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const js = async (expr) => (await cmd('Runtime.evaluate', { expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true })).result?.result?.value;
const foto = async (nombre) => { const r = await cmd('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(SALIDA, nombre), Buffer.from(r.result.data, 'base64')); };
const poner = (sel, v) => js(`const i = document.querySelector(${JSON.stringify(sel)}); const p = Object.getOwnPropertyDescriptor(i.constructor.prototype, 'value').set; p.call(i, ${JSON.stringify(v)}); i.dispatchEvent(new Event('input', { bubbles: true })); return 'ok'`);

// Problemas que se detectan solos en la página abierta.
const REVISAR = `
  const vw = innerWidth, problemas = [];
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 1 && r.height > 1 && s.visibility !== 'hidden' && s.display !== 'none' && !el.closest('.oculto, .sr-only'); };
  const nombre = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '');
  if (document.documentElement.scrollWidth > vw + 1) {
    const anchos = [...document.querySelectorAll('body *')].filter((el) => visible(el) && el.getBoundingClientRect().right > vw + 1 && getComputedStyle(el).position !== 'fixed')
      .filter((el) => !el.closest('[style*="overflow"], .tabla-envoltura, .grafico, .mapa'))
      .slice(0, 6).map((el) => nombre(el) + ' (' + Math.round(el.getBoundingClientRect().right - vw) + ' px de más)');
    problemas.push({ tipo: 'desborde', detalle: 'La página es más ancha que la pantalla (' + document.documentElement.scrollWidth + ' px en ' + vw + ' px): ' + anchos.join(', ') });
  }
  const texto = document.body.innerText;
  for (const [re, que] of [[/\\bundefined\\b/, 'undefined'], [/\\bNaN\\b/, 'NaN'], [/\\[object Object\\]/, '[object Object]'], [/\\bnull\\b/, 'null'], [/\\$\\{|\\{\\{/, 'plantilla sin reemplazar'], [/\\b[a-z]+\\.[a-z]+\\.[a-z]+[A-Z]\\w*\\b/, 'posible clave de traducción']]) {
    const m = texto.match(re);
    if (m) { const i = texto.indexOf(m[0]); problemas.push({ tipo: 'codigo-visible', detalle: que + ': «…' + texto.slice(Math.max(0, i - 50), i + 50).replace(/\\s+/g, ' ') + '…»' }); }
  }
  const chicos = [...document.querySelectorAll('a, button, select, input, [role=button], [role=tab], [role=radio]')]
    .filter((el) => visible(el) && !el.closest('.mapa, svg') && el.type !== 'hidden')
    .filter((el) => { const r = el.getBoundingClientRect(); return (r.height < 40 || r.width < 40) && !(el.tagName === 'A' && getComputedStyle(el).display === 'inline'); })
    .slice(0, 10).map((el) => nombre(el) + (el.closest('footer') ? ' [pie]' : '') + ' «' + (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 30) + '» ' + Math.round(el.getBoundingClientRect().width) + '×' + Math.round(el.getBoundingClientRect().height));
  if (chicos.length) problemas.push({ tipo: 'toque-chico', detalle: 'Controles de menos de 40 px (difíciles de tocar con el dedo): ' + chicos.join('; ') });
  const sinAlt = [...document.querySelectorAll('img')].filter((i) => visible(i) && !i.hasAttribute('alt')).map((i) => i.src.split('/').pop()).slice(0, 5);
  if (sinAlt.length) problemas.push({ tipo: 'imagen-sin-alt', detalle: sinAlt.join(', ') });
  const sinNombre = [...document.querySelectorAll('input, select, textarea')].filter((el) => visible(el) && el.type !== 'hidden' && !el.labels?.length && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')).map(nombre).slice(0, 5);
  if (sinNombre.length) problemas.push({ tipo: 'campo-sin-etiqueta', detalle: sinNombre.join(', ') });
  const cortadas = [...document.querySelectorAll('h1, h2, h3, button, .insignia, .etiqueta, label')].filter((el) => visible(el) && el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'visible').map((el) => nombre(el) + ' «' + el.innerText.trim().slice(0, 30) + '»').slice(0, 5);
  if (cortadas.length) problemas.push({ tipo: 'texto-cortado', detalle: cortadas.join('; ') });
  // Palabras partidas a la mitad ("Excelent / e"): una sola palabra que ocupa más de una línea.
  const partidas = [];
  const recorrer = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = recorrer.nextNode(); n && partidas.length < 6; n = recorrer.nextNode()) {
    const el = n.parentElement;
    if (!el || !visible(el)) continue;
    for (const m of n.textContent.matchAll(/[\\p{L}\\p{N}]{4,}/gu)) {
      const rango = document.createRange(); rango.setStart(n, m.index); rango.setEnd(n, m.index + m[0].length);
      const lineas = new Set([...rango.getClientRects()].filter((c) => c.width > 0).map((c) => Math.round(c.top)));
      if (lineas.size > 1) { partidas.push(nombre(el) + ' «' + m[0] + '»'); break; }
    }
  }
  if (partidas.length) problemas.push({ tipo: 'palabra-partida', detalle: 'Palabras cortadas en dos líneas: ' + partidas.join('; ') });
  return { alto: document.documentElement.scrollHeight, problemas };
`;

const reporte = { origen: ORIGEN, tema: TEMA, idioma: IDIOMA, anchos: ANCHOS, paginas: [] };
try {
  await cmd('Page.enable'); await cmd('Runtime.enable');
  await cmd('Page.navigate', { url: `${ORIGEN}/` }); await esperar(1500);
  await js(`localStorage.clear(); localStorage.setItem('tf-tema', ${JSON.stringify(JSON.stringify(TEMA))}); localStorage.setItem('tf-idioma', ${JSON.stringify(JSON.stringify(IDIOMA))}); return 1`);
  if (ENTRAR) {
    await cmd('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await cmd('Page.navigate', { url: `${ORIGEN}/?r=1#/ingresar` }); await esperar(3000);
    await poner('input[type="email"]', 'agricultor@demo.cr'); await poner('input[type="password"]', 'demo1234');
    await js(`document.querySelector('form').requestSubmit(); return 1`); await esperar(2500);
  }
  for (const ruta of RUTAS) {
    for (const ancho of ANCHOS) {
      const movil = ancho < 900;
      const alto = movil ? Math.round(ancho * 2.16) : 860;
      consola.length = 0;
      await cmd('Emulation.setDeviceMetricsOverride', { width: ancho, height: alto, deviceScaleFactor: 1, mobile: movil });
      await cmd('Page.navigate', { url: `${ORIGEN}/?r=${Math.random()}#/${ruta}` }); await esperar(3500);
      // Correccion - Poll: una ruta con "?" (por ejemplo alertas?ver=alertas) cortaba la herramienta en Windows,
      // que no admite "?" en nombres de archivo; ahora "?", "=" y "&" tambien se cambian por "_".
      const base = `${(ruta || 'inicio').replace(/[\/:?=&]/g, '_')}-${ancho}`;
      const r = await js(REVISAR);
      writeFileSync(join(SALIDA, `${base}.txt`), (await js(`return document.body.innerText`)) ?? '');
      const pantallas = Math.min(4, Math.ceil(r.alto / alto));
      for (let i = 0; i < pantallas; i++) {
        await js(`window.scrollTo(0, ${i * (alto - 60)}); return 1`); await esperar(300);
        await foto(`${base}-${i}.png`);
      }
      const problemas = [...r.problemas, ...[...new Set(consola)].map((c) => ({ tipo: 'consola', detalle: c }))];
      reporte.paginas.push({ ruta: ruta || '(inicio)', ancho, capturas: pantallas, problemas });
      console.log(`${(ruta || 'inicio').padEnd(22)} ${String(ancho).padStart(4)} px · ${pantallas} capturas · ${problemas.length ? problemas.map((p) => p.tipo).join(', ') : 'sin problemas automáticos'}`);
    }
  }
} finally {
  writeFileSync(join(SALIDA, 'reporte.json'), JSON.stringify(reporte, null, 2));
  console.log(`\nCapturas y reporte en: ${SALIDA}`);
  nav.kill(); await esperar(500);
  try { rmSync(perfil, { recursive: true, force: true }); } catch {}
}
