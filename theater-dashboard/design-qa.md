# Design QA · 经营总表销售指标切换

## Comparison setup

- Source visual truth: `/var/folders/2n/fn320kr11rdbqhbvt_5qpxlm0000gn/T/TemporaryItems/NSIRD_screencaptureui_im8Qdb/截屏2026-08-08 22.03.12.png`
- Implementation URL: `http://127.0.0.1:5173/`
- Implementation screenshot: unavailable in the current browser-control session
- Source pixels: 2048 × 849
- Intended comparison viewport: 2048 × 849 desktop crop
- State: overview, 30-day range, daily operations table, total-ticket mode selected

## Full-view comparison evidence

The source screenshot was opened at original resolution. The implementation is running and its API-backed data was verified, but a current browser-rendered screenshot could not be captured through the available browser-control surface. The previous dashboard screenshots predate this table change and are not valid evidence for the new interaction state.

## Focused region comparison evidence

Blocked for the same reason: there is no current rendered crop of the operations table in either the total-ticket or total-revenue selected state.

## Implemented changes

- Added a lightweight inline text control in the sales column header: `总售票金额 / 总售票数`.
- Removed the capsule background, border, icons, and tab treatment; active text uses dark green and heavier weight while inactive text uses pale sage gray.
- Added hover, focus, and `aria-pressed` states; values animate on selection change without refetching.
- Added the `新媒体粉丝数增长` column.
- Added `totalRevenue` and `mediaFollowerGrowth` to day/week/month API aggregation.
- Increased the narrow-screen table width so all five columns remain readable through horizontal scrolling.

## Required fidelity surfaces

- Fonts and typography: retained the existing dashboard type scale and monospaced numeric treatment; rendered comparison pending.
- Spacing and layout rhythm: the new sales toggle is sized to fit the sticky table header; overflow behavior is implemented, rendered comparison pending.
- Colors and visual tokens: uses the existing botanical green, sage background, and outlined capsule tokens from the source-aligned design system.
- Image quality and asset fidelity: no raster assets are required for this table change; icons use the existing outline icon library.
- Copy and content: labels match the requested metrics and units: 张、元、次、人。

## Findings

- [P2] Current rendered state cannot be visually compared
  - Location: overview operations table inline sales-metric switch.
  - Evidence: source screenshot is available, but current implementation capture is unavailable.
  - Impact: exact header density, five-column fit, and selected-state fidelity cannot be certified from rendered pixels.
  - Fix: capture the current overview at the source viewport, capture the revenue-selected state, combine each with the source, and resolve any visible spacing issues.

## Comparison history

- Previous botanical-dashboard QA passed before this incremental table change.
- This incremental pass replaces that handoff status because the sales toggle and follower-growth column need a fresh rendered comparison.

## Implementation checklist

- [x] Extend API and seed data.
- [x] Implement sales metric switching.
- [x] Add new-media follower growth.
- [x] Pass backend tests, TypeScript checks, and production build.
- [ ] Capture and compare the current rendered implementation.
- [ ] Verify the ticket/revenue selected states by clicking in the browser.

## Follow-up polish

- None recorded until rendered evidence is available.

final result: blocked
