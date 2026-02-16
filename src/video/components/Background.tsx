import { interpolate, useCurrentFrame, useVideoConfig, AbsoluteFill } from 'remotion';
import React, { useMemo } from 'react';

const COLORS = {
  bgBase: '#2D2D2D',
  accentGreen: '#7CB97A',
  accentAmber: '#D4A574',
  accentTeal: '#5BA8A0',
};

const AnimatedGradient: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Create smooth looping motion for the blobs
  const offset1 = Math.sin(frame / 60) * 10;
  const offset2 = Math.cos(frame / 50) * 10;
  const scale1 = interpolate(Math.sin(frame / 80), [-1, 1], [0.8, 1.2]);
  const scale2 = interpolate(Math.cos(frame / 70), [-1, 1], [0.8, 1.2]);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bgBase, overflow: 'hidden' }}>
      <div
        className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-20 blur-[140px]"
        style={{
          background: COLORS.accentGreen,
          transform: `translate(${offset1}%, ${offset2}%) scale(${scale1})`,
        }}
      />
      <div
        className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full opacity-20 blur-[140px]"
        style={{
          background: COLORS.accentAmber,
          transform: `translate(${-offset2}%, ${-offset1}%) scale(${scale2})`,
        }}
      />
      <div
        className="absolute top-[30%] left-[30%] w-[40%] h-[40%] rounded-full opacity-10 blur-[120px]"
        style={{
          background: COLORS.accentTeal,
          transform: `translate(${offset2 * 0.5}%, ${offset1 * 0.5}%) scale(${scale1})`,
        }}
      />
    </AbsoluteFill>
  );
};

const DotGrid: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Generate a static grid of dots
  // Only calculate once
  const dots = useMemo(() => {
    const d = [];
    const spacing = 80;
    const cols = Math.ceil(width / spacing);
    const rows = Math.ceil(height / spacing);

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        d.push({ x: i * spacing, y: j * spacing, delay: (i + j) * 2 });
      }
    }
    return d;
  }, [width, height]);

  return (
    <AbsoluteFill className="items-center justify-center">
      <svg width="100%" height="100%">
        {dots.map((dot, i) => {
          // Subtle fade in/out ripple effect based on position
          const wave = Math.sin((frame - dot.delay) / 20);
          const opacity = interpolate(wave, [-1, 1], [0.03, 0.15]);
          const scale = interpolate(wave, [-1, 1], [0.5, 1.2]);
          
          return (
            <circle
              key={i}
              cx={dot.x + 40}
              cy={dot.y + 40}
              r={2 * scale}
              fill="white"
              opacity={opacity}
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

export const Background: React.FC = () => {
  return (
    <AbsoluteFill>
      <AnimatedGradient />
      <DotGrid />
    </AbsoluteFill>
  );
};
