import { test, expect } from '../../src/fixtures/api';

// NOTE: We could not find any combination of parameters (query vs body, camelCase vs
// snake_case, with/without both org ids) that gets POST /conversations past validation —
// see the dedicated test below and BUG-API-021 in api-bug-log.md. That blocks testing the
// full send/read/delete message lifecycle in this pass, since there's no way to create a
// conversation to test it against.

test.describe('Messages API', () => {
  test('list conversations — no auth is rejected', async ({ api }) => {
    const res = await api.get('/conversations');
    expect(res.status()).toBe(401);
  });

  test('list conversations — missing org id is a clean validation error', async ({ authedApi }) => {
    const res = await authedApi.get('/conversations');
    expect(res.status(), await res.text()).toBe(403);
  });

  test('list conversations — happy path with org id', async ({ authedApi }) => {
    const orgRes = await authedApi.get('/orgs/me');
    const orgId = (await orgRes.json()).data.id;
    const res = await authedApi.get(`/conversations?orgId=${orgId}`);
    expect(res.ok(), await res.text()).toBeTruthy();
  });

  test('unread counts — happy path with org id', async ({ authedApi }) => {
    const orgRes = await authedApi.get('/orgs/me');
    const orgId = (await orgRes.json()).data.id;
    const res = await authedApi.get(`/conversations/unread-counts?orgId=${orgId}`);
    expect(res.ok(), await res.text()).toBeTruthy();
  });

  test('create conversation — cannot be completed with any parameter combination we tried', async ({
    authedApi,
    authedApi2,
  }) => {
    // BUG-API: no combination of orgId/participantOrgId as query params or body fields
    // (camelCase or snake_case, together or separately) gets past "Organization id is
    // required" once a real participantOrgId value is included — even when a valid org id
    // is clearly supplied elsewhere in the same request. See api-bug-log.md.
    test.fail();
    const myOrgId = (await (await authedApi.get('/orgs/me')).json()).data.id;
    const otherOrgId = (await (await authedApi2.get('/orgs/me')).json()).data.id;

    const res = await authedApi.post(`/conversations?orgId=${myOrgId}`, {
      data: { participantOrgId: otherOrgId },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
  });
});

test.describe('Chat API (AI assistant)', () => {
  test('list chat conversations — happy path', async ({ authedApi }) => {
    const res = await authedApi.get('/chat/conversations');
    expect(res.ok(), await res.text()).toBeTruthy();
  });

  test('list chat conversations — no auth is rejected', async ({ api }) => {
    const res = await api.get('/chat/conversations');
    expect(res.status()).toBe(401);
  });

  test('create chat conversation — happy path, then delete it', async ({ authedApi }) => {
    const createRes = await authedApi.post('/chat/conversations', { data: {} });
    expect(createRes.ok(), await createRes.text()).toBeTruthy();
    const conversation = (await createRes.json()).data;

    const deleteRes = await authedApi.delete(`/chat/conversations/${conversation.id}`);
    expect(deleteRes.ok(), await deleteRes.text()).toBeTruthy();
  });

  test('IDOR — cannot view another user\'s chat messages', async ({ authedApi, authedApi2 }) => {
    const createRes = await authedApi.post('/chat/conversations', { data: {} });
    const conversation = (await createRes.json()).data;

    const res = await authedApi2.get(`/chat/conversations/${conversation.id}/messages`);
    // Reports "Conversation not found" with a 400 rather than a 404 — a minor status-code
    // choice, not worth its own bug entry given it's honest and doesn't leak anything.
    expect([400, 403, 404]).toContain(res.status());

    await authedApi.delete(`/chat/conversations/${conversation.id}`);
  });

  // Sending an actual chat message triggers a real, billed AI call — only validation is
  // exercised here, never a real message send.
  test('send message — missing conversation is a clean 404, not a crash', async ({ authedApi }) => {
    const res = await authedApi.post('/chat/conversations/00000000-0000-0000-0000-000000000000/messages', {
      data: { message: 'hello' },
    });
    expect([403, 404]).toContain(res.status());
  });
});
