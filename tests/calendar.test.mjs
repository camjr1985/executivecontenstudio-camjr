import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const data=JSON.parse(fs.readFileSync(new URL('../data/calendar.json',import.meta.url)));const rows=data.records;
test('preserves the approved baseline and deduplicates project milestones',()=>assert.equal(rows.length,112));
test('content ids are unique',()=>assert.equal(new Set(rows.map(r=>r.content_id)).size,112));
test('channel and format coverage',()=>{assert.ok(rows.some(r=>r.channel==='Instagram'&&r.format==='Feed'));assert.ok(rows.some(r=>r.format==='Reel'));assert.ok(rows.some(r=>r.format==='Story'));assert.ok(rows.some(r=>r.channel==='Live'));assert.ok(rows.some(r=>r.format==='Article'))});
test('owner gates are preserved',()=>{for(const id of ['POST-038','POST-041','POST-026'])assert.equal(rows.find(r=>r.content_id===id).owner_approval_required,true);assert.equal(rows.find(r=>r.content_id==='POST-047').date,'2026-09-29')});
test('scheduled is not published',()=>{for(const r of rows)if(r.status==='SCHEDULED')assert.notEqual(r.publication_status,'PUBLISHED')});
test('Superando Obstáculos roadmap is complete',()=>{const project=rows.filter(r=>r.project_id==='SUPERANDO_OBSTACULOS');assert.equal(project.length,35);assert.equal(project.filter(r=>r.is_gate).length,4);assert.equal(project.filter(r=>r.title.startsWith('SO · ')).length,33);assert.ok(project.every(r=>r.campaign==='SUPERANDO_OBSTACULOS_LANCAMENTO'));assert.ok(['REV-004','REV-005'].every(id=>project.some(r=>r.content_id===id)))})
