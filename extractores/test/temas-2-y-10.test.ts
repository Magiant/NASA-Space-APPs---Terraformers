// Pruebas sin internet de los temas 2 y 10 con los distritos CR10101, CR30110 y CR50501.
// Corren con el runner de Node, como el resto de extractores:  node --test test/temas-2-y-10.test.ts
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { booleanPointInPolygon } from '@turf/turf'

/** Lo mínimo de `expect` sobre node:assert, para que las pruebas se lean igual. */
const expect = (real: unknown) => ({
  toBe: (e: unknown) => assert.strictEqual(real, e),
  toEqual: (e: unknown) => assert.deepStrictEqual(real, e),
  toBeNull: () => assert.strictEqual(real, null),
  toMatchObject: (e: Record<string, unknown>) => assert.deepStrictEqual(Object.fromEntries(Object.keys(e).map((k) => [k, (real as any)[k]])), e),
  toBeCloseTo: (e: number, digitos = 2) => assert.ok(Math.abs((real as number) - e) < 10 ** -digitos / 2, `${real} ≈ ${e}`),
})
import { TABLAS, type Distrito } from '../../packages/compartido/src/esquemas/datos.ts'
import { puntosDelDistrito, promedio } from '../src/humedad/utilidades.ts'
import * as openMeteo from '../src/humedad/open-meteo.ts'
import * as power from '../src/humedad/power.ts'
import { aFila, texturaUsda, valorSuelo } from '../src/cargas-unicas/soilgrids.ts'
import type { Rejilla } from '../src/humedad/utilidades.ts'

const distritos: Distrito[] = JSON.parse(readFileSync(new URL('./fixtures/distritos-muestra.json', import.meta.url), 'utf8'))
const llano = distritos.find((d) => d.codigo_distrito === 'CR30110')!
const valida = (tabla: keyof typeof TABLAS, filas: unknown[]) => TABLAS[tabla].esquema.array().safeParse(filas).success

describe('puntos dentro del distrito (PTS-01)', () => {
  it('5 + 1 por cada 25 km², todos dentro del polígono, siempre los mismos', () => {
    const n = distritos.map((d) => [d.codigo_distrito, puntosDelDistrito(d).length])
    expect(n).toEqual([['CR10101', 5], ['CR30110', 6], ['CR50501', 10]])
    for (const p of puntosDelDistrito(llano)) expect(booleanPointInPolygon([p.lng, p.lat], llano.poligono as any)).toBe(true)
    expect(puntosDelDistrito(llano)).toEqual(puntosDelDistrito(llano))
  })
  it('sin polígono usa el punto del distrito', () => {
    expect(puntosDelDistrito({ ...llano, poligono: null })).toEqual([{ codigo: 'CR30110', lng: llano.lng, lat: llano.lat }])
  })
  it('el promedio ignora "sin dato" y nunca inventa 0', () => {
    expect(promedio([0.4, null, -999, 0.5])).toEqual({ valor: 0.45, n: 2 })
    expect(promedio([null, -999])).toEqual({ valor: null, n: 0 })
  })
})

describe('Open-Meteo → humedad_suelo', () => {
  // Respuestas reales (archive-api, 10–11 nov 2026) recortadas a la capa 0–7 cm.
  const r1 = { daily: { time: ['2026-11-10', '2026-11-11'], soil_moisture_0_to_7cm_mean: [0.433, 0.398], soil_temperature_0_to_7cm_mean: [23.2, 23.6] } }
  const r2 = { daily: { time: ['2026-11-10', '2026-11-11'], soil_moisture_0_to_7cm_mean: [0.503, null], soil_temperature_0_to_7cm_mean: [15.1, null] } }

  it('promedia los puntos por día y capa, y cuenta n_puntos válidos', () => {
    const acum = new Map()
    openMeteo.acumular(acum, { codigo: 'CR30110', lng: 0, lat: 0 }, r1 as any)
    openMeteo.acumular(acum, { codigo: 'CR30110', lng: 0, lat: 0 }, r2 as any)
    const filas = openMeteo.aFilas(acum)
    // Las capas sin dato en la respuesta recortada no generan filas.
    expect(filas).toEqual([
      { codigo_distrito: 'CR30110', fecha: '2026-11-10', fuente: 'open-meteo', profundidad: '0-7cm', humedad_m3_m3: 0.468, humedad_relativa: null, percentil_sequia: null, temp_suelo_c: 19.2, n_puntos: 2 },
      { codigo_distrito: 'CR30110', fecha: '2026-11-11', fuente: 'open-meteo', profundidad: '0-7cm', humedad_m3_m3: 0.398, humedad_relativa: null, percentil_sequia: null, temp_suelo_c: 23.6, n_puntos: 1 },
    ])
    expect(valida('humedad_suelo', filas)).toBe(true)
  })
})

