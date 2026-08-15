import { test, expect } from '../../src/fixtures/api';

// Deliverables only exist as part of a real deal. We reuse the active deal created by
// tests/api/applications-and-deals.spec.ts (brand2 <-> creator2) rather than building a
// fresh one, since deliverable records are auto-created from the campaign/offer and
// there's no direct "create a deliverable" endpoint.

async function getActiveDealDeliverable(api: any): Promise<{ dealId: string; deliverableId: string } | null> {
  const dealsRes = await api.get('/deals');
  const deals = (await dealsRes.json()).data;
  const active = deals.find((d: any) => d.status === 'active' && d.deliverables_count > 0);
  if (!active) return null;
  const dealRes = await api.get(`/deals/${active.id}`);
  const deal = (await dealRes.json()).data;
  return { dealId: active.id, deliverableId: deal.deliverables[0].id };
}

test.describe('Deal Reviews API', () => {
  test('review context — no auth is rejected', async ({ api }) => {
    const res = await api.get('/deal-reviews/deals/00000000-0000-0000-0000-000000000000/context');
    expect(res.status()).toBe(401);
  });

  test('review context — happy path for a real deal', async ({ authedApi2 }) => {
    const target = await getActiveDealDeliverable(authedApi2);
    test.skip(!target, 'No active deal with deliverables on creator2 to test against');
    const res = await authedApi2.get(`/deal-reviews/deals/${target!.dealId}/context`);
    expect(res.ok(), await res.text()).toBeTruthy();
  });

  test('review context — an unrelated user cannot see review eligibility for someone else\'s deal', async ({
    authedApi,
    authedApi2,
  }) => {
    const target = await getActiveDealDeliverable(authedApi2);
    test.skip(!target, 'No active deal with deliverables on creator2 to test against');
    const res = await authedApi.get(`/deal-reviews/deals/${target!.dealId}/context`);
    expect([403, 404]).toContain(res.status());
  });

  test('submit review — missing fields are rejected', async ({ authedApi2 }) => {
    const res = await authedApi2.post('/deal-reviews', { data: {} });
    expect(res.status(), await res.text()).toBe(400);
  });
});

test.describe('Deliverables API', () => {
  test('get deliverable — no auth is rejected', async ({ api }) => {
    const res = await api.get('/deliverables/00000000-0000-0000-0000-000000000000');
    expect(res.status()).toBe(401);
  });

  test('IDOR — a completely unrelated account can view someone else\'s private deliverable', async ({
    authedApi,
    authedApi2,
  }) => {
    // BUG-API: GET /deliverables/:id has no ownership check at all. creator1 here has no
    // relationship whatsoever to creator2/brand2's deal, yet gets the full deliverable
    // back — submission versions, media, comments. See api-bug-log.md.
    test.fail();
    const target = await getActiveDealDeliverable(authedApi2);
    test.skip(!target, 'No active deal with deliverables on creator2 to test against');

    const res = await authedApi.get(`/deliverables/${target!.deliverableId}`);
    expect([403, 404]).toContain(res.status());
  });

  test('IDOR — a completely unrelated account can write a comment into someone else\'s private deliverable, falsely attributed to the real brand', async ({
    authedApi,
    authedApi2,
  }) => {
    // BUG-API (critical): creator1 has no relationship to this deal at all, yet can post a
    // comment directly into creator2/brand2's private deliverable thread. Worse: the
    // resulting comment is shown to the real creator with authorName "Brand" — falsely
    // attributed to the legitimate counterparty, not the actual (unrelated) poster. This
    // both breaks access control and enables impersonation inside a real deal's
    // conversation. See api-bug-log.md.
    test.fail();
    const target = await getActiveDealDeliverable(authedApi2);
    test.skip(!target, 'No active deal with deliverables on creator2 to test against');

    const intruderComment = `intruder comment ${Date.now()}`;
    const postRes = await authedApi.post(`/deliverables/${target!.deliverableId}/comments`, {
      data: { content: intruderComment },
    });
    expect([403, 404]).toContain(postRes.status());

    if (postRes.ok()) {
      const checkRes = await authedApi2.get(`/deliverables/${target!.deliverableId}`);
      const body = await checkRes.json();
      const leaked = body.data.comments.find((c: any) => c.content === intruderComment);
      expect(leaked, 'the unauthorized comment should not be visible to the real deal parties').toBeUndefined();
    }
  });

  test('get deliverable version/comment counts — no auth is rejected', async ({ api }) => {
    const res = await api.get('/deliverables/00000000-0000-0000-0000-000000000000/version-count');
    expect(res.status()).toBe(401);
  });

  test('approve a deliverable that does not exist — a clean error, not a crash', async ({ authedApi2 }) => {
    const res = await authedApi2.post('/deliverables/00000000-0000-0000-0000-000000000000/approve', { data: {} });
    expect([400, 403, 404]).toContain(res.status());
  });

  test('IDOR (critical) — a completely unrelated account can mark someone else\'s deliverable as paid and strip its watermark', async ({
    authedApi,
    authedApi2,
  }) => {
    // BUG-API (critical): creator1 has no relationship to this deal at all, yet
    // POST /deliverables/:id/mark-paid succeeds for them — flipping payment_paid=true
    // and stripping the watermark from creator2's real, unrelated deliverable.
    // See security-bug-log.md Bug 1.
    test.fail();
    const target = await getActiveDealDeliverable(authedApi2);
    test.skip(!target, 'No active deal with deliverables on creator2 to test against');

    const res = await authedApi.post(`/deliverables/${target!.deliverableId}/mark-paid`, { data: {} });
    expect([403, 404]).toContain(res.status());
  });

  test('IDOR (critical) — a completely unrelated account can approve someone else\'s deliverable version', async ({
    authedApi,
    authedApi2,
  }) => {
    // BUG-API (critical): same missing ownership check as mark-paid, on the approve
    // route. An unrelated account can flip a stranger's deal into "approved" status,
    // which can cascade into deal-completion / escrow-release logic server-side.
    // See security-bug-log.md Bug 1.
    test.fail();
    const target = await getActiveDealDeliverable(authedApi2);
    test.skip(!target, 'No active deal with deliverables on creator2 to test against');

    const res = await authedApi.post(`/deliverables/${target!.deliverableId}/approve`, { data: {} });
    expect([403, 404]).toContain(res.status());
  });

  test('IDOR — a completely unrelated account can generate a deliverable upload URL for a deal they are not part of', async ({
    authedApi,
    authedApi2,
  }) => {
    // BUG-API: POST /deliverables/upload-url trusts the client-supplied dealId with no
    // membership check, handing back a presigned S3 PUT URL scoped to that deal's
    // deliverable folder. Non-destructive to verify (we only request the URL, we don't
    // actually PUT a file to S3), but it's a live credential to write into another
    // party's deal. See security-bug-log.md Bug 1.
    test.fail();
    const target = await getActiveDealDeliverable(authedApi2);
    test.skip(!target, 'No active deal with deliverables on creator2 to test against');

    const res = await authedApi.post('/deliverables/upload-url', {
      data: {
        filename: 'intruder-file.png',
        contentType: 'image/png',
        dealId: target!.dealId,
      },
    });
    expect([403, 404]).toContain(res.status());
  });
});
