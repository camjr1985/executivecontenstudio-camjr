// Optional, owner-initiated write path to GitHub, used only when the owner
// explicitly connects a token from inside the app (Fonte & Governanca).
// Nothing here runs, and no token is required, unless the owner opts in.
//
// The token lives ONLY in this browser's localStorage. It is sent to
// api.github.com and nowhere else, and it is never written into the
// repository itself. Closing the "Ligar ao GitHub" panel and clicking
// "Desligar" removes it immediately.
//
// This module intentionally exposes a narrow surface: read the canonical
// calendar.json, patch a single record's fields, and write the whole file
// back with the exact sha GitHub gave us (so a concurrent edit is detected
// as a 409 conflict instead of silently overwritten). It does not delete,
// rename, or touch any other file.

const REPO = 'camjr1985/executivecontenstudio-camjr';
const BRANCH = 'main';
const CALENDAR_PATH = 'data/calendar.json';
const TOKEN_KEY = 'ecs_gh_token';
const API = 'https://api.github.com';

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
}
export function setToken(token) {
  try { localStorage.setItem(TOKEN_KEY, token.trim()); } catch { /* private browsing etc. */ }
}
export function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}
export function isConnected() { return !!getToken(); }

// utf-8-safe base64 helpers -- the naive atob/btoa mangle accented
// Portuguese text (a, e, c-cedilha, etc.), which this dataset is full of.
function b64ToUtf8(b64) {
  const bin = atob(b64.replace(/\n/g, ''));
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}
function utf8ToB64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin);
}

async function api(path, token, opts = {}) {
  try {
    return await fetch(API + path, {
      ...opts,
      headers: {
        Authorization: 'Bearer ' + token,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
        ...opts.headers
      }
    });
  } catch (err) {
    // A raw "Failed to fetch" here is almost always a network-level failure
    // before any GitHub response -- no internet, a browser extension
    // blocking the request, or (rarely) a restrictive network CORS proxy --
    // rather than something the token or the request body caused.
    throw new Error('Não foi possível contactar o GitHub (falha de rede). Verifique a ligação à internet e tente novamente.');
  }
}

// Verifies the token can read the repo and reports whether it also has
// write (push) access, plus the authenticated login for display.
export async function verifyToken(token) {
  const [repoRes, userRes] = await Promise.all([
    api(`/repos/${REPO}`, token),
    api('/user', token)
  ]);
  if (repoRes.status === 401 || userRes.status === 401) {
    return { ok: false, error: 'Token invalido ou expirado.' };
  }
  if (repoRes.status === 404) {
    return { ok: false, error: 'Este token nao tem acesso ao repositorio ' + REPO + '.' };
  }
  if (!repoRes.ok || !userRes.ok) {
    return { ok: false, error: `GitHub respondeu ${repoRes.status}/${userRes.status}.` };
  }
  const repo = await repoRes.json();
  const user = await userRes.json();
  const canPush = !!(repo.permissions && repo.permissions.push);
  return {
    ok: true,
    login: user.login,
    canPush,
    warning: canPush ? '' : 'O token liga-se, mas nao tem permissao de escrita (Contents: Read and write) neste repositorio.'
  };
}

// Fetches the current calendar.json from GitHub (not the locally-loaded
// copy) so a write always starts from the real latest sha and content.
export async function fetchCalendarFile(token) {
  const res = await api(`/repos/${REPO}/contents/${CALENDAR_PATH}?ref=${BRANCH}`, token);
  if (!res.ok) throw new Error(`Nao foi possivel ler ${CALENDAR_PATH} do GitHub (${res.status}).`);
  const body = await res.json();
  const text = b64ToUtf8(body.content);
  return { data: JSON.parse(text), sha: body.sha };
}

