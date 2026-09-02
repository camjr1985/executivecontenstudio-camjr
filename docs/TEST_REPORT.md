# Test report — migration baseline

- Workbook: seven expected sheets; 79 Master Calendar rows; 41 existing; 38 new; no missing or duplicate Content IDs; Content Index set equals Master Calendar set.
- Editorial gates: POST-038 = MOVE to 2026-09-13 / owner required; POST-041 = MOVE to 2026-09-20 / owner required; POST-047 = KEEP on 2026-09-29; POST-026 = REVISE / owner required.
- Canonical tests: 5/5 passed; structural validator passed.
- Content OS regression: 235/235 passed.
- Content OS factory, agency and analytics validation: VALID.
- Local browser: 79 calendar rows loaded; Instagram filter returned 21; campaign groups and Live rendered; media queue rendered 73 records.
- Buffer: LinkedIn CONNECTED; Instagram CONNECTED; WRITE_MODE CONTROLLED. No write operation executed.
- GitHub Actions run 1: data tests passed; deployment stopped at `configure-pages` because Pages was not yet enabled for the new repository.
