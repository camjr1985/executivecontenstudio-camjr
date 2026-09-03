// Central data layer. Fetches every canonical + supporting dataset once,
// joins content_library copy onto calendar records by content_id, and
// exposes read-only derived views. GitHub's data/calendar.json is never
// mutated here -- this module only reads and joins.

async function fetchJson(path) {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load ' + path);
  return res.json();
}

export async function loadStore() {
  const [calendar, library, comments, ideas, reviews, guidelines, media, buffer] = await Promise.all([
    fetchJson('data/calendar.json'),
    fetchJson('data/content_library.json'),
    fetchJson('data/comments.json'),
    fetchJson('data/ideas.json'),
    fetchJson('data/monthly_reviews.json'),
    fetchJson('data/editorial_guidelines.json'),
    fetchJson('data/media-production-queue.json'),
    fetchJson('data/buffer-mapping.json')
  ]);

  const libraryById = new Map(library.records.map(r => [r.content_id, r]));
  const mediaById = new Map(media.records.map(r => [r.content_id, r]));
  const bufferById = new Map(buffer.records.map(r => [r.content_id, r]));
  // Monthly review records (REV-00x) live in monthly_reviews.json, keyed by
  // "id" rather than "content_id" -- joined here the same way as
  // content_library.json so a Review record's real legacy title (e.g.
  // "Revisão de outubro — validar números") is available to displayTitle()
  // wherever calendar.json itself still carries a bracketed placeholder like
  // "(existing — monthly review)". calendar.json is never modified.
  const reviewsById = new Map(reviews.records.map(r => [r.id, r]));

  const records = calendar.records.map(r => ({
    ...r,
    copy: libraryById.get(r.content_id) || (r.format === 'Review' ? reviewsById.get(r.content_id) : null) || null,
    media: mediaById.get(r.content_id) || null,
    buffer: bufferById.get(r.content_id) || null
  }));

  return {
    meta: { row_count: calendar.row_count, schema_version: calendar.schema_version },
    records,
    comments: comments.records,
    ideas: ideas.records,
    reviews: reviews.records,
    guidelines,
    media: media.records,
    buffer: { dry_run_only: buffer.dry_run_only, records: buffer.records }
  };
}

// ---------- derived views ----------

export function byId(store, id) { return store.records.find(r => r.content_id === id) || null; }

export function todayISO(d = new Date()) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export function recordsForDate(store, iso) { return store.records.filter(r => r.date === iso); }

// Every count here is a strict, exact-match read of real status/field values in
// calendar.json -- never a heuristic that could quietly relabel one status as
// another. Where the real workflow vocabulary (DRAFT/PROPOSED/CONFIRMED/
// NOT_APPLICABLE today) simply has no APPROVED/READY records yet, the count is
// honestly 0 rather than repurposing an unrelated status to fill the card.
export function operationalCounts(store) {
  const r = store.records;
  return {
    total: r.length,
    needsReview: r.filter(x => x.status === 'DRAFT' || x.status === 'PROPOSED').length,
    mediaPending: r.filter(x => x.media_status === 'PENDING_MEDIA').length,
    approved: r.filter(x => x.status === 'APPROVED').length,
    ready: r.filter(x => x.status === 'READY' || x.status === 'SCHEDULED').length,
    noOwnerGate: r.filter(x => x.owner_approval_required === false).length,
    blocked: r.filter(x => x.owner_approval_required === true && (x.status === 'DRAFT' || x.status === 'PROPOSED')).length,
    ownerGates: r.filter(x => x.owner_approval_required === true).length
  };
}

export function campaignGroups(store) {
  const groups = new Map();
  store.records.filter(r => r.campaign).forEach(r => {
    if (!groups.has(r.campaign)) groups.set(r.campaign, []);
    groups.get(r.campaign).push(r);
  });
  return groups;
}

export function childrenOf(store, id) {
  return store.records.filter(r => r.parent_content_id === id).sort((a, b) => a.date < b.date ? -1 : 1);
}

export function articleCascade(store, articleId) {
  const article = byId(store, articleId);
  if (!article) return null;
  const derivatives = childrenOf(store, articleId);
  return { article, derivatives };
}

export function searchAll(store, query) {
  const q = (query || '').toLowerCase().trim();
  if (!q) return null;
  const hay = (r) => [r.title, r.editorial_pillar, r.campaign, r.copy?.hook, r.copy?.text, r.copy?.body, r.copy?.summary, r.copy?.hashtags].filter(Boolean).join(' ').toLowerCase();
  const records = store.records.filter(r => hay(r).includes(q));
  const comments = store.comments.filter(c => (c.title + ' ' + c.category + ' ' + c.text).toLowerCase().includes(q));
  const ideas = store.ideas.filter(i => (i.text + ' ' + i.theme).toLowerCase().includes(q));
  return { records, comments, ideas };
}
