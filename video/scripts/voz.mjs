// Limpia la voz grabada con el teléfono para que suene "de estudio", sin dependencias:
// filtro de graves, compuerta de ruido suave, EQ (menos "caja", más presencia), compresor y limitador.
// Uso: node scripts/voz.mjs entrada.wav salida.wav   (WAV PCM 16 bits mono)
// También imprime dónde empieza y termina cada frase (pausas > 0.3 s) para alinearlas con las escenas.
import { readFileSync, writeFileSync } from 'node:fs';

const [entrada, salida] = process.argv.slice(2);
const buf = readFileSync(entrada);

// --- leer WAV (busca el bloque "data") ---
let p = 12, sr = 48000, datos = null;
while (p < buf.length - 8) {
  const id = buf.toString('ascii', p, p + 4), tam = buf.readUInt32LE(p + 4);
  if (id === 'fmt ') sr = buf.readUInt32LE(p + 12);
  if (id === 'data') { datos = buf.subarray(p + 8, p + 8 + tam); break; }
  p += 8 + tam + (tam % 2);
}
if (!datos) throw new Error('WAV sin bloque data');
const n = datos.length / 2;
let x = new Float64Array(n);
for (let i = 0; i < n; i++) x[i] = datos.readInt16LE(i * 2) / 32768;

// --- biquads (RBJ cookbook) ---
function biquad(sig, tipo, f, q, dB = 0) {
  const A = 10 ** (dB / 40), w = (2 * Math.PI * f) / sr, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q);
  let b0, b1, b2, a0, a1, a2;
  if (tipo === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
  else if (tipo === 'pico') { b0 = 1 + al * A; b1 = -2 * c; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * c; a2 = 1 - al / A; }
  else { // estante agudo
    const r = 2 * Math.sqrt(A) * al;
    b0 = A * (A + 1 + (A - 1) * c + r); b1 = -2 * A * (A - 1 + (A + 1) * c); b2 = A * (A + 1 + (A - 1) * c - r);
    a0 = A + 1 - (A - 1) * c + r; a1 = 2 * (A - 1 - (A + 1) * c); a2 = A + 1 - (A - 1) * c - r;
  }
  const y = new Float64Array(sig.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < sig.length; i++) {
    const v = (b0 * sig[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = sig[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}

// 1) quitar retumbo y DC
x = biquad(biquad(x, 'hp', 85, 0.707), 'hp', 85, 0.707);

// 2) energía por ventanas de 20 ms → piso de ruido y frases
const ven = Math.round(sr * 0.02), nv = Math.floor(n / ven), rms = new Float64Array(nv);
for (let v = 0; v < nv; v++) { let s = 0; for (let i = v * ven; i < (v + 1) * ven; i++) s += x[i] * x[i]; rms[v] = Math.sqrt(s / ven) + 1e-9; }
const ordenado = [...rms].sort((a, b) => a - b);
const ruido = ordenado[Math.floor(nv * 0.1)], umbral = Math.max(ruido * 4, 0.006);

// 3) compuerta suave: baja 20 dB el ruido entre frases (ataque 5 ms, suelta 120 ms)
const att = Math.exp(-1 / (sr * 0.005)), rel = Math.exp(-1 / (sr * 0.12));
let g = 0;
for (let i = 0; i < n; i++) {
  const abierta = rms[Math.min(nv - 1, Math.floor(i / ven))] > umbral ? 1 : 0.1;
  g = abierta > g ? att * g + (1 - att) * abierta : rel * g + (1 - rel) * abierta;
  x[i] *= g;
}

// 4) EQ: menos "caja" (300 Hz), más presencia (3.5 kHz) y aire (10 kHz)
x = biquad(x, 'pico', 300, 1.0, -3.5);
x = biquad(x, 'pico', 3500, 0.9, 3);
x = biquad(x, 'estante', 10000, 0.707, 2.5);

// 5) compresor 3:1 desde -22 dBFS (ataque 5 ms, suelta 90 ms), luego subir nivel
const ca = Math.exp(-1 / (sr * 0.005)), cr = Math.exp(-1 / (sr * 0.09));
let env = 0;
for (let i = 0; i < n; i++) {
  const a = Math.abs(x[i]);
  env = a > env ? ca * env + (1 - ca) * a : cr * env + (1 - cr) * a;
  const db = 20 * Math.log10(env + 1e-9), sobre = db - -22;
  if (sobre > 0) x[i] *= 10 ** ((-sobre * (1 - 1 / 3)) / 20);
}

// 6) normalizar: voz a ~-16 dBFS RMS en las frases, con limitador a -1 dBFS
let s = 0, c = 0;
for (let v = 0; v < nv; v++) if (rms[v] > umbral) for (let i = v * ven; i < (v + 1) * ven; i++) { s += x[i] * x[i]; c++; }
const ganancia = 10 ** (-16 / 20) / Math.sqrt(s / Math.max(c, 1));
const techo = 10 ** (-1 / 20);
for (let i = 0; i < n; i++) { const v = x[i] * ganancia; x[i] = Math.abs(v) > techo * 0.8 ? Math.sign(v) * (techo * 0.8 + (techo * 0.2) * Math.tanh((Math.abs(v) - techo * 0.8) / (techo * 0.2))) : v; }

// --- escribir WAV ---
const out = Buffer.alloc(44 + n * 2);
out.write('RIFF', 0); out.writeUInt32LE(36 + n * 2, 4); out.write('WAVEfmt ', 8);
out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(sr, 24);
out.writeUInt32LE(sr * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write('data', 36); out.writeUInt32LE(n * 2, 40);
for (let i = 0; i < n; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, x[i])) * 32767), 44 + i * 2);
writeFileSync(salida, out);

// --- frases: tramos con voz separados por pausas > 0.3 s ---
const frases = []; let ini = -1, silencio = 0;
for (let v = 0; v < nv; v++) {
  if (rms[v] > umbral) { if (ini < 0) ini = v; silencio = 0; }
  else if (ini >= 0 && ++silencio > 15) { frases.push([ini, v - silencio]); ini = -1; silencio = 0; }
}
if (ini >= 0) frases.push([ini, nv - 1]);
console.log(JSON.stringify({ ruidoDb: +(20 * Math.log10(ruido)).toFixed(1), frases: frases.map(([a, b]) => [+(a * 0.02).toFixed(2), +((b + 1) * 0.02).toFixed(2)]) }));
