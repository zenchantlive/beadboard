import { interpolate, useCurrentFrame, useVideoConfig, AbsoluteFill, Sequence, Img, staticFile, spring } from 'remotion';
import React from 'react';
import { loadFont } from '@remotion/google-fonts/inter';
import { Background } from './components/Background';
import { TerminalScene } from './components/TerminalScene';
import { TimelineScene } from './components/TimelineScene';

loadFont();

const COLORS = {
  textPrimary: '#FFFFFF',
  textSecondary: '#B8B8B8',
  accentGreen: '#7CB97A',
  accentTeal: '#5BA8A0',
  accentAmber: '#D4A574',
};

const Logo: React.FC<{ scale?: number }> = ({ scale = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const dots = [
    { color: COLORS.accentGreen, delay: 0 },
    { color: COLORS.accentTeal, delay: 5 },
    { color: COLORS.accentAmber, delay: 10 },
    { color: COLORS.accentTeal, delay: 15 },
    { color: COLORS.accentGreen, delay: 20 },
    { color: COLORS.accentAmber, delay: 25 },
    { color: COLORS.accentGreen, delay: 30 },
    { color: COLORS.accentTeal, delay: 35 },
    { color: COLORS.accentAmber, delay: 40 },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 p-4" style={{ transform: `scale(${scale})` }}>
      {dots.map((dot, i) => {
         const spr = spring({ 
           frame: frame - dot.delay, 
           fps, 
           config: { damping: 10 } 
         });
         const s = interpolate(spr, [0, 1], [0, 1]);
         const opacity = interpolate(spr, [0, 1], [0, 1]);
         
         return (
           <div
             key={i}
             className="w-4 h-4 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.3)]"
             style={{
               backgroundColor: dot.color,
               opacity,
               transform: `scale(${s})`,
             }}
           />
         );
      })}
    </div>
  );
};

const GlassCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#363636]/40 shadow-2xl ${className}`}
      style={{
        backdropFilter: 'blur(16px)',
        boxShadow: '0 24px 56px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
      }}
    >
      {children}
    </div>
  );
};

const TitleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 1]);
  const y = interpolate(frame, [0, 20], [30, 0]);
  const blur = interpolate(frame, [0, 20], [10, 0]);

  return (
    <AbsoluteFill className="items-center justify-center flex-col z-10">
       <div style={{ opacity, transform: `translateY(${y}px)`, filter: `blur(${blur}px)` }} className="flex flex-col items-center gap-8">
          <Logo scale={3} />
          <div className="text-center mt-10">
            <h1 className="text-8xl font-bold tracking-tight mb-6 drop-shadow-2xl" style={{ color: COLORS.textPrimary, fontFamily: 'Inter' }}>
              Beadboard
            </h1>
            <p className="text-3xl font-medium tracking-wide drop-shadow-md" style={{ color: COLORS.textSecondary, fontFamily: 'Inter' }}>
              Agent-Driven Project Orchestration
            </p>
          </div>
       </div>
    </AbsoluteFill>
  );
};

const ShowcaseScene: React.FC<{ src: string; title: string; subtitle: string }> = ({ src, title, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const spr = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.8 },
  });

  const opacity = interpolate(frame, [0, 15], [0, 1]);
  const scale = interpolate(spr, [0, 1], [0.92, 1]);
  const y = interpolate(spr, [0, 1], [60, 0]);
  
  // Continuous floating animation
  const floatY = Math.sin(frame / 40) * 8;

  return (
    <AbsoluteFill className="items-center justify-center p-20 z-10">
      <div className="w-full max-w-6xl flex flex-col items-center gap-10" style={{ opacity, transform: `translateY(${y}px)` }}>
        <div className="text-center drop-shadow-lg">
            <h2 className="text-6xl font-bold mb-4" style={{ color: COLORS.textPrimary, fontFamily: 'Inter' }}>{title}</h2>
            <p className="text-2xl font-medium" style={{ color: COLORS.textSecondary, fontFamily: 'Inter' }}>{subtitle}</p>
        </div>
        
        <div style={{ transform: `translateY(${floatY}px)` }} className="w-full">
            <GlassCard className="w-full aspect-video flex items-center justify-center group">
            <div style={{ transform: `scale(${scale})`, width: '100%', height: '100%' }}>
                <Img src={staticFile(src)} className="w-full h-full object-cover opacity-90" />
                {/* Shine effect */}
                <div 
                    className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0" 
                    style={{ transform: `translateX(${Math.sin(frame / 60) * 10}%)` }}
                />
            </div>
            </GlassCard>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const OutroScene: React.FC = () => {
    const frame = useCurrentFrame();
    const opacity = interpolate(frame, [0, 20], [0, 1]);
    const scale = interpolate(frame, [0, 100], [1, 1.1]);

    return (
        <AbsoluteFill className="items-center justify-center z-10">
            <div style={{ opacity, transform: `scale(${scale})` }} className="text-center">
              <h2 className="text-8xl font-bold mb-8 drop-shadow-2xl" style={{ color: COLORS.textPrimary, fontFamily: 'Inter' }}>
                Build Faster.
              </h2>
               <p className="text-4xl font-semibold drop-shadow-lg" style={{ color: COLORS.accentTeal, fontFamily: 'Inter' }}>
                Deploy with Confidence.
              </p>
            </div>
         </AbsoluteFill>
    );
}

export const Main: React.FC = () => {
  return (
    <AbsoluteFill>
      <Background />
      
      <Sequence durationInFrames={90}>
        <TitleScene />
      </Sequence>

      <Sequence from={90} durationInFrames={100}>
        <ShowcaseScene 
            src="graph-hero.png" 
            title="Visual Workflow" 
            subtitle="Orchestrate complex agent behaviors with intuitive graphs." 
        />
      </Sequence>

      <Sequence from={190} durationInFrames={100}>
        <ShowcaseScene 
            src="kanban-hero.png" 
            title="Agent Kanban" 
            subtitle="Track autonomous tasks and parallel execution." 
        />
      </Sequence>

      <Sequence from={290} durationInFrames={300}>
        <TerminalScene />
      </Sequence>

      <Sequence from={590} durationInFrames={140}>
        <TimelineScene />
      </Sequence>

      <Sequence from={730} durationInFrames={80}>
         <OutroScene />
      </Sequence>
    </AbsoluteFill>
  );
};
