import { test, expect } from '../../src/fixtures/api';

// Products belong to a brand org and every request (even GET) must be scoped with a
// `brand_org_id` query/body param that the caller owns.

async function getOrgId(api: any): Promise<string> {
  const res = await api.get('/orgs/me');
  return (await res.json()).data.id;
}

test.describe('Products API', () => {
  test('list products — happy path', async ({ brandApi }) => {
    const orgId = await getOrgId(brandApi);
    const res = await brandApi.get(`/products?brand_org_id=${orgId}`);
    expect(res.ok(), await res.text()).toBeTruthy();
  });

  test('list products — no auth is rejected', async ({ api }) => {
    const res = await api.get('/products?brand_org_id=00000000-0000-0000-0000-000000000000');
    expect(res.status()).toBe(401);
  });

  test('create, update, delete a product — full lifecycle', async ({ brandApi }) => {
    const orgId = await getOrgId(brandApi);

    const createRes = await brandApi.post('/products', {
      data: { brand_org_id: orgId, name: `API test product ${Date.now()}`, value: 25, category: 'apparel' },
    });
    expect(createRes.ok(), await createRes.text()).toBeTruthy();
    expect(createRes.status()).toBe(201);
    const created = (await createRes.json()).data;

    const updateRes = await brandApi.patch(`/products/${created.id}`, {
      data: { brand_org_id: orgId, name: 'Renamed product' },
    });
    expect(updateRes.ok(), await updateRes.text()).toBeTruthy();
    expect((await updateRes.json()).data.name).toBe('Renamed product');

    const deleteRes = await brandApi.delete(`/products/${created.id}?brand_org_id=${orgId}`);
    expect(deleteRes.ok(), await deleteRes.text()).toBeTruthy();
  });

  test('create product — missing brand_org_id gives a clear error', async ({ brandApi }) => {
    const res = await brandApi.post('/products', { data: { name: 'No org product', value: 10, category: 'other' } });
    expect(res.status(), await res.text()).toBe(400);
    const body = await res.json();
    expect(body.message.toLowerCase()).toContain('brand_org_id');
  });

  test('create product — negative value is rejected', async ({ brandApi }) => {
    const orgId = await getOrgId(brandApi);
    const res = await brandApi.post('/products', {
      data: { brand_org_id: orgId, name: 'Negative value product', value: -5, category: 'other' },
    });
    expect(res.status(), await res.text()).toBe(400);
  });

  test('create product — missing name is rejected', async ({ brandApi }) => {
    const orgId = await getOrgId(brandApi);
    const res = await brandApi.post('/products', { data: { brand_org_id: orgId, value: 10, category: 'other' } });
    expect(res.status(), await res.text()).toBe(400);
  });

  test('create product — cannot create under a brand org you do not own (IDOR)', async ({ brandApi, brandApi2 }) => {
    const otherOrgId = await getOrgId(brandApi2);
    const res = await brandApi.post('/products', {
      data: { brand_org_id: otherOrgId, name: 'IDOR product', value: 10, category: 'other' },
    });
    expect(res.status(), await res.text()).toBe(403);
  });

  test('IDOR — cannot list another brand\'s products', async ({ brandApi, brandApi2 }) => {
    const otherOrgId = await getOrgId(brandApi2);
    const res = await brandApi.get(`/products?brand_org_id=${otherOrgId}`);
    expect(res.status(), await res.text()).toBe(403);
  });

  test('IDOR — cannot update another brand\'s product when honestly naming their org', async ({
    brandApi,
    brandApi2,
  }) => {
    const ownOrgId = await getOrgId(brandApi);
    const createRes = await brandApi.post('/products', {
      data: { brand_org_id: ownOrgId, name: `IDOR update target ${Date.now()}`, value: 10, category: 'other' },
    });
    const created = (await createRes.json()).data;

    // brand2 correctly names the *actual* owning org (which it has no access to).
    const res = await brandApi2.patch(`/products/${created.id}`, {
      data: { brand_org_id: ownOrgId, name: 'hijacked' },
    });
    expect(res.status(), await res.text()).toBe(403);

    await brandApi.delete(`/products/${created.id}?brand_org_id=${ownOrgId}`);
  });

  test('IDOR — cannot delete another brand\'s product when honestly naming their org', async ({
    brandApi,
    brandApi2,
  }) => {
    const ownOrgId = await getOrgId(brandApi);
    const createRes = await brandApi.post('/products', {
      data: { brand_org_id: ownOrgId, name: `IDOR delete target ${Date.now()}`, value: 10, category: 'other' },
    });
    const created = (await createRes.json()).data;

    // brand2 correctly names the *actual* owning org (which it has no access to).
    const res = await brandApi2.delete(`/products/${created.id}?brand_org_id=${ownOrgId}`);
    expect(res.status(), await res.text()).toBe(403);

    await brandApi.delete(`/products/${created.id}?brand_org_id=${ownOrgId}`);
  });

  test('update product — product/org mismatch crashes with a raw database error', async ({
    brandApi,
    brandApi2,
  }) => {
    // BUG-API: if the product id in the URL belongs to a different org than the
    // brand_org_id in the body, the server returns a raw Supabase/Postgres error
    // ("Cannot coerce the result to a single JSON object") with a 500 status, instead
    // of a clean 403/404. This leaks internal implementation details. See api-bug-log.md.
    test.fail();
    const ownOrgId = await getOrgId(brandApi);
    const createRes = await brandApi.post('/products', {
      data: { brand_org_id: ownOrgId, name: `Mismatch update target ${Date.now()}`, value: 10, category: 'other' },
    });
    const created = (await createRes.json()).data;

    const attackerOrgId = await getOrgId(brandApi2);
    const res = await brandApi2.patch(`/products/${created.id}`, {
      data: { brand_org_id: attackerOrgId, name: 'hijacked' },
    });
    expect(res.status(), await res.text()).toBe(403);

    await brandApi.delete(`/products/${created.id}?brand_org_id=${ownOrgId}`);
  });

  test('delete product — product/org mismatch returns a false "success"', async ({ brandApi, brandApi2 }) => {
    // BUG-API: same false-success pattern as BUG-API-001 (projects). If the product id
    // belongs to a different org than the brand_org_id given, the server still replies
    // "Product deleted successfully" (200) even though nothing was deleted. See api-bug-log.md.
    test.fail();
    const ownOrgId = await getOrgId(brandApi);
    const createRes = await brandApi.post('/products', {
      data: { brand_org_id: ownOrgId, name: `Mismatch delete target ${Date.now()}`, value: 10, category: 'other' },
    });
    const created = (await createRes.json()).data;

    const attackerOrgId = await getOrgId(brandApi2);
    const res = await brandApi2.delete(`/products/${created.id}?brand_org_id=${attackerOrgId}`);
    expect(res.status(), await res.text()).toBe(403);

    await brandApi.delete(`/products/${created.id}?brand_org_id=${ownOrgId}`);
  });

  test('list products — missing brand_org_id gives a confusing error message', async ({ brandApi }) => {
    // BUG-API: leaving out brand_org_id on GET gives "The value passed as UUID is not a
    // string" instead of a clear "brand_org_id is required" (which is what POST/PATCH say
    // in the same situation). See api-bug-log.md.
    test.fail();
    const res = await brandApi.get('/products');
    expect(res.status(), await res.text()).toBe(400);
    const body = await res.json();
    expect(body.message.toLowerCase()).toContain('brand_org_id');
  });

  test('delete product — missing brand_org_id gives a confusing error message', async ({ brandApi }) => {
    // BUG-API: same confusing message as the GET case above, on DELETE. See api-bug-log.md.
    test.fail();
    const res = await brandApi.delete('/products/00000000-0000-0000-0000-000000000000');
    expect(res.status(), await res.text()).toBe(400);
    const body = await res.json();
    expect(body.message.toLowerCase()).toContain('brand_org_id');
  });
});
