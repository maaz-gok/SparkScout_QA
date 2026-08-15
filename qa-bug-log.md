# SparkScout Creator QA — Running Bug Log

## BUG-001 — Failed login shows no error feedback to user (silent failure)
- Module: Auth / Login
- URL: https://app.sparkscout.com/auth
- Severity: High | Priority: P1
- Steps: Enter valid email + wrong password → click Sign In
- Actual: Console shows `401 Unauthorized` + `Sign in error: Error: Invalid credentials`, but zero toast/inline message appears on screen. Notifications region stays empty. Password field/button just resets, user has no idea why login failed.
- Expected: Visible error message (toast or inline) telling user the credentials are invalid.
- Evidence: bug-login-no-error-toast.png, console log (401 + "Sign in error")
- Reproducible: Yes, 3x in a row with different wrong passwords.

## BUG-002 — "New Matches" count inconsistent between Home dashboard and Explore page
- Module: Home Dashboard / Explore
- URL: https://app.sparkscout.com/creator/home vs /creator/explore
- Severity: Medium | Priority: P2
- Steps: Load Home page, note "New Matches" stat card = 8 (also "New Opportunities 8" heading). Navigate to Explore page, note "NEW MATCHES" stat = 1.
- Actual: Two different counts for what appears to be the same metric.
- Expected: Consistent count across both pages.
- Evidence: home-new-matches.png, explore-page.png
- Reproducible: Yes, confirmed on reload.

## BUG-003 — "Your Pitch" field shows "Looking good!" and only subtly-disabled Next button for whitespace-only input
- Module: Explore / Campaign Apply Modal
- URL: https://app.sparkscout.com/creator/explore/campaign/2ca10a83-ad26-4959-a5d6-8900a1e9c1f0
- Severity: Medium | Priority: P2
- Preconditions: Logged in as Creator, open a campaign detail page, click "Apply Now"
- Steps:
  1. In "Your Pitch" textarea, enter exactly 50 space characters (no real content).
  2. Observe helper text below field and the "Next" button.
- Actual: Helper text changes from "1 more characters needed" (note: also a grammar bug, should be "1 more character needed" for singular) to "Looking good!" and char counter shows "50/500" — implying the input is valid. The Next button is still functionally disabled (clicking it does nothing, confirmed via accessibility tree `[disabled]` and no wizard-step progression), but it is styled in a solid/filled purple almost identical to the truly-enabled state, giving no clear indication to the user that submission is blocked or why.
- Expected: Whitespace-only input should not show a positive "Looking good!" message; helper text should indicate real content is required (e.g., "Please write a real pitch"), and/or the button should be clearly/visibly disabled (greyed out) so it matches its functional state.
- Evidence: bug-apply-whitespace-pitch.png (whitespace, "Looking good!", 50/500) vs apply-valid-pitch.png (real text, clearly darker enabled button) for comparison.
- Reproducible: Yes.
- Additional notes: Underlying validation does correctly block submission (good — prevents empty pitch spam), so this is a messaging/affordance bug, not a data-integrity bug.

## BUG-004 — No success toast/confirmation shown after submitting a campaign application
- Module: Explore / Campaign Apply
- URL: https://app.sparkscout.com/creator/explore/campaign/2ca10a83-ad26-4959-a5d6-8900a1e9c1f0
- Severity: Low | Priority: P3
- Steps: Complete the 4-step Apply to Campaign wizard and click "Submit Application".
- Actual: Application is created successfully (confirmed via 201 response from POST /campaigns/apply and the deal correctly appearing in Deals > Pending), but the "Notifications" toast region remains empty — no success toast appears. Only signal is the Apply button silently changing to a disabled "Applied" state.
- Expected: A success toast/confirmation (e.g. "Application submitted!") for a significant action like this.
- Evidence: Notifications region confirmed empty in accessibility snapshot immediately after submission.
- Reproducible: Yes.
- Additional Notes: Same silent-feedback pattern observed on failed login (BUG-001) — suggests the toast/notification system may not be wired up for several action outcomes across the app. Worth broader investigation by the dev team.

