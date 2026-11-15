// Pruebas sin red de la carga de distritos (tema 0).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Distrito } from '@terraformes/compartido'
import { aDistrito, aligerar, armarDistritos, type FeaturePoligono, type FeaturePunto } from '../src/cargas-unicas/distritos.ts'

const cuadro = (x: number, y: number, l = 0.1) => [[x, y], [x + l, y], [x + l, y + l], [x, y + l], [x, y]]
const props = (codigo: string, extra: Record<string, unknown> = {}) => ({
  adm3_pcode: codigo, adm3_name: 'Distrito ' + codigo, adm2_pcode: codigo.slice(0, 5), adm2_name: 'Cantón',
  adm1_pcode: codigo.slice(0, 3), adm1_name: 'Provincia', area_sqkm: 12.34567, ...extra,
})
const poligono = (codigo: string, x = -84, y = 9.9): FeaturePoligono => ({ properties: props(codigo), geometry: { type: 'Polygon', coordinates: [cuadro(x, y)] } })
const punto = (codigo: string, x: number, y: number): FeaturePunto => ({ properties: { adm3_pcode: codigo }, geometry: { type: 'Point', coordinates: [x, y] } })

test('distrito: códigos, nombres, área y punto oficial; pasa el esquema', () => {
  const d = aDistrito(poligono('CR30110'), punto('CR30110', -83.95, 9.95))
  assert.equal(d.codigo_distrito, 'CR30110')
  assert.equal(d.codigo_canton, 'CR301')
  assert.equal(d.codigo_provincia, 'CR3')
  assert.equal(d.area_km2, 12.346)
  assert.deepEqual([d.lng, d.lat], [-83.95, 9.95])
  assert.doesNotThrow(() => Distrito.parse(d))
})

test('distrito: punto oficial fuera del polígono o ausente → punto interior', () => {
  const fuera = aDistrito(poligono('CR30110'), punto('CR30110', -80, 9))
  assert.ok(fuera.lng > -84 && fuera.lng < -83.9 && fuera.lat > 9.9 && fuera.lat < 10)
  const sinPunto = aDistrito(poligono('CR30110'))
  assert.ok(sinPunto.lng > -84 && sinPunto.lng < -83.9)
})

test('Isla del Coco (lat 5,5) pasa el esquema de distritos', () => {
  const d = aDistrito(poligono('CR60110', -87.1, 5.5), punto('CR60110', -87.06, 5.53))
  assert.doesNotThrow(() => Distrito.parse(d))
})

test('aligerar: quita vértices casi alineados y redondea a 5 decimales', () => {
  const muchos = [[-84, 9.9], [-83.95, 9.900001], [-83.9, 9.9], [-83.9, 10], [-84, 10], [-84, 9.9]]
  const r = aligerar({ type: 'Polygon', coordinates: [muchos.map(([x, y]) => [x + 0.0000012345, y])] })
  assert.ok(r.coordinates[0].length < muchos.length)
  for (const [x] of r.coordinates[0] as number[][]) assert.equal(Math.round(x * 1e5) / 1e5, x)
})

test('armar: exige los 492 distritos y rechaza códigos repetidos', () => {
  assert.throws(() => armarDistritos([poligono('CR10101')], []), /492/)
  assert.throws(() => armarDistritos([poligono('CR10101'), poligono('CR10101')], []), /repetidos/)
})
