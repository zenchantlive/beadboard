import test from 'node:test';
import assert from 'node:assert/strict';

import { ProjectEventCoalescer } from '../../src/lib/coalescer';

test('coalescer emits latest payload once per project within debounce window', async () => {
  const flushed: Array<{ projectRoot: string; payload: { value: string } }> = [];
  const coalescer = new ProjectEventCoalescer<{ value: string }>(20, (event) => {
    flushed.push(event);
  });

  coalescer.queue('C:/Repo/One', { value: 'first' });
  coalescer.queue('c:\\repo\\one', { value: 'second' });

  await new Promise((resolve) => setTimeout(resolve, 45));

  assert.equal(flushed.length, 1);
  assert.equal(flushed[0].payload.value, 'second');
});

test('coalescer keeps distinct projects separated', async () => {
  const flushed: Array<{ projectRoot: string; payload: { value: string } }> = [];
  const coalescer = new ProjectEventCoalescer<{ value: string }>(20, (event) => {
    flushed.push(event);
  });

  coalescer.queue('C:/Repo/One', { value: 'one' });
  coalescer.queue('D:/Repo/Two', { value: 'two' });

  await new Promise((resolve) => setTimeout(resolve, 45));

  assert.equal(flushed.length, 2);
});
