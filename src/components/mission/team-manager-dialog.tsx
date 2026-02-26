'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { AgentAvatar } from '../shared/agent-avatar';
import { useAgentPool } from '../../hooks/use-agent-pool';
import { Loader2, Plus, Minus, ShieldCheck, Search, Users, ChevronLeft, Save } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { AgentRecord } from '../../lib/agent-registry';

interface TeamManagerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  missionId: string;
  missionTitle: string;
  projectRoot: string;
  assignedAgents: AgentRecord[];
  onAssign: (agentId: string, action: 'join' | 'leave') => Promise<void>;
}

export function TeamManagerDialog({ 
  isOpen, 
  onClose, 
  missionId, 
  missionTitle, 
  projectRoot,
  assignedAgents,
  onAssign 
}: TeamManagerDialogProps) {
  const { agents, isLoading, refresh } = useAgentPool(projectRoot);
  const [search, setSearch] = useState('');
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  
  // Creation Mode State
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newInstructions, setNewInstructions] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const assignedIds = new Set(assignedAgents.map(a => a.agent_id));
  
  const availableAgents = agents.filter(a => 
    !assignedIds.has(a.agent_id) && 
    (a.display_name.toLowerCase().includes(search.toLowerCase()) || 
     a.role.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAction = async (agentId: string, action: 'join' | 'leave') => {
    setPendingAction(agentId);
    try {
      await onAssign(agentId, action);
    } finally {
      setPendingAction(null);
    }
  };

  const handleCreateAgent = async () => {
    if (!newName || !newRole) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/agent/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectRoot, name: newName, role: newRole, instructions: newInstructions })
      });
      if (res.ok) {
        await refresh();
        setIsCreating(false);
        setNewName('');
        setNewRole('');
        setNewInstructions('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-[#08111d] border-slate-800 text-slate-200">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            Manage Mission Squad
            <Badge variant="outline" className="ml-2 border-slate-700 text-slate-400 font-mono font-normal">
              {missionId}
            </Badge>
          </DialogTitle>
          <p className="text-sm text-slate-400">{missionTitle}</p>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 h-[450px] mt-4">
          {/* Left: Available Pool / Creation Form */}
          <div className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-[#0d1621] p-3 transition-all relative overflow-hidden">
            {isCreating ? (
              // CREATION FORM
              <div className="flex flex-col h-full animate-in slide-in-from-left-4 fade-in duration-200">
                <div className="flex items-center justify-between mb-4">
                  <Button variant="ghost" size="sm" onClick={() => setIsCreating(false)} className="-ml-2 text-slate-400 hover:text-white">
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-500">Draft New Agent</h4>
                </div>
                
                <div className="space-y-4 flex-1">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-slate-500 font-semibold">Codename</label>
                    <Input 
                      placeholder="e.g. Data Miner" 
                      className="bg-slate-900 border-slate-700" 
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-slate-500 font-semibold">Role</label>
                    <Input 
                      placeholder="e.g. data-engineer" 
                      className="bg-slate-900 border-slate-700 font-mono text-xs" 
                      value={newRole}
                      onChange={e => setNewRole(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1 flex-1 flex flex-col">
                    <label className="text-[10px] uppercase text-slate-500 font-semibold">Directives / Instructions</label>
                    <Textarea 
                      placeholder="Primary directive: Extract data from..." 
                      className="bg-slate-900 border-slate-700 flex-1 resize-none text-xs leading-relaxed" 
                      value={newInstructions}
                      onChange={e => setNewInstructions(e.target.value)}
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleCreateAgent} 
                  disabled={!newName || !newRole || isSaving}
                  className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white w-full"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Recruit Agent</>}
                </Button>
              </div>
            ) : (
              // LIST VIEW
              <>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Available Resources</h4>
                  <Badge variant="secondary" className="bg-slate-800 text-slate-400">{availableAgents.length}</Badge>
                </div>
                <div className="flex gap-2 mb-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-3 w-3 text-slate-500" />
                    <Input 
                      placeholder="Search agents..." 
                      className="h-8 pl-7 bg-slate-900 border-slate-700 text-xs"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <Button 
                    size="icon" 
                    variant="outline" 
                    className="h-8 w-8 border-slate-700 border-dashed text-slate-400 hover:text-emerald-400 hover:border-emerald-500/50"
                    onClick={() => setIsCreating(true)}
                    title="Draft New Agent"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <ScrollArea className="flex-1 pr-3">
                  {isLoading ? (
                    <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
                  ) : (
                    <div className="space-y-2">
                      {availableAgents.map(agent => (
                        <div key={agent.agent_id} className="flex items-center justify-between p-2 rounded hover:bg-white/5 transition-colors group">
                          <div className="flex items-center gap-2">
                            <AgentAvatar name={agent.display_name} status={agent.status as any} size="sm" />
                            <div>
                              <p className="text-xs font-medium text-slate-200">{agent.display_name}</p>
                              <p className="text-[10px] text-slate-500 uppercase">{agent.role}</p>
                            </div>
                          </div>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-emerald-500/20 hover:text-emerald-400"
                            onClick={() => handleAction(agent.agent_id, 'join')}
                            disabled={!!pendingAction}
                          >
                            {pendingAction === agent.agent_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </>
            )}
          </div>

          {/* Right: Assigned Squad */}
          <div className="flex flex-col gap-2 rounded-lg border border-emerald-900/30 bg-emerald-950/10 p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-500">Deployed Squad</h4>
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">{assignedAgents.length}</Badge>
            </div>
            <ScrollArea className="flex-1 pr-3">
              <div className="space-y-2">
                {assignedAgents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs italic border border-dashed border-emerald-900/30 rounded bg-emerald-950/20">
                    <Users className="h-8 w-8 mb-2 opacity-20" />
                    No agents assigned
                  </div>
                ) : (
                  assignedAgents.map(agent => (
                    <div key={agent.agent_id} className="flex items-center justify-between p-2 rounded bg-emerald-500/5 border border-emerald-500/10">
                      <div className="flex items-center gap-2">
                        <AgentAvatar name={agent.display_name} status={agent.status as any} size="sm" />
                        <div>
                          <p className="text-xs font-medium text-emerald-100">{agent.display_name}</p>
                          <p className="text-[10px] text-emerald-500/70 uppercase">{agent.role}</p>
                        </div>
                      </div>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-6 w-6 hover:bg-rose-500/20 hover:text-rose-400"
                        onClick={() => handleAction(agent.agent_id, 'leave')}
                        disabled={!!pendingAction}
                      >
                        {pendingAction === agent.agent_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Minus className="h-3 w-3" />}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-slate-700 text-slate-300">Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}