## Off-platform Deal form — good validation observed
- Contact email: invalid format correctly shows inline "Enter a valid email address".
- Website: malformed URL correctly shows inline "Enter a valid website URL".
- Payment amount: typing "-50" silently strips the minus sign and displays "50" / Total deal value "$50" with no message telling the user negative values are not allowed. Low severity — worth a quick fix for clarity, filed as low-severity cosmetic below.

## BUG-005 — Link in Bio: invalid URL passes inline validation error but is saved to backend anyway
- Module: Link in Bio / Cards & Links
- URL: https://app.sparkscout.com/creator/links
- Severity: High | Priority: P1
- Preconditions: Logged in as Creator, on Link in Bio > Cards / links tab
- Steps:
  1. Click "Add card" → "Simple button" to add a new link card.
  2. Open the card's edit panel, enter `not a valid url` in the URL field.
  3. Observe inline error "Please enter a valid URL (e.g. yourwebsite.com)" appears.
  4. Click the top "Save" button (not disabled despite the error).
  5. Reload the page and re-open the card's edit panel.
- Actual: PATCH /link-in-bio/me returns 200 OK and the invalid string `not a valid url` is persisted — confirmed still present after a full page reload. The inline validation message is purely cosmetic; it does not block saving. The card's toggle remains "on" (visible), meaning this broken link would render as a clickable button on the Creator's live public Link-in-Bio page (a page brands/fans visit), leading to a dead/non-functional link.
- Expected: Save should be blocked (or the value coerced/rejected) when the URL fails validation, consistent with the inline error shown; invalid URLs should never reach the public-facing page.
- Evidence: bug-invalid-url-persisted.png; network trace showing PATCH /link-in-bio/me => 200 with invalid data still present after reload.
- Reproducible: Yes.
- Additional Notes: This affects a public-facing surface (the creator's live bio page), so impact extends beyond the Creator dashboard. Test data was removed via "Delete Link" after confirming the bug to avoid leaving broken content live.

## BUG-006 — Notifications endpoint polled continuously with no visible backoff; session refresh works but polling volume is excessive
- Module: Global (background polling, observed while on Settings > Account)
- URL: all authenticated pages (background behavior)
- Severity: Medium | Priority: P2
- Steps: Stay logged in on any page for an extended period and inspect network requests.
- Actual: `GET /notifications?limit=20` fires repeatedly and continuously in the background — captured 300+ identical requests to this single endpoint during one extended session. At one point the access token expired mid-session, producing a `401` on this endpoint; the app correctly called `POST /auth/refresh` (200) and resumed polling successfully with no user-facing disruption (this part works well). However, the sheer volume/frequency of the polling itself is a concern — this scales poorly with concurrent users and adds unnecessary backend load/battery drain for what is a low-priority background check (unread notification count).
- Expected: Notification polling should use a more conservative interval, exponential backoff, or (better) a push/websocket-based mechanism instead of tight polling.
- Evidence: Network log with 300+ sequential GET /notifications?limit=20 calls; one 401 followed by successful auth/refresh.
- Reproducible: Yes, consistently reproducible by leaving any page open.
- Additional Notes: Token refresh-on-401 behavior itself is correctly implemented and is a positive finding — no session-expiry bug for the user. This finding is about network efficiency, not correctness.

## BUG-007 — Unknown top-level routes trigger a spurious failed API call / console error, and produce two different-looking 404 pages depending on route shape
- Module: Global / Routing
- URL: e.g. https://app.sparkscout.com/admin, https://app.sparkscout.com/xyz123 (single path segment) vs https://app.sparkscout.com/brand/dashboard (multi-segment)
- Severity: Medium | Priority: P2
- Steps:
  1. While logged in, navigate directly to a nonexistent single-segment path, e.g. `/admin` or `/xyz123`.
  2. Observe console and rendered page.
  3. Navigate directly to a nonexistent multi-segment path, e.g. `/brand/dashboard`.
  4. Observe console and rendered page again.
- Actual: For single-segment unknown paths, the app appears to treat the path as a potential public Link-in-Bio username, fires `GET /link-in-bio/public/<path>` which returns 404, logs an `AxiosError: Page not found` to console, and then renders a 404 UI reading "Page not found / The page you're looking for doesn't exist or has been moved." with a "Go back home" button. For multi-segment unknown paths, a completely different 404 UI is shown instead: "404 / Oops! Page not found" with a "Return to Home" link, logged via a single intentional `console.error("404 Error: User attempted to access non-existent route: ...")` and no failed network request. Two visually and functionally different not-found experiences exist in the same app, and one path unnecessarily calls a real API endpoint and produces an unhandled-looking Axios error.
- Expected: A single, consistent 404/not-found experience for all unmatched routes; the router should not attempt a network fetch for paths that don't match a known pattern before falling back to "not found," or the link-in-bio username route should be scoped so it doesn't swallow arbitrary unmatched top-level paths.
- Evidence: bug-inconsistent-404-linkinbio-fallback.png; console log showing `Failed to load resource: 404 @ /link-in-bio/public/xyz123` + `Error fetching beta link-in-bio: AxiosError: Page not found`.
- Reproducible: Yes, confirmed with 3 different paths (`/admin`, `/xyz123` → link-in-bio fallback pattern; `/brand/dashboard` → generic NotFound pattern).
- Additional Notes: Role/permission boundaries themselves are correctly enforced — neither route exposed any admin/brand functionality to the Creator account. This finding is about routing/UX consistency and an unnecessary failed request, not an authorization gap.

## BUG-008 — Explore page: horizontal tab rows clip/overflow on mobile viewport with no scroll affordance
- Module: Explore (responsive/mobile)
- URL: https://app.sparkscout.com/creator/explore
- Severity: Medium | Priority: P2
- Preconditions: Viewport resized to mobile width (375×812 tested)
- Steps:
  1. Log in, go to Explore.
  2. Resize browser to 375px width (or open on a mobile device).
  3. Observe the "For You / Brands / Agencies / Saved" section tabs and the "For You / Trending / High Value / Closing Soon / Saved" campaign-feed tabs.
- Actual: Both tab rows overflow the viewport width; trailing tabs are clipped mid-label ("Sa" for Saved, "C" for Closing Soon) with no visible scroll indicator, fade edge, or wrap-to-next-line behavior. All tabs remain present and clickable in the accessibility tree, but a mouse/touch user has no visual cue that more tabs exist or that the row is scrollable.
- Expected: Tab rows should either wrap, scroll with a visible affordance (fade/arrow), or collapse into a dropdown/"More" control on narrow viewports, and labels should never be cut off mid-word.
- Evidence: responsive-explore-mobile.png (375×812).
- Reproducible: Yes.

## BUG-009 — Deals page: status-filter tabs and table column headers break at mobile/tablet widths
- Module: Deals (responsive)
- URL: https://app.sparkscout.com/creator/deals
- Severity: High | Priority: P1
- Preconditions: Viewport resized to mobile (375×812) and tablet (768×1024)
- Steps:
  1. Log in, go to Deals.
  2. Resize to 375×812 (mobile) and observe the table header row and status tabs.
  3. Resize to 768×1024 (tablet) and observe the status tabs area (Active/Offers/Pending/Completed/Other).
- Actual: At 375px, the table drops the Brand/Deliverables/Deadline columns (acceptable), but the remaining "Amount" and "Status" column headers visually overlap/collide into unreadable text ("AmounStatus"). At 768px, the status-filter tabs (Active (0), Offers (0), Pending (1), Completed (0), Other (0)) are almost entirely clipped off-screen — only a tiny bracket-like sliver is visible — even though all five buttons are present and clickable in the DOM. A tablet user effectively cannot see or select which deal status they're filtering by.
- Expected: Table headers should never visually overlap at any supported viewport; the status-filter control should remain fully visible/usable (e.g. via horizontal scroll with visible affordance, wrapping, or a dropdown) at tablet width.
- Evidence: responsive-deals-mobile.png (375×812, overlapping "Amount"/"Status" headers), responsive-deals-tablet.png (768×1024, clipped status tabs).
- Reproducible: Yes, confirmed at both breakpoints.
- Additional Notes: Filed as High because the Deals page is a core Creator workflow and the tablet-width bug makes a primary control (status filtering) practically unusable/undiscoverable, not just cosmetic.

## Positive findings confirmed during this pass (no bug — noted for completeness)
- Explore budget filter (min/max): entering min > max correctly shows inline validation ("Maximum must be greater than or equal to minimum.") and disables the apply action ("Show 0 campaigns", disabled) rather than silently applying a broken filter.
- Explore budget filter with a valid range ($0–$600) correctly excluded the one campaign priced above the range and kept the two within/without a price — filter logic itself is accurate.
- Deals search with a non-matching query correctly updates the tab count (e.g. "Pending (0)") and shows an honest empty state rather than stale/incorrect data.
- Rapid double-click on Explore's "Save campaign" (bookmark) toggle fires two `POST /explore/saved-campaigns/toggle` requests but nets out to a consistent, correct end state (confirmed via the Saved tab) — no duplicate-save or stuck-state race condition.
- Direct URL access to `/admin` and `/brand/dashboard` while authenticated as Creator does not expose any admin/brand functionality — both correctly deny access (see BUG-007 for the inconsistent *presentation* of that denial).
- Logout correctly clears session; direct navigation to a protected route (`/creator/home`) after logout correctly redirects to `/auth` with no stale content flash.

## Minor/Cosmetic observations (not yet confirmed as reportable bugs)
- Explore page campaign card: "1 months left" — pluralization grammar issue (should be "1 month left"). Location: New Fragrance campaign card, Explore > For You.
- Login form validation relies entirely on native browser HTML5 validation bubbles (generic "Please fill in this field" / "Please enter a part following '@'") rather than custom branded messages — inconsistent with rest of app's styled toasts. Low severity UX inconsistency.
- Redundant duplicate network calls observed on dashboard load: GET /stripe/subscriptions/me called twice, GET /onboarding/progress called twice, GET /stripe/subscriptions/plans?accountType=creator called twice. Not user-visible but inefficient.
- Explore Filters dialog: console warning "Missing `Description` or `aria-describedby={undefined}` for {DialogContent}" — accessibility issue, the filter dialog isn't properly described for screen readers.
- Explore platform filter buttons at mobile width relabel to abbreviated text but the TikTok button renders as "TT TT" (icon abbreviation "TT" duplicated as both icon and label) instead of a single clear abbreviation.
- Deals empty states ("No pending deals found", "No active deals found") don't distinguish between "no data exists" and "no results match your search/filter" — same message either way, which could confuse a user who forgot they had a search term active.

---

# Creator Role QA Summary

### Application
SparkScout

### Role
Creator

### Overall Result
Pass with Issues

### Modules Tested
- Auth / Login (valid, invalid password, empty, invalid email format, rapid submit)
- Home Dashboard
- Explore (For You feed, search, Filters dialog incl. budget/date/platform/brand filters, save/bookmark toggle, campaign apply wizard incl. whitespace-only pitch field, rapid double-click actions)
- Deals (Active/Offers/Pending/Completed/Other tabs, search, Off-platform Deal form validation)
- Link in Bio / Cards & Links (URL validation, save/persist behavior)
- Content Library (empty state, mobile layout)
- Messages (basic load/console check)
- Global background behavior (notifications polling, token refresh)
- Routing / permission boundaries (`/admin`, `/brand/dashboard`, arbitrary unknown routes)
- Logout / session-expiry / protected-route redirect behavior
- Responsive/viewport testing at desktop (1440px), tablet (768px), and mobile (375px) on Home, Explore, Deals, Content Library

### Bugs Found
Total: `9`

Breakdown:
- Critical: 0
- High: 3
- Medium: 5
- Low: 1

### Bugs
- BUG-001 — Failed login shows no error feedback to user (silent failure) — High
- BUG-002 — "New Matches" count inconsistent between Home dashboard and Explore page — Medium
- BUG-003 — "Your Pitch" field shows "Looking good!" and only subtly-disabled Next button for whitespace-only input — Medium
- BUG-004 — No success toast/confirmation shown after submitting a campaign application — Low
- BUG-005 — Link in Bio: invalid URL passes inline validation error but is saved to backend anyway — High
- BUG-006 — Notifications endpoint polled continuously with no visible backoff — Medium
- BUG-007 — Unknown routes trigger a spurious failed API call and two inconsistent 404 experiences — Medium
- BUG-008 — Explore page: horizontal tab rows clip/overflow on mobile with no scroll affordance — Medium
- BUG-009 — Deals page: status-filter tabs and column headers break at mobile/tablet widths — High

### Console Issues
- 2 meaningful console errors reproduced consistently (BUG-007's failed link-in-bio fetch on unmatched single-segment routes, and the intentional-but-still-console.error'd NotFound log on multi-segment routes)
- 1 accessibility warning worth investigating (missing `Description`/`aria-describedby` on the Explore Filters `DialogContent` — likely present on other dialogs too, not exhaustively checked)
- 0 unhandled exceptions/TypeErrors observed
- Login failure (401) and Link-in-Bio invalid-save both produced console signals with no matching user-facing feedback (see BUG-001, and toast gaps generally)

### Network Issues
- 0 unexpected 5xx responses observed
- 1 confirmed backend-validation gap: PATCH /link-in-bio/me accepts and persists an invalid URL despite the UI showing an inline error (BUG-005)
- 1 excessive-polling issue: GET /notifications?limit=20 fired 300+ times in one session with no backoff (BUG-006)
- Several redundant duplicate GETs on dashboard load (stripe subscriptions/me, onboarding/progress, stripe plans) — not user-visible, inefficiency only
- Rapid double-click on the Explore save/bookmark toggle fires two POST requests but resolves to a consistent end state — no duplicate-record or stuck-state issue found

### Validation Coverage
- Login: valid credentials, wrong password, empty fields, invalid email format, rapid multi-click submit
- Campaign Apply wizard "Your Pitch" field: whitespace-only (50 spaces) input vs real content, character counter, disabled-button styling
- Link in Bio URL field: malformed URL, inline validation vs actual persistence after reload
- Off-platform Deal form: invalid email, malformed URL, negative payment amount (silently stripped, no message)
- Explore budget filter: min > max (correctly blocked), valid range (correctly filtered)
- Deals search: non-matching query (correct empty state + count update)

### Corner Cases Tested
- Whitespace-only required-field input (Explore pitch textarea)
- Min-greater-than-max numeric range filter (Explore budget)
- Rapid double-click on a toggle action (save/bookmark) and on login submit
- Direct URL navigation to non-Creator and nonexistent routes while authenticated
- Direct URL navigation to a protected route after logout
- Browser back navigation immediately after logout
- Full-page reload after applying search state (state does not persist — acceptable, not filed as a bug since no URL-based state is implied elsewhere in the app)
- Mobile (375px) and tablet (768px) viewport rendering of tab/filter controls and data tables on the two most control-dense pages (Explore, Deals)
- Negative number input on a currency field (Off-platform Deal payment amount)

### Areas Not Tested
- Messages: only a surface-level load/console check was done; sending messages, attachments, read-receipts, and real-time update behavior were not exercised due to needing a second (brand-side) account to converse with.
- Spark Decks, AI Tools, Calendar/Planner: not covered in this pass — flagged as the largest coverage gap.
- Pagination and column sorting: could not be meaningfully exercised on Deals/Explore because the test account's data volume (1 pending deal, 3 explore campaigns) never produced a second page or sortable multi-row table.
- Profile/Settings/account forms: not covered in this pass (validation, avatar upload, notification preferences, etc.).
- True concurrent-tab / multi-session race conditions (e.g. two browser tabs performing conflicting actions) were not tested.
- Payment/Stripe subscription flows: not exercised beyond observing the duplicate background GETs.

### Recommended Additional Testing
- Full validation + edge-case pass on Messages (attachments, very long messages, rapid send, XSS-safe rendering of message content).
- Full pass on Spark Decks, AI Tools, and Calendar/Planner — currently zero coverage.
- Backend-side authorization testing (not just route-level) to confirm a Creator cannot fetch/mutate another account's deals or campaigns via direct API calls (IDOR-style checks) — this pass only confirmed frontend route guarding, not API-level authorization, and was intentionally not attempted without a second test account/explicit scope.
- Populate test data with enough records to properly exercise pagination and sorting, which this pass could not meaningfully test due to low data volume.
- Broader toast/notification audit — BUG-001 and BUG-004 both point to the same underlying gap (success/error toasts missing for some actions); worth a systematic pass across every mutating action in the app to find the full extent.
- Dialog accessibility audit (the missing-`Description` warning found on the Explore Filters dialog may recur on other modals — Apply wizard, Off-platform Deal form, Link in Bio card editor).
