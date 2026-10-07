import fs from 'node:fs';
const data=JSON.parse(fs.readFileSync(new URL('../data/calendar.json',import.meta.url)));
const ids=data.records.map(r=>r.content_id);const errors=[];
if(data.row_count!==112||data.records.length!==112)errors.push('ROW_COUNT');
if(new Set(ids).size!==ids.length)errors.push('DUPLICATE_ID');
for(const r of data.records){if(!/^202(6-(09|10|11|12)|7-(01|02|03))-\d{2}$/.test(r.date))errors.push(`DATE:${r.content_id}`);if(!r.title)errors.push(`TITLE:${r.content_id}`)}
for(const [id,date,decision,approval] of [['POST-038','2026-09-13','MOVE',true],['POST-041','2026-09-20','MOVE',true],['POST-047','2026-09-29','KEEP',false],['POST-026','2026-12-15','REVISE',true]]){const r=data.records.find(x=>x.content_id===id);if(!r||r.date!==date||r.decision!==decision||r.owner_approval_required!==approval)errors.push(`GATE:${id}`)}
const project=data.records.filter(r=>r.project_id==='SUPERANDO_OBSTACULOS');
if(project.length!==35)errors.push('PROJECT_MILESTONES');
if(project.filter(r=>r.is_gate).length!==4)errors.push('PROJECT_GATES');
console.log(errors.length?errors.join('\n'):'VALID');process.exitCode=errors.length?1:0;
