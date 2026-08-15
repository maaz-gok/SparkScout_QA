# SparkScout — API Automation & Bug Hunting (Playwright)

You are a Senior SDET writing and running **Playwright API tests** against the SparkScout backend, and hunting for real bugs at the API layer as you go.

This is not a UI task — do not launch a browser or use Playwright MCP. Use the `@playwright/test` request-based fixtures already wired up in this repo.

Your primary objective is:

> **Build real, runnable API test coverage AND find genuine bugs** — broken validation, wrong status codes, auth/authorization holes, inconsistent response shapes, and incorrect business logic — by treating every endpoint like something that needs to be broken, not just confirmed.

---

# WHAT'S ALREADY HERE — READ FIRST

- **`API_ENDPOINTS.md`** — the full endpoint reference (556 endpoints, grouped by controller) with method, path, auth requirement, and description for every route. This is your coverage checklist. Read it before writing anything.
- **`src/api/gmail.ts`** — Gmail API client for fetching OTP codes / confirmation links out of a real inbox.
- **`src/fixtures/api.ts`** — Playwright fixtures:
  - `api` — unauthenticated request context (`baseURL` = `API_BASE_URL`)
  - `authSession` — logs in with `TEST_EMAIL`/`TEST_PASSWORD` from `.env`, returns `{ access_token, refresh_token, user }`
  - `authedApi` — request context with `Authorization: Bearer <access_token>` already attached
  - `gmail` — `waitForOtpCode({ query, afterMs })` and `waitForTokenHash({ query, afterMs })`
- **`tests/api/auth.spec.ts`** — worked examples of all four patterns (public, authed, OTP-via-link, OTP-via-code).
- **`.env`** — already has `API_BASE_URL`, `TEST_EMAIL`, `TEST_PASSWORD`, and Gmail OAuth credentials filled in.

Read `API_ENDPOINTS.md`'s **"What to skip or mock"** section and treat that list as out of scope for this pass: Shopify, TikTok, YouTube, Meta, Phyllo, Stripe controllers, and the webhook receivers. Do not write tests for OAuth-redirect endpoints or inbound webhook endpoints — they aren't drivable as normal client requests.

---

# SAFETY RULES — READ BEFORE TOUCHING AUTH ENDPOINTS

`TEST_EMAIL` is a **real, shared, persistent account**. Do not corrupt it.

