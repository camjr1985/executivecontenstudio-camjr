import { esc, nl2br, fmtDateTime, copyText, isPlaceholderValue } from './lib/util.js';
import { svgMarkup } from './lib/covers.js';
import { toneCheckHtml } from './lib/tone-check.js';
import { coverFor, formatIcon, formatLabel, statusBadge, approvalBadge, mediaBadge, textStatusOf, displayTitle } from './components.js';
import { isConnected, getToken, patchRecord, duplicateRecord } from './lib/github-write.js';

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
const COPY_STATUS_OPTIONS = [
  ['PENDING', 'Por escrever'],
  ['IN_PROGRESS', 'Em criação'],
  ['READY', 'Texto criado']
];
// Channel/format are editable too -- the valid format list depends on the
// channel (an Instagram record can't be "Article"), so the format <select>
// is rebuilt whenever the channel changes.
//
// Live is deliberately not offered as a switch/duplicate target: only
// LinkedIn and Instagram are in active use for that right now. The one real
// Live record still edits fine -- channelOptionsFor() adds its own current
// channel back into its own dropdown so it's never silently reassigned.
const CHANNEL_OPTIONS = ['LinkedIn', 'Instagram'];
const CHANNEL_FORMATS = {
  LinkedIn: ['Post', 'Carousel', 'Article', 'News', 'Review'],
  Instagram: ['Feed', 'Reel', 'Story'],
  Live: ['Live Event']
};
function channelOptionsFor(current) {
  return CHANNEL_OPTIONS.includes(current) ? CHANNEL_OPTIONS : [...CHANNEL_OPTIONS, current];
}
function formatOptionsHtml(channel, current) {
  const opts = CHANNEL_FORMATS[channel] || [];
  return opts.map(f => `<option value="${f}"${f === current ? ' selected' : ''}>${esc(formatLabel(channel, f))}</option>`).join('');
}

// Whether this record gets the "Estado do texto" + textarea fields at all --
// only for records that don't already have real migrated copy, and whose
// format isn't handled some other dedicated way (News/Review/Live).
function needsTextFields(r) {
  return !r.copy && r.format !== 'News' && r.format !== 'Review' && r.channel !== 'Live';
}

