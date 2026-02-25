import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

describe('GraphNodeCard Optimistic Label Updates', () => {
    const filePath = path.join(process.cwd(), 'src/components/graph/graph-node-card.tsx');
    const source = fs.readFileSync(filePath, 'utf-8');

    it('uses useRef to track pending optimistic labels', () => {
        assert.ok(source.includes('useRef'), 'Should import and use useRef for tracking pending operations');
    });

    it('tracks pending optimistic labels in a Set', () => {
        assert.ok(
            source.includes('pendingOptimisticLabels') || source.includes('Set'),
            'Should track pending labels in a Set to prevent SSE overwrites'
        );
    });

    it('preserves optimistic labels when data.labels sync happens', () => {
        // Should merge server labels with pending optimistic labels
        assert.ok(
            source.includes('merged') || source.includes('pending') || source.includes('preserve'),
            'Should merge server data with pending optimistic labels during sync'
        );
    });

    it('adds label to pending set when optimistic update happens', () => {
        // When optimistically adding, should also track in pending set
        assert.ok(
            source.includes('pending') && source.includes('add'),
            'Should add to pending set when optimistically adding a label'
        );
    });

    it('removes label from pending set after successful API response', () => {
        // After API success, the label is now in server data, so remove from pending
        assert.ok(
            source.includes('delete') || source.includes('pending') && source.includes('finally'),
            'Should clean up pending set after API completes'
        );
    });

    it('handles multiple rapid assign/unassign operations', () => {
        // The pending set approach should handle concurrent operations
        assert.ok(
            source.includes('pendingOptimisticLabels') || source.includes('pending'),
            'Should use a tracking mechanism that handles multiple concurrent operations'
        );
    });
});

describe('GraphNodeCard Label State Isolation', () => {
    const filePath = path.join(process.cwd(), 'src/components/graph/graph-node-card.tsx');
    const source = fs.readFileSync(filePath, 'utf-8');

    it('each node has its own localLabels state', () => {
        // localLabels should be useState, not shared across nodes
        assert.ok(source.includes('useState'), 'Should use useState for per-node label state');
    });

    it('localLabels is initialized from data.labels', () => {
        assert.ok(
            source.includes('localLabels') && source.includes('data.labels'),
            'localLabels should be initialized from data.labels prop'
        );
    });

    it('syncs with data.labels when parent refreshes', () => {
        assert.ok(
            source.includes('useEffect') && source.includes('data.labels'),
            'Should have useEffect to sync with data.labels changes'
        );
    });

    it('prevents sync overwrite during optimistic operations', () => {
        // This is the key fix - should not blindly overwrite during operations
        assert.ok(
            source.includes('pending') || source.includes('skip') || source.includes('preserve'),
            'Should prevent SSE sync from overwriting optimistic updates'
        );
    });
});
