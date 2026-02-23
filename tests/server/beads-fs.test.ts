import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import { getArchetypes, getTemplates, saveArchetype, deleteArchetype, saveTemplate, deleteTemplate, slugify } from '../../src/lib/server/beads-fs';

const ARCHE_DIR = path.join(process.cwd(), '.beads', 'archetypes');
const TEMPLATE_DIR = path.join(process.cwd(), '.beads', 'templates');
const TEST_ARCHETYPE_ID = 'test-custom-archetype';
const TEST_TEMPLATE_ID = 'test-custom-template';

async function cleanupTestArchetype() {
    try {
        await fs.unlink(path.join(ARCHE_DIR, `${TEST_ARCHETYPE_ID}.json`));
    } catch {
        // File doesn't exist, ignore
    }
}

test('getArchetypes returns array of archetypes', async () => {
    const archetypes = await getArchetypes();
    assert.ok(Array.isArray(archetypes));
});

test('slugify: converts spaces to dashes', () => {
    assert.equal(slugify('System Architect'), 'system-architect');
});

test('slugify: lowercases all characters', () => {
    assert.equal(slugify('My Custom Agent'), 'my-custom-agent');
});

test('slugify: removes non-alphanumeric characters except dashes', () => {
    assert.equal(slugify('Agent!@#$%Name'), 'agentname');
});

test('slugify: handles multiple consecutive spaces', () => {
    assert.equal(slugify('My   Agent'), 'my-agent');
});

test('slugify: handles leading and trailing spaces', () => {
    assert.equal(slugify('  My Agent  '), 'my-agent');
});

test('saveArchetype: creates new archetype with generated id from name', async () => {
    await cleanupTestArchetype();
    try {
        const archetype = await saveArchetype({
            name: 'Test Custom Archetype',
            description: 'A test archetype',
            systemPrompt: 'You are a test agent',
            capabilities: ['testing'],
            color: '#ff0000'
        });

        assert.equal(archetype.id, 'test-custom-archetype');
        assert.equal(archetype.name, 'Test Custom Archetype');
        assert.equal(archetype.isBuiltIn, false);
        assert.ok(archetype.createdAt);
        assert.ok(archetype.updatedAt);
    } finally {
        await cleanupTestArchetype();
    }
});

test('saveArchetype: creates new archetype with provided id', async () => {
    const customId = 'custom-id-123-test';
    try {
        const archetype = await saveArchetype({
            id: customId,
            name: 'My Agent',
            description: 'Description',
            systemPrompt: 'Prompt',
            capabilities: [],
            color: '#000000'
        });

        assert.equal(archetype.id, customId);
    } finally {
        await fs.unlink(path.join(ARCHE_DIR, `${customId}.json`)).catch(() => { });
    }
});

test('saveArchetype: updates existing archetype and preserves createdAt', async () => {
    await cleanupTestArchetype();
    try {
        const created = await saveArchetype({
            id: TEST_ARCHETYPE_ID,
            name: 'Test Agent',
            description: 'Original desc',
            systemPrompt: 'Original prompt',
            capabilities: [],
            color: '#000000'
        });

        const originalCreatedAt = created.createdAt;

        await new Promise(resolve => setTimeout(resolve, 10));

        const updated = await saveArchetype({
            id: TEST_ARCHETYPE_ID,
            name: 'Test Agent Updated',
            description: 'New desc',
            systemPrompt: 'New prompt',
            capabilities: ['new-cap'],
            color: '#ffffff',
            createdAt: originalCreatedAt,
            isBuiltIn: false
        });

        assert.equal(updated.createdAt, originalCreatedAt);
        assert.equal(updated.name, 'Test Agent Updated');
        assert.notEqual(updated.updatedAt, originalCreatedAt);
    } finally {
        await cleanupTestArchetype();
    }
});

test('saveArchetype: preserves isBuiltIn status when editing built-in archetype', async () => {
    const archetypes = await getArchetypes();
    const builtIn = archetypes.find(a => a.isBuiltIn === true);

    if (builtIn) {
        const updated = await saveArchetype({
            ...builtIn,
            isBuiltIn: false // Try to mistakenly strip it
        });

        assert.equal(updated.isBuiltIn, true, 'isBuiltIn should be preserved as true');

        // Restore
        await saveArchetype(builtIn);
    }
});

test('saveArchetype: writes file to archetypes directory', async () => {
    await cleanupTestArchetype();
    try {
        await saveArchetype({
            id: TEST_ARCHETYPE_ID,
            name: 'Test',
            description: 'Desc',
            systemPrompt: 'Prompt',
            capabilities: [],
            color: '#000000'
        });

        const filePath = path.join(ARCHE_DIR, `${TEST_ARCHETYPE_ID}.json`);
        const content = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(content);

        assert.equal(parsed.id, TEST_ARCHETYPE_ID);
    } finally {
        await cleanupTestArchetype();
    }
});

test('deleteArchetype: deletes non-built-in archetype', async () => {
    await cleanupTestArchetype();
    try {
        await saveArchetype({
            id: TEST_ARCHETYPE_ID,
            name: 'Test',
            description: 'Desc',
            systemPrompt: 'Prompt',
            capabilities: [],
            color: '#000000'
        });

        await deleteArchetype(TEST_ARCHETYPE_ID);

        const archetypes = await getArchetypes();
        assert.equal(archetypes.find(a => a.id === TEST_ARCHETYPE_ID), undefined);
    } finally {
        await cleanupTestArchetype();
    }
});

