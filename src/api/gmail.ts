export interface GmailCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export interface GmailMessage {
  id: string;
  internalDate: string;
  subject: string;
  from: string;
  bodyText: string;
}

export interface WaitForEmailOptions {
  /** Gmail search query, e.g. `to:someone@example.com newer_than:1d` */
  query: string;
  /** Only accept messages received at/after this timestamp (ms). Defaults to now. */
  afterMs?: number;
  timeoutMs?: number;
  pollIntervalMs?: number;
}

async function getAccessToken(creds: GmailCredentials): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: creds.refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) {
    throw new Error(`Gmail token refresh failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

function extractPlainText(payload: any): string {
  if (!payload) return '';
  if (payload.body?.data && (payload.mimeType?.startsWith('text/') ?? true)) {
    return Buffer.from(payload.body.data, 'base64url').toString('utf-8');
  }
  for (const part of payload.parts ?? []) {
    const text = extractPlainText(part);
    if (text) return text;
  }
  return '';
}

async function fetchMessage(accessToken: string, id: string): Promise<GmailMessage> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw new Error(`Gmail get message failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  const headers: { name: string; value: string }[] = json.payload?.headers ?? [];
  const header = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';
  return {
    id: json.id,
    internalDate: json.internalDate,
    subject: header('subject'),
    from: header('from'),
    bodyText: extractPlainText(json.payload) || (json.snippet ?? ''),
  };
}

/** Polls Gmail search until a message matching `query` arrives after `afterMs`. */
export async function waitForEmail(
  creds: GmailCredentials,
  { query, afterMs = Date.now(), timeoutMs = 60_000, pollIntervalMs = 3_000 }: WaitForEmailOptions,
): Promise<GmailMessage> {
  const deadline = Date.now() + timeoutMs;
  const accessToken = await getAccessToken(creds);

  while (Date.now() < deadline) {
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=5`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!listRes.ok) throw new Error(`Gmail search failed: ${listRes.status} ${await listRes.text()}`);
    const { messages } = (await listRes.json()) as { messages?: { id: string }[] };

    if (messages?.length) {
      const candidates = await Promise.all(messages.map((m) => fetchMessage(accessToken, m.id)));
      const fresh = candidates
        .filter((m) => Number(m.internalDate) >= afterMs)
        .sort((a, b) => Number(b.internalDate) - Number(a.internalDate));
      if (fresh.length) return fresh[0];
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Timed out waiting for email matching query: "${query}"`);
}

export function extractOtpCode(text: string): string {
  const match = text.match(/\b(\d{6})\b/);
  if (!match) throw new Error('No 6-digit OTP code found in email body');
  return match[1];
}

/** Supabase's default confirmation link carries the token_hash as `token=` (or `token_hash=` on custom templates). */
export function extractTokenHash(text: string): string {
  const match = text.match(/[?&]token_hash=([^&\s"'<]+)/) ?? text.match(/[?&]token=([^&\s"'<]+)/);
  if (!match) throw new Error('No token_hash/token found in email body');
  return decodeURIComponent(match[1]);
}
