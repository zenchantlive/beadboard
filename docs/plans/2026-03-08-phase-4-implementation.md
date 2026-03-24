# Phase 4: Launch-Anywhere UX Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add spawn affordances to all UI surfaces with a reusable two-icon system (assign + spawn) that works on social cards, graph nodes, and blocked triage modal.

**Architecture:** Create reusable components (`AgentActionRow`, `AgentAssignButton`, `AgentSpawnButton`) and hooks (`useAgentStatus`, `useSpawnAgent`) in `src/components/agents/`. Each surface imports `AgentActionRow` which handles the full assign → spawn flow. Icon colors reflect agent/worker status (blue=ready, green=working, red=blocked).

**Tech Stack:** React, TypeScript, Lucide icons, existing agent types from `types-swarm.ts`

---

## Prerequisites

- Phase 3 complete (agents, workers, beads work)
- `bb_spawn_worker` tool exists and works
- Worker session manager tracks status

---

## Task 1: Create useAgentStatus Hook

**Files:**
- Create: `src/components/agents/hooks/use-agent-status.ts`

**Step 1: Create hook file with interface**

```typescript
// src/components/agents/hooks/use-agent-status.ts
import { useState, useEffect } from 'react';

export type WorkerStatus = 'idle' | 'spawning' | 'working' | 'blocked' | 'completed' | 'failed';

export interface AgentStatus {
  agentTypeId?: string;
  workerStatus: WorkerStatus;
  workerDisplayName?: string;
  isLoading: boolean;
}

export function useAgentStatus(beadId: string): AgentStatus {
  const [status, setStatus] = useState<AgentStatus>({
    workerStatus: 'idle',
    isLoading: true,
  });

  useEffect(() => {
    // TODO: Fetch from agent status API
    setStatus({ workerStatus: 'idle', isLoading: false });
  }, [beadId]);

  return status;
}
```

**Step 2: Commit**

```bash
git add src/components/agents/hooks/use-agent-status.ts
git commit -m "feat: add useAgentStatus hook interface"
```

---

## Task 2: Create useSpawnAgent Hook

**Files:**
- Create: `src/components/agents/hooks/use-spawn-agent.ts`

**Step 1: Create spawn hook**

```typescript
// src/components/agents/hooks/use-spawn-agent.ts
import { useState } from 'react';

export interface SpawnResult {
  success: boolean;
  workerId?: string;
  displayName?: string;
  error?: string;
}

export function useSpawnAgent(projectRoot: string) {
  const [isSpawning, setIsSpawning] = useState(false);

  const spawn = async (beadId: string, agentTypeId: string): Promise<SpawnResult> => {
    setIsSpawning(true);
    try {
      const response = await fetch('/api/runtime/spawn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectRoot, beadId, agentTypeId }),
      });
      const data = await response.json();
      
      if (!data.ok) {
        return { success: false, error: data.error };
      }
      
      return {
        success: true,
        workerId: data.workerId,
        displayName: data.displayName,
      };
    } catch (error) {
      return { success: false, error: String(error) };
    } finally {
      setIsSpawning(false);
    }
  };

  return { spawn, isSpawning };
}
```

**Step 2: Commit**

```bash
git add src/components/agents/hooks/use-spawn-agent.ts
git commit -m "feat: add useSpawnAgent hook"
```

---

## Task 3: Create hooks index

**Files:**
- Create: `src/components/agents/hooks/index.ts`

**Step 1: Create index file**

```typescript
// src/components/agents/hooks/index.ts
export { useAgentStatus, type AgentStatus, type WorkerStatus } from './use-agent-status';
export { useSpawnAgent, type SpawnResult } from './use-spawn-agent';
```

**Step 2: Commit**

```bash
git add src/components/agents/hooks/index.ts
git commit -m "feat: add agents hooks index"
```

---

## Task 4: Create AgentPickerPopup Component

**Files:**
- Create: `src/components/agents/agent-picker-popup.tsx`

**Step 1: Create picker popup**

```typescript
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
```

**Step 2: Commit**

```bash
git add src/components/agents/agent-picker-popup.tsx
git commit -m "feat: add AgentPickerPopup component"
```

---

## Task 5: Create AgentAssignButton Component

**Files:**
- Create: `src/components/agents/agent-assign-button.tsx`

**Step 1: Create assign button**

```typescript
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
```

**Step 2: Commit**

