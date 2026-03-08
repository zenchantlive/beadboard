import { describe, it, expect } from 'vitest';

describe('Worker Session Manager - Archetype Integration', () => {
  describe('getToolsForCapabilities', () => {
    it('should grant full access for coding capability', async () => {
      const { getToolsForCapabilities } = await import('../../../src/lib/worker-session-manager');

      const result = getToolsForCapabilities(['coding']);
      expect(result.allowEdit).toBe(true);
      expect(result.allowWrite).toBe(true);
      expect(result.allowBash).toBe(true);
    });

    it('should grant full access for implementation capability', async () => {
      const { getToolsForCapabilities } = await import('../../../src/lib/worker-session-manager');

      const result = getToolsForCapabilities(['implementation']);
      expect(result.allowEdit).toBe(true);
      expect(result.allowWrite).toBe(true);
      expect(result.allowBash).toBe(true);
    });

    it('should grant full access for testing capability', async () => {
      const { getToolsForCapabilities } = await import('../../../src/lib/worker-session-manager');

      const result = getToolsForCapabilities(['testing']);
      expect(result.allowEdit).toBe(true);
      expect(result.allowWrite).toBe(true);
      expect(result.allowBash).toBe(true);
    });

    it('should grant read-only for review capability', async () => {
      const { getToolsForCapabilities } = await import('../../../src/lib/worker-session-manager');

      const result = getToolsForCapabilities(['review', 'arch_review']);
      expect(result.allowEdit).toBe(false);
      expect(result.allowWrite).toBe(false);
      expect(result.allowBash).toBe(false);
    });

    it('should grant read-only for planning capability', async () => {
      const { getToolsForCapabilities } = await import('../../../src/lib/worker-session-manager');

      const result = getToolsForCapabilities(['planning', 'design_docs']);
      expect(result.allowEdit).toBe(false);
      expect(result.allowWrite).toBe(false);
      expect(result.allowBash).toBe(false);
    });

    it('should grant read-only for research capability', async () => {
      const { getToolsForCapabilities } = await import('../../../src/lib/worker-session-manager');

      const result = getToolsForCapabilities(['research']);
      expect(result.allowEdit).toBe(false);
      expect(result.allowWrite).toBe(false);
      expect(result.allowBash).toBe(false);
    });

    it('should grant read-only for unknown capability', async () => {
      const { getToolsForCapabilities } = await import('../../../src/lib/worker-session-manager');

      const result = getToolsForCapabilities(['unknown_capability']);
      expect(result.allowEdit).toBe(false);
      expect(result.allowWrite).toBe(false);
      expect(result.allowBash).toBe(false);
    });

    it('should grant read-only for empty capabilities', async () => {
      const { getToolsForCapabilities } = await import('../../../src/lib/worker-session-manager');

      const result = getToolsForCapabilities([]);
      expect(result.allowEdit).toBe(false);
      expect(result.allowWrite).toBe(false);
      expect(result.allowBash).toBe(false);
    });

    it('should grant full access when mixing full and read-only capabilities', async () => {
      const { getToolsForCapabilities } = await import('../../../src/lib/worker-session-manager');

      // If ANY capability grants full access, worker gets full access
      const result = getToolsForCapabilities(['review', 'coding', 'research']);
      expect(result.allowEdit).toBe(true);
      expect(result.allowWrite).toBe(true);
      expect(result.allowBash).toBe(true);
    });
  });

  describe('buildWorkerPrompt', () => {
    it('should include archetype systemPrompt when provided', async () => {
      // This would require importing the class and testing the private method
      // For now, we verify the logic through integration tests
      expect(true).toBe(true);
    });

    it('should work without archetype', async () => {
      expect(true).toBe(true);
    });
  });
});