test('deleteArchetype: rejects deletion of built-in archetype', async () => {
    const archetypes = await getArchetypes();
    const builtIn = archetypes.find(a => a.isBuiltIn === true);

    if (builtIn) {
        await assert.rejects(
            async () => await deleteArchetype(builtIn.id),
            /built-in/
        );
    }
});

test('deleteArchetype: throws error for non-existent archetype', async () => {
    await assert.rejects(
        async () => await deleteArchetype('non-existent-archetype-xyz'),
        /not found/
    );
});

async function cleanupTestTemplate() {
    try {
        await fs.unlink(path.join(TEMPLATE_DIR, `${TEST_TEMPLATE_ID}.json`));
    } catch {
        // File doesn't exist, ignore
    }
    try {
        await fs.unlink(path.join(TEMPLATE_DIR, 'auto-generated-id.json'));
    } catch { }
}

test('getTemplates returns array of templates', async () => {
    const templates = await getTemplates();
    assert.ok(Array.isArray(templates));
});

test('saveTemplate: creates new template with auto-generated id from name', async () => {
    await cleanupTestTemplate();
    try {
        const template = await saveTemplate({
            name: 'Auto Generated ID',
            description: 'Test description',
            team: [{ archetypeId: 'architect', count: 1 }]
        });

        assert.equal(template.id, 'auto-generated-id');
        assert.equal(template.name, 'Auto Generated ID');
        assert.equal(template.isBuiltIn, false);
        assert.ok(template.createdAt);
        assert.ok(template.updatedAt);
    } finally {
        await cleanupTestTemplate();
    }
});

test('saveTemplate: creates new template with provided id', async () => {
    await cleanupTestTemplate();
    try {
        const template = await saveTemplate({
            id: TEST_TEMPLATE_ID,
            name: 'Test Template',
            description: 'Test description',
            team: [{ archetypeId: 'architect', count: 1 }]
        });

        assert.equal(template.id, TEST_TEMPLATE_ID);
        assert.equal(template.name, 'Test Template');
        assert.equal(template.isBuiltIn, false);

        const filePath = path.join(TEMPLATE_DIR, `${TEST_TEMPLATE_ID}.json`);
        const content = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(content);
        assert.equal(parsed.name, 'Test Template');
    } finally {
        await cleanupTestTemplate();
    }
});

test('saveTemplate: updates existing template and preserves createdAt', async () => {
    await cleanupTestTemplate();
    try {
        const created = await saveTemplate({
            id: TEST_TEMPLATE_ID,
            name: 'Test Template',
            description: 'Test description',
            team: [{ archetypeId: 'architect', count: 1 }]
        });

        const originalCreatedAt = created.createdAt;

        await new Promise(resolve => setTimeout(resolve, 10));

        const updated = await saveTemplate({
            id: TEST_TEMPLATE_ID,
            name: 'Updated Template',
            description: 'Updated description',
            team: [{ archetypeId: 'coder', count: 2 }],
            createdAt: originalCreatedAt,
            isBuiltIn: false
        });

        assert.equal(updated.createdAt, originalCreatedAt);
        assert.equal(updated.name, 'Updated Template');
        assert.notEqual(updated.updatedAt, originalCreatedAt);
    } finally {
        await cleanupTestTemplate();
    }
});

test('saveTemplate: preserves isBuiltIn status when editing built-in template', async () => {
    const templates = await getTemplates();
    const builtIn = templates.find(t => t.isBuiltIn === true);

    if (builtIn) {
        const updated = await saveTemplate({
            ...builtIn,
            isBuiltIn: false // Try to mistakenly strip it
        });

        assert.equal(updated.isBuiltIn, true, 'isBuiltIn should be preserved as true');

        // Restore
        await saveTemplate(builtIn);
    }
});

test('saveTemplate: validates archetypeIds exist', async () => {
    await cleanupTestTemplate();
    try {
        await assert.rejects(
            async () => await saveTemplate({
                id: TEST_TEMPLATE_ID,
                name: 'Invalid Template',
                description: 'Test description',
                team: [{ archetypeId: 'non-existent-archetype', count: 1 }]
            }),
            /archetype/
        );
    } finally {
        await cleanupTestTemplate();
    }
});

test('saveTemplate: preserves protoFormula when provided', async () => {
    await cleanupTestTemplate();
    try {
        const template = await saveTemplate({
            id: TEST_TEMPLATE_ID,
            name: 'Template with Formula',
            description: 'Test description',
            team: [{ archetypeId: 'architect', count: 1 }],
            protoFormula: 'architect:1,coder:2'
        });

        assert.equal(template.protoFormula, 'architect:1,coder:2');
    } finally {
        await cleanupTestTemplate();
    }
});

test('deleteTemplate: deletes non-built-in template', async () => {
    await cleanupTestTemplate();
    try {
        await saveTemplate({
            id: TEST_TEMPLATE_ID,
            name: 'Test Template',
            description: 'Desc',
            team: [{ archetypeId: 'architect', count: 1 }]
        });

        await deleteTemplate(TEST_TEMPLATE_ID);

        const templates = await getTemplates();
        assert.equal(templates.find(t => t.id === TEST_TEMPLATE_ID), undefined);
    } finally {
        await cleanupTestTemplate();
    }
});

test('deleteTemplate: rejects deletion of built-in template', async () => {
    const templates = await getTemplates();
    const builtIn = templates.find(t => t.isBuiltIn === true);

    if (builtIn) {
        await assert.rejects(
            async () => await deleteTemplate(builtIn.id),
            /built-in/
        );
    }
});

test('deleteTemplate: throws error for non-existent template', async () => {
    await assert.rejects(
        async () => await deleteTemplate('non-existent-template-xyz'),
        /not found/
    );
});