```bash
git add src/components/agents/agent-assign-button.tsx
git commit -m "feat: add AgentAssignButton component"
```

---

## Task 6: Create AgentSpawnButton Component

**Files:**
- Create: `src/components/agents/agent-spawn-button.tsx`

**Step 1: Create spawn button with color states**

```typescript
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
```

**Step 2: Commit**

```bash
git add src/components/agents/agent-spawn-button.tsx
git commit -m "feat: add AgentSpawnButton with color states"
```

---

## Task 7: Create AgentActionRow Component

**Files:**
- Create: `src/components/agents/agent-action-row.tsx`

**Step 1: Create combined action row**

```typescript
// src/components/agents/agent-action-row.tsx
'use client';

import { AgentAssignButton } from './agent-assign-button';
import { AgentSpawnButton } from './agent-spawn-button';
import { useAgentStatus, useSpawnAgent } from './hooks';
import type { AgentArchetype } from '../../lib/types-swarm';

export interface AgentActionRowProps {
  beadId: string;
  beadStatus: string;
  agents: AgentArchetype[];
  projectRoot: string;
  currentAgentTypeId?: string;
  onAgentAssigned?: (agentTypeId: string) => void;
  onAgentSpawned?: (workerId: string, displayName: string) => void;
  size?: 'sm' | 'md';
}

export function AgentActionRow({
  beadId,
  beadStatus,
  agents,
  projectRoot,
  currentAgentTypeId,
  onAgentAssigned,
  onAgentSpawned,
  size = 'sm',
}: AgentActionRowProps) {
  const { workerStatus, workerDisplayName, workerError } = useAgentStatus(beadId);
  const { spawn, isSpawning } = useSpawnAgent(projectRoot);

  const handleAssign = async (agentTypeId: string) => {
    // Call API to assign agent type to bead
    try {
      const response = await fetch('/api/beads/assign-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beadId, agentTypeId }),
      });
      if (response.ok && onAgentAssigned) {
        onAgentAssigned(agentTypeId);
      }
    } catch (error) {
      console.error('Failed to assign agent:', error);
    }
  };

  const handleSpawn = async () => {
    if (!currentAgentTypeId) return;
    
    const result = await spawn(beadId, currentAgentTypeId);
    if (result.success && onAgentSpawned) {
      onAgentSpawned(result.workerId!, result.displayName!);
    }
  };

  // Don't show for closed beads
  if (beadStatus === 'closed') {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5">
      <AgentAssignButton
        beadId={beadId}
        agents={agents}
        currentAgentTypeId={currentAgentTypeId}
        onAssign={handleAssign}
        size={size}
      />
      <AgentSpawnButton
        beadId={beadId}
        agentTypeId={currentAgentTypeId}
        workerStatus={isSpawning ? 'spawning' : workerStatus}
        workerDisplayName={workerDisplayName}
        workerError={workerError}
        onSpawn={handleSpawn}
        size={size}
      />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/agents/agent-action-row.tsx
git commit -m "feat: add AgentActionRow combining assign + spawn"
```

---

## Task 8: Create agents index

**Files:**
- Create: `src/components/agents/index.ts`

**Step 1: Create index exports**

```typescript
// src/components/agents/index.ts
export { AgentActionRow, type AgentActionRowProps } from './agent-action-row';
export { AgentAssignButton, type AgentAssignButtonProps } from './agent-assign-button';
export { AgentSpawnButton, type AgentSpawnButtonProps } from './agent-spawn-button';
export { AgentPickerPopup, type AgentPickerPopupProps } from './agent-picker-popup';
export * from './hooks';
```

**Step 2: Commit**

```bash
git add src/components/agents/index.ts
git commit -m "feat: add agents components index"
```

---

## Task 9: Add AgentActionRow to SocialCard

**Files:**
- Modify: `src/components/social/social-card.tsx`

**Step 1: Import and add AgentActionRow**

Find the actions area in social-card.tsx (around the rocket button) and replace with:

```typescript
// Add import at top
import { AgentActionRow } from '../agents';

// In the component props, ensure these are available:
// - projectRoot: string
// - archetypes: AgentArchetype[]

// Find the button area (around line 369) and add:
{projectRoot && (
  <AgentActionRow
    beadId={data.id}
    beadStatus={data.status}
    agents={archetypes}
    projectRoot={projectRoot}
    currentAgentTypeId={data.agentTypeId}
    size="sm"
  />
)}
```

