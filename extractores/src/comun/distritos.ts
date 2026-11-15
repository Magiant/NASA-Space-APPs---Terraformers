// Lee los distritos (tema 0) desde Supabase. Para probar sin base: --distritos-archivo=<json>
// con una lista de objetos que cumplan el esquema `Distrito` de datos.ts.
import { readFile } from 'node:fs/promises'
import { Distrito, type Distrito as TDistrito } from '@terraformes/compartido'
import { obtenerSupabase } from './supabase.ts'

export async function cargarDistritos(o: { codigos?: string[]; archivo?: string } = {}): Promise<TDistrito[]> {
  let lista: unknown[]
  if (o.archivo) {
    lista = JSON.parse(await readFile(o.archivo, 'utf-8'))
  } else {
    lista = []
    for (let desde = 0; ; desde += 1000) {
      let q = obtenerSupabase().from('distritos')
        .select('codigo_distrito,distrito,codigo_canton,canton,codigo_provincia,provincia,lat,lng,area_km2,poligono')
        .order('codigo_distrito').range(desde, desde + 999)
      if (o.codigos?.length) q = q.in('codigo_distrito', o.codigos)
      const { data, error } = await q
      if (error) throw new Error(`No se pudieron leer los distritos: ${error.message}`)
      lista.push(...data)
      if (data.length < 1000) break
    }
  }
  const distritos = Distrito.array().parse(lista)
  const elegidos = o.codigos?.length ? distritos.filter((d) => o.codigos!.includes(d.codigo_distrito)) : distritos
  if (!elegidos.length) {
    throw new Error('No hay distritos. ¿Ya se cargó el tema 0 (tabla distritos)? Para probar sin base usa --distritos-archivo.')
  }
  return elegidos
}
