// Imports the Superando Obstáculos roadmap (data/projetos/superando-obstaculos.json)
// into the canonical calendar as Project/Milestone records.
// Idempotent: previously imported records are replaced, never duplicated.
// Existing editorial records are never modified, except the two canonical
// review records (REV-004, REV-005) that coincide with Portão 2 and Portão 3,
// which are linked to the project instead of being duplicated.
import fs from 'node:fs';

const calendarUrl = new URL('../data/calendar.json', import.meta.url);
const roadmapUrl = new URL('../data/projetos/superando-obstaculos.json', import.meta.url);
const SOURCE = 'data/projetos/superando-obstaculos.json';
const PROJECT_ID = 'SUPERANDO_OBSTACULOS';
const CAMPAIGN = 'SUPERANDO_OBSTACULOS_LANCAMENTO';

const calendar = JSON.parse(fs.readFileSync(calendarUrl, 'utf8'));
const roadmap = JSON.parse(fs.readFileSync(roadmapUrl, 'utf8'));
const statusMap = { feito: 'COMPLETED', hoje: 'DUE_TODAY', proximo: 'UPCOMING', planejado: 'PLANNED' };
const reuse = new Map([
  ['2026-11-30|Revisão mensal · Portão 2', 'REV-004'],
  ['2026-12-31|Revisão mensal · Portão 3', 'REV-005']
]);

const kept = calendar.records.filter(r => !r.project_imported);
const projectFields = m => ({
  campaign: CAMPAIGN,
  project_id: PROJECT_ID,
  project_front: m.frente,
  project_status: m.status,
  project_owner: m.dono,
  is_gate: Boolean(m.portao),
  source: SOURCE
});

const added = [];
const counts = new Map();
for (const m of roadmap.marcos) {
  const reuseId = reuse.get(`${m.data}|${m.titulo}`);
  if (reuseId) {
    const existing = kept.find(r => r.content_id === reuseId);
    if (!existing) throw new Error(`Canonical record not found: ${reuseId}`);
    Object.assign(existing, projectFields(m), { project_milestone_title: m.titulo });
    continue;
  }
  const seq = (counts.get(m.data) || 0) + 1;
  counts.set(m.data, seq);
  added.push({
    content_id: `SO-${m.data.replaceAll('-', '')}-${String(seq).padStart(3, '0')}`,
    date: m.data,
    time: m.hora || '',
    timezone: 'Europe/Lisbon',
    channel: 'Project',
    format: m.portao ? 'Review' : 'Milestone',
    title: `SO · ${m.titulo}`,
    status: statusMap[m.status] || 'PLANNED',
    decision: m.portao ? 'OWNER_GATE' : 'KEEP',
    owner_approval_required: Boolean(m.portao),
    publication_status: 'NOT_APPLICABLE',
    revision: 1,
    ...projectFields(m),
    project_imported: true
  });
}

calendar.records = [...kept, ...added];
calendar.row_count = calendar.records.length;
fs.writeFileSync(calendarUrl, `${JSON.stringify(calendar, null, 2)}\n`);
console.log(`Imported ${added.length} milestones, linked ${reuse.size} existing review records; calendar now has ${calendar.row_count} records.`);
