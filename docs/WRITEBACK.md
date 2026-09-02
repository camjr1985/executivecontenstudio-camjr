# Secure Content OS writeback

Content OS reads `data/calendar.json` from GitHub Pages/raw GitHub. Writes use the GitHub Git Data API from a trusted local process with a fine-grained token stored only in the operating-system secret environment. The token must be restricted to this repository and `Contents: Read and write`.

One commit atomically updates `data/calendar.json` and appends one line to `audit/events.jsonl`. Requests carry `CONTENT_ID`, expected record revision, operation, idempotency key and evidence. The updater rejects unknown IDs, duplicate/conflicting idempotency keys, skipped lifecycle states and every transition from `PUBLISHED` to an earlier state.

`PUBLISHED` requires provider evidence: external ID, provider status confirming publication, real timestamp, verification timestamp, evidence hash and permalink when supplied. A Buffer scheduling response can produce only `SCHEDULED`.

Never place credentials in frontend files, JSON data, commits, reports or logs.
