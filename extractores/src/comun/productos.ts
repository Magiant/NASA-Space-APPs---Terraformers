// Nombre de un producto en un boletín de precios (PIMA, CNP) → cultivo del catálogo (tema 5).
// Lo comparten los extractores de precios para que "Frijol rojo" o "Papa blanca" se enlacen igual en las dos fuentes.

/** Nombre → id del cultivo. El orden importa: el primero que calce. */
export const PRODUCTOS: [RegExp, string][] = [
  [/^papa\b/i, 'papa'], [/^cebolla\b/i, 'cebolla'], [/^zanahoria\b/i, 'zanahoria'], [/^repollo\b/i, 'repollo'],
  [/^tomate\b/i, 'tomate'], [/^chile dulce\b/i, 'chile'], [/^culantro\b/i, 'culantro'], [/^yuca\b/i, 'yuca'],
  [/^piña\b/i, 'pina'], [/^frijol\b/i, 'frijol'], [/^café\b/i, 'cafe'], [/^arroz\b/i, 'arroz'],
  [/^ma[ií]z\b/i, 'maiz'],
]

/**
 * Productos que empiezan igual que un cultivo pero NO son ese cultivo: el frijol tierno es la vaina verde,
 * no el grano seco del catálogo, y su precio no sirve de referencia para quien siembra frijol.
 */
const NO_SON_DEL_CATALOGO = [/^frijol tierno\b/i]

/**
 * `producto` = id del cultivo cuando es uno del catálogo y `variedad` el resto del nombre ("rojo", "primera");
 * si no, el nombre completo en minúscula y sin variedad.
 */
export function clasificarProducto(nombre: string): { producto: string; variedad: string; cultivo_id: string | null } {
  const original = nombre.trim()
  const par = NO_SON_DEL_CATALOGO.some((re) => re.test(original)) ? undefined : PRODUCTOS.find(([re]) => re.test(original))
  if (!par) return { producto: original.toLowerCase(), variedad: '', cultivo_id: null }
  const variedad = original.replace(par[0], '').replace(/^\s*-\s*/, '').trim().toLowerCase()
  return { producto: par[1], variedad, cultivo_id: par[1] }
}