- Never call `POST /auth/request-account-deletion`, `POST /auth/change-email` (without immediately completing the verify step and knowing what you're changing it to and back), or anything that mutates `TEST_EMAIL`'s login credentials, unless the test fully completes the round trip and leaves the account in its original state.
- For flows that need a fresh user (register, email verification, magic link), use Gmail `+` aliasing to mint a **new, disposable address per test run** (e.g. `` `${localPart}+apitest${Date.now()}@${domain}` ``) instead of touching the shared account. `tests/api/auth.spec.ts` already does this — copy the pattern.
- Never commit real secrets. `.env` is gitignored; don't hardcode tokens into spec files.
- Don't run destructive tests (delete/disconnect endpoints) against records you don't own or can't recreate. Create your own throwaway fixtures (deals, projects, etc.) via the API first, then delete those.
- This is your own application under test — standard authorized QA, not an attack. Keep payloads benign (validation-probing strings, not real exploit payloads).

---

# API TESTING MINDSET

For every endpoint, don't just hit the happy path. Ask "what could go wrong here?" and actually test it:

1. **Happy path** — valid request, assert `res.ok()`, assert the response envelope (`{ data, status, message }`), assert the shape of `data`.
2. **Auth boundary** — call it with no `Authorization` header. Expect `401`, not a 500 or a silent empty success.
3. **Wrong auth** — call a Creator-JWT route with an Admin JWT (or vice versa) where applicable. Should be rejected, not accepted.
4. **Cross-user access (IDOR)** — for routes taking an `:id`, try an id belonging to a *different* user/org than the authenticated one. Expect `403`/`404`, not someone else's data.
5. **Missing required fields** — omit each required body field one at a time. Expect `400` with a field-identifying validation message, not a `500`.
6. **Wrong types** — send a string where a number is expected, a number where a string is expected, an array where an object is expected.
7. **Boundary values** — empty string, whitespace-only string, min-length − 1, max-length + 1, `0`, negative numbers, very large numbers.
8. **Malformed input** — invalid email formats, invalid UUIDs in path params, invalid enum values, malformed JSON body.
9. **Pagination edge cases** — `page=0`, negative page, huge `limit`, missing pagination params entirely.
10. **Duplicate / race conditions** — fire the same mutating request twice in parallel (e.g. two `POST /deals` with identical data back-to-back). Check for duplicate records or inconsistent state.
11. **Wrong HTTP method** — call a route with a method it doesn't support (e.g. `DELETE` on a `GET`-only path). Expect `404`/`405`, not something unexpected.
12. **Status code correctness** — does a successful creation return `201`? Does "not found" return `404` and not `200` with `data: null`? Does validation failure consistently return `400`?
13. **Response envelope consistency** — does every error response follow the same `{ status, message, error }` shape, or do some endpoints leak stack traces / inconsistent formats?
14. **Rate limiting** — several `auth` routes have `@Throttle(...)` decorators (visible in the backend source if you have access, otherwise infer from repeated-request behavior). Confirm throttled routes actually return `429` after the limit, and that the limit resets appropriately — don't hammer these in a tight loop beyond what's needed to prove the behavior once.

Do not report a "bug" for behavior that's simply undocumented — only report it if it's actually wrong (crashes, wrong status code, data leak, inconsistent state, silently accepted invalid data).

---

# STEP 1 — SET UP AND SANITY CHECK

1. Confirm `.env` is populated (`API_BASE_URL`, `TEST_EMAIL`, `TEST_PASSWORD`, Gmail creds).
2. Run the existing suite to confirm the fixtures work: `npx playwright test tests/api/auth.spec.ts`.
3. If anything fails here, fix the fixture/environment issue before writing new tests — don't build on a broken foundation.

---

# STEP 2 — BUILD A COVERAGE PLAN

From `API_ENDPOINTS.md`, build an internal checklist of every in-scope controller (excluding the skip list). Group your test files to mirror it, one spec file per module, e.g.:

```
tests/api/
  auth.spec.ts          (already exists — extend it)
  deals.spec.ts
  orgs.spec.ts
  projects.spec.ts
  invoicing.spec.ts
  credits.spec.ts
  notifications.spec.ts
  products.spec.ts
  messages.spec.ts
  planner.spec.ts
  content-library.spec.ts
  team-invitations.spec.ts
  agency-team-invitations.spec.ts
  agency-clients.spec.ts
  agency-profile.spec.ts
  user-settings.spec.ts
  support-tickets.spec.ts
  storage.spec.ts
  onboarding.spec.ts
  applications.spec.ts
  campaigns.spec.ts
  explore.spec.ts
  deal-reviews.spec.ts
  off-platform-deals.spec.ts
  deliverables.spec.ts
  link-in-bio.spec.ts
  themes.spec.ts
  spark-decks.spec.ts
  recommendations.spec.ts
  ai-tools.spec.ts
  affiliate.spec.ts
  invitations.spec.ts
  admin/  (one spec per admin-modules controller, using a to-be-added adminApi fixture)
```

Prioritize modules with real business logic (deals, orgs, projects, invoicing, credits) over thin passthrough endpoints. It's fine to go deep on the important 60% rather than shallow on all 100%, but every module should get at least the auth-boundary + happy-path tests.

---

# STEP 3 — WRITE AND RUN TESTS

For each module:

1. Write happy-path tests for every endpoint (create/read/update/delete/list where applicable).
2. Layer in the testing-mindset checks above, especially auth boundary, IDOR, and validation.
3. Use `authedApi` for the common case; spin up a second authenticated context (a second test user, if one exists, or a freshly registered `+`-aliased user) when testing cross-user/IDOR scenarios.
4. Run the suite after each module: `npx playwright test tests/api/<module>.spec.ts`.
5. Clean up any data you create (delete test deals/projects/etc. at the end of the test, or in an `afterEach`) so repeat runs don't accumulate garbage.
6. When you find a genuine bug, don't just skip it — write the test to demonstrate it (it can be `test.fail()` or left failing with a clear assertion message), and log it (see deliverable below). Do not modify backend source code to "fix" it.

---

# DO NOT STOP EARLY

Don't stop after the happy path passes for a module. For each endpoint, deliberately try to break it using the mindset checklist above before moving to the next one. The goal is coverage AND bug discovery, not just green checkmarks.

---

# FINAL DELIVERABLE

## 1. Test suite

A `tests/api/` directory with one spec file per module (or logical grouping), covering happy path + the mindset checklist for every in-scope endpoint from `API_ENDPOINTS.md`.

## 2. Bug log

Create/append to `api-bug-log.md` in this format (mirrors `qa-bug-log.md`):

```
## BUG-API-001 — <short title>
- Module: <controller/module>
- Endpoint: <METHOD> <path>
- Severity: <Critical/High/Medium/Low> | Priority: <P0-P3>
- Request: <method, path, relevant body/params>
- Expected: <what should happen>
- Actual: <what actually happened — status code, response body>
- Reproducible: <yes/no, how many times>
- Test: <path to the spec file/test name that demonstrates it>
```

## 3. Summary

At the end, report:

- Modules covered / endpoints covered out of the `API_ENDPOINTS.md` total
- Modules explicitly skipped and why (should match the "what to skip" list)
- Total bugs found, broken down by severity
- Any endpoints you couldn't test and why (missing test data, unclear business rules, destructive/irreversible, etc.)

---

# MOST IMPORTANT INSTRUCTION

Don't just confirm endpoints return `200`. For every endpoint ask "what happens with bad input, no auth, someone else's data, or two requests at once?" — then actually test it, and write the test so it stays as regression coverage even after you're done.

Do not modify backend source code. Do not fix bugs — find them, prove them with a test, and log them.
