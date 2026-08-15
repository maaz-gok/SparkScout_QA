import { test, expect } from '../../src/fixtures/api';

test.describe('Invoicing API', () => {
  test('list clients — happy path', async ({ authedApi }) => {
    const res = await authedApi.get('/invoicing/clients');
    expect(res.ok(), await res.text()).toBeTruthy();
  });

  test('list clients — no auth is rejected', async ({ api }) => {
    const res = await api.get('/invoicing/clients');
    expect(res.status()).toBe(401);
  });

  test('client — create, update, delete lifecycle', async ({ authedApi }) => {
    const createRes = await authedApi.post('/invoicing/clients', {
      data: { name: `API test client ${Date.now()}`, email: 'client@example.com' },
    });
    expect(createRes.ok(), await createRes.text()).toBeTruthy();
    const created = (await createRes.json()).data;

    const updateRes = await authedApi.put(`/invoicing/clients/${created.id}`, {
      data: { name: 'Renamed client', email: 'client@example.com' },
    });
    expect(updateRes.ok(), await updateRes.text()).toBeTruthy();

    const deleteRes = await authedApi.delete(`/invoicing/clients/${created.id}`);
    expect(deleteRes.ok(), await deleteRes.text()).toBeTruthy();
  });

  test('client — missing name is rejected', async ({ authedApi }) => {
    const res = await authedApi.post('/invoicing/clients', { data: { email: 'client@example.com' } });
    expect(res.status(), await res.text()).toBe(400);
  });

  test('client — invalid email format is rejected', async ({ authedApi }) => {
    const res = await authedApi.post('/invoicing/clients', { data: { name: 'Bad email client', email: 'not-an-email' } });
    expect(res.status(), await res.text()).toBe(400);
  });

  test('client — get/delete a client that does not exist is a clean 404', async ({ authedApi }) => {
    const res = await authedApi.delete('/invoicing/clients/00000000-0000-0000-0000-000000000000');
    expect(res.status()).toBe(404);
  });

  test('IDOR — cannot delete another user\'s client', async ({ authedApi, authedApi2 }) => {
    const createRes = await authedApi.post('/invoicing/clients', {
      data: { name: `IDOR client ${Date.now()}`, email: 'client@example.com' },
    });
    const created = (await createRes.json()).data;

    const res = await authedApi2.delete(`/invoicing/clients/${created.id}`);
    expect(res.status(), await res.text()).toBe(404);

    await authedApi.delete(`/invoicing/clients/${created.id}`);
  });

  test('invoice, template, settings — full lifecycle', async ({ authedApi }) => {
    const clientRes = await authedApi.post('/invoicing/clients', {
      data: { name: `Invoice test client ${Date.now()}`, email: 'client@example.com' },
    });
    const client = (await clientRes.json()).data;

    const invoiceRes = await authedApi.post('/invoicing/invoices', {
      data: {
        clientId: client.id,
        invoiceNumber: `INV-${Date.now()}`,
        items: [{ name: 'Consulting', quantity: 1, rate: 100, amount: 100 }],
        subtotal: 100,
        total: 100,
        invoiceDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      },
    });
    expect(invoiceRes.ok(), await invoiceRes.text()).toBeTruthy();
    const invoice = (await invoiceRes.json()).data;

    const getRes = await authedApi.get(`/invoicing/invoices/${invoice.id}`);
    expect(getRes.ok(), await getRes.text()).toBeTruthy();

    const pdfRes = await authedApi.get(`/invoicing/invoices/${invoice.id}/pdf`);
    expect(pdfRes.ok(), await pdfRes.text()).toBeTruthy();

    const templateRes = await authedApi.post('/invoicing/templates', {
      data: { name: `API test template ${Date.now()}` },
    });
    expect(templateRes.ok(), await templateRes.text()).toBeTruthy();
    const template = (await templateRes.json()).data;

    const settingsGetRes = await authedApi.get('/invoicing/settings');
    expect(settingsGetRes.ok(), await settingsGetRes.text()).toBeTruthy();

    const settingsPutRes = await authedApi.put('/invoicing/settings', {
      data: { businessName: 'API Test Business' },
    });
    expect(settingsPutRes.ok(), await settingsPutRes.text()).toBeTruthy();

    // cleanup
    await authedApi.delete(`/invoicing/templates/${template.id}`);
    await authedApi.delete(`/invoicing/invoices/${invoice.id}`);
    await authedApi.delete(`/invoicing/clients/${client.id}`);
  });

  test('mark an invoice paid that belongs to someone else crashes instead of a clean 404', async ({
    authedApi,
    authedApi2,
  }) => {
    // BUG-API: same "Cannot coerce the result to a single JSON object" Supabase crash
    // pattern seen elsewhere in this codebase (see BUG-API-003) — this time on
    // mark-paid, when the invoice id belongs to a different user. GET and DELETE on the
    // same resource correctly return 404 for this case; only mark-paid crashes.
    // See api-bug-log.md.
    const clientRes = await authedApi.post('/invoicing/clients', {
      data: { name: `Mark-paid target client ${Date.now()}`, email: 'client@example.com' },
    });
    const client = (await clientRes.json()).data;
    const invoiceRes = await authedApi.post('/invoicing/invoices', {
      data: {
        clientId: client.id,
        invoiceNumber: `INV-${Date.now()}`,
        items: [{ name: 'Consulting', quantity: 1, rate: 100, amount: 100 }],
        subtotal: 100,
        total: 100,
        invoiceDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      },
    });
    const invoice = (await invoiceRes.json()).data;

    const res = await authedApi2.post(`/invoicing/invoices/${invoice.id}/mark-paid`, { data: {} });
    expect(res.status(), await res.text()).toBe(404);

    await authedApi.delete(`/invoicing/invoices/${invoice.id}`);
    await authedApi.delete(`/invoicing/clients/${client.id}`);
  });

  test('response envelope — "status" field is a boolean instead of a status code number', async ({ authedApi }) => {
    // BUG-API: every other module in this API returns a numeric status in the response
    // body (e.g. 200, 201) matching the documented envelope shape. Every write action in
    // this module (create client, create invoice, create template, delete, settings save)
    // instead returns the literal boolean `true`. See api-bug-log.md.
    const res = await authedApi.post('/invoicing/clients', {
      data: { name: `Envelope check client ${Date.now()}`, email: 'client@example.com' },
    });
    const body = await res.json();
    expect(typeof body.status).toBe('number');
    await authedApi.delete(`/invoicing/clients/${body.data.id}`);
  });
});
