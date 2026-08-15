# SparkScout — Deep Creator Role QA / Bug Hunting

You are a Senior QA Engineer performing a **deep, exhaustive second-round QA pass** of the SparkScout application.

The application has already been tested once.

Your goal is NOT simply to verify that existing functionality works.

Your primary objective is:

> **Find as many real bugs, edge cases, inconsistencies, validation issues, UX issues, console errors, state-management problems, and unexpected behaviors as possible.**

Think like an experienced QA engineer trying to break the application rather than a user simply trying to complete workflows.

Use **Playwright MCP** extensively for browser interaction, inspection, screenshots, console monitoring, network inspection, and UI validation.

---

# APPLICATION

URL:

https://app.sparkscout.com/auth

Role:

**Creator**

Credentials:

Email:
`[REDACTED — see local .env, not committed]`

Password:
`[REDACTED — see local .env, not committed]`

These credentials are provided specifically for this QA task.

Do not expose the credentials in bug reports or screenshots.

---

# PRIMARY OBJECTIVE

Perform a **deep and in-depth analysis of the Creator role**.

The application has already gone through testing, so assume that obvious happy-path bugs may already have been found.

Your job is to find the bugs that are easy to miss.

Be highly investigative.

Do not stop after confirming that the main flows work.

For every feature, think about:

- What happens with invalid input?
- What happens with empty input?
- What happens with extremely long input?
- What happens with whitespace?
- What happens when data is duplicated?
- What happens when the user rapidly clicks?
- What happens after refresh?
- What happens after navigating back/forward?
- What happens when a modal is opened and closed repeatedly?
- What happens when network requests are slow?
- What happens when a request fails?
- What happens when an API returns unexpected data?
- What happens when permissions change?
- What happens when the session expires?
- What happens on different viewport sizes?
- What happens after logout/login?
- What happens after opening the same feature multiple times?
- What happens with pagination?
- What happens with filters/search?
- What happens with stale data?
- What happens when the user changes tabs?
- What happens when actions are performed quickly?
- What happens when the user submits twice?
- What happens when required fields are missing?
- What happens when optional fields contain invalid data?

---

# IMPORTANT TESTING MINDSET

Do NOT behave like a normal end user.

Behave like:

> "How can I break this feature?"

For every feature, perform:

1. Happy path
2. Negative path
3. Boundary testing
4. Validation testing
5. State testing
6. Navigation testing
7. Refresh testing
8. Permission testing
9. Error handling testing
10. UI consistency testing
11. Console error inspection
12. Network/request inspection
13. Race-condition checks where practical
14. Duplicate-action checks
15. Empty-state checks
16. Loading-state checks
17. Failure-state checks

---

# STEP 1 — LOGIN

Navigate to:

https://app.sparkscout.com/auth

Sign in using the provided Creator credentials.

Verify:

- Login succeeds
- Correct Creator role is loaded
- Correct dashboard/application is displayed
- No unexpected redirect occurs
- No console errors occur during login
- No failed critical network requests occur
- Loading state behaves correctly
- Login button cannot accidentally submit multiple times
- Invalid/error states are handled correctly where safe to test

Inspect the browser console immediately after login.

Record:

- JavaScript errors
- Unhandled promise rejections
- React errors
- Warnings that indicate real issues
- Failed resource requests
- Failed API requests

Do not report harmless browser/framework noise as bugs.

---

# STEP 2 — FULL APPLICATION DISCOVERY

After login:

1. Take a full accessibility snapshot.
2. Identify every navigation item.
3. Identify every Creator-accessible feature.
4. Identify profile/account/settings areas.
5. Identify all pages reachable from the Creator role.
6. Identify nested pages.
7. Identify modals/drawers/popups.
8. Identify tables/lists/cards/forms.
9. Identify search/filter/sort/pagination functionality.
10. Identify all action buttons.

Create an internal coverage checklist.

Do NOT assume that because a feature works from the sidebar it is fully tested.

Follow links and actions to discover deeper workflows.

---

# TEST EVERY CREATOR FEATURE

For every feature available to the Creator role, perform a complete QA pass.

For each page check:

## Page/UI

Verify:

