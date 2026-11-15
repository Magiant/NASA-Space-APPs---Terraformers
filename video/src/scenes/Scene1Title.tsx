import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C, sans, serif } from '../theme';
import { easeOut, tween } from '../components';

export const Scene1Title = () => {
  const f = useCurrentFrame();
  const o = tween(f, 4, 26, 0, 1, easeOut);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 55%, ${C.forest} 0%, ${C.dark} 62%)`, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ opacity: o, transform: `translateY(${(1 - o) * 24}px)`, font: `700 132px/1 ${serif}`, color: C.cream, letterSpacing: -2 }}>Team Terraformers</div>
      <div style={{ width: tween(f, 12, 40, 0, 220, easeOut), height: 3, background: C.leaf, margin: '34px 0 30px', borderRadius: 2 }} />
      <div style={{ opacity: tween(f, 18, 38), font: `500 38px ${sans}`, color: C.cream, letterSpacing: 10, textTransform: 'uppercase' }}>Costa Rica</div>
    </AbsoluteFill>
  );
};
