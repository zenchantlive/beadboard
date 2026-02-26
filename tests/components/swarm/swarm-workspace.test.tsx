// @ts-ignore
import { expect, test, describe } from 'bun:test';

describe('SwarmWorkspace Component', () => {
    test('exports SwarmWorkspace component that is a function', async () => {
        // @ts-ignore
        const mod = await import('../../../src/components/swarm/swarm-workspace');
        expect(mod.SwarmWorkspace).toBeDefined();
        expect(typeof mod.SwarmWorkspace).toBe('function');
    });
});
