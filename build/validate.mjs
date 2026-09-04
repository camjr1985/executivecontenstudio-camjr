import fs from 'node:fs';
const data=JSON.parse(fs.readFileSync(new URL('../data/calendar.json',import.meta.url)));
const ids=data.records.map(r=>r.content_id);const errors=[];
// The calendar started at a fixed 79-row migrated baseline, but the app now
// supports real owner-authored growth (duplicating a record to another
// channel), so the count itself is no longer pinned -- what still must hold
// is that row_count accurately reflects the file's own record count, and
// that it never drops below the original baseline (rows shouldn't vanish).
if(data.records.length<79)errors.push('ROW_COUNT_BELOW_BASELINE');
if(data.row_count!==data.records.length)errors.push('ROW_COUNT_MISMATCH');
if(new Set(ids).size!==ids.length)errors.push('DUPLICATE_ID');
for(const r of data.records){if(!/^2026-(09|10|11|12)-\d{2}$/.test(r.date))errors.push(`DATE:${r.content_id}`);if(!r.title)errors.push(`TITLE:${r.content_id}`)}
for(const [id,date,decision,approval] of [['POST-038','2026-09-13','MOVE',true],['POST-041','2026-09-20','MOVE',true],['POST-047','2026-09-29','KEEP',false],['POST-026','2026-12-15','REVISE',true]]){const r=data.records.find(x=>x.content_id===id);if(!r||r.date!==date||r.decision!==decision||r.owner_approval_required!==approval)errors.push(`GATE:${id}`)}
console.log(errors.length?errors.join('\n'):'VALID');process.exitCode=errors.length?1:0;
