import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type BeadStatus = 'ready' | 'in_progress' | 'blocked' | 'closed';
type BadgeSize = 'sm' | 'md';

interface StatusBadgeProps {
  status: BeadStatus;
  size?: BadgeSize;
}

const STATUS_CLASSES: Record<BeadStatus, string> = {
  ready: 'border-teal-500/30 bg-teal-500/15 text-teal-200',
  in_progress: 'border-green-500/30 bg-green-500/15 text-green-200',
  blocked: 'border-amber-500/30 bg-amber-500/15 text-amber-200',
  closed: 'border-slate-500/30 bg-slate-500/15 text-slate-300',
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs px-2.5 py-0.5',
};

const STATUS_LABELS: Record<BeadStatus, string> = {
  ready: 'Ready',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  closed: 'Closed',
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'rounded-md border font-semibold',
        STATUS_CLASSES[status],
        SIZE_CLASSES[size]
      )}
    >
      {STATUS_LABELS[status]}
    </Badge>
  );
}
