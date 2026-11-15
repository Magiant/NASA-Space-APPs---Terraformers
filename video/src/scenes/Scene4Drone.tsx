import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { C, sans, serif } from '../theme';
import { easeOut, tween } from '../components';

const ICONS: Record<string, string> = {
  drop: 'M12 3C12 3 5 11 5 15a7 7 0 0 0 14 0C19 11 12 3 12 3Z',
  leaf: 'M5 19C5 9 11 4 20 4C20 13 15 19 5 19Z',
  cloud: 'M7 18h10a4 4 0 0 0 0-8a6 6 0 0 0-11.5 1.5A3.2 3.2 0 0 0 7 18Z',
  mountain: 'M2 19L9 7L13 13L16 9L22 19Z',
};
const ROWS = [
  { icon: 'drop', label: 'Soil moisture', src: 'NASA SMAP', val: '0.31', unit: 'm³/m³' },
  { icon: 'leaf', label: 'Vegetation', src: 'MODIS NDVI', val: '0.72', unit: 'index' },
  { icon: 'cloud', label: 'Rain & heat', src: 'NASA POWER', val: '4.8', unit: 'mm/day · 27 °C' },
  { icon: 'mountain', label: 'Terrain', src: 'ASTER elevation', val: '1,410', unit: 'm' },
];

export const Scene4Drone = () => {
  const f = useCurrentFrame();
  const p = f / 150;
  const travel = 1500;
  const tri = Math.abs(((f % 100) / 50) - 1); // 1 -> 0 -> 1 sweep
  const scanY = 440 + (1 - tri) * 600;
  const alt = Math.round(152 - 38 * p);
  const ndvi = (0.58 + 0.16 * tween(f, 10, 120)).toFixed(2);
  const cardF = f - 72;
  const unfold = tween(cardF, 0, 30, -88, 0, easeOut);
  const blur = tween(f, 70, 100, 0, 5);
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(#bcd8cf 0%, #e8efe3 20%)', overflow: 'hidden' }}>
      <AbsoluteFill style={{ perspective: 1500, perspectiveOrigin: '50% 400px', filter: `blur(${blur}px)` }}>
        <Img src={staticFile('cr-campos.jpg')} style={{ position: 'absolute', left: -140, top: -292, width: 2200, height: 1385, transform: `translateZ(${p * 820}px) translateX(${Math.sin(f / 38) * 14}px) rotateZ(${Math.sin(f / 51) * 0.7}deg)`, filter: 'saturate(1.12) contrast(1.04)' }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 55%, transparent 60%, rgba(8,24,14,0.5) 100%)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 440, height: Math.max(0, scanY - 440), background: 'linear-gradient(rgba(67,165,102,0), rgba(67,165,102,0.28))', mixBlendMode: 'screen', filter: `blur(${blur}px)` }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: scanY, height: 4, background: C.cream, boxShadow: '0 0 28px 8px rgba(67,165,102,0.9), 0 0 90px 24px rgba(67,165,102,0.45)' }} />
      {/* HUD */}
      <div style={{ position: 'absolute', inset: 48, opacity: tween(f, 4, 18) * tween(f, 90, 110, 1, 0.55) }}>
        {[[0, 0], [0, 1], [1, 1]].map(([x, y]) => (
          <div key={`${x}${y}`} style={{ position: 'absolute', [x ? 'right' : 'left']: 0, [y ? 'bottom' : 'top']: 0, width: 56, height: 56, [y ? 'borderBottom' : 'borderTop']: `3px solid ${C.cream}`, [x ? 'borderRight' : 'borderLeft']: `3px solid ${C.cream}`, opacity: 0.85 }} />
        ))}
        <div style={{ position: 'absolute', left: 28, top: 30, color: C.cream, font: `600 22px ${sans}`, letterSpacing: 3, lineHeight: 1.7, textShadow: '0 2px 10px rgba(0,0,0,0.7)' }}>
          <div>ALT <b style={{ fontSize: 34 }}>{alt}</b> m</div>
          <div>NDVI <b style={{ fontSize: 34, color: '#9be8b3' }}>{ndvi}</b></div>
        </div>
        <div style={{ position: 'absolute', left: 28, bottom: 150, color: C.cream, font: `600 18px ${sans}`, letterSpacing: 4, opacity: 0.85, textShadow: '0 2px 10px rgba(0,0,0,0.7)' }}>SCANNING PLOT · ILLUSTRATIVE</div>
      </div>
      {/* data card */}
      <div style={{ position: 'absolute', right: 110, top: 150, width: 800, perspective: 1600, opacity: tween(cardF, 0, 8) }}>
        <div style={{ transformOrigin: '50% 0', transform: `rotateX(${unfold}deg)`, background: C.cream, borderRadius: 32, padding: '36px 44px 30px', boxShadow: '0 40px 100px rgba(0,0,0,0.45)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ font: `700 46px ${serif}`, color: C.dark }}>Plot data</div>
            <div style={{ font: `600 17px ${sans}`, letterSpacing: 2, color: C.soil, textTransform: 'uppercase' }}>Illustrative values</div>
          </div>
          <div style={{ height: 3, background: C.leaf, borderRadius: 2, margin: '16px 0 6px', width: tween(cardF, 10, 36, 0, 100) + '%' }} />
          {ROWS.map((r, i) => {
            const o = tween(cardF, 22 + i * 8, 38 + i * 8);
            return (
              <div key={r.label} style={{ display: 'flex', alignItems: 'center', padding: '17px 0', borderBottom: i < 3 ? '1px solid rgba(15,42,28,0.12)' : 'none', opacity: o, transform: `translateY(${(1 - o) * 14}px)` }}>
                <div style={{ width: 62, height: 62, borderRadius: 31, background: C.forest, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 22 }}>
                  <svg width={32} height={32} viewBox="0 0 24 24"><path d={ICONS[r.icon]} fill={C.cream} /></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ font: `600 30px ${sans}`, color: C.dark }}>{r.label}</div>
                  <div style={{ font: `600 19px ${sans}`, color: C.forest, letterSpacing: 1.5, marginTop: 3 }}>{r.src}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ font: `700 38px ${serif}`, color: C.dark }}>{r.val}</div>
                  <div style={{ font: `500 17px ${sans}`, color: C.soil }}>{r.unit}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
