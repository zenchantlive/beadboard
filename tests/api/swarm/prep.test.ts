// @ts-ignore
import { expect, test, describe, mock, beforeEach } from 'bun:test';
import { NextRequest } from 'next/server';
import { POST, DELETE } from '../../../src/app/api/swarm/prep/route';

// Mock the bridge module
mock.module('../../../src/lib/bridge', () => ({
    runBdCommand: mock(() => Promise.resolve({ success: true, stdout: '', stderr: '' }))
}));

mock.module('../../../src/lib/realtime', () => ({
    issuesEventBus: {
        emit: mock(() => {})
    }
}));

import { runBdCommand } from '../../../src/lib/bridge';
import { issuesEventBus } from '../../../src/lib/realtime';

describe('POST /api/swarm/prep', () => {
    beforeEach(() => {
        runBdCommand.mockClear();
        issuesEventBus.emit.mockClear();
    });

    test('returns 400 if projectRoot is missing', async () => {
        const body = { beadId: 'bb-test', archetypeId: 'architect' };
        const request = new NextRequest('http://localhost/api/swarm/prep', {
            method: 'POST',
            body: JSON.stringify(body)
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
        
        const json = await response.json();
        expect(json.error).toContain('projectRoot');
    });

    test('returns 400 if beadId is missing', async () => {
        const body = { projectRoot: '/test', archetypeId: 'architect' };
        const request = new NextRequest('http://localhost/api/swarm/prep', {
            method: 'POST',
            body: JSON.stringify(body)
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
    });

    test('adds label and claims task by default', async () => {
        runBdCommand
            .mockResolvedValueOnce({ success: true, stdout: 'label added', stderr: '' })
            .mockResolvedValueOnce({ success: true, stdout: '{"ok":true}', stderr: '' });

        const body = { projectRoot: '/test', beadId: 'bb-test', archetypeId: 'architect', claim: true };
        const request = new NextRequest('http://localhost/api/swarm/prep', {
            method: 'POST',
            body: JSON.stringify(body)
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
        
        const json = await response.json();
        expect(json.ok).toBe(true);
        expect(json.message).toContain('Claimed');
        
        // Should call label add
        expect(runBdCommand).toHaveBeenNthCalledWith(1, {
            projectRoot: '/test',
            args: ['label', 'add', 'bb-test', 'agent:architect']
        });
        
        // Should call update to claim
        expect(runBdCommand).toHaveBeenNthCalledWith(2, {
            projectRoot: '/test',
            args: ['update', 'bb-test', '-s', 'in_progress', '-a', 'architect', '--json']
        });
        
        // Should emit SSE event
        expect(issuesEventBus.emit).toHaveBeenCalledWith('issues');
    });

    test('only adds label when claim is false', async () => {
        runBdCommand.mockResolvedValueOnce({ success: true, stdout: 'label added', stderr: '' });

        const body = { projectRoot: '/test', beadId: 'bb-test', archetypeId: 'architect', claim: false };
        const request = new NextRequest('http://localhost/api/swarm/prep', {
            method: 'POST',
            body: JSON.stringify(body)
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
        
        // Should only call label add, not update
        expect(runBdCommand).toHaveBeenCalledTimes(1);
    });

    test('handles bd command failures', async () => {
        runBdCommand
            .mockResolvedValueOnce({ success: true, stdout: 'label added', stderr: '' })
            .mockResolvedValueOnce({ success: false, error: 'Not found', stderr: 'bead not found' });

        const body = { projectRoot: '/test', beadId: 'bb-test', archetypeId: 'architect', claim: true };
        const request = new NextRequest('http://localhost/api/swarm/prep', {
            method: 'POST',
            body: JSON.stringify(body)
        });

        const response = await POST(request);
        expect(response.status).toBe(500);
    });
});

describe('DELETE /api/swarm/prep', () => {
    beforeEach(() => {
        runBdCommand.mockClear();
        issuesEventBus.emit.mockClear();
    });

    test('removes label and resets status to open', async () => {
        runBdCommand
            .mockResolvedValueOnce({ success: true, stdout: 'label removed', stderr: '' })
            .mockResolvedValueOnce({ success: true, stdout: '{"ok":true}', stderr: '' });

        const body = { projectRoot: '/test', beadId: 'bb-test', archetypeId: 'architect' };
        // Note: Route exports DELETE as POST (handles both methods)
        const request = new NextRequest('http://localhost/api/swarm/prep', {
            method: 'POST',  // Route handles DELETE via POST
            body: JSON.stringify(body)
        });

        const response = await DELETE(request);
        expect(response.status).toBe(200);
        
        // Should remove label
        expect(runBdCommand).toHaveBeenNthCalledWith(1, {
            projectRoot: '/test',
            args: ['label', 'remove', 'bb-test', 'agent:architect']
        });
        
        // Should reset status
        expect(runBdCommand).toHaveBeenNthCalledWith(2, {
            projectRoot: '/test',
            args: ['update', 'bb-test', '-s', 'open', '--json']
        });
    });
});
