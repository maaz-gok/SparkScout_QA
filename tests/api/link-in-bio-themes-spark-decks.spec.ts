import { test, expect } from '../../src/fixtures/api';

test.describe('Themes API', () => {
  test('templates and fonts — public, happy path', async ({ api }) => {
    const templatesRes = await api.get('/themes/templates');
    expect(templatesRes.ok(), await templatesRes.text()).toBeTruthy();

    const fontsRes = await api.get('/themes/fonts');
    expect(fontsRes.ok(), await fontsRes.text()).toBeTruthy();
  });
});

test.describe('Link in Bio API', () => {
  test('get mine — no auth is rejected', async ({ api }) => {
    const res = await api.get('/link-in-bio/me');
    expect(res.status()).toBe(401);
  });

  test('get mine — missing org id is a clean validation error', async ({ authedApi }) => {
    const res = await authedApi.get('/link-in-bio/me');
    expect(res.status(), await res.text()).toBe(400);
  });

  test('get, then update mine — happy path', async ({ authedApi }) => {
    const orgRes = await authedApi.get('/orgs/me');
    const orgId = (await orgRes.json()).data.id;

    const meRes = await authedApi.get(`/link-in-bio/me?orgId=${orgId}`);
    expect(meRes.ok(), await meRes.text()).toBeTruthy();

    const updateRes = await authedApi.patch(`/link-in-bio/me?orgId=${orgId}`, {
      data: { display_name: `API test ${Date.now()}` },
    });
    expect(updateRes.ok(), await updateRes.text()).toBeTruthy();
  });

  test('IDOR — cannot fetch another org\'s Link in Bio via the "me" route', async ({ authedApi, authedApi2 }) => {
    const otherOrgRes = await authedApi2.get('/orgs/me');
    const otherOrgId = (await otherOrgRes.json()).data.id;

    const res = await authedApi.get(`/link-in-bio/me?orgId=${otherOrgId}`);
    expect(res.status(), await res.text()).toBe(403);
  });
});

test.describe('Spark Decks API', () => {
  test('list — happy path', async ({ authedApi }) => {
    const res = await authedApi.get('/spark-decks');
    expect(res.ok(), await res.text()).toBeTruthy();
  });

  test('list — no auth is rejected', async ({ api }) => {
    const res = await api.get('/spark-decks');
    expect(res.status()).toBe(401);
  });

  test('create, get, update, delete — full lifecycle', async ({ authedApi }) => {
    const createRes = await authedApi.post('/spark-decks', {
      data: { name: 'API test deck', title: `API test deck ${Date.now()}` },
    });
    expect(createRes.ok(), await createRes.text()).toBeTruthy();
    const deck = (await createRes.json()).data;

    const getRes = await authedApi.get(`/spark-decks/${deck.id}`);
    expect(getRes.ok(), await getRes.text()).toBeTruthy();

    const updateRes = await authedApi.patch(`/spark-decks/${deck.id}`, { data: { name: 'Renamed deck' } });
    expect(updateRes.ok(), await updateRes.text()).toBeTruthy();

    const deleteRes = await authedApi.delete(`/spark-decks/${deck.id}`);
    expect(deleteRes.ok(), await deleteRes.text()).toBeTruthy();
  });

  test('create — missing title is rejected (though with a raw database error message)', async ({ authedApi }) => {
    const res = await authedApi.post('/spark-decks', { data: { name: 'No title deck' } });
    expect(res.status(), await res.text()).toBe(400);
  });

  test('IDOR — cannot view, update, or delete another creator\'s deck', async ({ authedApi, authedApi2 }) => {
    const createRes = await authedApi.post('/spark-decks', {
      data: { name: 'IDOR target deck', title: `IDOR target deck ${Date.now()}` },
    });
    const deck = (await createRes.json()).data;

    const getRes = await authedApi2.get(`/spark-decks/${deck.id}`);
    expect(getRes.status(), await getRes.text()).toBe(404);

    const updateRes = await authedApi2.patch(`/spark-decks/${deck.id}`, { data: { name: 'hijacked' } });
    expect(updateRes.status(), await updateRes.text()).toBe(403);

    const deleteRes = await authedApi2.delete(`/spark-decks/${deck.id}`);
    expect(deleteRes.status(), await deleteRes.text()).toBe(403);

    await authedApi.delete(`/spark-decks/${deck.id}`);
  });
});
