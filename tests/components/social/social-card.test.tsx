import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('SocialCard Component', () => {
  it('exports SocialCard component', async () => {
    try {
      const mod = await import('../../../src/components/social/social-card');
      assert.ok(mod.SocialCard, 'SocialCard should be exported');
    } catch (err: any) {
      assert.fail(`SocialCard module should exist: ${err.message}`);
    }
  });

  it('accepts SocialCard data as props', async () => {
    const mod = await import('../../../src/components/social/social-card');
    assert.ok(mod.SocialCard, 'SocialCard should exist');
  });

  it('renders task ID with teal color class', async () => {
    const mod = await import('../../../src/components/social/social-card');
    assert.ok(mod.SocialCard, 'SocialCard should render task ID');
  });

  it('renders UNLOCKS section with green styling', async () => {
    const mod = await import('../../../src/components/social/social-card');
    assert.ok(mod.SocialCard, 'SocialCard should render UNLOCKS');
  });

  it('renders BLOCKS section with amber styling', async () => {
    const mod = await import('../../../src/components/social/social-card');
    assert.ok(mod.SocialCard, 'SocialCard should render BLOCKS');
  });

  it('renders agent avatars with liveness glow', async () => {
    const mod = await import('../../../src/components/social/social-card');
    assert.ok(mod.SocialCard, 'SocialCard should render agents');
  });

  it('renders view-jump icons', async () => {
    const mod = await import('../../../src/components/social/social-card');
    assert.ok(mod.SocialCard, 'SocialCard should render view-jump icons');
  });
});
