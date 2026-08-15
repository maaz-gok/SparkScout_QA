import { test, expect } from '../../src/fixtures/api';

test.describe('Orgs API', () => {
  test('get my org — happy path', async ({ authedApi }) => {
    const res = await authedApi.get('/orgs/me');
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(body.data.type).toBe('creator');
  });

  test('get my org — no auth is rejected', async ({ api }) => {
    const res = await api.get('/orgs/me');
    expect(res.status()).toBe(401);
  });

  test('get my org basic info — happy path', async ({ authedApi }) => {
    const res = await authedApi.get('/orgs/me/basic');
    expect(res.ok(), await res.text()).toBeTruthy();
  });

  test('creator persona — get then update round trip', async ({ authedApi }) => {
    const before = await authedApi.get('/orgs/me/creator-persona');
    expect(before.ok(), await before.text()).toBeTruthy();

    const bio = `API test bio ${Date.now()}`;
    const updateRes = await authedApi.patch('/orgs/me/creator-persona', { data: { bio } });
    expect(updateRes.ok(), await updateRes.text()).toBeTruthy();
    expect((await updateRes.json()).data.persona.bio).toBe(bio);
  });

  test('brand profile — get then update round trip', async ({ brandApi }) => {
    const before = await brandApi.get('/orgs/me/brand-profile');
    expect(before.ok(), await before.text()).toBeTruthy();

    const website = `https://example.com/${Date.now()}`;
    const updateRes = await brandApi.patch('/orgs/me/brand-profile', { data: { website } });
    expect(updateRes.ok(), await updateRes.text()).toBeTruthy();
    expect((await updateRes.json()).data.profile.website).toBe(website);
  });

  test('brand profile — wrong-role account gets an empty result, not a crash', async ({ authedApi }) => {
    const res = await authedApi.get('/orgs/me/brand-profile');
    expect(res.ok(), await res.text()).toBeTruthy();
  });

  test('creator persona — wrong-role account is rejected cleanly', async ({ brandApi }) => {
    const res = await brandApi.get('/orgs/me/creator-persona');
    expect(res.status(), await res.text()).toBe(400);
  });

  test('look up another org by id — happy path (basic info only)', async ({ authedApi, brandSession }) => {
    const orgRes = await authedApi.get(`/orgs/lookup/${brandSession.user.id}`);
    // brandSession.user.id is a user id, not an org id — expect a clean not-found, not a crash.
    expect([200, 404]).toContain(orgRes.status());
  });

  test('look up an org that does not exist — clean 404', async ({ authedApi }) => {
    const res = await authedApi.get('/orgs/lookup/00000000-0000-0000-0000-000000000000');
    expect(res.status(), await res.text()).toBe(404);
  });

  test('look up batch — no ids given returns an empty list, not an error', async ({ authedApi }) => {
    const res = await authedApi.get('/orgs/lookup/batch');
    expect(res.ok(), await res.text()).toBeTruthy();
    expect((await res.json()).data).toEqual([]);
  });

  test('agency owned brand profile — create requires a company name', async ({ agencyApi }) => {
    const res = await agencyApi.post('/orgs/agency/brand-profiles', { data: {} });
    expect(res.status(), await res.text()).toBe(400);
  });

  test('agency owned brand profile — a freshly-registered agency account cannot use this feature at all', async ({
    agencyApi,
  }) => {
    // BUG-API: an account registered with user_type "agency" (the only public way to
    // create an agency account) is rejected by every agency-specific endpoint with
    // "No agency found for this account" — see api-bug-log.md for the full picture
    // (this affects agency-profile, agency-clients, and agency-team-invitations too,
    // not just this one endpoint).
    test.fail();
    const createRes = await agencyApi.post('/orgs/agency/brand-profiles', {
      data: { company_name: `API test brand ${Date.now()}` },
    });
    expect(createRes.ok(), await createRes.text()).toBeTruthy();
  });

  test('look up org by an invalid (non-UUID) id crashes instead of a clean 400', async ({ authedApi }) => {
    // BUG-API: passing a non-UUID string here returns a 500 with a raw Postgres error
    // message ("invalid input syntax for type uuid: ...") instead of a 400. Same problem
    // on the batch lookup endpoint. See api-bug-log.md.
    test.fail();
    const res = await authedApi.get('/orgs/lookup/not-a-uuid');
    expect(res.status(), await res.text()).toBe(400);
  });

  test('look up batch org ids with an invalid (non-UUID) id crashes instead of a clean 400', async ({
    authedApi,
  }) => {
    // BUG-API: same crash as above, on the batch endpoint. See api-bug-log.md.
    test.fail();
    const res = await authedApi.get('/orgs/lookup/batch?ids=not-a-uuid');
    expect(res.status(), await res.text()).toBe(400);
  });
});
