import React from 'react';
import { geoDistance, geoGraticule10, geoOrthographic, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import topo from 'world-atlas/land-110m.json';

const land = feature(topo as any, (topo as any).objects.land) as any;
const grat = geoGraticule10();

export type Proj = ReturnType<typeof makeProj>;
export const makeProj = (lon: number, lat: number, r: number, cx: number, cy: number) =>
  geoOrthographic().rotate([-lon, -lat]).translate([cx, cy]).scale(r).clipAngle(90);

/** Point on the visible hemisphere -> [x, y, facing 0..1]; null when on the far side. */
export const place = (proj: Proj, lon: number, lat: number, lonc: number, latc: number) => {
  const d = geoDistance([lon, lat], [lonc, latc]);
  if (d > Math.PI / 2 - 0.04) return null;
  const p = proj([lon, lat]);
  return p ? { x: p[0], y: p[1], facing: Math.min(1, (Math.PI / 2 - d) / 0.35) } : null;
};

export const Globe: React.FC<{ lon: number; lat: number; r: number; cx: number; cy: number; children?: (p: Proj) => React.ReactNode }> = ({ lon, lat, r, cx, cy, children }) => {
  const proj = makeProj(lon, lat, r, cx, cy);
  const path = geoPath(proj);
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
      <defs>
        <radialGradient id="atmo" cx="50%" cy="50%" r="50%"><stop offset="0.86" stopColor="#6bb8ff" stopOpacity="0" /><stop offset="0.93" stopColor="#6bb8ff" stopOpacity="0.45" /><stop offset="1" stopColor="#6bb8ff" stopOpacity="0" /></radialGradient>
        <radialGradient id="ocean" cx="38%" cy="32%" r="85%"><stop offset="0" stopColor="#1b5a7a" /><stop offset="0.6" stopColor="#0d3350" /><stop offset="1" stopColor="#061726" /></radialGradient>
        <radialGradient id="shade" cx="35%" cy="30%" r="80%"><stop offset="0.5" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity="0.55" /></radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r * 1.14} fill="url(#atmo)" />
      <circle cx={cx} cy={cy} r={r} fill="url(#ocean)" />
      <path d={path(grat) ?? ''} fill="none" stroke="#9fd3ff" strokeOpacity={0.12} strokeWidth={1} />
      <path d={path(land) ?? ''} fill="#2f8a52" stroke="#7fd39a" strokeOpacity={0.55} strokeWidth={1.2} />
      <circle cx={cx} cy={cy} r={r} fill="url(#shade)" />
      {children?.(proj)}
    </svg>
  );
};
