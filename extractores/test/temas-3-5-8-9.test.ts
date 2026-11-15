// Pruebas sin internet de lo que faltaba: precios PIMA (tema 3), catálogo y rotaciones (tema 5),
// amenazas estimadas (tema 8) y el cálculo de aptitud.   node --test test/temas-3-5-8-9.test.ts
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { RequisitoCultivo } from '@terraformes/compartido'
import { leerBoletin } from '../src/precios/pima.ts'
import { CATALOGO, filasCultivos, filasSecuencias, regla } from '../src/cultivos/catalogo.ts'
import { amenazasDe } from '../src/riesgos/estimar-amenazas.ts'
import { aptitudDe, mesSiembra, notaRango } from '../src/aptitud/calcular.ts'

// Copia recortada de `pdftotext -layout` del boletín PIMA del 13-11-2026 (incluye la fila repetida de la página 2).
const BOLETIN = `
 Fecha de Plaza: 13/11/2026
                               Producto                Unidad de comercialización mayorista   Mínimo      Máximo       Moda        Promedio
Apio verde (mata)                                     Mata                                     1,200.00    1,500.00    1,300.00      1,350.00
Papa blanca primera                                   Malla (45 kg)                           23,000.00   28,000.00   25,000.00     24,652.17
Piña - grande                                         Unidad                                   1,000.00    1,200.00    1,100.00      1,075.00
Fecha: 13 de Noviembre del 2026                                Fecha de Plaza: 13/11/2026                                     Pag. 1 de 2
Papa blanca primera                                   Malla (45 kg)                           23,000.00   28,000.00   25,000.00     24,652.17
Chile dulce primera                                   Caja plástica                           25,000.00   27,000.00   26,000.00     25,833.33
`

describe('Tema 3 · boletín PIMA', () => {
  const filas = leerBoletin(BOLETIN)
  it('lee la fecha, separa producto y variedad y no repite la página 2', () => {
    assert.equal(filas.length, 4)
    const papa = filas.find((f) => f.cultivo_id === 'papa')!
    assert.deepEqual(
      { fecha: papa.fecha_dato, producto: papa.producto, variedad: papa.variedad, unidad: papa.unidad, prom: papa.precio_promedio, min: papa.precio_min },
      { fecha: '2026-11-13', producto: 'papa', variedad: 'blanca primera', unidad: 'Malla (45 kg)', prom: 24652.17, min: 23000 },
    )
  })
  it('une con el catálogo solo lo que es del catálogo', () => {
    assert.equal(filas.find((f) => f.producto_original === 'Piña - grande')?.cultivo_id, 'pina')
    assert.equal(filas.find((f) => f.producto_original === 'Piña - grande')?.variedad, 'grande')
    const apio = filas.find((f) => f.producto_original.startsWith('Apio'))!
    assert.equal(apio.cultivo_id, null)
    assert.equal(apio.producto, 'apio verde (mata)')
  })
  it('falla si el PDF cambió de formato', () => {
    assert.throws(() => leerBoletin('Fecha de Plaza: 13/11/2026\nsin tabla'), /sin filas/)
    assert.throws(() => leerBoletin('nada'), /Fecha de Plaza/)
  })
})

describe('Tema 5 · catálogo y rotaciones', () => {
  const de = (id: string) => CATALOGO.find((c) => c.id === id)!
  it('13 cultivos con los mismos ids que la web y sin campos internos', () => {
    const filas = filasCultivos()
    assert.equal(filas.length, 13)
    assert.ok(filas.every((f) => !('plagas' in f) && !('local' in f) && !('permanente' in f)))
  })
  it('aplica las reglas CUL-01 a CUL-06', () => {
    assert.equal(regla(de('papa'), de('tomate')).tipo, 'prohibida') // misma familia
    assert.equal(regla(de('zanahoria'), de('papa')).tipo, 'prohibida') // nematodo en el suelo
    assert.equal(regla(de('frijol'), de('maiz')).tipo, 'recomendada') // aprovecha el N
    assert.equal(regla(de('papa'), de('frijol')).tipo, 'recomendada') // repone el N
    assert.equal(regla(de('cafe'), de('frijol')).tipo, 'neutral') // permanente
    assert.equal(filasSecuencias().length, 13 * 13)
  })
})

