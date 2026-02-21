import { useState, useEffect } from 'react';
import type { SwarmTemplate } from '../lib/types-swarm';

export function useTemplates() {
    const [data, setData] = useState<SwarmTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        async function fetchTemplates() {
            try {
                const res = await fetch('/api/swarm/templates');
                if (!res.ok) {
                    throw new Error('Failed to fetch templates');
                }
                const json = await res.json();
                setData(json);
            } catch (err: any) {
                setError(err);
            } finally {
                setIsLoading(false);
            }
        }

        fetchTemplates();
    }, []);

    return { templates: data, isLoading, error };
}
