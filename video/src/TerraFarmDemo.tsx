import { AbsoluteFill, Audio, Sequence, interpolate, staticFile } from 'remotion';
import { HAS_AUDIO, VOICE_FILE } from './generated';
import { Fade, Subtitles, Watermark } from './components';
import { FPS, S, TOTAL, XF } from './theme';
import { Scene1Title } from './scenes/Scene1Title';
import { Scene2Map } from './scenes/Scene2Map';
import { Scene3Logo } from './scenes/Scene3Logo';
import { Scene4Drone } from './scenes/Scene4Drone';
import { Scene5Phone } from './scenes/Scene5Phone';
import { Scene6Storm } from './scenes/Scene6Storm';
import { Scene7Globe } from './scenes/Scene7Globe';

const scenes = [
  [S.s1, S.s2, Scene1Title], [S.s2, S.s3, Scene2Map], [S.s3, S.s4, Scene3Logo], [S.s4, S.s5, Scene4Drone],
  [S.s5, S.s6, Scene5Phone], [S.s6, S.s7, Scene6Storm], [S.s7, S.end, Scene7Globe],
] as const;

// [second, file, volume]
const SFX: [number, string, number][] = [[1.75, 'whoosh', 0.5], [5.85, 'chime', 0.55], [8.8, 'whoosh', 0.5], [13.85, 'whoosh', 0.4], [17.8, 'whoosh', 0.55], [21.95, 'ping', 0.7], [22.75, 'whoosh', 0.5]];

export const TerraFarmDemo = () => {
  const musicVol = (f: number) => (VOICE_FILE ? 0.13 : 0.45) * interpolate(f, [0, 60, TOTAL - 60, TOTAL], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {scenes.map(([a, b, Comp], i) => (
        <Sequence key={i} from={a} durationInFrames={b - a + (i < scenes.length - 1 ? XF : 0)} name={Comp.name}>
          {i === 0 ? <Comp /> : <Fade><Comp /></Fade>}
        </Sequence>
      ))}
      <Subtitles />
      <Watermark />
      {HAS_AUDIO && <Audio src={staticFile('audio/music.wav')} volume={musicVol} />}
      {HAS_AUDIO && SFX.map(([t, n, v], i) => (
        <Sequence key={i} from={Math.round(t * FPS)}><Audio src={staticFile(`audio/${n}.wav`)} volume={v} /></Sequence>
      ))}
      {VOICE_FILE && <Audio src={staticFile(VOICE_FILE)} />}
    </AbsoluteFill>
  );
};
