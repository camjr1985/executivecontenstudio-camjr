# Test report — migration baseline

- Workbook: seven expected sheets; 79 Master Calendar rows; 41 existing; 38 new; no missing or duplicate Content IDs; Content Index set equals Master Calendar set.
- Editorial gates: POST-038 = MOVE to 2026-09-13 / owner required; POST-041 = MOVE to 2026-09-20 / owner required; POST-047 = KEEP on 2026-09-29; POST-026 = REVISE / owner required.
- Canonical tests: 5/5 passed; structural validator passed.
- Local browser: 79 calendar rows loaded; Instagram filter returned 21; campaign groups and Live rendered; media queue rendered 73 records.
- Buffer: not connected. `data/buffer-mapping.json` marks `dry_run_only: true` at the top level and every record `buffer_id: null, mapping_status: "NOT_MAPPED"`. No write operation executed, none possible in the current state.
- GitHub Actions run 1: data tests passed; deployment stopped at `configure-pages` because Pages was not yet enabled for the new repository.

## 2026-09-03 audit correction

This file previously carried two claims that do not check out against this repository or its data, and have been removed:

- *"Content OS regression: 235/235 passed"* and *"Content OS factory, agency and analytics validation: VALID"* — there is no Content OS code anywhere in this repository. An earlier audit in this project's history (`claude/executive-content-studio-audit.md`) already flagged an almost identical claim — a different number, 231/231 — as unverifiable against the live legacy app a day earlier. A pass count changing between sessions with no system that could have produced it either time indicates generated prose, not a real test run.
- *"Buffer: LinkedIn CONNECTED; Instagram CONNECTED"* — directly contradicted by this repo's own `data/buffer-mapping.json` (see above).

The rest of the original file was accurate and is preserved above: `npm test` genuinely passes 5/5, and `npm run validate` genuinely prints `VALID`.

## 2026-09-03 — Wave 0-4 rebuild validation

Re-run after the full UX rebuild (design system, app shell, all 14 workspaces) to confirm no regression to canonical data or editorial content:

- `npm test`: 10/10 passed (5 original data-integrity tests + 5 added for the content-library migration: calendar baseline untouched, EXISTING-record coverage exact-matches Post/Carousel/Article/News, NEW records never appear in `content_library.json`, provenance tags present, all 4 protected records unchanged).
- `npm run validate`: `VALID`.
- 79/57/21/1 (total/LinkedIn/Instagram/Live) reconfirmed unchanged.
- All 16 routes load with zero browser console errors (`build/qa_routes.py`).
- Interactive flows exercised directly (`build/qa_interactive.py`): record-drawer copy/tone-check/cover-download actions, drawer closing on Escape and on route change, the comment-tool's theme-detection → skeleton → tone-check flow, and both the page-level and sidebar global search — all functioning, zero console errors.
- Buffer and Content OS status unchanged from the correction above: still not connected, still no such system in this repository. Not claimed otherwise anywhere in the rebuilt UI (`js/record-detail.js` renders Buffer as "Não conectado (dry-run apenas)" whenever `mapping_status` is `NOT_MAPPED` or `buffer_id` is null).
