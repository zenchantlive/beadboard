// src/components/agents/agent-spawn-button.tsx
'use client';

import { Rocket, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import type { WorkerStatus } from './hooks/use-agent-status';

export interface AgentSpawnButtonProps {
  beadId: string;
  agentTypeId?: string;
  workerStatus: WorkerStatus;
  workerDisplayName?: string;
  workerError?: string;
  onSpawn: () => void;
  size?: 'sm' | 'md';
  disabled?: boolean;
}

const STATUS_CONFIG: Record<WorkerStatus, {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  title: string;
  pulsing?: boolean;
}> = {
  idle: {
    icon: <Rocket className="w-3 h-3" />,
    color: '#6b7280',
    bgColor: 'rgba(107, 114, 128, 0.1)',
    borderColor: 'rgba(107, 114, 128, 0.3)',
    title: 'No agent assigned',
  },
  spawning: {
    icon: <Loader2 className="w-3 h-3 animate-spin" />,
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
    title: 'Spawning...',
    pulsing: true,
  },
  working: {
    icon: <Rocket className="w-3 h-3" />,
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
    title: 'Working',
    pulsing: true,
  },
  blocked: {
    icon: <AlertCircle className="w-3 h-3" />,
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    title: 'Blocked',
  },
  completed: {
    icon: <CheckCircle className="w-3 h-3" />,
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
    title: 'Completed',
  },
  failed: {
    icon: <AlertCircle className="w-3 h-3" />,
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    title: 'Failed',
  },
};

export function AgentSpawnButton({
  beadId,
  agentTypeId,
  workerStatus,
  workerDisplayName,
  workerError,
  onSpawn,
  size = 'sm',
  disabled = false,
}: AgentSpawnButtonProps) {
  const config = STATUS_CONFIG[workerStatus];
  const sizeClasses = size === 'sm' ? 'h-6 w-6' : 'h-7 w-7';
  
  // No agent assigned - don't show button
  if (!agentTypeId && workerStatus === 'idle') {
    return null;
  }

  const canSpawn = workerStatus === 'idle' && agentTypeId;
  const showTooltip = workerStatus === 'working' || workerStatus === 'blocked' || workerStatus === 'completed';

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={() => canSpawn && !disabled && onSpawn()}
        disabled={disabled || !canSpawn}
        className={`inline-flex ${sizeClasses} items-center justify-center rounded-md border transition-colors ${
          disabled || !canSpawn ? 'cursor-default' : 'hover:opacity-80'
        } ${config.pulsing ? 'animate-pulse' : ''}`}
        style={{
          backgroundColor: config.bgColor,
          borderColor: config.borderColor,
          color: config.color,
        }}
        title={workerDisplayName ? `${config.title}: ${workerDisplayName}` : config.title}
      >
        {config.icon}
      </button>

      {/* Tooltip for active workers */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
          <div className="rounded-md bg-[var(--surface-elevated)] border border-[var(--border-subtle)] px-3 py-2 shadow-lg min-w-[160px]">
            <p className="text-xs font-medium text-[var(--text-primary)]">
              {workerDisplayName || 'Agent'}
            </p>
            <p className="text-[10px] text-[var(--text-tertiary)] capitalize">
              {workerStatus}
            </p>
            {workerError && (
              <p className="text-[10px] text-red-400 mt-1 truncate">
                {workerError}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
