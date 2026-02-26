import { useState, useEffect, useCallback } from 'react';
import type { SwarmTemplate } from '../lib/types-swarm';

export function useTemplates(projectRoot: string) {
    const [data, setData] = useState<SwarmTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchTemplates = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await fetch('/api/swarm/templates', { cache: 'no-store' });
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
    }, []);

    const saveTemplate = async (template: Partial<SwarmTemplate>) => {
        const isNew = !template.id;
        const method = isNew ? 'POST' : 'PUT';
        const url = isNew ? '/api/swarm/templates' : `/api/swarm/templates/${template.id}`;

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(template)
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => null);
            throw new Error(errorData?.error || 'Failed to save template');
        }

        await new Promise(r => setTimeout(r, 50));
        await fetchTemplates();
    };

    const deleteTemplate = async (id: string) => {
        const res = await fetch(`/api/swarm/templates/${id}`, {
            method: 'DELETE'
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => null);
            throw new Error(errorData?.error || 'Failed to delete template');
        }

        await new Promise(r => setTimeout(r, 50));
        await fetchTemplates();
    };

    // Initial fetch
    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    // Subscribe to SSE for real-time updates
    useEffect(() => {
        console.log('[useTemplates] Connecting to SSE for:', projectRoot);
        const source = new EventSource(`/api/events?projectRoot=${encodeURIComponent(projectRoot)}`);
        
        const onIssues = () => {
            console.log('[useTemplates] SSE event received, refreshing...');
            void fetchTemplates();
        };

        source.addEventListener('issues', onIssues as EventListener);
        
        return () => {
            console.log('[useTemplates] Closing SSE connection');
            source.removeEventListener('issues', onIssues as EventListener);
            source.close();
        };
    }, [projectRoot, fetchTemplates]);

    return {
        templates: data,
        isLoading,
        error,
        refresh: fetchTemplates,
        saveTemplate,
        deleteTemplate
    };
}
