import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createWorkerStatusTool } from '../../src/tui/tools/bb-worker-status';

vi.mock('../../src/lib/worker-session-manager', () => ({
  workerSessionManager: {
    spawnWorker: vi.fn(),
    getWorker: vi.fn(),
    listWorkers: vi.fn(),
    terminateWorker: vi.fn(),
    waitForWorker: vi.fn(),
  },
}));

describe('bb_worker_status Tool', () => {
  const mockProjectRoot = '/tmp/test-project';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Parameter Validation', () => {
    it('should reject when worker_id is missing', async () => {
      const tool = createWorkerStatusTool(mockProjectRoot);
      const result = await tool.execute('call-1', {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('worker_id is required');
    });

    it('should reject when worker_id is not a string', async () => {
      const tool = createWorkerStatusTool(mockProjectRoot);
      const result = await tool.execute('call-1', { worker_id: 123 });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('must be a string');
    });
  });

  describe('Worker Not Found', () => {
    it('should return error when worker does not exist', async () => {
      vi.mocked(workerSessionManager.getWorker).mockReturnValue(undefined);

      const tool = createWorkerStatusTool(mockProjectRoot);
      const result = await tool.execute('call-1', { worker_id: 'non-existent' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not found');
    });
  });

  describe('Status Reporting', () => {
    it('should report spawning status with emoji', async () => {
      const mockWorker = {
        id: 'worker-123-1',
        taskId: 'task-123',
        status: 'spawning' as const,
        createdAt: '2026-03-06T12:00:00.000Z',
      };

      vi.mocked(workerSessionManager.getWorker).mockReturnValue(mockWorker as any);

      const tool = createWorkerStatusTool(mockProjectRoot);
      const result = await tool.execute('call-1', { worker_id: 'worker-123-1' });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('🔄');
      expect(result.content[0].text).toContain('SPAWNING');
      expect(result.details.workerId).toBe('worker-123-1');
      expect(result.details.status).toBe('spawning');
    });

    it('should report working status with emoji', async () => {
      const mockWorker = {
        id: 'worker-123-1',
        taskId: 'task-123',
        status: 'working' as const,
        createdAt: '2026-03-06T12:00:00.000Z',
      };

      vi.mocked(workerSessionManager.getWorker).mockReturnValue(mockWorker as any);

      const tool = createWorkerStatusTool(mockProjectRoot);
      const result = await tool.execute('call-1', { worker_id: 'worker-123-1' });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('🔨');
      expect(result.content[0].text).toContain('WORKING');
      expect(result.details.status).toBe('working');
    });

    it('should report completed status with emoji', async () => {
      const mockWorker = {
        id: 'worker-123-1',
        taskId: 'task-123',
        status: 'completed' as const,
        createdAt: '2026-03-06T12:00:00.000Z',
        completedAt: '2026-03-06T12:05:00.000Z',
        result: 'Task completed successfully',
      };

      vi.mocked(workerSessionManager.getWorker).mockReturnValue(mockWorker as any);

      const tool = createWorkerStatusTool(mockProjectRoot);
      const result = await tool.execute('call-1', { worker_id: 'worker-123-1' });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('✅');
      expect(result.content[0].text).toContain('COMPLETED');
      expect(result.details.hasResult).toBe(true);
      expect(result.details.status).toBe('completed');
    });

    it('should report failed status with emoji', async () => {
      const mockWorker = {
        id: 'worker-123-1',
        taskId: 'task-123',
        status: 'failed' as const,
        createdAt: '2026-03-06T12:00:00.000Z',
        completedAt: '2026-03-06T12:05:00.000Z',
        error: 'Something went wrong',
      };

      vi.mocked(workerSessionManager.getWorker).mockReturnValue(mockWorker as any);

      const tool = createWorkerStatusTool(mockProjectRoot);
      const result = await tool.execute('call-1', { worker_id: 'worker-123-1' });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('❌');
      expect(result.content[0].text).toContain('FAILED');
      expect(result.details.hasError).toBe(true);
      expect(result.details.status).toBe('failed');
    });
  });

  describe('Result Display', () => {
    it('should show task details', async () => {
      const mockWorker = {
        id: 'worker-123-1',
        taskId: 'task-456',
        status: 'working' as const,
        createdAt: '2026-03-06T12:00:00.000Z',
      };

      vi.mocked(workerSessionManager.getWorker).mockReturnValue(mockWorker as any);

      const tool = createWorkerStatusTool(mockProjectRoot);
      const result = await tool.execute('call-1', { worker_id: 'worker-123-1' });

      expect(result.content[0].text).toContain('Task: task-456');
      expect(result.content[0].text).toContain('Created:');
      expect(result.details.taskId).toBe('task-456');
    });

    it('should show result when completed', async () => {
      const mockWorker = {
        id: 'worker-123-1',
        taskId: 'task-456',
        status: 'completed' as const,
        completedAt: '2026-03-06T12:05:00.000Z',
        result: 'Worker result text',
      };

      vi.mocked(workerSessionManager.getWorker).mockReturnValue(mockWorker as any);

      const tool = createWorkerStatusTool(mockProjectRoot);
      const result = await tool.execute('call-1', { worker_id: 'worker-123-1' });

      expect(result.content[0].text).toContain('Result:');
      expect(result.content[0].text).toContain('Worker result text');
    });

    it('should show error when failed', async () => {
      const mockWorker = {
        id: 'worker-123-1',
        taskId: 'task-456',
        status: 'failed' as const,
        error: 'Worker crashed',
      };

      vi.mocked(workerSessionManager.getWorker).mockReturnValue(mockWorker as any);

      const tool = createWorkerStatusTool(mockProjectRoot);
      const result = await tool.execute('call-1', { worker_id: 'worker-123-1' });

      expect(result.content[0].text).toContain('Error:');
      expect(result.content[0].text).toContain('Worker crashed');
    });
  });
});
