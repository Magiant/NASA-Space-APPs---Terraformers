import { AbsoluteFill, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { HAS_FOOTAGE } from '../generated';
import { C, sans, serif } from '../theme';
import { Phone, easeOut, tween } from '../components';

/** Drop the recording at public/footage/app-uso.mp4. Segments: [source second, speed, frames in scene]. */
const FOOTAGE = 'footage/app-uso.mp4';
const SEGMENTS: [number, number, number][] = [[1.5, 3.5, 26], [16, 3, 60], [25, 3.5, 34]];
const CHIPS = ['Tap your district', 'Best crops for it', 'What to plant next'];
const CHIP_AT = [0, 26, 86];

const Placeholder = () => (
  <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(160deg, ${C.cream}, #dfe8d8)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center', padding: 30, font: `600 26px ${sans}`, color: C.forest }}>
    <div style={{ font: `700 36px ${serif}` }}>App footage</div>
    <div>Drop <b>video/public/footage/app-uso.mp4</b> and re-run</div>
  </div>
);

export const Scene5Phone = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sp = spring({ frame: f - 2, fps, config: { damping: 20, stiffness: 80 } });
  const chip = CHIP_AT.filter((c) => f >= c).length - 1;
  let at = 0;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 30% 40%, ${C.forest} 0%, ${C.dark} 70%)` }}>
      <div style={{ position: 'absolute', left: 300, top: 64, transform: `translateY(${(1 - sp) * 220}px) scale(0.93) rotate(${(1 - sp) * -3}deg)`, transformOrigin: 'top left', opacity: tween(f, 0, 10) }}>
        <Phone>
          {HAS_FOOTAGE ? SEGMENTS.map(([src, rate, len], i) => {
            const from = at; at += len;
            return (
              <Sequence key={i} from={from} durationInFrames={len} layout="none">
                <OffthreadVideo src={staticFile(FOOTAGE)} startFrom={Math.round(src * 30)} playbackRate={rate} muted style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              </Sequence>
            );
          }) : <Placeholder />}
        </Phone>
      </div>
      <div style={{ position: 'absolute', left: 880, top: 250 }}>
        <div style={{ font: `600 22px ${sans}`, letterSpacing: 6, color: C.leaf, textTransform: 'uppercase', opacity: tween(f, 6, 22) }}>TerraFarm app</div>
        <div style={{ opacity: tween(f, 10, 30, 0, 1, easeOut), transform: `translateY(${tween(f, 10, 30, 26, 0, easeOut)}px)`, font: `700 92px/1.08 ${serif}`, color: C.cream, marginTop: 18, letterSpacing: -2 }}>What to plant</div>
        <div style={{ opacity: tween(f, 24, 44, 0, 1, easeOut), transform: `translateY(${tween(f, 24, 44, 26, 0, easeOut)}px)`, font: `700 92px/1.08 ${serif}`, color: C.leaf, letterSpacing: -2 }}>· what to rotate next</div>
        <div style={{ display: 'flex', gap: 16, marginTop: 60, opacity: tween(f, 40, 56) }}>
          {CHIPS.map((c, i) => (
            <div key={c} style={{ padding: '14px 26px', borderRadius: 999, font: `600 26px ${sans}`, background: chip === i ? C.leaf : 'rgba(244,241,232,0.08)', color: chip === i ? C.dark : 'rgba(244,241,232,0.7)', border: `1px solid ${chip === i ? C.leaf : 'rgba(244,241,232,0.25)'}` }}>{i + 1} · {c}</div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
