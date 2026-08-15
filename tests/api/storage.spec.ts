import { test, expect } from '../../src/fixtures/api';

test.describe('Storage API', () => {
  test('upload-url — no auth is rejected', async ({ api }) => {
    const res = await api.post('/storage/upload-url', { data: {} });
    expect(res.status()).toBe(401);
  });

  test('upload-url — missing bucket is rejected', async ({ authedApi }) => {
    const res = await authedApi.post('/storage/upload-url', { data: {} });
    expect(res.status(), await res.text()).toBe(400);
  });

  test('upload-url — an arbitrary/unauthorized bucket name is rejected, not accepted', async ({ authedApi }) => {
    const res = await authedApi.post('/storage/upload-url', {
      data: { bucket: 'some-random-bucket-i-made-up', path: 'x/y.jpg', contentType: 'image/jpeg' },
    });
    expect(res.status(), await res.text()).toBe(403);
  });

  test('content-library-upload-url — happy path returns a presigned URL scoped to the caller', async ({
    authedApi,
    authSession,
  }) => {
    const res = await authedApi.post('/storage/content-library-upload-url', {
      data: { filename: `api-test-${Date.now()}.jpg`, contentType: 'image/jpeg', fileSize: 1024 },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(body.data.upload_url).toContain(authSession.user.id);
  });

  test('content-library-upload-url — missing fileSize is rejected', async ({ authedApi }) => {
    const res = await authedApi.post('/storage/content-library-upload-url', {
      data: { filename: 'test.jpg', contentType: 'image/jpeg' },
    });
    expect(res.status(), await res.text()).toBe(400);
  });

  test('spark-deck-upload-url — happy path', async ({ authedApi }) => {
    const res = await authedApi.post('/storage/spark-deck-upload-url', {
      data: { filename: `api-test-${Date.now()}.jpg`, contentType: 'image/jpeg', fileSize: 1024 },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
  });

  test('delete file — no auth is rejected', async ({ api }) => {
    const res = await api.delete('/storage/file', { data: { bucket: 'spark-scout', path: 'x/y.jpg' } });
    expect(res.status()).toBe(401);
  });

  test('IDOR — cannot delete a file that belongs to another user', async ({ authedApi, authedApi2, authSession }) => {
    const uploadRes = await authedApi.post('/storage/content-library-upload-url', {
      data: { filename: `idor-test-${Date.now()}.jpg`, contentType: 'image/jpeg', fileSize: 1024 },
    });
    const uploadUrl: string = (await uploadRes.json()).data.upload_url;
    const path = new URL(uploadUrl).pathname.replace(/^\//, '');

    const res = await authedApi2.delete('/storage/file', { data: { bucket: 'spark-scout', path } });
    expect(res.status(), await res.text()).toBe(403);
  });
});
