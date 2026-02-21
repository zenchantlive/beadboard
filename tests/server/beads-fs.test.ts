// @ts-ignore
import { expect, test, describe } from 'bun:test';
import { getArchetypes } from '../../src/lib/server/beads-fs';

describe('beads-fs', () => {
    test('getArchetypes returns array of archetypes', async () => {
        const archetypes = await getArchetypes();
        expect(Array.isArray(archetypes)).toBe(true);
    });
});
