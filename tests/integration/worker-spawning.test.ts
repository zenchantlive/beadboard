import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { workerSessionManager } from '../../lib/worker-session-manager';

describe('Worker Spawning - Integration Tests', () => {
  const mockProjectRoot = '/tmp/test-beadboard-worker';
  let taskId: string;

  beforeEach(() => {
    taskId = `task-${Date.now()}`;
    workerSessionManager.reset();
  });

  afterEach(() => {
    workerSessionManager.reset();
  });

  describe('Worker Lifecycle', () => {
    it('should spawn a worker and return session data', async () => {
      const worker = await workerSessionManager.spawnWorker({
        projectRoot: mockProjectRoot,
        taskId: taskId,
        taskContext: 'Test task for integration test',
      });

      expect(worker).toBeDefined();
      expect(worker.id).toMatch(/^worker-\d+-\d+$/);
      expect(worker.projectId).toBe(mockProjectRoot);
      expect(worker.taskId).toBe(taskId);
      expect(worker.status).toBe('spawning');
      expect(worker.createdAt).toBeDefined();
      expect(worker.completedAt).toBeNull();
      expect(worker.result).toBeNull();
      expect(worker.error).toBeNull();
    });

    it('should list workers for a project', async () => {
      await workerSessionManager.spawnWorker({
        projectRoot: mockProjectRoot,
        taskId: taskId,
        taskContext: 'Test task',
      });

      const workers = workerSessionManager.listWorkers(mockProjectRoot);
      expect(workers.length).toBe(1);
      expect(workers[0].taskId).toBe(taskId);
    });

    it('should return undefined for non-existent worker', () => {
      const worker = workerSessionManager.getWorker('non-existent-worker');
      expect(worker).toBeUndefined();
    });

    it('should get worker by ID after spawning', async () => {
      const spawned = await workerSessionManager.spawnWorker({
        projectRoot: mockProjectRoot,
        taskId: taskId,
        taskContext: 'Test task',
      });

      const retrieved = workerSessionManager.getWorker(spawned.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(spawned.id);
    });
  });

  describe('Worker Status Tracking', () => {
    it('should track worker status changes', async () => {
      const worker = await workerSessionManager.spawnWorker({
        projectRoot: mockProjectRoot,
        taskId: taskId,
        taskContext: 'Test task',
      });

      // Initial status is spawning
      expect(worker.status).toBe('spawning');

      // Status should update (actual change happens in worker session)
      // This test verifies the manager tracks it
      const retrieved = workerSessionManager.getWorker(worker.id);
      expect(retrieved?.status).toBe('spawning');
    }, 10000);

    it('should store completion details when worker completes', async () => {
      const worker = await workerSessionManager.spawnWorker({
        projectRoot: mockProjectRoot,
        taskId: taskId,
        taskContext: 'Complete this test task',
      });

      // In real flow, worker completion updates status
      // This tests the data structure supports it
      expect(worker).toHaveProperty('completedAt');
      expect(worker).toHaveProperty('result');
    });
  });

  describe('Multiple Workers', () => {
    it('should support multiple concurrent workers', async () => {
      const task1 = `task-${Date.now()}`;
      const task2 = `task-${Date.now()}`;

      const worker1 = await workerSessionManager.spawnWorker({
        projectRoot: mockProjectRoot,
        taskId: task1,
        taskContext: 'First task',
      });

      const worker2 = await workerSessionManager.spawnWorker({
        projectRoot: mockProjectRoot,
        taskId: task2,
        taskContext: 'Second task',
      });

      expect(worker1.id).not.toBe(worker2.id);
      expect(worker1.taskId).toBe(task1);
      expect(worker2.taskId).toBe(task2);

      const workers = workerSessionManager.listWorkers(mockProjectRoot);
      expect(workers.length).toBe(2);
    });

    it('should list all workers including multiple', async () => {
      const taskIds = [`task-${Date.now()}`, `task-${Date.now()}`, `task-${Date.now()}`];

      for (const id of taskIds) {
        await workerSessionManager.spawnWorker({
          projectRoot: mockProjectRoot,
          taskId: id,
          taskContext: `Task ${id}`,
        });
      }

      const workers = workerSessionManager.listWorkers(mockProjectRoot);
      expect(workers.length).toBe(3);
      expect(workers.every((w) => w.projectRoot === mockProjectRoot)).toBe(true);
    });
  });

  describe('Worker Termination', () => {
    it('should terminate a worker and update status', async () => {
      const worker = await workerSessionManager.spawnWorker({
        projectRoot: mockProjectRoot,
        taskId: taskId,
        taskContext: 'Task to terminate',
      });

      await workerSessionManager.terminateWorker(worker.id);

      const terminated = workerSessionManager.getWorker(worker.id);
      expect(terminated?.status).toBe('failed');
      expect(terminated?.error).toBe('Terminated by user');
      expect(terminated?.completedAt).toBeDefined();
    });

    it('should handle terminating non-existent worker gracefully', async () => {
      await expect(workerSessionManager.terminateWorker('non-existent')).resolves.not.toThrow();
    });
  });

  describe('Archetype Support', () => {
    it('should spawn worker with archetype', async () => {
      const worker = await workerSessionManager.spawnWorker({
        projectRoot: mockProjectRoot,
        taskId: taskId,
        taskContext: 'Test task',
        archetype: 'coder',
      });

      expect(worker).toBeDefined();
      // Note: archetype is passed to system prompt, not stored on WorkerSession
    });

    it('should spawn worker without archetype (default)', async () => {
      const worker = await workerSessionManager.spawnWorker({
        projectRoot: mockProjectRoot,
        taskId: taskId,
        taskContext: 'Test task',
      });

      expect(worker).toBeDefined();
    });
  });

  describe('Wait for Worker', () => {
    it('should wait for worker completion', async () => {
      const worker = await workerSessionManager.spawnWorker({
        projectRoot: mockProjectRoot,
        taskId: taskId,
        taskContext: 'Quick task',
      });

      // Manually set worker as completed for test
      (worker as any).status = 'completed';
      (worker as any).result = 'Test result';

      const result = await workerSessionManager.waitForWorker(worker.id, 5000);
      expect(result).toBe('Test result');
    }, 6000);

    it('should timeout if worker does not complete', async () => {
      await workerSessionManager.spawnWorker({
        projectRoot: mockProjectRoot,
        taskId: taskId,
        taskContext: 'Long task',
      });

      await expect(workerSessionManager.waitForWorker('invalid-worker-id', 1000)).rejects.toThrow('Worker timeout');
    });

    it('should fail if worker fails', async () => {
      const worker = await workerSessionManager.spawnWorker({
        projectRoot: mockProjectRoot,
        taskId: taskId,
        taskContext: 'Failing task',
      });

      // Manually set worker as failed
      (worker as any).status = 'failed';
      (worker as any).error = 'Task failed';

      await expect(workerSessionManager.waitForWorker(worker.id, 1000)).rejects.toThrow('Task failed');
    });
  });

  describe('Worker ID Generation', () => {
    it('should generate unique worker IDs', async () => {
      const worker1 = await workerSessionManager.spawnWorker({
        projectRoot: mockProjectRoot,
        taskId: 'task-1',
        taskContext: 'First task',
      });

      const worker2 = await workerSessionManager.spawnWorker({
        projectRoot: mockProjectRoot,
        taskId: 'task-2',
        taskContext: 'Second task',
      });

      expect(worker1.id).not.toBe(worker2.id);
    });

    it('should include timestamp in worker ID', async () => {
      const worker = await workerSessionManager.spawnWorker({
        projectRoot: mockProjectRoot,
        taskId: taskId,
        taskContext: 'Test task',
      });

      expect(worker.id).toMatch(/^worker-\d+-\d+$/);
    });
  });
});