describe('NASA POWER → humedad_suelo', () => {
  it('ajusta el punto a su celda de 0,5° × 0,625°', () => {
    expect(power.celda(9.933, -83.923)).toEqual({ lat: 10, lng: -83.75 })
  })
  it('promedia celdas, convierte AAAAMMDD y omite los días -999 (todavía sin publicar)', () => {
    const celdaA = { GWETTOP: { '20261111': 0.9, '20261112': -999 }, GWETROOT: { '20261111': 0.91, '20261112': -999 }, GWETPROF: { '20261111': 0.92, '20261112': -999 } }
    const celdaB = { GWETTOP: { '20261111': 0.8, '20261112': -999 }, GWETROOT: { '20261111': 0.81, '20261112': -999 }, GWETPROF: { '20261111': 0.82, '20261112': -999 } }
    const filas = power.aFilas('CR30110', [celdaA, celdaB])
    expect(filas.map((f) => [f.fecha, f.profundidad, f.humedad_relativa, f.n_puntos])).toEqual([
      ['2026-11-11', 'superficie', 0.85, 2], ['2026-11-11', 'raiz', 0.86, 2], ['2026-11-11', 'perfil', 0.87, 2],
    ])
    expect(valida('humedad_suelo', filas)).toBe(true)
  })
})

describe('SoilGrids → suelos_zona', () => {
  it('clasifica la textura USDA', () => {
    expect(texturaUsda(37, 34.9, 28.1)).toBe('franco arcillosa') // Llano Grande (real)
    expect(texturaUsda(40, 40, 20)).toBe('franca')
    expect(texturaUsda(90, 5, 5)).toBe('arenosa')
    expect(texturaUsda(10, 30, 60)).toBe('arcillosa')
    expect(texturaUsda(5, 85, 10)).toBe('limosa')
  })

  // Ráster de 2×2 píxeles de 1° que cubre lng −84..−82, lat 11..9; 0 = sin dato.
  const raster = (v: number[]): Rejilla => ({ datos: v, ancho: 2, c0: 0, f0: 0, x0: -84, y0: 11, dx: 1, dy: -1, nodata: 0 })
  it('lee el píxel correcto y trata 0 como sin dato', () => {
    expect(valorSuelo(raster([54, 0, 0, 0]), { lng: -83.9, lat: 10.5 }, 10)).toBe(5.4)
    expect(valorSuelo(raster([54, 0, 0, 0]), { lng: -82.5, lat: 10.5 }, 10)).toBeNull()
    expect(valorSuelo(raster([54, 0, 0, 0]), { lng: -90, lat: 10.5 }, 10)).toBeNull()
  })
  it('un distrito sin dato (urbano) queda todo en null con n_puntos 0', () => {
    const vacio = raster([0, 0, 0, 0])
    const fila = aFila(llano, { phh2o: vacio, clay: vacio, sand: vacio, soc: vacio, nitrogen: vacio, cec: vacio, bdod: vacio })
    expect(fila).toMatchObject({ ph: null, arcilla_pct: null, textura: null, n_puntos: 0 })
    expect(valida('suelos_zona', [fila])).toBe(true)
  })
})

// ---------------------------------------------------------------- Tema 10: cultivos, GAEZ, decreto, WDPA, censo
import * as ecocrop from '../src/cargas-unicas/ecocrop-requisitos.ts'
import * as gaez from '../src/cargas-unicas/gaez.ts'
import * as cu from '../src/cargas-unicas/capacidad-uso.ts'
import { porcentajeProtegido } from '../src/cargas-unicas/areas-protegidas.ts'
import * as censo from '../src/cargas-unicas/censo.ts'

const cultivo = (id: string, nombre: string, nombre_cientifico: string, ecocrop_id: string | null = null) =>
  ({ id, nombre, nombre_cientifico, ecocrop_id }) as any

