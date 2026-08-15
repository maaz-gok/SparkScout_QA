import { test, expect } from '../../src/fixtures/api';

// NOTE: Actually creating an off-platform deal requires the creator to have Stripe
// Connect onboarded first ("Connect your Stripe account in Settings → Billing before
// creating an off-platform deal"). Stripe is out of scope for this pass (see
// API_ENDPOINTS.md "What to skip"), so full create → get → update lifecycle coverage
// isn't possible here. We cover what doesn't require a Stripe-connected account:
// listing, not-found, auth boundary, and request validation.

test.describe('Off-Platform Deals API', () => {
  test('list off-platform deals — happy path', async ({ authedApi }) => {
    const res = await authedApi.get('/off-platform-deals');
    expect(res.ok(), await res.text()).toBeTruthy();
  });

  test('list off-platform deals — no auth is rejected', async ({ api }) => {
    const res = await api.get('/off-platform-deals');
    expect(res.status()).toBe(401);
  });

  test('get off-platform deal — random UUID that does not exist', async ({ authedApi }) => {
    const res = await authedApi.get('/off-platform-deals/00000000-0000-0000-0000-000000000000');
    expect(res.status()).toBe(404);
  });

  test('get off-platform deal — invalid UUID in path', async ({ authedApi }) => {
    const res = await authedApi.get('/off-platform-deals/not-a-uuid');
    expect([400, 404]).toContain(res.status());
  });

  test('create — no auth is rejected', async ({ api }) => {
    const res = await api.post('/off-platform-deals', { data: {} });
    expect(res.status()).toBe(401);
  });

  test('create — empty body reports a validation error, not a crash', async ({ authedApi }) => {
    const res = await authedApi.post('/off-platform-deals', { data: {} });
    expect(res.status(), await res.text()).toBe(400);
  });

  test('create — deliverables must be a non-empty array', async ({ authedApi }) => {
    const res = await authedApi.post('/off-platform-deals', {
      data: {
        brandName: 'Test Brand',
        brandContactEmail: 'brand@example.com',
        projectTitle: 'Test Deal',
        dealValue: 500,
        deliverables: [],
      },
    });
    expect(res.status(), await res.text()).toBe(400);
    const body = await res.json();
    expect(body.message.toLowerCase()).toContain('deliverable');
  });

  test('create — invalid email format for brand contact is rejected', async ({ authedApi }) => {
    const res = await authedApi.post('/off-platform-deals', {
      data: {
        brandName: 'Test Brand',
        brandContactEmail: 'not-an-email',
        projectTitle: 'Test Deal',
        dealValue: 500,
        deliverables: [{ name: 'One post' }],
      },
    });
    expect(res.status(), await res.text()).toBe(400);
  });

  test('create — negative deal value is rejected', async ({ authedApi }) => {
    const res = await authedApi.post('/off-platform-deals', {
      data: {
        brandName: 'Test Brand',
        brandContactEmail: 'brand@example.com',
        projectTitle: 'Test Deal',
        dealValue: -100,
        deliverables: [{ name: 'One post' }],
      },
    });
    expect(res.status(), await res.text()).toBe(400);
  });

  test('create — a fully valid request is blocked by the Stripe Connect requirement, not a crash', async ({
    authedApi,
  }) => {
    const res = await authedApi.post('/off-platform-deals', {
      data: {
        brandName: 'Test Brand',
        brandContactEmail: 'brand@example.com',
        projectTitle: 'Test Deal',
        dealValue: 500,
        deliverables: [{ name: 'One post' }],
      },
    });
    // Documents the current real-world behavior for a valid payload on an account
    // with no Stripe Connect setup — not itself treated as a bug.
    expect(res.status(), await res.text()).toBe(400);
    const body = await res.json();
    expect(body.message.toLowerCase()).toContain('stripe');
  });

  test('wrong method — DELETE on collection is not supported', async ({ authedApi }) => {
    const res = await authedApi.delete('/off-platform-deals');
    expect([404, 405]).toContain(res.status());
  });
});
