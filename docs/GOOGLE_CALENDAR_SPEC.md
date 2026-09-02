# Google Calendar integration specification

Not implemented in this phase. After owner approval, sync canonical calendar records one-way to a dedicated Google Calendar using `CONTENT_ID` as the private extended property and `revision` for reconciliation. Create/update only approved, date-bound events; never treat a Google event as publication approval. Store the Google event ID in a separate integration registry, use OAuth least privilege, preserve `Europe/Lisbon`, and audit every sync. Lives with `TBD_OWNER` time remain blocked.
