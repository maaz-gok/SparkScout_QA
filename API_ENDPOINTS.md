# SparkScout Backend — API Reference & Playwright Automation Guide

Auto-generated from the `website.backend` NestJS controllers (556 endpoints across 66 controllers). Cross-check against the live Swagger docs at `{API_BASE_URL}/api-docs` when a route's exact request/response shape matters — this file documents method, path, and auth requirement, not full DTOs.

## Contents

- [How the API works](#how-the-api-works)
- [Playwright API automation guide](#playwright-api-automation-guide)
- [What to skip](#what-to-skip-or-mock)
- [Core API](#core-api) (424 endpoints)
  - [AppController](#appcontroller) — `/`
  - [MessagesController](#messagescontroller) — `/`
  - [AffiliateController](#affiliatecontroller) — `/affiliate`
  - [AgencyClientsController](#agencyclientscontroller) — `/agency-clients`
  - [AgencyProfileController](#agencyprofilecontroller) — `/agency-profile`
  - [AgencyTeamInvitationsController](#agencyteaminvitationscontroller) — `/agency-team-invitations`
  - [AIToolsController](#aitoolscontroller) — `/ai-tools`
  - [ApplicationsController](#applicationscontroller) — `/applications`
  - [AuthController](#authcontroller) — `/auth`
  - [MetaAuthController](#metaauthcontroller) — `/auth/meta`
  - [CampaignsController](#campaignscontroller) — `/campaigns`
  - [ChatController](#chatcontroller) — `/chat`
  - [ContentLibraryController](#contentlibrarycontroller) — `/content-library`
  - [CreatorController](#creatorcontroller) — `/creator`
  - [CreditsController](#creditscontroller) — `/credits`
  - [DealReviewsController](#dealreviewscontroller) — `/deal-reviews`
  - [DealsController](#dealscontroller) — `/deals`
  - [DealsStorageController](#dealsstoragecontroller) — `/deals-storage`
  - [DeliverablesController](#deliverablescontroller) — `/deliverables`
  - [ExploreController](#explorecontroller) — `/explore`
  - [InvitationsController](#invitationscontroller) — `/invitations`
  - [InvoicingController](#invoicingcontroller) — `/invoicing`
  - [LinkInBioController](#linkinbiocontroller) — `/link-in-bio`
  - [NotificationsController](#notificationscontroller) — `/notifications`
  - [OffPlatformDealsController](#offplatformdealscontroller) — `/off-platform-deals`
  - [OnboardingController](#onboardingcontroller) — `/onboarding`
  - [OrgsController](#orgscontroller) — `/orgs`
  - [PhylloController](#phyllocontroller) — `/phyllo`
  - [PlannerController](#plannercontroller) — `/planner`
  - [ProductsController](#productscontroller) — `/products`
  - [ProjectsController](#projectscontroller) — `/projects`
  - [OffPlatformDealsPublicController](#offplatformdealspubliccontroller) — `/public/off-platform-deals`
  - [RecommendationsController](#recommendationscontroller) — `/recommendations`
  - [ShopifyController](#shopifycontroller) — `/shopify`
  - [SparkDecksController](#sparkdeckscontroller) — `/spark-decks`
  - [StorageController](#storagecontroller) — `/storage`
  - [StripeBillingController](#stripebillingcontroller) — `/stripe`
  - [StripeConnectController](#stripeconnectcontroller) — `/stripe/connect`
  - [StripeSubscriptionController](#stripesubscriptioncontroller) — `/stripe/subscriptions`
  - [StripeWebhookController](#stripewebhookcontroller) — `/stripe/webhooks`
  - [SupportTicketsController](#supportticketscontroller) — `/support-tickets`
  - [TeamInvitationsController](#teaminvitationscontroller) — `/team-invitations`
  - [ThemesController](#themescontroller) — `/themes`
  - [TikTokController](#tiktokcontroller) — `/tiktok`
  - [UserSettingsController](#usersettingscontroller) — `/user-settings`
  - [YouTubeController](#youtubecontroller) — `/youtube`
- [Admin API](#admin-api) (131 endpoints)
  - [AdminActivityController](#adminactivitycontroller) — `/admin/activity-log`
  - [AdminAiController](#adminaicontroller) — `/admin/ai`
  - [AdminAnalyticsController](#adminanalyticscontroller) — `/admin/analytics`
  - [AdminApplicationsController](#adminapplicationscontroller) — `/admin/applications`
  - [AdminAuthController](#adminauthcontroller) — `/admin/auth`
  - [AdminCampaignsController](#admincampaignscontroller) — `/admin/campaigns`
  - [AdminContentController](#admincontentcontroller) — `/admin/content`
  - [AdminDashboardController](#admindashboardcontroller) — `/admin/dashboard`
  - [AdminDealsController](#admindealscontroller) — `/admin/deals`
  - [AdminFinancialsController](#adminfinancialscontroller) — `/admin/financials`
  - [AdminMarketingController](#adminmarketingcontroller) — `/admin/marketing`
  - [AdminNotificationsController](#adminnotificationscontroller) — `/admin/notifications`
  - [AdminSettingsController](#adminsettingscontroller) — `/admin/settings`
  - [AdminSubscriptionPlansController](#adminsubscriptionplanscontroller) — `/admin/subscription-plans`
  - [AdminSupportTicketsController](#adminsupportticketscontroller) — `/admin/support-tickets`
  - [AdminTeamController](#adminteamcontroller) — `/admin/team`
  - [AdminUsersController](#adminuserscontroller) — `/admin/users`
  - [PublicMarketingController](#publicmarketingcontroller) — `/marketing`
  - [PublicSettingsController](#publicsettingscontroller) — `/public/settings`
- [Webhooks](#webhooks) (1 endpoints)

---

## How the API works

- **Base URL**: `API_BASE_URL` env var, e.g. `https://api.sparkscout.com` (prod) or `http://localhost:8081` (local).
- **Response envelope**: every success response is `{ "data": ..., "status": 200, "message": "..." }`. Errors follow the same shape with `status >= 400` and an `error` field. Always assert on `res.ok()` / `body.data`, not raw top-level fields.
- **Auth models** (three separate, non-interchangeable schemes):
  - **Creator JWT** — `POST /auth/login` with `{ email, password }` returns `data.access_token` / `data.refresh_token` (Supabase session tokens). Send as `Authorization: Bearer <access_token>`. Refresh via `POST /auth/refresh`.
  - **Admin JWT** — separate login under `/admin/auth` (see the AdminAuthController section below), guarded by `AdminJwtGuard`. Not interchangeable with the creator token — an admin token won't pass `JwtAuthGuard` routes and vice versa.
  - **Public** — no token required.
  - **Webhook (HMAC signature)** — Shopify/Stripe call *you*; these aren't meant to be driven by a normal client request (see [What to skip](#what-to-skip-or-mock)).
- **OTP / email-verification flows**: some auth routes require a code or link from a real inbox before they can be completed — see the Playwright guide below for how the `SparkScout` fixtures fetch these via Gmail API.

---

## Playwright API automation guide

This repo (`SparkScout`) already has the scaffolding wired up:

```
SparkScout/
├── .env                        # secrets, gitignored — copy from .env.example
├── src/api/gmail.ts             # Gmail API client: fetch OTP codes / confirmation links from an inbox
├── src/fixtures/api.ts          # Playwright fixtures: api, authSession, authedApi, gmail
└── tests/api/auth.spec.ts       # worked examples of all patterns below
```

### 1. Plain (unauthenticated) requests

```ts
import { test, expect } from '../../src/fixtures/api';

test('public route', async ({ api }) => {
  const res = await api.get('/link-in-bio/public/some-slug');
  expect(res.ok()).toBeTruthy();
});
```

### 2. Authenticated Creator-JWT requests

The `authedApi` fixture logs in with `TEST_EMAIL`/`TEST_PASSWORD` from `.env` and attaches `Authorization: Bearer <token>` automatically.

```ts
import { test, expect } from '../../src/fixtures/api';

test('get current user', async ({ authedApi }) => {
  const res = await authedApi.get('/auth/me');
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.data.email).toBeTruthy();
});

test('create a deal', async ({ authedApi }) => {
  const res = await authedApi.post('/deals', { data: { title: 'Test deal' } });
  expect(res.ok(), await res.text()).toBeTruthy();
});
```

### 3. Flows that require an email OTP or confirmation link

The `gmail` fixture polls the inbox behind `GMAIL_CLIENT_ID`/`GMAIL_CLIENT_SECRET`/`GMAIL_REFRESH_TOKEN` (an OAuth2 installed-app token) and extracts either a 6-digit code or the `token_hash` from a Supabase confirmation link. Always capture `afterMs` **before** triggering the email so you don't match a stale message from a previous run.

```ts
import { test, expect } from '../../src/fixtures/api';

test('register + verify via emailed confirmation link', async ({ api, gmail }) => {
  // '+' aliasing: mail to base+anything@domain lands in the same inbox.
  const email = `maaz+apitest${Date.now()}@geeksofkolachi.com`;
  const requestedAt = Date.now();

  const registerRes = await api.post('/auth/register', {
    data: { email, password: 'ApiRegisterTest_2026!' },
  });
  expect(registerRes.ok()).toBeTruthy();

  const tokenHash = await gmail.waitForTokenHash({
    query: `to:${email} newer_than:1d`,
    afterMs: requestedAt,
  });

  const verifyRes = await api.post('/auth/verify-email', { data: { token_hash: tokenHash } });
  expect(verifyRes.ok()).toBeTruthy();
});

test('change-email OTP round trip', async ({ authedApi, gmail }) => {
  const newEmail = 'maaz+newaddr@geeksofkolachi.com';
  const requestedAt = Date.now();

  await authedApi.patch('/auth/change-email', { data: { email: newEmail } });

  const code = await gmail.waitForOtpCode({
    query: `to:${newEmail} newer_than:1d`,
    afterMs: requestedAt,
  });

  const verifyRes = await authedApi.post('/auth/change-email/verify', { data: { code } });
  expect(verifyRes.ok()).toBeTruthy();
});
```

Endpoints in this doc marked **Creator JWT** under `/auth` that send mail (`register`, `forgot-password`, `magic-link`, `change-email`) all follow one of these two patterns — 6-digit code (`change-email` only) or confirmation link (everything else, since those go through Supabase's own hosted email).

### 4. Admin JWT requests

Same shape as Creator JWT, but log in against the admin auth routes and use a separate request context — the two tokens are not interchangeable:

```ts
test('admin dashboard stats', async ({ api }) => {
  const login = await api.post('/admin/auth/login', {
    data: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
  });
  const { data } = await login.json();

  const adminApi = await request.newContext({
    baseURL: process.env.API_BASE_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${data.access_token}` },
  });
  const res = await adminApi.get('/admin/dashboard/overview');
  expect(res.ok()).toBeTruthy();
});
```

(Not yet wired up as a fixture — add an `adminApi` fixture to `src/fixtures/api.ts` mirroring `authedApi` if you end up writing many admin tests.)

---

## What to skip or mock

These controllers talk to a real third party (OAuth consent screens, external data pulls, payment provider, inbound webhooks) and don't fit pure API-request automation without a sandbox account or a mocked service layer:

| Controller | Why |
|---|---|
| `ShopifyController` | OAuth install/callback redirects to real Shopify; `/shopify/webhooks` is an inbound HMAC-signed webhook, not something you call as a client. |
| `TiktokController` | OAuth redirect to TikTok; data endpoints (`/videos`, `/social-stats`) need an already-connected real account. |
| `YoutubeController` | Same pattern — OAuth redirect + data pulls needing a connected account. |
| `MetaAuthController` | Facebook/Instagram OAuth + data pulls; `/deauthorize`, `/data-deletion` are Meta-initiated webhooks. |
| `PhylloController` | Third-party social data aggregator. |
| Stripe controllers (`stripe-subscription`, `stripe-connect`, `stripe-billing`, `stripe-webhook`) | Real payment provider — use Stripe test-mode keys if covering these; `stripe-webhook` is inbound-only. |
| `WebhooksController` (`/webhooks/compliance`) | Inbound webhook receiver, expects a signed payload from the sender, not a normal client. |

Everything else — auth, deals, orgs, projects, invoicing, credits, notifications, products, messages, planner, content-library, team/agency invitations, user-settings, support-tickets, storage, and the full admin CRUD surface — is internal and DB-backed, safe to automate directly.

---

## Core API

### AppController

`/`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Public |  |
| GET | `/system/maintenance-status` | Public |  |

### MessagesController

`/`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/conversations` | Public | List conversations for an org |
| POST | `/conversations` | Public | Create or find conversation |
| GET | `/conversations/:id/messages` | Public | List messages for a conversation |
| POST | `/conversations/:id/messages` | Public | Send message to conversation |
| PATCH | `/conversations/:id/read` | Public | Mark conversation messages as read |
| GET | `/conversations/unread-counts` | Public | Get unread counts by conversation for org |
| PATCH | `/conversations/:conversationId/messages/:messageId` | Public | Edit a sent message (within 5 minutes) |
| DELETE | `/conversations/:conversationId/messages/:messageId` | Public | Delete a message for me or for everyone |
| DELETE | `/conversations/:id` | Public | Delete conversation for the current org only |

### AffiliateController

`/affiliate`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/affiliate/me` | Creator JWT |  |
| POST | `/affiliate/invite` | Creator JWT |  |
| POST | `/affiliate/accept` | Creator JWT |  |
| POST | `/affiliate/withdraw` | Creator JWT |  |
| GET | `/affiliate/admin/user/:userId` | Admin JWT |  |
| POST | `/affiliate/admin/payout/:affiliateId/approve` | Admin JWT |  |
| POST | `/affiliate/admin/commission/:userId` | Admin JWT |  |
| GET | `/affiliate/admin/dashboard/kpis` | Admin JWT |  |
| GET | `/affiliate/admin/dashboard/trend` | Admin JWT |  |
| GET | `/affiliate/admin/dashboard/breakdown` | Admin JWT |  |
| GET | `/affiliate/admin/dashboard/top-affiliates` | Admin JWT |  |
| GET | `/affiliate/admin/affiliates` | Admin JWT |  |
| GET | `/affiliate/admin/payouts` | Admin JWT |  |
| POST | `/affiliate/admin/payouts/:id/status` | Admin JWT |  |
| POST | `/affiliate/admin/payouts/bulk-update` | Admin JWT |  |
| GET | `/affiliate/admin/settings` | Admin JWT |  |
| POST | `/affiliate/admin/settings` | Admin JWT |  |
| GET | `/affiliate/admin/conversions` | Admin JWT |  |

### AgencyClientsController

`/agency-clients`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/agency-clients/request` | Creator JWT | Send a partnership request to a creator or brand (agency only) |
| GET | `/agency-clients` | Creator JWT | List clients for the calling agency (paginated) |
| GET | `/agency-clients/partners` | Creator JWT | List active partner clients for switchers/dropdowns (paginated) |
| GET | `/agency-clients/dashboard/overview` | Creator JWT | Agency dashboard overview (stats + limited lists) |
| GET | `/agency-clients/dashboard/attention` | Creator JWT | Agency dashboard attention feed (urgent deadlines + alerts) |
| GET | `/agency-clients/partnership-usage` | Creator JWT | Agency creator/brand partnership usage vs plan limits |
| GET | `/agency-clients/item/:id` | Creator JWT | Get one client relationship for the calling agency |
| GET | `/agency-clients/incoming` | Creator JWT | List incoming pending partnership requests (paginated) |
| GET | `/agency-clients/my-partnerships` | Creator JWT | List all partnerships for the calling creator/brand account (paginated) |
| PATCH | `/agency-clients/:id/respond` | Creator JWT | Accept or decline a partnership request (client side) |
| PATCH | `/agency-clients/:id/permissions` | Creator JWT | Update approved permissions for an active partnership (client side) |
| PATCH | `/agency-clients/:id/terminate` | Creator JWT | Terminate an active partnership (agency side) |
| PATCH | `/agency-clients/:id/agency-permissions` | Creator JWT | Update approved permissions from agency side |
| PATCH | `/agency-clients/:id/remove` | Creator JWT | Remove/terminate partnership from client side |
| DELETE | `/agency-clients/:id` | Creator JWT | Cancel a pending partnership request (agency side) |

### AgencyProfileController

`/agency-profile`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/agency-profile/me` | Creator JWT | Get agency profile for the current user |
| PATCH | `/agency-profile/me` | Creator JWT | Create or update agency profile for the current user |
| GET | `/agency-profile/public/:orgId` | Public | Public agency profile by org ID |

### AgencyTeamInvitationsController

`/agency-team-invitations`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/agency-team-invitations` | Creator JWT | Send an agency team invitation |
| POST | `/agency-team-invitations/validate-email` | Creator JWT | Check whether an email can be invited (not already registered) |
| GET | `/agency-team-invitations` | Creator JWT | List agency team members / invitations |
| POST | `/agency-team-invitations/accept` | Public | Accept an agency team invitation. Pass accepted_user_id if already signed up; otherwise pass password to sign up. |
| POST | `/agency-team-invitations/expire-token` | Public | Expire an invite token when the recipient visits the signup page |
| GET | `/agency-team-invitations/my-agency-context` | Creator JWT | Returns the agency context for a team member |
| PATCH | `/agency-team-invitations/:id/revoke` | Creator JWT | Revoke a team member's access (owner/admin only) |
| PATCH | `/agency-team-invitations/:id/restore` | Creator JWT | Restore a revoked team member's access (owner/admin only) |
| PATCH | `/agency-team-invitations/:id/cancel` | Creator JWT | Cancel a pending agency team invitation (owner/admin only) |

### AIToolsController

`/ai-tools`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/ai-tools/download` | Creator JWT | Proxy-download a file from S3 to avoid CORS |
| GET | `/ai-tools/generations` | Creator JWT | Get AI generation history for the authenticated user |
| POST | `/ai-tools/generations` | Creator JWT | Create a new AI generation record |
| PATCH | `/ai-tools/generations/:id` | Creator JWT | Update a generation record (status, output_url, error) |
| DELETE | `/ai-tools/generations/:id` | Creator JWT | Soft-delete a generation (sets is_deleted = true, preserves the row) |
| POST | `/ai-tools/generations/:id/restore` | Creator JWT | Restore a soft-deleted generation and its linked Content Library item |
| GET | `/ai-tools/models` | Creator JWT | Get list of supported AI models and providers |
| GET | `/ai-tools/queue-status` | Creator JWT | Get current Fal AI queue status |
| GET | `/ai-tools/generate` | Creator JWT | Generate media using query parameters (GET) |
| POST | `/ai-tools/generate-image` | Creator JWT | Generate an image using AI |
| POST | `/ai-tools/generate-video` | Creator JWT | Generate a video using AI |
| POST | `/ai-tools/generate-chat` | Creator JWT | Generate chat response using AI |
| POST | `/ai-tools/generate-music` | Creator JWT | Generate music using AI |
| GET | `/ai-tools/error-logs` | Creator JWT | Get AI provider error logs |
| GET | `/ai-tools/error-stats` | Creator JWT | Get AI provider error statistics |

### ApplicationsController

`/applications`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/applications/campaign/:campaignId` | Creator JWT | List all applications for a campaign (brand only) |
| GET | `/applications/brand/pending-review` | Creator JWT | Pending-review applications across all active brand campaigns (dashboard) |
| GET | `/applications/:id` | Creator JWT | Get a single application by ID (brand only) |
| GET | `/applications/creator/:creatorOrgId` | Creator JWT | List applications for a creator org (creator owner/member or linked agency) |
| PATCH | `/applications/:id/status` | Creator JWT | Update application status: shortlist, reject, or reset to pending (brand only) |
| PATCH | `/applications/:id/withdraw` | Creator JWT | Withdraw an application (creator owner/member or linked agency) |
| POST | `/applications/:id/accept-offer` | Creator JWT | Creator accepts an offer (status must be offer_received) |
| POST | `/applications/:id/brand-activate-gifted` | Creator JWT | Brand activates gifted deal and ensures deal/deliverables exist |

### AuthController

`/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Register a new user (Public) |
| POST | `/auth/register-affiliate` | Public | Register via affiliate invite — email pre-verified (Public) |
| POST | `/auth/login` | Public | Login with email and password (Public) |
| POST | `/auth/refresh` | Public | Refresh access token (Public) |
| POST | `/auth/logout` | Creator JWT | Logout current user (Roles: ALL) |
| GET | `/auth/me` | Creator JWT | Get current user profile (Roles: ALL) |
| POST | `/auth/forgot-password` | Public | Send password reset email (Public) |
| POST | `/auth/reset-password` | Public | Reset password using token hash (Public) |
| PATCH | `/auth/change-password` | Creator JWT | Change password for authenticated user (Roles: ALL) |
| POST | `/auth/verify-email` | Public | Verify email with token hash (Public) |
| GET | `/auth/confirm-email-change` | Public | Confirm email change via GET (for links). Redirects to frontend on success. |
| POST | `/auth/confirm-email-change` | Public | Confirm email change with token from confirmation link (Public) |
| PATCH | `/auth/change-email` | Creator JWT | Request email change — sends a 6-digit code to the new address (Roles: ALL) |
| POST | `/auth/change-email/verify` | Creator JWT | Verify email change OTP and apply the new email (Roles: ALL) |
| GET | `/auth/oauth/:provider/link` | Creator JWT | Get OAuth URL to link a provider to the current account (Roles: ALL) |
| GET | `/auth/callback/link` | Public | OAuth account-link callback (Public) |
| GET | `/auth/oauth/:provider` | Public | Get OAuth redirect URL (Public) |
| GET | `/auth/callback` | Public | OAuth callback handler (Public) |
| POST | `/auth/complete-account-setup` | Creator JWT | Complete post-OAuth account setup (account type selection) (Roles: ALL) |
| POST | `/auth/exchange-code` | Public | Exchange Supabase PKCE redirect `code` for tokens (Public). Keep this: magic-link/verify only accepts token_hash, not PKCE codes. |
| POST | `/auth/magic-link` | Public | Send magic link to email (Public) |
| POST | `/auth/magic-link/verify` | Public | Verify magic link token (Public) |
| POST | `/auth/request-account-deletion` | Creator JWT | Schedule account deletion in 30 days (Roles: ALL) |
| GET | `/auth/account-deletion-status` | Creator JWT | Get account deletion blockers (Roles: ALL) |
| POST | `/auth/cancel-account-deletion` | Creator JWT | Cancel a pending account deletion (Roles: ALL) |
| GET | `/auth/mfa/factors` | Creator JWT | List MFA factors for current user (Roles: ALL) |
| POST | `/auth/mfa/enroll` | Creator JWT | Start MFA enrollment (Roles: ALL) |
| POST | `/auth/mfa/challenge` | Creator JWT | Create MFA challenge for factor (Roles: ALL) |
| POST | `/auth/mfa/verify` | Creator JWT | Verify MFA challenge code (Roles: ALL) |
| POST | `/auth/mfa/unenroll` | Creator JWT | Disable MFA factor (Roles: ALL) |

### MetaAuthController

`/auth/meta` — ⚠️ third-party, see [What to skip](#what-to-skip-or-mock)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/auth/meta/facebook/login` | Creator JWT | Start Facebook OAuth — redirects to the Meta consent dialog |
| POST | `/auth/meta/facebook/token` | Creator JWT | Exchange FB.login() short-lived token and store Page context |
| GET | `/auth/meta/connection` | Creator JWT | Meta connection status (no tokens exposed) |
| GET | `/auth/meta/page-engagement` | Creator JWT | Facebook Page engagement — page_views_total (day) |
| GET | `/auth/meta/instagram-reach` | Creator JWT | Instagram reach insights (day) |
| POST | `/auth/meta/refresh` | Creator JWT | Refresh Page token from Meta and return updated social profile |
| GET | `/auth/meta/social-profile` | Creator JWT | Facebook Page + Instagram follower counts and insight snapshot |
| GET | `/auth/meta/page-posts` | Creator JWT | Facebook Page posts for Spark Deck editor |
| GET | `/auth/meta/instagram-media` | Creator JWT | Instagram Business media for Spark Deck post picker |
| GET | `/auth/meta/callback` | Public | OAuth callback — exchanges code for tokens & stores connection |
| GET | `/auth/meta/pages` | Creator JWT | List the Facebook Pages the connected user manages |
| GET | `/auth/meta/instagram/insights/:igId` | Creator JWT | Fetch demographic insights for an Instagram Business account |
| GET | `/auth/meta/instagram/:pageId` | Creator JWT | Resolve the Instagram Business account linked to a Page |
| POST | `/auth/meta/deauthorize` | Public | Meta deauthorize callback — removes stored connection on app removal |
| POST | `/auth/meta/data-deletion` | Public | Meta data-deletion callback — handles GDPR/CCPA deletion requests |
| GET | `/auth/meta/deletion-status` | Public | Deletion status — polled by Meta after a data-deletion callback |
| DELETE | `/auth/meta/disconnect` | Creator JWT | Disconnect Meta account — user-initiated |

### CampaignsController

`/campaigns`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/campaigns` | Creator JWT | List campaigns |
| GET | `/campaigns/counts` | Creator JWT | Campaign counts by status |
| GET | `/campaigns/stats` | Creator JWT | Brand campaign dashboard stats |
| GET | `/campaigns/:id` | Creator JWT | Get a single campaign by ID |
| GET | `/campaigns/:id/deals-summary` | Creator JWT | Get campaign deals + deliverables summary |
| POST | `/campaigns` | Creator JWT | Create a new campaign for a brand org |
| POST | `/campaigns/apply` | Creator JWT | Creator applies to a campaign |
| POST | `/campaigns/send-offer` | Creator JWT | Brand sends an offer to a creator (sets application status → offer_received) |
| PATCH | `/campaigns/:id` | Creator JWT | Update a campaign |
| DELETE | `/campaigns/:id` | Creator JWT | Delete a campaign |

### ChatController

`/chat`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/chat/conversations` | Creator JWT | Create a new chat conversation |
| GET | `/chat/conversations` | Creator JWT | Get all conversations for a user |
| GET | `/chat/conversations/:id/messages` | Creator JWT | Get all messages in a conversation |
| POST | `/chat/conversations/:id/messages` | Creator JWT | Send a message and get AI response (streaming) |
| POST | `/chat/campaign-brief-assist` | Creator JWT | AI assist for campaign editor long-form fields |
| PATCH | `/chat/conversations/:id` | Creator JWT | Update conversation title |
| DELETE | `/chat/conversations/:id` | Creator JWT | Delete a conversation |

### ContentLibraryController

`/content-library`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/content-library` | Creator JWT | Create a new content item (Roles: ALL) |
| POST | `/content-library/upload-complete` | Creator JWT | Confirm upload + create content record in one call (Roles: ALL) |
| GET | `/content-library` | Creator JWT | Get all content items with filters (Roles: ALL) |
| GET | `/content-library/stats/storage` | Creator JWT | Get storage usage stats (Roles: ALL) |
| DELETE | `/content-library/trash/empty` | Creator JWT | Empty trash — permanently delete all trashed items (Roles: ALL) |
| GET | `/content-library/public/:orgId` | Public | Get a creator's public content by org ID — no auth required (for Spark Deck view) |
| GET | `/content-library/collections/list` | Creator JWT | Get all collections for current user (Roles: ALL) |
| POST | `/content-library/collections` | Creator JWT | Create a new collection (Roles: ALL) |
| DELETE | `/content-library/collections/:collectionId` | Creator JWT | Delete a collection and its items (Roles: ALL) |
| GET | `/content-library/collections/:collectionId/items` | Creator JWT | Get content items in a collection (Roles: ALL) |
| POST | `/content-library/collections/:collectionId/items` | Creator JWT | Add items to a collection (Roles: ALL) |
| DELETE | `/content-library/collections/:collectionId/items` | Creator JWT | Remove items from a collection (Roles: ALL) |
| GET | `/content-library/partner/:partnerUserId` | Creator JWT | Get a partner's content library (agency only) |
| DELETE | `/content-library/partner/:partnerUserId/:contentId` | Creator JWT | Delete a partner's content item (agency only) |
| PATCH | `/content-library/partner/:partnerUserId/:contentId` | Creator JWT | Update a partner's content metadata (agency only) |
| GET | `/content-library/:id/file` | Creator JWT | Download content file bytes (proxied — for crop/trim without S3 CORS) |
| GET | `/content-library/:id` | Creator JWT | Get single content item (Roles: ALL) |
| PATCH | `/content-library/:id` | Creator JWT | Update content metadata (Roles: ALL) |
| DELETE | `/content-library/:id` | Creator JWT | Delete content item (Roles: ALL) |
| POST | `/content-library/:id/restore` | Creator JWT | Restore content item from trash (Roles: ALL) |

### CreatorController

`/creator`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/creator/generate` | Creator JWT | Generate media content for creators |
| POST | `/creator/upload-generation-to-s3` | Creator JWT | Upload AI generation result to S3 and update database |

### CreditsController

`/credits`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/credits/me` | Creator JWT | Get current user credits (Roles: ALL) |
| POST | `/credits/deduct` | Creator JWT | Deduct credits for a generation (Roles: ALL) |
| POST | `/credits/refund` | Creator JWT | Refund credits after a failed generation (Roles: ALL) |
| POST | `/credits/add` | Creator JWT | Disabled — credits are added via Stripe webhooks only |

### DealReviewsController

`/deal-reviews`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/deal-reviews/deals/:dealId/context` | Creator JWT | Review form context for a settled deal |
| POST | `/deal-reviews` | Creator JWT | Submit a star rating and review for the other party |
| GET | `/deal-reviews/orgs/:orgId` | Creator JWT | List reviews received by an organization |

### DealsController

`/deals`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/deals` | Creator JWT | List deals |
| GET | `/deals/creator-tab-counts` | Creator JWT | Creator portal deal tab counts (pending, offers, active, etc.) |
| GET | `/deals/stats` | Creator JWT | Creator deal stats (total, ytd earnings, active count) |
| GET | `/deals/brand-stats` | Creator JWT | Brand deal stats (ytd spend, creators worked with) |
| GET | `/deals/brand-active-summary` | Creator JWT | Active deals summary for brand home dashboard |
| GET | `/deals/active-summary` | Creator JWT | Active deals summary for creator home dashboard |
| GET | `/deals/by-application/:applicationId` | Creator JWT | Find deal by application ID (for redirect) |
| GET | `/deals/application/:applicationId/detail` | Creator JWT | Get full application detail (pre-deal states) |
| GET | `/deals/shipping-addresses` | Creator JWT | List all saved shipping addresses for the creator (mobile) |
| GET | `/deals/shipping-addresses/:addressId` | Creator JWT | Get a single saved shipping address (mobile) |
| PATCH | `/deals/shipping-addresses/:addressId/set-default` | Creator JWT | Set a shipping address as default (mobile) |
| PATCH | `/deals/shipping-addresses/:addressId` | Creator JWT | Update a saved shipping address (mobile) |
| DELETE | `/deals/shipping-addresses/:addressId` | Creator JWT | Delete a saved shipping address (mobile) |
| GET | `/deals/:id` | Creator JWT | Get full deal by ID |
| PATCH | `/deals/:id/status` | Creator JWT | Update deal status |
| PATCH | `/deals/:id/confirm-product-received` | Creator JWT | Creator confirms physical product receipt |
| POST | `/deals/:id/shipping-address` | Creator JWT | Creator submits shipping address for a deal (mobile) |
| PATCH | `/deals/:id/shipping-address` | Creator JWT | Link an existing saved address to a deal (mobile / web) |
| PATCH | `/deals/:id/manual-shipping` | Creator JWT | Brand updates manual shipping status for a deal (mobile) |
| GET | `/deals/:id/shipping-address` | Creator JWT | Fetch the shipping address linked to a deal (brand or creator) |

### DealsStorageController

`/deals-storage`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/deals-storage/upload` | Creator JWT | Upload a deliverable file to S3 (spark-scout-assets bucket, deals/{dealId}/ folder) |

### DeliverablesController

`/deliverables`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/deliverables/upload-url` | Creator JWT | Get a presigned S3 PUT URL to upload a deliverable file directly from the browser |
| POST | `/deliverables/submit-s3` | Creator JWT | Record a deliverable submission after a browser-direct S3 upload |
| GET | `/deliverables/:id` | Creator JWT | Fetch a deliverable with all versions and comments |
| GET | `/deliverables/:id/version-count` | Creator JWT | Get total submitted version count for a deliverable |
| GET | `/deliverables/:id/comment-count` | Creator JWT | Get total comment count for a deliverable |
| POST | `/deliverables/submit` | Creator JWT | Submit a new version of a deliverable (file upload) |
| POST | `/deliverables/:id/approve` | Creator JWT | Approve the latest submitted version of a deliverable |
| POST | `/deliverables/:id/request-changes` | Creator JWT | Request changes on a deliverable version |
| POST | `/deliverables/:id/annotations` | Creator JWT | Save pin annotations for a specific deliverable version |
| POST | `/deliverables/:id/comments` | Creator JWT | Add a freeform comment (brand or creator) to a deliverable |
| PATCH | `/deliverables/:id/comments/:commentId` | Creator JWT | Edit the text of an existing freeform comment |
| DELETE | `/deliverables/:id/comments/:commentId` | Creator JWT | Delete a comment or annotation pin from a deliverable |
| POST | `/deliverables/:id/mark-paid` | Creator JWT | Mark a deliverable as paid (removes watermark) |
| POST | `/deliverables/:id/remove-watermark` | Creator JWT | Swap watermarked file_url with clean_file_url in revision history |
| POST | `/deliverables/deal/:dealId/remove-watermarks` | Creator JWT | Remove watermarks for all deliverables on a deal |

### ExploreController

`/explore`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/explore/campaigns` | Creator JWT | Get campaigns for Explore feed (Roles: ALL) |
| GET | `/explore/applied-campaign-ids` | Creator JWT | Get applied campaign IDs for current org (Roles: ALL) |
| GET | `/explore/agencies` | Creator JWT | List active agency profiles (Roles: ALL) |
| GET | `/explore/brands` | Creator JWT | List active brands with counts and follow state (Roles: ALL) |
| GET | `/explore/brands/:brandOrgId` | Creator JWT | Get a single brand with full explore stats (Roles: ALL) |
| POST | `/explore/brands/:brandOrgId/follow-toggle` | Creator JWT | Toggle follow/unfollow a brand (Roles: ALL) |
| GET | `/explore/saved-campaign-ids` | Creator JWT | Get saved campaign IDs for current org (Roles: ALL) |
| POST | `/explore/saved-campaigns/toggle` | Creator JWT | Toggle save/unsave campaign (Roles: ALL) |
| GET | `/explore/saved-deck-ids` | Creator JWT | Get saved spark deck IDs for current brand org (Roles: ALL) |
| POST | `/explore/saved-decks/toggle` | Creator JWT | Toggle save/unsave spark deck (Roles: ALL) |
| POST | `/explore/applications` | Creator JWT | Apply to a campaign (idempotent) (Roles: ALL) |
| GET | `/explore/featured` | Creator JWT | Get featured campaigns for Explore carousel (Roles: ALL) |
| GET | `/explore/recommended-creators` | Creator JWT | Get paginated recommended creators for the brand dashboard |
| GET | `/explore/agency/creators` | Creator JWT | Get creator listings for Agency Explore |
| GET | `/explore/agency/campaigns` | Creator JWT | Get campaign listings for Agency Explore |

### InvitationsController

`/invitations`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/invitations/send` | Creator JWT | Send a friend invitation email |
| GET | `/invitations/validate/:token` | Public | Validate an invite token (public) |
| POST | `/invitations/accept` | Public | Accept an invitation after registration (public) |

### InvoicingController

`/invoicing`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/invoicing/clients` | Creator JWT | List all clients for the current user |
| POST | `/invoicing/clients` | Creator JWT | Create a new client |
| PUT | `/invoicing/clients/:id` | Creator JWT | Update a client |
| DELETE | `/invoicing/clients/:id` | Creator JWT | Delete a client |
| GET | `/invoicing/invoices` | Creator JWT | List all invoices for the current user |
| GET | `/invoicing/invoices/:id` | Creator JWT | Get a single invoice |
| GET | `/invoicing/invoices/:id/pdf` | Creator JWT | Download invoice as PDF |
| POST | `/invoicing/invoices` | Creator JWT | Create a new invoice (saved as draft) |
| PUT | `/invoicing/invoices/:id` | Creator JWT | Update an invoice |
| DELETE | `/invoicing/invoices/:id` | Creator JWT | Delete an invoice |
| POST | `/invoicing/invoices/:id/send` | Creator JWT | Send invoice to client via email with Stripe payment link |
| POST | `/invoicing/invoices/:id/mark-paid` | Creator JWT | Manually mark an invoice as paid |
| POST | `/invoicing/invoices/:id/remind` | Creator JWT | Send a payment reminder email for an unpaid invoice |
| GET | `/invoicing/settings` | Creator JWT | Get invoice settings for the current user |
| PUT | `/invoicing/settings` | Creator JWT | Update invoice settings (upserts) |
| GET | `/invoicing/templates` | Creator JWT | List all invoice templates for the current user |
| GET | `/invoicing/templates/:id` | Creator JWT | Get a single invoice template |
| POST | `/invoicing/templates` | Creator JWT | Create a new invoice template |
| PUT | `/invoicing/templates/:id` | Creator JWT | Update an invoice template |
| DELETE | `/invoicing/templates/:id` | Creator JWT | Delete an invoice template |

### LinkInBioController

`/link-in-bio`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/link-in-bio/me` | Creator JWT | Get or create the current org Link in Bio |
| PATCH | `/link-in-bio/me` | Creator JWT | Save the current org Link in Bio |
| PATCH | `/link-in-bio/me/profile-image` | Creator JWT | Update current org Link in Bio profile image |
| GET | `/link-in-bio/public/:slug` | Public | Get public Link in Bio by slug |
| GET | `/link-in-bio/public/default-spark-deck/:orgId` | Public | Get default published Spark Deck id for an org |
| POST | `/link-in-bio/:personaId/view` | Public | Track a Link in Bio view |
| POST | `/link-in-bio/:personaId/click` | Public | Track a Link in Bio click |

### NotificationsController

`/notifications`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/notifications` | Public | List notifications for current user |
| GET | `/notifications/unread-count` | Public | Get unread notification count |
| PATCH | `/notifications/:id/read` | Public | Mark one notification as read |
| PATCH | `/notifications/mark-all-read` | Public | Mark all notifications as read |
| DELETE | `/notifications/:id` | Public | Delete notification |

### OffPlatformDealsController

`/off-platform-deals`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/off-platform-deals` | Creator JWT | List creator off-platform deals |
| GET | `/off-platform-deals/:id` | Creator JWT | Get off-platform deal detail |
| POST | `/off-platform-deals` | Creator JWT | Create manual off-platform deal |
| POST | `/off-platform-deals/from-invoice` | Creator JWT | Create deal from a paid invoice (no public portal) |
| PATCH | `/off-platform-deals/:id/brand` | Creator JWT | Update off-platform deal brand contact details |
| POST | `/off-platform-deals/:dealId/deliverables/:deliverableId/submit` | Creator JWT | Submit a deliverable file (creator) |

### OnboardingController

`/onboarding`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/onboarding/progress` | Creator JWT | Get product tour + profile completion progress for current user |
| PATCH | `/onboarding/progress` | Creator JWT | Update tour completion, dismiss, restart, or profile percent |

### OrgsController

`/orgs`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/orgs/me` | Creator JWT | Get or create the current user org (Roles: ALL) |
| GET | `/orgs/me/basic` | Creator JWT | Get basic org info (lightweight version of /me) |
| GET | `/orgs/lookup/batch` | Creator JWT | Get organizations by ids (Roles: ALL) |
| GET | `/orgs/lookup/:orgId` | Creator JWT | Get organization by id (Roles: ALL) |
| GET | `/orgs/brand-summaries` | Creator JWT | Get brand org/profile summaries by org ids (Roles: ALL) |
| GET | `/orgs/discover/brand-profiles` | Creator JWT | List active brand profiles for discover (Roles: ALL) |
| GET | `/orgs/brand-profile/:orgId` | Creator JWT | Get brand profile by org id (Roles: ALL) |
| GET | `/orgs/me/brand-profile` | Creator JWT | Get brand profile for current user brand org (Roles: ALL) |
| PATCH | `/orgs/me/brand-profile` | Creator JWT | Update brand profile for current user brand org (Roles: ALL) |
| GET | `/orgs/me/creator-persona` | Creator JWT | Get creator persona for current user creator org (Roles: ALL) |
| PATCH | `/orgs/me/creator-persona` | Creator JWT | Create or update creator persona for current user creator org (Roles: ALL) |
| GET | `/orgs/agency/brand-profiles` | Creator JWT | List agency-owned brand profiles (paginated) |
| POST | `/orgs/agency/brand-profiles` | Creator JWT | Create an owned brand profile for the current agency user |
| GET | `/orgs/agency/brand-profiles/:orgId` | Creator JWT | Get one agency-owned brand profile by org id |
| PATCH | `/orgs/agency/brand-profiles/:orgId` | Creator JWT | Update one agency-owned brand profile by org id |

### PhylloController

`/phyllo` — ⚠️ third-party, see [What to skip](#what-to-skip-or-mock)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/phyllo/sdk-token` | Creator JWT | Get a Phyllo SDK token for the current user |
| DELETE | `/phyllo/accounts/:accountId` | Creator JWT | Disconnect a Phyllo-connected social account |
| GET | `/phyllo/accounts` | Creator JWT | List connected social accounts via Phyllo |
| GET | `/phyllo/social-stats` | Public | Get real Phyllo social stats for a creator (public, for Spark Deck view) |

### PlannerController

`/planner`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/planner/calendar-stats` | Creator JWT | Planner header stats (counts by type + overdue) |
| GET | `/planner/calendar-events` | Creator JWT | Social planner calendar events |
| POST | `/planner/calendar-events` | Creator JWT | Add a planner event or schedule a deal deliverable |
| PATCH | `/planner/calendar-events/:id` | Creator JWT | Update a manual planner event (organic post, brand collab, etc.) |
| DELETE | `/planner/calendar-events/:id` | Creator JWT | Delete a manual planner event |

### ProductsController

`/products`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/products` | Creator JWT | List products for a brand org (paginated) |
| POST | `/products` | Creator JWT | Create a product for a brand org |
| PATCH | `/products/:id` | Creator JWT | Update a product |
| DELETE | `/products/:id` | Creator JWT | Delete a product |

### ProjectsController

`/projects`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/projects` | Creator JWT | List all projects for the authenticated user |
| POST | `/projects` | Creator JWT | Create a new project |
| GET | `/projects/:id` | Creator JWT | Get a single project by ID |
| PATCH | `/projects/:id` | Creator JWT | Update a project |
| DELETE | `/projects/:id` | Creator JWT | Soft-delete a project |
| GET | `/projects/:id/generations` | Creator JWT | Get a project's AI generations |
| PATCH | `/projects/generations/:generationId` | Creator JWT | Assign a generation to a project (or unassign) |

### OffPlatformDealsPublicController

`/public/off-platform-deals`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/public/off-platform-deals/:token` | Public | Brand views deal by public token |
| POST | `/public/off-platform-deals/:token/deliverables/:deliverableId/approve` | Public |  |
| POST | `/public/off-platform-deals/:token/deliverables/:deliverableId/request-changes` | Public |  |
| POST | `/public/off-platform-deals/:token/deliverables/:deliverableId/comments` | Public |  |
| PATCH | `/public/off-platform-deals/:token/deliverables/:deliverableId/comments/:commentId` | Public | Edit a brand freeform comment (guest review portal) |
| POST | `/public/off-platform-deals/:token/deliverables/:deliverableId/annotations` | Public | Save pin annotations for the current version |
| DELETE | `/public/off-platform-deals/:token/deliverables/:deliverableId/comments/:commentId` | Public | Delete a brand comment or pin annotation (guest review portal) |

### RecommendationsController

`/recommendations`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/recommendations/campaigns/:campaignId/match` | Creator JWT | Match score & reasons for one campaign (creator) |
| GET | `/recommendations/campaigns` | Creator JWT | Get recommended campaigns for the current creator |
| POST | `/recommendations/track-search` | Creator JWT | Track a search query for recommendation signals |
| POST | `/recommendations/track-interaction` | Creator JWT | Track a campaign interaction (view, save, dismiss, click) |
| POST | `/recommendations/refresh-scores` | Creator JWT | Recompute category affinity scores for the current creator |
| GET | `/recommendations/signals` | Creator JWT | Inspect the recommendation signals computed for this creator |
| GET | `/recommendations/brands` | Creator JWT | Get recommended brands for the current creator |

### ShopifyController

`/shopify` — ⚠️ third-party, see [What to skip](#what-to-skip-or-mock)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/shopify/auth` | Creator JWT | Get Shopify OAuth install URL for a brand org |
| GET | `/shopify/callback` | Public | Shopify OAuth redirect (public) |
| GET | `/shopify/status` | Creator JWT | Whether a Shopify store is connected for the org |
| POST | `/shopify/disconnect` | Creator JWT | Disconnect Shopify: soft-remove store + token and archive imported products (soft-delete, no hard deletes) |
| GET | `/shopify/catalog/preview` | Creator JWT | Paginated Shopify catalog for import preview (cursor: since_id) |
| POST | `/shopify/import` | Creator JWT | Import selected Shopify products into core.products |
| POST | `/shopify/gift-orders` | Creator JWT | Create a $0 Shopify gift order for a deal (Shopify catalog lines only, all deliverables approved) |
| POST | `/shopify/gift-orders/sync` | Creator JWT | Poll Shopify for order fulfillments and update deal timeline (fallback when webhooks are not configured) |
| POST | `/shopify/webhooks` | Webhook (HMAC signature) | Shopify Admin webhooks (HMAC verified) |

### SparkDecksController

`/spark-decks`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/spark-decks/public/:orgId` | Public | List all published spark decks for a creator org (public) |
| GET | `/spark-decks/public/deck/:deckId` | Public | Get a single published spark deck by ID (public) |
| POST | `/spark-decks/track-view` | Public | Track a spark deck view (analytics, no auth required) |
| GET | `/spark-decks` | Creator JWT | List all spark decks for the authenticated creator |
| GET | `/spark-decks/agency/list` | Creator JWT | List spark decks available to the authenticated agency user |
| POST | `/spark-decks/agency/deck` | Creator JWT | Create a spark deck for a creator (agency access) |
| GET | `/spark-decks/agency/deck/:id` | Creator JWT | Get a single spark deck by ID (agency access) |
| PATCH | `/spark-decks/agency/deck/:id` | Creator JWT | Update a spark deck (agency access) |
| PATCH | `/spark-decks/agency/deck/:id/publish` | Creator JWT | Toggle publish status of a spark deck (agency access) |
| GET | `/spark-decks/:id` | Creator JWT | Get a single spark deck by ID (owner only) |
| POST | `/spark-decks` | Creator JWT | Create a new spark deck |
| PATCH | `/spark-decks/:id` | Creator JWT | Update a spark deck |
| DELETE | `/spark-decks/:id` | Creator JWT | Delete a spark deck |
| PATCH | `/spark-decks/:id/publish` | Creator JWT | Toggle publish status of a spark deck |
| PATCH | `/spark-decks/:id/default` | Creator JWT | Set a spark deck as the default for the creator org |

### StorageController

`/storage`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/storage/upload-url` | Creator JWT | Generate presigned upload URL (Roles: ALL) |
| POST | `/storage/confirm` | Creator JWT | Confirm file upload (Roles: ALL) |
| GET | `/storage/signed-url` | Creator JWT | Get signed URL for private file (Roles: ALL) |
| DELETE | `/storage/file` | Creator JWT | Delete a file from storage (Roles: ALL) |
| POST | `/storage/spark-deck-upload-url` | Creator JWT | Generate a presigned S3 PUT URL for a Spark Deck file upload (images & videos of any size) |
| POST | `/storage/content-library-upload-url` | Creator JWT | Generate a presigned S3 PUT URL for a Content Library file upload (any size) |

### StripeBillingController

`/stripe` — ⚠️ third-party, see [What to skip](#what-to-skip-or-mock)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/stripe/billing-history` | Public | Get billing history (alias: /stripe/billing-history) |
| GET | `/stripe/payment-methods` | Public | List saved payment methods for the user |
| POST | `/stripe/payment-methods/setup-intent` | Public | Create a SetupIntent to add a new card |
| POST | `/stripe/payment-methods/complete-setup` | Public | Finalize a SetupIntent and return updated payment methods |
| PATCH | `/stripe/payment-methods/:paymentMethodId/default` | Public | Set a payment method as default |
| DELETE | `/stripe/payment-methods/:paymentMethodId` | Public | Remove a saved payment method |

### StripeConnectController

`/stripe/connect` — ⚠️ third-party, see [What to skip](#what-to-skip-or-mock)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/stripe/connect/debug/commission/:applicationId` | Public | Debug: trace agency commission lookup for a given application |
| GET | `/stripe/connect/status` | Public | Get Stripe Connect account status (live from Stripe) |
| POST | `/stripe/connect/onboard` | Public | Start or resume Stripe Connect Express onboarding |
| POST | `/stripe/connect/dashboard-link` | Public | Get Stripe Express dashboard link for an onboarded account |
| GET | `/stripe/connect/creator-status/:applicationId` | Public | Check if the creator for an application has Stripe Connect onboarded |
| POST | `/stripe/connect/webhooks` | Public | Handle Stripe Connect account webhook events |
| POST | `/stripe/connect/escrow/checkout` | Public | Create Stripe Checkout session to hold deal funds in escrow |
| POST | `/stripe/connect/escrow/activate` | Public | Activate escrow deal after successful Stripe Checkout (webhook-independent) |
| POST | `/stripe/connect/escrow/capture` | Public | Capture (release) escrow funds to creator after deliverable approval |
| POST | `/stripe/connect/escrow/complete-deal` | Public | Mark an upfront deal as completed after all deliverables are approved |
| POST | `/stripe/connect/escrow/pay-deliverable` | Public | Create Stripe Checkout session to pay for a single approved deliverable |
| POST | `/stripe/connect/deliverable/verify-and-mark-paid` | Public | Verify Stripe Checkout session and mark deliverable as paid |
| POST | `/stripe/connect/campaign-payments/intent` | Public | Create a Stripe PaymentIntent for a campaign deal payment (mobile / Payment Sheet) |
| POST | `/stripe/connect/deliverable/sync-deal-payment-status` | Public | Sync deal payment_status from deliverable payment rows (repair / idempotent) |

### StripeSubscriptionController

`/stripe/subscriptions` — ⚠️ third-party, see [What to skip](#what-to-skip-or-mock)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/stripe/subscriptions/checkout` | Public | Create subscription using Stripe hosted Checkout UI |
| GET | `/stripe/subscriptions/auto-discount` | Public | Get active auto-apply discount for the current user |
| GET | `/stripe/subscriptions/validate-discount` | Public | Validate a discount code for a user |
| POST | `/stripe/subscriptions/credits/checkout` | Public | Buy AI credit pack via Stripe Checkout |
| POST | `/stripe/subscriptions/credits/intent` | Public | Create a credit pack payment intent for mobile |
| POST | `/stripe/subscriptions/intent` | Public | Create subscription intent for mobile app |
| GET | `/stripe/subscriptions` | Public | Get current active subscription |
| GET | `/stripe/subscriptions/me` | Public | Get current subscription with credits |
| GET | `/stripe/subscriptions/history` | Public | Get all subscription history for user |
| GET | `/stripe/subscriptions/billing-history` | Public | Get billing history (alias for history) |
| GET | `/stripe/subscriptions/credits/history` | Public | Get AI credit purchase history for the current user |
| GET | `/stripe/subscriptions/plans` | Public | Get subscription plans catalog for an account type |
| PATCH | `/stripe/subscriptions/upgrade` | Public | Upgrade subscription immediately |
| PATCH | `/stripe/subscriptions/downgrade` | Public | Downgrade subscription |
| PATCH | `/stripe/subscriptions/billing-interval` | Public | Change billing interval on current plan |
| POST | `/stripe/subscriptions/cancel` | Public | Cancel subscription |
| POST | `/stripe/subscriptions/resume` | Public | Resume cancelled subscription |
| GET | `/stripe/subscriptions/downgrade-preview` | Public | Preview partnership removals when downgrading (agency only) |
| GET | `/stripe/subscriptions/verify/:sessionId` | Public | Verify checkout session after redirect |
| POST | `/stripe/subscriptions/change-plan` | Public | Change plan (free downgrade only) |
| GET | `/stripe/subscriptions/team-seats/preview` | Public | Preview prorated charge for adding team seats mid-cycle |
| PATCH | `/stripe/subscriptions/team-seats` | Public | Update extra team seat quantity on subscription |

### StripeWebhookController

`/stripe/webhooks` — ⚠️ third-party, see [What to skip](#what-to-skip-or-mock)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/stripe/webhooks` | Public | Handle Stripe webhook events |

### SupportTicketsController

`/support-tickets`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/support-tickets/attachments/upload-url` | Creator JWT | Get presigned URL for support ticket attachment |
| POST | `/support-tickets` | Creator JWT | Create a new support ticket |
| GET | `/support-tickets` | Creator JWT | List current user support tickets |
| GET | `/support-tickets/:id` | Creator JWT | Get support ticket with full thread |
| POST | `/support-tickets/:id/messages` | Creator JWT | Reply to an open support ticket |
| POST | `/support-tickets/:id/rate` | Creator JWT | Rate a closed support ticket (optional, 1–5 stars) |

### TeamInvitationsController

`/team-invitations`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/team-invitations` | Creator JWT | Send a team invitation (brand only) |
| POST | `/team-invitations/validate-email` | Creator JWT | Check whether an email can be invited (not already registered) |
| GET | `/team-invitations` | Creator JWT | List team invitations for the current brand org |
| POST | `/team-invitations/accept` | Public | Accept a team invitation. Pass accepted_user_id if already signed up; otherwise pass password (and optional first_name, last_name) to sign up (email verified). |
| POST | `/team-invitations/expire-token` | Public | Expire an invite token when the recipient visits the signup page |
| GET | `/team-invitations/my-brand-context` | Creator JWT | Returns the brand org a team member belongs to (for non-owner brand team members) |
| PATCH | `/team-invitations/:id/revoke` | Creator JWT | Revoke a team member's access (owner/admin only) |
| PATCH | `/team-invitations/:id/restore` | Creator JWT | Restore a revoked team member's access (owner/admin only) |
| PATCH | `/team-invitations/:id/cancel` | Creator JWT | Cancel a pending team invitation (owner/admin only) |

### ThemesController

`/themes`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/themes/templates` | Public | List active theme templates |
| GET | `/themes/templates/:id` | Public | Get one theme template by UUID |
| GET | `/themes/fonts` | Public | List active font definitions |

### TikTokController

`/tiktok` — ⚠️ third-party, see [What to skip](#what-to-skip-or-mock)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/tiktok/auth-url` | Creator JWT | Get TikTok OAuth2 authorization URL |
| GET | `/tiktok/callback` | Public | TikTok OAuth2 callback |
| GET | `/tiktok/connections` | Creator JWT | Get TikTok connections for a creator org |
| DELETE | `/tiktok/connections/:id` | Creator JWT | Disconnect a TikTok account |
| POST | `/tiktok/connections/:id/sync` | Creator JWT | Sync TikTok profile stats for a connection |
| GET | `/tiktok/videos` | Creator JWT | List TikTok videos for Spark Deck import |
| GET | `/tiktok/social-stats` | Public | Get TikTok stats for a creator (public, for Spark Deck view) |

### UserSettingsController

`/user-settings`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/user-settings/discover/creator-privacy` | Public | Get creator privacy flags for discover page (public) |
| GET | `/user-settings/discover/brand-privacy` | Public | Get brand privacy flags for Explore Brands tab (public) |
| GET | `/user-settings` | Creator JWT | Get current user settings configuration |
| PUT | `/user-settings` | Creator JWT | Update user settings configuration |

### YouTubeController

`/youtube` — ⚠️ third-party, see [What to skip](#what-to-skip-or-mock)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/youtube/auth-url` | Creator JWT | Get YouTube (Google) OAuth authorization URL |
| GET | `/youtube/callback` | Public | YouTube OAuth callback |
| GET | `/youtube/connections` | Creator JWT | List YouTube connections for a creator org |
| DELETE | `/youtube/connections/:id` | Creator JWT | Disconnect a YouTube account |
| POST | `/youtube/connections/:id/sync` | Creator JWT | Sync YouTube channel stats |
| GET | `/youtube/videos` | Creator JWT | List YouTube videos for Spark Deck import |
| GET | `/youtube/social-stats` | Public | YouTube stats for Spark Deck (public) |

## Admin API

### AdminActivityController

`/admin/activity-log`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin/activity-log` | Admin JWT | List admin activity log with filters and pagination |
| GET | `/admin/activity-log/filter-options` | Admin JWT | Get distinct admins, action types and target types for filter dropdowns |

### AdminAiController

`/admin/ai`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin/ai/stats` | Admin JWT | Get AI generation stats and daily chart data |
| GET | `/admin/ai/usage-dashboard` | Admin JWT | Get usage dashboard stats (stats + active users + error rate) |
| GET | `/admin/ai/generations` | Admin JWT | List AI generations (paginated, filterable) |
| GET | `/admin/ai/error-logs` | Admin JWT | List AI error logs (paginated) |
| GET | `/admin/ai/kill-switches` | Admin JWT | List AI feature kill switches |
| PATCH | `/admin/ai/kill-switches/:id/toggle` | Admin JWT | Toggle a kill switch on/off |
| GET | `/admin/ai/model-config` | Admin JWT | Get model usage config derived from generations |
| PATCH | `/admin/ai/model-config/:slug/toggle` | Admin JWT | Toggle a model enabled/disabled |

### AdminAnalyticsController

`/admin/analytics`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin/analytics/kpis` | Admin JWT | Get KPI cards for the given date range |
| GET | `/admin/analytics/users` | Admin JWT | Get all users-tab analytics data |
| GET | `/admin/analytics/deals` | Admin JWT | Get all deals-tab analytics data |
| GET | `/admin/analytics/campaigns` | Admin JWT | Get all campaigns-tab analytics data |
| GET | `/admin/analytics/content` | Admin JWT | Get all content-tab analytics data |

### AdminApplicationsController

`/admin/applications`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin/applications` | Admin JWT | List all applications (paginated, filterable) |
| GET | `/admin/applications/:id` | Admin JWT | Get application detail |
| PATCH | `/admin/applications/:id/status` | Admin JWT | Update application status |

### AdminAuthController

`/admin/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/admin/auth/login` | Public | Admin login (public) |
| GET | `/admin/auth/me` | Admin JWT | Get current admin profile |

### AdminCampaignsController

`/admin/campaigns`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin/campaigns` | Admin JWT | List all campaigns (paginated, filterable) |
| GET | `/admin/campaigns/:id` | Admin JWT | Get campaign detail with applications |
| PATCH | `/admin/campaigns/:id/status` | Admin JWT | Update campaign status (active\|paused\|cancelled\|draft) |
| PATCH | `/admin/campaigns/:id/featured` | Admin JWT | Set or unset campaign as featured |
| PATCH | `/admin/campaigns/:id/sponsored` | Admin JWT | Set or unset campaign sponsorship (sponsoring also features the campaign) |
| PATCH | `/admin/campaigns/:id` | Admin JWT | Update campaign fields (title, description, budget, dates) |

### AdminContentController

`/admin/content`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin/content` | Admin JWT | List all submitted creator content across deals |
| GET | `/admin/content/stats` | Admin JWT | Get content moderation stats |
| GET | `/admin/content/:id` | Admin JWT | Get deliverable details with version history |
| POST | `/admin/content/:id/comments` | Admin JWT | Add a comment as an admin |
| PATCH | `/admin/content/:id/comments/:commentId` | Admin JWT | Edit a comment as an admin |
| DELETE | `/admin/content/:id/comments/:commentId` | Admin JWT | Delete a comment or annotation pin from a deliverable |
| POST | `/admin/content/:id/annotations` | Admin JWT | Save pin annotations for a specific deliverable version |

### AdminDashboardController

`/admin/dashboard`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin/dashboard/overview` | Admin JWT | Get dashboard overview stats (KPI cards) |
| GET | `/admin/dashboard/user-growth` | Admin JWT | Get user growth data for chart |
| GET | `/admin/dashboard/financial` | Admin JWT | Get financial overview |
| GET | `/admin/dashboard/activity-feed` | Admin JWT | Get recent activity feed |
| GET | `/admin/dashboard/campaign-stats` | Admin JWT | Get campaign status breakdown |

### AdminDealsController

`/admin/deals`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin/deals` | Admin JWT | List all deals (paginated, filterable) |
| GET | `/admin/deals/shipping` | Admin JWT | Get shipping pipeline (all active shipping deals) |
| GET | `/admin/deals/:id` | Admin JWT | Get deal detail with deliverables and shipping |
| GET | `/admin/deals/:id/notes` | Admin JWT | List internal notes for a deal |
| POST | `/admin/deals/:id/notes` | Admin JWT | Add an internal note on a deal |
| PATCH | `/admin/deals/:id/status` | Admin JWT | Override deal status |
| PATCH | `/admin/deals/:id/flag` | Admin JWT | Set deal flagged state |
| PATCH | `/admin/deals/:id/manual-shipping` | Admin JWT | Admin: update manual shipping status (preparing or shipped) |
| PATCH | `/admin/deals/:id/confirm-delivered` | Admin JWT | Admin: mark a deal as delivered |
| PATCH | `/admin/deals/:id` | Admin JWT | Update deal fields (totalAmount) |

### AdminFinancialsController

`/admin/financials`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin/financials/summary` | Admin JWT | Get financial KPI summary for the given date range |
| GET | `/admin/financials/revenue-trend` | Admin JWT | Get monthly revenue breakdown (last N months) |
| GET | `/admin/financials/payment-status` | Admin JWT | Get payment status distribution |
| GET | `/admin/financials/top-spenders` | Admin JWT | Get top spending brands |
| GET | `/admin/financials/top-earners` | Admin JWT | Get top earning creators |
| GET | `/admin/financials/recent-transactions` | Admin JWT | Get recent ledger transactions |

### AdminMarketingController

`/admin/marketing`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/admin/marketing/banners/upload-image` | Admin JWT | Upload a banner image to S3 and return its URL |
| GET | `/admin/marketing/banners` | Admin JWT | List all banners |
| POST | `/admin/marketing/banners` | Admin JWT | Create a banner |
| PATCH | `/admin/marketing/banners/:id` | Admin JWT | Update a banner |
| DELETE | `/admin/marketing/banners/:id` | Admin JWT | Delete a banner |
| GET | `/admin/marketing/featured-campaigns` | Admin JWT | List featured campaigns |
| POST | `/admin/marketing/featured-campaigns` | Admin JWT | Add a campaign to featured list (max 5) |
| DELETE | `/admin/marketing/featured-campaigns/:id` | Admin JWT | Remove a campaign from featured list |
| POST | `/admin/marketing/featured-campaigns/reorder` | Admin JWT | Reorder featured campaigns |
| GET | `/admin/marketing/discount-codes` | Admin JWT | List all discount codes with optional filters |
| GET | `/admin/marketing/discount-codes/:id` | Admin JWT | Get a single discount code with usage log |
| POST | `/admin/marketing/discount-codes` | Admin JWT | Create a new discount code |
| PATCH | `/admin/marketing/discount-codes/:id` | Admin JWT | Update a discount code |
| PATCH | `/admin/marketing/discount-codes/:id/toggle` | Admin JWT | Toggle active/inactive status |
| DELETE | `/admin/marketing/discount-codes/:id` | Admin JWT | Delete a discount code (soft-delete if used) |
| GET | `/admin/marketing/discount-codes/:id/usage` | Admin JWT | Get usage stats and usage history for a code |
| POST | `/admin/marketing/discount-codes/:id/notify` | Admin JWT | Send (or re-send) discount notifications to target users |

### AdminNotificationsController

`/admin/notifications`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin/notifications/user` | Admin JWT | List all user notifications (all Spark Scout users) |
| GET | `/admin/notifications/admin` | Admin JWT | List admin-only notifications |
| GET | `/admin/notifications/admin/unread-count` | Admin JWT | Count of unread admin notifications (for bell badge) |
| GET | `/admin/notifications/user/unread-count` | Admin JWT | Count of unread user notifications |
| PATCH | `/admin/notifications/user/:id/read` | Admin JWT | Mark a user notification as read |
| PATCH | `/admin/notifications/admin/:id/read` | Admin JWT | Mark an admin notification as read |
| PATCH | `/admin/notifications/admin/mark-all-read` | Admin JWT | Mark all admin notifications as read |
| POST | `/admin/notifications/broadcast` | Admin JWT | Broadcast a notification to user segments |

### AdminSettingsController

`/admin/settings`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin/settings/config` | Admin JWT | Get platform configuration |
| PATCH | `/admin/settings/config` | Admin JWT | Update platform configuration |
| GET | `/admin/settings/maintenance/history` | Admin JWT | Get maintenance mode history |
| GET | `/admin/settings/feature-flags` | Admin JWT | List all feature flags |
| PATCH | `/admin/settings/feature-flags/:id` | Admin JWT | Update a feature flag |
| GET | `/admin/settings/email-templates` | Admin JWT | List all email templates |
| GET | `/admin/settings/email-templates/:id` | Admin JWT | Get a single email template |
| PATCH | `/admin/settings/email-templates/:id` | Admin JWT | Update an email template |
| PUT | `/admin/settings/fee-tiers` | Admin JWT | Update platform fee tiers |

### AdminSubscriptionPlansController

`/admin/subscription-plans`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin/subscription-plans` | Admin JWT | List subscription plans |
| POST | `/admin/subscription-plans` | Admin JWT | Create subscription plan |
| PATCH | `/admin/subscription-plans/:id` | Admin JWT | Update subscription plan |
| DELETE | `/admin/subscription-plans/:id` | Admin JWT | Deactivate subscription plan |
| GET | `/admin/subscription-plans/addons/list` | Admin JWT | List subscription add-ons |
| PATCH | `/admin/subscription-plans/addons/:id` | Admin JWT | Update subscription add-on |
| GET | `/admin/subscription-plans/preview/:accountType` | Admin JWT | Preview public plan cards for account type |

### AdminSupportTicketsController

`/admin/support-tickets`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin/support-tickets` | Admin JWT | List support tickets (Pro-first queue) |
| GET | `/admin/support-tickets/stats/summary` | Admin JWT | Support ticket queue summary stats |
| GET | `/admin/support-tickets/:id` | Admin JWT | Get support ticket detail with thread |
| POST | `/admin/support-tickets/:id/messages` | Admin JWT | Reply to a support ticket |
| PATCH | `/admin/support-tickets/:id/close` | Admin JWT | Close a support ticket |

### AdminTeamController

`/admin/team`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin/team` | Admin JWT | List admin team members and invites |
| POST | `/admin/team/invite` | Admin JWT | Invite a new admin panel user |
| PATCH | `/admin/team/:id/role` | Admin JWT | Change role of an admin (owner only) |
| PATCH | `/admin/team/:id/revoke` | Admin JWT | Revoke access for an admin or super_admin |
| PATCH | `/admin/team/:id/reinstate` | Admin JWT | Reinstate access for a revoked admin |
| DELETE | `/admin/team/invites/:inviteId` | Admin JWT | Cancel a pending admin invitation |
| GET | `/admin/team/invite/:token` | Public | Validate invitation token |
| POST | `/admin/team/invite/accept` | Public | Accept invitation and set password |

### AdminUsersController

`/admin/users`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin/users` | Admin JWT | List all platform users (paginated, filterable) |
| GET | `/admin/users/:id` | Admin JWT | Get user detail |
| PATCH | `/admin/users/:id` | Admin JWT | Update user profile (name, type, company) |
| POST | `/admin/users/:id/suspend` | Admin JWT | Suspend a user (temporary, reversible) |
| POST | `/admin/users/:id/unsuspend` | Admin JWT | Unsuspend a user |
| POST | `/admin/users/:id/verify` | Admin JWT | Mark a user as verified (identity confirmed) |
| POST | `/admin/users/:id/unverify` | Admin JWT | Remove verified status from a user |
| POST | `/admin/users/:id/ban` | Admin JWT | Ban a user (permanent via Supabase) |
| POST | `/admin/users/:id/unban` | Admin JWT | Unban a user |
| POST | `/admin/users/:id/reset-password` | Admin JWT | Reset a user password |
| PATCH | `/admin/users/:id/vip` | Admin JWT | Toggle VIP status |
| POST | `/admin/users/invite` | Admin JWT | Invite a new user by email |
| GET | `/admin/users/:id/notes` | Admin JWT | List internal notes for a user |
| POST | `/admin/users/:id/notes` | Admin JWT | Add an internal note on a user |
| DELETE | `/admin/users/:id/notes/:noteId` | Admin JWT | Delete an internal note (own notes only) |
| GET | `/admin/users/:id/analytics/earnings` | Admin JWT | Get creator earnings data |
| GET | `/admin/users/:id/analytics/performance` | Admin JWT | Get creator platform performance data |
| GET | `/admin/users/:id/analytics/overview` | Admin JWT | Get creator overview stats |
| GET | `/admin/users/:id/analytics/activity` | Admin JWT | Get user activity log |

### PublicMarketingController

`/marketing`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/marketing/banners` | Public | Get active banner for a placement (home \| ai_tools) |
| GET | `/marketing/featured-campaigns` | Public | Get admin-curated featured campaigns (max 5) |

### PublicSettingsController

`/public/settings`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/public/settings/maintenance-status` | Public | Get current maintenance mode status (public) |
| GET | `/public/settings/feature-flags` | Public | Get all enabled feature flags (public) |

## Webhooks

### WebhooksController

`/webhooks` — ⚠️ third-party, see [What to skip](#what-to-skip-or-mock)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/webhooks/compliance` | Webhook (HMAC signature) | Shopify mandatory compliance webhooks (single URL; topic in x-shopify-topic) |

