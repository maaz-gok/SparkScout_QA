import { test, expect } from '../../src/fixtures/api';

test.describe('Notifications API', () => {
  test('list notifications — happy path', async ({ authedApi }) => {
    const res = await authedApi.get('/notifications');
    expect(res.ok(), await res.text()).toBeTruthy();
  });

  test('list notifications — no auth is rejected', async ({ api }) => {
    const res = await api.get('/notifications');
    expect(res.status()).toBe(401);
  });

  test('unread count — no auth is rejected', async ({ api }) => {
    const res = await api.get('/notifications/unread-count');
    expect(res.status()).toBe(401);
  });

  test('unread count — happy path returns a number', async ({ authedApi }) => {
    const res = await authedApi.get('/notifications/unread-count');
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(typeof body.unreadCount).toBe('number');
  });

  test('mark all as read — happy path', async ({ authedApi }) => {
    const res = await authedApi.patch('/notifications/mark-all-read', { data: {} });
    expect(res.ok(), await res.text()).toBeTruthy();
  });

  test('mark a notification that does not exist as read — does not crash', async ({ authedApi }) => {
    const res = await authedApi.patch('/notifications/00000000-0000-0000-0000-000000000000/read', { data: {} });
    expect(res.ok(), await res.text()).toBeTruthy();
  });

  test('delete — no auth is rejected', async ({ api }) => {
    const res = await api.delete('/notifications/00000000-0000-0000-0000-000000000000');
    expect(res.status()).toBe(401);
  });

  test('delete a notification that does not exist — reports it honestly, does not crash', async ({ authedApi }) => {
    const res = await authedApi.delete('/notifications/00000000-0000-0000-0000-000000000000');
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(body.deleted).toBe(false);
  });

  test('IDOR — another user cannot delete my real notification', async ({ authedApi, authedApi2 }) => {
    const before = await (await authedApi.get('/notifications')).json();
    test.skip(before.data.length === 0, 'Test account has no notifications to target for this check');
    const targetId = before.data[0].id;

    const res = await authedApi2.delete(`/notifications/${targetId}`);
    expect(res.ok(), await res.text()).toBeTruthy();
    expect(res.json().then((b) => b.deleted)).resolves.toBe(false);

    const after = await (await authedApi.get('/notifications')).json();
    expect(after.data.some((n: any) => n.id === targetId), 'notification should still exist').toBeTruthy();
  });
});