function fullTextFor(r) {
  const c = r.copy; if (!c) return r.draft_text || '';
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
    ${r.media_asset ? `<div class="field-block"><div class="fl-label">Mídia — onde buscar/publicar</div><div class="fl-value">${esc(r.media_asset)}</div></div>` : ''}
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
  const otherChannels = CHANNEL_OPTIONS.filter(ch => ch !== r.channel);

  // Estado do texto / textarea live INSIDE this same form, saved by the same
  // "Guardar no GitHub" button as everything else -- they used to be a
  // separate panel with its own save button, and saving one would silently
  // discard whatever the owner had just typed, unsaved, in the other.
  const copyStatus = r.copy_status || 'PENDING';
  const textFieldsHtml = needsTextFields(r) ? `
    <div class="field-block">
      <div class="fl-label">Estado do texto</div>
      <select id="editCopyStatus" style="padding:8px 10px;border-radius:8px;border:1px solid var(--line);font:inherit">
        ${COPY_STATUS_OPTIONS.map(([v, l]) => `<option value="${v}"${copyStatus === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}
      </select>
    </div>
    <div class="field-block">
      <div class="fl-label">Texto (cole aqui quando estiver pronto)</div>
      <textarea id="editDraftText" rows="8" placeholder="Cole aqui o texto final do post…" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--line);font:inherit;resize:vertical;box-sizing:border-box">${esc(r.draft_text || '')}</textarea>
    </div>` : '';

  return `<div class="panel" style="margin-top:16px">
    <h4>Ações rápidas</h4>
    <p style="font-size:12.5px;color:var(--muted);margin-bottom:10px">Para quando já publicou isto manualmente (fora da app) e só quer atualizar o registo.</p>
    <div id="quickPublishRow" class="btn-row">
      <button class="btn primary" id="quickPublishBtn"${alreadyPublished ? ' disabled' : ''}>${alreadyPublished ? '✅ Já marcado como publicado' : '✅ Marcar como publicado agora'}</button>
    </div>
    <div id="quickPublishMsg" style="font-size:12.5px;margin-top:8px"></div>
  </div>
  <div class="panel" style="margin-top:16px">
    <h4>Duplicar para outro canal</h4>
    <p style="font-size:12.5px;color:var(--muted);margin-bottom:10px">Cria um novo registo ligado a este (mesma data/pilar/campanha), no canal escolhido — com o texto atual já pré-preenchido, para adaptares em vez de escrever do zero. Média e estado começam por preencher de novo.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      <select id="dupChannel" style="padding:8px 10px;border-radius:8px;border:1px solid var(--line);font:inherit">
        ${otherChannels.map(ch => `<option value="${ch}">${esc(ch)}</option>`).join('')}
      </select>
      <button class="btn" id="dupBtn">Duplicar</button>
    </div>
    <div id="dupMsg" style="font-size:12.5px;margin-top:8px"></div>
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
      <div class="fl-label">Canal</div>
      <select id="editChannel" style="padding:8px 10px;border-radius:8px;border:1px solid var(--line);font:inherit">
        ${channelOptionsFor(r.channel).map(ch => `<option value="${ch}"${r.channel === ch ? ' selected' : ''}>${esc(ch)}</option>`).join('')}
      </select>
    </div>
    <div class="field-block">
      <div class="fl-label">Formato</div>
      <select id="editFormat" style="padding:8px 10px;border-radius:8px;border:1px solid var(--line);font:inherit">
        ${formatOptionsHtml(r.channel, r.format)}
      </select>
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
    <div class="field-block">
      <div class="fl-label">Onde buscar/publicar a mídia (link ou nota — opcional)</div>
      <input type="text" id="editMediaAsset" value="${esc(r.media_asset || '')}" placeholder="ex: link da pasta/imagem, ou onde ir buscar/publicar" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--line);font:inherit;box-sizing:border-box">
    </div>${textFieldsHtml}
    <div class="btn-row">
      <button class="btn primary" id="editSave">Guardar no GitHub</button>
      <button class="btn" id="editCancel">Cancelar</button>
    </div>
    <div id="editMsg" style="font-size:12.5px;margin-top:8px"></div>
    <p style="font-size:11px;color:var(--faint);margin-top:8px">Marcar como "Publicado" aqui regista o estado editorial no calendário canónico — não publica sozinho em nenhum canal (Buffer continua desligado). Um único "Guardar" grava tudo o que estiver neste formulário de uma vez, incluindo o texto — nada fica esquecido numa caixa por gravar.</p>
  </div>`;
}

function pendingCopyBlock() {
  return `<div class="pending-copy">✒️ Copy ainda não redigida — este é um conceito de planeamento aprovado para a data, não texto final. Nada foi inventado aqui.</div>`;
}

// Read-only preview for records without real copy yet: the governance
// warning, and the saved draft_text (if any) with a copy button. The actual
// editable "Estado do texto" + textarea live inside editPanel()'s single
// form now (see needsTextFields), saved together with everything else --
// this block never contains form fields, so it can never lose typed input.
function textPreviewBlock(r) {
  const status = r.copy_status || 'PENDING';
  const hasDraft = !!(r.draft_text && r.draft_text.trim());
  const isReady = status === 'READY' && hasDraft;

  const warning = isReady
    ? `<p style="font-size:12px;color:var(--muted);margin-bottom:10px">✒️ Texto escrito/colado manualmente pelo owner — não passou pelo processo de migração dos registos legados.</p>`
    : `<div class="pending-copy">✒️ Copy ainda não redigida — este é um conceito de planeamento aprovado para a data, não texto final. Nada foi inventado aqui.</div>`;

  const savedText = hasDraft
    ? `<pre>${esc(r.draft_text)}</pre><div class="btn-row"><button class="btn" data-act="copy-draft">Copiar texto</button></div>`
    : '';

  if (!isConnected()) {
    const statusLabel = COPY_STATUS_OPTIONS.find(([v]) => v === status)?.[1] || status;
    return `${warning}${savedText}
      <div class="field-block"><div class="fl-label">Estado do texto</div><div class="fl-value">${esc(statusLabel)}</div></div>
      <p style="font-size:12.5px;color:var(--muted)">Ligue o GitHub em <a href="#/governance">Fonte &amp; Governança</a> para escrever ou colar o texto aqui.</p>`;
  }

  return `${warning}${savedText}`;
}

function newsReserveBlock() {
  return `<div class="pending-copy">📰 Slot reservado — ainda não é conteúdo editorial confirmado. Precisa de: fonte, seleção de tópico, comentário executivo e decisão do owner antes de avançar.</div>`;
}

export function renderRecordBody(r, linkedHtml = '') {
  const kindLabel = formatLabel(r.channel, r.format);
  let head = `<img class="drawer-cover" src="${coverFor(r)}" alt="">
    <div class="badge-row">
      <span class="badge kind">${formatIcon(r.channel, r.format)} ${esc(kindLabel)}</span>
      <span class="badge">${esc(r.channel)}</span>
      ${r.editorial_pillar ? `<span class="badge gold">${esc(r.editorial_pillar)}</span>` : ''}
    </div>
    <h2>${esc(displayTitle(r))}</h2>
    <div class="schedule-line">📅 ${esc(fmtDateTime(r.date, r.time))} (${esc(r.timezone || 'Europe/Lisbon')}) · <code>${esc(r.content_id)}</code></div>${linkedHtml}`;

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
  } else if (r.channel === 'Live') {
    body = pendingCopyBlock();
  } else {
    body = textPreviewBlock(r);
  }

  return head + body + governancePanel(r) + editPanel(r);
}

// Every save/duplicate action across the drawer's panels (Ações rápidas,
// Duplicar, Editar) writes to the same calendar.json. Two writes in flight
// at once would race on the file's sha, so ANY one of them disables ALL of
// them until it settles -- not just the buttons in its own panel -- rather
// than relying only on patchRecord's automatic retry.
const ALL_SAVE_BTN_SELECTOR = '#editSave, #editCancel, #quickPublishBtn, #quickPublishYes, #quickPublishNo, #dupBtn, #dupChannel';

function lockSaveButtons(scope) {
  const allBtns = Array.from(scope.querySelectorAll(ALL_SAVE_BTN_SELECTOR));
  const prevDisabled = allBtns.map(b => b.disabled);
  allBtns.forEach(b => { b.disabled = true; });
  return () => allBtns.forEach((b, i) => { b.disabled = prevDisabled[i]; });
}

async function savePatch(scope, r, onSaved, patch, msgEl, commitNote) {
  const unlock = lockSaveButtons(scope);
  msgEl.style.color = 'var(--muted)';
  msgEl.textContent = 'A gravar no GitHub…';
  // r.copy (real migrated text, e.g. a LinkedIn Carousel's content_library
  // entry) is joined client-side by content_id, never stored in
  // calendar.json itself -- so patchRecord's response never touches it, and
  // Object.assign below would otherwise leave it in place forever. If this
  // save changes channel or format, that old copy no longer matches what the
  // record now is, so it's cleared here (in memory only, nothing to write to
  // GitHub for this) -- this is what makes "Estado do texto"/"Texto" appear
  // for a record that just moved channel, instead of staying hidden behind
  // stale legacy content for the channel it used to be.
  const channelOrFormatChanged = patch.channel !== undefined && (patch.channel !== r.channel || patch.format !== r.format);
  try {
    const token = getToken();
    const updated = await patchRecord(token, r.content_id, patch, `Atualizar ${r.content_id} via Fonte & Governança (${commitNote})`);
    Object.assign(r, updated);
    if (channelOrFormatChanged) r.copy = null;
    msgEl.style.color = 'var(--ok)';
    msgEl.textContent = 'Gravado. O workflow de testes/validação vai correr antes de publicar. A atualizar…';
    setTimeout(() => onSaved(), 900);
  } catch (err) {
    msgEl.style.color = 'var(--danger)';
    msgEl.textContent = err.message;
    unlock();
  }
}

export function bindEditActions(scope, r, onSaved, onDuplicated) {
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
        bindEditActions(scope, r, onSaved, onDuplicated);
      });
      scope.querySelector('#quickPublishYes').addEventListener('click', () => {
        const patch = { status: 'PUBLISHED', publication_status: 'PUBLISHED' };
        if (!r.published_at) patch.published_at = new Date().toISOString();
        savePatch(scope, r, onSaved, patch, msg, 'marcado como publicado manualmente');
      });
    });
  }

  // Format options depend on the chosen channel (Instagram can't be
  // "Article", LinkedIn can't be "Reel") -- rebuild the format <select>
  // whenever the channel changes, defaulting to that channel's first format.
  const channelSel = scope.querySelector('#editChannel');
  const formatSel = scope.querySelector('#editFormat');
  if (channelSel && formatSel) {
    channelSel.addEventListener('change', () => {
      formatSel.innerHTML = formatOptionsHtml(channelSel.value, null);
    });
  }

  // Cancel: discard unsaved edits in the form, back to the record's live values.
  const cancelBtn = scope.querySelector('#editCancel');
  const copyStatusSel = scope.querySelector('#editCopyStatus');
  const draftTextArea = scope.querySelector('#editDraftText');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      scope.querySelector('#editDate').value = r.date;
      scope.querySelector('#editTime').value = isPlaceholderValue(r.time) ? '' : (r.time || '');
      if (channelSel) channelSel.value = r.channel;
      if (formatSel) formatSel.innerHTML = formatOptionsHtml(r.channel, r.format);
      scope.querySelector('#editStatus').value = r.status;
      scope.querySelector('#editMedia').value = r.media_status;
      scope.querySelector('#editMediaAsset').value = r.media_asset || '';
      if (copyStatusSel) copyStatusSel.value = r.copy_status || 'PENDING';
      if (draftTextArea) draftTextArea.value = r.draft_text || '';
      const msg = scope.querySelector('#editMsg');
      msg.textContent = '';
    });
  }

  const btn = scope.querySelector('#editSave');
  if (btn) {
    btn.addEventListener('click', () => {
      const msg = scope.querySelector('#editMsg');
      const date = scope.querySelector('#editDate').value;
      const time = scope.querySelector('#editTime').value.trim();
      const channel = channelSel ? channelSel.value : r.channel;
      const format = formatSel ? formatSel.value : r.format;
      const status = scope.querySelector('#editStatus').value;
      const media_status = scope.querySelector('#editMedia').value;
      const media_asset = scope.querySelector('#editMediaAsset').value.trim();
      if (!date) { msg.style.color = 'var(--danger)'; msg.textContent = 'Data é obrigatória.'; return; }

      const patch = { date, status, media_status, time: time || 'TBD_OWNER', channel, format, media_asset: media_asset || null };
      if (copyStatusSel) patch.copy_status = copyStatusSel.value;
      if (draftTextArea) patch.draft_text = draftTextArea.value;
      if (status === 'PUBLISHED') {
        patch.publication_status = 'PUBLISHED';
        if (!r.published_at) patch.published_at = new Date().toISOString();
      }
      savePatch(scope, r, onSaved, patch, msg, 'data/estado/média/canal/formato/mídia/texto');
    });
  }

  // Duplicate: creates a new, linked record on another channel -- own
  // media/status, starts fresh at DRAFT, but the text starts PRE-FILLED
  // with this record's own text (real copy if it has any, else its own
  // draft_text) as a starting point to adapt for the new channel, rather
  // than a blank box that reads as "there's no text for Instagram".
  // onDuplicated gets the new record back so the caller can add it to the
  // store and open it.
  const dupBtn = scope.querySelector('#dupBtn');
  if (dupBtn) {
    dupBtn.addEventListener('click', async () => {
      const msg = scope.querySelector('#dupMsg');
      const sel = scope.querySelector('#dupChannel');
      const targetChannel = sel.value;
      const format = (CHANNEL_FORMATS[targetChannel] || [])[0];
      const seedText = fullTextFor(r);
      const unlock = lockSaveButtons(scope);
      msg.style.color = 'var(--muted)';
      msg.textContent = 'A duplicar no GitHub…';
      try {
        const token = getToken();
        const clone = await duplicateRecord(token, r.content_id, { channel: targetChannel, format, draft_text: seedText });
        msg.style.color = 'var(--ok)';
        msg.textContent = `Criado ${clone.content_id} (${targetChannel}). A abrir…`;
        setTimeout(() => onDuplicated?.(clone), 900);
      } catch (err) {
        msg.style.color = 'var(--danger)';
        msg.textContent = err.message;
        unlock();
      }
    });
  }
}

export function bindRecordActions(scope, r) {
  scope.querySelector('[data-act="copy"]')?.addEventListener('click', () => copyText(fullTextFor(r)));
  scope.querySelector('[data-act="copy-draft"]')?.addEventListener('click', () => copyText(r.draft_text || ''));
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
