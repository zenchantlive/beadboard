import test from 'node:test';
import assert from 'node:assert/strict';
import { GET as getMail, POST as postMail, PATCH as patchMail } from '../../src/app/api/agents/mail/route';
import { GET as getReservations } from '../../src/app/api/agents/reservations/route';

async function readJson(response: Response): Promise<any> {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

test('GET /api/agents/mail returns AGENT_NOT_FOUND for unknown agent', async () => {
  const response = await getMail(new Request('http://localhost/api/agents/mail?agent=nonexistent'));
  const data = await readJson(response);
  assert.equal(response.status, 404);
  assert.equal(data.ok, false);
  assert.equal(data.error?.code, 'AGENT_NOT_FOUND');
});

test('POST /api/agents/mail returns structured error on missing sender/recipient', async () => {
  const response = await postMail(
    new Request('http://localhost/api/agents/mail', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        from: 'unknown',
        to: 'missing',
        bead: 'bb-123',
        category: 'INFO',
        subject: 'hello',
        body: 'world',
      }),
    }),
  );
  const data = await readJson(response);
  assert.equal(response.status, 404);
  assert.equal(data.ok, false);
  assert.equal(typeof data.error?.code, 'string');
  assert.equal(typeof data.error?.message, 'string');
});

test('PATCH /api/agents/mail validates action', async () => {
  const response = await patchMail(
    new Request('http://localhost/api/agents/mail', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'nope',
        agent: 'x',
        message: 'y',
      }),
    }),
  );
  const data = await readJson(response);
  assert.equal(response.status, 400);
  assert.equal(data.ok, false);
  assert.equal(data.error?.code, 'INVALID_ACTION');
});

test('GET /api/agents/reservations returns AGENT_NOT_FOUND for unknown agent', async () => {
  const response = await getReservations(
    new Request('http://localhost/api/agents/reservations?agent=nonexistent'),
  );
  const data = await readJson(response);
  assert.equal(response.status, 404);
  assert.equal(data.ok, false);
  assert.equal(data.error?.code, 'AGENT_NOT_FOUND');
});
