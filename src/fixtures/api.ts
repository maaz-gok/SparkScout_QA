import { test as base, expect, request as playwrightRequest, APIRequestContext } from '@playwright/test';
import { waitForEmail, extractOtpCode, extractTokenHash, GmailCredentials } from '../api/gmail';

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  user: Record<string, any>;
}

interface GmailHelper {
  /** Polls the inbox and returns the 6-digit code from the newest matching email. */
  waitForOtpCode(opts: { query: string; afterMs?: number }): Promise<string>;
  /** Polls the inbox and returns the token_hash from the newest matching email's confirmation link. */
  waitForTokenHash(opts: { query: string; afterMs?: number }): Promise<string>;
}

type ApiFixtures = {
  api: APIRequestContext;
  authSession: AuthSession;
  authedApi: APIRequestContext;
  authSession2: AuthSession;
  authedApi2: APIRequestContext;
  brandSession: AuthSession;
  brandApi: APIRequestContext;
  brandSession2: AuthSession;
  brandApi2: APIRequestContext;
  agencySession: AuthSession;
  agencyApi: APIRequestContext;
  agencySession2: AuthSession;
  agencyApi2: APIRequestContext;
  gmail: GmailHelper;
};

const API_BASE_URL = process.env.API_BASE_URL ?? 'https://api.sparkscout.com';
const TEST_EMAIL = process.env.TEST_EMAIL ?? '';
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? '';

function gmailCredsFromEnv(): GmailCredentials {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REFRESH_TOKEN in .env');
  }
  return { clientId, clientSecret, refreshToken };
}

async function loginSession(email: string, password: string, envVarName: string): Promise<AuthSession> {
  if (!email || !password) {
    throw new Error(`Missing ${envVarName} in .env`);
  }
  const loginApi = await playwrightRequest.newContext({ baseURL: API_BASE_URL });
  try {
    // Several worker processes may log in to the same account within the same
    // rate-limit window — back off and retry instead of failing the whole run.
    let lastRes;
    for (let attempt = 0; attempt < 5; attempt++) {
      lastRes = await loginApi.post('/auth/login', { data: { email, password } });
      if (lastRes.status() !== 429) break;
      await new Promise((resolve) => setTimeout(resolve, 5_000 * (attempt + 1)));
    }
    expect(
      lastRes!.ok(),
      `Login failed for ${envVarName}: ${lastRes!.status()} ${await lastRes!.text()}`,
    ).toBeTruthy();
    const body = await lastRes!.json();
    return body.data;
  } finally {
    await loginApi.dispose();
  }
}

async function contextFor(session: AuthSession): Promise<APIRequestContext> {
  return playwrightRequest.newContext({
    baseURL: API_BASE_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${session.access_token}` },
  });
}

// Sessions log in once per worker (not once per test) — logging in fresh for every test
// trips the backend's login rate limiter once more than a couple of tests run in parallel.
export const test = base.extend<ApiFixtures>({
  api: async ({}, use) => {
    const context = await playwrightRequest.newContext({ baseURL: API_BASE_URL });
    await use(context);
    await context.dispose();
  },

  authSession: [
    async ({}, use) => {
      await use(await loginSession(TEST_EMAIL, TEST_PASSWORD, 'TEST_EMAIL/TEST_PASSWORD'));
    },
    { scope: 'worker' },
  ],

  authedApi: async ({ authSession }, use) => {
    const context = await contextFor(authSession);
    await use(context);
    await context.dispose();
  },

  // Second creator account — for cross-user / IDOR tests against authedApi's resources.
  authSession2: [
    async ({}, use) => {
      await use(
        await loginSession(
          process.env.TEST_EMAIL_2 ?? '',
          process.env.TEST_PASSWORD_2 ?? '',
          'TEST_EMAIL_2/TEST_PASSWORD_2',
        ),
      );
    },
    { scope: 'worker' },
  ],

  authedApi2: async ({ authSession2 }, use) => {
    const context = await contextFor(authSession2);
    await use(context);
    await context.dispose();
  },

  // Brand-role accounts — for campaigns/applications/products endpoints that are brand-only.
  brandSession: [
    async ({}, use) => {
      await use(
        await loginSession(
          process.env.TEST_BRAND_EMAIL ?? '',
          process.env.TEST_BRAND_PASSWORD ?? '',
          'TEST_BRAND_EMAIL/TEST_BRAND_PASSWORD',
        ),
      );
    },
    { scope: 'worker' },
  ],

  brandApi: async ({ brandSession }, use) => {
    const context = await contextFor(brandSession);
    await use(context);
    await context.dispose();
  },

  brandSession2: [
    async ({}, use) => {
      await use(
        await loginSession(
          process.env.TEST_BRAND_EMAIL_2 ?? '',
          process.env.TEST_BRAND_PASSWORD_2 ?? '',
          'TEST_BRAND_EMAIL_2/TEST_BRAND_PASSWORD_2',
        ),
      );
    },
    { scope: 'worker' },
  ],

  brandApi2: async ({ brandSession2 }, use) => {
    const context = await contextFor(brandSession2);
    await use(context);
    await context.dispose();
  },

  // Agency-role accounts — for agency-clients/agency-profile/agency-team-invitations endpoints.
  agencySession: [
    async ({}, use) => {
      await use(
        await loginSession(
          process.env.TEST_AGENCY_EMAIL ?? '',
          process.env.TEST_AGENCY_PASSWORD ?? '',
          'TEST_AGENCY_EMAIL/TEST_AGENCY_PASSWORD',
        ),
      );
    },
    { scope: 'worker' },
  ],

  agencyApi: async ({ agencySession }, use) => {
    const context = await contextFor(agencySession);
    await use(context);
    await context.dispose();
  },

  agencySession2: [
    async ({}, use) => {
      await use(
        await loginSession(
          process.env.TEST_AGENCY_EMAIL_2 ?? '',
          process.env.TEST_AGENCY_PASSWORD_2 ?? '',
          'TEST_AGENCY_EMAIL_2/TEST_AGENCY_PASSWORD_2',
        ),
      );
    },
    { scope: 'worker' },
  ],

  agencyApi2: async ({ agencySession2 }, use) => {
    const context = await contextFor(agencySession2);
    await use(context);
    await context.dispose();
  },

  gmail: async ({}, use) => {
    const creds = gmailCredsFromEnv();
    await use({
      waitForOtpCode: async ({ query, afterMs }) => {
        const message = await waitForEmail(creds, { query, afterMs });
        return extractOtpCode(message.bodyText);
      },
      waitForTokenHash: async ({ query, afterMs }) => {
        const message = await waitForEmail(creds, { query, afterMs });
        return extractTokenHash(message.bodyText);
      },
    });
  },
});

export { expect };
