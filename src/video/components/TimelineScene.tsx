import { interpolate, useCurrentFrame, useVideoConfig, AbsoluteFill, Sequence, spring } from 'remotion';
import React from 'react';

const COLORS = {
  bgBase: '#2D2D2D',
  cardBg: '#363636',
  accentGreen: '#7CB97A',
  accentAmber: '#D4A574',
  accentTeal: '#5BA8A0',
  textPrimary: '#FFFFFF',
  textSecondary: '#B8B8B8',
  border: 'rgba(255, 255, 255, 0.08)',
};

const TimelineCard: React.FC<{ 
    title: string; 
    subtitle: string; 
    time: string; 
    type: 'commit' | 'issue' | 'alert'; 
    index: number; 
}> = ({ title, subtitle, time, type, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const delay = index * 5;
  const spr = spring({
    frame: frame - delay,
    fps,
    config: { damping: 14, mass: 0.8 },
  });

  const y = interpolate(spr, [0, 1], [50, 0]);
  const opacity = interpolate(spr, [0, 1], [0, 1]);

  let iconColor = COLORS.textSecondary;
  if (type === 'commit') iconColor = COLORS.accentTeal;
  if (type === 'issue') iconColor = COLORS.accentGreen;
  if (type === 'alert') iconColor = COLORS.accentAmber;

  return (
    <div 
        style={{ opacity, transform: `translateY(${y}px)` }} 
        className="flex items-start gap-4 p-4 rounded-lg border bg-[#363636] shadow-lg mb-4 w-full max-w-2xl"
        // className="flex items-start gap-4 p-4 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#363636] shadow-lg mb-4 w-full max-w-2xl"
    >
      <div className="mt-1 w-3 h-3 rounded-full" style={{ backgroundColor: iconColor }} />
      <div className="flex-1">
        <div className="flex justify-between items-baseline">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <span className="text-xs text-gray-500 font-mono">{time}</span>
        </div>
        <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
      </div>
    </div>
  );
};

export const TimelineScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const titleOpacity = interpolate(frame, [0, 20], [0, 1]);
    const titleY = interpolate(frame, [0, 20], [20, 0]);

    return (
        <AbsoluteFill className="items-center justify-center p-10 z-10 flex-col">
             <div style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)` }} className="mb-12 text-center">
                <h2 className="text-6xl font-bold text-white mb-2 font-['Inter'] drop-shadow-lg">Live Activity Feed</h2>
                <p className="text-xl text-teal-400 font-mono tracking-widest uppercase">Real-time Project Pulse</p>
             </div>

             <div className="flex flex-col w-full max-w-2xl">
                 <div className="text-xs font-mono text-gray-500 mb-4 uppercase tracking-wider ml-2">Today</div>
                 <Sequence from={10}>
                    <TimelineCard 
                        index={0} type="commit" title="feat: Implement Session Protocol v1" 
                        subtitle="amber-otter pushed to main" time="10:42 AM" 
                    />
                 </Sequence>
                 <Sequence from={25}>
                    <TimelineCard 
                        index={1} type="issue" title="Docs: Update RFC-001" 
                        subtitle="cobalt-harbor commented on #23" time="10:45 AM" 
                    />
                 </Sequence>
                 <Sequence from={40}>
                    <TimelineCard 
                        index={2} type="alert" title="Incursion Alert" 
                        subtitle="obsidian-fox attempted write to locked scope" time="11:02 AM" 
                    />
                 </Sequence>
                 
                 <Sequence from={60}>
                    <div className="text-xs font-mono text-gray-500 mt-6 mb-4 uppercase tracking-wider ml-2">Yesterday</div>
                 </Sequence>

                 <Sequence from={70}>
                    <TimelineCard 
                        index={3} type="issue" title="Refactor: Agent Registry" 
                        subtitle="emerald-wolf closed issue #19" time="4:20 PM" 
                    />
                 </Sequence>
                 <Sequence from={85}>
                    <TimelineCard 
                        index={4} type="commit" title="fix: Graph layout rendering" 
                        subtitle="amber-otter pushed to feature/graph-v2" time="3:15 PM" 
                    />
                 </Sequence>
             </div>
        </AbsoluteFill>
    );
};
