import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

type AgentStatus = 'active' | 'stale' | 'stuck' | 'dead';
type AvatarSize = 'sm' | 'md' | 'lg';

interface AgentAvatarProps {
  name: string;
  status: AgentStatus;
  src?: string;
  size?: AvatarSize;
}

const STATUS_GLOW: Record<AgentStatus, string> = {
  active: 'shadow-[0_0_12px_rgba(74,222,128,0.4)] ring-2 ring-emerald-500/40',
  stale: 'shadow-[0_0_10px_rgba(251,191,36,0.3)] ring-2 ring-amber-500/30',
  stuck: 'shadow-[0_0_12px_rgba(248,113,113,0.4)] ring-2 ring-rose-500/40',
  dead: 'shadow-[0_0_8px_rgba(127,29,29,0.4)] ring-2 ring-red-900/40 opacity-60',
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

export function AgentAvatar({ name, status, src, size = 'md' }: AgentAvatarProps) {
  return (
    <Avatar className={cn(SIZE_CLASSES[size], STATUS_GLOW[status], 'transition-all duration-200')}>
      {src && <AvatarImage src={src} alt={name} />}
      <AvatarFallback className="bg-surface-muted text-text-body text-xs font-semibold">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
