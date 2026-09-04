import { esc } from '../lib/util.js';
import { openDrawer, drawerShell, formatIcon } from '../components.js';
import { renderRecordBody, bindRecordActions, bindEditActions } from '../record-detail.js';
import { childrenOf } from '../data.js';

export function pageHead(eyebrow, title, sub, actionsHtml) {
  return `<div class="page-head">
    <div><div class="eyebrow">${esc(eyebrow)}</div><h1>${esc(title)}</h1>${sub ? `<div class="page-sub">${esc(sub)}</div>` : ''}</div>
    ${actionsHtml ? `<div>${actionsHtml}</div>` : ''}
  </div>`;
}

export function openRecordDrawer(store, id) {
  const r = store.records.find(x => x.content_id === id);
  if (!r) return;
  openDrawer(drawerShell(renderRecordBody(r)));
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