**Step 2: Commit**

```bash
git add src/components/social/social-card.tsx
git commit -m "feat: add AgentActionRow to SocialCard"
```

---

## Task 10: Add AgentActionRow to GraphNodeCard

**Files:**
- Modify: `src/components/graph/graph-node-card.tsx`

**Step 1: Import and add AgentActionRow**

```typescript
// Add import
import { AgentActionRow } from '../agents';

// Find the actions area in the node card and add:
<AgentActionRow
  beadId={data.id}
  beadStatus={data.status}
  agents={archetypes || []}
  projectRoot={projectRoot}
  currentAgentTypeId={data.agentTypeId}
  size="sm"
/>
```

**Step 2: Commit**

```bash
git add src/components/graph/graph-node-card.tsx
git commit -m "feat: add AgentActionRow to GraphNodeCard"
```

---

## Task 11: Add AgentActionRow to BlockedTriageModal

**Files:**
- Modify: `src/components/shared/blocked-triage-modal.tsx`

**Step 1: Import and add AgentActionRow**

```typescript
// Add import
import { AgentActionRow } from '../agents';

// In each task row, add the action row:
<AgentActionRow
  beadId={issue.id}
  beadStatus={issue.status}
  agents={archetypes}
  projectRoot={projectRoot}
  currentAgentTypeId={issue.agentTypeId}
  size="md"
/>
```

**Step 2: Commit**

```bash
git add src/components/shared/blocked-triage-modal.tsx
git commit -m "feat: add AgentActionRow to BlockedTriageModal"
```

---

## Task 12: Create Spawn API Endpoint

**Files:**
- Create: `src/app/api/runtime/spawn/route.ts`

**Step 1: Create spawn API**

```typescript
// src/app/api/runtime/spawn/route.ts
import { NextResponse } from 'next/server';
import { workerSessionManager } from '../../../../lib/worker-session-manager';

export async function POST(request: Request) {
  try {
    const { projectRoot, beadId, agentTypeId } = await request.json();

    if (!projectRoot || !beadId || !agentTypeId) {
      return NextResponse.json({
        ok: false,
        error: 'projectRoot, beadId, and agentTypeId are required',
      });
    }

    // Spawn worker via session manager
    const worker = await workerSessionManager.spawnWorker({
      projectRoot,
      taskId: beadId,
      taskContext: `Work on ${beadId}`,
      agentType: agentTypeId,
      beadId,
    });

    return NextResponse.json({
      ok: true,
      workerId: worker.id,
      displayName: worker.displayName,
      agentTypeId: worker.agentTypeId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message });
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/runtime/spawn/route.ts
git commit -m "feat: add spawn API endpoint"
```

---

## Task 13: Create Assign Agent API Endpoint

**Files:**
- Create: `src/app/api/beads/assign-agent/route.ts`

**Step 1: Create assign API**

```typescript
// src/app/api/beads/assign-agent/route.ts
import { NextResponse } from 'next/server';
import { execFileSync } from 'child_process';

export async function POST(request: Request) {
  try {
    const { beadId, agentTypeId } = await request.json();

    if (!beadId || !agentTypeId) {
      return NextResponse.json({
        ok: false,
        error: 'beadId and agentTypeId are required',
      });
    }

    // Use bd CLI to add agent label
    execFileSync('bd', [
      'label',
      'add',
      beadId,
      `agent:${agentTypeId}`,
    ], {
      encoding: 'utf-8',
      timeout: 10000,
    });

    return NextResponse.json({ ok: true, beadId, agentTypeId });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message });
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/beads/assign-agent/route.ts
git commit -m "feat: add assign-agent API endpoint"
```

---

## Task 14: Update useAgentStatus to fetch real data

**Files:**
- Modify: `src/components/agents/hooks/use-agent-status.ts`

**Step 1: Implement real status fetching**

