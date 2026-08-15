import { test, expect } from '../../src/fixtures/api';

test.describe('Team Invitations API', () => {
  test('list — happy path', async ({ brandApi }) => {
    const res = await brandApi.get('/team-invitations');
    expect(res.ok(), await res.text()).toBeTruthy();
  });

  test('list — no auth is rejected', async ({ api }) => {
    const res = await api.get('/team-invitations');
    expect(res.status()).toBe(401);
  });

  test('validate-email — missing email is rejected', async ({ brandApi }) => {
    const res = await brandApi.post('/team-invitations/validate-email', { data: {} });
    expect(res.status(), await res.text()).toBe(400);
  });

  test('validate-email — a fresh, unused email is reported available', async ({ brandApi }) => {
    const res = await brandApi.post('/team-invitations/validate-email', {
      data: { email: `maaz+teamcheck${Date.now()}@geeksofkolachi.com` },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    expect((await res.json()).data.available).toBe(true);
  });

  test('send invitation — a creator account (wrong org type) is rejected', async ({ authedApi }) => {
    const res = await authedApi.post('/team-invitations', {
      data: { email: `maaz+wrongrole${Date.now()}@geeksofkolachi.com`, role: 'editor' },
    });
    expect(res.status(), await res.text()).toBe(403);
  });

  test('send, then cancel an invitation — full lifecycle', async ({ brandApi }) => {
    const createRes = await brandApi.post('/team-invitations', {
      data: { email: `maaz+teaminvite${Date.now()}@geeksofkolachi.com`, role: 'editor' },
    });
    expect(createRes.ok(), await createRes.text()).toBeTruthy();
    const invite = (await createRes.json()).data;

    const cancelRes = await brandApi.patch(`/team-invitations/${invite.id}/cancel`, { data: {} });
    expect(cancelRes.ok(), await cancelRes.text()).toBeTruthy();
  });

  test('send invitation — invalid role enum value is rejected', async ({ brandApi }) => {
    const res = await brandApi.post('/team-invitations', {
      data: { email: `maaz+badrole${Date.now()}@geeksofkolachi.com`, role: 'super-admin' },
    });
    expect(res.status(), await res.text()).toBe(400);
  });

  test('IDOR — cannot cancel another brand\'s invitation', async ({ brandApi, brandApi2 }) => {
    const createRes = await brandApi.post('/team-invitations', {
      data: { email: `maaz+idorinvite${Date.now()}@geeksofkolachi.com`, role: 'editor' },
    });
    const invite = (await createRes.json()).data;

    const res = await brandApi2.patch(`/team-invitations/${invite.id}/cancel`, { data: {} });
    expect(res.status(), await res.text()).toBe(404);

    await brandApi.patch(`/team-invitations/${invite.id}/cancel`, { data: {} });
  });
});
