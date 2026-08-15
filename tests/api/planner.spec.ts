import { test, expect } from '../../src/fixtures/api';

// Planner endpoints are all scoped by an `org_id` query parameter — even the mutating
// ones (PATCH/DELETE), where it's easy to assume the id in the URL is enough.

async function getOrgId(api: any): Promise<string> {
  const res = await api.get('/orgs/me');
  return (await res.json()).data.id;
}

test.describe('Planner API', () => {
  test('calendar stats — happy path', async ({ authedApi }) => {
    const res = await authedApi.get('/planner/calendar-stats');
    expect(res.ok(), await res.text()).toBeTruthy();
  });

  test('calendar stats — no auth is rejected', async ({ api }) => {
    const res = await api.get('/planner/calendar-stats');
    expect(res.status()).toBe(401);
  });

  test('calendar events — missing org_id is a clean validation error', async ({ authedApi }) => {
    const res = await authedApi.get('/planner/calendar-events');
    expect(res.status(), await res.text()).toBe(400);
  });

  test('calendar events — create, update, delete lifecycle', async ({ authedApi }) => {
    const orgId = await getOrgId(authedApi);

    const createRes = await authedApi.post('/planner/calendar-events', {
      data: { org_id: orgId, title: 'API test event', date: new Date(Date.now() + 86_400_000).toISOString(), type: 'organic_post' },
    });
    expect(createRes.ok(), await createRes.text()).toBeTruthy();
    const created = (await createRes.json()).data;
    const rawId = created.id.replace(/^planner-/, '');

    const listRes = await authedApi.get(`/planner/calendar-events?org_id=${orgId}`);
    expect(listRes.ok(), await listRes.text()).toBeTruthy();

    const updateRes = await authedApi.patch(`/planner/calendar-events/${rawId}?org_id=${orgId}`, {
      data: { title: 'Renamed event' },
    });
    expect(updateRes.ok(), await updateRes.text()).toBeTruthy();

    const deleteRes = await authedApi.delete(`/planner/calendar-events/${rawId}?org_id=${orgId}`);
    expect(deleteRes.ok(), await deleteRes.text()).toBeTruthy();
  });

  test('create event — missing required fields are rejected', async ({ authedApi }) => {
    const orgId = await getOrgId(authedApi);
    const res = await authedApi.post('/planner/calendar-events', { data: { org_id: orgId } });
    expect(res.status(), await res.text()).toBe(400);
  });

  test('create event — invalid type enum value is rejected', async ({ authedApi }) => {
    const orgId = await getOrgId(authedApi);
    const res = await authedApi.post('/planner/calendar-events', {
      data: { org_id: orgId, title: 'Bad type event', date: new Date().toISOString(), type: 'not_a_real_type' },
    });
    expect(res.status(), await res.text()).toBe(400);
  });

  test('IDOR — cannot list another org\'s calendar', async ({ authedApi, authedApi2 }) => {
    const otherOrgId = await getOrgId(authedApi2);
    const res = await authedApi.get(`/planner/calendar-events?org_id=${otherOrgId}`);
    expect(res.status(), await res.text()).toBe(403);
  });

  test('IDOR — cannot update or delete another org\'s event', async ({ authedApi, authedApi2 }) => {
    const orgId = await getOrgId(authedApi);
    const createRes = await authedApi.post('/planner/calendar-events', {
      data: { org_id: orgId, title: 'IDOR target event', date: new Date(Date.now() + 86_400_000).toISOString(), type: 'organic_post' },
    });
    const created = (await createRes.json()).data;
    const rawId = created.id.replace(/^planner-/, '');

    const otherOrgId = await getOrgId(authedApi2);
    const updateRes = await authedApi2.patch(`/planner/calendar-events/${rawId}?org_id=${otherOrgId}`, {
      data: { title: 'hijacked' },
    });
    expect(updateRes.status(), await updateRes.text()).toBe(404);

    const deleteRes = await authedApi2.delete(`/planner/calendar-events/${rawId}?org_id=${otherOrgId}`);
    expect(deleteRes.status(), await deleteRes.text()).toBe(404);

    await authedApi.delete(`/planner/calendar-events/${rawId}?org_id=${orgId}`);
  });
});
