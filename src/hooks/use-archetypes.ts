import { useState, useEffect, useCallback } from 'react';
import type { AgentArchetype } from '../lib/types-swarm';

export function useArchetypes(projectRoot: string) {
    const [data, setData] = useState<AgentArchetype[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchArchetypes = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await fetch('/api/swarm/archetypes', { cache: 'no-store' });
            if (!res.ok) {
                throw new Error('Failed to fetch archetypes');
            }
            const json = await res.json();
            setData(json);
        } catch (err: any) {
            setError(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const saveArchetype = async (archetype: Partial<AgentArchetype>) => {
        const isNew = !archetype.id;
        const method = isNew ? 'POST' : 'PUT';
        const url = isNew ? '/api/swarm/archetypes' : `/api/swarm/archetypes/${archetype.id}`;

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(archetype)
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => null);
            throw new Error(errorData?.error || 'Failed to save archetype');
        }

        // Small delay to ensure file system sync, then refresh
        await new Promise(r => setTimeout(r, 50));
        await fetchArchetypes();
    };

    const deleteArchetype = async (id: string) => {
        const res = await fetch(`/api/swarm/archetypes/${id}`, {
            method: 'DELETE'
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => null);
            throw new Error(errorData?.error || 'Failed to delete archetype');
        }

        await new Promise(r => setTimeout(r, 50));
        await fetchArchetypes();
    };

    // Initial fetch
    useEffect(() => {
        fetchArchetypes();
    }, [fetchArchetypes]);

    // Subscribe to SSE for real-time updates
    useEffect(() => {
        console.log('[useArchetypes] Connecting to SSE for:', projectRoot);
        const source = new EventSource(`/api/events?projectRoot=${encodeURIComponent(projectRoot)}`);
        
        const onIssues = () => {
            console.log('[useArchetypes] SSE event received, refreshing...');
            void fetchArchetypes();
        };

        source.addEventListener('issues', onIssues as EventListener);
        
        return () => {
            console.log('[useArchetypes] Closing SSE connection');
            source.removeEventListener('issues', onIssues as EventListener);
            source.close();
        };
    }, [projectRoot, fetchArchetypes]);

    return {
        archetypes: data,
        isLoading,
        error,
        refresh: fetchArchetypes,
        saveArchetype,
        deleteArchetype
    };
}
