// Pruebas sin red del tema 1 (clima) y de la base común. Correr: npm run test:extractores
import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as turf from '@turf/turf'
import { ClimaDiario } from '@terraformes/compartido'
import { cantidadPuntos, puntosDentro } from '../src/comun/puntos.ts'
import { esquemaDe } from '../src/comun/ejecutar.ts'
import { costoLlamadas, promediarPorDistrito, urlConsulta, VARIABLES, type PuntoDistrito } from '../src/clima/open-meteo.ts'
import { mesesEntre } from '../src/cargas-unicas/clima-historico.ts'

// Cuadrado de ~11 km × 11 km cerca de San José.
const cuadrado = turf.polygon([[[-84.1, 9.9], [-84.0, 9.9], [-84.0, 10.0], [-84.1, 10.0], [-84.1, 9.9]]]).geometry

test('cantidad de puntos: 5 en distritos pequeños, hasta 20 en grandes', () => {
  assert.equal(cantidadPuntos(1), 5)
  assert.equal(cantidadPuntos(null), 5)
  assert.equal(cantidadPuntos(150), 10)
  assert.equal(cantidadPuntos(2000), 20)
})

test('los puntos caen DENTRO del polígono, son los pedidos y salen iguales cada vez', () => {
  const a = puntosDentro(cuadrado, 9)
  assert.equal(a.length, 9)
  for (const p of a) assert.ok(turf.booleanPointInPolygon(p, cuadrado), `punto fuera: ${p}`)
  assert.deepEqual(puntosDentro(cuadrado, 9), a)
})

test('polígono diminuto: al menos un punto interior', () => {
  const mini = turf.polygon([[[-84, 10], [-83.9999, 10], [-83.9999, 10.0001], [-84, 10.0001], [-84, 10]]]).geometry
  const p = puntosDentro(mini, 5)
  assert.ok(p.length >= 1)
  assert.ok(turf.booleanPointInPolygon(p[0], mini))
})

test('promedio por distrito y día; sin ningún valor queda null, nunca 0', () => {
  const puntos: PuntoDistrito[] = [
    { codigo: 'CR10101', coord: [-84.08, 9.93] },
    { codigo: 'CR10101', coord: [-84.07, 9.94] },
  ]
  const dia = (temp: number | null, lluvia: number | null) => ({
    daily: {
      time: ['2026-11-10'],
      temperature_2m_mean: [temp], temperature_2m_max: [temp === null ? null : temp + 5],
      temperature_2m_min: [temp === null ? null : temp - 5], precipitation_sum: [lluvia],
      relative_humidity_2m_mean: [80], shortwave_radiation_sum: [15], wind_speed_10m_mean: [null],
      et0_fao_evapotranspiration: [3.5],
    },
  })
  const [fila] = promediarPorDistrito(puntos, [dia(20, 10), dia(22, null)])
  assert.equal(fila.temp_media_c, 21)
  assert.equal(fila.lluvia_mm, 10)       // promedia solo los puntos con dato
  assert.equal(fila.viento_ms, null)     // ningún punto con dato → null
  assert.equal(fila.fuente, 'open-meteo')
  assert.equal(fila.temp_corregida_altitud, true)
  assert.ok(ClimaDiario.safeParse(fila).success)
})

test('Zod rechaza códigos mal formados y valores imposibles', () => {
  const base = { codigo_distrito: 'CR10101', fecha: '2026-11-10', fuente: 'open-meteo', temp_media_c: 20, temp_max_c: 25,
    temp_min_c: 15, lluvia_mm: 3, humedad_relativa_pct: 80, radiacion_mj_m2: 12, viento_ms: 2, evapotranspiracion_ref_mm: 3 }
  assert.ok(ClimaDiario.safeParse(base).success)
  assert.equal(ClimaDiario.safeParse({ ...base, codigo_distrito: '10101' }).success, false)
  assert.equal(ClimaDiario.safeParse({ ...base, humedad_relativa_pct: 140 }).success, false)
  assert.equal(ClimaDiario.parse({ ...base, lluvia_mm: -999 }).lluvia_mm, null)
})

test('.pick() deja solo la llave y las columnas del tema', () => {
  const e = esquemaDe('terreno_zona', ['altitud_m'])
  const r = e.parse({ codigo_distrito: 'CR10101', altitud_m: 1150, pendiente_pct: 3 }) as Record<string, unknown>
  assert.deepEqual(Object.keys(r).sort(), ['altitud_m', 'codigo_distrito'])
})

test('URL de Open-Meteo con varios puntos, 8 variables y viento en m/s', () => {
  const u = new URL(urlConsulta('https://api.open-meteo.com/v1/forecast', [[-84.08, 9.93], [-85.45, 10.58]], { diasPasados: 7 }))
  assert.equal(u.searchParams.get('latitude'), '9.9300,10.5800')
  assert.equal(u.searchParams.get('daily')!.split(',').length, Object.keys(VARIABLES).length)
  assert.equal(u.searchParams.get('wind_speed_unit'), 'ms')
  assert.equal(u.searchParams.get('past_days'), '7')
})

test('costo de llamadas: 1 por punto hasta 14 días; 31 días ≈ 2.2', () => {
  assert.equal(costoLlamadas(100, 8), 100)
  assert.equal(Math.round(costoLlamadas(1, 31) * 10) / 10, 2.2)
})

test('meses de la carga histórica, recortando los extremos', () => {
  assert.deepEqual(mesesEntre('2025-01-15', '2025-03-10'), [
    ['2025-01-15', '2025-01-31'], ['2025-02-01', '2025-02-28'], ['2025-03-01', '2025-03-10'],
  ])
})
