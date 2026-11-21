// Pruebas sin red del extractor de precios del CNP (tema 3, lista comparativa semanal).
// El Excel de prueba se arma aquí con la misma forma que el real del 19-nov-2026 (Boletín N°43): título con las
// fechas, regiones en celdas combinadas, tipos de mercado debajo, filas de productos y las notas al pie.
//   node --test test/precios-cnp.test.ts
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import * as XLSX from 'xlsx'
import { Precio } from '@terraformes/compartido'
import { fechaDelBoletin, leerListaComparativa } from '../src/precios/cnp.ts'
import { clasificarProducto } from '../src/comun/productos.ts'

const _ = null
const FILAS = [
  ['PRECIOS NACIONALES'],
  [],
  ['UNIDAD DE ANALISIS DE PRECIOS', _, _, 'LISTA COMPARATIVA\nBoletín N°43 / 26 de Octubre al 01 Noviembre 2026 1/'],
  [],
  ['Producto', 'Unidad de Medida', 'Brunca', _, 'Central', _, _, _, 'Promedio nacional'],
  [_, _, 'Productor', 'Ferias', 'Productor', 'CENADA', 'Borbon', 'Ferias', 'Productor', 'Ferias'],
  ['Frijol rojo', 'kg', _, _, _, _, _, 1722.2222222222224, _, 1818.0555555555557],
  ['Frijol tierno', 'kg', _, _, _, 1500, 2150, 2322.22, _, 2663.89],
  ['Papa blanca primera', 'kg', 650, '', 700, 800, 0, 950, 675, 950],
  ['Zapallo', 'unidad', _, _, _, _, 400, 398.61, _, 532.87],
  ['1/ Los precios al productor son de la semana del 26 al 30 de Octubre, precio de CENADA se refiere al viernes 30 de Octubre'],
  ['Informe elaborado por: Unidad de Análisis de Precios / sim@cnp.go.cr'],
  ['www.cnp.go.cr  → Información de Mercados'],
]

function libro(filas: unknown[][] = FILAS): XLSX.WorkBook {
  const hoja = XLSX.utils.aoa_to_sheet(filas)
  hoja['!merges'] = [XLSX.utils.decode_range('C5:D5'), XLSX.utils.decode_range('E5:H5'), XLSX.utils.decode_range('I5:J5')]
  const l = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(l, hoja, 'Lista Comparativa')
  return l
}

describe('CNP · lista comparativa semanal', () => {
  const filas = leerListaComparativa(libro(), 'PNS_Comparativa_43_semana_44-2026.xlsx')
  const buscar = (original: string, mercado: string) => filas.find((f) => f.producto_original === original && f.mercado === mercado)

  it('cada celda con número es una fila, con la región de la celda combinada y el tipo de mercado', () => {
    assert.equal(buscar('Frijol rojo', 'Ferias · Central')?.precio_promedio, 1722.22)
    assert.equal(buscar('Frijol rojo', 'Ferias · Promedio nacional')?.precio_promedio, 1818.06)
    assert.equal(buscar('Papa blanca primera', 'Productor · Brunca')?.precio_promedio, 650)
    assert.equal(buscar('Zapallo', 'Borbón · Central')?.precio_promedio, 400, '"Borbon" se escribe con tilde')
  })

  it('las celdas vacías o en cero no se guardan, ni las notas del pie', () => {
    assert.equal(buscar('Papa blanca primera', 'Ferias · Brunca'), undefined)
    assert.equal(buscar('Papa blanca primera', 'Borbón · Central'), undefined)
    assert.ok(filas.every((f) => !/^1\/|Informe|www\./.test(f.producto_original)))
    // Frijol rojo 2 + frijol tierno 4 + papa 6 (de 8 celdas: una vacía y una en cero) + zapallo 3.
    assert.equal(filas.length, 15)
  })

  it('la fecha es el viernes de la semana del boletín', () => {
    assert.ok(filas.every((f) => f.fecha_dato === '2026-10-30'))
  })

  it('enlaza los cultivos del catálogo, pero el frijol tierno (vaina verde) no es el frijol del catálogo', () => {
    assert.deepEqual(
      { producto: buscar('Frijol rojo', 'Ferias · Central')?.producto, variedad: buscar('Frijol rojo', 'Ferias · Central')?.variedad, cultivo: buscar('Frijol rojo', 'Ferias · Central')?.cultivo_id },
      { producto: 'frijol', variedad: 'rojo', cultivo: 'frijol' },
    )
    assert.equal(buscar('Frijol tierno', 'CENADA · Central')?.cultivo_id, null)
    assert.equal(buscar('Papa blanca primera', 'Productor · Central')?.variedad, 'blanca primera')
    assert.equal(buscar('Zapallo', 'Ferias · Promedio nacional')?.producto, 'zapallo')
  })

  it('todas las filas pasan el esquema de precios_historico', () => {
    for (const f of filas) assert.ok(Precio.safeParse(f).success, `${f.producto_original} · ${f.mercado}`)
    assert.ok(filas.every((f) => f.fuente === 'cnp' && f.moneda === 'CRC'))
  })

  it('si cambia el formato, falla con un mensaje claro en vez de guardar basura', () => {
    assert.throws(() => leerListaComparativa(libro(FILAS.filter((f) => f[0] !== 'Producto')), 'x.xlsx'), /fila "Producto"/)
    assert.throws(() => leerListaComparativa(libro(FILAS.slice(0, 6)), 'x.xlsx'), /sin precios/)
  })
})

