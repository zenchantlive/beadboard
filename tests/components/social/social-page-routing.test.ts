import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';

import type { SocialCard as SocialCardData } from '../../../src/lib/social-cards';
import { filterSocialCardsByBlockedOnly } from '../../../src/components/social/social-page';

function makeSocialCard(overrides: Partial<SocialCardData>): SocialCardData {
  return {
    id: overrides.id ?? 'card-1',
    title: overrides.title ?? 'Card',
    status: overrides.status ?? 'ready',
    blocks: overrides.blocks ?? [],
    unblocks: overrides.unblocks ?? [],
    agents: overrides.agents ?? [],
    lastActivity: overrides.lastActivity ?? new Date(),
    priority: overrides.priority ?? 'P2',
  };
}

describe('Social blocked-only routing', () => {
  it('filters social cards down to blocked items only when enabled', () => {
    const cards = [
      makeSocialCard({ id: 'ready-1', status: 'ready' }),
      makeSocialCard({ id: 'blocked-1', status: 'blocked' }),
      makeSocialCard({ id: 'closed-1', status: 'closed' }),
      makeSocialCard({ id: 'blocked-2', status: 'blocked' }),
    ];

    const visible = filterSocialCardsByBlockedOnly(cards, true);

    assert.deepStrictEqual(
      visible.map((card) => card.id),
      ['blocked-1', 'blocked-2'],
    );
  });

  it('leaves the social card list unchanged when blocked-only is off', () => {
    const cards = [
      makeSocialCard({ id: 'ready-1', status: 'ready' }),
      makeSocialCard({ id: 'blocked-1', status: 'blocked' }),
    ];

    const visible = filterSocialCardsByBlockedOnly(cards, false);

    assert.deepStrictEqual(
      visible.map((card) => card.id),
      ['ready-1', 'blocked-1'],
    );
  });

  it('SocialPage wires shared agent states into live presence helpers', async () => {
    const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/social/social-page.tsx'), 'utf-8');
    assert.ok(fileContent.includes('agentStates?: readonly AgentState[]'), 'SocialPage should accept live agent states from the shell');
    assert.ok(fileContent.includes('buildSocialAgentPresenceByName'), 'SocialPage should derive card presence from a shared helper');
    assert.ok(fileContent.includes('agentPresenceByCardId'), 'SocialPage should cache presence per card');
  });
});
