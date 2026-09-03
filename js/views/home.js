import { esc, fmtDate } from '../lib/util.js';
import { recordCard, statCard, emptyState, bindRecordCards } from '../components.js';
import { operationalCounts, todayISO, recordsForDate, byId } from '../data.js';
import { pageHead, openRecordDrawer } from './_shared.js';

let statFilter = null;

export function renderHome(root, store, navigate) {
  const today = todayISO();
  const counts = operationalCounts(store);
  const todays = recordsForDate(store, today);

  const upcoming = store.records
    .filter(r => r.date > today)
    .sort((a, b) => a.date < b.date ? -1 : 1)
    .slice(0, 6);

  const live = byId(store, store.records.find(r => r.channel === 'Live')?.content_id);

  root.innerHTML =
    pageHead('Cockpit diário · ' + fmtDate(today), 'Hoje', 'O que precisa da sua atenção agora — derivado diretamente do calendário canónico, nada estimado.') +
    `<div class="stat-row" id="statRow">
      ${statCard(counts.total, 'Total no calendário', 'total')}
      ${statCard(counts.needsReview, 'Precisa de revisão', 'review', counts.needsReview > 0)}
      ${statCard(counts.mediaPending, 'Media pendente', 'media', counts.mediaPending > 0)}
      ${statCard(counts.approved, 'Aprovado', 'approved')}
      ${statCard(counts.ready, 'Pronto/Agendado', 'ready')}
      ${statCard(counts.blocked, 'Bloqueado (owner gate)', 'blocked', counts.blocked > 0)}
    </div>
    <p style="font-size:12px;color:var(--faint);margin:-16px 0 20px">Nenhum registo tem hoje o estado <code>APPROVED</code> ou <code>READY</code> no calendário canónico — ${counts.total - counts.ownerGates} de ${counts.total} não requerem aprovação do owner, mas continuam em <code>DRAFT</code>/<code>PROPOSED</code>.</p>
    <div id="statFiltered"></div>

    <h4 style="font-family:var(--font-display);margin:26px 0 12px;color:var(--navy)">Hoje — ${esc(fmtDate(today))}</h4>
    <div class="grid" id="todayGrid">${todays.length ? todays.map(recordCard).join('') : emptyState('Nada agendado para hoje no calendário canónico.', '📭')}</div>

    ${live ? `<h4 style="font-family:var(--font-display);margin:26px 0 12px;color:var(--navy)">Live em destaque</h4>
    <div class="grid">${recordCard(live)}</div>` : ''}

    <h4 style="font-family:var(--font-display);margin:26px 0 12px;color:var(--navy)">Próximos 6 itens</h4>
    <div class="grid" id="upcomingGrid">${upcoming.length ? upcoming.map(recordCard).join('') : emptyState('Sem itens futuros no calendário.', '📭')}</div>`;

  const openHandler = (id) => openRecordDrawer(store, id);
  bindRecordCards(root, openHandler);

  root.querySelectorAll('[data-stat]').forEach(card => {
    card.addEventListener('click', () => {
      const key = card.getAttribute('data-stat');
      statFilter = statFilter === key ? null : key;
      root.querySelectorAll('[data-stat]').forEach(c => c.classList.toggle('active', c === card && statFilter));
      drawStatFilter(store, openHandler);
    });
  });
  drawStatFilter(store, openHandler);
}

function drawStatFilter(store, openHandler) {
  const box = document.getElementById('statFiltered');
  if (!statFilter) { box.innerHTML = ''; return; }
  const predicates = {
    total: () => true,
    review: r => r.status === 'DRAFT' || r.status === 'PROPOSED',
    media: r => r.media_status === 'PENDING_MEDIA',
    approved: r => r.status === 'APPROVED',
    ready: r => r.status === 'READY' || r.status === 'SCHEDULED',
    blocked: r => r.owner_approval_required === true && (r.status === 'DRAFT' || r.status === 'PROPOSED')
  };
  const list = store.records.filter(predicates[statFilter]).sort((a, b) => a.date < b.date ? -1 : 1);
  box.innerHTML = `<div class="panel" style="margin-bottom:24px"><h4>${list.length} registo${list.length === 1 ? '' : 's'}</h4>
    <div class="grid">${list.length ? list.map(recordCard).join('') : emptyState('Nenhum registo nesta categoria.')}</div></div>`;
  bindRecordCards(box, openHandler);
}
