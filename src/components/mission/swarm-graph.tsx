'use client';

import { useMemo } from 'react';
import type { SwarmTopologyData } from '../../hooks/use-swarm-topology';

interface SwarmGraphProps {
  topology: SwarmTopologyData | null;
  isLoading: boolean;
}

export function SwarmGraph({ topology, isLoading }: SwarmGraphProps) {
  const nodes = useMemo(() => {
    if (!topology) return [];

    // Simple layout strategy: Clusters
    // Done: Left side
    // Active: Center
    // Ready: Right
    // Blocked: Bottom Right

    const output: React.ReactNode[] = [];

    // 1. Completed (Green Cluster)
    topology.completed.forEach((item, i) => {
      const col = i % 5;
      const row = Math.floor(i / 5);
      output.push(
        <circle
          key={`done-${item.id}`}
          cx={20 + (col * 8)}
          cy={20 + (row * 8)}
          r={2.5}
          fill="#34d399"
          opacity={0.5}
        />
      );
    });

    // 2. Active (Pulsing Center)
    topology.active.forEach((item, i) => {
      const cx = 140 + (i * 20);
      const cy = 30 + (i % 2) * 10;
      output.push(
        <g key={`active-${item.id}`}>
          <circle cx={cx} cy={cy} r={6} fill="#10b981" className="animate-pulse" />
          <circle cx={cx} cy={cy} r={3} fill="#ecfdf5" />
        </g>
      );
    });

    // 3. Ready (White Pipeline)
    topology.ready.forEach((item, i) => {
      const cx = 220 + (i * 10);
      const cy = 30;
      output.push(
        <circle key={`ready-${item.id}`} cx={cx} cy={cy} r={3} fill="#94a3b8" />
      );
    });

    // 4. Blocked (Red Hazard)
    topology.blocked.forEach((item, i) => {
      const cx = 220 + (i * 10);
      const cy = 50;
      output.push(
        <circle key={`blocked-${item.id}`} cx={cx} cy={cy} r={3} fill="#f43f5e" />
      );
    });

    return output;
  }, [topology]);

  if (isLoading) {
    return (
      <div className="h-16 w-full flex items-center justify-center bg-black/20 rounded-lg animate-pulse">
        <span className="text-[10px] text-slate-600 font-mono">SCANNING TOPOLOGY...</span>
      </div>
    );
  }

  if (!topology || (topology.completed.length === 0 && topology.active.length === 0 && topology.ready.length === 0)) {
    return (
      <div className="h-16 w-full flex items-center justify-center bg-black/20 rounded-lg border border-dashed border-slate-800">
        <span className="text-[10px] text-slate-600 font-mono">EMPTY SIGNAL</span>
      </div>
    );
  }

  return (
    <div className="h-16 w-full bg-black/40 rounded-lg border border-white/5 overflow-hidden relative">
      <svg width="100%" height="100%" viewBox="0 0 300 64" preserveAspectRatio="xMidYMid meet">
        {/* Connection Lines (Abstract) */}
        <path d="M 60 30 L 130 30" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
        <path d="M 180 30 L 210 30" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />

        {nodes}

        {/* Labels */}
        <text x="30" y="55" fontSize="8" fill="#475569" textAnchor="middle" fontFamily="monospace">DONE</text>
        <text x="150" y="55" fontSize="8" fill="#10b981" textAnchor="middle" fontFamily="monospace" fontWeight="bold">ACTIVE</text>
        <text x="240" y="15" fontSize="8" fill="#94a3b8" textAnchor="middle" fontFamily="monospace">READY</text>
        <text x="240" y="60" fontSize="8" fill="#f43f5e" textAnchor="middle" fontFamily="monospace">BLOCKED</text>
      </svg>
    </div>
  );
}
