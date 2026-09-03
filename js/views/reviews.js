import { esc, fmtDate } from '../lib/util.js';
import { emptyState } from '../components.js';
import { pageHead } from './_shared.js';

const METRIC_HINTS = /impress|engajamento|crescimento de seguidores|seguidores/i;

export function renderReviews(root, store, navigate) {
  const list = [...store.reviews].sort((a, b) => a.date < b.date ? -1 : 1);
  root.innerHTML =
    pageHead('No fim de cada mês', 'Revisões Mensais', `${list.length} checklists migrados do repositório legado. Sem ligação a analytics — itens que dependem de métricas externas aparecem como DATA UNAVAILABLE.`) +
    (list.length ? `<div class="grid">${list.map(r => `<article class="card" data-open-review="${esc(r.id)}"><div class="card-body">
        <div class="badge-row"><span class="badge kind">📊 Revisão</span><span class="badge gold">${esc(r.period)}</span></div>
        <h3>${esc(r.title)}</h3><p>${esc(r.summary)}</p>
        <div class="card-foot"><span>${esc(fmtDate(r.date))}</span><span>${r.checklist.length} itens</span></div>
      </div></article>`).join('')}</div>` : emptyState('Sem revisões mensais.', '📊'));

  root.querySelectorAll('[data-open-review]').forEach(el => el.addEventListener('click', () => navigate('#/reviews/' + el.getAttribute('data-open-review'))));
}

export function renderReviewDetail(root, store, navigate, id) {
  const r = store.reviews.find(x => x.id === id);
  if (!r) { root.innerHTML = emptyState('Revisão não encontrada.'); return; }

  root.innerHTML =
    `<a class="btn ghost small" href="#/reviews">← Voltar a Revisões Mensais</a>` +
    pageHead('Revisão · ' + r.period, r.title, r.summary) +
    `<div class="panel"><h4>Checklist</h4><div style="display:flex;flex-direction:column;gap:10px">
      ${r.checklist.map(item => `<div style="display:flex;justify-content:space-between;gap:14px;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--line-soft)">
        <span style="font-size:13.5px">${esc(item)}</span>
        ${METRIC_HINTS.test(item) ? '<span class="badge warn" style="flex-shrink:0">DATA UNAVAILABLE</span>' : '<span class="badge" style="flex-shrink:0">Planeamento</span>'}
      </div>`).join('')}
    </div></div>
    <div class="panel" style="margin-top:14px"><h4>Notas e conclusões</h4><p style="font-size:13.5px;color:var(--muted)">${r.notes ? esc(r.notes) : 'Ainda sem notas — pendente de evidência real.'}</p></div>`;
}
