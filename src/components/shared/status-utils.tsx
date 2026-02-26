export function statusGradient(status: string): string {
  switch (status) {
    case 'ready':
      return 'border-l-2 border-emerald-400 bg-emerald-500/15';
    case 'in_progress':
      return 'border-l-2 border-amber-400 bg-amber-500/15';
    case 'blocked':
      return 'border-l-2 border-rose-400 bg-rose-500/15';
    case 'closed':
      return 'border-l-2 border-slate-400/60 bg-slate-500/10 opacity-80';
    case 'open':
      return 'border-l-2 border-sky-400 bg-sky-500/15';
    case 'deferred':
      return 'border-l-2 border-slate-400/60 bg-slate-500/10';
    default:
      return 'border-l-2 border-slate-400/60 bg-slate-500/10';
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
