import { esc, nl2br, fmtDateTime, copyText } from './lib/util.js';
import { svgMarkup } from './lib/covers.js';
import { toneCheckHtml } from './lib/tone-check.js';
import { coverFor, formatIcon, formatLabel, statusBadge, approvalBadge, mediaBadge, displayTitle } from './components.js';

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

  return head + body + governancePanel(r);
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
