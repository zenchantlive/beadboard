import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import React from 'react';

// Shim React for the test environment to support JSX execution
before(() => {
  // @ts-ignore
  global.React = React;
});

describe('BaseCard Component Contract', () => {
  it('exports BaseCard component', async () => {
    const mod = await import('../../../src/components/shared/base-card');
    assert.ok(mod.BaseCard, 'BaseCard should be exported');
    assert.equal(typeof mod.BaseCard, 'function', 'BaseCard should be a function/component');
  });
});

describe('BaseCard Styling Logic', () => {
  it('should be possible to import the component', async () => {
    const mod = await import('../../../src/components/shared/base-card');
    assert.ok(mod.BaseCard);
  });

  it('applies correct status border class for "ready" status', async () => {
    const { BaseCard } = await import('../../../src/components/shared/base-card');
    // @ts-ignore - status prop not yet implemented in production code
    const element = BaseCard({ children: 'test', status: 'ready' }) as any;
    
    const className = element.props.className || '';
    assert.ok(
      className.includes('border-[var(--status-ready)]') || className.includes('border-teal-500'), // Temporary check
      `Expected className to contain status-ready border, but got: ${className}`
    );
  });

  it('applies correct status border class for "blocked" status', async () => {
    const { BaseCard } = await import('../../../src/components/shared/base-card');
    // @ts-ignore - status prop not yet implemented
    const element = BaseCard({ children: 'test', status: 'blocked' }) as any;
    
    const className = element.props.className || '';
    assert.ok(
      className.includes('border-[var(--status-blocked)]') || className.includes('border-amber-500'),
      `Expected className to contain status-blocked border, but got: ${className}`
    );
  });

  it('applies selection ring when selected prop is true', async () => {
    const { BaseCard } = await import('../../../src/components/shared/base-card');
    const element = BaseCard({ children: 'test', selected: true }) as any;
    
    const className = element.props.className || '';
    assert.ok(
      className.includes('ring-1') && className.includes('ring-amber-500/30'),
      `Expected className to contain selection ring, but got: ${className}`
    );
  });
});
