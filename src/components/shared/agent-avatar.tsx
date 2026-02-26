import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export type AgentStatus = 'idle' | 'spawning' | 'running' | 'working' | 'stuck' | 'done' | 'stopped' | 'dead' | 'active' | 'stale';
export type AgentRole = 'ui' | 'graph' | 'orchestrator' | 'agent' | 'researcher';
type AvatarSize = 'sm' | 'md' | 'lg';

interface AgentAvatarProps {
  name: string;
  status: AgentStatus;
  role?: AgentRole;
  src?: string;
  size?: AvatarSize;
}

const ROLE_BORDER_COLORS: Record<AgentRole, string> = {
  ui: 'border-l-[var(--agent-role-ui)]',
  graph: 'border-l-[var(--agent-role-graph)]',
  orchestrator: 'border-l-[var(--agent-role-orchestrator)]',
  agent: 'border-l-[var(--agent-role-agent)]',
  researcher: 'border-l-[var(--agent-role-researcher)]',
};

const STATUS_VISUALS: Record<AgentStatus, string> = {
  idle: 'shadow-none ring-1 ring-white/10',
  spawning: 'animate-pulse shadow-[0_0_12px_rgba(91,168,160,0.4)] ring-2 ring-teal-500/40',
  running: 'shadow-[0_0_12px_rgba(124,185,122,0.4)] ring-2 ring-emerald-500/40',
  working: 'animate-pulse shadow-[0_0_15px_rgba(124,185,122,0.6)] ring-2 ring-emerald-500/50',
  stuck: 'shadow-none ring-2 ring-amber-500/50 after:content-[""] after:absolute after:-bottom-0.5 after:-right-0.5 after:w-2.5 after:h-2.5 after:bg-[#D4A574] after:rounded-full after:border-2 after:border-[#363636]',
  done: 'shadow-[0_0_10px_rgba(124,185,122,0.3)] ring-1 ring-emerald-500/30',
  stopped: 'shadow-none ring-1 ring-white/5 opacity-80',
  dead: 'shadow-[0_0_8px_rgba(201,122,122,0.4)] ring-2 ring-rose-900/40 opacity-60',
  // Legacy mappings for safety
  active: 'shadow-[0_0_12px_rgba(74,222,128,0.4)] ring-2 ring-emerald-500/40',
  stale: 'shadow-[0_0_10px_rgba(251,191,36,0.3)] ring-2 ring-amber-500/30',
};

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function AgentAvatar({ name, status, role, src, size = 'md' }: AgentAvatarProps) {
  const roleClass = role ? cn('border-l-[3px]', ROLE_BORDER_COLORS[role]) : '';

  return (
    <Avatar className={cn(
      SIZE_CLASSES[size], 
      STATUS_VISUALS[status], 
      roleClass,
      'relative overflow-visible transition-all duration-200 bg-surface-muted'
    )}>
      {src && <AvatarImage src={src} alt={name} className="object-cover rounded-full overflow-hidden" />}
      <AvatarFallback className="bg-transparent text-text-body text-xs font-semibold rounded-full overflow-hidden">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
