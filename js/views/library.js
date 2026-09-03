import { esc } from '../lib/util.js';
import { recordCard, emptyState, bindRecordCards, formatIcon, displayTitle } from '../components.js';
import { childrenOf } from '../data.js';
import { pageHead, openRecordDrawer } from './_shared.js';

export function renderLibrary(root, store, navigate, format, head) {
  const all = store.records.filter(r => r.format === format);
  const existingCount = all.filter(r => r.existing_or_new === 'EXISTING').length;
  const newCount = all.length - existingCount;
  const themes = [...new Set(all.map(r => r.editorial_pillar).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt'));

  root.innerHTML =
    pageHead(head.eyebrow, head.title, `${head.sub} · ${existingCount} com copy migrada, ${newCount} ainda por redigir.`) +
    `<div class="toolbar">
      <input type="text" id="libSearch" placeholder="Pesquisar por título ou tema…">
      <select id="libTheme"><option value="">Todos os temas</option>${themes.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('')}</select>
      <select id="libStatus"><option value="">Todos os estados</option><option>DRAFT</option><option>PROPOSED</option><option>READY</option><option>SCHEDULED</option><option>APPROVED</option></select>
      <select id="libCopy"><option value="">Copy: todas</option><option value="yes">Com copy migrada</option><option value="no">Copy não redigida</option></select>
    </div>
    <div id="libGrid" class="grid"></div>
    ${format === 'Article' ? '<div id="cascadeSection"></div>' : ''}`;

  const q = document.getElementById('libSearch'), themeSel = document.getElementById('libTheme'), statusSel = document.getElementById('libStatus'), copySel = document.getElementById('libCopy');
  const openHandler = (id) => openRecordDrawer(store, id);

  function draw() {
    const qq = (q.value || '').toLowerCase();
    const list = all.filter(r =>
      (!qq || (displayTitle(r) + ' ' + (r.editorial_pillar || '')).toLowerCase().includes(qq)) &&
      (!themeSel.value || r.editorial_pillar === themeSel.value) &&
      (!statusSel.value || r.status === statusSel.value) &&
      (!copySel.value || (copySel.value === 'yes' ? !!r.copy : !r.copy))
    ).sort((a, b) => a.date < b.date ? -1 : 1);
    const grid = document.getElementById('libGrid');
    grid.innerHTML = list.length ? list.map(recordCard).join('') : emptyState('Nenhum item encontrado com estes filtros.');
    bindRecordCards(grid, openHandler);
  }
  [q, themeSel, statusSel, copySel].forEach(el => el.addEventListener('input', draw));
  draw();

  if (format === 'Article') {
    const section = document.getElementById('cascadeSection');
    const withKids = all.filter(a => childrenOf(store, a.content_id).length);
    section.innerHTML = withKids.length ? `<h4 style="font-family:var(--font-display);margin:28px 0 12px;color:var(--navy)">Cascata de artigos</h4>` +
      withKids.map(a => {
        const kids = childrenOf(store, a.content_id);
        return `<div class="panel" style="margin-bottom:12px">
          <div class="badge-row" style="margin-bottom:8px"><span class="badge kind">📖 Artigo</span><strong style="font-family:var(--font-display);font-size:15px">${esc(displayTitle(a))}</strong></div>
          <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-size:13px;color:var(--muted)">
            <span class="badge gold">${esc(a.content_id)}</span>
            ${kids.map(k => `→ <span class="badge" data-cascade-open="${esc(k.content_id)}" style="cursor:pointer">${formatIcon(k.channel, k.format)} ${esc(k.format)} · ${esc(k.date)}</span>`).join(' ')}
          </div>
        </div>`;
      }).join('') : '';
    section.querySelectorAll('[data-cascade-open]').forEach(el => el.addEventListener('click', () => openHandler(el.getAttribute('data-cascade-open'))));
  }
}
