import { test, expect } from '../../src/fixtures/api';

test.describe('Content Library API', () => {
  test('list items — happy path', async ({ authedApi }) => {
    const res = await authedApi.get('/content-library');
    expect(res.ok(), await res.text()).toBeTruthy();
  });

  test('list items — no auth is rejected', async ({ api }) => {
    const res = await api.get('/content-library');
    expect(res.status()).toBe(401);
  });

  test('storage stats — happy path', async ({ authedApi }) => {
    const res = await authedApi.get('/content-library/stats/storage');
    expect(res.ok(), await res.text()).toBeTruthy();
  });

  test('create, get, update, delete an item — full lifecycle', async ({ authedApi }) => {
    const createRes = await authedApi.post('/content-library', {
      data: { title: `API test content ${Date.now()}`, contentUrl: 'https://example.com/file.jpg', contentType: 'image' },
    });
    expect(createRes.ok(), await createRes.text()).toBeTruthy();
    const created = (await createRes.json()).data;

    const getRes = await authedApi.get(`/content-library/${created.id}`);
    expect(getRes.ok(), await getRes.text()).toBeTruthy();

    const updateRes = await authedApi.patch(`/content-library/${created.id}`, { data: { title: 'Renamed content' } });
    expect(updateRes.ok(), await updateRes.text()).toBeTruthy();

    const deleteRes = await authedApi.delete(`/content-library/${created.id}`);
    expect(deleteRes.ok(), await deleteRes.text()).toBeTruthy();
  });

  test('create item — missing title is rejected cleanly', async ({ authedApi }) => {
    const res = await authedApi.post('/content-library', {
      data: { contentUrl: 'https://example.com/file.jpg', contentType: 'image' },
    });
    expect(res.status(), await res.text()).toBe(400);
  });

  test('create item — missing contentType crashes instead of a clean 400', async ({ authedApi }) => {
    // BUG-API: title and contentUrl are validated cleanly (400 when missing), but
    // contentType is not — leaving it out reaches the database and crashes with a raw
    // "null value in column content_type ... violates not-null constraint" 500 error.
    // See api-bug-log.md.
    const res = await authedApi.post('/content-library', {
      data: { title: `Missing content type ${Date.now()}`, contentUrl: 'https://example.com/file.jpg' },
    });
    expect(res.status(), await res.text()).toBe(400);
  });

  test('IDOR — cannot view another user\'s content item', async ({ authedApi, authedApi2 }) => {
    const createRes = await authedApi.post('/content-library', {
      data: { title: `IDOR content ${Date.now()}`, contentUrl: 'https://example.com/file.jpg', contentType: 'image' },
    });
    const created = (await createRes.json()).data;

    const res = await authedApi2.get(`/content-library/${created.id}`);
    expect(res.status(), await res.text()).toBe(404);

    await authedApi.delete(`/content-library/${created.id}`);
  });

  test('IDOR — cannot delete another user\'s content item', async ({ authedApi, authedApi2 }) => {
    const createRes = await authedApi.post('/content-library', {
      data: { title: `IDOR content ${Date.now()}`, contentUrl: 'https://example.com/file.jpg', contentType: 'image' },
    });
    const created = (await createRes.json()).data;

    const res = await authedApi2.delete(`/content-library/${created.id}`);
    expect(res.status(), await res.text()).toBe(404);

    const confirmRes = await authedApi.get(`/content-library/${created.id}`);
    expect(confirmRes.ok()).toBeTruthy();

    await authedApi.delete(`/content-library/${created.id}`);
  });

  test('update someone else\'s content item crashes instead of a clean 404', async ({ authedApi, authedApi2 }) => {
    // BUG-API: same "Cannot coerce the result to a single JSON object" crash pattern as
    // BUG-API-003. GET and DELETE on this exact same resource correctly return 404 for a
    // non-owner; only PATCH crashes. See api-bug-log.md.
    const createRes = await authedApi.post('/content-library', {
      data: { title: `Mismatch content ${Date.now()}`, contentUrl: 'https://example.com/file.jpg', contentType: 'image' },
    });
    const created = (await createRes.json()).data;

    const res = await authedApi2.patch(`/content-library/${created.id}`, { data: { title: 'hijacked' } });
    expect(res.status(), await res.text()).toBe(404);

    await authedApi.delete(`/content-library/${created.id}`);
  });

  test('collections — list and create', async ({ authedApi }) => {
    const listRes = await authedApi.get('/content-library/collections/list');
    expect(listRes.ok(), await listRes.text()).toBeTruthy();

    const createRes = await authedApi.post('/content-library/collections', {
      data: { name: `API test collection ${Date.now()}` },
    });
    expect(createRes.ok(), await createRes.text()).toBeTruthy();
    const created = (await createRes.json()).data;

    const deleteRes = await authedApi.delete(`/content-library/collections/${created.id}`);
    expect(deleteRes.ok(), await deleteRes.text()).toBeTruthy();
  });
});
