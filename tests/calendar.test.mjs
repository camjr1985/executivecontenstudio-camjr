import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const data=JSON.parse(fs.readFileSync(new URL('../data/calendar.json',import.meta.url)));const rows=data.records;
// The calendar started at a fixed 79-row baseline; it can only grow from
// there now (real owner-authored duplication), never shrink below it.
test('never drops below the approved 79-row baseline',()=>assert.ok(rows.length>=79));
test('content ids are unique',()=>assert.equal(new Set(rows.map(r=>r.content_id)).size,rows.length));
test('channel and format coverage',()=>{assert.ok(rows.some(r=>r.channel==='Instagram'&&r.format==='Feed'));assert.ok(rows.some(r=>r.format==='Reel'));assert.ok(rows.some(r=>r.format==='Story'));assert.ok(rows.some(r=>r.channel==='Live'));assert.ok(rows.some(r=>r.format==='Article'))});
test('owner gates are preserved',()=>{for(const id of ['POST-038','POST-041','POST-026'])assert.equal(rows.find(r=>r.content_id===id).owner_approval_required,true);assert.equal(rows.find(r=>r.content_id==='POST-047').date,'2026-09-29')});
test('scheduled is not published',()=>{for(const r of rows)if(r.status==='SCHEDULED')assert.notEqual(r.publication_status,'PUBLISHED')});
