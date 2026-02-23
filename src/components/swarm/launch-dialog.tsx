'use client';

import { useState } from 'react';
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
  onSuccess?: () => void;
}

interface Formula {
  name: string;
  description?: string;
}

export function LaunchSwarmDialog({ projectRoot, onSuccess }: LaunchSwarmDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [selectedFormula, setSelectedFormula] = useState<string>('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchFormulas = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/swarm/formulas?projectRoot=${encodeURIComponent(projectRoot)}`);
      const json = await res.json();
      if (json.ok) {
        setFormulas(json.data);
      } else {
        setError(json.error);
      }
    } catch {
      setError('Failed to fetch formulas');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && formulas.length === 0) {
      fetchFormulas();
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
        setOpen(false);
        setTitle('');
        setSelectedFormula('');
        onSuccess?.();
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
