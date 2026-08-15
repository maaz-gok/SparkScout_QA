import { test, expect } from '../../src/fixtures/api';

async function getOrgId(api: any): Promise<string> {
  const res = await api.get('/orgs/me');
  return (await res.json()).data.id;
}

// The free plan only allows one active/draft campaign at a time on the test brand
// account, so campaign-creating tests must not run concurrently with each other.
test.describe.configure({ mode: 'serial' });

test.describe('Campaigns API', () => {
  test('list campaigns — no auth is rejected', async ({ api }) => {
    const res = await api.get('/campaigns');
    expect(res.status()).toBe(401);
  });

  test(
    'list campaigns with no filter leaks every brand\'s campaigns, including other brands\' unpublished drafts',
    async ({ authedApi }) => {
      // BUG-API: GET /campaigns with no brand_org_id given returns every campaign on the
      // platform from every brand — hundreds of them — including campaigns still in
      // "draft" status that their owning brand hasn't published yet. This works even from
      // a plain creator account with no brand relationship at all. Passing brand_org_id
      // as a filter DOES correctly scope the results, but nothing requires it. See
      // api-bug-log.md (this is the most serious finding in this pass).
      test.fail();
      const res = await authedApi.get('/campaigns');
      expect(res.ok(), await res.text()).toBeTruthy();
      const body = await res.json();
      const draftsFromOthers = body.data.filter((c: any) => c.status === 'draft');
      expect(body.data.length, 'a creator account should not see hundreds of other brands\' campaigns').toBeLessThan(
        5,
      );
      expect(draftsFromOthers.length, 'should never see another brand\'s unpublished draft campaigns').toBe(0);
    },
  );

  test('list campaigns — filtering by my own brand_org_id correctly scopes the results', async ({ brandApi }) => {
    const orgId = await getOrgId(brandApi);
    const res = await brandApi.get(`/campaigns?brand_org_id=${orgId}`);
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(body.data.every((c: any) => c.brand_org_id === orgId)).toBeTruthy();
  });

  test('create, get, update, delete a campaign — full lifecycle', async ({ brandApi }) => {
    const orgId = await getOrgId(brandApi);

    const createRes = await brandApi.post('/campaigns', {
      data: { brand_org_id: orgId, title: `API test campaign ${Date.now()}` },
    });
    expect(createRes.ok(), await createRes.text()).toBeTruthy();
    expect(createRes.status()).toBe(201);
    const created = (await createRes.json()).data;
    expect(created.status).toBe('draft');

    const getRes = await brandApi.get(`/campaigns/${created.id}`);
    expect(getRes.ok(), await getRes.text()).toBeTruthy();

    const updateRes = await brandApi.patch(`/campaigns/${created.id}`, {
      data: { brand_org_id: orgId, title: 'Renamed campaign' },
    });
    expect(updateRes.ok(), await updateRes.text()).toBeTruthy();
    expect((await updateRes.json()).data.title).toBe('Renamed campaign');

    const deleteRes = await brandApi.delete(`/campaigns/${created.id}`);
    expect(deleteRes.ok(), await deleteRes.text()).toBeTruthy();
  });

  test('create campaign — completely empty body is rejected, not silently accepted', async ({ brandApi }) => {
    const orgId = await getOrgId(brandApi);
    const res = await brandApi.post('/campaigns', { data: { brand_org_id: orgId } });
    expect(res.status(), await res.text()).toBe(400);
  });

  test('create campaign — cannot create under a brand org you do not own (IDOR)', async ({ brandApi, brandApi2 }) => {
    const otherOrgId = await getOrgId(brandApi2);
    const res = await brandApi.post('/campaigns', {
      data: { brand_org_id: otherOrgId, title: 'IDOR campaign' },
    });
    expect(res.status(), await res.text()).toBe(403);
  });

  test('get campaign — random UUID that does not exist', async ({ brandApi }) => {
    const res = await brandApi.get('/campaigns/00000000-0000-0000-0000-000000000000');
    expect(res.status()).toBe(404);
  });

  test('IDOR — cannot update another brand\'s campaign', async ({ brandApi, brandApi2 }) => {
    const orgId = await getOrgId(brandApi);
    const createRes = await brandApi.post('/campaigns', {
      data: { brand_org_id: orgId, title: `IDOR update target ${Date.now()}` },
    });
    const created = (await createRes.json()).data;

    const res = await brandApi2.patch(`/campaigns/${created.id}`, {
      data: { brand_org_id: orgId, title: 'hijacked' },
    });
    expect(res.status(), await res.text()).toBe(403);

    await brandApi.delete(`/campaigns/${created.id}`);
  });

  test('IDOR — cannot delete another brand\'s campaign', async ({ brandApi, brandApi2 }) => {
    const orgId = await getOrgId(brandApi);
    const createRes = await brandApi.post('/campaigns', {
      data: { brand_org_id: orgId, title: `IDOR delete target ${Date.now()}` },
    });
    const created = (await createRes.json()).data;

    const res = await brandApi2.delete(`/campaigns/${created.id}`);
    expect(res.status(), await res.text()).toBe(403);

    const confirmRes = await brandApi.get(`/campaigns/${created.id}`);
    expect(confirmRes.ok()).toBeTruthy();

    await brandApi.delete(`/campaigns/${created.id}`);
  });

  test('campaign counts and stats endpoints — happy path', async ({ brandApi }) => {
    const countsRes = await brandApi.get('/campaigns/counts');
    expect(countsRes.ok(), await countsRes.text()).toBeTruthy();

    const statsRes = await brandApi.get('/campaigns/stats');
    expect(statsRes.ok(), await statsRes.text()).toBeTruthy();
  });
});
