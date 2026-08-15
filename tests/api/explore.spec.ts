import { test, expect } from '../../src/fixtures/api';

test.describe('Explore API', () => {
  for (const path of [
    '/explore/campaigns',
    '/explore/applied-campaign-ids',
    '/explore/agencies',
    '/explore/brands',
    '/explore/saved-campaign-ids',
    '/explore/saved-deck-ids',
    '/explore/recommended-creators',
    '/explore/agency/creators',
    '/explore/agency/campaigns',
  ]) {
    test(`${path} — happy path`, async ({ authedApi }) => {
      const res = await authedApi.get(path);
      expect(res.ok(), await res.text()).toBeTruthy();
    });

    test(`${path} — no auth is rejected`, async ({ api }) => {
      const res = await api.get(path);
      expect(res.status()).toBe(401);
    });
  }

  test('featured campaigns — completely broken, crashes on a missing database column', async ({ authedApi }) => {
    // BUG-API: this endpoint always crashes with a 500, referencing a database column
    // ("campaigns.campaign_end_date") that doesn't exist on the campaigns table. This is
    // not data-dependent or account-specific — it fails the same way for every account,
    // every time. The Explore page's featured-campaigns carousel is fully broken.
    // See api-bug-log.md.
    const res = await authedApi.get('/explore/featured');
    expect(res.ok(), await res.text()).toBeTruthy();
  });

  test('get single brand — brand that does not exist is a clean 404', async ({ authedApi }) => {
    const res = await authedApi.get('/explore/brands/00000000-0000-0000-0000-000000000000');
    expect(res.status()).toBe(404);
  });

  test('follow-toggle — following then unfollowing a real brand flips state each time', async ({
    authedApi,
    brandApi,
  }) => {
    const brandOrgId = (await (await brandApi.get('/orgs/me')).json()).data.id;

    const res1 = await authedApi.post(`/explore/brands/${brandOrgId}/follow-toggle`, { data: {} });
    expect(res1.ok(), await res1.text()).toBeTruthy();
    const isFollowingAfterFirst = (await res1.json()).data.isFollowing;

    const res2 = await authedApi.post(`/explore/brands/${brandOrgId}/follow-toggle`, { data: {} });
    expect(res2.ok(), await res2.text()).toBeTruthy();
    const isFollowingAfterSecond = (await res2.json()).data.isFollowing;

    expect(isFollowingAfterSecond).toBe(!isFollowingAfterFirst);
  });

  test('follow-toggle — a brand id that does not exist crashes instead of a clean 404', async ({ authedApi }) => {
    // BUG-API: crashes with a raw foreign-key constraint violation
    // ("brand_follows_brand_org_id_fkey") instead of a 404. See api-bug-log.md.
    const res = await authedApi.post('/explore/brands/00000000-0000-0000-0000-000000000000/follow-toggle', {
      data: {},
    });
    expect(res.status(), await res.text()).toBe(404);
  });

  test('saved-campaigns toggle — missing campaign id crashes instead of a clean 400', async ({ authedApi }) => {
    // BUG-API: crashes with a raw not-null constraint violation on the database column
    // instead of a validation error. Same pattern as BUG-API-014. See api-bug-log.md.
    const res = await authedApi.post('/explore/saved-campaigns/toggle', { data: {} });
    expect(res.status(), await res.text()).toBe(400);
  });

  test('saved-decks toggle — missing deck id crashes instead of a clean 400', async ({ authedApi }) => {
    // BUG-API: same pattern as the saved-campaigns case above. See api-bug-log.md.
    const res = await authedApi.post('/explore/saved-decks/toggle', { data: {} });
    expect(res.status(), await res.text()).toBe(400);
  });

  test('apply via /explore/applications — missing campaign id crashes instead of a clean 400', async ({
    authedApi,
  }) => {
    // BUG-API: crashes with "invalid input syntax for type uuid: \"undefined\"" — the
    // literal string "undefined" reaching a database query, meaning a missing field went
    // completely unvalidated before being used. See api-bug-log.md.
    const res = await authedApi.post('/explore/applications', { data: {} });
    expect(res.status(), await res.text()).toBe(400);
  });
});
