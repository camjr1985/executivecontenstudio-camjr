import { esc, nl2br, fmtDateTime, copyText, isPlaceholderValue } from './lib/util.js';
import { svgMarkup } from './lib/covers.js';
import { toneCheckHtml } from './lib/tone-check.js';
import { coverFor, formatIcon, formatLabel, statusBadge, approvalBadge, mediaBadge, displayTitle } from './components.js';
import { isConnected, getToken, patchRecord } from './lib/github-write.js';

const STATUS_OPTIONS = [
  ['DRAFT', 'Rascunho (a aguardar texto)'],
  ['PROPOSED', 'Proposto'],
  ['READY', 'Pronto'],
  ['SCHEDULED', 'Agendado'],
  ['APPROVED', 'Aprovado'],
  ['PUBLISHED', 'Publicado'],
  ['BLOCKED', 'Bloqueado'],
  ['CONFIRMED', 'Confirmado'],
  ['NOT_APPLICABLE', 'Não aplicável']
];
const MEDIA_OPTIONS = [
  ['PENDING_MEDIA', 'A aguardar média'],
  ['READY', 'Média pronta'],
  ['DONE', 'Média concluída']
];

function fullTextFor(r) {
  const c = r.copy; if (!c) return '';
  if (c.kind === 'posts') return [c.hook, c.text, c.cta, c.hashtags].filter(Boolean).join('\n\n');
  if (c.kind === 'articles') return [displayTitle(r), '', c.body, '', c.hashtags].filter(v => v !== undefined).join('\n');
  if (c.kind === 'carousels') {
    const slides = (c.slides || []).map((s, i) => `Slide ${i + 1} — ${s.title}\n${s.body}`).join('\n\n');
    return [displayTitle(r), '', slides, '', c.cta, c.hashtags].join('\n');
  }
  return '';
}

function governancePanel(r) {
  return `<div class="panel">
    <h4>Governança</h4>
    <div class="badge-row" style="margin-bottom:10px">
      ${statusBadge(r.status)}
      ${approvalBadge(r.owner_approval_required)}
      ${r.publication_status ? `<span class="badge">Publicação: ${esc(r.publication_status)}</span>` : ''}
      ${mediaBadge(r.media_status)}
      ${r.qc_status ? `<span class="badge">QC: ${esc(r.qc_status)}</span>` : ''}
    </div>
    <div class="field-block"><div class="fl-label">Buffer</div><div class="fl-value">${r.buffer?.mapping_status === 'NOT_MAPPED' || !r.buffer?.buffer_id ? 'Não conectado (dry-run apenas)' : esc(r.buffer.buffer_id)}</div></div>
    ${r.rationale ? `<div class="field-block"><div class="fl-label">Racional editorial</div><div class="fl-value">${esc(r.rationale)}</div></div>` : ''}
    ${r.primary_objective ? `<div class="field-block"><div class="fl-label">Objetivo primário</div><div class="fl-value">${esc(r.primary_objective)}</div></div>` : ''}
    ${r.campaign ? `<div class="field-block"><div class="fl-label">Campanha</div><div class="fl-value">${esc(r.campaign)}</div></div>` : ''}
  </div>`;
}

