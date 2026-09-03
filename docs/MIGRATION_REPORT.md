# Migration report

- Editorial source: `ECS_Master_Calendar_Sep-Dec2026_FINAL_REVIEW.xlsx`.
- Validated: seven expected sheets, 79 master rows, 41 existing and 38 new records, unique IDs and exact Content Index parity.
- Legacy Netlify: copied read-only into `legacy-netlify-snapshot/`; not modified.
- Canonical data: `data/calendar.json`; every normalized record retains the complete workbook row in `source_record`.
- Pending owner decisions remain represented by `owner_approval_required=true` and are not approvals.
- GitHub Pages workflow validates the dataset and tests before deployment.
- Initial workflow confirmed tests and validation pass. **Update (2026-09-03 audit):** Pages enablement is no longer pending — GitHub Pages is live at `camjr1985.github.io/executivecontenstudio-camjr/` and serving the current build, confirmed directly rather than assumed.
