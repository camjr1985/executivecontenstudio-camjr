import fs from 'node:fs';

const calendarUrl=new URL('../data/calendar.json',import.meta.url);
const roadmapUrl=new URL('../data/projetos/superando-obstaculos.json',import.meta.url);
const calendar=JSON.parse(fs.readFileSync(calendarUrl,'utf8'));
const roadmap=JSON.parse(fs.readFileSync(roadmapUrl,'utf8'));
const statusMap={feito:'COMPLETED',hoje:'DUE_TODAY',proximo:'UPCOMING',planejado:'PLANNED'};
const counts=new Map();
const duplicateMap=new Map([
  ['2026-11-30|Revisão mensal · Portão 2','REV-004'],
  ['2026-12-31|Revisão mensal · Portão 3','REV-005']
]);
const baseline=calendar.records.filter(r=>r.project_id!=='SUPERANDO_OBSTACULOS'||duplicateMap.has(`${r.date}|${r.project_milestone_title||''}`));
const milestones=[];
for(const m of roadmap.marcos){
  const duplicateId=duplicateMap.get(`${m.data}|${m.titulo}`);
  if(duplicateId){
    const existing=baseline.find(r=>r.content_id===duplicateId);
    if(!existing)throw new Error(`Canonical duplicate not found: ${duplicateId}`);
    Object.assign(existing,{
      campaign:'SUPERANDO_OBSTACULOS_LANCAMENTO',project_id:'SUPERANDO_OBSTACULOS',project_front:m.frente,
      project_status:m.status,project_milestone_title:m.titulo,owner:m.responsavel,is_gate:Boolean(m.portao),
      owner_approval_required:Boolean(m.portao),source:'data/projetos/superando-obstaculos.json'
    });
    continue;
  }
  const sequence=(counts.get(m.data)||0)+1;
  counts.set(m.data,sequence);
  const dateKey=m.data.replaceAll('-','');
  milestones.push({
    content_id:`SO-${dateKey}-${String(sequence).padStart(3,'0')}`,
    date:m.data,
    time:m.hora,
    timezone:'Europe/Lisbon',
    channel:'Project',
    format:m.portao?'Review':'Milestone',
    title:`SO · ${m.titulo}`,
    status:statusMap[m.status]||'PLANNED',
    decision:m.portao?'OWNER_GATE':'KEEP',
    owner_approval_required:Boolean(m.portao),
    publication_status:'NOT_APPLICABLE',
    revision:1,
    campaign:'SUPERANDO_OBSTACULOS_LANCAMENTO',
    project_id:'SUPERANDO_OBSTACULOS',
    project_front:m.frente,
    project_status:m.status,
    owner:m.responsavel,
    is_gate:Boolean(m.portao),
    source:'data/projetos/superando-obstaculos.json',
    project_imported:true
  });
}
calendar.records=[...baseline,...milestones].sort((a,b)=>a.date.localeCompare(b.date)||String(a.time||'').localeCompare(String(b.time||''))||a.content_id.localeCompare(b.content_id));
calendar.row_count=calendar.records.length;
calendar.project_sources=[...new Set([...(calendar.project_sources||[]),'data/projetos/superando-obstaculos.json'])];
fs.writeFileSync(calendarUrl,`${JSON.stringify(calendar,null,2)}\n`);
console.log(`Imported ${milestones.length} new milestones and reused ${duplicateMap.size} canonical records; calendar now has ${calendar.row_count} records.`);
