import { test, expect } from '../../src/fixtures/api';

test.describe('Projects API', () => {
  test('list projects — happy path', async ({ authedApi }) => {
    const res = await authedApi.get('/projects');
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.data) || Array.isArray(body.data?.items)).toBeTruthy();
  });

  test('list projects — no auth is rejected', async ({ api }) => {
    const res = await api.get('/projects');
    expect(res.status()).toBe(401);
  });

  test('create, get, update, delete a project — full lifecycle', async ({ authedApi }) => {
    const createRes = await authedApi.post('/projects', {
      data: { name: `API test project ${Date.now()}` },
    });
    expect(createRes.ok(), await createRes.text()).toBeTruthy();
    expect(createRes.status()).toBe(201);
    const created = (await createRes.json()).data;
    expect(created.id).toBeTruthy();

    const getRes = await authedApi.get(`/projects/${created.id}`);
    expect(getRes.ok(), await getRes.text()).toBeTruthy();
    expect((await getRes.json()).data.id).toBe(created.id);

    const updateRes = await authedApi.patch(`/projects/${created.id}`, {
      data: { name: `API test project updated ${Date.now()}` },
    });
    expect(updateRes.ok(), await updateRes.text()).toBeTruthy();

    const genRes = await authedApi.get(`/projects/${created.id}/generations`);
    expect(genRes.ok(), await genRes.text()).toBeTruthy();

    const deleteRes = await authedApi.delete(`/projects/${created.id}`);
    expect(deleteRes.ok(), await deleteRes.text()).toBeTruthy();
  });

  test('create project — missing required name field', async ({ authedApi }) => {
    const res = await authedApi.post('/projects', { data: {} });
    expect(res.status(), await res.text()).toBe(400);
  });

  test('create project — empty string name', async ({ authedApi }) => {
    const res = await authedApi.post('/projects', { data: { name: '' } });
    expect(res.status(), await res.text()).toBe(400);
  });

  test('create project — whitespace-only name', async ({ authedApi }) => {
    // BUG-API: whitespace-only name is accepted (201) instead of rejected (400). See api-bug-log.md.
    const res = await authedApi.post('/projects', { data: { name: '   ' } });
    expect(res.status(), await res.text()).toBe(400);
  });

  test('create project — wrong type for name (number instead of string)', async ({ authedApi }) => {
    const res = await authedApi.post('/projects', { data: { name: 12345 } });
    expect(res.status(), await res.text()).toBe(400);
  });

  test('get project — invalid UUID in path', async ({ authedApi }) => {
    const res = await authedApi.get('/projects/not-a-uuid');
    expect([400, 404]).toContain(res.status());
  });

  test('get project — random UUID that does not exist', async ({ authedApi }) => {
    const res = await authedApi.get('/projects/00000000-0000-0000-0000-000000000000');
    expect(res.status()).toBe(404);
  });

  test('IDOR — cannot get another user\'s project', async ({ authedApi, authedApi2 }) => {
    const createRes = await authedApi.post('/projects', {
      data: { name: `IDOR test project ${Date.now()}` },
    });
    expect(createRes.ok(), await createRes.text()).toBeTruthy();
    const created = (await createRes.json()).data;

    const otherRes = await authedApi2.get(`/projects/${created.id}`);
    expect([403, 404]).toContain(otherRes.status());

    await authedApi.delete(`/projects/${created.id}`);
  });

  test('IDOR — cannot update another user\'s project', async ({ authedApi, authedApi2 }) => {
    const createRes = await authedApi.post('/projects', {
      data: { name: `IDOR test project ${Date.now()}` },
    });
    const created = (await createRes.json()).data;

    const otherRes = await authedApi2.patch(`/projects/${created.id}`, {
      data: { name: 'hijacked name' },
    });
    expect([403, 404]).toContain(otherRes.status());

    await authedApi.delete(`/projects/${created.id}`);
  });

  test('IDOR — deleting another user\'s project returns a false "success"', async ({ authedApi, authedApi2 }) => {
    // BUG-API: this call returns 200 "Project deleted successfully" for a project the caller
    // does not own — it should return 403/404 like GET and PATCH on the same resource do.
    // The project is NOT actually deleted (silent no-op), so there is no real data loss,
    // but the response lies about what happened. See api-bug-log.md.
    const createRes = await authedApi.post('/projects', {
      data: { name: `IDOR test project ${Date.now()}` },
    });
    const created = (await createRes.json()).data;

    const otherRes = await authedApi2.delete(`/projects/${created.id}`);
    expect([403, 404]).toContain(otherRes.status());

    const confirmRes = await authedApi.get(`/projects/${created.id}`);
    expect(confirmRes.ok(), 'project should still exist after the other user tried to delete it').toBeTruthy();

    await authedApi.delete(`/projects/${created.id}`);
  });

  test('wrong method — PUT on collection is not supported', async ({ authedApi }) => {
    const res = await authedApi.put('/projects', { data: {} });
    expect([404, 405]).toContain(res.status());
  });

  test('duplicate create — two identical requests back to back both succeed as separate records', async ({
    authedApi,
  }) => {
    const name = `Duplicate test project ${Date.now()}`;
    const [res1, res2] = await Promise.all([
      authedApi.post('/projects', { data: { name } }),
      authedApi.post('/projects', { data: { name } }),
    ]);
    expect(res1.ok(), await res1.text()).toBeTruthy();
    expect(res2.ok(), await res2.text()).toBeTruthy();
    const id1 = (await res1.json()).data.id;
    const id2 = (await res2.json()).data.id;
    expect(id1).not.toBe(id2);

    await authedApi.delete(`/projects/${id1}`);
    await authedApi.delete(`/projects/${id2}`);
  });
});
