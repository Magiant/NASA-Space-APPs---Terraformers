// Lectura simple de argumentos: --simulacion, --distritos=CR10101,CR30110, --desde=2025-01-01 ...
export function leerArgumentos(argv = process.argv.slice(2)) {
  const valor = (nombre: string) => argv.find((a) => a.startsWith(`--${nombre}=`))?.split('=').slice(1).join('=')
  const lista = (nombre: string) => valor(nombre)?.split(',').map((s) => s.trim()).filter(Boolean)
  return {
    nombre: argv.find((a) => !a.startsWith('--')),
    simulacion: argv.includes('--simulacion'),
    distritos: lista('distritos'),
    distritosArchivo: valor('distritos-archivo'),
    desde: valor('desde'),
    hasta: valor('hasta'),
    presupuesto: valor('presupuesto') ? Number(valor('presupuesto')) : undefined,
    puntosMax: valor('puntos-max') ? Number(valor('puntos-max')) : undefined,
  }
}

export type Argumentos = ReturnType<typeof leerArgumentos>
