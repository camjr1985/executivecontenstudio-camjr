import { esc, isPlaceholderValue } from '../lib/util.js';
import { emptyState } from '../components.js';
import { todayISO } from '../data.js';
import { pageHead, openRecordDrawer } from './_shared.js';

// Projects area, rendered inside the app like every other view (#/projects).
// Milestones are read from the canonical calendar (records with project_id),
// so an edit made through Fonte & Governança shows up here too. Fronts,
// phases and gates come from the project's roadmap file.
const PROJECTS = [
  { id: 'superando-obstaculos', projectId: 'SUPERANDO_OBSTACULOS', name: 'Superando Obstáculos', source: 'data/projetos/superando-obstaculos.json' }
];

const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const fmt = (iso) => { const [, m, d] = iso.split('-'); return `${d}/${MES[+m - 1]}`; };
const roadmapCache = new Map();

async function loadRoadmap(p) {
  if (!roadmapCache.has(p.id)) {
    const res = await fetch(p.source, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    roadmapCache.set(p.id, await res.json());
  }
  return roadmapCache.get(p.id);
}

function milestonesOf(store, p, roadmap) {
  return store.records
    .filter(r => r.project_id === p.projectId)
    .map(r => {
      const fromRoadmap = (roadmap.marcos || []).find(m => m.data === r.date && !!m.portao === !!r.is_gate && (r.title || '').includes(m.titulo));
      const gateTitle = r.is_gate ? (roadmap.marcos || []).find(m => m.portao && m.data === r.date)?.titulo : null;
      const title = (r.title || '').startsWith('SO · ') ? r.title.slice(5) : (gateTitle || fromRoadmap?.titulo || r.title);
      return { id: r.content_id, date: r.date, time: isPlaceholderValue(r.time) || !r.time ? '' : r.time, front: r.project_front, owner: r.project_owner || '—', gate: !!r.is_gate, status: r.project_status, title };
    })
    .sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1));
}

// Status shown on screen: "feito" comes from the record; the rest follows today's date.
function liveStatus(m, today) {
  if (m.status === 'feito') return 'feito';
  if (m.date === today) return 'hoje';
  if (m.date < today) return 'atraso';
  const in7 = new Date(today + 'T12:00:00'); in7.setDate(in7.getDate() + 7);
  return m.date <= in7.toISOString().slice(0, 10) ? 'proximo' : 'planejado';
}
const LABEL = { feito: 'Feito', hoje: 'Hoje', atraso: 'Em aberto', proximo: 'Próximo', planejado: 'Planejado' };
const BADGE = { feito: 'ok', hoje: 'warn', atraso: 'danger', proximo: 'blue', planejado: '' };

export async function renderProjects(root, store, navigate) {
  const today = todayISO();
  root.innerHTML = pageHead('Planeamento', 'Projetos', 'Roadmaps de projeto ligados ao calendário canónico. Clique num projeto para ver fases, portões e marcos.') +
    `<div class="grid" id="pjGrid"></div>`;
  const grid = document.getElementById('pjGrid');
  grid.innerHTML = PROJECTS.map(p => {
    const ms = store.records.filter(r => r.project_id === p.projectId);
    const done = ms.filter(r => r.project_status === 'feito').length;
    const next = ms.filter(r => r.date >= today && r.project_status !== 'feito').sort((a, b) => a.date < b.date ? -1 : 1)[0];
    return `<article class="card" data-open-project="${esc(p.id)}" style="cursor:pointer">
      <div class="card-body">
        <div class="badge-row"><span class="badge kind">📁 Projeto</span><span class="badge gold">${ms.filter(r => r.is_gate).length} portões</span></div>
        <h3>${esc(p.name)}</h3>
        <p>${ms.length} marcos · ${done} feitos${next ? ` · próximo: ${esc(fmt(next.date))} ${esc((next.title || '').replace(/^SO · /, ''))}` : ''}</p>
      </div>
    </article>`;
  }).join('') || emptyState('Nenhum projeto no calendário canónico.', '📁');
  grid.querySelectorAll('[data-open-project]').forEach(el => el.addEventListener('click', () => navigate('#/projects/' + el.getAttribute('data-open-project'))));
}

