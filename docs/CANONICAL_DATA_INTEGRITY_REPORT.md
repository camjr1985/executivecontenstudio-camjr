# Canonical data integrity report

Confirms that the Wave 0–4 UX rebuild changed how the 79 canonical records are *displayed* and never touched the records themselves. Every figure below was read directly from `data/calendar.json` and the supporting datasets during this session, not carried forward from prior claims.

## Baseline, reconfirmed unchanged

| Metric | Value |
|---|---|
| Total canonical records | 79 |
| LinkedIn | 57 |
| Instagram | 21 |
| Live | 1 |
| EXISTING (has real legacy provenance) | 41 |
| NEW (no approved full copy yet) | 38 |

By format: Post 40, Story 9, Feed 7, Article 6, Carousel 5, Reel 5, Review 4, News 2, Live Event 1 — sums to 79.

`data/calendar.json` was read but never written by any file in this rebuild. Every view module (`js/views/*.js`) only reads `store.records`, produced by `js/data.js`'s `loadStore()`, which fetches the JSON files and joins supporting data on top — it does not mutate the source objects it fetches, and there is no save/write path anywhere in the frontend. Confirmed with `node --test` (`tests/content_library.test.mjs`, 10/10 passing) and `npm run validate` (`VALID`) after every wave, most recently after this session's final fix.

## Protected records — verified unchanged

The four explicitly protected editorial decisions were re-read directly from `data/calendar.json` in this session and match the recorded decisions exactly:

- **POST-038** — MOVE to 2026-09-13, owner approval required, rationale preserved verbatim (topical overlap with POST-034, pre-Live touchpoint).
- **POST-041** — MOVE to 2026-09-20, owner approval required, rationale preserved verbatim (distribution-window courtesy, not cannibalization).
- **POST-047** — KEEP on 2026-09-29, no owner gate, rationale preserved verbatim (reverted from an earlier MOVE recommendation).
- **POST-026** — REVISE, 2026-12-15, owner approval required, rationale preserved verbatim, copy intentionally not rewritten per instruction.

None of these fields, nor any `rationale`, `decision`, or `original_date` value elsewhere in the 79 records, were altered by this rebuild.

## What the rebuild added, and how it stays honest

- **Legacy copy migration** (`build/migrate_legacy_content.mjs` → `data/content_library.json`, 37 records): joins real legacy Post/Carousel/Article/News copy onto EXISTING records by `content_id`. `tests/content_library.test.mjs` asserts (a) coverage is exact — every EXISTING Post/Carousel/Article/News record has a library entry and no extra ones exist, (b) NEW records never appear in `content_library.json` at all, so no NEW record can accidentally pick up copy, and (c) all four protected records are byte-for-byte unchanged.
- **Placeholder-title display fix** (`displayTitle()` in `js/components.js`): a small number of EXISTING records carry a literal bracketed placeholder as their canonical `title` (e.g. `"(existing — Cloud)"`, `"(existing — monthly review)"`) even though the real legacy title is available via the joined copy. `displayTitle()` substitutes the real title *for display only* when the canonical title matches that placeholder pattern and real copy exists — `calendar.json`'s `title` field itself is never modified, and the substitution never fires for a NEW record (which has no joined copy to substitute from).
- **Monthly review titles**: the same placeholder pattern appears on 3 of the 4 monthly-review records (REV-003/004/005). `js/data.js` now also joins `data/monthly_reviews.json` by `id` so `displayTitle()` can resolve these the same way — verified directly: the calendar List view now shows "Revisão de outubro — validar números" etc. instead of the literal placeholder string.
- **Placeholder time display** (`isPlaceholderValue()`/`displayTime()` in `js/lib/util.js`): the Live record's `time` field is genuinely the string `"TBD_OWNER"` in canonical data — an intentional "not invented" placeholder, not a data bug. The UI now renders "horário a confirmar" instead of the raw token, without changing the underlying field.
- **Content cascade** (`childrenOf()` in `js/data.js`): CAMPAIGN → POST → STORY → REEL → LIVE → POST-LIVE visualizations (Campanhas, Lives, Article derivatives) are built exclusively from the `parent_content_id` field already present in the canonical data — 23 records carry a non-null value. No relationship is inferred or invented from theme, date proximity, or campaign name matching.
- **Zero-fabrication status counts** (`operationalCounts()` in `js/data.js`): Hoje's stat row reads real `status`/`media_status`/`owner_approval_required` values with strict equality checks. The real status vocabulary in this dataset (`DRAFT`/`PROPOSED`/`CONFIRMED`/`NOT_APPLICABLE`) contains no `APPROVED` or `READY` records today, so those two stats correctly show 0 — the UI does not repurpose an adjacent status to avoid an honest zero.
- **Buffer and "Content OS"**: `data/buffer-mapping.json` carries `dry_run_only: true` and every record `buffer_id: null, mapping_status: "NOT_MAPPED"`. The rebuilt drawer (`js/record-detail.js`) renders this as "Não conectado (dry-run apenas)" for every record. No component anywhere in the new codebase claims a Buffer connection or references a "Content OS" system — there is no such system in this repository.

## Verification run (this session, post-rebuild)

- `npm test` — 10/10 passed.
- `npm run validate` — `VALID`.
- 79/57/21/1 reconfirmed by direct read of `data/calendar.json`.
- All 4 protected records re-read and confirmed unchanged (above).
- All 16 routes load with zero console errors (`build/qa_routes.py`).
- Interactive flows (drawer copy/tone-check/cover download, drawer-close-on-navigation, comment-tool analyze flow, global and page search) exercised end to end with zero console errors (`build/qa_interactive.py`).
