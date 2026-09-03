// Shared helpers. Pure functions, no DOM side effects except toast()/copyText().

export function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
}
export function nl2br(v) { return esc(v).replace(/\n/g, '<br>'); }

const PT_MONTHS = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
const PT_MONTHS_FULL = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const PT_DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function pad(n) { return n < 10 ? '0' + n : String(n); }
export function isoDate(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
export function parseISO(iso) { return new Date(iso + 'T00:00:00'); }

export function fmtDate(iso) {
  if (!iso) return '—';
  const d = parseISO(iso);
  if (isNaN(d.getTime())) return iso;
  return d.getDate() + ' ' + PT_MONTHS[d.getMonth()] + ' ' + d.getFullYear();
}
const PLACEHOLDER_VALUES = new Set(['TBD_OWNER', 'NOT_APPLICABLE', 'PENDING_OWNER', 'TBD']);
export function isPlaceholderValue(v) { return v == null || PLACEHOLDER_VALUES.has(v); }
export function displayTime(time) { return isPlaceholderValue(time) ? 'horário a confirmar' : time; }
export function fmtDateTime(iso, time) {
  const base = fmtDate(iso);
  if (isPlaceholderValue(time)) return base + ' · horário a confirmar';
  return time ? base + ' · ' + time : base;
}
export function fmtMonthYear(year, month) { return capitalize(PT_MONTHS_FULL[month]) + ' ' + year; }
export function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
export const DOW = PT_DOW;

export function findById(list, id) { return (list || []).find(x => (x.content_id || x.id) === id) || null; }
export function sortByDate(list, key = 'date') { return [...(list || [])].sort((a, b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0)); }
export function uniqueSorted(arr) { return [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt')); }
export function dayOfYear(d) { const start = new Date(d.getFullYear(), 0, 0); return Math.floor((d - start) / 86400000); }

export function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2200);
}

export function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => toast('Texto copiado.'), () => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}
function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); toast('Texto copiado.'); } catch (e) { toast('Não foi possível copiar.'); }
  document.body.removeChild(ta);
}

export function qs(sel, scope) { return (scope || document).querySelector(sel); }
export function qsa(sel, scope) { return Array.from((scope || document).querySelectorAll(sel)); }

export function on(scope, sel, evt, handler) {
  qsa(sel, scope).forEach(el => el.addEventListener(evt, handler));
}