export async function renderProjectDetail(root, store, navigate, id) {
  const p = PROJECTS.find(x => x.id === id);
  const back = `<a class="btn ghost small" href="#/projects">← Voltar a Projetos</a>`;
  if (!p) { root.innerHTML = back + emptyState('Projeto não encontrado.', '📁'); return; }

  root.innerHTML = back + `<div class="empty-state">A carregar o roadmap…</div>`;
  let roadmap;
  try { roadmap = await loadRoadmap(p); }
  catch (err) { root.innerHTML = back + emptyState(`Não foi possível carregar o roadmap (${esc(err.message)}).`, '⚠️'); return; }
  if (location.hash !== '#/projects/' + id) return; // user navigated away meanwhile

  const today = todayISO();
  const all = milestonesOf(store, p, roadmap).map(m => ({ ...m, live: liveStatus(m, today) }));
  const in7 = new Date(today + 'T12:00:00'); in7.setDate(in7.getDate() + 7);
  const lim = in7.toISOString().slice(0, 10);
  const months = [...new Set(all.map(m => m.date.slice(0, 7)))].sort();
  let who = 'todos';

  const item = (m) => `<div class="pj-item" data-pj-open="${esc(m.id)}">
      <span class="pj-d">${fmt(m.date)}${m.time ? ' ' + esc(m.time) : ''}</span>
      <div><div>${m.gate ? '◆ ' : ''}${esc(m.title)} <span class="badge ${BADGE[m.live]}">${LABEL[m.live]}</span></div><div class="pj-who">${esc(m.owner)}</div></div>
    </div>`;
  const focusCols = [
    ['Em aberto', all.filter(m => m.live === 'atraso')],
    ['Hoje', all.filter(m => m.live === 'hoje')],
    ['Próximos 7 dias', all.filter(m => m.date > today && m.date <= lim && m.live !== 'feito')]
  ].filter(([h, l]) => l.length || h !== 'Em aberto');

  root.innerHTML = back + `<div id="pjDetail">` +
    pageHead('Projeto', p.name, roadmap.objetivo || '') +
    `<p class="pj-meta">${all.length} marcos · ${all.filter(m => m.live === 'feito').length} feitos · clique num marco para abrir o registo no calendário.</p>

    <h4 class="pj-h">Foco desta semana</h4>
    <div class="pj-focus">${focusCols.map(([h, list]) => `<div class="pj-col"><div class="pj-col-h">${h}</div>${list.length ? list.map(item).join('') : '<div class="pj-who">Nada aqui.</div>'}</div>`).join('')}</div>

    <h4 class="pj-h">Fases e portões</h4>
    <div class="pj-phases">${(roadmap.fases || []).map(f => {
      const now = today >= f.inicio && today <= f.fim;
      return `<div class="pj-phase${now ? ' now' : ''}"><b>${esc(f.nome)}</b><span class="pj-d">${fmt(f.inicio)} – ${fmt(f.fim)}${now ? ' · em curso' : ''}</span><span class="pj-gate">◆ ${esc(f.portao)}</span></div>`;
    }).join('')}</div>

    <h4 class="pj-h">Roadmap por frente</h4>
    <div class="chip-row" id="pjWho">${[['todos', 'Todos'], ['Carlos', 'Carlos'], ['Claude', 'Claude']].map(([v, t]) => `<button class="chip${v === 'todos' ? ' active' : ''}" data-who="${v}">${t}</button>`).join('')}</div>
    <div class="table-wrap pj-board-wrap"><table class="pj-board" id="pjBoard"></table></div>
    <p class="pj-meta">◆ portão de revisão · metas de portão são de planeamento.</p></div>`;

  function drawBoard() {
    const ms = all.filter(m => who === 'todos' || m.owner.includes(who));
    let h = `<thead><tr><th>Frente</th>${months.map(k => { const [y, mo] = k.split('-'); return `<th class="${today.startsWith(k) ? 'cur' : ''}">${MES[+mo - 1]} ${y.slice(2)}</th>`; }).join('')}</tr></thead><tbody>`;
    for (const f of roadmap.frentes || []) {
      h += `<tr><td class="pj-lane">${esc(f.nome)}</td>`;
      for (const k of months) {
        const cell = ms.filter(m => m.front === f.id && m.date.startsWith(k));
        h += `<td>${cell.map(m => `<span class="pj-chip ${m.gate ? 'gate' : m.live}" data-pj-open="${esc(m.id)}" title="${esc(m.owner)}"><span class="pj-dd">${m.date.slice(8)}</span>${m.gate ? '◆ ' : ''}${esc(m.title)}</span>`).join('')}</td>`;
      }
      h += '</tr>';
    }
    document.getElementById('pjBoard').innerHTML = h + '</tbody>';
  }
  drawBoard();

  root.querySelector('#pjWho').addEventListener('click', (e) => {
    const b = e.target.closest('[data-who]'); if (!b) return;
    who = b.getAttribute('data-who');
    root.querySelectorAll('#pjWho .chip').forEach(c => c.classList.toggle('active', c === b));
    drawBoard();
  });
  const detail = root.querySelector('#pjDetail');
  detail.addEventListener('click', (e) => {
    const el = e.target.closest('[data-pj-open]');
    if (el) openRecordDrawer(store, el.getAttribute('data-pj-open'));
  });
}