describe('CNP · fecha del boletín', () => {
  it('lee "26 de Octubre al 01 Noviembre 2026" y devuelve el viernes', () => {
    assert.equal(fechaDelBoletin('Boletín N°43 / 26 de Octubre al 01 Noviembre 2026 1/'), '2026-10-30')
  })
  it('acepta la semana dentro de un solo mes, "setiembre" y la coma antes del año', () => {
    assert.equal(fechaDelBoletin('Boletín N°33 del 07 al 11 de setiembre, 2026'), '2026-09-11')
    assert.equal(fechaDelBoletin('Boletín N°40 / 05 al 11 de Octubre 2026'), '2026-10-09')
  })
  it('una semana que cruza el año usa el año anterior para el inicio', () => {
    // El lunes 28-dic-2026 → viernes 1-ene-2027.
    assert.equal(fechaDelBoletin('Boletín N°1 / 28 de Diciembre al 03 Enero 2027'), '2027-01-01')
  })
  it('el boletín N°01 de 2026: "Dicembre" mal escrito y el año en medio', () => {
    const titulo = 'LISTA COMPARATIVA\nBoletín N°01 / 29 de Dicembre del 2025 al 04 de Enero 2026 1/'
    // Antes daba 2026-01-30: tomaba el "25" de "2025" como día.
    assert.equal(fechaDelBoletin(titulo, 'PNS_Comparativa_01_semana_02-2026.xlsx'), '2026-01-02')
  })
  it('rechaza una fecha que no calza con la semana del nombre del archivo, en vez de sobrescribir otra semana', () => {
    assert.throws(() => fechaDelBoletin('Boletín N°05 / 26 al 31 de Enero 2026', 'PNS_Comparativa_01_semana_02-2026.xlsx'), /no calza/)
    // Corrida una semana (pasa en el portal: "02_semana_03" es la semana 2) sí se acepta.
    assert.equal(fechaDelBoletin('Boletín N°02 / 05 al 11 de Enero 2026', 'PNS_Comparativa_02_semana_03-2026.xlsx'), '2026-01-09')
  })
  it('sin fechas en el título, usa la semana ISO del nombre del archivo', () => {
    assert.equal(fechaDelBoletin('LISTA COMPARATIVA', 'PNS_Comparativa_43_semana_44-2026.xlsx'), '2026-10-30')
    assert.throws(() => fechaDelBoletin('sin fecha', 'archivo.xlsx'), /no se encontró la fecha/)
  })
})

describe('Productos compartidos (PIMA y CNP)', () => {
  it('separa cultivo y variedad igual para las dos fuentes', () => {
    assert.deepEqual(clasificarProducto('Piña - grande'), { producto: 'pina', variedad: 'grande', cultivo_id: 'pina' })
    assert.deepEqual(clasificarProducto('Maíz blanco'), { producto: 'maiz', variedad: 'blanco', cultivo_id: 'maiz' })
    assert.deepEqual(clasificarProducto('Frijol tierno'), { producto: 'frijol tierno', variedad: '', cultivo_id: null })
  })
})
