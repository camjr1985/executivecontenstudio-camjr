import { esc, copyText, uniqueSorted } from '../lib/util.js';
import { emptyState } from '../components.js';
import { pageHead } from './_shared.js';

export function renderComments(root, store, navigate) {
  const cats = uniqueSorted(store.comments.map(c => c.category));

  root.innerHTML =
    pageHead('Banco de comentários', 'Comentários', `${store.comments.length} comentários executivos migrados do repositório legado, prontos para copiar e adaptar.`) +
    `<div class="chip-row" id="commentChips"><button class="chip active" data-cat="">Todos</button>${cats.map(c => `<button class="chip" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>
    <div class="list" id="commentList"></div>`;

  root.querySelectorAll('#commentChips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      root.querySelectorAll('#commentChips .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      draw(chip.getAttribute('data-cat'));
    });
  });

  function draw(cat) {
    const list = store.comments.filter(c => !cat || c.category === cat);
    const box = document.getElementById('commentList');
    box.innerHTML = list.length ? list.map(c => `<div class="list-item"><span class="badge">${esc(c.category)}</span><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p>
      <div class="btn-row"><button class="btn small" data-copy="${esc(c.id)}">Copiar comentário</button></div></div>`).join('') : emptyState('Sem comentários nesta categoria.');
    box.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => {
      const c = store.comments.find(x => x.id === b.getAttribute('data-copy'));
      if (c) copyText(c.text);
    }));
  }
  draw('');
}
