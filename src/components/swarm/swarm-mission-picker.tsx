"use client";

import React from 'react';
import { useUrlState } from '../../hooks/use-url-state';

// Mock hook for now, would connect to actual beads data
const useMissionList = () => ({
    missions: [
        { id: '1', title: 'Sample Mission', progress: 50 }
    ]
});

export function SwarmMissionPicker() {
    const { setView, setSwarmId, swarmId } = useUrlState();
    const { missions } = useMissionList();

    return (
        <div className="flex flex-col gap-2 p-2 w-full">
            <h2 className="px-2 text-sm font-semibold text-muted-foreground">Active Missions</h2>
            {missions.map(m => (
                <button
                    key={m.id}
                    onClick={() => {
                        setView('swarm');
                        setSwarmId(m.id);
                    }}
                    className={`flex flex-col items-start p-3 min-h-[44px] rounded-md hover:bg-accent transition-colors w-full focus:outline-none focus:ring-2 focus:ring-ring ${swarmId === m.id ? 'bg-accent border' : ''}`}
                >
                    <span className="font-medium text-sm">{m.title}</span>
                    <div className="w-full bg-secondary h-1 mt-2 rounded">
                        <div className="bg-primary h-1 rounded transition-all duration-300" style={{ width: `${m.progress}%` }} />
                    </div>
                </button>
            ))}
        </div>
    );
}