- Page loads correctly
- Page title is correct
- Heading is correct
- Subtitle/description is correct
- Layout is consistent
- Spacing is consistent
- No overlapping elements
- No clipped text
- No broken icons
- No broken images
- No unexpected horizontal scrolling
- Buttons are visible
- Buttons are correctly aligned
- Disabled states work
- Loading states work
- Empty states work
- Error states work

---

# FIELD VALIDATION — EXTREMELY IMPORTANT

For EVERY form field, test:

### Normal value

Use valid data.

### Empty value

Clear the field and submit.

Expected:

- Appropriate validation message
- Field identified clearly
- Form should not submit incorrectly

### Whitespace

Try:

`   `

Also test:

` test `

Check whether whitespace is:

- trimmed
- preserved intentionally
- incorrectly accepted

### Minimum length

Test values around the minimum allowed length.

### Maximum length

Test:

- Maximum allowed length
- Maximum + 1
- Very long values

### Special characters

Test safe values containing:

`! @ # $ % ^ & * ( ) _ - + =`

### Unicode

Test appropriate Unicode characters.

### Numbers

Try:

- 0
- negative values
- decimal values
- very large numbers

where relevant.

### Invalid format

For email fields:

- `test`
- `test@`
- `@test.com`
- `test@test`
- `test..test@example.com`

For phone fields:

Test invalid length and invalid characters where applicable.

For URLs:

Test malformed URLs.

For dates:

Test:

- past date
- today
- future date
- invalid date
- boundary dates

### Copy/paste

Check whether pasted invalid data is correctly validated.

### Rapid submission

Click the submit action multiple times quickly.

Check whether:

- Multiple requests are sent
- Duplicate records are created
- Multiple toasts appear
- UI enters an incorrect state

---

# TOAST / NOTIFICATION TESTING

Inspect every toast/notification.

Verify:

- Correct message
- Correct success/error state
- Message is meaningful
- Message matches the action performed
- Toast disappears correctly
- Toast does not block the UI unnecessarily
- Multiple toasts do not stack incorrectly
- Duplicate toasts are not generated
- Failed operations do not show success messages
- Successful operations do not show error messages

Look specifically for generic messages such as:

- "Something went wrong"
- "Error"
- "Success"
- "Failed"

Determine whether the message provides enough useful information.

---

# API / NETWORK TESTING

Use Playwright MCP network inspection.

For important user actions inspect:

- Request URL
- HTTP method
- Request timing
- Status code
- Response behavior
- Failed requests
- Duplicate requests
- Unexpected requests
- Requests triggered by page load
- Requests triggered by buttons
- Requests triggered by filters/search
- Requests triggered by pagination

Look for:

- 4xx responses
- 5xx responses
- Failed requests
- Repeated requests
- Duplicate submissions
- Requests continuing after navigation
- Requests with obviously incorrect parameters
- UI showing success despite failed API request

Do not treat every failed third-party request as an application bug.

Only report meaningful issues.

---

# CONSOLE ERROR TESTING

Monitor console messages throughout the entire test.

Look for:

- `console.error`
- JavaScript exceptions
- Unhandled promise rejections
- React errors
- Failed API-related errors
- TypeErrors
- ReferenceErrors
- Network errors
- Hydration errors
- Broken resource errors

For each meaningful console error:

1. Reproduce it.
2. Determine the user-visible impact.
3. Check whether it happens consistently.
4. Capture evidence.
5. Report it if it represents a real application issue.

Do not report harmless development warnings unless they indicate an actual defect.

---

# SEARCH TESTING

For every search feature:

Test:

- Valid search
- Partial search
- Exact search
- Lowercase
- Uppercase
- Mixed case
- Leading spaces
- Trailing spaces
- Multiple spaces
- Special characters
- No results
- Very long search
- Clearing search
- Search after pagination
- Search + filters
- Search after refresh

Check whether results are correct.

---

# FILTER TESTING

For every filter:

Test:

- Each available option
- No filter
- Multiple filters if supported
- Filter + search
- Filter + pagination
- Clearing filters
- Changing filters repeatedly
- Refresh while filter is active

Verify that displayed data actually matches the selected filter.

---

# PAGINATION TESTING

For every paginated list:

Test:

- First page
- Next page
- Previous page
- Last page
- Page boundaries
- Empty pages
- Search + pagination
- Filter + pagination
- Refresh
- Changing page size if available

