import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { C, sans, serif } from './theme';

export const ease = Easing.bezier(0.45, 0, 0.15, 1);
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
export const tween = (f: number, a: number, b: number, from = 0, to = 1, e = ease) =>
  interpolate(f, [a, b], [from, to], { ...clamp, easing: e });

/** Scene wrapper: fades in over XF frames (the previous scene keeps playing underneath). */
export const Fade: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ opacity: tween(f, 0, 10, 0, 1, (x) => x) }}>{children}</AbsoluteFill>;
};

export const Logo: React.FC<{ size: number }> = ({ size }) => (
  <img src={staticFileLogo} style={{ width: size, height: size, borderRadius: size * 0.225, boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }} />
);
import { staticFile } from 'remotion';
const staticFileLogo = staticFile('logo.svg');

export const Phone: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ width: 430, height: 880, borderRadius: 74, background: '#0a0e0c', padding: 14, boxSizing: 'border-box', boxShadow: '0 50px 120px rgba(0,0,0,0.55), inset 0 0 0 2px #2c3a32, 0 0 0 2px #1a2620', position: 'relative', ...style }}>
    <div style={{ width: '100%', height: '100%', borderRadius: 60, overflow: 'hidden', background: C.cream, position: 'relative' }}>{children}</div>
    <div style={{ position: 'absolute', top: 30, left: '50%', marginLeft: -62, width: 124, height: 36, borderRadius: 20, background: '#000', zIndex: 9 }} />
  </div>
);

export const Stars: React.FC<{ seed?: number }> = ({ seed = 1 }) => {
  const f = useCurrentFrame();
  const stars = React.useMemo(() => Array.from({ length: 170 }, (_, i) => {
    const r = (n: number) => { const x = Math.sin((i + 1) * 127.1 * n + seed * 311.7) * 43758.5453; return x - Math.floor(x); };
    return { x: r(1) * 1920, y: r(2) * 1080, s: 0.8 + r(3) * 1.8, p: r(4) * 6.28, o: 0.35 + r(5) * 0.65 };
  }), [seed]);
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
      {stars.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.s} fill="#e8f3ff" opacity={s.o * (0.75 + 0.25 * Math.sin(f / 18 + s.p))} />)}
    </svg>
  );
};

export const Watermark = () => (
  <div style={{ position: 'absolute', top: 34, right: 40, padding: '7px 16px', borderRadius: 999, background: 'rgba(15,42,28,0.55)', border: '1px solid rgba(244,241,232,0.35)', color: 'rgba(244,241,232,0.9)', font: `600 17px ${sans}`, letterSpacing: 1.2, display: 'flex', alignItems: 'center', gap: 8, zIndex: 50 }}>
    <span style={{ width: 8, height: 8, borderRadius: 4, background: C.leaf }} />AI-assisted
  </div>
);

export const LINES: [number, number, string][] = [
  [3, 57, "We're Terraformers, from Costa Rica."],
  [66, 176, 'Our farmers plant by instinct, while the weather keeps changing.'],
  [186, 266, 'So we built TerraFarm.'],
  [276, 416, 'It reads NASA data for every district: soil, vegetation, rain and terrain…'],
  [426, 536, '…and shows each farmer what to plant, and what to rotate next.'],
  [546, 686, 'When a storm is coming, it warns them before they plant.'],
  [696, 834, 'Costa Rica first. Every farm on Earth next. TerraFarm — together we grow.'],
];
export const Subtitles = () => {
  const f = useCurrentFrame();
  const l = LINES.find(([a, b]) => f >= a && f <= b);
  if (!l) return null;
  const o = Math.min(tween(f, l[0], l[0] + 8), tween(f, l[1] - 8, l[1], 1, 0));
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 62, display: 'flex', justifyContent: 'center', zIndex: 60, opacity: o }}>
      <div style={{ maxWidth: 1740, padding: '14px 32px', borderRadius: 16, background: 'rgba(8,20,13,0.72)', color: C.cream, font: `500 36px/1.3 ${sans}`, textAlign: 'center', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>{l[2]}</div>
    </div>
  );
};

export const SerifTitle: React.FC<{ children: React.ReactNode; size: number; color?: string; style?: React.CSSProperties }> = ({ children, size, color = C.cream, style }) => (
  <div style={{ font: `700 ${size}px/1.05 ${serif}`, color, letterSpacing: -1, ...style }}>{children}</div>
);
