import { esc, pad, DOW, fmtMonthYear, fmtDateTime, capitalize, isPlaceholderValue } from '../lib/util.js';
import { formatIcon, statusBadge, emptyState, recordCard, bindRecordCards, displayTitle } from '../components.js';
import { pageHead, openRecordDrawer } from './_shared.js';

let mode = 'month'; // 'month' | 'list'
let channelFilter = 'all';

export function renderCalendar(root, store, navigate, param) {
  const today = new Date();
  const base = param ? new Date(param + '-01T00:00:00') : new Date(today.getFullYear(), today.getMonth(), 1);
  const year = base.getFullYear(), month = base.getMonth();
  const openHandler = (id) => openRecordDrawer(store, id);

  const filters = [
    { key: 'all', label: 'Todos' },
    { key: 'LinkedIn', label: '🖼️ LinkedIn' },
    { key: 'Instagram', label: '📱 Instagram' },
    { key: 'Live', label: '🎙️ Live' },
    { key: 'campaigns', label: '🎯 Campanhas' }
  ];

  root.innerHTML =
    pageHead('Planeamento', 'Calendário editorial', `${store.records.length} registos canónicos · GitHub.`) +
    `<div class="chip-row" id="modeChips">
      <button class="chip${mode === 'month' ? ' active' : ''}" data-mode="month">📅 Mês</button>
      <button class="chip${mode === 'list' ? ' active' : ''}" data-mode="list">📋 Lista</button>
    </div>
    <div class="chip-row" id="channelChips">${filters.map(f => `<button class="chip${channelFilter === f.key ? ' active' : ''}" data-chan="${f.key}">${f.label}</button>`).join('')}</div>
    <div id="calBody"></div>`;

  root.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => {
    mode = b.getAttribute('data-mode');
    renderCalendar(root, store, navigate, `${year}-${pad(month + 1)}`);
  }));
  root.querySelectorAll('[data-chan]').forEach(b => b.addEventListener('click', () => {
    channelFilter = b.getAttribute('data-chan');
    root.querySelectorAll('[data-chan]').forEach(c => c.classList.toggle('active', c === b));
    drawBody();
  }));

  function filtered() {
    if (channelFilter === 'all') return store.records;
    if (channelFilter === 'campaigns') return store.records.filter(r => !!r.campaign);
    return store.records.filter(r => r.channel === channelFilter);
  }

  function drawBody() {
    const body = document.getElementById('calBody');
    if (mode === 'month') body.innerHTML = monthGrid(year, month, filtered());
    else body.innerHTML = listView(filtered());
    if (mode === 'month') {
      body.querySelectorAll('[data-nav]').forEach(b => b.addEventListener('click', () => navigate('#/calendar/' + b.getAttribute('data-nav'))));
      body.querySelectorAll('[data-cal-open]').forEach(b => b.addEventListener('click', () => openHandler(b.getAttribute('data-cal-open'))));
    } else {
      bindRecordCards(body, openHandler);
      body.querySelectorAll('tbody tr[data-open-record]').forEach(el => el.addEventListener('click', () => openHandler(el.getAttribute('data-open-record'))));
    }
  }
  drawBody();
}

function monthGrid(year, month, records) {
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevAnchor = new Date(year, month - 1, 1), nextAnchor = new Date(year, month + 1, 1);
  const prevKey = prevAnchor.getFullYear() + '-' + pad(prevAnchor.getMonth() + 1);
  const nextKey = nextAnchor.getFullYear() + '-' + pad(nextAnchor.getMonth() + 1);
  const todayIso = new Date().toISOString().slice(0, 10);

  let cells = '';
  for (let i = 0; i < firstDow; i += 1) cells += '<div class="cal-day empty"></div>';
  for (let d = 1; d <= daysInMonth; d += 1) {
    const iso = `${year}-${pad(month + 1)}-${pad(d)}`;
    const events = records.filter(r => r.date === iso);
    cells += `<div class="cal-day${iso === todayIso ? ' today' : ''}"><span class="num">${d}</span>${events.map(e => {
      const cls = e.channel === 'Live' ? 'c-live' : e.channel === 'Instagram' ? 'c-instagram' : 'c-linkedin';
      const timeLabel = isPlaceholderValue(e.time) ? '' : esc(e.time) + ' ';
      const title = displayTitle(e);
      return `<div class="cal-event ${cls}" data-cal-open="${esc(e.content_id)}" title="${esc(title)}${isPlaceholderValue(e.time) ? ' (horário a confirmar)' : ''}">${formatIcon(e.channel, e.format)} ${timeLabel}${esc(title)}</div>`;
    }).join('')}</div>`;
  }
  return `<div class="cal-nav">
      <button class="btn small" data-nav="${prevKey}">← Anterior</button>
      <h2>${esc(capitalize(fmtMonthYear(year, month)))}</h2>
      <button class="btn small" data-nav="${nextKey}">Seguinte →</button>
    </div>
    <div class="cal-grid">${DOW.map(d => `<div class="cal-dow">${d}</div>`).join('')}${cells}</div>`;
}

function listView(records) {
  const sorted = [...records].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  if (!sorted.length) return emptyState('Nenhum registo com este filtro.');
  return `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Canal</th><th>Formato</th><th>Título</th><th>Campanha</th><th>Estado</th><th>Owner gate</th></tr></thead><tbody>
    ${sorted.map(r => `<tr data-open-record="${esc(r.content_id)}">
      <td>${esc(fmtDateTime(r.date, r.time))}</td>
      <td>${esc(r.channel)}</td>
      <td>${formatIcon(r.channel, r.format)} ${esc(r.format)}</td>
      <td>${esc(displayTitle(r))}</td>
      <td>${r.campaign ? esc(r.campaign) : '—'}</td>
      <td>${statusBadge(r.status)}</td>
      <td>${r.owner_approval_required ? '⚠️' : '—'}</td>
    </tr>`).join('')}
  </tbody></table></div>`;
}
