"use client";

import { Loader2, CheckCircle2 } from "lucide-react";

export type Phase = 'planning' | 'deployment' | 'execution' | 'debrief';

export function ConvoyStepper({ activePhase }: { activePhase: Phase }) {
    const phases: Phase[] = ['planning', 'deployment', 'execution', 'debrief'];

    return (
        <div className="flex flex-wrap items-center gap-4 bg-muted/50 p-4 rounded-lg my-4">
            {phases.map((p, i) => {
                const isActive = activePhase === p;
                const isPast = phases.indexOf(activePhase) > i;

                return (
                    <div
                        key={p}
                        className={`flex items-center gap-2 ${isActive ? 'text-primary' : isPast ? 'text-muted-foreground' : 'text-muted-foreground/50'
                            }`}
                    >
                        {isActive && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isPast && <CheckCircle2 className="w-4 h-4" />}
                        {!isActive && !isPast && <div className="w-4 h-4 rounded-full border border-current" />}
                        <span className="font-mono text-sm uppercase">{p}</span>
                    </div>
                );
            })}
        </div>
    );
}
