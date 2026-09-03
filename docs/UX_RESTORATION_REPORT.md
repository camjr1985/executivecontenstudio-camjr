# UX restoration report

Wave 0–4 rebuild of the Executive Content Studio frontend, modeled on the legacy Netlify app (`legacy-netlify-snapshot/`, verified as a byte-accurate copy of the live `executivecontenstudio.netlify.app`) as the functional and visual reference, built on top of the GitHub-canonical architecture. GitHub stays the sole source of truth; `data/calendar.json` was never modified; the 79 existing records remain editorially intact (see `docs/CANONICAL_DATA_INTEGRITY_REPORT.md`).

## What was replaced

The previous frontend (`index.html`/`js/app.js`/`css/styles.css` as they existed before this session) was a minimal 4-route shell — Visão geral / Calendário / Campanhas / Produção, flat HTML tables, no sidebar. It was real, working code, but implemented none of the legacy app's actual information architecture. It has been fully rebuilt rather than patched.

## Wave 0 — Foundation

Design system (`css/styles.css`) and app shell (`index.html`, `js/app.js`): navy / cream-warm-white / restrained-gold palette, Fraunces for editorial serif headings, Inter for body text, IBM Plex Mono for identifiers and timestamps. Sidebar reorganized into six grouped sections (Conteúdo, Engajamento, Planeamento, Operação, Ferramentas, plus Hoje standalone at top) rather than one flat list. Shared primitives — badges, cards, the drawer/scrim system, empty states — live once in `js/components.js` and are reused by every workspace, so the "everything is a table" failure mode from the prior build cannot recur piecemeal per page.

## Wave 1 — Daily Operation (the experience validated first)

