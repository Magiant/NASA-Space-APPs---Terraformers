import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import geo from '../data/geo.json';
import { C, sans, serif } from '../theme';
import { clamp, ease, tween } from '../components';

type Box = [number, number, number, number];
const boxCam = (b: Box, pad: number) => ({ cx: (b[0] + b[2]) / 2, cy: (b[1] + b[3]) / 2, w: Math.max(b[2] - b[0], ((b[3] - b[1]) * 16) / 9) * pad });
const union = (bs: Box[]): Box => [Math.min(...bs.map((b) => b[0])), Math.min(...bs.map((b) => b[1])), Math.max(...bs.map((b) => b[2])), Math.max(...bs.map((b) => b[3]))];

const P = geo.provinces as unknown as { c: string; n: string; d: string; box: Box; label: [number, number]; area: number }[];
const CA = geo.cantons as unknown as typeof P;
const DI = geo.districts as unknown as typeof P;
const cartago = P.find((p) => p.c === 'CR3')!;
const canton = CA.find((c) => c.c === 'CR301')!;
const plotD = DI.find((d) => d.c === geo.plotDistrict)!;
const pw = Math.sqrt(plotD.area) * 0.22;
const [pcx, pcy] = (plotD as any).cen as [number, number];
const plot: Box = [pcx - pw / 2, pcy - pw / 2, pcx + pw / 2, pcy + pw / 2];
const KEYS = [0, 14, 40, 66, 92, 118];
const CAMS = [boxCam(union(P.map((p) => p.box)), 1.18), boxCam(union(P.map((p) => p.box)), 1.18), boxCam(cartago.box, 1.7), boxCam(canton.box, 1.6), boxCam(plotD.box, 1.5), boxCam(plot, 5)];
const STAGES = ['Costa Rica', 'Province · Cartago', 'Canton · Cartago', `District · ${plotD.n}`, 'One farm plot'];
const STAGE_AT = [0, 40, 66, 92, 106];

export const Scene2Map = () => {
  const f = useCurrentFrame();
  const opts = { ...clamp, easing: ease };
  const w = Math.exp(interpolate(f, KEYS, CAMS.map((c) => Math.log(c.w)), opts));
  const cx = interpolate(f, KEYS, CAMS.map((c) => c.cx), opts);
  const cy = interpolate(f, KEYS, CAMS.map((c) => c.cy), opts);
  const h = (w * 9) / 16;
  const stage = STAGE_AT.filter((s) => f >= s).length - 1;
  const sf = f - STAGE_AT[stage];
  const k = w / 1920; // map units per screen px
  const sw = (px: number) => px * k;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, #16402a 0%, ${C.dark} 75%)` }}>
      <svg width={1920} height={1080} viewBox={`${cx - w / 2} ${cy - h / 2} ${w} ${h}`}>
        {P.map((p) => (
          <path key={p.c} d={p.d} fill={p.c === 'CR3' ? C.leaf : C.forest} fillOpacity={p.c === 'CR3' ? 1 : tween(f, 26, 44, 1, 0.3)} stroke={C.cream} strokeOpacity={0.7} strokeWidth={sw(2)} strokeLinejoin="round" />
        ))}
        <g opacity={tween(f, 34, 48)}>
          {CA.map((c) => <path key={c.c} d={c.d} fill={c.c === 'CR301' ? C.cream : C.forest} fillOpacity={c.c === 'CR301' ? interpolate(f, [56, 70, 76], [0, 0.9, 0], clamp) : 0.9} stroke={C.cream} strokeOpacity={0.8} strokeWidth={sw(1.6)} strokeLinejoin="round" />)}
        </g>
        <g opacity={tween(f, 60, 72)}>
          {DI.map((d) => <path key={d.c} d={d.d} fill={d.c === plotD.c ? C.leaf : '#2f7a4a'} fillOpacity={d.c === plotD.c ? tween(f, 82, 94, 0.55, 1) : 0.85} stroke={C.cream} strokeOpacity={0.85} strokeWidth={sw(1.6)} strokeLinejoin="round" />)}
        </g>
        <g opacity={tween(f, 98, 110)}>
          <rect x={plot[0]} y={plot[1]} width={pw} height={pw} fill={C.soil} fillOpacity={0.55} stroke={C.cream} strokeWidth={sw(3)} transform={`rotate(-8 ${pcx} ${pcy})`} />
          {[0.2, 0.4, 0.6, 0.8].map((t) => <line key={t} x1={plot[0]} x2={plot[2]} y1={plot[1] + pw * t} y2={plot[1] + pw * t} stroke={C.leaf} strokeWidth={sw(4)} strokeOpacity={0.9} transform={`rotate(-8 ${pcx} ${pcy})`} />)}
        </g>
      </svg>
      <div style={{ position: 'absolute', left: 80, top: 70, opacity: tween(f, 0, 12) }}>
        <div style={{ font: `600 20px ${sans}`, letterSpacing: 5, color: C.leaf, textTransform: 'uppercase' }}>Location</div>
        <div key={stage} style={{ font: `700 64px/1.1 ${serif}`, color: C.cream, marginTop: 8, opacity: tween(sf, 0, 12), transform: `translateY(${tween(sf, 0, 12, 14, 0)}px)` }}>{STAGES[stage]}</div>
      </div>
    </AbsoluteFill>
  );
};
