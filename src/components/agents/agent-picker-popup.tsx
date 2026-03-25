// src/components/agents/agent-picker-popup.tsx
'use client';

import { useEffect, useRef } from 'react';
import { Rocket, Brain, Wrench, Search, CheckCircle, FlaskConical, Upload } from 'lucide-react';
import type { AgentArchetype } from '../../lib/types-swarm';

export interface AgentPickerPopupProps {
  isOpen: boolean;
  onClose: () => void;
  agents: AgentArchetype[];
  selectedAgentId?: string;
  onSelect: (agentId: string) => void;
  onSpawn?: (agentId: string) => void;
  position?: { x: number; y: number };
}

const AGENT_ICONS: Record<string, React.ReactNode> = {
  architect: <Brain className="w-4 h-4" />,
  engineer: <Wrench className="w-4 h-4" />,
  investigator: <Search className="w-4 h-4" />,
  reviewer: <CheckCircle className="w-4 h-4" />,
  tester: <FlaskConical className="w-4 h-4" />,
  shipper: <Upload className="w-4 h-4" />,
};

export function AgentPickerPopup({
  isOpen,
  onClose,
  agents,
  selectedAgentId,
  onSelect,
  onSpawn,
  position,
}: AgentPickerPopupProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const style = position
    ? { position: 'absolute' as const, left: position.x, top: position.y + 8 }
    : {};

  return (
    <div
      ref={ref}
      style={style}
      className="z-50 min-w-[180px] rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-1 shadow-lg"
    >
      {/* Orchestrator option */}
      <button
        onClick={() => {
          onSelect('orchestrator');
          onClose();
        }}
        className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
          selectedAgentId === 'orchestrator'
            ? 'bg-[var(--accent-info)]/20 text-[var(--accent-info)]'
            : 'text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
        }`}
      >
        <Rocket className="w-4 h-4" />
        <span className="font-medium">Orchestrator</span>
        <span className="ml-auto text-xs text-[var(--text-tertiary)]">auto</span>
      </button>

      <div className="my-1 border-t border-[var(--border-subtle)]" />

      {/* Agent types */}
      {agents.map((agent) => (
        <button
          key={agent.id}
          onClick={() => {
            onSelect(agent.id);
            onClose();
          }}
          className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
            selectedAgentId === agent.id
              ? 'bg-[var(--accent-info)]/20 text-[var(--accent-info)]'
              : 'text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
          }`}
        >
          <span style={{ color: agent.color }}>
            {AGENT_ICONS[agent.id] || <Wrench className="w-4 h-4" />}
          </span>
          <span>{agent.name}</span>
        </button>
      ))}

      {/* Spawn button */}
      {onSpawn && selectedAgentId && (
        <>
          <div className="my-1 border-t border-[var(--border-subtle)]" />
          <button
            onClick={() => {
              onSpawn(selectedAgentId);
              onClose();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-emerald-500/20 px-3 py-2 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/30"
          >
            <Rocket className="w-4 h-4" />
            Spawn {agents.find(a => a.id === selectedAgentId)?.name || 'Agent'}
          </button>
        </>
      )}
    </div>
  );
}