- **Hoje**: cockpit answering, from real data only, what's scheduled today, what needs review, what needs media, what's approved, what's ready, and what's blocked on an owner gate. Also surfaces the featured upcoming Live and the next 6 items.
- **Calendário**: Month view (default) and List view (the legacy app's detailed table, preserved) with channel/format/campaign/Live filters.
- **Produção**: the one deliberate table exception — a filterable readiness/media/QC/approval/publication-state view. No publish action exists anywhere in the UI; publication state is read-only and reflects real governance fields.

## Wave 2 — Editorial Libraries

Posts, Carrosséis, Artigos share one generic library workspace (`js/views/library.js`) with theme/status/copy-migrated filters; Notícias gets its own reserve-slot workspace (`js/views/news.js`) that frames every item as an unconfirmed reserved slot. The 41 EXISTING records show their real migrated legacy copy (hook, body, slides, CTA, hashtags — joined via `data/content_library.json`); the 38 NEW records show an explicit "copy ainda não redigida" state. No NEW record has ever had copy generated or guessed for it anywhere in this rebuild.

## Wave 3 — Campaign & Authority

Campanhas (grid + detail, covering Superando Obstáculos, PPL Portugal, and Catarse Brasil), Lives (pré/durante/pós cascade columns around each confirmed Live — the 2026-09-14 Live is immediately visible via Hoje's "Live em destaque" panel and its own workspace), Comentários (saved comment bank), and Sugestões de Comentário (paste a post, get its theme detected, matching saved comments and adaptable skeleton structures, then tone-check before copying — never auto-writes or auto-saves a comment). Every cascade (CAMPAIGN → POST → STORY → REEL → LIVE → POST-LIVE) renders only real `parent_content_id` relationships already present in the 79 records; 23 such relationships exist and none were invented.

## Wave 4 — Governance & Knowledge

Revisões Mensais (list + detail, with explicit "DATA UNAVAILABLE" badges on any checklist item this app has no metrics source for, rather than fabricating a number), Banco de Ideias (grouped by theme), Pesquisa Global (full-text across records/comments/ideas, reachable from its own page or the sidebar's quick-search field), Guia de Escrita (static reference), and Fonte & Governança — the read-only replacement for the legacy's insecure local "Gerir Conteúdo" editor. It shows repository/protected-records/governance-flag state and offers an export-only JSON download; there is no local create/edit/delete surface anywhere, since GitHub remains the only canonical writer. Categorias was folded into the existing theme filters on the library and calendar views rather than given its own page.

## Legacy functions deliberately not restored as-is

Per explicit agreement before implementation began:

- No local CRUD/localStorage persistence layer — GitHub stays canonical, and there is no save path in this frontend at all.
- No "mark published" toggle — publication state is read-only and reflects real governance fields (`publication_status`, `qc_status`, etc.), never a manual override.
- No insecure local content editor — replaced by the read-only Fonte & Governança view.

## Final local QA (completed this session)

- Visual comparison against the legacy Netlify app across all main workspaces (screenshots reviewed at three desktop breakpoints — 1440, 1366, 1920 — plus mobile).
- All 16 routes load with zero relevant browser console errors (`build/qa_routes.py`; the one filtered false-positive is the sandbox's own Google Fonts egress block, unrelated to the app).
- Month and List calendar views both verified, including the column-overflow bug found and fixed (`.cal-grid` needed explicit `minmax(0,1fr)` and `min-width:0` — long event titles were collapsing the grid to 2 of 7 columns).
- Drawer system verified: opens per record, closes on Escape, and — critically — closes on every route change (a real bug found and fixed: the router wasn't calling `closeDrawer()`, so a drawer opened on one page could block clicks on the next).
- Search/filter verified on the library toolbar, the dedicated Pesquisa page, and the sidebar's global quick-search (Enter routes to `/search/<query>` with real matching results).
- Copy correctness verified: EXISTING records show real legacy text via `displayTitle()`/joined copy; NEW records never show invented text; two placeholder-title bugs were found and fixed (bracketed titles like `"(existing — Cloud)"` on migrated Post/Carousel/Article/News/Review records, and the literal `"TBD_OWNER"` placeholder token on the Live record's time field).
- Media/cover access verified: deterministic hash-based SVG covers render for every record with no external image dependency; cover download exercised via Playwright and confirmed producing a real `.svg` file.
- Empty states verified across News, Ideas, and cascade panels where no data exists.
- Desktop reviewed at 1440/1366/1920; responsive reviewed at 390×844 (mobile), including the sidebar's slide-in/out behavior.
- Interactive flows exercised end to end via Playwright, not just static route loads: record-drawer copy/tone-check/cover actions on a record with real copy, the comment-tool's theme-detection → skeleton-suggestion → tone-check → clipboard-copy flow, and both search entry points — all clean, zero console errors.
- Data integrity reconfirmed after every fix: `npm test` 10/10, `npm run validate` VALID, 79/57/21/1 unchanged, all 4 protected records unchanged (full detail in `docs/CANONICAL_DATA_INTEGRITY_REPORT.md`).

## Status

| Field | Value |
|---|---|
| CANONICAL_CALENDAR_RECORDS | 79 (LinkedIn 57, Instagram 21, Live 1) |
| LEGACY_EXISTING_WITH_FULL_COPY | 41 |
| NEW_WITHOUT_APPROVED_FULL_COPY | 38 |
| BUFFER_PUBLICATION | NOT CONNECTED — verified against `data/buffer-mapping.json` (`dry_run_only: true`, all records `NOT_MAPPED`) |
| CONTENT_OS_TESTS | NOT VERIFIABLE — no Content OS system exists in this repository; prior claims removed from `docs/TEST_REPORT.md` |
| PUBLICATION_ENABLED | false — no publish action exists in the UI |
| WRITE_MODE | CONTROLLED — no write path from the frontend to GitHub exists; all writeback stays manual and owner-approved |
| AUTO_PUBLISH | false |
| GITHUB_PAGES | live at `camjr1985.github.io/executivecontenstudio-camjr/`, serving the pre-rebuild scaffold until this work is pushed |
| PUSH_STATUS | Blocked pending repository authorization via the platform's credential-proxy mechanism; all Wave 0–4 work committed locally in 7 logical per-wave commits, ready to push once authorized |
