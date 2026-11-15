// Pruebas sin red de los temas 4 (estudio hídrico) y 7 (temperatura) y del cliente de AppEEARS.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AguaZona, ClimaDiario } from '@terraformes/compartido'
import { corregirTemperatura, filasDistrito, PARAMETROS } from '../src/clima/power.ts'
import { celda, claveCelda, type SerieCelda } from '../src/comun/power.ts'
import { fechaAppeears, leerCsvAppeears } from '../src/comun/appeears.ts'
import { agregarClima, agregarEcostress, balance, claveAgua, diasDelPeriodo, inicioPeriodoCompleto, lunesDe } from '../src/agua/agregar.ts'
import { CAPAS, limpiarMuestras } from '../src/agua/appeears.ts'
import { diferencias } from '../src/clima/comparar.ts'

// ---------- Tema 7 ----------

test('corrección por altitud: 1000 m más alto que la celda → 6.5 °C menos', () => {
  assert.equal(corregirTemperatura(20, 1500, 500), 13.5)
  assert.equal(corregirTemperatura(20, 100, 600), 23.25)
  assert.equal(corregirTemperatura(null, 1500, 500), null)
  assert.equal(corregirTemperatura(20, null, 500), null) // sin altitud real no se guarda sin corregir
})

test('celdas de POWER: puntos cercanos comparten celda (una sola consulta)', () => {
  assert.equal(claveCelda(celda(9.93, -84.07)), claveCelda(celda(9.95, -84.1)))
  assert.notEqual(claveCelda(celda(9.93, -84.07)), claveCelda(celda(10.6, -85.45)))
})

const serie = (elev: number, t2m: Record<string, number>, lluvia: Record<string, number>): SerieCelda => ({
  elevacionM: elev,
  parametros: { T2M: t2m, T2M_MAX: t2m, T2M_MIN: t2m, PRECTOTCORR: lluvia, RH2M: {}, ALLSKY_SFC_SW_DWN: {}, WS2M: {} },
})

test('filas de POWER: corrige cada punto, promedia, -999 → null y omite días sin dato', () => {
  const series = new Map([['A', serie(1000, { '20261101': 20, '20261102': -999, '20261103': -999 }, { '20261101': 5, '20261102': 7, '20261103': -999 })]])
  const filas = filasDistrito('CR30110', [{ celda: 'A', altitudM: 2000 }, { celda: 'A', altitudM: 1000 }], series)
  assert.equal(filas.length, 2) // el 3 de noviembre no tiene ningún dato → no se guarda
  assert.equal(filas[0].temp_media_c, 16.75) // (13.5 + 20) / 2
  assert.equal(filas[0].lluvia_mm, 5)
  assert.equal(filas[1].temp_media_c, null) // -999 → null, nunca 0
  assert.equal(filas[1].lluvia_mm, 7)
  for (const f of filas) {
    assert.equal(f.fuente, 'nasa-power')
    assert.equal(f.temp_corregida_altitud, true)
    assert.equal(f.evapotranspiracion_ref_mm, null)
    assert.ok(ClimaDiario.safeParse(f).success)
  }
  assert.equal(Object.keys(PARAMETROS).length, 7)
})

test('comparación POWER vs Open-Meteo solo en días con las dos fuentes', () => {
  const f = (fuente: string, fecha: string, t: number) => ({ codigo_distrito: 'CR30110', fecha, fuente, temp_media_c: t, temp_max_c: t + 5, temp_min_c: t - 5 })
  const [d] = diferencias([f('nasa-power', '2026-11-01', 15), f('open-meteo', '2026-11-01', 14), f('nasa-power', '2026-11-02', 30)])
  assert.equal(d.dias, 1)
  assert.equal(d.difMedia, 1)
})

// ---------- Tema 4 ----------

test('semanas de lunes a domingo, también en cambio de año', () => {
  assert.equal(lunesDe('2026-11-14'), '2026-11-09') // sábado → lunes 9
  assert.equal(lunesDe('2026-11-09'), '2026-11-09')
  assert.equal(lunesDe('2026-01-01'), '2025-12-29') // jueves 1 de enero
  assert.equal(diasDelPeriodo('2024-02-01', 'mes'), 29)
  assert.equal(diasDelPeriodo('2026-11-09', 'semana'), 7)
})

test('solo periodos enteros: el borde inicial de la ventana no se guarda a medias', () => {
  assert.equal(inicioPeriodoCompleto('2026-09-19', 'mes'), '2026-10-01')
  assert.equal(inicioPeriodoCompleto('2026-10-01', 'mes'), '2026-10-01')
  assert.equal(inicioPeriodoCompleto('2026-12-15', 'mes'), '2027-01-01')
  assert.equal(inicioPeriodoCompleto('2026-09-19', 'semana'), '2026-09-21') // sábado → lunes siguiente
  assert.equal(inicioPeriodoCompleto('2026-09-21', 'semana'), '2026-09-21')
})

