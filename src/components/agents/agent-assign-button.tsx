// src/components/agents/agent-assign-button.tsx
'use client';

import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { AgentPickerPopup } from './agent-picker-popup';
import type { AgentArchetype } from '../../lib/types-swarm';

export interface AgentAssignButtonProps {
  beadId: string;
  agents: AgentArchetype[];
  currentAgentTypeId?: string;
  onAssign: (agentTypeId: string) => void;
  size?: 'sm' | 'md';
  disabled?: boolean;
}

export function AgentAssignButton({
  beadId,
  agents,
  currentAgentTypeId,
  onAssign,
  size = 'sm',
  disabled = false,
}: AgentAssignButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const sizeClasses = size === 'sm' 
    ? 'h-6 w-6' 
    : 'h-7 w-7';

  const iconSize = size === 'sm' 
    ? 'w-3 h-3' 
    : 'w-3.5 h-3.5';

  const isAssigned = !!currentAgentTypeId;
  const assignedAgent = agents.find(a => a.id === currentAgentTypeId);
  const bgColor = isAssigned && assignedAgent 
    ? `${assignedAgent.color}30` 
    : 'var(--surface-tertiary)';
  const iconColor = isAssigned && assignedAgent 
    ? assignedAgent.color 
    : 'var(--text-tertiary)';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        className={`inline-flex ${sizeClasses} items-center justify-center rounded-md border transition-colors ${
          disabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:opacity-80'
        }`}
        style={{
          backgroundColor: bgColor,
          borderColor: isAssigned && assignedAgent 
            ? `${assignedAgent.color}50` 
            : 'var(--border-subtle)',
        }}
        title={isAssigned ? `Assigned: ${assignedAgent?.name}` : 'Assign agent'}
      >
        <UserPlus className={iconSize} style={{ color: iconColor }} />
      </button>

      <AgentPickerPopup
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        agents={agents}
        selectedAgentId={currentAgentTypeId}
        onSelect={(agentId) => {
          onAssign(agentId);
          setIsOpen(false);
        }}
      />
    </div>
  );
}
