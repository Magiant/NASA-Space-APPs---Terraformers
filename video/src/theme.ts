import { loadFont as loadFraunces } from '@remotion/google-fonts/Fraunces';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';

export const FPS = 30;
export const TOTAL = 840; // 28.0 s
export const C = { dark: '#0f2a1c', forest: '#1f5a35', leaf: '#43a566', cream: '#f4f1e8', soil: '#8a6a46' };
export const serif = loadFraunces('normal', { weights: ['600', '700'], subsets: ['latin'] }).fontFamily;
export const sans = loadInter('normal', { weights: ['400', '500', '600', '700'], subsets: ['latin'] }).fontFamily;

/** Scene starts in frames (guion.md: 0-2-6-9-14-18-23-28 s). */
export const S = { s1: 0, s2: 60, s3: 180, s4: 270, s5: 420, s6: 540, s7: 690, end: 840 } as const;
export const XF = 10; // crossfade frames