describe('Tema 8 · amenazas estimadas', () => {
  const lluvia = [20, 10, 15, 60, 250, 300, 200, 260, 320, 340, 150, 40]
  it('volcán por distancia, sequía por meses secos y deslizamiento por pendiente', () => {
    const f = amenazasDe({ codigo_distrito: 'CR30101', lat: 9.86, lng: -83.92 }, { altitud_m: 1430, pendiente_pct: 22 }, lluvia)
    const por = Object.fromEntries(f.map((x) => [x.tipo, x]))
    assert.equal(por.volcan.nivel, 'alto') // ≈ 16 km del Irazú
    assert.equal(por.deslizamiento.nivel, 'alto')
    assert.deepEqual(por.deslizamiento.meses, [5, 6, 8, 9, 10])
    assert.equal(por.sequia.nivel, 'alto') // 4 meses < 50 mm
    assert.deepEqual(por.sequia.meses, [1, 2, 3, 12])
    assert.equal(por.inundacion, undefined)
    assert.ok(f.every((x) => x.fuente.startsWith('estimado:')))
  })
  it('inundación solo en zonas bajas y planas', () => {
    const f = amenazasDe({ codigo_distrito: 'CR70101', lat: 10.0, lng: -83.03 }, { altitud_m: 20, pendiente_pct: 2 }, Array(12).fill(300))
    assert.equal(f.find((x) => x.tipo === 'inundacion')?.nivel, 'alto')
    assert.equal(f.find((x) => x.tipo === 'sequia'), undefined)
  })
})

describe('Aptitud', () => {
  it('nota de un rango (APT-01)', () => {
    assert.equal(notaRango(18, 15, 25, 5, 35), 100)
    assert.equal(notaRango(30, 15, 25, 5, 35), 50)
    assert.equal(notaRango(40, 15, 25, 5, 35), 0)
    assert.equal(notaRango(null, 15, 25, 5, 35), null)
  })
  it('mes de siembra al empezar las lluvias (APT-09)', () => {
    assert.equal(mesSiembra([20, 10, 15, 60, 250, 300, 200, 260, 320, 340, 150, 40]), 5)
    assert.equal(mesSiembra(Array(12).fill(300)), null)
  })
  const req: RequisitoCultivo = {
    cultivo_id: 'papa', temp_opt_min_c: 15, temp_opt_max_c: 25, temp_abs_min_c: 7, temp_abs_max_c: 30,
    lluvia_opt_min_mm: 500, lluvia_opt_max_mm: 800, lluvia_abs_min_mm: 250, lluvia_abs_max_mm: 2000,
    ph_opt_min: 5, ph_opt_max: 6.2, ph_abs_min: 4.5, ph_abs_max: 8, altitud_max_m: 2800, texturas: null, drenaje: null, profundidad_suelo: null, fuente: 'ecocrop',
  }
  const lluvia = Array(12).fill(150)
  it('papa en tierra alta y fresca: buena; en bajura caliente: descartada', () => {
    const alta = aptitudDe({ codigo_distrito: 'CR30101' }, req, { temp: 17, lluvia }, { ph: 5.6 } as any, { altitud_m: 2000, pendiente_pct: 10 } as any, undefined, [], 60)
    assert.ok(alta.puntaje >= 85, `puntaje ${alta.puntaje}`)
    assert.equal(alta.nivel, 'excelente')
    assert.equal(alta.mes_siembra, 4) // calendario MAG/INTA
    const bajura = aptitudDe({ codigo_distrito: 'CR50101' }, req, { temp: 31, lluvia }, { ph: 5.6 } as any, { altitud_m: 100, pendiente_pct: 2 } as any, undefined, [], null)
    assert.equal(bajura.nivel, 'descartado')
    assert.match(bajura.motivo_descarte!, /Temperatura/)
  })
  it('las amenazas bajan la nota de riesgo (APT-05)', () => {
    const r = aptitudDe({ codigo_distrito: 'CR30101' }, req, { temp: 17, lluvia }, undefined, undefined, undefined, [{ tipo: 'volcan', nivel: 'muy_alto' }, { tipo: 'sequia', nivel: 'medio' }], null)
    assert.equal(r.nota_riesgo, 100 - 35 - 8)
  })
})
