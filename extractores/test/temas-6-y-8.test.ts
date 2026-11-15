// Pruebas sin red de los extractores automáticos de los temas 6 (INA) y 8 (pronóstico subestacional IMN),
// con recortes reales de las páginas guardados el 14-nov-2026 en test/fixtures/.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { Alerta, Capacitacion } from '@terraformes/compartido'
import { cultivoCandidato, leerNucleo, MINIMO_CURSOS, slug, URL_NUCLEO } from '../src/capacitacion/ina-web.ts'
import { leerSubestacional, rangoFechas, URL_SUBESTACIONAL } from '../src/riesgos/imn-subestacional.ts'
import { textoDeHtml } from '../src/comun/http.ts'

const leer = (f: string) => readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8')

// ---------- Tema 6 · INA ----------

test('INA: lee los 104 cursos de la página real con subsector, tipo y horas', () => {
  const filas = leerNucleo(leer('ina-nucleo-agropecuario.html'))
  assert.equal(filas.length, 104)
  const cafe = filas.find((f) => f.titulo === 'Cultivo de café')!
  assert.equal(cafe.duracion_horas, 80)
  assert.equal(cafe.tema, 'Agricultura · Capacitación')
  assert.equal(cafe.cultivo_id, 'cafe')
  assert.equal(cafe.url, `${URL_NUCLEO}#agricultura-capacitacion-cultivo-de-cafe`)
  assert.equal(cafe.modalidad, null)   // la página no lo dice: no se inventa
  assert.equal(cafe.provincias, null)
  assert.ok(filas.some((f) => f.titulo === 'Prácticas de conservación de suelos'))
  assert.ok(Capacitacion.array().safeParse(filas).success)
})

test('INA: URLs únicas aunque un título se repita en dos pestañas', () => {
  const filas = leerNucleo(leer('ina-nucleo-agropecuario.html'))
  assert.equal(new Set(filas.map((f) => f.url)).size, filas.length)
  const buenas = filas.filter((f) => f.titulo === 'Buenas prácticas en la agricultura')
  assert.equal(buenas.length, 2)
  assert.deepEqual(buenas.map((f) => f.duracion_horas).sort(), [48, 51])
})

test('INA: cultivo candidato solo para "Cultivo de X"', () => {
  assert.equal(cultivoCandidato('Cultivo de plátano'), 'platano')
  assert.equal(cultivoCandidato('Cultivo de tomate y chile'), 'tomate-y-chile') // no existe en cultivos → null al cargar
  assert.equal(cultivoCandidato('Manejo integrado de plagas'), null)
  assert.equal(slug('Gestión de la producción agropecuaria'), 'gestion-de-la-produccion-agropecuaria')
})

test(`INA: si la página cambia y hay menos de ${MINIMO_CURSOS} cursos, falla en vez de guardar a medias`, () => {
  assert.throws(() => leerNucleo('<html><body>Página en mantenimiento</body></html>'), /página pudo cambiar/)
})

// ---------- Tema 8 · IMN ----------

test('IMN: fechas en los formatos que usa la página', () => {
  assert.deepEqual(rangoFechas('Válido del 16 de noviembre - 13 de diciembre 2026'), { inicio: '2026-11-16', fin: '2026-12-13' })
  assert.deepEqual(rangoFechas('16 al 22 de noviembre de 2026'), { inicio: '2026-11-16', fin: '2026-11-22' })
  assert.deepEqual(rangoFechas('30 de noviembre- 6 de diciembre de 2026'), { inicio: '2026-11-30', fin: '2026-12-06' })
  assert.deepEqual(rangoFechas('7-13 de diciembre de 2026'), { inicio: '2026-12-07', fin: '2026-12-13' })
  assert.deepEqual(rangoFechas('28 de diciembre - 24 de enero 2027'), { inicio: '2026-12-28', fin: '2027-01-24' })
  assert.deepEqual(rangoFechas('del 1 al 7 de setiembre de 2026'), { inicio: '2026-09-01', fin: '2026-09-07' })
})

test('IMN: periodo completo + 4 semanas, ids estables, nivel null y alcance nacional', () => {
  const filas = leerSubestacional(leer('imn-subestacional.html'))
  assert.equal(filas.length, 5)
  const [general, ...semanas] = filas
  assert.equal(general.id_externo, 'subestacional-2026-11-16_2026-12-13')
  assert.equal(general.inicio, '2026-11-16T00:00:00-06:00')
  assert.equal(general.fin, '2026-12-13T23:59:59-06:00')
  assert.match(general.descripcion!, /estación seca/)
  assert.match(general.descripcion!, /Eventos extremos:/)
  assert.deepEqual(semanas.map((s) => s.id_externo.split('-semana-')[1]), ['1', '2', '3', '4'])
  assert.equal(semanas[3].inicio, '2026-12-07T00:00:00-06:00')
  for (const f of filas) {
    assert.equal(f.fuente, 'imn')
    assert.equal(f.tipo, 'pronostico_subestacional')
    assert.equal(f.nivel, null)
    assert.equal(f.codigos_distrito, null)
    assert.equal(f.url, URL_SUBESTACIONAL)
  }
  assert.ok(Alerta.array().safeParse(filas).success)
  // Correrlo dos veces da los mismos ids (upsert por fuente,id_externo: no duplica).
  assert.deepEqual(leerSubestacional(leer('imn-subestacional.html')).map((f) => f.id_externo), filas.map((f) => f.id_externo))
})

test('IMN: si falta el periodo de validez, falla en vez de guardar algo incompleto', () => {
  assert.throws(() => leerSubestacional('<div>Pronóstico en actualización</div>'), /Válido del/)
})

test('texto de HTML: sin etiquetas, entidades ni espacio antes de puntos', () => {
  assert.equal(textoDeHtml('<p>Pacífico&nbsp;<strong>Central</strong> .</p>​'), 'Pacífico Central.')
})
