/** CSV UTF-8: BOM, CRLF, comillas escapadas y saltos dentro de campos. */
export function leerCsv(texto: string): string[][] {
  const filas: string[][] = []; let fila: string[] = []; let campo = ''; let citado = false; let cerrado = false;
  texto = texto.replace(/^\uFEFF/, '');
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (citado) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') { citado = false; cerrado = true; }
      else campo += c;
    } else if (c === ',' || c === '\n' || c === '\r') {
      fila.push(campo.trim()); campo = ''; cerrado = false;
      if (c !== ',') { if (fila.some(Boolean) || fila.length > 1) filas.push(fila); fila = []; if (c === '\r' && texto[i + 1] === '\n') i++; }
    } else if (c === '"' && !campo.trim() && !cerrado) { campo = ''; citado = true; }
    else if (cerrado && (c === ' ' || c === '\t')) continue;
    else { if (cerrado || c === '"') throw new Error('CSV: comillas inválidas'); campo += c; }
  }
  if (citado) throw new Error('CSV: comillas sin cerrar');
  fila.push(campo.trim()); if (fila.some(Boolean) || fila.length > 1) filas.push(fila);
  return filas;
}