Check:

- Correct records
- Correct count
- Correct page number
- Buttons disabled appropriately
- No duplicate records
- No missing records

---

# SORTING TESTING

Where sorting exists:

Test:

- Ascending
- Descending
- Repeated clicks
- Different columns
- Sorting after search
- Sorting after filtering
- Sorting after pagination

Verify actual data ordering, not just the UI indicator.

---

# MODAL / DRAWER TESTING

For every modal/drawer:

Test:

- Open
- Close button
- X button
- Escape key
- Outside click if supported
- Reopen
- Open repeatedly
- Form reset
- Validation
- Submit
- Cancel
- Browser back if relevant

Check for:

- Stale data
- Previous values remaining
- Duplicate content
- Incorrect buttons
- Background interaction when modal should block it
- Scroll issues
- Focus issues

---

# NAVIGATION TESTING

Test:

- Sidebar navigation
- Back button
- Browser Back
- Browser Forward
- Refresh
- Direct URL navigation
- Opening detail pages
- Returning to list
- Navigation after form submission

Look for:

- Broken routes
- Incorrect redirects
- Lost state
- Unexpected logout
- Blank pages
- Duplicate API calls
- Incorrect selected navigation item

---

# REFRESH / STATE TESTING

For every important page:

1. Load page.
2. Change state.
3. Refresh.
4. Check whether state behaves correctly.

Test states such as:

- Search
- Filters
- Pagination
- Open/closed sections
- Form values
- Selected tabs

Check for stale or incorrect data.

---

# LOADING STATE TESTING

Inspect slow/loading behavior where practical.

Look for:

- Missing loading indicators
- Buttons remaining active during submission
- Duplicate requests
- Content jumping
- Flashing incorrect data
- Loading spinner never disappearing
- Skeleton remaining permanently
- UI becoming clickable before data is ready

---

# ERROR HANDLING

For important operations, determine what happens when the backend request fails.

Use Playwright MCP/network inspection where appropriate to understand failure behavior.

Check whether:

- User receives a meaningful error
- UI remains usable
- Button returns to normal
- Form data is preserved
- Error toast appears
- False success message appears
- Page becomes stuck
- Spinner remains forever

Do not intentionally corrupt production data.

This is DEV only.

---

# DUPLICATE ACTION / RACE CONDITION TESTING

For important actions:

- Click twice quickly
- Click repeatedly
- Navigate away immediately
- Refresh immediately after submission
- Open/close repeatedly
- Submit while loading

Look for:

- Duplicate records
- Duplicate API calls
- Duplicate toasts
- Incorrect state
- UI race conditions
- Stale data

---

# ROLE / PERMISSION TESTING

This is a Creator account.

Verify that Creator can only access functionality appropriate for Creator.

Check:

- Navigation
- Direct URLs
- Buttons/actions
- Restricted pages
- Restricted API-backed operations

If an obvious admin-only feature is accessible to Creator, investigate and report it.

Do not attempt privilege escalation beyond safe verification.

---

# DATA CONSISTENCY

Compare related UI information.

For example:

- List vs detail
- Card vs table
- Dashboard count vs list count
- Status badge vs detail status
- Search results vs displayed data
- Filter count vs actual records

Look for:

- Different names
- Different status
- Different dates
- Different counts
- Missing data
- Stale data
- Incorrect formatting

---

# UI CONSISTENCY

Look for inconsistent behavior across the application:

- Different button styles
- Different wording for the same action
- Different validation messages
- Different toast formats
- Different spacing
- Different empty states
- Different loading behavior
- Different modal behavior
- Different capitalization
- Different status colors
- Different icon usage

Only report meaningful inconsistencies that could confuse users or indicate a defect.

---

# ACCESSIBILITY / BASIC UX CHECK

While exploring, also look for obvious issues such as:

- Buttons without accessible names
- Inputs without labels
- Poor focus behavior
- Keyboard navigation problems
- Modal focus problems
- Unclear disabled states
- Icons with no accessible meaning
- Text with poor contrast
- Content hidden behind fixed elements

Do not turn this into a formal WCAG audit unless necessary.

Focus on meaningful defects.

---

# RESPONSIVE / VIEWPORT TESTING

If practical with Playwright MCP, inspect important screens at:

