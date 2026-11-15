import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Globe, place } from '../Globe';
import { C, sans, serif } from '../theme';
import { Phone, Stars, ease, easeOut, tween } from '../components';

const LON = -84, STORM = [-85.5, 11.5] as const;

const ARMS = [0, 1, 2].flatMap((arm) => Array.from({ length: 16 }, (_, k) => {
  const a = (arm * 2 * Math.PI) / 3 + k * 0.3, rad = 0.12 + k * 0.07;
  return { x: Math.cos(a) * rad, y: Math.sin(a) * rad, r: 0.14 + k * 0.014, o: 0.85 - k * 0.04 };
}));
const Storm: React.FC<{ x: number; y: number; s: number; f: number }> = ({ x, y, s, f }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <defs><filter id="stormblur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="0.045" /></filter></defs>
    <g transform={`rotate(${f * 1.6})`} filter="url(#stormblur)">
      <circle r={1.3} fill="rgba(220,235,255,0.18)" />
      {ARMS.map((c, i) => <circle key={i} cx={c.x} cy={c.y} r={c.r} fill="#f2f8ff" opacity={c.o} />)}
    </g>
    <circle r={0.1} fill="#12202c" opacity={0.85} />
  </g>
);

const AppPlanting: React.FC<{ f: number }> = ({ f }) => {
  const paused = f >= 20;
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.cream, font: `500 20px ${sans}`, color: C.dark, padding: '86px 26px 0' }}>
      <div style={{ font: `700 34px ${serif}` }}>Plant a crop</div>
      <div style={{ color: C.soil, marginTop: 4 }}>San Rafael · Guatuso</div>
      <div style={{ marginTop: 22, borderRadius: 22, background: '#fff', padding: 20, boxShadow: '0 6px 20px rgba(15,42,28,0.08)' }}>
        <div style={{ color: C.soil, fontSize: 16, letterSpacing: 2, textTransform: 'uppercase' }}>Crop</div>
        <div style={{ font: `700 30px ${serif}`, marginTop: 4 }}>Bean</div>
        <div style={{ color: C.soil, fontSize: 16, letterSpacing: 2, textTransform: 'uppercase', marginTop: 18 }}>Sowing date</div>
        <div style={{ font: `600 24px ${sans}`, marginTop: 4 }}>This Thursday</div>
      </div>
      <div style={{ marginTop: 26, borderRadius: 999, padding: '20px 0', textAlign: 'center', font: `700 24px ${sans}`, background: paused ? '#d9d4c4' : C.forest, color: paused ? C.soil : C.cream, transition: 'none' }}>
        {paused ? 'Planting paused' : 'Start planting'}
      </div>
      {paused && <div style={{ textAlign: 'center', marginTop: 16, color: C.soil, fontSize: 18, opacity: tween(f, 20, 34) }}>We will tell you when the sky clears.</div>}
    </div>
  );
};

