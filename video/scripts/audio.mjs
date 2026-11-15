// Pure-synthesis audio: ambient pad bed (28 s) + whoosh / ping / chime. Writes WAV files to public/audio/.
import fs from 'node:fs';
import path from 'node:path';
const SR = 44100;
const out = path.resolve(import.meta.dirname, '../public/audio');
fs.mkdirSync(out, { recursive: true });
let seed = 12345;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const buf = (sec) => new Float32Array(Math.round(sec * SR));
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
const write = (name, L, R = L) => {
  let peak = 0; for (let i = 0; i < L.length; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const g = 0.85 / (peak || 1);
  const data = Buffer.alloc(44 + L.length * 4);
  data.write('RIFF', 0); data.writeUInt32LE(36 + L.length * 4, 4); data.write('WAVEfmt ', 8);
  data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(2, 22); data.writeUInt32LE(SR, 24);
  data.writeUInt32LE(SR * 4, 28); data.writeUInt16LE(4, 32); data.writeUInt16LE(16, 34); data.write('data', 36); data.writeUInt32LE(L.length * 4, 40);
  for (let i = 0; i < L.length; i++) { data.writeInt16LE(Math.round(L[i] * g * 32767), 44 + i * 4); data.writeInt16LE(Math.round(R[i] * g * 32767), 46 + i * 4); }
  fs.writeFileSync(path.join(out, name), data);
};
// --- music: slow chord pads (Am9 - Fmaj7 - Cmaj7 - G6), 7 s each, detuned sines, stereo spread
{
  const L = buf(28), R = buf(28);
  const chords = [[45, 57, 60, 64, 71], [41, 53, 57, 60, 64], [48, 55, 59, 64, 67], [43, 55, 59, 62, 64]];
  chords.forEach((ch, ci) => {
    const t0 = ci * 7 - 0.8, len = 7 + 1.6;
    ch.forEach((m, ni) => {
      [-0.12, 0.1].forEach((det, di) => {
        const f = hz(m) * 2 ** (det / 12), ph = rnd() * 6, side = di ? 0.7 : 0.3, amp = (m < 50 ? 0.9 : 0.5) / ch.length;
        for (let i = 0; i < len * SR; i++) {
          const t = i / SR, idx = Math.round((t0 + t) * SR); if (idx < 0 || idx >= L.length) continue;
          const env = Math.min(1, t / 2.2) * Math.min(1, (len - t) / 2.2);
          const lfo = 0.85 + 0.15 * Math.sin(2 * Math.PI * (0.07 + ni * 0.013) * t + ph);
          const s = (Math.sin(2 * Math.PI * f * t + ph) + 0.25 * Math.sin(4 * Math.PI * f * t)) * env * lfo * amp;
          L[idx] += s * (1 - side); R[idx] += s * side;
        }
      });
    });
  });
  for (let i = 0; i < L.length; i++) { const t = i / SR, f = Math.min(1, t / 2.5) * Math.min(1, (28 - t) / 2.5); L[i] *= f; R[i] *= f; }
  write('music.wav', L, R);
}
// --- whoosh: band-passed noise sweeping upward, soft envelope
{
  const L = buf(1.4); let lp = 0, lp2 = 0;
  for (let i = 0; i < L.length; i++) {
    const t = i / SR, p = t / 1.4, a = 0.02 + 0.5 * p * p * 0.6 + 0.3 * p;
    lp += a * (rnd() - lp); lp2 += a * (lp - lp2);
    L[i] = (lp - lp2) * Math.sin(Math.PI * p) ** 2;
  }
  write('whoosh.wav', L);
}
// --- ping: soft two-partial bell
{
  const L = buf(1.8);
  for (let i = 0; i < L.length; i++) { const t = i / SR; L[i] = (Math.sin(2 * Math.PI * 1318.5 * t) + 0.3 * Math.sin(2 * Math.PI * 2637 * t)) * Math.exp(-t * 3.2) * Math.min(1, t / 0.005); }
  write('ping.wav', L);
}
// --- chime: gentle rising major arpeggio for the logo reveal
{
  const L = buf(2.6);
  [[0, 523.25], [0.14, 659.25], [0.28, 783.99]].forEach(([d, f]) => {
    for (let i = Math.round(d * SR); i < L.length; i++) { const t = i / SR - d; L[i] += Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 2.4) * Math.min(1, t / 0.01) * 0.5; }
  });
  write('chime.wav', L);
}
console.log('audio written to', out);
