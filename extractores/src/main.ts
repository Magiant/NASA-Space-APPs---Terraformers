import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { ejecutarIna, mensajeSeguro } from './capacitacion/ina.js';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
try {
  const entorno = resolve(raiz, '.env');
  if (existsSync(entorno)) process.loadEnvFile(entorno);
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      csv: { type: 'string' },
      'dry-run': { type: 'boolean' },
      guardar: { type: 'boolean' },
    },
  });
  if (positionals.length !== 1 || positionals[0] !== 'capacitacion-ina' ||
      (values.guardar && values['dry-run']))
    throw new Error('Uso: npm run start -w extractores -- capacitacion-ina --csv docs/capacitacion/plantilla.csv [--dry-run | --guardar]');
  // Las rutas relativas siempre parten de la raíz, incluso al usar npm -w.
  const ruta = resolve(raiz, values.csv ?? 'docs/capacitacion/plantilla.csv');
  await ejecutarIna(ruta, !values.guardar);
} catch (error) {
  console.error(mensajeSeguro(error));
  process.exitCode = 1;
}