export const Scene6Storm = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const o = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease } as const;
  // pull back (0-55), then dive into the storm (82-112)
  const pull = interpolate(f, [0, 55], [0, 1], o);
  const dive = interpolate(f, [82, 112], [0, 1], { ...o, easing: ease });
  const r = (4600 - 3100 * pull) * (1 + dive * 5.5);
  const latc = (12 - 47 * pull) + 47 * dive * pull; // tilt so Central America sits on the upper limb
  const cy = 540 + 1110 * pull * (1 - dive) + 0;
  const sat = interpolate(f, [30, 92], [-200, 2120], { ...clampLin });
  const space = tween(f, 100, 116, 1, 0);
  const phoneSp = spring({ frame: f - 98, fps, config: { damping: 19, stiffness: 85 } });
  const nf = f - 116;
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 100%, #08202e, #02060a 70%)' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: space }}>
        <Stars seed={3} />
        <Globe lon={LON} lat={latc} r={r} cx={960} cy={cy}>
          {(proj) => {
            const sp = place(proj, STORM[0], STORM[1], LON, latc);
            if (!sp) return null;
            const s = Math.max(12, r * 0.07) * tween(f, 36, 56, 0, 1, easeOut);
            return <>
              <Storm x={sp.x} y={sp.y} s={s} f={f} />
              {f > 58 && f < 96 && <circle cx={sp.x} cy={sp.y} r={s * (1.3 + ((f % 24) / 24) * 0.8)} fill="none" stroke="#ffd37a" strokeWidth={3} opacity={0.8 * (1 - (f % 24) / 24)} />}
              {f > 56 && f < 92 && sat > 0 && <line x1={sat} y1={230} x2={sp.x} y2={sp.y} stroke="#9fe8ff" strokeWidth={2} strokeDasharray="10 8" opacity={tween(f, 56, 66) * tween(f, 84, 92, 1, 0)} />}
            </>;
          }}
        </Globe>
        {/* satellite */}
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity: f > 28 && f < 94 ? 1 : 0 }}>
          <g transform={`translate(${sat} 230) rotate(-12)`}>
            <rect x={-70} y={-9} width={44} height={18} fill="#2b5f8a" stroke="#9fd3ff" strokeWidth={1.5} />
            <rect x={26} y={-9} width={44} height={18} fill="#2b5f8a" stroke="#9fd3ff" strokeWidth={1.5} />
            <rect x={-26} y={-16} width={52} height={32} rx={5} fill="#cfd8dc" stroke="#fff" strokeWidth={1.5} />
            <circle cy={0} r={7} fill="#43a566" />
          </g>
        </svg>
        <div style={{ position: 'absolute', left: 90, top: 80, font: `600 20px ${sans}`, letterSpacing: 5, color: '#9fd3ff', opacity: tween(f, 40, 56) * tween(f, 86, 98, 1, 0), textTransform: 'uppercase' }}>Satellite pass · storm detected</div>
      </div>
      {/* back to the phone */}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 40%, #16402a, #0a1b12 75%)', opacity: tween(f, 100, 118) }}>
        {Array.from({ length: 36 }, (_, i) => { const x = (i * 211) % 1920, sp = 28 + (i % 5) * 7, y = ((f * sp + i * 137) % 1300) - 120; return <div key={i} style={{ position: 'absolute', left: x, top: y, width: 2, height: 46, background: 'rgba(160,210,255,0.22)', transform: 'rotate(12deg)' }} />; })}
      </AbsoluteFill>
      <div style={{ position: 'absolute', left: 745, top: 64, transform: `translateY(${(1 - phoneSp) * 1300}px) scale(0.93)`, transformOrigin: 'top left' }}>
        <Phone>
          <AppPlanting f={nf} />
          <div style={{ position: 'absolute', left: 14, right: 14, top: 74, borderRadius: 24, background: C.cream, boxShadow: '0 14px 40px rgba(0,0,0,0.35)', border: `2px solid ${C.leaf}`, padding: '16px 18px', display: 'flex', gap: 14, alignItems: 'flex-start', transform: `translateY(${tween(nf, 0, 16, -170, 0, easeOut)}px)`, opacity: tween(nf, 0, 6), zIndex: 5 }}>
            <Img src={staticFile('logo.svg')} style={{ width: 50, height: 50, borderRadius: 12 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', font: `600 15px ${sans}`, color: C.soil, letterSpacing: 1 }}><span>TERRAFARM</span><span>now</span></div>
              <div style={{ font: `700 22px/1.2 ${serif}`, color: C.dark, marginTop: 4 }}>Heavy rain coming — wait to plant</div>
              <div style={{ font: `400 16px/1.3 ${sans}`, color: C.forest, marginTop: 4 }}>Storm over San Rafael in ~6 h.</div>
            </div>
          </div>
        </Phone>
      </div>
      <div style={{ position: 'absolute', left: 120, top: 330, width: 560, opacity: tween(f, 120, 138), font: `700 70px/1.1 ${serif}`, color: C.cream }}>
        Warned before<br /><span style={{ color: C.leaf }}>they plant.</span>
      </div>
    </AbsoluteFill>
  );
};
const clampLin = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
