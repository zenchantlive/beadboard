'use client';

import { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Loader2, Map, MessageSquare, Users, X, Activity } from 'lucide-react';
import { WorkflowGraph } from '../shared/workflow-graph';
import { AgentAvatar } from '../shared/agent-avatar';
import { useMissionGraph } from '../../hooks/use-mission-graph';
import type { SwarmStatusFromApi } from '../../lib/swarm-api';
import type { AgentRecord } from '../../lib/agent-registry';
import { buildSwarmBulkCancelConfirmation } from '../../lib/swarm-bulk-cancel-shared';

interface MissionInspectorProps {
  missionId: string;
  missionTitle: string; // Passed in or fetched? Better to pass in for instant header
  projectRoot: string;
  assignedAgents: AgentRecord[];
  onClose: () => void;
  onAssign: (agentId: string, action: 'join' | 'leave') => void;
}

export function MissionInspector({ 
  missionId, 
  missionTitle,
  projectRoot, 
  assignedAgents,
  onClose,
  onAssign 
}: MissionInspectorProps) {
  const { nodes, isLoading: isGraphLoading } = useMissionGraph(projectRoot, missionId);
  const [activeTab, setActiveTab] = useState('map');
  const [swarmStatus, setSwarmStatus] = useState<SwarmStatusFromApi | null>(null);
  const [isStatusLoading, setIsStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [confirmationText, setConfirmationText] = useState('');
  const [isBulkStopping, setIsBulkStopping] = useState(false);
  const [bulkStopError, setBulkStopError] = useState<string | null>(null);
  const [bulkStopMessage, setBulkStopMessage] = useState<string | null>(null);

  const fetchSwarmStatus = useMemo(() => {
    return async () => {
      setIsStatusLoading(true);
      setStatusError(null);
      try {
        const response = await fetch(
          `/api/swarm/status?projectRoot=${encodeURIComponent(projectRoot)}&epic=${encodeURIComponent(missionId)}`
        );
        const payload = await response.json();
        if (payload.ok && payload.data) {
          setSwarmStatus(payload.data);
          setConfirmationText('');
        } else {
          setStatusError(payload.error?.message || 'Failed to load swarm status');
        }
      } catch {
        setStatusError('Failed to fetch swarm status');
      } finally {
        setIsStatusLoading(false);
      }
    };
  }, [missionId, projectRoot]);

  useEffect(() => {
    void fetchSwarmStatus();
  }, [fetchSwarmStatus]);

  const activeWorkerCount = swarmStatus?.active.length ?? 0;
  const confirmationPhrase = buildSwarmBulkCancelConfirmation(missionId, activeWorkerCount);
  const canConfirmBulkStop = confirmationText.trim() === confirmationPhrase;

  const handleBulkStop = async () => {
    if (!projectRoot || !swarmStatus || activeWorkerCount === 0 || !canConfirmBulkStop || isBulkStopping) return;

    setIsBulkStopping(true);
    setBulkStopError(null);
    setBulkStopMessage(null);
    try {
      const response = await fetch('/api/swarm/stop-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectRoot,
          swarmId: missionId,
          confirmation: confirmationText.trim(),
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error?.message || 'Failed to stop active workers');
      }

      const stoppedCount = Array.isArray(payload.data?.stoppedWorkerIds) ? payload.data.stoppedWorkerIds.length : 0;
      setBulkStopMessage(
        stoppedCount > 0
          ? `Stopped ${stoppedCount} active worker${stoppedCount === 1 ? '' : 's'}.`
          : 'No active workers were found to stop.',
      );
      await fetchSwarmStatus();
    } catch (error) {
      setBulkStopError(error instanceof Error ? error.message : 'Failed to stop active workers');
    } finally {
      setIsBulkStopping(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#08111d] border-l border-slate-800 text-slate-200">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-slate-800 bg-[#0d1621]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 font-mono text-[10px]">
              {missionId}
            </Badge>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Active Operation</span>
          </div>
          <h2 className="text-sm font-semibold text-white line-clamp-2">{missionTitle}</h2>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-500 hover:text-white" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="px-4 pt-2 bg-[#0d1621] border-b border-slate-800">
          <TabsList className="bg-transparent p-0 h-auto gap-4">
            <TabsTrigger 
              value="map" 
              className="rounded-none border-b-2 border-transparent px-2 py-2 text-[10px] uppercase tracking-wider data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:text-emerald-400"
            >
              <Map className="h-3 w-3 mr-1.5" />
              Map
            </TabsTrigger>
            <TabsTrigger 
              value="comms" 
              className="rounded-none border-b-2 border-transparent px-2 py-2 text-[10px] uppercase tracking-wider data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:text-emerald-400"
            >
              <MessageSquare className="h-3 w-3 mr-1.5" />
              Comms
            </TabsTrigger>
            <TabsTrigger 
              value="squad" 
              className="rounded-none border-b-2 border-transparent px-2 py-2 text-[10px] uppercase tracking-wider data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:text-emerald-400"
            >
              <Users className="h-3 w-3 mr-1.5" />
              Squad <span className="ml-1 text-slate-500">{assignedAgents.length}</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden relative">
          
          <TabsContent value="map" className="h-full m-0 p-0 data-[state=active]:flex flex-col">
            {isGraphLoading ? (
              <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-600" /></div>
            ) : (
              <div className="flex-1 relative bg-slate-950">
                 <WorkflowGraph beads={nodes} selectedId={undefined} hideClosed={false} className="h-full w-full border-0 rounded-none" />
                 <div className="absolute bottom-4 right-4 pointer-events-none">
                    <Badge variant="outline" className="bg-black/50 border-white/10 backdrop-blur text-xs">
                       {nodes.length} Nodes
                    </Badge>
                 </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="comms" className="h-full m-0 p-4 overflow-y-auto">
            <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2 opacity-60">
              <Activity className="h-8 w-8" />
              <p className="text-xs">Secure Uplink Offline</p>
              <p className="text-[10px] italic">Inter-agent communication feed coming in Phase 3.2</p>
            </div>
          </TabsContent>

          <TabsContent value="squad" className="h-full m-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                {assignedAgents.length === 0 ? (
                   <div className="text-center py-8 text-slate-500 text-xs">
                     No agents deployed.
                   </div>
                ) : (
                  assignedAgents.map(agent => (
                    <div key={agent.agent_id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40 border border-slate-800">
                      <div className="flex items-center gap-3">
                        <AgentAvatar name={agent.display_name} status={agent.status as any} />
                        <div>
                          <p className="text-sm font-medium text-slate-200">{agent.display_name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <span className="uppercase font-bold tracking-wider">{agent.role}</span>
                            <span>•</span>
                            <span className="font-mono">{agent.status}</span>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30" onClick={() => onAssign(agent.agent_id, 'leave')}>
                        Dismiss
                      </Button>
                    </div>
                  ))
                )}

                <div className="rounded-lg border border-rose-900/40 bg-rose-950/20 p-3 space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-rose-300">Destructive Action</p>
                      <p className="text-xs leading-relaxed text-slate-300">
                        This stops only the active workers in this swarm. Completed, failed, and blocked workers are left untouched.
                      </p>
                    </div>
                  </div>

                  {isStatusLoading ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading active worker state...
                    </div>
                  ) : statusError ? (
                    <div className="rounded-md border border-rose-900/40 bg-rose-950/30 px-3 py-2 text-xs text-rose-300">
                      {statusError}
                    </div>
                  ) : activeWorkerCount === 0 ? (
                    <div className="rounded-md border border-slate-800 bg-slate-950/40 px-3 py-2 text-xs text-slate-500">
                      No active workers are currently running in this swarm.
                    </div>
                  ) : (
                    <>
                      <div className="rounded-md border border-slate-800 bg-slate-950/40 px-3 py-2 text-xs text-slate-400">
                        Type <span className="font-mono text-rose-300">{confirmationPhrase}</span> to enable stop-all.
                      </div>
                      <div className="space-y-2">
                        <Input
                          value={confirmationText}
                          onChange={(event) => setConfirmationText(event.target.value)}
                          placeholder={confirmationPhrase}
                          className="border-slate-800 bg-slate-950/60 text-slate-100 placeholder:text-slate-600"
                          aria-label="Bulk cancel confirmation"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          className="w-full"
                          disabled={!canConfirmBulkStop || isBulkStopping}
                          onClick={() => void handleBulkStop()}
                        >
                          {isBulkStopping ? 'Stopping active workers...' : `Stop ${activeWorkerCount} active worker${activeWorkerCount === 1 ? '' : 's'}`}
                        </Button>
                      </div>
                    </>
                  )}

                  {bulkStopError ? (
                    <div className="rounded-md border border-rose-900/40 bg-rose-950/30 px-3 py-2 text-xs text-rose-300">
                      {bulkStopError}
                    </div>
                  ) : bulkStopMessage ? (
                    <div className="rounded-md border border-emerald-900/40 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-300">
                      {bulkStopMessage}
                    </div>
                  ) : null}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

        </div>
      </Tabs>
    </div>
  );
}
