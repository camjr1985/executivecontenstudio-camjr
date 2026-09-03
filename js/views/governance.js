import { esc } from '../lib/util.js';
import { operationalCounts } from '../data.js';
import { pageHead } from './_shared.js';

const PROTECTED = ['POST-038', 'POST-041', 'POST-047', 'POST-026'];

export function renderGovernance(root, store, navigate) {
  const counts = operationalCounts(store);
  const byChannel = { LinkedIn: 0, Instagram: 0, Live: 0 };
  store.records.forEach(r => { byChannel[r.channel] = (byChannel[r.channel] || 0) + 1; });
  const withCopy = store.records.filter(r => r.copy).length;

  root.innerHTML =
    pageHead('Read-only', 'Fonte & Governança', 'Proveniência dos dados, integridade e estado de governança. Substitui o antigo "Gerir Conteúdo" — sem edição local, GitHub permanece a única fonte canónica.') +
    `<div class="panel" style="margin-bottom:14px">
      <h4>Fonte canónica</h4>
      <div class="field-block"><div class="fl-label">Repositório</div><div class="fl-value">github.com/camjr1985/executivecontenstudio-camjr</div></div>
      <div class="field-block"><div class="fl-label">Dataset canónico</div><div class="fl-value">data/calendar.json</div></div>
      <div class="field-block"><div class="fl-label">Total de registos</div><div class="fl-value">${store.records.length} (LinkedIn ${byChannel.LinkedIn} · Instagram ${byChannel.Instagram} · Live ${byChannel.Live})</div></div>
      <div class="field-block"><div class="fl-label">Copy migrada do legado</div><div class="fl-value">${withCopy} de ${store.records.length} registos têm copy completa (os 41 EXISTING que são Post/Carousel/Article/News)</div></div>
    </div>
    <div class="panel" style="margin-bottom:14px">
      <h4>Registos protegidos</h4>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${PROTECTED.map(id => {
          const r = store.records.find(x => x.content_id === id);
          return `<div style="font-size:13px;display:flex;justify-content:space-between;border-bottom:1px solid var(--line-soft);padding:6px 0"><code>${esc(id)}</code><span>${r ? esc(r.date) + ' · ' + esc(r.decision) : 'NÃO ENCONTRADO'}</span></div>`;
        }).join('')}
      </div>
    </div>
    <div class="panel" style="margin-bottom:14px">
      <h4>Estado de governança</h4>
      <div class="badge-row">
        <span class="badge danger">PUBLICATION_ENABLED = false</span>
        <span class="badge warn">WRITE_MODE = CONTROLLED</span>
        <span class="badge danger">AUTO_PUBLISH = false</span>
        <span class="badge">Buffer: ${store.buffer.dry_run_only ? 'DRY_RUN_ONLY' : 'DESCONHECIDO'}</span>
      </div>
      <p style="font-size:12.5px;color:var(--muted);margin-top:10px">Owner gates ativos neste momento: ${counts.ownerGates} registos com <code>owner_approval_required = true</code>.</p>
    </div>
    <div class="panel">
      <h4>Exportar</h4>
      <p style="font-size:13px;color:var(--muted);margin-bottom:10px">Download do calendário canónico tal como carregado (leitura apenas — não altera o GitHub).</p>
      <button class="btn primary" id="exportBtn">Exportar calendar.json</button>
    </div>`;

  document.getElementById('exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ row_count: store.meta.row_count, records: store.records }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'executive-content-studio-calendar-export.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  });
}
