import { esc } from '../lib/util.js';
import { recordCard, emptyState, bindRecordCards } from '../components.js';
import { searchAll } from '../data.js';
import { pageHead, openRecordDrawer } from './_shared.js';

export function renderSearch(root, store, navigate, initialQuery) {
  root.innerHTML =
    pageHead('Pesquisa', 'Pesquisar tudo', 'Procure em posts, carrosséis, artigos, notícias, comentários e ideias.') +
    `<div class="toolbar"><input type="text" id="searchInput" placeholder="Ex.: Azure, IA, liderança…" value="${esc(initialQuery || '')}"></div>
    <div id="searchResults"></div>`;

  const input = document.getElementById('searchInput');
  const openHandler = (id) => openRecordDrawer(store, id);
  input.addEventListener('input', () => draw(input.value));
  input.focus();
  draw(initialQuery || '');

  function draw(q) {
    const out = document.getElementById('searchResults');
    const res = searchAll(store, q);
    if (!res) { out.innerHTML = emptyState('Escreva um termo para pesquisar em toda a biblioteca.', '🔍'); return; }
    const total = res.records.length + res.comments.length + res.ideas.length;
    if (!total) { out.innerHTML = emptyState(`Nenhum resultado para "${q}".`, '🔍'); return; }
    let html = '';
    if (res.records.length) html += `<h4 style="font-family:var(--font-display);margin:10px 0 12px;color:var(--navy)">Calendário (${res.records.length})</h4><div class="grid">${res.records.map(recordCard).join('')}</div>`;
    if (res.comments.length) html += `<h4 style="font-family:var(--font-display);margin:22px 0 12px;color:var(--navy)">Comentários (${res.comments.length})</h4><div class="list">${res.comments.map(c => `<div class="list-item"><span class="badge">${esc(c.category)}</span><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p></div>`).join('')}</div>`;
    if (res.ideas.length) html += `<h4 style="font-family:var(--font-display);margin:22px 0 12px;color:var(--navy)">Ideias (${res.ideas.length})</h4><div class="list">${res.ideas.map(i => `<div class="list-item"><span class="badge">${esc(i.theme)}</span><p>${esc(i.text)}</p></div>`).join('')}</div>`;
    out.innerHTML = html;
    bindRecordCards(out, openHandler);
  }
}
