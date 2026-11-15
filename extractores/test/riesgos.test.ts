import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Distrito, TABLAS } from '@terraformes/compartido'
import { normalizarBoletines } from '../src/riesgos/revisados.ts'
import { normalizarAmenazas, leerCsv } from '../src/cargas-unicas/amenazas.ts'
import { ejecutarExtractor } from '../src/comun/ejecutar.ts'
const leer = (nombre: string) => readFile(new URL('./fixtures/' + nombre, import.meta.url), 'utf8')
const distritos = Distrito.array().parse(JSON.parse(await leer('distritos-muestra.json')))
const documento = () => leer('riesgos-cne.json').then(JSON.parse)

test('tres distritos, sin inventar fechas y claves idempotentes', async () => {
  const doc = await documento()
  const filas = normalizarBoletines(doc, 'cne', distritos, {}, true)
  assert.deepEqual(filas[0].codigos_distrito, ['CR10101','CR30110','CR50501'])
  assert.equal(filas[0].inicio, null)
  assert.deepEqual(filas, normalizarBoletines(doc, 'cne', distritos, {}, true))
  assert.equal(TABLAS.alertas.claveUnica, 'fuente,id_externo')
  assert.equal(TABLAS.amenazas_zona.claveUnica, 'codigo_distrito,tipo')
})
test('cantón se expande; región no resuelta no entrega cobertura parcial', async () => {
  const doc = await documento()
  doc.registros[0].zonas = { cantones: ['CR505'] }
  assert.deepEqual(normalizarBoletines(doc,'cne',distritos,{},true)[0].codigos_distrito, ['CR50501'])
  doc.registros[0].zonas.regiones = ['Zona no revisada']
  assert.equal(normalizarBoletines(doc,'cne',distritos,{},true)[0].codigos_distrito,null)
  assert.deepEqual(normalizarBoletines(doc,'cne',distritos,{'Zona no revisada':['CR10101']},true)[0].codigos_distrito,['CR10101','CR50501'])
})
test('IMN conserva nivel null y rechaza colores', async () => {
  const doc = JSON.parse(await leer('riesgos-imn.json'))
  assert.equal(normalizarBoletines(doc,'imn',distritos,{},true)[0].nivel,null)
  doc.registros[0].alerta.nivel='roja'
  assert.throws(() => normalizarBoletines(doc,'imn',distritos,{},true), /IMN requiere/)
})
test('rechaza prueba en producción, revisión vencida, ids duplicados y códigos desconocidos', async () => {
  const doc = await documento()
  assert.throws(() => normalizarBoletines(doc,'cne',distritos), /ficticios/)
  doc.prueba=false
  assert.throws(() => normalizarBoletines(doc,'cne',distritos,{},false,Date.parse(doc.revisado_en)+49*3600_000), /48 horas/)
  doc.registros.push(doc.registros[0])
  assert.throws(() => normalizarBoletines(doc,'cne',distritos,{},true), /duplicado/)
  doc.registros.pop(); doc.registros[0].zonas={distritos:['CR99999']}
  assert.throws(() => normalizarBoletines(doc,'cne',distritos,{},true), /ausente/)
})
test('CSV: meses ausentes son null; nivel desconocido no se convierte a bajo', async () => {
  const csv = await leer('riesgos-amenazas.csv')
  const filas=normalizarAmenazas(csv,distritos)
  assert.equal(filas.length,3)
  assert.equal(filas[0].meses_riesgo,null)
  assert.deepEqual(filas[1].meses_riesgo,[9,10])
  assert.throws(() => normalizarAmenazas(csv.replace(',medio,',',,'),distritos))
  assert.throws(() => normalizarAmenazas(csv.replace('9;10','0;13'),distritos))
  assert.throws(() => normalizarAmenazas(csv + csv.split('\n')[1]+'\n',distritos), /duplicada/)
  assert.deepEqual(leerCsv('a,b\r\n"x,y","dos""comillas"\r\n'),[['a','b'],['x,y','dos"comillas']])
  assert.throws(() => leerCsv('a,"sin cerrar'), /sin cerrar/)
})
test('un lote con una fila inválida se rechaza entero antes de persistir', async () => {
  const doc=await documento()
  const [valida]=normalizarBoletines(doc,'cne',distritos,{},true)
  const r=await ejecutarExtractor({fuente:'riesgos-test-rechazo',tabla:'alertas',simulacion:true,lotes:[[valida,{...valida,id_externo:'invalida',nivel:'azul'}]]})
  assert.equal(r.guardadas,0)
  assert.equal(r.lotesConError,1)
  assert.deepEqual(r.muestra,[])
})
