import { esc } from '../lib/util.js';
import { emptyState, openDrawer, drawerShell } from '../components.js';
import { todayISO } from '../data.js';
import { pageHead } from './_shared.js';

// "Projetos Digitais" (#/digital-projects) -- roadmap of the new digital
// income projects. Same look as the "Projetos" view (reuses its .pj-*
// classes), but self-contained: everything comes from its own file,
// data/projetos/projetos-digitais.json, so calendar.json and the existing
// Projetos view are never touched. To mark a milestone as done, set its
// "status" to "feito" in that JSON file.
const SOURCE = 'data/projetos/projetos-digitais.json';
const ROUTE = '#/digital-projects';

const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const fmt = (iso) => { const [, m, d] = iso.split('-'); return `${d}/${MES[+m - 1]}`; };
let cache = null;

async function loadRoadmap() {
  if (!cache) {
    const res = await fetch(SOURCE, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    cache = await res.json();
  }
  return cache;
}

// Same rule as the Projetos view: "feito" comes from the file; the rest
// follows today's date.
function liveStatus(m, today) {
  if (m.status === 'feito') return 'feito';
  if (m.date === today) return 'hoje';
  if (m.date < today) return 'atraso';
  const in7 = new Date(today + 'T12:00:00'); in7.setDate(in7.getDate() + 7);
  return m.date <= in7.toISOString().slice(0, 10) ? 'proximo' : 'planejado';
}
const LABEL = { feito: 'Feito', hoje: 'Hoje', atraso: 'Em aberto', proximo: 'Próximo', planejado: 'Planejado' };
const BADGE = { feito: 'ok', hoje: 'warn', atraso: 'danger', proximo: 'blue', planejado: '' };
const STATE_BADGE = { 'Em validação': 'warn', 'Em construção': 'blue', 'Lançado': 'ok', 'Em escala': 'ok', 'Em espera': 'danger' };

export async function renderDigitalProjects(root, store, navigate) {
  root.innerHTML = `<div class="empty-state">A carregar o roadmap…</div>`;
  let roadmap;
  try { roadmap = await loadRoadmap(); }
  catch (err) { root.innerHTML = emptyState(`Não foi possível carregar o roadmap (${esc(err.message)}).`, '⚠️'); return; }
  if (location.hash !== ROUTE) return; // user navigated away meanwhile

  const today = todayISO();
  const frontName = Object.fromEntries((roadmap.frentes || []).map(f => [f.id, f.nome]));
  const all = (roadmap.marcos || [])
    .map((m, i) => ({ id: String(i), date: m.data, time: m.hora || '', front: m.frente, owner: m.dono || '—', gate: !!m.portao, status: m.status, title: m.titulo }))
    .sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1))
    .map(m => ({ ...m, live: liveStatus(m, today) }));
  const byId = new Map(all.map(m => [m.id, m]));
  const in7 = new Date(today + 'T12:00:00'); in7.setDate(in7.getDate() + 7);
  const lim = in7.toISOString().slice(0, 10);
  const months = [...new Set(all.map(m => m.date.slice(0, 7)))].sort();
  let who = 'todos';

  const item = (m) => `<div class="pj-item" data-dp-open="${esc(m.id)}">
      <span class="pj-d">${fmt(m.date)}${m.time ? ' ' + esc(m.time) : ''}</span>
      <div><div>${m.gate ? '◆ ' : ''}${esc(m.title)} <span class="badge ${BADGE[m.live]}">${LABEL[m.live]}</span></div><div class="pj-who">${esc(frontName[m.front] || '')} · ${esc(m.owner)}</div></div>
    </div>`;
  const focusCols = [
    ['Em aberto', all.filter(m => m.live === 'atraso')],
    ['Hoje', all.filter(m => m.live === 'hoje')],
    ['Próximos 7 dias', all.filter(m => m.date > today && m.date <= lim && m.live !== 'feito')]
  ].filter(([h, l]) => l.length || h !== 'Em aberto');

  const planLink = roadmap.plano ? `<a class="btn small" href="${esc(roadmap.plano)}" target="_blank" rel="noopener">Plano completo ↗</a>` : '';

  root.innerHTML = `<div id="dpDetail">` +
    pageHead('Planeamento', 'Projetos Digitais', roadmap.objetivo || '', planLink) +
    `<p class="pj-meta">${(roadmap.projetos || []).length} projetos · ${all.length} marcos · ${all.filter(m => m.live === 'feito').length} feitos · atualizado ${esc(roadmap.atualizado || '')}.</p>

    <h4 class="pj-h">Projetos</h4>
    <div class="grid">${(roadmap.projetos || []).map(p => `<article class="card dp-card">
      <div class="card-body">
        <div class="badge-row"><span class="badge kind">${esc(p.icone || '🚀')} Projeto</span><span class="badge ${STATE_BADGE[p.estado] || ''}">${esc(p.estado || '')}</span></div>
        <h3>${esc(p.nome)}</h3>
        <p>${esc(p.oferta || '')}</p>
        <div class="dp-row"><span>Preço</span><b>${esc(p.preco || '—')}</b></div>
        <div class="dp-row"><span>◆ Portão</span><b>${esc(p.portao || '—')}</b></div>
        <div class="dp-row"><span>Meta set/27</span><b>${esc(p.meta || '—')}</b></div>
      </div>
    </article>`).join('')}</div>

    <h4 class="pj-h">Foco desta semana</h4>
    <div class="pj-focus">${focusCols.map(([h, list]) => `<div class="pj-col"><div class="pj-col-h">${h}</div>${list.length ? list.map(item).join('') : '<div class="pj-who">Nada aqui.</div>'}</div>`).join('')}</div>

    <h4 class="pj-h">Fases e portões</h4>
    <div class="pj-phases">${(roadmap.fases || []).map(f => {
      const now = today >= f.inicio && today <= f.fim;
      return `<div class="pj-phase${now ? ' now' : ''}"><b>${esc(f.nome)}</b><span class="pj-d">${fmt(f.inicio)} – ${fmt(f.fim)}${now ? ' · em curso' : ''}</span><span class="pj-gate">◆ ${esc(f.portao)}</span></div>`;
    }).join('')}</div>

    <h4 class="pj-h">Roadmap por projeto</h4>
    <div class="chip-row" id="dpWho">${[['todos', 'Todos'], ['Carlos', 'Carlos'], ['Claude', 'Claude']].map(([v, t]) => `<button class="chip${v === 'todos' ? ' active' : ''}" data-who="${v}">${t}</button>`).join('')}</div>
    <div class="table-wrap pj-board-wrap"><table class="pj-board dp-board" id="dpBoard"></table></div>
    <p class="pj-meta" style="margin-top:10px">◆ portão de validação · metas são de planeamento, a rever em cada portão.</p></div>`;

  function drawBoard() {
    const ms = all.filter(m => who === 'todos' || m.owner.includes(who));
    let h = `<thead><tr><th>Projeto</th>${months.map(k => { const [y, mo] = k.split('-'); return `<th class="${today.startsWith(k) ? 'cur' : ''}">${MES[+mo - 1]} ${y.slice(2)}</th>`; }).join('')}</tr></thead><tbody>`;
    for (const f of roadmap.frentes || []) {
      h += `<tr><td class="pj-lane">${esc(f.nome)}</td>`;
      for (const k of months) {
        const cell = ms.filter(m => m.front === f.id && m.date.startsWith(k));
        h += `<td>${cell.map(m => `<span class="pj-chip ${m.gate ? 'gate' : m.live}" data-dp-open="${esc(m.id)}" title="${esc(m.owner)}"><span class="pj-dd">${m.date.slice(8)}</span>${m.gate ? '◆ ' : ''}${esc(m.title)}</span>`).join('')}</td>`;
      }
      h += '</tr>';
    }
    document.getElementById('dpBoard').innerHTML = h + '</tbody>';
  }
  drawBoard();

  root.querySelector('#dpWho').addEventListener('click', (e) => {
    const b = e.target.closest('[data-who]'); if (!b) return;
    who = b.getAttribute('data-who');
    root.querySelectorAll('#dpWho .chip').forEach(c => c.classList.toggle('active', c === b));
    drawBoard();
  });

  root.querySelector('#dpDetail').addEventListener('click', (e) => {
    const el = e.target.closest('[data-dp-open]');
    if (!el) return;
    const m = byId.get(el.getAttribute('data-dp-open'));
    if (!m) return;
    openDrawer(drawerShell(`
      <div class="eyebrow">${esc(frontName[m.front] || 'Projetos Digitais')}</div>
      <h2 style="font-family:var(--font-display);color:var(--navy);margin:4px 0 12px">${m.gate ? '◆ ' : ''}${esc(m.title)}</h2>
      <div class="badge-row"><span class="badge ${BADGE[m.live]}">${LABEL[m.live]}</span>${m.gate ? '<span class="badge gold">Portão</span>' : ''}</div>
      <div class="field-block"><div class="fl-label">Data</div><div class="fl-value">${fmt(m.date)} ${esc(m.date.slice(0, 4))}${m.time ? ' · ' + esc(m.time) : ''}</div></div>
      <div class="field-block"><div class="fl-label">Responsável</div><div class="fl-value">${esc(m.owner)}</div></div>
      <p class="pj-meta" style="margin-top:18px">Para marcar como feito, altere o "status" deste marco para "feito" em <code>${esc(SOURCE)}</code>.</p>`));
  });
}
