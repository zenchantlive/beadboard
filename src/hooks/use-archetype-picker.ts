import { useState, useCallback } from 'react';

export interface UseArchetypePickerReturn {
  selectedArchetype: string | null;
  setSelectedArchetype: (id: string | null) => void;
  isAssigning: boolean;
  assignError: string | null;
  assignSuccess: boolean;
  handleAssign: (issueId: string) => Promise<void>;
  resetAssignState: () => void;
}

export function useArchetypePicker(): UseArchetypePickerReturn {
  const [selectedArchetype, setSelectedArchetype] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSuccess, setAssignSuccess] = useState(false);

  const handleAssign = useCallback(async (issueId: string) => {
    if (!selectedArchetype) {
      setAssignError('No archetype selected');
      return;
    }

    setIsAssigning(true);
    setAssignError(null);
    setAssignSuccess(false);

    try {
      const res = await fetch('/api/swarm/prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beadId: issueId,
          archetypeId: selectedArchetype
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to assign agent');
      }

      setAssignSuccess(true);
      // Auto-reset success after 2 seconds
      setTimeout(() => setAssignSuccess(false), 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to assign agent';
      setAssignError(message);
      console.error('Failed to assign agent:', error);
    } finally {
      setIsAssigning(false);
    }
  }, [selectedArchetype]);

  const resetAssignState = useCallback(() => {
    setAssignError(null);
    setAssignSuccess(false);
  }, []);

  return {
    selectedArchetype,
    setSelectedArchetype,
    isAssigning,
    assignError,
    assignSuccess,
    handleAssign,
    resetAssignState
  };
}