```typescript
// src/components/agents/hooks/use-agent-status.ts
import { useState, useEffect } from 'react';

export type WorkerStatus = 'idle' | 'spawning' | 'working' | 'blocked' | 'completed' | 'failed';

export interface AgentStatus {
  agentTypeId?: string;
  workerStatus: WorkerStatus;
  workerDisplayName?: string;
  workerError?: string;
  isLoading: boolean;
}

export function useAgentStatus(beadId: string): AgentStatus {
  const [status, setStatus] = useState<AgentStatus>({
    workerStatus: 'idle',
    isLoading: true,
  });

  useEffect(() => {
    let cancelled = false;

    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/runtime/worker-status?beadId=${encodeURIComponent(beadId)}`);
        const data = await response.json();
        
        if (!cancelled) {
          setStatus({
            agentTypeId: data.agentTypeId,
            workerStatus: data.workerStatus || 'idle',
            workerDisplayName: data.workerDisplayName,
            workerError: data.workerError,
            isLoading: false,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setStatus({ workerStatus: 'idle', isLoading: false });
        }
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Poll every 5s

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [beadId]);

  return status;
}
```

**Step 2: Commit**

```bash
git add src/components/agents/hooks/use-agent-status.ts
git commit -m "feat: implement real status fetching in useAgentStatus"
```

---

## Task 15: Create Worker Status API

**Files:**
- Create: `src/app/api/runtime/worker-status/route.ts`

**Step 1: Create status API**

```typescript
// src/app/api/runtime/worker-status/route.ts
import { NextResponse } from 'next/server';
import { workerSessionManager } from '../../../../lib/worker-session-manager';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const beadId = searchParams.get('beadId');

    if (!beadId) {
      return NextResponse.json({ ok: false, error: 'beadId required' });
    }

    // Find worker for this bead
    const workers = workerSessionManager.getAllWorkers();
    const worker = workers.find(w => w.beadId === beadId);

    if (!worker) {
      return NextResponse.json({
        ok: true,
        workerStatus: 'idle',
        agentTypeId: null,
      });
    }

    return NextResponse.json({
      ok: true,
      workerStatus: worker.status,
      workerDisplayName: worker.displayName,
      workerError: worker.error,
      agentTypeId: worker.agentTypeId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message });
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/runtime/worker-status/route.ts
git commit -m "feat: add worker-status API endpoint"
```

---

## Task 16: Add agentTypeId to BeadIssue type

**Files:**
- Modify: `src/lib/types.ts`

**Step 1: Add agentTypeId field**

```typescript
// In BeadIssue interface, add:
agentTypeId?: string;
agentInstanceId?: string;
```

**Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add agentTypeId and agentInstanceId to BeadIssue"
```

---

## Task 17: Test the complete flow

**Step 1: Run TypeScript check**

```bash
cd /home/clawdbot/clawd/repos/beadboard
npx tsc --noEmit
```

Expected: No errors related to agents components

**Step 2: Test in browser**

1. Open app
2. Go to social view
3. Click 👤 on a card → picker opens
4. Select Engineer → badge appears, 🚀 turns blue
5. Click 🚀 → spawns worker → 🚀 turns green
6. Hover 🚀 → shows worker name and status

**Step 3: Commit test results**

```bash
git add -A
git commit -m "test: Phase 4 launch-anywhere UX complete"
```

---

## Success Criteria

- [ ] Social cards show 👤 assign button + colored 🚀 spawn button
- [ ] Graph nodes show same two-icon system
- [ ] Blocked triage modal has agent actions
- [ ] Clicking 👤 opens agent picker
- [ ] Selecting agent updates UI (badge + blue rocket)
- [ ] Clicking 🚀 spawns worker
- [ ] Rocket colors: blue=ready, green=working, red=blocked, gray=done
- [ ] Tooltips show worker status on hover
- [ ] Orchestrator is an option in agent picker

---

## Estimated Effort

6-8 hours

---

## Blocked Items

None identified.

---

## Files Summary

| File | Action |
|------|--------|
| `src/components/agents/hooks/use-agent-status.ts` | Create |
| `src/components/agents/hooks/use-spawn-agent.ts` | Create |
| `src/components/agents/hooks/index.ts` | Create |
| `src/components/agents/agent-picker-popup.tsx` | Create |
| `src/components/agents/agent-assign-button.tsx` | Create |
| `src/components/agents/agent-spawn-button.tsx` | Create |
| `src/components/agents/agent-action-row.tsx` | Create |
| `src/components/agents/index.ts` | Create |
| `src/components/social/social-card.tsx` | Modify |
| `src/components/graph/graph-node-card.tsx` | Modify |
| `src/components/shared/blocked-triage-modal.tsx` | Modify |
| `src/app/api/runtime/spawn/route.ts` | Create |
| `src/app/api/beads/assign-agent/route.ts` | Create |
| `src/app/api/runtime/worker-status/route.ts` | Create |
| `src/lib/types.ts` | Modify |
