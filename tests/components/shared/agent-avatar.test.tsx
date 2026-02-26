import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import React from 'react';

// Shim React for the test environment
before(() => {
  // @ts-ignore
  global.React = React;
});

describe('AgentAvatar Component Contract', () => {
  it('exports AgentAvatar component', async () => {
    const mod = await import('../../../src/components/shared/agent-avatar');
    assert.ok(mod.AgentAvatar, 'AgentAvatar should be exported');
  });
});

describe('AgentAvatar Role Styling', () => {
  it('applies correct role color class for "ui" role', async () => {
    const { AgentAvatar } = await import('../../../src/components/shared/agent-avatar');
    // @ts-ignore - role prop not yet implemented
    const element = AgentAvatar({ name: 'Test', status: 'active', role: 'ui' }) as any;
    
    const className = element.props.className || '';
    assert.ok(
      className.includes('border-l-[3px]') && className.includes('border-l-[var(--agent-role-ui)]'),
      `Expected role-colored left border for ui, but got: ${className}`
    );
  });

  it('applies correct role color class for "orchestrator" role', async () => {
    const { AgentAvatar } = await import('../../../src/components/shared/agent-avatar');
    // @ts-ignore - role prop not yet implemented
    const element = AgentAvatar({ name: 'Test', status: 'active', role: 'orchestrator' }) as any;
    
    const className = element.props.className || '';
    assert.ok(
      className.includes('border-l-[var(--agent-role-orchestrator)]'),
      `Expected role-colored left border for orchestrator, but got: ${className}`
    );
  });
});

describe('AgentAvatar ZFC States', () => {
  it('applies working pulse glow', async () => {
    const { AgentAvatar } = await import('../../../src/components/shared/agent-avatar');
    // @ts-ignore - working status not yet implemented
    const element = AgentAvatar({ name: 'Test', status: 'working' }) as any;
    
    const className = element.props.className || '';
    assert.ok(
      className.includes('animate-pulse') || className.includes('shadow-[0_0_12px_rgba(124,185,122,0.4)]'),
      `Expected working pulse glow, but got: ${className}`
    );
  });
});
