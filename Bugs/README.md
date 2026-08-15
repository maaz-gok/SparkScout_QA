# SparkScout Creator QA — Bug Reports

Plain-English writeups of every confirmed bug found during the Creator-role QA pass, one file per bug. Each includes a short summary, exact steps to reproduce it yourself, what should happen vs. what actually happens, and a screenshot with the problem area boxed in red.

| Bug | Title | Severity | Video |
|---|---|---|---|
| [BUG-001](BUG-001-login-no-error-message.md) | Wrong password shows no error message | High | [▶](BUG-001-video.webm) |
| [BUG-002](BUG-002-mismatched-match-counts.md) | "New Matches" count is different on every page | Medium | — |
| [BUG-003](BUG-003-whitespace-pitch-looks-valid.md) | Blank-spaces-only pitch tricks the form into looking valid | Medium | — |
| [BUG-004](BUG-004-no-success-message-after-applying.md) | No confirmation message after applying to a campaign | Low | [▶](BUG-004-video.webm) |
| [BUG-005](BUG-005-broken-link-saves-anyway.md) | Broken link saves and goes live despite a validation warning | High | [▶](BUG-005-video.webm) |
| [BUG-006](BUG-006-notifications-checked-too-often.md) | App checks for notifications way too often in the background | Medium | — |
| [BUG-007](BUG-007-inconsistent-error-pages.md) | Two different-looking "page not found" screens | Medium | [▶](BUG-007-video.webm) |
| [BUG-008](BUG-008-explore-tabs-cut-off-mobile.md) | Explore page tabs get cut off on phone screens | Medium | — |
| [BUG-009](BUG-009-deals-page-broken-on-tablet-mobile.md) | Deals page breaks on phone (overlapping text) and tablet (missing tabs) | High | — |

Full testing notes and additional positive/minor findings are in [`../qa-bug-log.md`](../qa-bug-log.md).