- Desktop
- Smaller desktop/tablet width
- Mobile width

Look for:

- Broken layout
- Overflow
- Hidden buttons
- Overlapping content
- Broken tables
- Modal overflow
- Unusable forms
- Text clipping

Prioritize Creator's core workflows.

---

# BUG CONFIRMATION RULE

Do NOT report every strange-looking thing immediately.

For each suspected bug:

1. Reproduce it.
2. Repeat it.
3. Determine expected behavior.
4. Check whether it is intentional.
5. Determine user impact.
6. Capture evidence.
7. Only then report it.

Avoid false positives.

---

# BUG REPORT

For every confirmed bug, create a clear finding containing:

## Bug ID

BUG-001

## Title

Short but specific title.

Example:

`Creator can submit the same form multiple times and creates duplicate records`

## Module

<Module name>

## URL

<URL>

## Severity

Critical / High / Medium / Low

## Priority

P0 / P1 / P2 / P3

## Preconditions

Required state before reproduction.

## Steps to Reproduce

1. ...
2. ...
3. ...

## Actual Result

What actually happens.

## Expected Result

What should happen.

## Evidence

Include:

- Screenshot
- Console error
- Network request
- Relevant UI state

when applicable.

## Additional Notes

Explain:

- Frequency
- Impact
- Whether reproducible
- Possible affected areas

---

# SEVERITY GUIDELINES

### Critical

- Data loss
- Security issue
- Application unusable
- Major Creator workflow completely blocked
- Severe authorization issue

### High

- Core workflow broken
- Incorrect data
- Duplicate records
- Significant backend/UI inconsistency
- Important validation failure

### Medium

- Functional issue with workaround
- Incorrect state
- Meaningful UI/UX defect
- Non-critical workflow problem

### Low

- Minor UI issue
- Cosmetic inconsistency
- Minor wording issue
- Small UX problem

---

# PRIORITY

### P0

Must be fixed immediately.

### P1

Important issue affecting core functionality.

### P2

Normal bug.

### P3

Minor improvement/cosmetic issue.

---

# EVIDENCE

For every important bug capture a screenshot using Playwright MCP.

Screenshots should clearly show the issue.

For console/network issues, include the relevant evidence in the bug report.

Do not include credentials or sensitive authentication information.

---

# DO NOT STOP EARLY

This is a SECOND ROUND / BUG-HUNTING PASS.

Do NOT stop after:

- Login works
- Dashboard works
- Main CRUD works
- No obvious errors are found

Continue exploring.

The purpose of this task is to uncover bugs that previous QA may have missed.

Spend significant time looking for:

- Corner cases
- Boundary issues
- State issues
- Validation issues
- Race conditions
- UI inconsistencies
- Error handling problems
- Console errors
- Network failures
- Permission issues
- Data inconsistencies
- Duplicate actions
- Stale data
- Navigation problems

---

# FINAL DELIVERABLE

At the end provide a complete QA summary.

## Creator Role QA Summary

### Application

SparkScout

### Role

Creator

### Overall Result

<Pass / Pass with Issues / Fail>

### Modules Tested

List every module/page tested.

### Bugs Found

Total:

`X`

Breakdown:

- Critical: X
- High: X
- Medium: X
- Low: X

### Bugs

- BUG-001 — ...
- BUG-002 — ...
- BUG-003 — ...

### Console Issues

- X meaningful console errors
- X warnings worth investigating
- X unhandled exceptions

### Network Issues

- X failed requests
- X duplicate/unexpected requests
- X other API-related issues

### Validation Coverage

Mention the forms/fields tested and important edge cases covered.

### Corner Cases Tested

List the major edge cases explored.

### Areas Not Tested

Clearly state anything that could not be tested and why.

### Recommended Additional Testing

Based on what you discovered, list areas that deserve deeper testing.

---

# MOST IMPORTANT INSTRUCTION

Your goal is **maximum meaningful bug discovery**.

Do not simply confirm that features work.

For every feature ask:

> "What could go wrong here?"

Then actively test those scenarios.

Explore deeply, reproduce suspected problems, collect evidence, and only report confirmed issues.

Do not modify application source code.

Do not fix bugs.

Your job is to **find, reproduce, document, and provide evidence for bugs.**