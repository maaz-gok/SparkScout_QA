import { test, expect } from '../../src/fixtures/api';

test.describe('Onboarding API', () => {
  test('get progress — happy path', async ({ authedApi }) => {
    const res = await authedApi.get('/onboarding/progress');
    expect(res.ok(), await res.text()).toBeTruthy();
  });

  test('get progress — no auth is rejected', async ({ api }) => {
    const res = await api.get('/onboarding/progress');
    expect(res.status()).toBe(401);
  });

  test('update progress — happy path', async ({ authedApi }) => {
    const res = await authedApi.patch('/onboarding/progress', { data: { product_tour_dismissed: true } });
    expect(res.ok(), await res.text()).toBeTruthy();
  });

  test('update progress — completion percent over 100 is rejected', async ({ authedApi }) => {
    const res = await authedApi.patch('/onboarding/progress', { data: { profile_completion_percent: 999 } });
    expect(res.status(), await res.text()).toBe(400);
  });

  test('update progress — negative completion percent is rejected', async ({ authedApi }) => {
    const res = await authedApi.patch('/onboarding/progress', { data: { profile_completion_percent: -5 } });
    expect(res.status(), await res.text()).toBe(400);
  });
});
