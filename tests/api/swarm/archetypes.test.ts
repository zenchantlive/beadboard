// @ts-ignore
import { expect, test, describe, mock } from 'bun:test';
import { GET } from '../../../src/app/api/swarm/archetypes/route';

// Mock the dependency
mock.module('../../../src/lib/server/beads-fs', () => ({
    getArchetypes: async () => [
        { id: 'test-arch', name: 'Test', isBuiltIn: true }
    ]
}));

describe('/api/swarm/archetypes GET', () => {
    test('returns 200 and a JSON array of archetypes', async () => {
        const response = await GET();
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(Array.isArray(data)).toBe(true);
        expect(data[0].id).toBe('test-arch');
    });
});
