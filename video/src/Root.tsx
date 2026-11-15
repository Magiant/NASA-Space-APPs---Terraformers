import { Composition } from 'remotion';
import { TerraFarmDemo } from './TerraFarmDemo';
import { FPS, TOTAL } from './theme';

export const RemotionRoot = () => (
  <Composition id="TerraFarmDemo" component={TerraFarmDemo} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} />
);
