import { esc, fmtDateTime } from './lib/util.js';
import { dataUri } from './lib/covers.js';

// ---------- visual taxonomy ----------
export const FORMAT_ICON = {
  Post: '🖼️', Carousel: '📚', Article: '📖', News: '📰', Review: '📊',
  Feed: '📱', Reel: '🎬', Story: '⭕', 'Live Event': '🎙️'
};
export function formatIcon(channel, format) {
  if (channel === 'Live') return '🎙️';
  return FORMAT_ICON[format] || '•';
}
export function formatLabel(channel, format) {
  if (channel === 'Live') return 'Live';
  if (channel === 'Instagram') return { Feed: 'IG Feed', Reel: 'IG Reel', Story: 'IG Story' }[format] || format;
  return format;
}

// A small extra glyph identifying the channel itself, shown alongside the
// format icon so a day with several items reads at a glance -- LinkedIn vs
// Instagram vs Live -- before even reading the title. Live already has its
// own unmistakable icon via formatIcon(), so it's left out here to avoid
// showing the same glyph twice.
const CHANNEL_GLYPH = { LinkedIn: '💼', Instagram: '📷' };
export function channelIcon(channel) { return CHANNEL_GLYPH[channel] || ''; }

const STATUS_BADGE = {
  DRAFT: 'warn', PROPOSED: 'warn', READY: 'ok', SCHEDULED: 'blue', APPROVED: 'ok',
  PUBLISHED: 'ok', BLOCKED: 'danger'
};
// NOT_APPLICABLE marks a record the owner has pulled out of the production
// workflow entirely (e.g. cancelled, or handled manually outside the app).
// It gets a friendlier label and, deliberately, no color class -- it reads
// as "off" rather than as another stage of the pipeline.
const STATUS_LABEL = { NOT_APPLICABLE: 'Não aplicável' };
export function isIgnored(r) { return r.status === 'NOT_APPLICABLE'; }
export function statusBadge(status) {
  if (!status) return '';
  const cls = STATUS_BADGE[status] || '';
  return `<span class="badge ${cls}">${esc(STATUS_LABEL[status] || status)}</span>`;
}
export function approvalBadge(required) {
  return required ? `<span class="badge danger">Owner gate</span>` : '';
}
export function mediaBadge(mediaStatus) {
  if (!mediaStatus) return '';
  const cls = mediaStatus === 'READY' || mediaStatus === 'DONE' ? 'ok' : mediaStatus === 'PENDING_MEDIA' ? 'warn' : '';
  return `<span class="badge ${cls}">${esc(mediaStatus.replace(/_/g, ' '))}</span>`;
}

// The master-calendar workbook used bracketed placeholder titles like
// "(existing — Cloud)" for some EXISTING Oct-Dec records, even where the real
// legacy title is known (joined via content_library.json by the same
// content_id). calendar.json itself is never touched -- this only chooses
// which already-verified field to display, preferring the real title when
// the canonical one is a placeholder.
const PLACEHOLDER_TITLE = /^\((existing|placeholder)\b/i;
export function displayTitle(r) {
  if (r.copy?.title && PLACEHOLDER_TITLE.test(r.title || '')) return r.copy.title;
  return r.title;
}

export function coverFor(record) {
  const seed = record.editorial_pillar || record.campaign || record.format || '';
  return dataUri(record.content_id, seed, displayTitle(record) || record.content_id);
}

// ---------- content card ----------
export function recordCard(r) {
  const sub = r.copy?.hook || r.copy?.summary || r.rationale || '';
  const foot = r.format === 'Carousel' && r.copy?.slides ? `${r.copy.slides.length} slides` : fmtDateTime(r.date, r.time);
  return `<article class="card" data-open-record="${esc(r.content_id)}">
    <img class="cover" src="${coverFor(r)}" alt="" loading="lazy">
    <div class="card-body">
      <div class="badge-row">
        <span class="badge kind">${formatIcon(r.channel, r.format)} ${esc(formatLabel(r.channel, r.format))}</span>
        ${r.editorial_pillar ? `<span class="badge">${esc(r.editorial_pillar)}</span>` : ''}
        ${statusBadge(r.status)}
        ${approvalBadge(r.owner_approval_required)}
      </div>
      <h3>${esc(displayTitle(r))}</h3>
      <p>${esc(sub)}</p>
      <div class="card-foot"><span>${esc(foot)}</span><span>${esc(r.content_id)}</span></div>
    </div>
  </article>`;
}

export function bindRecordCards(scope, onOpen) {
  scope.querySelectorAll('[data-open-record]').forEach(el => {
    el.addEventListener('click', () => onOpen(el.getAttribute('data-open-record')));
  });
}

// ---------- empty state ----------
export function emptyState(msg, icon = '—') {
  return `<div class="empty-state"><span class="ic">${icon}</span>${esc(msg)}</div>`;
}

// ---------- stat card row ----------
export function statCard(n, label, key, flag) {
  return `<div class="stat-card${flag ? ' flag' : ''}" data-stat="${esc(key)}"><div class="stat-n">${n}</div><div class="stat-label">${esc(label)}</div></div>`;
}

// ---------- drawer system ----------
let drawerEl, scrimEl;
export function initDrawer() {
  scrimEl = document.getElementById('scrim');
  drawerEl = document.getElementById('drawer');
  scrimEl.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
}
export function openDrawer(html) {
  drawerEl.innerHTML = html;
  drawerEl.querySelector('.drawer-close')?.addEventListener('click', closeDrawer);
  scrimEl.classList.add('open');
  drawerEl.classList.add('open');
  drawerEl.scrollTop = 0;
}
export function closeDrawer() {
  scrimEl.classList.remove('open');
  drawerEl.classList.remove('open');
}
export function drawerShell(bodyHtml) {
  return `<div class="drawer-head"><div></div><button class="drawer-close" aria-label="Fechar">✕</button></div><div class="drawer-body">${bodyHtml}</div>`;
}
