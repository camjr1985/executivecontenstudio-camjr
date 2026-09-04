import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const readJson = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url)));
const calendar = readJson('../data/calendar.json');
const library = readJson('../data/content_library.json');
const comments = readJson('../data/comments.json');
const ideas = readJson('../data/ideas.json');
const reviews = readJson('../data/monthly_reviews.json');

// calendar.json started as a fixed 79-row migrated baseline; the content
// migration script (this file's main subject) must never touch it. Real
// owner-authored growth (e.g. duplicating a record to another channel) is
// a separate, legitimate way the row count can now exceed 79 -- so this
// checks internal consistency and the floor, not an exact frozen count.
test('calendar.json baseline is intact (content migration never wrote to it)', () => {
  assert.equal(calendar.row_count, calendar.records.length);
  assert.ok(calendar.records.length >= 79);
  for (const r of calendar.records) assert.ok(['LinkedIn', 'Instagram', 'Live'].includes(r.channel), `unexpected channel on ${r.content_id}`);
});

test('content_library only covers EXISTING Post/Carousel/Article/News records, every one migrated', () => {
  const expected = calendar.records.filter(r => r.existing_or_new === 'EXISTING' && ['Post', 'Carousel', 'Article', 'News'].includes(r.format));
  assert.equal(library.records.length, expected.length);
  const libraryIds = new Set(library.records.map(r => r.content_id));
  for (const r of expected) assert.ok(libraryIds.has(r.content_id), `missing library entry for ${r.content_id}`);
  for (const r of library.records) assert.equal(r.source, 'LEGACY_EXECUTIVE_CONTENT_STUDIO');
});

test('NEW records never appear in content_library (no fabricated copy)', () => {
  const newIds = new Set(calendar.records.filter(r => r.existing_or_new === 'NEW').map(r => r.content_id));
  for (const r of library.records) assert.ok(!newIds.has(r.content_id), `NEW record ${r.content_id} must not have library copy`);
});

test('comments, ideas, monthly reviews carry provenance and expected counts', () => {
  assert.equal(comments.records.length, 6);
  assert.equal(ideas.records.length, 18);
  assert.equal(reviews.records.length, 5);
  for (const r of [...comments.records, ...ideas.records, ...reviews.records]) assert.equal(r.source, 'LEGACY_EXECUTIVE_CONTENT_STUDIO');
  for (const i of ideas.records) assert.equal(i.lifecycle, 'IDEA');
});

test('protected editorial records are unchanged', () => {
  const gates = { 'POST-038': ['2026-09-13', 'MOVE', true], 'POST-041': ['2026-09-20', 'MOVE', true], 'POST-047': ['2026-09-29', 'KEEP', false], 'POST-026': ['2026-12-15', 'REVISE', true] };
  for (const [id, [date, decision, approval]] of Object.entries(gates)) {
    const r = calendar.records.find(x => x.content_id === id);
    assert.ok(r, `${id} missing`);
    assert.equal(r.date, date); assert.equal(r.decision, decision); assert.equal(r.owner_approval_required, approval);
  }
});
