"use client";

import React, { useState } from 'react';

export function SwarmWorkspace({ selectedMissionId }: { selectedMissionId?: string }) {
    const [activeTab, setActiveTab] = useState<'operations' | 'archetypes' | 'templates'>('operations');

    const renderTabContent = () => {
        switch (activeTab) {
            case 'operations':
                return selectedMissionId
                    ? <div>Ops Details for {selectedMissionId}</div>
                    : <div className="p-8 text-center text-muted-foreground">Select a mission from the left panel.</div>;
            case 'archetypes':
                return <div>Archetypes UI</div>;
            case 'templates':
                return <div>Templates UI</div>;
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col h-full w-full">
            {/* Tab Navigation - Min 44px for mobile targets */}
            <div className="flex border-b min-h-[44px]">
                {['operations', 'archetypes', 'templates'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`px-4 py-2 capitalize min-w-[80px] min-h-[44px] ${activeTab === tab
                                ? 'border-b-2 border-primary font-bold'
                                : 'text-muted-foreground hover:bg-accent/50'
                            } focus:outline-none focus:ring-2`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto p-4 content-visibility-auto">
                {renderTabContent()}
            </div>
        </div>
    );
}
