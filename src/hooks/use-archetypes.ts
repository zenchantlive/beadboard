import { useState, useEffect } from 'react';
import type { AgentArchetype } from '../lib/types-swarm';

export function useArchetypes() {
    const [data, setData] = useState<AgentArchetype[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        async function fetchArchetypes() {
            try {
                const res = await fetch('/api/swarm/archetypes');
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
        }

        fetchArchetypes();
    }, []);

    return { archetypes: data, isLoading, error };
}