// Applies `patch` (a plain object of field: value) onto the record matching
// content_id inside a freshly-fetched calendar.json, then commits the whole
// file back with that record's sha. Never touches source_record (the
// immutable original-import snapshot) or any other record.
//
// _retried is internal: a 409 means the sha we fetched went stale between
// our read and our write -- almost always because two saves from the same
// browser (e.g. the "Texto" panel and the "Editar" panel) landed close
// together, not a real external edit. That's transient, so we refetch and
// try once more automatically before bothering the owner with an error.
export async function patchRecord(token, contentId, patch, commitMessage, _retried = false) {
  const { data, sha } = await fetchCalendarFile(token);
  const idx = data.records.findIndex(r => r.content_id === contentId);
  if (idx === -1) throw new Error(`${contentId} nao foi encontrado no calendar.json atual.`);

  const before = data.records[idx];
  const nowIso = new Date().toISOString();
  data.records[idx] = {
    ...before,
    ...patch,
    updated_at: nowIso,
    revision: (before.revision || 1) + 1
  };

  const newContent = JSON.stringify(data, null, 2) + '\n';
  const res = await api(`/repos/${REPO}/contents/${CALENDAR_PATH}`, token, {
    method: 'PUT',
    body: JSON.stringify({
      message: commitMessage,
      content: utf8ToB64(newContent),
      sha,
      branch: BRANCH
    })
  });

  if (res.status === 409) {
    if (!_retried) return patchRecord(token, contentId, patch, commitMessage, true);
    throw new Error('CONFLICT: o ficheiro no GitHub mudou entretanto e a nova tentativa automatica tambem falhou. Feche e reabra o registo e tente de novo.');
  }
  if (res.status === 401) throw new Error('Token invalido ou expirado.');
  if (res.status === 403) throw new Error('O token nao tem permissao de escrita neste repositorio.');
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`GitHub recusou o commit (${res.status}): ${body.message || 'erro desconhecido'}.`);
  }

  return data.records[idx];
}

// Creates a new record cloned from `sourceContentId`, linked to it via
// parent_content_id, with `overrides.channel`/`overrides.format` applied and
// everything channel-specific reset to a fresh, unpublished state (own
// status/media/text -- nothing carried over that would misrepresent this as
// already-done work on the new channel). Shared context (date, time,
// editorial_pillar, campaign, market, language, media_asset) is kept as-is
// since that's usually still correct for the same idea on another channel.
// Grows calendar.json by one record and keeps row_count in sync -- the
// calendar is allowed to grow now that the app supports real duplication,
// same as any other owner-authored write here.
export async function duplicateRecord(token, sourceContentId, overrides) {
  const { data, sha } = await fetchCalendarFile(token);
  const source = data.records.find(r => r.content_id === sourceContentId);
  if (!source) throw new Error(`${sourceContentId} nao foi encontrado no calendar.json atual.`);

  const existingIds = new Set(data.records.map(r => r.content_id));
  const suffix = { LinkedIn: 'LI', Instagram: 'IG', Live: 'LV' }[overrides.channel] || 'DUP';
  let newId = `${sourceContentId}-${suffix}`;
  let n = 2;
  while (existingIds.has(newId)) { newId = `${sourceContentId}-${suffix}${n}`; n += 1; }

  // A pre-filled seed text (the source's own real copy, or its own
  // draft_text) saves the owner from starting on a blank page -- but it's
  // the OLD channel's text verbatim, so it's marked IN_PROGRESS (needs
  // adapting), never READY, until the owner actually reviews/edits it here.
  const seedText = (overrides.draft_text || '').trim();

  const nowIso = new Date().toISOString();
  const clone = {
    ...source,
    content_id: newId,
    parent_content_id: sourceContentId,
    title: `${source.title} (cópia — ${overrides.channel})`,
    channel: overrides.channel,
    format: overrides.format,
    status: 'DRAFT',
    owner_approval_required: true,
    buffer_eligible: 'NO',
    automation_eligible: 'NO',
    media_status: 'PENDING_MEDIA',
    qc_status: null,
    buffer_id: null,
    publication_status: 'PENDING',
    publication_url: null,
    published_at: null,
    copy_status: seedText ? 'IN_PROGRESS' : 'PENDING',
    draft_text: seedText,
    existing_or_new: 'NEW',
    decision: 'NEW',
    rationale: `Duplicado de ${sourceContentId} para ${overrides.channel} via Fonte & Governança`,
    created_at: nowIso,
    updated_at: nowIso,
    revision: 1
  };
  delete clone.copy;
  delete clone.source_record;
  delete clone.buffer;

  data.records.push(clone);
  data.row_count = data.records.length;

  const newContent = JSON.stringify(data, null, 2) + '\n';
  const res = await api(`/repos/${REPO}/contents/${CALENDAR_PATH}`, token, {
    method: 'PUT',
    body: JSON.stringify({
      message: `Duplicar ${sourceContentId} para ${overrides.channel} (${newId}) via Fonte & Governança`,
      content: utf8ToB64(newContent),
      sha,
      branch: BRANCH
    })
  });

  if (res.status === 409) throw new Error('CONFLICT: o ficheiro no GitHub mudou entretanto. Tente novamente.');
  if (res.status === 401) throw new Error('Token invalido ou expirado.');
  if (res.status === 403) throw new Error('O token nao tem permissao de escrita neste repositorio.');
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`GitHub recusou o commit (${res.status}): ${body.message || 'erro desconhecido'}.`);
  }

  return clone;
}
