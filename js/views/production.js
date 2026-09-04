import { esc, fmtDateTime } from '../lib/util.js';
import { formatIcon, statusBadge, mediaBadge, copyStatusBadge, textStatusOf, isIgnored, emptyState, displayTitle } from '../components.js';
import { pageHead, openRecordDrawer } from './_shared.js';

let filterKey = 'all';

export function renderProduction(root, store, navigate) {
  const openHandler = (id) => openRecordDrawer(store, id);

  // Once a record is marked "Não aplicável" (readiness), it's pulled out of
  // the production workflow -- media/QC/owner-gate values still sitting on
  // it from before are stale, not actionable, so it drops out of every
  // pending-work filter and gets its own chip instead.
  const filters = [
    { key: 'all', label: 'Todos', test: () => true },
    { key: 'text', label: 'Texto pendente', test: r => !isIgnored(r) && textStatusOf(r) !== 'READY' },
    { key: 'media', label: 'Media pendente', test: r => !isIgnored(r) && r.media_status === 'PENDING_MEDIA' },
    { key: 'qc', label: 'QC pendente', test: r => !isIgnored(r) && (!r.qc_status || r.qc_status === 'PENDING') },
    { key: 'owner', label: 'Aprovação do owner', test: r => !isIgnored(r) && r.owner_approval_required },
    { key: 'ready', label: 'Pronto', test: r => r.status === 'READY' || r.status === 'SCHEDULED' },
    { key: 'blocked', label: 'Bloqueado', test: r => !isIgnored(r) && r.owner_approval_required && (r.status === 'DRAFT' || r.status === 'PROPOSED') },
    { key: 'na', label: 'Não aplicável', test: r => isIgnored(r) }
  ];

  root.innerHTML =
    pageHead('Ponte operacional', 'Produção', 'Readiness, media, QC e aprovação — visão técnica de apoio. Não publica nem agenda no Buffer.') +
    `<div class="chip-row" id="prodChips">${filters.map(f => `<button class="chip${filterKey === f.key ? ' active' : ''}" data-f="${f.key}">${esc(f.label)}</button>`).join('')}</div>
    <div id="prodBody"></div>`;

  root.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => {
    filterKey = b.getAttribute('data-f');
    root.querySelectorAll('[data-f]').forEach(c => c.classList.toggle('active', c === b));
    draw();
  }));

  function draw() {
    const f = filters.find(x => x.key === filterKey);
    const rows = store.records.filter(f.test).sort((a, b) => a.date < b.date ? -1 : 1);
    const body = document.getElementById('prodBody');
    body.innerHTML = rows.length ? `<div class="table-wrap"><table><thead><tr>
      <th>Content ID</th><th>Data</th><th>Formato</th><th>Título</th><th>Readiness</th><th>Texto</th><th>Media</th><th>QC</th><th>Aprovação</th><th>Publicação</th>
      </tr></thead><tbody>${rows.map(r => {
        const na = isIgnored(r);
        return `<tr data-open="${esc(r.content_id)}"${na ? ' class="row-ignored"' : ''}>
        <td><code>${esc(r.content_id)}</code></td>
        <td>${esc(fmtDateTime(r.date, r.time))}</td>
        <td>${formatIcon(r.channel, r.format)} ${esc(r.format)}</td>
        <td>${esc(displayTitle(r))}</td>
        <td>${statusBadge(r.status)}</td>
        <td>${na ? '<span class="badge">—</span>' : copyStatusBadge(r)}</td>
        <td>${na ? '<span class="badge">—</span>' : mediaBadge(r.media_status)}</td>
        <td>${na ? '<span class="badge">—</span>' : (r.qc_status ? esc(r.qc_status) : '<span class="badge warn">PENDING</span>')}</td>
        <td>${na ? '<span class="badge">—</span>' : (r.owner_approval_required ? '<span class="badge danger">Owner gate</span>' : '<span class="badge ok">Não requerida</span>')}</td>
        <td>${na ? '<span class="badge">—</span>' : `<span class="badge">${esc(r.publication_status || 'PENDING')}</span>`}</td>
      </tr>`;
      }).join('')}</tbody></table></div>` : emptyState('Nenhum item nesta categoria.');
    body.querySelectorAll('[data-open]').forEach(el => el.addEventListener('click', () => openHandler(el.getAttribute('data-open'))));
  }
  draw();
}
