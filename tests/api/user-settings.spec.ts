import { test, expect } from '../../src/fixtures/api';

test.describe('User Settings API', () => {
  test('get settings — happy path', async ({ authedApi }) => {
    const res = await authedApi.get('/user-settings');
    expect(res.ok(), await res.text()).toBeTruthy();
  });

  test('get settings — no auth is rejected', async ({ api }) => {
    const res = await api.get('/user-settings');
    expect(res.status()).toBe(401);
  });

  test('update settings — happy path round trip', async ({ authedApi }) => {
    const res = await authedApi.put('/user-settings', {
      data: { email_notifications: { marketing: false } },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
  });

  test('discover privacy lists — public, no auth required', async ({ api }) => {
    const creatorRes = await api.get('/user-settings/discover/creator-privacy');
    expect(creatorRes.ok(), await creatorRes.text()).toBeTruthy();

    const brandRes = await api.get('/user-settings/discover/brand-privacy');
    expect(brandRes.ok(), await brandRes.text()).toBeTruthy();
  });

  test('response envelope — GET and PUT disagree on the shape of the status field', async ({ authedApi }) => {
    // BUG-API: GET /user-settings returns {"status": "success", ...} (a string in a field
    // called "status"), while PUT /user-settings returns {"statusCode": 200, "status":
    // "success", ...} — a different field name, carrying a redundant/conflicting value.
    // Neither matches the documented envelope used by the rest of the API
    // ({ data, status: <number>, message }). See api-bug-log.md.
    const getRes = await authedApi.get('/user-settings');
    const getBody = await getRes.json();

    const putRes = await authedApi.put('/user-settings', { data: {} });
    const putBody = await putRes.json();

    expect(typeof getBody.status).toBe('number');
    expect(typeof putBody.status).toBe('number');
    expect(putBody.statusCode).toBeUndefined();
  });
});
