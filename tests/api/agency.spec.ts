import { test, expect } from '../../src/fixtures/api';

// Covers AgencyClientsController, AgencyProfileController, and AgencyTeamInvitationsController.
//
// All three are blocked for our test agency accounts by BUG-API-008 (see api-bug-log.md):
// an account registered with user_type "agency" — the only public way to create one — is
// rejected by every agency-specific endpoint with "No agency found for this account."
// These tests document that block rather than exercising real agency workflows, since
// there's no reachable way via the public API to get past it.

test.describe('Agency API (blocked by BUG-API-008)', () => {
  test('agency-clients list — no auth is rejected (this part works normally)', async ({ api }) => {
    const res = await api.get('/agency-clients');
    expect(res.status()).toBe(401);
  });

  test('agency-clients list — a real, freshly-registered agency account is still rejected', async ({
    agencyApi,
  }) => {
    // BUG-API-008: see api-bug-log.md.
    test.fail();
    const res = await agencyApi.get('/agency-clients');
    expect(res.ok(), await res.text()).toBeTruthy();
  });

  test('agency-profile — a real, freshly-registered agency account is still rejected', async ({ agencyApi }) => {
    // BUG-API-008: see api-bug-log.md.
    test.fail();
    const res = await agencyApi.get('/agency-profile/me');
    expect(res.ok(), await res.text()).toBeTruthy();
  });

  test('agency-team-invitations — a real, freshly-registered agency account is still rejected', async ({
    agencyApi,
  }) => {
    // BUG-API-008: see api-bug-log.md.
    test.fail();
    const res = await agencyApi.get('/agency-team-invitations');
    expect(res.ok(), await res.text()).toBeTruthy();
  });

  test('agency-clients/request — a plain creator account (not an agency at all) is not blocked by role', async ({
    authedApi,
  }) => {
    // BUG-API: unlike every other agency-clients endpoint, POST /agency-clients/request
    // does not check that the caller is actually an agency. A plain creator account (never
    // marked as an agency in any way) sails straight through every validation rule here —
    // required fields, enum values, permission array shape — and only gets stopped by an
    // unrelated Stripe Connect requirement. If that creator account already had Stripe
    // Connect set up (a normal, unrelated feature every creator/brand can use), nothing
    // here would have stopped them from sending an agency partnership request. See
    // api-bug-log.md.
    test.fail();
    const res = await authedApi.post('/agency-clients/request', {
      data: {
        client_email: `maaz+agencyreqtest${Date.now()}@geeksofkolachi.com`,
        client_type: 'brand',
        commission_rate: 10,
        requested_permissions: ['manage_campaigns'],
      },
    });
    expect(res.status(), await res.text()).toBe(403);
  });

  test('agency-profile public view — works without auth (unaffected by the block)', async ({ api, agencySession }) => {
    const res = await api.get(`/agency-profile/public/${agencySession.user.id}`);
    // Public route — either a clean 404 (no profile) or 200, never a crash.
    expect([200, 404]).toContain(res.status());
  });
});