describe('EcoCrop → requisitos_cultivo', () => {
  // Fila real de EcoCrop_DB.csv (OpenCLIM), recortada.
  const csv = 'EcoPortCode,ScientificName,COMNAME,TOPMN,TOPMX,TMIN,TMAX,ROPMN,ROPMX,RMIN,RMAX,PHOPMN,PHOPMX,PHMIN,PHMAX,ALTMX,DEPR,TEXTR,DRAR\n' +
    '1971,Solanum tuberosum,"potato, papa, patata",15,25,7,30,500,800,250,2000,5,6.2,4.2,8.5,2800,shallow (20-50 cm),"heavy, medium, light","well (dry spells), excessive (dry/moderately dry)"\n'
  it('lee CSV con comas dentro de comillas', () => {
    const [f] = ecocrop.leerCsv(csv)
    expect(f).toMatchObject({ ScientificName: 'Solanum tuberosum', COMNAME: 'potato, papa, patata', ALTMX: '2800' })
  })
  it('une por nombre científico y arma la fila con texturas y drenaje en español', () => {
    const { filas, sinPareja } = ecocrop.unir([cultivo('papa', 'Papa', 'Solanum tuberosum L.'), cultivo('pitahaya', 'Pitahaya', 'Hylocereus undatus')], ecocrop.leerCsv(csv))
    expect(sinPareja).toEqual(['pitahaya'])
    expect(filas[0]).toMatchObject({
      cultivo_id: 'papa', temp_opt_min_c: 15, temp_abs_max_c: 30, lluvia_opt_max_mm: 800, ph_opt_max: 6.2, altitud_max_m: 2800,
      texturas: ['pesada', 'media', 'ligera'], drenaje: 'bueno, excesivo', profundidad_suelo: 'poco profundo (20-50 cm)',
    })
    expect(valida('requisitos_cultivo', filas)).toBe(true)
  })
})

describe('GAEZ → gaez_zona', () => {
  // Ventana de 2×2 píxeles de 1°: lng −84..−82, lat 11..9; −9 = sin dato.
  const ventana = (datos: number[]) => ({ datos, ancho: 2, c0: 0, f0: 0, x0: -84, y0: 11, dx: 1, dy: -1, nodata: -9 })
  const pts = [{ codigo: 'CR30110', lng: -83.5, lat: 10.5 }, { codigo: 'CR30110', lng: -82.5, lat: 10.5 }]
  it('aptitud 0–10000 → %, mes desde el día del año, −9 = sin dato', () => {
    const fila = gaez.aFila('CR30110', 'cafe', pts, { aptitud: ventana([1865, 6392, 0, 0]), inicio: ventana([135, 135, 0, 0]), duracion: ventana([240, -9, 0, 0]) })
    expect(fila).toEqual({ codigo_distrito: 'CR30110', cultivo_id: 'cafe', aptitud_pct: 41.29, mes_siembra: 5, duracion_ciclo_dias: 240 })
    expect(valida('gaez_zona', [fila])).toBe(true)
  })
  it('aptitud 0 es un dato válido (no apto), no "sin dato"', () => {
    expect(gaez.aFila('CR30110', 'papa', pts, { aptitud: ventana([0, 0, 0, 0]) }).aptitud_pct).toBe(0)
    expect(gaez.aFila('CR30110', 'papa', pts, { aptitud: ventana([-9, -9, 0, 0]) }).aptitud_pct).toBeNull()
  })
  it('día del año → mes', () => {
    expect([1, 31, 32, 135, 365].map(gaez.mesDelDia)).toEqual([1, 1, 2, 5, 12])
  })
})

describe('Capacidad de uso (Decreto 41960)', () => {
  it('reproduce el ejemplo práctico del decreto en los factores que tenemos: 12 % + FAL + fertilidad baja → IV', () => {
    // Decreto, sección 6: pendiente 12 % (III), textura FAL (II), fertilidad baja (IV) → clase IV.
    expect(cu.claseIndicativa(12, { textura: 'franco arcillo limosa', arcilla_pct: 30, ph: 5.0 })).toBe(4)
  })
  it('rangos de pendiente del Cuadro 1', () => {
    expect([0, 3, 4, 8, 12, 16, 30, 31, 55, 56, 75, 80].map(cu.clasePorPendiente)).toEqual([1, 1, 2, 2, 3, 4, 4, 6, 6, 7, 7, 8])
  })
  it('textura gruesa es clase V; arcillosa > 60 % arcilla es "muy fina"', () => {
    expect(cu.clasePorTextura(cu.categoriaTextura('arenosa', 5)!)).toBe(5)
    expect(cu.categoriaTextura('arcillosa', 65)).toBe('muy fina')
  })
  it('la fertilidad no se aplica con pendiente ≥ 55 %; sin pendiente no se clasifica', () => {
    expect(cu.claseIndicativa(60, { textura: 'franca', arcilla_pct: 20, ph: 4.0 })).toBe(7)
    expect(cu.claseIndicativa(null, { textura: 'franca', arcilla_pct: 20, ph: 6.8 })).toBeNull()
  })
  it('Llano Grande con su suelo real y una pendiente de ejemplo de 20 %', () => {
    const [fila] = cu.calcularCapacidadUso([{ codigo_distrito: 'CR30110', pendiente_pct: 20 }], [{ codigo_distrito: 'CR30110', textura: 'franco arcillosa', arcilla_pct: 28.1, ph: 5.42 } as any])
    expect(fila).toEqual({ codigo_distrito: 'CR30110', capacidad_uso_clase: 4 })
  })
})

