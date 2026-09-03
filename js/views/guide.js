import { esc } from '../lib/util.js';
import { pageHead } from './_shared.js';

export function renderGuide(root, store, navigate) {
  const g = store.guidelines;
  root.innerHTML =
    pageHead('Tom de voz', 'Guia de Escrita Executiva', 'Regras práticas para manter o conteúdo executivo e humanizado, migradas do repositório legado.') +
    `<div class="panel" style="margin-bottom:14px"><h4>O que fazer</h4><div style="display:flex;flex-direction:column;gap:8px">${g.do.map(x => `<div style="font-size:13.5px;padding:8px 0;border-bottom:1px solid var(--line-soft)">✓ ${esc(x)}</div>`).join('')}</div></div>
    <div class="panel" style="margin-bottom:14px"><h4>Sinais a evitar</h4><div style="display:flex;flex-direction:column;gap:8px">${g.avoid.map(x => `<div style="font-size:13.5px;padding:8px 0;border-bottom:1px solid var(--line-soft)">✕ ${esc(x)}</div>`).join('')}</div></div>
    <div class="panel"><h4>Checklist antes de publicar</h4><div style="display:flex;flex-direction:column;gap:8px">${g.checklist.map(x => `<div style="font-size:13.5px;padding:8px 0;border-bottom:1px solid var(--line-soft)">☐ ${esc(x)}</div>`).join('')}</div></div>
    <p style="font-size:12.5px;color:var(--muted);margin-top:16px">O botão <strong>Verificar tom</strong>, disponível em Posts, Carrosséis, Artigos e Sugestões de Comentário, analisa o texto automaticamente à procura destes sinais. Não impede copiar — é só um alerta para rever antes de publicar no LinkedIn.</p>`;
}
