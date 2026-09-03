// Migrates real content from legacy-netlify-snapshot/data.js into GitHub-canonical
// supporting datasets. Never invents content: everything written here is a direct
// copy of a real legacy record, tagged with its provenance. data/calendar.json is
// read-only input here and is never modified by this script.
import fs from 'node:fs';
import vm from 'node:vm';

const ROOT = new URL('..', import.meta.url);
const read = (p) => fs.readFileSync(new URL(p, ROOT), 'utf8');
const writeJson = (p, obj) => fs.writeFileSync(new URL(p, ROOT), JSON.stringify(obj, null, 2) + '\n');

// --- load legacy data.js (a browser script: `window.CONTENT_DATA = {...}`) ---
const legacySrc = read('legacy-netlify-snapshot/data.js');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(legacySrc, sandbox);
const LEGACY = sandbox.window.CONTENT_DATA;
if (!LEGACY || !Array.isArray(LEGACY.posts)) throw new Error('Failed to load legacy CONTENT_DATA');

const SOURCE = 'LEGACY_EXECUTIVE_CONTENT_STUDIO';
const MIGRATED_AT = '2026-09-03T00:00:00Z';

// --- calendar.json (read-only check, not modified) ---
const calendar = JSON.parse(read('data/calendar.json'));
if (calendar.row_count !== 79 || calendar.records.length !== 79) {
  throw new Error('calendar.json is not the expected 79-row canonical baseline — refusing to proceed');
}
const existingIds = new Set(calendar.records.filter(r => r.existing_or_new === 'EXISTING').map(r => r.content_id));

// --- content_library.json: full legacy copy for every EXISTING content_id ---
const library = [];
function addLibraryRecords(kind, items, mapFields) {
  for (const item of items) {
    if (!existingIds.has(item.id)) continue; // only migrate copy calendar.json actually references
    library.push({
      content_id: item.id,
      kind,
      ...mapFields(item),
      source: SOURCE,
      migrated_at: MIGRATED_AT
    });
  }
}
addLibraryRecords('posts', LEGACY.posts, (p) => ({
  title: p.title, theme: p.theme, format: p.format, audience: p.audience,
  hook: p.hook, text: p.text, cta: p.cta, hashtags: p.hashtags, image_prompt: p.imagePrompt,
  legacy_status: p.status
}));
addLibraryRecords('carousels', LEGACY.carousels, (c) => ({
  title: c.title, theme: c.theme, summary: c.summary, cta: c.cta, hashtags: c.hashtags,
  image_prompt: c.imagePrompt, slides: c.slides, legacy_status: c.status
}));
addLibraryRecords('articles', LEGACY.articles, (a) => ({
  title: a.title, theme: a.theme, read_time: a.readTime, body: a.body, hashtags: a.hashtags,
  image_prompt: a.imagePrompt, legacy_status: a.status
}));

const libraryIds = new Set(library.map(r => r.content_id));
// Only Post/Carousel/Article-format EXISTING records are expected to carry full
// copy here — News/Review-format EXISTING records join monthly_reviews.json /
// stay reserve-only instead, so they're excluded from this check.
const copyBearingIds = new Set(
  calendar.records
    .filter(r => r.existing_or_new === 'EXISTING' && ['Post', 'Carousel', 'Article'].includes(r.format))
    .map(r => r.content_id)
);
const missing = [...copyBearingIds].filter(id => !libraryIds.has(id));

writeJson('data/content_library.json', {
  schema_version: '1.0.0',
  source: SOURCE,
  note: 'Full editorial copy for the 41 EXISTING calendar.json records, joined by content_id. NEW records have no entry here — no copy exists for them yet.',
  records: library
});

// --- comments.json ---
writeJson('data/comments.json', {
  schema_version: '1.0.0',
  source: SOURCE,
  migrated_at: MIGRATED_AT,
  records: LEGACY.comments.map(c => ({ ...c, source: SOURCE }))
});

