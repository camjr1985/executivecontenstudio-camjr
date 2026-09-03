import { esc, fmtDateTime } from '../lib/util.js';
import { emptyState, displayTitle } from '../components.js';
import { pageHead, openRecordDrawer } from './_shared.js';

export function renderNews(root, store, navigate) {
  const items = store.records.filter(r => r.format === 'News').sort((a, b) => a.date < b.date ? -1 : 1);
  const openHandler = (id) => openRecordDrawer(store, id);

  root.innerHTML =
    pageHead('Biblioteca', 'Notícias', 'Slots reservados para notícia + opinião executiva. Nenhum destes é, ainda, uma notícia real e confirmada — todos precisam de fonte, tópico, comentário e decisão do owner.') +
    `<div class="list" id="newsList"></div>`;

  const list = document.getElementById('newsList');
  list.innerHTML = items.length ? items.map(n => `<div class="list-item" data-open="${esc(n.content_id)}">
    <div class="badge-row"><span class="reserve-note">📰 Slot reservado</span><span class="badge">${esc(fmtDateTime(n.date, n.time))}</span></div>
    <h3>${esc(displayTitle(n))}</h3>
    <p>${esc(n.copy?.summary || 'Ainda sem resumo — fonte e tópico por decidir.')}</p>
  </div>`).join('') : emptyState('Nenhum slot de notícia agendado no calendário canónico.', '📭');
  list.querySelectorAll('[data-open]').forEach(el => el.addEventListener('click', () => openHandler(el.getAttribute('data-open'))));
}
