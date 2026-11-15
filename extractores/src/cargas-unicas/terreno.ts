// Tema 9 · Terreno de cada distrito → tabla `terreno_zona` (altitud media, mínima, máxima y pendiente). UNA VEZ.
//
// TER-01  Altitud: en los mismos 5–20 puntos de cada distrito que usan clima y suelo (comun/puntos.ts).
//         Media, mínima y máxima de esos puntos y sus vecinos (es una muestra, no el mínimo exacto del distrito).
// TER-02  Pendiente: en cada punto se pide la altura 100 m al este, oeste, norte y sur (OpenTopoData, SRTM 90 m)
//         y se calcula la pendiente con diferencias centrales: √((Δz/Δx)² + (Δz/Δy)²) × 100. Se guarda el promedio
//         del distrito en %. Todas las alturas de la pendiente salen del mismo modelo (ver ELE-03 en elevacion.ts).
// TER-03  Solo escribe sus columnas: `area_protegida_pct` (WDPA) y `capacidad_uso_clase` (capacidad-uso) son de otros
//         extractores. Después de esta carga se puede correr `capacidad-uso`, que usa la pendiente.
import type { Argumentos } from '../comun/argumentos.ts'
import { cargarDistritos } from '../comun/distritos.ts'
import { elevacionDePuntos } from '../comun/elevacion.ts'
import { ejecutarExtractor } from '../comun/ejecutar.ts'
import type { Coordenada } from '../comun/puntos.ts'
import { puntosDelDistrito } from '../humedad/utilidades.ts'

export const FUENTE = 'srtm-opentopodata'
export const COLUMNAS = ['altitud_m', 'altitud_min_m', 'altitud_max_m', 'pendiente_pct']
const PASO = 0.0009 // grados ≈ 100 m

const r1 = (n: number) => Math.round(n * 10) / 10

export async function cargarTerreno(a: Argumentos) {
  const distritos = await cargarDistritos({ codigos: a.distritos, archivo: a.distritosArchivo })
  const puntos = distritos.map((d) => puntosDelDistrito(d))
  // Cada punto con sus 4 vecinos: [centro, este, oeste, norte, sur]
  const coords: Coordenada[] = puntos.flat().flatMap(({ lng, lat }) => [
    [lng, lat], [lng + PASO, lat], [lng - PASO, lat], [lng, lat + PASO], [lng, lat - PASO],
  ].map(([x, y]) => [Number(x.toFixed(5)), Number(y.toFixed(5))] as Coordenada))
  console.log(`Terreno: ${distritos.length} distritos, ${coords.length} alturas (con vecinos para la pendiente)`)
  const z = await elevacionDePuntos(coords, { soloOpenTopoData: true })

  let k = 0
  const filas = distritos.map((d, i) => {
    const alturas: number[] = []
    const pendientes: number[] = []
    for (const p of puntos[i]) {
      const [c, e, o, n, s] = z.slice(k, k + 5); k += 5
      for (const v of [c, e, o, n, s]) if (v != null) alturas.push(v)
      if (e != null && o != null && n != null && s != null) {
        const dx = 2 * PASO * 111_320 * Math.cos((p.lat * Math.PI) / 180)
        const dy = 2 * PASO * 110_574
        pendientes.push(Math.hypot((e - o) / dx, (n - s) / dy) * 100)
      }
    }
    const centros = puntos[i].map((_, j) => z[k - 5 * puntos[i].length + 5 * j]).filter((v): v is number => v != null)
    const prom = (v: number[]) => (v.length ? v.reduce((x, y) => x + y, 0) / v.length : null)
    return {
      codigo_distrito: d.codigo_distrito,
      altitud_m: centros.length ? Math.round(prom(centros)!) : null,
      altitud_min_m: alturas.length ? Math.round(Math.max(-10, Math.min(...alturas))) : null,
      altitud_max_m: alturas.length ? Math.round(Math.max(...alturas)) : null,
      pendiente_pct: pendientes.length ? r1(prom(pendientes)!) : null,
    }
  })
  const r = await ejecutarExtractor({ fuente: FUENTE, tabla: 'terreno_zona', columnas: COLUMNAS, lotes: [filas], simulacion: a.simulacion })
  if (r.errores.length) throw new Error(r.errores.join('; '))
}
