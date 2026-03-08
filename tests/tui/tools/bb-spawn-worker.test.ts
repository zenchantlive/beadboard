import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSpawnWorkerTool } from '../../src/tui/tools/bb-spawn-worker';

vi.mock('../../src/lib/worker-session-manager', () => ({
  workerSessionManager: {
    spawnWorker: vi.fn(),
    getWorker: vi.fn(),
    listWorkers: vi.fn(),
    terminateWorker: vi.fn(),
    waitForWorker: vi.fn(),
  },
}));

describe('bb_spawn_worker Tool', () => {
  const mockProjectRoot = '/tmp/test-project';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Parameter Validation', () => {
    it('should reject when task_id is missing', async () => {
      const tool = createSpawnWorkerTool(mockProjectRoot);
      const result = await tool.execute('call-1', { task_context: 'Some context' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('task_id is required');
    });

    it('should reject when task_id is not a string', async () => {
      const tool = createSpawnWorkerTool(mockProjectRoot);
      const result = await tool.execute('call-1', { task_id: 123, task_context: 'Context' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('must be a string');
    });

    it('should reject when task_context is missing', async () => {
      const tool = createSpawnWorkerTool(mockProjectRoot);
      const result = await tool.execute('call-1', { task_id: 'task-1' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('task_context is required');
    });

    it('should reject when task_context is not a string', async () => {
      const tool = createSpawnWorkerTool(mockProjectRoot);
      const result = await tool.execute('call-1', { task_id: 'task-1', task_context: 123 });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('must be a string');
    });

    it('should reject invalid archetype', async () => {
      const tool = createSpawnWorkerTool(mockProjectRoot);
      const result = await tool.execute('call-1', {
        task_id: 'task-1',
        task_context: 'Context',
        archetype: 'invalid_archetype',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid archetype');
      expect(result.content[0].text).toContain('coder');
      expect(result.content[0].text).toContain('reviewer');
    });

    it('should accept valid archetypes', () => {
      const tool = createSpawnWorkerTool(mockProjectRoot);
      const validArchetypes = ['coder', 'reviewer', 'tester', 'researcher'];

      for (const archetype of validArchetypes) {
        // Should not throw on parameter schema validation
        expect(() => {
          tool.execute('call-1', {
            task_id: 'task-1',
            task_context: 'Context',
            archetype,
          });
        }).not.toThrow();
      }
    });
  });

  describe('Successful Worker Spawn', () => {
    it('should call spawnWorker with correct params', async () => {
      const tool = createSpawnWorkerTool(mockProjectRoot);
      await tool.execute('call-1', {
        task_id: 'task-123',
        task_context: 'Do this thing',
        archetype: 'coder',
      });

      expect(workerSessionManager.spawnWorker).toHaveBeenCalledWith({
        projectRoot: mockProjectRoot,
        taskId: 'task-123',
        taskContext: 'Do this thing',
        archetype: 'coder',
      });
    });

    it('should return success message with worker details', async () => {
      const mockWorker = {
        id: 'worker-123-1',
        taskId: 'task-123',
        status: 'spawning',
      };

      vi.mocked(workerSessionManager.spawnWorker).mockResolvedValue(mockWorker as any);

      const tool = createSpawnWorkerTool(mockProjectRoot);
      const result = await tool.execute('call-1', {
        task_id: 'task-123',
        task_context: 'Test context',
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Worker spawned successfully');
      expect(result.content[0].text).toContain(mockWorker.id);
      expect(result.content[0].text).toContain(mockWorker.taskId);
      expect(result.details.workerId).toBe(mockWorker.id);
      expect(result.details.taskId).toBe('task-123');
      expect(result.details.status).toBe('spawning');
    });

    it('should handle spawn errors gracefully', async () => {
      vi.mocked(workerSessionManager.spawnWorker).mockRejectedValue(new Error('Pi SDK not available'));

      const tool = createSpawnWorkerTool(mockProjectRoot);
      const result = await tool.execute('call-1', {
        task_id: 'task-123',
        task_context: 'Context',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to spawn worker');
    });
  });
});
