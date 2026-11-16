import React from 'react';
import { Composition, Still } from 'remotion';
import { Moodboard } from './Moodboard';
import { Showreel } from './Showreel';
import { SHOWREEL_FRAMES } from './timeline';
import { FPS, HEIGHT, WIDTH } from './design/tokens';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="Showreel" component={Showreel} durationInFrames={SHOWREEL_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Still id="Moodboard" component={Moodboard} width={WIDTH} height={HEIGHT} />
    </>
  );
};
