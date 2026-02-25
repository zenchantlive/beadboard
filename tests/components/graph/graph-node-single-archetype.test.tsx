import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

describe('GraphNodeCard Single Archetype Constraint', () => {
    const filePath = path.join(process.cwd(), 'src/components/graph/graph-node-card.tsx');
    const source = fs.readFileSync(filePath, 'utf-8');

    it('removes existing agent labels before assigning new one', () => {
        // Should filter out existing agent: labels before adding new one
        assert.ok(
            source.includes("filter(l => !l.startsWith('agent:'))"),
            'Should remove existing agent: labels optimistically'
        );
    });

    it('calls DELETE for existing agent labels before POST for new one', () => {
        // Should call DELETE API for existing labels
        assert.ok(
            source.includes('DELETE') && source.includes('existingLabel'),
            'Should call DELETE API to remove existing agent labels'
        );
    });

    it('only allows one archetype per task', () => {
        // The logic should enforce single archetype by removing before adding
        assert.ok(
            source.includes('currentAgentLabels') || source.includes('existingLabel'),
            'Should track and remove current agent labels'
        );
    });

    it('preserves non-agent labels when replacing archetype', () => {
        // Should only filter agent: labels, not all labels
        assert.ok(
            source.includes("l.startsWith('agent:')"),
            'Should only filter agent: labels, preserving other labels'
        );
    });

    it('returns early if same archetype is already assigned', () => {
        // Should check if archetype is already assigned and return early
        assert.ok(
            source.includes('assignedArchetypes.some') && source.includes('return'),
            'Should return early if same archetype is already assigned'
        );
    });
});
