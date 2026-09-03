import { esc, copyText } from '../lib/util.js';
import { toneCheckHtml } from '../lib/tone-check.js';
import { pageHead } from './_shared.js';

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

export function renderCommentTool(root, store, navigate) {
  const themes = [...new Set([...store.comments.map(c => c.category), ...store.records.map(r => r.editorial_pillar).filter(Boolean)])].sort((a, b) => a.localeCompare(b, 'pt'));

  root.innerHTML =
    pageHead('A partir de uma publicação', 'Sugestões de Comentário', 'Cole o texto de uma publicação para ver comentários já guardados sobre o mesmo tema e estruturas de rascunho para adaptar. Isto não escreve o comentário por si.') +
    `<div class="panel" style="margin-bottom:20px">
      <label style="display:block;font-size:12.5px;font-weight:600;margin-bottom:6px">Texto da publicação</label>
      <textarea id="ctPasted" rows="5" style="width:100%;padding:10px;border-radius:9px;border:1px solid var(--line);font:inherit" placeholder="Cole aqui o texto do post…"></textarea>
      <div class="btn-row"><button class="btn primary" id="ctAnalyze">Analisar publicação</button></div>
    </div>
    <div id="ctResults"></div>`;

  document.getElementById('ctAnalyze').addEventListener('click', () => {
    const text = document.getElementById('ctPasted').value.trim();
    if (!text) return;
    analyze(text);
  });

  function analyze(text) {
    const detected = themes.filter(t => new RegExp('\\b' + escapeRegex(t) + '\\b', 'i').test(text));
    const options = themes.map(t => `<option value="${esc(t)}"${detected[0] === t ? ' selected' : ''}>${esc(t)}</option>`).join('');
    const out = document.getElementById('ctResults');
    out.innerHTML = `<div class="panel" style="margin-bottom:20px">
        ${detected.length ? `<div class="badge-row" style="margin-bottom:8px">${detected.map(t => `<span class="badge gold">${esc(t)}</span>`).join('')}</div><p style="font-size:12.5px;color:var(--muted);margin-bottom:10px">Tema${detected.length > 1 ? 's' : ''} detetado${detected.length > 1 ? 's' : ''} automaticamente.</p>`
        : `<p style="font-size:12.5px;color:var(--muted);margin-bottom:10px">Nenhum tema conhecido detetado — escolha manualmente.</p>`}
        <select id="ctTheme">${options}</select>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="panel"><h4>Comentários guardados sobre este tema</h4><div id="ctExisting"></div></div>
        <div class="panel"><h4>Estruturas para começar</h4><div id="ctSkel"></div></div>
      </div>
      <div class="panel" style="margin-top:16px">
        <h4>O seu comentário</h4>
        <textarea id="ctDraft" rows="4" style="width:100%;padding:10px;border-radius:9px;border:1px solid var(--line);font:inherit" placeholder="Escreva aqui, a partir de uma sugestão ou do zero…"></textarea>
        <div class="btn-row"><button class="btn" id="ctTone">✒️ Verificar tom</button><button class="btn primary" id="ctCopy">Copiar</button></div>
        <p style="font-size:11.5px;color:var(--faint);margin-top:8px">Guardar permanentemente no banco de comentários requer o caminho de writeback do GitHub, hoje desativado (WRITE_MODE=CONTROLLED). Copie e adicione manualmente quando aprovado.</p>
        <div id="ctToneOut" style="margin-top:10px"></div>
      </div>`;

    const themeSel = document.getElementById('ctTheme');
    function drawExisting() {
      const matches = store.comments.filter(c => c.category === themeSel.value);
      document.getElementById('ctExisting').innerHTML = matches.length
        ? matches.map(c => `<div class="panel" style="margin-bottom:8px"><strong style="font-size:12.5px">${esc(c.title)}</strong><p style="font-size:13px;color:var(--muted);margin-top:4px">${esc(c.text)}</p><div class="btn-row"><button class="btn small" data-use="${esc(c.id)}">Usar como base</button></div></div>`).join('')
        : `<p style="font-size:13px;color:var(--muted)">Ainda não há comentários guardados neste tema.</p>`;
      document.querySelectorAll('[data-use]').forEach(b => b.addEventListener('click', () => {
        const c = store.comments.find(x => x.id === b.getAttribute('data-use'));
        document.getElementById('ctDraft').value = c.text;
      }));
    }
    function drawSkeletons() {
      const box = document.getElementById('ctSkel');
      box.innerHTML = store.guidelines.comment_skeletons.map((s, i) => {
        const filled = s.replace(/\[tema\]/gi, themeSel.value || '[tema]');
        return `<div class="panel" style="margin-bottom:8px"><strong style="font-size:12px">Estrutura ${i + 1}</strong><p style="font-size:13px;color:var(--muted);margin-top:4px">${esc(filled)}</p><div class="btn-row"><button class="btn small" data-skel="${i}">Usar como base</button></div></div>`;
      }).join('');
      box.querySelectorAll('[data-skel]').forEach(b => b.addEventListener('click', () => {
        document.getElementById('ctDraft').value = store.guidelines.comment_skeletons[+b.getAttribute('data-skel')].replace(/\[tema\]/gi, themeSel.value || '[tema]');
      }));
    }
    themeSel.addEventListener('change', () => { drawExisting(); drawSkeletons(); });
    drawExisting(); drawSkeletons();

    document.getElementById('ctTone').addEventListener('click', () => {
      document.getElementById('ctToneOut').innerHTML = toneCheckHtml(document.getElementById('ctDraft').value);
    });
    document.getElementById('ctCopy').addEventListener('click', () => copyText(document.getElementById('ctDraft').value.trim()));
  }
}
