import { test, expect } from '../../src/fixtures/api';

test.describe('Recommendations API', () => {
  test('recommended campaigns — happy path', async ({ authedApi }) => {
    const res = await authedApi.get('/recommendations/campaigns');
    expect(res.ok(), await res.text()).toBeTruthy();
  });

  test('recommended campaigns — no auth is rejected', async ({ api }) => {
    const res = await api.get('/recommendations/campaigns');
    expect(res.status()).toBe(401);
  });

  test('signals and recommended brands — happy path', async ({ authedApi }) => {
    const signalsRes = await authedApi.get('/recommendations/signals');
    expect(signalsRes.ok(), await signalsRes.text()).toBeTruthy();

    const brandsRes = await authedApi.get('/recommendations/brands');
    expect(brandsRes.ok(), await brandsRes.text()).toBeTruthy();
  });

  test('campaign match — a campaign that does not exist returns a clean zero-match result, not a crash', async ({
    authedApi,
  }) => {
    const res = await authedApi.get('/recommendations/campaigns/00000000-0000-0000-0000-000000000000/match');
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(body.data.matchScore).toBe(0);
  });

  test('track-search — missing query crashes instead of a clean 400', async ({ authedApi }) => {
    // BUG-API: part of the same pattern as BUG-API-017. See api-bug-log.md.
    const res = await authedApi.post('/recommendations/track-search', { data: {} });
    expect(res.status(), await res.text()).toBe(400);
  });

  test('track-interaction — missing campaign id crashes instead of a clean 400', async ({ authedApi }) => {
    // BUG-API: part of the same pattern as BUG-API-017. See api-bug-log.md.
    const res = await authedApi.post('/recommendations/track-interaction', { data: {} });
    expect(res.status(), await res.text()).toBe(400);
  });
});

test.describe('AI Tools API', () => {
  test('generations, models, queue-status, error-logs, error-stats — happy path', async ({ authedApi }) => {
    for (const path of [
      '/ai-tools/generations',
      '/ai-tools/models',
      '/ai-tools/queue-status',
      '/ai-tools/error-logs',
      '/ai-tools/error-stats',
    ]) {
      const res = await authedApi.get(path);
      expect(res.ok(), `${path}: ${await res.text()}`).toBeTruthy();
    }
  });

  test('generations — no auth is rejected', async ({ api }) => {
    const res = await api.get('/ai-tools/generations');
    expect(res.status()).toBe(401);
  });

  // Actual generation calls a real, billed AI provider and spends real credits — only
  // validation is exercised here, never a real successful generation.
  test('generate-image — missing prompt is rejected before any credits are spent', async ({ authedApi }) => {
    const res = await authedApi.post('/ai-tools/generate-image', { data: {} });
    expect(res.status(), await res.text()).toBe(400);
  });

  test('generate-video — missing prompt is rejected before any credits are spent', async ({ authedApi }) => {
    const res = await authedApi.post('/ai-tools/generate-video', { data: {} });
    expect(res.status(), await res.text()).toBe(400);
  });

  test('update generation — a generation that does not exist reports failure but with a 200 OK status', async ({
    authedApi,
  }) => {
    // BUG-API: same "Cannot coerce the result to a single JSON object" crash pattern as
    // BUG-API-003, but worse here — the HTTP status is 200 (normally "it worked") while
    // the body says `"success": false` with the raw database error. See api-bug-log.md.
    const res = await authedApi.patch('/ai-tools/generations/00000000-0000-0000-0000-000000000000', {
      data: { status: 'completed' },
    });
    expect([403, 404]).toContain(res.status());
  });
});
