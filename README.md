# Executive Content Studio

GitHub-backed canonical editorial calendar for Carlos Alexandre Marques Junior.

- Canonical data: `data/calendar.json`
- Schema: `schemas/calendar.schema.json`
- Audit schema: `schemas/audit.schema.json`
- Frontend: static GitHub Pages app
- Legacy reference: `legacy-netlify-snapshot/`
- Superando Obstáculos roadmap: `data/projetos/superando-obstaculos.json` (import with `node build/import_project_roadmap.mjs`)
- Standalone project view: `projetos/superando-obstaculos.html`

The campaign `SUPERANDO_OBSTACULOS_LANCAMENTO` covers 6 October 2026 to 31 March 2027. Its 35 milestones live in the canonical calendar with channel `Project`: 33 new records use the `SO ·` prefix and IDs `SO-YYYYMMDD-NNN`, and the existing review records REV-004 and REV-005 are linked instead of duplicated. The four phase gates carry `is_gate: true`; new gate records require owner approval.

Run `npm test` and `npm run validate` before changes. Publication, Buffer scheduling and owner approval are outside this frontend.
