import { test, expect } from '../../src/fixtures/api';

test.describe('Auth API', () => {
  test('login returns a usable session', async ({ authedApi }) => {
    const res = await authedApi.get('/auth/me');
    expect(res.ok(), await res.text()).toBeTruthy();

    const body = await res.json();
    expect(body.data.email).toBeTruthy();
  });

  test('register + verify email via confirmation link fetched from Gmail', async ({ api, gmail }) => {
    // Relies on Gmail "+" aliasing: mail sent to base+anything@domain lands in the
    // same inbox GMAIL_REFRESH_TOKEN has access to, giving each run a fresh address.
    const inboxUser = TEST_EMAIL_LOCAL_PART();
    const email = `${inboxUser}+apitest${Date.now()}@${TEST_EMAIL_DOMAIN()}`;
    const requestedAt = Date.now();

    const registerRes = await api.post('/auth/register', {
      data: { email, password: 'ApiRegisterTest_2026!', first_name: 'API', last_name: 'Test' },
    });
    expect(registerRes.ok(), await registerRes.text()).toBeTruthy();

    const tokenHash = await gmail.waitForTokenHash({
      query: `to:${email} newer_than:1d`,
      afterMs: requestedAt,
    });

    const verifyRes = await api.post('/auth/verify-email', {
      data: { token_hash: tokenHash },
    });
    expect(verifyRes.ok(), await verifyRes.text()).toBeTruthy();

    const body = await verifyRes.json();
    expect(body.data.access_token).toBeTruthy();
  });

  test('change-email OTP round trip', async ({ authedApi, gmail }) => {
    // Mutates the logged-in test account's email — only runs when explicitly targeted.
    const newEmail = process.env.TEST_EMAIL_CHANGE_TARGET;
    test.skip(!newEmail, 'Set TEST_EMAIL_CHANGE_TARGET in .env to run this test');

    const requestedAt = Date.now();
    const requestRes = await authedApi.patch('/auth/change-email', {
      data: { email: newEmail },
    });
    expect(requestRes.ok(), await requestRes.text()).toBeTruthy();

    const code = await gmail.waitForOtpCode({
      query: `to:${newEmail} newer_than:1d`,
      afterMs: requestedAt,
    });

    const verifyRes = await authedApi.post('/auth/change-email/verify', {
      data: { code },
    });
    expect(verifyRes.ok(), await verifyRes.text()).toBeTruthy();
  });
});

function TEST_EMAIL_LOCAL_PART(): string {
  const email = process.env.TEST_EMAIL ?? '';
  return email.split('@')[0].split('+')[0];
}

function TEST_EMAIL_DOMAIN(): string {
  const email = process.env.TEST_EMAIL ?? '';
  return email.split('@')[1] ?? '';
}
