import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { BeadStatus } from '@/lib/types';

type BadgeSize = 'sm' | 'md';

interface StatusBadgeProps {
  status: BeadStatus;
  size?: BadgeSize;
}

const STATUS_CLASSES: Partial<Record<BeadStatus, string>> = {
  open: 'border-teal-500/30 bg-teal-500/15 text-teal-200',
  in_progress: 'border-green-500/30 bg-green-500/15 text-green-200',
  blocked: 'border-amber-500/30 bg-amber-500/15 text-amber-200',
  deferred: 'border-slate-500/30 bg-slate-500/15 text-slate-300',
  closed: 'border-slate-500/30 bg-slate-500/15 text-slate-300',
  pinned: 'border-purple-500/30 bg-purple-500/15 text-purple-200',
  hooked: 'border-cyan-500/30 bg-cyan-500/15 text-cyan-200',
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs px-2.5 py-0.5',
};

const STATUS_LABELS: Partial<Record<BeadStatus, string>> = {
  open: 'Open',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  deferred: 'Deferred',
  closed: 'Closed',
  pinned: 'Pinned',
  hooked: 'Hooked',
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const statusClass = STATUS_CLASSES[status] || 'border-slate-500/30 bg-slate-500/15 text-slate-300';
  const statusLabel = STATUS_LABELS[status] || status;
  
  return (
    <Badge
      variant="outline"
      className={cn(
        'rounded-md border font-semibold',
        statusClass,
        SIZE_CLASSES[size]
      )}
    >
      {statusLabel}
    </Badge>
  );
}
