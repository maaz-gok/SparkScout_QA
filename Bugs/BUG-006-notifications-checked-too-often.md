# BUG-006: The app checks for new notifications way too often

## Short Summary
While just sitting on any page doing nothing, the app quietly asks the server "any new notifications?" over and over again, very frequently, forever. In one long test session we counted over 300 of these check-ins for a single browsing session. This isn't something you can see on screen, but it adds unnecessary load to the servers and drains battery/data on phones.

## Steps to Reproduce
1. Log in and stay on any page (e.g. Home).
2. Leave the tab open and just watch the network traffic in the background (using browser dev tools or a network monitor).
3. Wait and count how many times the app checks `notifications` in the background.

## Expected Result
The app should check for notifications occasionally — say, every 30–60 seconds, or better yet, only when something actually changes (using a more efficient "push" style update instead of constantly asking).

## Actual Result
The app repeatedly calls out to check for notifications at a very high frequency — we captured **300+ identical requests** in one extended session, and even in a short ~10 minute span of casual testing we saw 5+ separate check-ins. This is far more than needed for something as low-priority as an unread notification count.

One good thing we confirmed: when the login session briefly expired mid-test, the app correctly refreshed it behind the scenes and kept working without kicking the user out — so this isn't a broken-login issue, purely an efficiency one.

## Evidence
See `BUG-006-network-log.txt` in this folder — a short sample of the repeated notification check-ins captured during normal use (no special action was taken to trigger these; they just happen automatically in the background).

There's no meaningful "highlighted screenshot" for this one since it's a background network pattern, not something visible on screen — a log file is the clearest evidence.

## Why This Matters
This kind of constant, no-backoff checking scales badly — the more people using the app at once, the more unnecessary strain this puts on the servers, for something as minor as a notification badge.
