import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { Globe, place } from '../Globe';
import { C, sans, serif } from '../theme';
import { Logo, Stars, ease, easeOut, tween } from '../components';

const PINS: [number, number][] = [[-84, 10], [-99, 19], [-74, 4.7], [-75, -10], [-47, -15], [-64, -33], [-97, 40], [-4, 40], [-6, 32], [8, 9], [37, 0.5], [39, 9], [25, -29], [31, 27], [31, 49], [78, 22], [-71, -33]];

export const Scene7Globe = () => {
  const f = useCurrentFrame();
  const o = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease } as const;
  const z = interpolate(f, [0, 110], [0, 1], o);
  const r = 2100 - 1640 * z;
  const lon = -84 + 46 * z;
  const lat = 10 + 8 * z;
  const end = tween(f, 114, 134);
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 50%, #08202e, #02060a 75%)' }}>
      <Stars seed={7} />
      <div style={{ position: 'absolute', inset: 0, opacity: 1 - 0.55 * end }}>
        <Globe lon={lon} lat={lat} r={r} cx={960} cy={540}>
          {(proj) => PINS.map(([pl, pa], i) => {
            const p = place(proj, pl, pa, lon, lat);
            if (!p) return null;
            const t = tween(f, i === 0 ? 8 : 30 + i * 4.5, i === 0 ? 24 : 44 + i * 4.5, 0, 1, easeOut);
            if (t <= 0) return null;
            const pulse = (f + i * 7) % 40 / 40;
            return (
              <g key={i} opacity={p.facing * t}>
                <circle cx={p.x} cy={p.y} r={38 * (0.4 + pulse)} fill="none" stroke="#ffe08a" strokeWidth={2} opacity={1 - pulse} />
                <circle cx={p.x} cy={p.y} r={22} fill="#ffd25a" opacity={0.28} />
                <circle cx={p.x} cy={p.y} r={9 * (0.6 + 0.4 * t)} fill="#fff4c4" />
              </g>
            );
          })}
        </Globe>
      </div>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: end, background: `radial-gradient(ellipse at 50% 50%, rgba(15,42,28,0.78), rgba(15,42,28,0.35) 70%)` }}>
        <div style={{ transform: `scale(${0.92 + 0.08 * end})`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Logo size={170} />
          <div style={{ font: `700 112px/1 ${serif}`, color: C.cream, marginTop: 28, letterSpacing: -2 }}>TerraFarm</div>
          <div style={{ font: `500 36px ${sans}`, color: C.leaf, marginTop: 18, letterSpacing: 8, textTransform: 'uppercase' }}>Together we grow</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