function editPanel(r) {
  if (!isConnected()) {
    return `<div class="panel" style="margin-top:16px">
      <h4>Editar</h4>
      <p style="font-size:13px;color:var(--muted)">Ligue o GitHub em <a href="#/governance">Fonte &amp; Governança</a> para poder alterar data, estado e média diretamente daqui — grava mesmo no GitHub, com o workflow de testes a validar antes de publicar.</p>
    </div>`;
  }
  const timeVal = isPlaceholderValue(r.time) ? '' : (r.time || '');
  const alreadyPublished = r.status === 'PUBLISHED';
  return `<div class="panel" style="margin-top:16px">
    <h4>Ações rápidas</h4>
    <p style="font-size:12.5px;color:var(--muted);margin-bottom:10px">Para quando já publicou isto manualmente (fora da app) e só quer atualizar o registo.</p>
    <div id="quickPublishRow" class="btn-row">
      <button class="btn primary" id="quickPublishBtn"${alreadyPublished ? ' disabled' : ''}>${alreadyPublished ? '✅ Já marcado como publicado' : '✅ Marcar como publicado agora'}</button>
    </div>
    <div id="quickPublishMsg" style="font-size:12.5px;margin-top:8px"></div>
  </div>
  <div class="panel" style="margin-top:16px">
    <h4>Editar (grava no GitHub)</h4>
    <div class="field-block">
      <div class="fl-label">Data</div>
      <input type="date" id="editDate" value="${esc(r.date)}" style="padding:8px 10px;border-radius:8px;border:1px solid var(--line);font:inherit">
    </div>
    <div class="field-block">
      <div class="fl-label">Hora (HH:MM — deixe em branco se ainda por confirmar)</div>
      <input type="text" id="editTime" value="${esc(timeVal)}" placeholder="ex: 12:00" style="padding:8px 10px;border-radius:8px;border:1px solid var(--line);font:inherit;width:130px">
    </div>
    <div class="field-block">
      <div class="fl-label">Estado</div>
      <select id="editStatus" style="padding:8px 10px;border-radius:8px;border:1px solid var(--line);font:inherit">
        ${STATUS_OPTIONS.map(([v, l]) => `<option value="${v}"${r.status === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}
      </select>
    </div>
    <div class="field-block">
      <div class="fl-label">Média</div>
      <select id="editMedia" style="padding:8px 10px;border-radius:8px;border:1px solid var(--line);font:inherit">
        ${MEDIA_OPTIONS.map(([v, l]) => `<option value="${v}"${r.media_status === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}
      </select>
    </div>
    <div class="btn-row">
      <button class="btn primary" id="editSave">Guardar no GitHub</button>
      <button class="btn" id="editCancel">Cancelar</button>
    </div>
    <div id="editMsg" style="font-size:12.5px;margin-top:8px"></div>
    <p style="font-size:11px;color:var(--faint);margin-top:8px">Marcar como "Publicado" aqui regista o estado editorial no calendário canónico — não publica sozinho em nenhum canal (Buffer continua desligado).</p>
  </div>`;
}

function pendingCopyBlock() {
  return `<div class="pending-copy">✒️ Copy ainda não redigida — este é um conceito de planeamento aprovado para a data, não texto final. Nada foi inventado aqui.</div>`;
}

function newsReserveBlock() {
  return `<div class="pending-copy">📰 Slot reservado — ainda não é conteúdo editorial confirmado. Precisa de: fonte, seleção de tópico, comentário executivo e decisão do owner antes de avançar.</div>`;
}

export function renderRecordBody(r) {
  const kindLabel = formatLabel(r.channel, r.format);
  let head = `<img class="drawer-cover" src="${coverFor(r)}" alt="">
    <div class="badge-row">
      <span class="badge kind">${formatIcon(r.channel, r.format)} ${esc(kindLabel)}</span>
      <span class="badge">${esc(r.channel)}</span>
      ${r.editorial_pillar ? `<span class="badge gold">${esc(r.editorial_pillar)}</span>` : ''}
    </div>
    <h2>${esc(displayTitle(r))}</h2>
    <div class="schedule-line">📅 ${esc(fmtDateTime(r.date, r.time))} (${esc(r.timezone || 'Europe/Lisbon')}) · <code>${esc(r.content_id)}</code></div>`;

  let body = '';
  const c = r.copy;
  if (r.format === 'News') {
    body = newsReserveBlock() + (c ? `
      <div class="field-block"><div class="fl-label">Fonte sugerida</div><div class="fl-value">${esc(c.source || '—')}</div></div>
      <div class="field-block"><div class="fl-label">Link</div><div class="fl-value">${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.url)}</a>` : '— (por preencher)'}</div></div>
      <div class="field-block"><div class="fl-label">Resumo (placeholder)</div><div class="fl-value">${esc(c.summary || '—')}</div></div>
      <pre>${esc(c.repost || '')}</pre>
      <pre style="color:var(--blue);font-weight:600;background:transparent;padding:0">${esc(c.hashtags || '')}</pre>` : '');
  } else if (c && c.kind === 'posts') {
    body = `<div style="font-style:italic;color:var(--navy);font-size:15px;margin:14px 0">${nl2br(c.hook)}</div>
      <pre>${esc(c.text)}\n\n${esc(c.cta)}</pre>
      <pre style="color:var(--blue);font-weight:600;background:transparent;padding:0">${esc(c.hashtags)}</pre>
      ${c.image_prompt ? `<div class="field-block"><div class="fl-label">Prompt da imagem</div><div class="fl-value">${esc(c.image_prompt)}</div></div>` : ''}
      <div id="toneOut"></div>
      <div class="btn-row">
        <button class="btn primary" data-act="copy">Copiar texto</button>
        <button class="btn" data-act="tone">✒️ Verificar tom</button>
        <button class="btn" data-act="cover">Baixar imagem</button>
      </div>`;
  } else if (c && c.kind === 'carousels') {
    const slides = (c.slides || []).map((s, i) => `<div class="panel"><div class="eyebrow">SLIDE ${i + 1} / ${c.slides.length}</div><h4>${esc(s.title)}</h4><p style="font-size:13.5px;color:var(--muted)">${esc(s.body)}</p></div>`).join('');
    body = `<p style="color:var(--muted);margin-bottom:12px">${esc(c.summary)}</p>${slides}
      <pre>${esc(c.cta)}</pre>
      <pre style="color:var(--blue);font-weight:600;background:transparent;padding:0">${esc(c.hashtags)}</pre>
      <div id="toneOut"></div>
      <div class="btn-row">
        <button class="btn primary" data-act="copy">Copiar carrossel</button>
        <button class="btn" data-act="tone">✒️ Verificar tom</button>
        <button class="btn" data-act="cover">Baixar capa</button>
      </div>`;
  } else if (c && c.kind === 'articles') {
    body = `${c.read_time ? `<span class="badge gold">${esc(c.read_time)}</span>` : ''}
      <pre>${esc(c.body)}</pre>
      <pre style="color:var(--blue);font-weight:600;background:transparent;padding:0">${esc(c.hashtags)}</pre>
      <div id="toneOut"></div>
      <div class="btn-row">
        <button class="btn primary" data-act="copy">Copiar artigo</button>
        <button class="btn" data-act="tone">✒️ Verificar tom</button>
      </div>`;
  } else if (r.format === 'Review') {
    body = `<div class="pending-copy">📊 Ver detalhe completo em Revisões Mensais.</div>`;
  } else {
    body = pendingCopyBlock();
  }

  return head + body + governancePanel(r) + editPanel(r);
}

async function savePatch(scope, r, onSaved, patch, msgEl, busyBtns, commitNote) {
  busyBtns.forEach(b => { b.disabled = true; });
  msgEl.style.color = 'var(--muted)';
  msgEl.textContent = 'A gravar no GitHub…';
  try {
    const token = getToken();
    const updated = await patchRecord(token, r.content_id, patch, `Atualizar ${r.content_id} via Fonte & Governança (${commitNote})`);
    Object.assign(r, updated);
    msgEl.style.color = 'var(--ok)';
    msgEl.textContent = 'Gravado. O workflow de testes/validação vai correr antes de publicar. A atualizar…';
    setTimeout(() => onSaved(), 900);
  } catch (err) {
    msgEl.style.color = 'var(--danger)';
    msgEl.textContent = err.message;
    busyBtns.forEach(b => { b.disabled = false; });
  }
}

export function bindEditActions(scope, r, onSaved) {
  // Quick action: mark published right now, without touching date/time/media.
  const quickBtn = scope.querySelector('#quickPublishBtn');
  if (quickBtn && !quickBtn.disabled) {
    quickBtn.addEventListener('click', () => {
      const row = scope.querySelector('#quickPublishRow');
      const msg = scope.querySelector('#quickPublishMsg');
      row.innerHTML = `<span style="font-size:13px;color:var(--ink);align-self:center">Marcar ${esc(r.content_id)} como publicado agora?</span>
        <button class="btn primary small" id="quickPublishYes">Sim, marcar</button>
        <button class="btn small" id="quickPublishNo">Cancelar</button>`;
      scope.querySelector('#quickPublishNo').addEventListener('click', () => {
        row.innerHTML = `<button class="btn primary" id="quickPublishBtn">✅ Marcar como publicado agora</button>`;
        bindEditActions(scope, r, onSaved);
      });
      scope.querySelector('#quickPublishYes').addEventListener('click', () => {
        const patch = { status: 'PUBLISHED', publication_status: 'PUBLISHED' };
        if (!r.published_at) patch.published_at = new Date().toISOString();
        savePatch(scope, r, onSaved, patch, msg, [scope.querySelector('#quickPublishYes'), scope.querySelector('#quickPublishNo')], 'marcado como publicado manualmente');
      });
    });
  }

  // Cancel: discard unsaved edits in the form, back to the record's live values.
  const cancelBtn = scope.querySelector('#editCancel');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      scope.querySelector('#editDate').value = r.date;
      scope.querySelector('#editTime').value = isPlaceholderValue(r.time) ? '' : (r.time || '');
      scope.querySelector('#editStatus').value = r.status;
      scope.querySelector('#editMedia').value = r.media_status;
      const msg = scope.querySelector('#editMsg');
      msg.textContent = '';
    });
  }

  const btn = scope.querySelector('#editSave');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const msg = scope.querySelector('#editMsg');
    const date = scope.querySelector('#editDate').value;
    const time = scope.querySelector('#editTime').value.trim();
    const status = scope.querySelector('#editStatus').value;
    const media_status = scope.querySelector('#editMedia').value;
    if (!date) { msg.style.color = 'var(--danger)'; msg.textContent = 'Data é obrigatória.'; return; }

    const patch = { date, status, media_status, time: time || 'TBD_OWNER' };
    if (status === 'PUBLISHED') {
      patch.publication_status = 'PUBLISHED';
      if (!r.published_at) patch.published_at = new Date().toISOString();
    }
    savePatch(scope, r, onSaved, patch, msg, [btn, cancelBtn].filter(Boolean), 'data/estado/média');
  });
}

export function bindRecordActions(scope, r) {
  scope.querySelector('[data-act="copy"]')?.addEventListener('click', () => copyText(fullTextFor(r)));
  scope.querySelector('[data-act="tone"]')?.addEventListener('click', () => {
    const out = scope.querySelector('#toneOut');
    const text = r.copy?.kind === 'articles' ? r.copy.body : [r.copy?.hook, r.copy?.text, r.copy?.cta, r.copy?.summary].filter(Boolean).join('\n\n');
    if (out) out.innerHTML = toneCheckHtml(text);
  });
  scope.querySelector('[data-act="cover"]')?.addEventListener('click', () => {
    const svg = svgMarkup(r.content_id, r.editorial_pillar || '', displayTitle(r));
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = r.content_id.toLowerCase() + '-capa.svg';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  });
}
