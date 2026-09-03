import { esc } from '../lib/util.js';
import { emptyState, recordCard, bindRecordCards } from '../components.js';
import { campaignGroups } from '../data.js';
import { pageHead, openRecordDrawer, cascadeChain, bindCascadeOpens } from './_shared.js';

export function renderCampaigns(root, store, navigate) {
  const groups = campaignGroups(store);
  const openHandler = (id) => openRecordDrawer(store, id);

  root.innerHTML =
    pageHead('Planeamento', 'Campanhas', 'Relações reais entre campanha, mercado, idioma e conteúdo — preservadas do plano aprovado. Sem números de apoiadores ou de angariação inventados.') +
    (groups.size ? `<div class="grid" id="campGrid"></div>` : emptyState('Nenhuma campanha ativa no calendário canónico.', '🎯'));

  if (!groups.size) return;
  const gridEl = document.getElementById('campGrid');
  gridEl.innerHTML = [...groups.entries()].map(([name, records]) => {
    const markets = [...new Set(records.map(r => r.market).filter(m => m && m !== 'NOT_APPLICABLE'))];
    const languages = [...new Set(records.map(r => r.language).filter(Boolean))];
    return `<article class="card" data-open-campaign="${esc(name)}">
      <div class="card-body">
        <div class="badge-row"><span class="badge kind">🎯 Campanha</span>${markets.map(m => `<span class="badge">${esc(m)}</span>`).join('')}${languages.map(l => `<span class="badge gold">${esc(l)}</span>`).join('')}</div>
        <h3>${esc(name.replace(/_/g, ' '))}</h3>
        <p>${records.length} registo${records.length === 1 ? '' : 's'} · ${[...new Set(records.map(r => r.channel))].join(', ')}</p>
      </div>
    </article>`;
  }).join('');
  gridEl.querySelectorAll('[data-open-campaign]').forEach(el => el.addEventListener('click', () => navigate('#/campaigns/' + encodeURIComponent(el.getAttribute('data-open-campaign')))));
}

export function renderCampaignDetail(root, store, navigate, name) {
  const records = store.records.filter(r => r.campaign === name).sort((a, b) => a.date < b.date ? -1 : 1);
  const openHandler = (id) => openRecordDrawer(store, id);

  if (!records.length) { root.innerHTML = emptyState('Campanha não encontrada no calendário canónico.'); return; }

  const roots = records.filter(r => !r.parent_content_id || !records.some(x => x.content_id === r.parent_content_id));

  root.innerHTML =
    `<a class="btn ghost small" href="#/campaigns">← Voltar a Campanhas</a>` +
    pageHead('Campanha', name.replace(/_/g, ' '), `${records.length} registos · canais: ${[...new Set(records.map(r => r.channel))].join(', ')}.`) +
    `<h4 style="font-family:var(--font-display);margin:20px 0 12px;color:var(--navy)">Fluxo da campanha</h4>
    <div id="cascadeWrap"></div>
    <h4 style="font-family:var(--font-display);margin:26px 0 12px;color:var(--navy)">Todos os registos</h4>
    <div class="grid" id="campAll"></div>`;

  const cascadeWrap = document.getElementById('cascadeWrap');
  cascadeWrap.innerHTML = roots.map(r => cascadeChain(r, 0, store)).join('');
  bindCascadeOpens(cascadeWrap, openHandler);

  const allGrid = document.getElementById('campAll');
  allGrid.innerHTML = records.map(recordCard).join('');
  bindRecordCards(allGrid, openHandler);
}
