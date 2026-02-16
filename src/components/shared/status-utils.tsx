export function statusGradient(status: string): string {
  switch (status) {
    case 'ready':
    case 'open':
      return 'bg-[linear-gradient(145deg,rgba(34,45,42,0.92)_0%,rgba(24,32,30,0.88)_50%,rgba(18,28,26,0.9)_100%)]';
    case 'in_progress':
      return 'bg-[linear-gradient(145deg,rgba(42,40,32,0.92)_0%,rgba(32,30,24,0.88)_50%,rgba(26,24,18,0.9)_100%)]';
    case 'blocked':
      return 'bg-[linear-gradient(145deg,rgba(60,24,30,0.95)_0%,rgba(45,18,24,0.9)_50%,rgba(32,12,16,0.92)_100%)]';
    case 'closed':
      return 'bg-[linear-gradient(145deg,rgba(28,30,34,0.75)_0%,rgba(22,24,28,0.72)_50%,rgba(18,20,24,0.75)_100%)] opacity-75';
    default:
      return 'bg-[linear-gradient(145deg,rgba(38,40,48,0.92)_0%,rgba(28,30,36,0.88)_50%,rgba(22,24,30,0.9)_100%)]';
  }
}

export function statusBorder(status: string): string {
  switch (status) {
    case 'ready':
    case 'open':
      return 'border-emerald-500/20';
    case 'in_progress':
      return 'border-amber-500/20';
    case 'blocked':
      return 'border-rose-500/20';
    case 'closed':
      return 'border-rose-500/30';
    default:
      return 'border-white/[0.06]';
  }
}

export function statusDotColor(status: string): string {
  switch (status) {
    case 'ready':
    case 'open':
      return 'bg-emerald-400';
    case 'in_progress':
      return 'bg-amber-400';
    case 'blocked':
      return 'bg-rose-400';
    case 'closed':
      return 'bg-slate-400';
    default:
      return 'bg-slate-400';
  }
}

export function sessionStateGlow(state: string): string {
  switch (state) {
    case 'active': return 'shadow-[0_0_12px_rgba(74,222,128,0.3)] border-emerald-500/30';
    case 'needs_input': return 'shadow-[0_0_12px_rgba(248,113,113,0.3)] border-rose-500/30';
    case 'stuck': return 'ring-2 ring-red-500 animate-pulse shadow-[0_0_16px_rgba(239,68,68,0.5)]';
    case 'dead': return 'opacity-40 grayscale';
    case 'evicted': return 'opacity-60 grayscale-[0.5]';
    case 'stale': return 'opacity-60 grayscale-[0.5]';
    case 'completed': return 'opacity-80';
    default: return '';
  }
}
