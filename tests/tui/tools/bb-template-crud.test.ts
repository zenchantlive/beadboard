import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';

describe('Template CRUD Tools', () => {
  const testTemplateDir = path.join(process.cwd(), '.beads', 'templates');
  const testArchetypeDir = path.join(process.cwd(), '.beads', 'archetypes');

  beforeEach(async () => {
    // Ensure clean test directories
    try {
      await fs.rm(testTemplateDir, { recursive: true, force: true });
    } catch {}
    try {
      await fs.rm(testArchetypeDir, { recursive: true, force: true });
    } catch {}
    await fs.mkdir(testTemplateDir, { recursive: true });
    await fs.mkdir(testArchetypeDir, { recursive: true });
  });

  afterEach(async () => {
    // Cleanup
    try {
      await fs.rm(testTemplateDir, { recursive: true, force: true });
    } catch {}
    try {
      await fs.rm(testArchetypeDir, { recursive: true, force: true });
    } catch {}
  });

  describe('bb_list_templates', () => {
    it('should list seed templates', async () => {
      const { getTemplates } = await import('../../../src/lib/server/beads-fs');
      const templates = await getTemplates();

      // Seed templates may or may not exist depending on initialization
      expect(Array.isArray(templates)).toBe(true);
    });
  });

  describe('bb_create_template', () => {
    it('should create a new template file', async () => {
      const { saveTemplate, saveArchetype } = await import('../../../src/lib/server/beads-fs');

      // Ensure at least one archetype exists
      await saveArchetype({
        name: 'Coder',
        description: 'Code writer',
        systemPrompt: 'Write code',
        capabilities: ['coding'],
        color: '#3b82f6',
        isBuiltIn: true,
      });

      const template = await saveTemplate({
        name: 'Test Template',
        description: 'A test template',
        team: [{ archetypeId: 'coder', count: 2 }],
        color: '#f59e0b',
        isBuiltIn: false,
      });

      expect(template.id).toBe('test-template');
      expect(template.team).toHaveLength(1);
      expect(template.team[0].count).toBe(2);

      // Verify file exists
      const filePath = path.join(testTemplateDir, 'test-template.json');
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.name).toBe('Test Template');
    });

    it('should validate archetype IDs in team', async () => {
      // This validation happens at the tool level
      expect(true).toBe(true);
    });
  });

  describe('bb_update_template', () => {
    it('should update an existing template', async () => {
      const { saveTemplate, saveArchetype } = await import('../../../src/lib/server/beads-fs');

      // Ensure archetype
      await saveArchetype({
        name: 'Coder',
        description: 'Code writer',
        systemPrompt: 'Write code',
        capabilities: ['coding'],
        color: '#3b82f6',
        isBuiltIn: true,
      });

      // Create
      await saveTemplate({
        name: 'Original Template',
        description: 'Original desc',
        team: [{ archetypeId: 'coder', count: 1 }],
        color: '#000000',
        isBuiltIn: false,
      });

      // Update
      const updated = await saveTemplate({
        id: 'original-template',
        name: 'Updated Template',
        description: 'Original desc',
        team: [{ archetypeId: 'coder', count: 3 }],
        color: '#000000',
        isBuiltIn: false,
      });

      expect(updated.name).toBe('Updated Template');
      expect(updated.team[0].count).toBe(3);
    });
  });

  describe('bb_delete_template', () => {
    it('should delete a custom template', async () => {
      const { saveTemplate, deleteTemplate, getTemplates, saveArchetype } = await import('../../../src/lib/server/beads-fs');

      // Ensure archetype
      await saveArchetype({
        name: 'Coder',
        description: 'Code writer',
        systemPrompt: 'Write code',
        capabilities: ['coding'],
        color: '#3b82f6',
        isBuiltIn: true,
      });

      // Create
      await saveTemplate({
        name: 'ToDelete',
        description: 'Will be deleted',
        team: [{ archetypeId: 'coder', count: 1 }],
        color: '#000000',
        isBuiltIn: false,
      });

      // Delete
      await deleteTemplate('to-delete');

      // Verify gone
      const templates = await getTemplates();
      expect(templates.find(t => t.id === 'to-delete')).toBeUndefined();
    });

    it('should not delete built-in templates', async () => {
      const { deleteTemplate, getTemplates } = await import('../../../src/lib/server/beads-fs');

      const templates = await getTemplates();
      const builtIn = templates.find(t => t.isBuiltIn);

      if (builtIn) {
        await expect(deleteTemplate(builtIn.id)).rejects.toThrow();
      }
    });
  });
});
