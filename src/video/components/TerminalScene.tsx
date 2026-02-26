import { interpolate, useCurrentFrame, useVideoConfig, AbsoluteFill, Sequence, spring } from 'remotion';
import React, { useMemo } from 'react';

const TerminalLine: React.FC<{ text: string; delay: number; color?: string }> = ({ text, delay, color = '#d1d5db' }) => {
  const frame = useCurrentFrame();
  const chars = text.split('');
  
  return (
    <div className="font-mono text-xl mb-2 flex">
      {chars.map((char, i) => {
        const show = frame > delay + i * 1.5;
        return (
          <span key={i} style={{ opacity: show ? 1 : 0, color }}>
            {char}
          </span>
        );
      })}
    </div>
  );
};

const JSONLine: React.FC<{ data: object; delay: number }> = ({ data, delay }) => {
    const frame = useCurrentFrame();
    const str = JSON.stringify(data, null, 2);
    const lines = str.split('\n');

    const show = frame > delay;
    const opacity = interpolate(frame, [delay, delay + 10], [0, 1]);
    const y = interpolate(frame, [delay, delay + 10], [10, 0]);

    if (!show) return null;

    return (
        <div style={{ opacity, transform: `translateY(${y}px)` }} className="font-mono text-sm text-green-400/90 bg-black/20 p-4 rounded-md border border-green-500/20 my-2">
            {lines.map((line, i) => (
                <div key={i}>{line}</div>
            ))}
        </div>
    );
}


export const TerminalScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, 15], [0, 1]);
  const scale = interpolate(frame, [0, 15], [0.95, 1]);
  
  // Header animation
  const headerY = interpolate(frame, [0, 20], [20, 0]);
  const headerOpacity = interpolate(frame, [0, 20], [0, 1]);

  return (
    <AbsoluteFill className="items-center justify-center bg-transparent p-20 z-10">
      
      {/* Header */}
      <div style={{ transform: `translateY(${headerY}px)`, opacity: headerOpacity }} className="absolute top-20 text-center w-full">
          <h2 className="text-6xl font-bold text-white mb-2 font-['Inter'] drop-shadow-lg">Protocol v1</h2>
          <p className="text-xl text-teal-400 font-mono tracking-widest uppercase">Safe Coordination Contract</p>
      </div>

      <div 
        className="w-full max-w-5xl bg-[#1e1e1e] rounded-xl overflow-hidden shadow-2xl border border-gray-700/50"
        style={{ opacity, transform: `scale(${scale})` }}
      >
        {/* Terminal Header */}
        <div className="bg-[#2d2d2d] px-4 py-3 flex items-center gap-2 border-b border-gray-700">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <div className="ml-4 text-xs text-gray-400 font-mono">beadboard-agent — -zsh — 80x24</div>
        </div>

        {/* Terminal Body */}
        <div className="p-6 h-[600px] font-mono text-gray-300 overflow-hidden relative">
            <Sequence from={20}>
                <TerminalLine text="> bb agent heartbeat --agent amber-otter --json" delay={0} color="#a5f3fc" />
            </Sequence>
            
            <Sequence from={60}>
                 <JSONLine 
                    delay={0} 
                    data={{
                        status: "ok",
                        agent_id: "amber-otter",
                        last_seen: "2026-02-16T10:42:15Z",
                        liveness: "active"
                    }}
                 />
            </Sequence>

            <Sequence from={110}>
                <TerminalLine text="> bb protocol emit HANDOFF --to cobalt-harbor" delay={0} color="#a5f3fc" />
            </Sequence>

            <Sequence from={150}>
                <div className="mt-4 p-4 border-l-4 border-blue-500 bg-blue-500/10">
                    <TerminalLine text="[EVENT] HANDOFF DETECTED" delay={0} color="#60a5fa" />
                    <TerminalLine text="Scope: src/components/sessions/*" delay={10} />
                    <TerminalLine text="From: amber-otter -> To: cobalt-harbor" delay={20} />
                    <TerminalLine text="Reason: Implementation complete, ready for review." delay={30} />
                </div>
            </Sequence>

            <Sequence from={250}>
                 <div className="mt-4 p-4 border-l-4 border-yellow-500 bg-yellow-500/10">
                    <TerminalLine text="[WARN] INCURSION PREVENTED" delay={0} color="#fbbf24" />
                    <TerminalLine text="Target: src/lib/parser.ts (Locked by: obsidian-fox)" delay={10} />
                    <TerminalLine text="Action: Write blocked. Queueing request." delay={20} />
                </div>
            </Sequence>

            {/* Scanlines / CRT Effect Overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))]" style={{ backgroundSize: "100% 2px, 3px 100%" }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