describe('Áreas protegidas (WDPA)', () => {
  const cuadro = (x: number, y: number, l: number) => ({ type: 'Polygon' as const, coordinates: [[[x, y], [x + l, y], [x + l, y + l], [x, y + l], [x, y]]] })
  it('mide el % cubierto y no cuenta dos veces áreas que se traslapan', () => {
    const distrito = cuadro(-84, 10, 0.1)
    expect(porcentajeProtegido(distrito, [])).toBe(0)
    expect(porcentajeProtegido(distrito, [cuadro(-84, 10, 0.05)])).toBeCloseTo(25, 0)
    expect(porcentajeProtegido(distrito, [cuadro(-84, 10, 0.05), cuadro(-84, 10, 0.05)])).toBeCloseTo(25, 0)
    expect(porcentajeProtegido(distrito, [cuadro(-85, 9, 3)])).toBe(100)
  })
})

describe('Censo 2014 → censo_canton', () => {
  const distritosCanton = [{ codigo_canton: 'CR210', canton: 'San Carlos' }, { codigo_canton: 'CR301', canton: 'Cartago' }]
  const cultivos = [cultivo('papa', 'Papa', 'Solanum tuberosum'), cultivo('pina', 'Piña', 'Ananas comosus')]
  it('encuentra el encabezado, une cantón y cultivo sin importar tildes o mayúsculas', () => {
    const tabla = [
      ['Cuadro 12. Superficie sembrada por cultivo según cantón'],
      ['Cantón', 'Cultivo', 'Superficie (ha)', 'Fincas'],
      ['SAN CARLOS', 'Piña', '12 345,5', '210'],
      ['Cartago', 'papa', 1500, 320],
      ['Cartago', 'Chayote', 90, 15],
      ['Atlantis', 'Papa', 1, 1],
    ]
    const r = censo.aFilas(tabla, distritosCanton, cultivos)
    expect(r.filas).toEqual([
      { codigo_canton: 'CR210', cultivo_id: 'pina', area_ha: 12345.5, fincas: 210 },
      { codigo_canton: 'CR301', cultivo_id: 'papa', area_ha: 1500, fincas: 320 },
    ])
    expect(r.sinCultivo).toEqual(['Chayote'])
    expect(r.sinCanton).toEqual(['Atlantis'])
    expect(valida('censo_canton', r.filas)).toBe(true)
  })
})

describe('Correcciones de la revisión', () => {
  it('EcoCrop: una variedad usa su propia fila, no la de la especie', () => {
    const csv = 'EcoPortCode,ScientificName,TOPMN,TOPMX,ALTMX\n1,Zea mays,18,33,4000\n2,Zea mays ssp. saccharata,16,24,2000\n'
    const { filas } = ecocrop.unir([cultivo('maiz', 'Maíz', 'Zea mays'), cultivo('maiz-dulce', 'Maíz dulce', 'Zea mays ssp. saccharata')], ecocrop.leerCsv(csv))
    expect(filas.map((f) => [f.cultivo_id, f.temp_opt_min_c, f.altitud_max_m])).toEqual([['maiz', 18, 4000], ['maiz-dulce', 16, 2000]])
  })

  it('WDPA: un área con polígono roto se omite y no detiene el cálculo', () => {
    const cuadro = (x: number, y: number, l: number) => ({ type: 'Polygon' as const, coordinates: [[[x, y], [x + l, y], [x + l, y + l], [x, y + l], [x, y]]] })
    const roto = { type: 'Polygon' as const, coordinates: null as any }
    const omitidas = { n: 0 }
    expect(porcentajeProtegido(cuadro(-84, 10, 0.1), [roto, cuadro(-84, 10, 0.05)], omitidas)).toBeCloseTo(25, 0)
    expect(omitidas.n).toBe(1)
  })
})
