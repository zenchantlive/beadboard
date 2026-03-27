'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Rocket } from 'lucide-react';

interface LaunchSwarmDialogProps {
  projectRoot: string;
  onSuccess?: (swarmId: string | null) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialTitle?: string;
}

interface Formula {
  name: string;
  description?: string;
}

function getNestedString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function extractLaunchedSwarmId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;

  const direct = getNestedString(record, 'swarmId')
    ?? getNestedString(record, 'swarm_id')
    ?? getNestedString(record, 'epicId')
    ?? getNestedString(record, 'epic_id')
    ?? getNestedString(record, 'id');
  if (direct) {
    return direct;
  }

  const data = record.data;
  if (data && typeof data === 'object') {
    return extractLaunchedSwarmId(data);
  }

  return null;
}

export function LaunchSwarmDialog({
  projectRoot,
  onSuccess,
  open,
  onOpenChange,
  initialTitle = '',
}: LaunchSwarmDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [selectedFormula, setSelectedFormula] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;

  const fetchFormulas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/swarm/formulas?projectRoot=${encodeURIComponent(projectRoot)}`);
      const json = await res.json();
      if (json.ok) {
        setFormulas(json.data ?? []);
      } else {
        setError(json.error);
      }
    } catch {
      setError('Failed to fetch formulas');
    } finally {
      setLoading(false);
    }
  }, [projectRoot]);

  useEffect(() => {
    if (!isOpen) {
      setLoading(false);
      setSelectedFormula('');
      setError(null);
      setTitle('');
      return;
    }

    if (initialTitle) {
      setTitle(initialTitle);
    }
  }, [initialTitle, isOpen]);

  useEffect(() => {
    if (isOpen && formulas.length === 0 && !loading) {
      void fetchFormulas();
    }
  }, [fetchFormulas, formulas.length, isOpen, loading]);

  const handleOpenChange = (isOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(isOpen);
    } else {
      setInternalOpen(isOpen);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !selectedFormula) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/swarm/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectRoot,
          title,
          proto: selectedFormula,
        }),
      });

      const json = await res.json();
      if (json.ok) {
        const launchedSwarmId = extractLaunchedSwarmId(json.data);
        handleOpenChange(false);
        setTitle('');
        setSelectedFormula('');
        onSuccess?.(launchedSwarmId);
      } else {
        setError(json.error);
      }
    } catch {
      setError('Failed to launch swarm');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {isControlled ? null : (
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300"
          >
            <Rocket className="h-4 w-4" />
            Launch Swarm
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="bg-[#08111d] border-slate-800 text-slate-200 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Launch New Swarm</DialogTitle>
          <DialogDescription className="text-slate-400">
            Instantiate a new molecule from a template proto.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="proto" className="text-slate-300">Formula Template</Label>
            <Select value={selectedFormula} onValueChange={setSelectedFormula} disabled={loading}>
              <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-200">
                <SelectValue placeholder="Select a proto..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                {formulas.length === 0 && !loading && (
                  <div className="p-2 text-xs text-slate-500 text-center">No formulas found</div>
                )}
                {formulas.map((f) => (
                  <SelectItem key={f.name} value={f.name} className="focus:bg-slate-700 focus:text-slate-100">
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="title" className="text-slate-300">Swarm Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-slate-900 border-slate-700 text-slate-200"
              placeholder="e.g. Release v1.2"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="text-xs text-rose-400 bg-rose-950/20 p-2 rounded border border-rose-900/30">
              {error}
            </div>
          )}
        </form>
        <DialogFooter>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || !title || !selectedFormula}
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
            Launch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
