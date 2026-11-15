import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, sans, serif } from '../theme';
import { Logo, easeOut, tween } from '../components';

export const Scene3Logo = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sp = spring({ frame: f - 4, fps, config: { damping: 18, stiffness: 90 } });
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 45%, ${C.forest} 0%, ${C.dark} 70%)`, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', width: 620 * sp, height: 620 * sp, borderRadius: '50%', background: `radial-gradient(circle, rgba(67,165,102,0.35), transparent 68%)`, top: 130 }} />
      <div style={{ transform: `scale(${0.6 + 0.4 * sp})`, opacity: tween(f, 2, 14), marginTop: -70 }}><Logo size={250} /></div>
      <div style={{ opacity: tween(f, 24, 44, 0, 1, easeOut), transform: `translateY(${tween(f, 24, 44, 22, 0, easeOut)}px)`, font: `700 130px/1 ${serif}`, color: C.cream, marginTop: 44, letterSpacing: -2 }}>TerraFarm</div>
      <div style={{ opacity: tween(f, 44, 66), font: `500 40px ${sans}`, color: C.leaf, marginTop: 22, letterSpacing: 8, textTransform: 'uppercase' }}>Together we grow</div>
    </AbsoluteFill>
  );
};
