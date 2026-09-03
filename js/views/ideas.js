import { esc } from '../lib/util.js';
import { emptyState } from '../components.js';
import { pageHead } from './_shared.js';

const LIFECYCLE_LABEL = { IDEA: 'Ideia', SHORTLISTED: 'Selecionada', PLANNED: 'Planeada', CONVERTED: 'Convertida', ARCHIVED: 'Arquivada' };

export function renderIdeas(root, store, navigate) {
  const byTheme = {};
  store.ideas.forEach(i => { (byTheme[i.theme] ||= []).push(i); });
  const themes = Object.keys(byTheme).sort((a, b) => a.localeCompare(b, 'pt'));

  root.innerHTML =
    pageHead('Backlog editorial', 'Banco de Ideias', `${store.ideas.length} ideias migradas do repositório legado, organizadas por tema. Ciclo: Ideia → Selecionada → Planeada → Convertida → Arquivada.`) +
    (themes.length ? themes.map(t => `<div class="panel" style="margin-bottom:14px">
        <h4>${esc(t)}</h4>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${byTheme[t].map(i => `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--line-soft)">
            <span style="font-size:13.5px">${esc(i.text)}</span>
            <span class="badge${i.lifecycle === 'CONVERTED' ? ' ok' : ''}">${esc(LIFECYCLE_LABEL[i.lifecycle] || i.lifecycle)}${i.converted_content_id ? ' · ' + esc(i.converted_content_id) : ''}</span>
          </div>`).join('')}
        </div>
      </div>`).join('') : emptyState('Sem ideias no banco.', '💡'));
}
