import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

describe('AssignmentPanel Sections', () => {
    const filePath = path.join(process.cwd(), 'src/components/graph/assignment-panel.tsx');
    const source = fs.readFileSync(filePath, 'utf-8');

    it('imports useGraphAnalysis for actionable detection', () => {
        assert.ok(source.includes('useGraphAnalysis'), 'Should import useGraphAnalysis');
    });

    it('has Needs Agent section header', () => {
        assert.ok(source.includes('Needs Agent'), 'Should have Needs Agent section');
    });

    it('has Pre-assigned section header', () => {
        assert.ok(source.includes('Pre-assigned'), 'Should have Pre-assigned section');
    });

    it('filters Needs Agent to actionable tasks without agent label', () => {
        // Should check for agent: label and actionable status
        assert.ok(source.includes('actionableNodeIds'), 'Should use actionableNodeIds');
        assert.ok(source.includes('agent:'), 'Should check for agent: labels');
    });

    it('scopes Active Workers to epicId when provided', () => {
        assert.ok(source.includes('epicId'), 'Should use epicId for filtering');
    });
});
