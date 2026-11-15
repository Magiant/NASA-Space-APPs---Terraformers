// Semilla de una sola vez: HDX (INEC) -> datos/distritos.json.
// Uso: npm --prefix extractores run semilla:distritos
// Descarga el ZIP de 165 MB solo si no está en .cache/hdx/ (nunca en una corrida normal).
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Distrito } from '@terraformers/compartido'

const URL_ZIP =
  'https://data.humdata.org/dataset/7cf2b2c2-ad83-4f65-aa69-dae9c574df13/resource/03388032-7fd5-4cf5-8797-62b6d6866786/download/cri_admin_boundaries.geojson.zip'
const DIR_CACHE = fileURLToPath(new URL('../../../.cache/hdx/', import.meta.url))
const ZIP = DIR_CACHE + 'cri_admin_boundaries.geojson.zip'
const SALIDA = new URL('../../../datos/distritos.json', import.meta.url)
const TOTAL_ESPERADO = 492

type PuntoHdx = {
  properties: Record<string, unknown>
  geometry: { type: 'Point'; coordinates: [number, number] }
}

/** Convierte un punto de cri_adminpoints (nivel 3) en Distrito. Puro, para poder probarlo. */
export function aDistrito(f: PuntoHdx): Distrito {
  const p = f.properties
  const codigo = String(p.adm3_pcode)
  const [lon, lat] = f.geometry.coordinates
  return Distrito.parse({
    codigo,
    nombre: String(p.adm3_name),
    canton: { codigo: codigo.slice(0, 5), nombre: String(p.adm2_name) },
    provincia: { codigo: codigo.slice(0, 3), nombre: String(p.adm1_name) },
    lat: Math.round(lat * 1e5) / 1e5,
    lon: Math.round(lon * 1e5) / 1e5,
  })
}

function main() {
  if (!existsSync(ZIP)) {
    mkdirSync(DIR_CACHE, { recursive: true })
    console.log('Descargando límites de HDX (165 MB, una sola vez)…')
    execFileSync('curl', ['-sSL', '--fail', '--max-time', '900', '-o', ZIP, URL_ZIP], { stdio: 'inherit' })
  }
  const nombre = execFileSync('unzip', ['-Z1', ZIP], { encoding: 'utf8' })
    .split('\n')
    .find((n) => n.endsWith('cri_adminpoints.geojson'))
  if (!nombre) throw new Error('cri_adminpoints.geojson no está en el ZIP de HDX')

  const geo = JSON.parse(execFileSync('unzip', ['-p', ZIP, nombre], { encoding: 'utf8', maxBuffer: 64e6 }))
  const distritos = (geo.features as PuntoHdx[])
    .filter((f) => typeof f.properties.adm3_pcode === 'string' && f.properties.adm3_pcode !== '')
    .map(aDistrito)
    .sort((a, b) => a.codigo.localeCompare(b.codigo))

  if (distritos.length !== TOTAL_ESPERADO) {
    throw new Error(`Se esperaban ${TOTAL_ESPERADO} distritos y llegaron ${distritos.length}`)
  }
  writeFileSync(SALIDA, JSON.stringify(distritos, null, 1) + '\n')
  console.log(`datos/distritos.json: ${distritos.length} distritos`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
