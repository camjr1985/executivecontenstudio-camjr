import { esc } from '../lib/util.js';
import { openDrawer, drawerShell, formatIcon, channelIcon } from '../components.js';
import { renderRecordBody, bindRecordActions, bindEditActions } from '../record-detail.js';
import { childrenOf } from '../data.js';

export function pageHead(eyebrow, title, sub, actionsHtml) {
  return `<div class="page-head">
    <div><div class="eyebrow">${esc(eyebrow)}</div><h1>${esc(title)}</h1>${sub ? `<div class="page-sub">${esc(sub)}</div>` : ''}</div>
    ${actionsHtml ? `<div>${actionsHtml}</div>` : ''}
  </div>`;
}

// Same idea, different channel: a record duplicated via "Duplicar para
// outro canal" (or vice-versa, its original) is linked through
// parent_content_id. Surfaced right under the title so both sides of the
// pair are one click apart -- they stay two separate rows in the calendar
// (each keeps its own channel color/icon), but no longer feel disconnected.
function linkedRecordsHtml(store, r) {
  const parent = r.parent_content_id ? store.records.find(x => x.content_id === r.parent_content_id) : null;
  const related = [...(parent ? [parent] : []), ...childrenOf(store, r.content_id)];
  if (!related.length) return '';
  return `<div class="badge-row" style="margin-top:8px">
    <span style="font-size:11px;color:var(--faint);align-self:center">Mesmo conteúdo, noutro canal:</span>
    ${related.map(x => `<span class="badge" data-cascade-open="${esc(x.content_id)}" style="cursor:pointer">${channelIcon(x.channel)} ${esc(x.channel)} · ${formatIcon(x.channel, x.format)} ${esc(x.format)}</span>`).join('')}
  </div>`;
}

export function openRecordDrawer(store, id) {
  const r = store.records.find(x => x.content_id === id);
  if (!r) return;
  openDrawer(drawerShell(renderRecordBody(r, linkedRecordsHtml(store, r))));
  const scope = document.getElementById('drawer');
  bindRecordActions(scope, r);
  bindEditActions(scope, r, () => openRecordDrawer(store, id), (clone) => {
    // New record from "Duplicar para outro canal" -- shape it like every
    // other store.records entry (copy/media joined at load time, null here
    // since a fresh duplicate has neither yet) and open it right away.
    store.records.push({ ...clone, copy: null, media: null });
    store.meta.row_count = store.records.length;
    openRecordDrawer(store, clone.content_id);
  });
  bindCascadeOpens(scope, (otherId) => openRecordDrawer(store, otherId));
}

// A campaign/Live content cascade, rendered as CAMPAIGN -> POST -> STORY -> ... chips.
// Only shows relationships that exist in parent_content_id -- never inferred/invented.
export function cascadeChain(record, depth, store) {
  const kids = childrenOf(store, record.content_id);
  const node = `<span class="badge${depth === 0 ? ' kind' : ''}" data-cascade-open="${esc(record.content_id)}" style="cursor:pointer;margin:2px 0">${formatIcon(record.channel, record.format)} ${esc(record.format)} · ${esc(record.date)}</span>`;
  if (!kids.length) return `<div class="panel" style="margin-bottom:10px">${node}</div>`;
  const kidChips = kids.map(k => '→ ' + `<span class="badge" data-cascade-open="${esc(k.content_id)}" style="cursor:pointer">${formatIcon(k.channel, k.format)} ${esc(k.format)} · ${esc(k.date)}</span>`).join('');
  return `<div class="panel" style="margin-bottom:10px"><div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px">${node}${kidChips}</div></div>`;
}

export function bindCascadeOpens(scope, onOpen) {
  scope.querySelectorAll('[data-cascade-open]').forEach(el => el.addEventListener('click', () => onOpen(el.getAttribute('data-cascade-open'))));
}