// --- ideas.json (adds a lifecycle field; everything else verbatim) ---
writeJson('data/ideas.json', {
  schema_version: '1.0.0',
  source: SOURCE,
  migrated_at: MIGRATED_AT,
  records: LEGACY.ideas.map(i => ({ ...i, lifecycle: 'IDEA', converted_content_id: null, source: SOURCE }))
});

// --- monthly_reviews.json ---
writeJson('data/monthly_reviews.json', {
  schema_version: '1.0.0',
  source: SOURCE,
  migrated_at: MIGRATED_AT,
  records: LEGACY.reviews.map(r => ({ ...r, source: SOURCE }))
});

// --- editorial_guidelines.json (Guia de Escrita static content, ported verbatim) ---
writeJson('data/editorial_guidelines.json', {
  schema_version: '1.0.0',
  source: SOURCE,
  migrated_at: MIGRATED_AT,
  do: [
    'Comece pelo facto, pela tensão ou pela experiência concreta — não pelo contexto óbvio (\"no mundo atual…\").',
    'Use um exemplo, número ou situação real sempre que possível. Especificidade é o que mais diferencia texto humano de texto genérico.',
    'Escreva como fala. Se uma frase soa estranha lida em voz alta, reescreva-a.',
    'Varie o comprimento das frases. Uma frase curta a seguir a uma longa cria ritmo — texto de IA tende a ser uniforme.',
    'Tenha uma opinião clara, mesmo que discutível. Texto executivo que não arrisca nada também não gera conversa.',
    'Termine com uma pergunta genuína — algo que você realmente quer saber, não uma pergunta de fórmula.'
  ],
  avoid: [
    '\"Não é apenas X, é Y\" — a estrutura mais repetida em texto gerado por IA.',
    '\"No mundo atual/Na era digital/No cenário atual…\" como abertura genérica.',
    '\"É importante notar que…\", \"Vale ressaltar que…\" — anunciar a frase em vez de a dizer.',
    'Excesso de travessões (—) a fazer o trabalho da pontuação normal.',
    'Palavras vagas de discurso corporativo: \"revolucionário\", \"sinergia\", \"disruptivo\", \"holístico\".',
    'Fechos formulaicos: \"Em suma…\", \"Em conclusão…\", \"Por fim, mas não menos importante…\".',
    'Três parágrafos com exatamente o mesmo tamanho e a mesma estrutura — parece gerado, não escrito.'
  ],
  checklist: [
    'Há pelo menos um facto, número ou exemplo concreto — não só afirmações genéricas?',
    'Se eu ler em voz alta, soa como eu a falar, ou como um relatório?',
    'Tirei as frases que só anunciam o que vou dizer, sem dizer nada?',
    'A opinião está clara, ou ficou tudo em cima do muro para agradar a todos?',
    'O CTA/pergunta final é algo que eu realmente quero saber?'
  ],
  comment_skeletons: [
    'Concordo com o ponto sobre [tema]. Na minha experiência em [contexto/empresa], vi algo parecido quando [situação real] — e o que resolveu foi [ação concreta].',
    'Eu discordaria só num ponto: [onde discorda] — porque [motivo baseado em experiência própria]. Fora isso, [tema] é mesmo um dos maiores desafios que vejo em [contexto].',
    'Isto conecta diretamente com algo que aprendi a lidar em [tema]: [lição específica]. Curioso para saber como resolveram [pergunta pontual sobre o post].',
    'Um dado que reforça este ponto: [número ou estatística real que conheça]. Sem isso, fica difícil convencer quem decide orçamento em [tema].',
    'O que mais me marcou aqui foi [frase ou ideia específica do post]. Isso mudou a forma como penso [algo concreto na sua prática].',
    'Pergunta genuína: como é que lidam com [situação difícil relacionada com o tema] quando [restrição real, ex.: equipa pequena / prazo apertado]?'
  ]
});

console.log('MIGRATION_OK');
console.log('content_library records:', library.length, '/ 41 EXISTING ids');
if (missing.length) console.log('MISSING (no legacy match found):', missing.join(', '));
console.log('comments:', LEGACY.comments.length, 'ideas:', LEGACY.ideas.length, 'reviews:', LEGACY.reviews.length);
