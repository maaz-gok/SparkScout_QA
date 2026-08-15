import { test, expect } from '../../src/fixtures/api';

// The account is capped at 5 open tickets ("You can have at most 5 open support tickets"),
// and there's no delete/close endpoint in this API to clean them up between runs. Tests
// that need "a ticket owned by authedApi" reuse an existing open one when the cap is hit,
// instead of always creating fresh (which would eventually make every run here fail).

async function getOrCreateOwnTicket(api: any): Promise<any> {
  const createRes = await api.post('/support-tickets', { data: { message: `API test ticket ${Date.now()}` } });
  if (createRes.ok()) return (await createRes.json()).data;

  const listRes = await api.get('/support-tickets');
  const tickets = (await listRes.json()).data;
  if (tickets.length > 0) return tickets[0];
  throw new Error(`Could not create or find a ticket: ${await createRes.text()}`);
}

test.describe('Support Tickets API', () => {
  test('list tickets — happy path', async ({ authedApi }) => {
    const res = await authedApi.get('/support-tickets');
    expect(res.ok(), await res.text()).toBeTruthy();
  });

  test('list tickets — no auth is rejected', async ({ api }) => {
    const res = await api.get('/support-tickets');
    expect(res.status()).toBe(401);
  });

  test('create ticket — missing message is rejected', async ({ authedApi }) => {
    const res = await authedApi.post('/support-tickets', { data: {} });
    expect(res.status(), await res.text()).toBe(400);
  });

  test('get and reply to an owned ticket — happy path', async ({ authedApi }) => {
    const ticket = await getOrCreateOwnTicket(authedApi);

    const getRes = await authedApi.get(`/support-tickets/${ticket.id}`);
    expect(getRes.ok(), await getRes.text()).toBeTruthy();

    const replyRes = await authedApi.post(`/support-tickets/${ticket.id}/messages`, {
      data: { message: 'A follow-up message' },
    });
    expect(replyRes.ok(), await replyRes.text()).toBeTruthy();
  });

  test('get ticket — one that does not exist is a clean 404', async ({ authedApi }) => {
    const res = await authedApi.get('/support-tickets/00000000-0000-0000-0000-000000000000');
    expect(res.status()).toBe(404);
  });

  test('IDOR — cannot view another user\'s ticket', async ({ authedApi, authedApi2 }) => {
    const ticket = await getOrCreateOwnTicket(authedApi);

    const res = await authedApi2.get(`/support-tickets/${ticket.id}`);
    expect(res.status(), await res.text()).toBe(404);
  });

  test('IDOR — cannot reply to another user\'s ticket', async ({ authedApi, authedApi2 }) => {
    const ticket = await getOrCreateOwnTicket(authedApi);

    const res = await authedApi2.post(`/support-tickets/${ticket.id}/messages`, {
      data: { message: 'hijacked reply' },
    });
    expect(res.status(), await res.text()).toBe(404);
  });
});
