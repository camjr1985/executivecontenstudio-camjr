import { esc, fmtDateTime } from '../lib/util.js';
import { emptyState, recordCard, bindRecordCards, formatIcon, displayTitle } from '../components.js';
import { childrenOf } from '../data.js';
import { pageHead, openRecordDrawer, cascadeChain, bindCascadeOpens } from './_shared.js';

export function renderLive(root, store, navigate) {
  const lives = store.records.filter(r => r.channel === 'Live').sort((a, b) => a.date < b.date ? -1 : 1);
  const openHandler = (id) => openRecordDrawer(store, id);

  root.innerHTML = pageHead('Planeamento', 'Lives', 'Todo evento Live confirmado no calendário canónico, com o ciclo pré/durante/pós à volta dele.');

  if (!lives.length) { root.innerHTML += emptyState('Nenhuma Live agendada no calendário canónico.', '🎙️'); return; }

  const html = lives.map(live => {
    const kids = childrenOf(store, live.content_id);
    const pre = kids.filter(k => k.date < live.date);
    const post = kids.filter(k => k.date > live.date);
    const sameDay = kids.filter(k => k.date === live.date);
    return `<div class="panel" style="margin-bottom:20px">
      <div class="badge-row"><span class="badge kind">🎙️ Live</span>${live.campaign ? `<span class="badge gold">${esc(live.campaign)}</span>` : ''}${live.market && live.market !== 'NOT_APPLICABLE' ? `<span class="badge">${esc(live.market)}</span>` : ''}</div>
      <h2 style="margin-top:8px">${esc(displayTitle(live))}</h2>
      <div class="schedule-line">📅 ${esc(fmtDateTime(live.date, live.time))} (Lisboa) · <code>${esc(live.content_id)}</code></div>
      <div class="btn-row"><button class="btn primary small" data-open="${esc(live.content_id)}">Abrir detalhe</button></div>

      <h4 style="margin:20px 0 10px">Cascata pré → live → pós</h4>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
        <div><div class="eyebrow">Pré-live (${pre.length})</div>${pre.length ? pre.map(k => cascadeItem(k)).join('') : emptyState('Sem itens.', '')}</div>
        <div><div class="eyebrow">Dia da live (${sameDay.length})</div>${sameDay.length ? sameDay.map(k => cascadeItem(k)).join('') : emptyState('Sem itens.', '')}</div>
        <div><div class="eyebrow">Pós-live (${post.length})</div>${post.length ? post.map(k => cascadeItem(k)).join('') : emptyState('Sem itens.', '')}</div>
      </div>
    </div>`;
  }).join('');
  root.innerHTML += html;

  root.querySelectorAll('[data-open]').forEach(el => el.addEventListener('click', () => openHandler(el.getAttribute('data-open'))));
  bindCascadeOpens(root, openHandler);
}

function cascadeItem(r) {
  return `<div class="badge" data-cascade-open="${escAttr(r.content_id)}" style="cursor:pointer;display:block;margin-bottom:6px;white-space:normal;text-align:left">${formatIcon(r.channel, r.format)} ${escAttr(r.format)} · ${escAttr(r.date)}<br><span style="font-family:var(--font-body);font-weight:400;text-transform:none">${escAttr(displayTitle(r))}</span></div>`;
}
function escAttr(v) { return esc(v); }
