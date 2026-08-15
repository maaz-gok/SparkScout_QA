import { test, expect } from '../../src/fixtures/api';

// All of these tests mutate the same account's credit balance, so they must not run
// concurrently with each other (a parallel deduct/refund from another test in this file
// would race and make the balance assertions flaky).
test.describe.configure({ mode: 'serial' });

test.describe('Credits API', () => {
  test('get current credits — happy path', async ({ authedApi }) => {
    const res = await authedApi.get('/credits/me');
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(typeof body.data.credits).toBe('number');
  });

  test('get current credits — no auth is rejected', async ({ api }) => {
    const res = await api.get('/credits/me');
    expect(res.status()).toBe(401);
  });

  test('deduct then refund — balance returns to where it started', async ({ authedApi }) => {
    const before = (await (await authedApi.get('/credits/me')).json()).data.credits;

    const deductRes = await authedApi.post('/credits/deduct', { data: { amount: 1 } });
    expect(deductRes.ok(), await deductRes.text()).toBeTruthy();
    const afterDeduct = (await deductRes.json()).data.credits;
    expect(afterDeduct).toBe(before - 1);

    const refundRes = await authedApi.post('/credits/refund', { data: { amount: 1 } });
    expect(refundRes.ok(), await refundRes.text()).toBeTruthy();
    const afterRefund = (await refundRes.json()).data.credits;
    expect(afterRefund).toBe(before);
  });

  test('deduct — no auth is rejected', async ({ api }) => {
    const res = await api.post('/credits/deduct', { data: { amount: 1 } });
    expect(res.status()).toBe(401);
  });

  test('deduct — missing amount is rejected', async ({ authedApi }) => {
    const res = await authedApi.post('/credits/deduct', { data: {} });
    expect(res.status(), await res.text()).toBe(400);
  });

  test('deduct — negative amount is rejected', async ({ authedApi }) => {
    const res = await authedApi.post('/credits/deduct', { data: { amount: -5 } });
    expect(res.status(), await res.text()).toBe(400);
  });

  test('deduct — zero amount is rejected or a no-op, never a crash', async ({ authedApi }) => {
    const res = await authedApi.post('/credits/deduct', { data: { amount: 0 } });
    expect([200, 201, 400]).toContain(res.status());
  });

  test('deduct — amount greater than balance is rejected, does not go negative', async ({ authedApi }) => {
    const res = await authedApi.post('/credits/deduct', { data: { amount: 999_999 } });
    expect(res.status(), await res.text()).toBe(400);

    const balanceRes = await authedApi.get('/credits/me');
    const balance = (await balanceRes.json()).data.credits;
    expect(balance).toBeGreaterThanOrEqual(0);
  });

  test('deduct — wrong type for amount (string instead of number)', async ({ authedApi }) => {
    const res = await authedApi.post('/credits/deduct', { data: { amount: 'one' } });
    expect(res.status(), await res.text()).toBe(400);
  });

  test('add credits directly — disabled, must go through Stripe', async ({ authedApi }) => {
    const res = await authedApi.post('/credits/add', { data: { amount: 1000 } });
    expect(res.status(), await res.text()).toBe(403);
  });

  test('two deduct requests fired at once — balance is consistent afterward, not double-charged incorrectly', async ({
    authedApi,
  }) => {
    const before = (await (await authedApi.get('/credits/me')).json()).data.credits;
    test.skip(before < 2, 'Not enough credits on the test account to safely run this check');

    const [res1, res2] = await Promise.all([
      authedApi.post('/credits/deduct', { data: { amount: 1 } }),
      authedApi.post('/credits/deduct', { data: { amount: 1 } }),
    ]);
    expect(res1.ok(), await res1.text()).toBeTruthy();
    expect(res2.ok(), await res2.text()).toBeTruthy();

    const after = (await (await authedApi.get('/credits/me')).json()).data.credits;
    expect(after).toBe(before - 2);

    // put the balance back
    await authedApi.post('/credits/refund', { data: { amount: 2 } });
  });

  test('deduct response — HTTP status code does not match the status field in the response body', async ({
    authedApi,
  }) => {
    // BUG-API: the HTTP status code on this response is 201 (Created), but the JSON
    // body's own "status" field says 200. Same mismatch happens on /credits/refund.
    // See api-bug-log.md.
    test.fail();
    const res = await authedApi.post('/credits/deduct', { data: { amount: 1 } });
    const body = await res.json();
    expect(body.status).toBe(res.status());
    await authedApi.post('/credits/refund', { data: { amount: 1 } });
  });
});