test('balance: usa la ET real si existe; si no, la ET0; sin lluvia → null', () => {
  assert.equal(balance(100, 60, 80), 40)
  assert.equal(balance(100, null, 80), 20)
  assert.equal(balance(null, 60, 80), null)
  assert.equal(balance(100, null, null), null)
})

test('agregar clima_diario por semana y mes; la ET real de ECOSTRESS entra al balance', () => {
  const dia = (fecha: string, lluvia: number | null, et0: number | null) => ({ codigo_distrito: 'CR10101', fecha, lluvia_mm: lluvia, evapotranspiracion_ref_mm: et0 })
  const dias = [dia('2026-11-09', 10, 3), dia('2026-11-10', null, 3), dia('2026-11-11', 5, null), dia('2026-11-16', 2, 4)]
  const semanas = agregarClima(dias, 'semana', 'open-meteo', new Map([[claveAgua('CR10101', '2026-11-16', 'semana'), 1]]))
  const s1 = semanas.find((s) => s.periodo === '2026-11-09')!
  assert.equal(s1.lluvia_mm, 15)
  assert.equal(s1.evapotranspiracion_ref_mm, 6)
  assert.equal(s1.balance_mm, 9) // sin ET real → lluvia − ET0
  const s2 = semanas.find((s) => s.periodo === '2026-11-16')!
  assert.equal(s2.balance_mm, 1) // con ET real (1 mm) → 2 − 1
  const [mes] = agregarClima(dias, 'mes', 'open-meteo')
  assert.equal(mes.periodo, '2026-11-01')
  assert.equal(mes.lluvia_mm, 17)
  assert.ok(AguaZona.array().safeParse([...semanas, mes]).success)
})

test('ECOSTRESS: nube/agua por producto; ET del periodo = ET diaria media × días; sin dato no hay fila', () => {
  const m = (id: string, fecha: string, et: number | null, esi: number | null, nubeEt = 0, nubeEsi = 0) => ({
    id, fecha,
    valores: {
      'ECO_L3T_JET.002/ETdaily': et, 'ECO_L3T_JET.002/cloud': nubeEt, 'ECO_L3T_JET.002/water': 0,
      'ECO_L4T_ESI.002/ESI': esi, 'ECO_L4T_ESI.002/cloud': nubeEsi, 'ECO_L4T_ESI.002/water': 0,
    },
  })
  const obs = limpiarMuestras([
    m('CR50101#1', '2026-11-10', 3, 0.5),
    m('CR50101#2', '2026-11-12', 5, 0.7),
    m('CR50101#3', '2026-11-12', 9, 0.1, 1, 1), // nube en los dos productos → fuera
    m('CR50101#4', '2026-11-12', 4, 2),         // ESI fuera de 0–1 → null (la ET sí sirve)
    m('CR50101#5', '2026-11-13', null, 0.6, 0, 0),
    m('CR10101#1', '2026-11-10', null, null),
  ])
  assert.equal(obs.length, 4)
  const [semana] = agregarEcostress(obs, 'semana')
  assert.equal(semana.codigo_distrito, 'CR50101')
  assert.equal(semana.evapotranspiracion_real_mm, 28) // media (3+5+4)/3 = 4 mm/día × 7
  assert.equal(semana.estres_hidrico_esi, 0.6)        // (0.5+0.7+0.6)/3
  assert.equal(semana.lluvia_mm, null)
  assert.ok(AguaZona.safeParse(semana).success)
  assert.equal(agregarEcostress(obs, 'semana').some((f) => f.codigo_distrito === 'CR10101'), false)
})

// ---------- AppEEARS ----------

test('AppEEARS: fechas MM-DD-AAAA y lectura del CSV de muestras', () => {
  assert.equal(fechaAppeears('2026-11-09'), '11-09-2026')
  const csv = [
    'ID,Latitude,Longitude,Date,Category,ECO_L4T_ESI_002_ESI,ECO_L4T_ESI_002_cloud,ECO_L4T_ESI_002_water',
    'CR50101#1,10.6,-85.4,2026-11-10,CR50101,0.42,0,0',
    'CR50101#2,10.6,-85.4,2026-11-10,CR50101,,1,0',
  ].join('\n')
  const filas = leerCsvAppeears(csv, CAPAS)
  assert.equal(filas.length, 2)
  assert.equal(filas[0].valores['ECO_L4T_ESI.002/ESI'], 0.42)
  assert.equal(filas[1].valores['ECO_L4T_ESI.002/ESI'], null)
  assert.equal(filas[0].valores['ECO_L3T_JET.002/ETdaily'], undefined) // capa en otro CSV
})
