import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

// We'll export these from agent-reservations.ts
import { 
  normalizePath, 
  classifyOverlap 
} from '../../src/lib/agent-reservations';

test('normalizePath canonicalizes various path formats', () => {
  const root = path.resolve('/');
  
  // Basic normalization
  assert.equal(normalizePath('src/lib/'), normalizePath('src/lib'));
  assert.equal(normalizePath('src//lib'), normalizePath('src/lib'));
  
  // Windows specific (if running on windows, this is handled in the impl)
  // We can't easily test cross-platform logic without mocking path.
  // But we can check that it resolves and removes trailing slash.
  const p1 = normalizePath('src/components');
  assert.ok(path.isAbsolute(p1));
  assert.ok(!p1.endsWith('/') || p1 === root);
});

test('classifyOverlap correctly identifies exact matches', () => {
  const p1 = 'src/lib/parser.ts';
  const p2 = 'src/lib/parser.ts';
  assert.equal(classifyOverlap(p1, p2), 'exact');
});

test('classifyOverlap correctly identifies partial overlaps', () => {
  // Parent-child
  assert.equal(classifyOverlap('src/lib', 'src/lib/parser.ts'), 'partial');
  assert.equal(classifyOverlap('src/lib/parser.ts', 'src/lib'), 'partial');
  
  // Prefix/Wildcard
  assert.equal(classifyOverlap('src/*', 'src/lib/parser.ts'), 'partial');
  assert.equal(classifyOverlap('src/lib/parser.ts', 'src/*'), 'partial');
});

test('classifyOverlap correctly identifies disjoint paths', () => {
  assert.equal(classifyOverlap('src/lib', 'src/components'), 'disjoint');
  assert.equal(classifyOverlap('src/lib/parser.ts', 'src/lib/other.ts'), 'disjoint');
});
