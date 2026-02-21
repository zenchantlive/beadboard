import { expect, test, describe, mock } from 'bun:test';

// Mock the hook that the component tries to import
mock.module('@/hooks/use-url-state', () => ({
    useUrlState: () => ({ setUrlState: () => { }, swarmId: '1' })
}));

describe('SwarmMissionPicker Component', () => {
    test('exports SwarmMissionPicker component that is a function', async () => {
        const mod = await import('../../../src/components/swarm/swarm-mission-picker');
        expect(mod.SwarmMissionPicker).toBeDefined();
        expect(typeof mod.SwarmMissionPicker).toBe('function');
    });
});
