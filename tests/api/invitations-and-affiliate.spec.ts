import { test, expect } from '../../src/fixtures/api';

test.describe('Invitations API', () => {
  test('send friend invitation — no auth is rejected', async ({ api }) => {
    const res = await api.post('/invitations/send', { data: {} });
    expect(res.status()).toBe(401);
  });

  test('send friend invitation — missing email is rejected', async ({ authedApi }) => {
    const res = await authedApi.post('/invitations/send', { data: {} });
    expect(res.status(), await res.text()).toBe(400);
  });

  test('send friend invitation — happy path', async ({ authedApi }) => {
    const res = await authedApi.post('/invitations/send', {
      data: { email: `maaz+frienddemo${Date.now()}@geeksofkolachi.com` },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
  });

  test('validate invite token — a made-up token is reported invalid, not a crash', async ({ api }) => {
    const res = await api.get('/invitations/validate/not-a-real-token');
    expect(res.ok(), await res.text()).toBeTruthy();
    expect((await res.json()).valid).toBe(false);
  });

  test('accept invitation — missing token is rejected', async ({ api }) => {
    const res = await api.post('/invitations/accept', { data: {} });
    expect(res.status(), await res.text()).toBe(400);
  });
});

test.describe('Affiliate API', () => {
  test('get my affiliate info — happy path', async ({ authedApi }) => {
    const res = await authedApi.get('/affiliate/me');
    expect(res.ok(), await res.text()).toBeTruthy();
  });

  test('get my affiliate info — no auth is rejected', async ({ api }) => {
    const res = await api.get('/affiliate/me');
    expect(res.status()).toBe(401);
  });

  test('withdraw — below the minimum payout threshold is rejected, not a crash', async ({ authedApi }) => {
    const res = await authedApi.post('/affiliate/withdraw', { data: {} });
    expect(res.status(), await res.text()).toBe(400);
  });

  test('accept — missing affiliate code is rejected', async ({ authedApi }) => {
    const res = await authedApi.post('/affiliate/accept', { data: {} });
    expect(res.status(), await res.text()).toBe(400);
  });

  test('accept — affiliate code validation (internal tracking: see private bug tracker)', async ({ authedApi }) => {
    // Known issue tracked privately — see internal bug log for details and reproduction.
    const res = await authedApi.post('/affiliate/accept', { data: { affiliate_code: 'NOT-A-REAL-CODE' } });
    expect(res.status(), await res.text()).toBe(400);
  });
});
