/* ============================================================
   EXECUTIVE CONTENT REPOSITORY — APP
   Router simples por hash + funções de renderização por vista.
   Sem frameworks, sem build.

   Camadas de dados:
   - BASE      → conteúdo original de data.js (nunca é alterado)
   - overrides → alterações feitas na própria plataforma (Gerir
                 Conteúdo), guardadas em localStorage
   - DATA      → BASE + overrides já combinados, recalculado
                 sempre que algo é criado/editado/eliminado

   Temas/categorias nunca são uma lista fixa: são recalculados
   a partir do conteúdo que realmente existe (computeCategories).
   ============================================================ */
(function () {
  "use strict";

  var root = document.getElementById("view-root");
  var TODAY = new Date();
  var TODAY_ISO = isoDate(TODAY);

  var KIND_LABELS = {
    posts: { icon: "🖼️", label: "Imagem", plural: "Posts" },
    carousels: { icon: "📚", label: "Carrossel", plural: "Carrosséis" },
    articles: { icon: "📖", label: "Artigo", plural: "Artigos" },
    news: { icon: "📰", label: "Notícia", plural: "Notícias" },
    comments: { icon: "💬", label: "Comentário", plural: "Comentários" },
    ideas: { icon: "💡", label: "Ideia", plural: "Ideias" },
    reviews: { icon: "📊", label: "Revisão", plural: "Revisões" }
  };
  var ID_PREFIX = { posts: "POST", carousels: "CAR", articles: "ART", news: "NEWS", comments: "COM", ideas: "IDEA", reviews: "REV" };

  var STYLE_CHECK_FIELDS = {
    posts: ["hook", "text", "cta"],
    carousels: ["summary", "cta"],
    articles: ["summary", "body"]
  };

  var FIELD_SCHEMAS = {
    posts: [
      { key: "title", label: "Título", type: "text", required: true },
      { key: "theme", label: "Tema", type: "text", required: true, hint: "Pode escrever um tema novo — as categorias atualizam-se sozinhas." },
      { key: "date", label: "Data", type: "date", required: true },
      { key: "time", label: "Horário (Lisboa)", type: "time", hint: "Recomendado: 12h, terça a quinta — bom compromisso entre Portugal, Europa e Brasil." },
      { key: "status", label: "Estado", type: "select", options: ["Pronto", "Rascunho", "Publicado"] },
      { key: "format", label: "Formato editorial", type: "text", hint: "Ex.: Post, Post técnico, Storytelling." },
      { key: "audience", label: "Público-alvo", type: "text" },
      { key: "hook", label: "Gancho (primeira linha)", type: "textarea", rows: 3 },
      { key: "text", label: "Texto principal", type: "textarea", rows: 8 },
      { key: "cta", label: "Pergunta / CTA", type: "textarea", rows: 2 },
      { key: "hashtags", label: "Hashtags", type: "text" },
      { key: "imagePrompt", label: "Prompt da imagem", type: "textarea", rows: 3 }
    ],
    carousels: [
      { key: "title", label: "Título", type: "text", required: true },
      { key: "theme", label: "Tema", type: "text", required: true, hint: "Pode escrever um tema novo — as categorias atualizam-se sozinhas." },
      { key: "date", label: "Data", type: "date", required: true },
      { key: "time", label: "Horário (Lisboa)", type: "time", hint: "Recomendado: 12h, terça a quinta." },
      { key: "status", label: "Estado", type: "select", options: ["Pronto", "Rascunho", "Publicado"] },
      { key: "summary", label: "Resumo", type: "textarea", rows: 2 },
      { key: "cta", label: "Texto do post / CTA", type: "textarea", rows: 3 },
      { key: "hashtags", label: "Hashtags", type: "text" },
      { key: "imagePrompt", label: "Prompt da capa", type: "textarea", rows: 3 }
    ],
    articles: [
      { key: "title", label: "Título", type: "text", required: true },
      { key: "theme", label: "Tema", type: "text", required: true, hint: "Pode escrever um tema novo — as categorias atualizam-se sozinhas." },
      { key: "date", label: "Data", type: "date", required: true },
      { key: "time", label: "Horário (Lisboa)", type: "time", hint: "Recomendado: 12h, terça a quinta." },
      { key: "status", label: "Estado", type: "select", options: ["Pronto", "Rascunho", "Publicado"] },
      { key: "readTime", label: "Tempo de leitura", type: "text", hint: "Ex.: 6 min" },
      { key: "summary", label: "Resumo", type: "textarea", rows: 2 },
      { key: "body", label: "Artigo (texto completo)", type: "textarea", rows: 12 },
      { key: "hashtags", label: "Hashtags", type: "text" },
      { key: "imagePrompt", label: "Prompt da imagem", type: "textarea", rows: 3 }
    ],
    news: [
      { key: "title", label: "Título", type: "text", required: true },
      { key: "date", label: "Data", type: "date", required: true },
      { key: "time", label: "Horário (Lisboa)", type: "time", hint: "Recomendado: 12h, terça a quinta." },
      { key: "source", label: "Fonte", type: "text" },
      { key: "url", label: "Link da fonte", type: "text" },
      { key: "summary", label: "Resumo", type: "textarea", rows: 2 },
      { key: "repost", label: "Texto do repost", type: "textarea", rows: 5 },
      { key: "hashtags", label: "Hashtags", type: "text" }
    ],
    comments: [
      { key: "category", label: "Categoria", type: "text", required: true, hint: "Pode escrever uma categoria nova." },
      { key: "title", label: "Título", type: "text", required: true },
      { key: "text", label: "Texto do comentário", type: "textarea", rows: 5 }
    ],
    ideas: [
      { key: "theme", label: "Tema", type: "text", required: true, hint: "Pode escrever um tema novo." },
      { key: "text", label: "Ideia", type: "textarea", rows: 3 }
    ],
    reviews: [
      { key: "title", label: "Título", type: "text", required: true },
      { key: "date", label: "Data", type: "date", required: true },
      { key: "period", label: "Período", type: "text", hint: "Ex.: Agosto 2026" },
      { key: "summary", label: "Resumo", type: "textarea", rows: 2 },
      { key: "notes", label: "Notas / conclusões (preencher depois de rever)", type: "textarea", rows: 4 }
    ]
  };

  /* ---------- data layer ---------- */

  var BASE = safeParse(JSON.stringify(window.CONTENT_DATA || {})) || { posts: [], carousels: [], articles: [], news: [], comments: [], ideas: [], reviews: [], categories: [] };
  var OVERRIDE_KEY = "ecr_overrides_v1";
  var overrides = safeParse(localStorage.getItem(OVERRIDE_KEY)) || emptyOverrides();
  var DATA = { posts: [], carousels: [], articles: [], news: [], comments: [], ideas: [], reviews: [], categories: [] };

  var STATE_KEY = "ecr_published_v1";
  var published = safeParse(localStorage.getItem(STATE_KEY)) || {};

  var calendarTypeFilter = "all";

  function emptyOverrides() {
    return {
      posts: {}, carousels: {}, articles: {}, news: {}, comments: {}, ideas: {}, reviews: {},
      deleted: { posts: [], carousels: [], articles: [], news: [], comments: [], ideas: [], reviews: [] }
    };
  }

  function saveOverrides() { localStorage.setItem(OVERRIDE_KEY, JSON.stringify(overrides)); }

  function mergeList(baseList, overrideMap, deletedIds) {
    var deletedSet = {};
    (deletedIds || []).forEach(function (id) { deletedSet[id] = true; });
    var overriddenSet = {};
    Object.keys(overrideMap || {}).forEach(function (id) { overriddenSet[id] = true; });
    var out = [];
    (baseList || []).forEach(function (item) {
      if (deletedSet[item.id]) return;
      out.push(overriddenSet[item.id] ? overrideMap[item.id] : item);
    });
    Object.keys(overrideMap || {}).forEach(function (id) {
      var inBase = (baseList || []).some(function (b) { return b.id === id; });
      if (!inBase && !deletedSet[id]) out.push(overrideMap[id]);
    });
    return out;
  }

  function computeCategories(built) {
    var found = {};
    (BASE.categories || []).forEach(function (c) { found[c] = true; });
    built.posts.forEach(function (p) { if (p.theme) found[p.theme] = true; });
    built.carousels.forEach(function (p) { if (p.theme) found[p.theme] = true; });
    built.articles.forEach(function (p) { if (p.theme) found[p.theme] = true; });
    built.ideas.forEach(function (p) { if (p.theme) found[p.theme] = true; });
    built.comments.forEach(function (p) { if (p.category) found[p.category] = true; });
    return Object.keys(found).sort(function (a, b) { return a.localeCompare(b, "pt"); });
  }

  function rebuildData() {
    DATA.posts = mergeList(BASE.posts, overrides.posts, overrides.deleted.posts);
    DATA.carousels = mergeList(BASE.carousels, overrides.carousels, overrides.deleted.carousels);
    DATA.articles = mergeList(BASE.articles, overrides.articles, overrides.deleted.articles);
    DATA.news = mergeList(BASE.news, overrides.news, overrides.deleted.news);
    DATA.comments = mergeList(BASE.comments, overrides.comments, overrides.deleted.comments);
    DATA.ideas = mergeList(BASE.ideas, overrides.ideas, overrides.deleted.ideas);
    DATA.reviews = mergeList(BASE.reviews, overrides.reviews, overrides.deleted.reviews);
    DATA.categories = computeCategories(DATA);
    showDataAlerts(validateData(DATA));
  }

  function validateData(d) {
    var issues = [];
    ["posts", "carousels", "articles", "news"].forEach(function (kind) {
      var seenIds = {};
      (d[kind] || []).forEach(function (item) {
        if (!item.id) { issues.push(kind + ": item sem ID"); return; }
        if (seenIds[item.id]) issues.push("ID duplicado: " + item.id);
        seenIds[item.id] = true;
        if (!item.title) issues.push(item.id + ": sem título");
        if (!item.date || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) issues.push(item.id + ": data em falta ou inválida");
        if (kind !== "news" && !item.theme) issues.push(item.id + ": sem tema");
      });
    });
    var reviewIds = {};
    (d.reviews || []).forEach(function (r) {
      if (!r.id) { issues.push("reviews: item sem ID"); return; }
      if (reviewIds[r.id]) issues.push("ID duplicado: " + r.id);
      reviewIds[r.id] = true;
      if (!r.title) issues.push(r.id + ": sem título");
      if (!r.date || !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) issues.push(r.id + ": data em falta ou inválida");
    });
    (d.comments || []).forEach(function (c) {
      if (!c.title) issues.push((c.id || "comentário") + ": sem título");
      if (!c.category) issues.push((c.id || "comentário") + ": sem categoria");
    });
    return issues;
  }

  function showDataAlerts(issues) {
    var existing = document.getElementById("dataAlertBanner");
    if (existing) existing.remove();
    if (!issues || !issues.length) return;
    var div = document.createElement("div");
    div.id = "dataAlertBanner";
    div.className = "data-alert";
    div.innerHTML = "<span><strong>Aviso de validação (" + issues.length + "):</strong> " +
      esc(issues.slice(0, 3).join(" · ")) + (issues.length > 3 ? " …" : "") + "</span>" +
      '<button id="dataAlertClose" aria-label="Fechar aviso">✕</button>';
    document.body.insertBefore(div, document.body.firstChild);
    document.getElementById("dataAlertClose").onclick = function () { div.remove(); };
  }

  function nextId(kind) {
    var prefix = ID_PREFIX[kind];
    var max = 0;
    (DATA[kind] || []).forEach(function (item) {
      var m = /-(\d+)$/.exec(item.id || "");
      if (m) { var n = parseInt(m[1], 10); if (n > max) max = n; }
    });
    return prefix + "-" + pad3(max + 1);
  }
  function pad3(n) { return n < 10 ? "00" + n : n < 100 ? "0" + n : String(n); }

  /* ---------- generic helpers ---------- */

  function safeParse(v) { try { return JSON.parse(v); } catch (e) { return null; } }

  function isoDate(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function pad(n) { return n < 10 ? "0" + n : String(n); }

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c];
    });
  }
  function nl2br(v) { return esc(v).replace(/\n/g, "<br>"); }

  function fmtDate(iso) {
    var d = new Date(iso + "T00:00:00");
    if (isNaN(d.getTime())) return iso || "—";
    return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
  }

  function fmtDateTime(iso, time) {
    var base = fmtDate(iso);
    return time ? base + " · " + time : base;
  }

  function toast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove("show"); }, 2200);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast("Texto copiado."); }, function () { fallbackCopy(text); });
    } else {
      fallbackCopy(text);
    }
  }
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); toast("Texto copiado."); } catch (e) { toast("Não foi possível copiar."); }
    document.body.removeChild(ta);
  }

  function isPublished(kind, id) { return !!(published[kind] && published[kind][id]); }
  function togglePublished(kind, id) {
    published[kind] = published[kind] || {};
    published[kind][id] = !published[kind][id];
    localStorage.setItem(STATE_KEY, JSON.stringify(published));
  }

  function postFullText(p) { return [p.hook, p.text, p.cta, p.hashtags].filter(Boolean).join("\n\n"); }
  function articleFullText(a) { return [a.title, "", a.body, "", a.hashtags].filter(function (v) { return v !== undefined; }).join("\n"); }
  function carouselFullText(c) {
    var slides = c.slides.map(function (s, i) { return "Slide " + (i + 1) + " — " + s.title + "\n" + s.body; }).join("\n\n");
    return [c.title, "", slides, "", c.cta, c.hashtags].join("\n");
  }

  function coverImg(item, cls) {
    var uri = window.Cover.dataUri(item.id, item.theme || "", item.title || item.text || item.id);
    return '<img class="cover ' + (cls || "") + '" src="' + uri + '" alt="Capa de ' + esc(item.title || item.id) + '" loading="lazy">';
  }

  function downloadCover(item) {
    var svg = window.Cover.svgMarkup(item.id, item.theme || "", item.title);
    var blob = new Blob([svg], { type: "image/svg+xml" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = item.id.toLowerCase() + "-capa.svg";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    toast("Imagem descarregada.");
  }

  function findById(list, id) {
    for (var i = 0; i < (list || []).length; i += 1) if (list[i].id === id) return list[i];
    return null;
  }

  function sortByDate(list) {
    return list.slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  }

  function pickForToday(list) {
    var sorted = sortByDate(list);
    var exact = sorted.filter(function (x) { return x.date === TODAY_ISO; });
    if (exact.length) return exact[0];
    var upcoming = sorted.filter(function (x) { return x.date > TODAY_ISO; });
    if (upcoming.length) return upcoming[0];
    return sorted.length ? sorted[sorted.length - 1] : null;
  }

  function dayOfYear(d) {
    var start = new Date(d.getFullYear(), 0, 0);
    return Math.floor((d - start) / 86400000);
  }

  function uniqueSorted(arr) {
    var seen = {}; var out = [];
    arr.forEach(function (v) { if (v && !seen[v]) { seen[v] = true; out.push(v); } });
    return out.sort();
  }

  /* ---------- tone / "cara de IA" check ---------- */

  function scanForAiTells(text) {
    var t = text || "";
    var flags = [];

    var checks = [
      { re: /não\s+é\s+apenas[^.]*,?\s*é\b/i, msg: 'Frase em molde "não é apenas X, é Y" — muito comum em texto gerado por IA. Diga a ideia diretamente.' },
      { re: /não\s+só\b.{0,45}\bcomo\s+também\b/i, msg: 'Estrutura "não só X como também Y" — repetida em texto de IA. Considere simplificar.' },
      { re: /no\s+mundo\s+atual|na\s+era\s+digital|no\s+cenário\s+atual/i, msg: 'Abertura genérica ("no mundo atual"/"na era digital") — comece pelo facto concreto, não pelo contexto óbvio.' },
      { re: /é\s+importante\s+notar\s+que|vale\s+ressaltar\s+que|é\s+fundamental\s+destacar/i, msg: 'Frase de enchimento ("é importante notar que...") — diga a informação diretamente, sem anunciar que vai dizê-la.' },
      { re: /em\s+suma|em\s+conclusão|por\s+fim,\s+mas\s+não\s+menos\s+importante/i, msg: 'Fecho formulaico ("em suma"/"em conclusão") — normalmente a frase funciona melhor sem ele.' },
      { re: /sem\s+dúvida/i, msg: '"Sem dúvida" costuma ser dispensável — se for mesmo óbvio, a frase funciona sem ele.' },
      { re: /revolucionári|transformador|disruptiv|sinergia|holístic|inovador[a]?\b/i, msg: 'Palavra vaga de discurso corporativo ("revolucionário", "sinergia", "disruptivo"...) — troque por um resultado concreto e mensurável.' },
      { re: /desbloqueie|desbloquear\s+(o|todo)/i, msg: '"Desbloquear potencial/valor" é uma expressão muito usada por IA em português traduzido do inglês.' }
    ];
    checks.forEach(function (c) { if (c.re.test(t)) flags.push(c.msg); });

    var emDashCount = (t.match(/—/g) || []).length;
    if (emDashCount >= 3) flags.push('Usa o travessão (—) ' + emDashCount + ' vezes. Em excesso, lembra texto gerado por IA — experimente vírgulas ou frases mais curtas nalguns casos.');

    var triadMatches = t.match(/\b\w+,\s*\w+\s+e\s+\w+\b/gi) || [];
    if (triadMatches.length >= 3) flags.push('Padrão "X, Y e Z" repetido ' + triadMatches.length + ' vezes. Variar a estrutura das frases ajuda a soar mais humano.');

    var exclCount = (t.match(/!/g) || []).length;
    if (exclCount >= 3) flags.push('Muitos pontos de exclamação (' + exclCount + '). Um tom executivo costuma ser mais contido.');

    var sentences = t.split(/[.!?]+/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (sentences.length >= 5) {
      var lens = sentences.map(function (s) { return s.split(/\s+/).filter(Boolean).length; });
      var avg = lens.reduce(function (a, b) { return a + b; }, 0) / lens.length;
      var variance = lens.reduce(function (a, b) { return a + Math.pow(b - avg, 2); }, 0) / lens.length;
      if (variance < 4) flags.push("As frases têm quase todas o mesmo comprimento. Misture frases curtas e longas para soar mais natural.");
    }

    if (!/\d/.test(t) && t.length > 300) flags.push("Não há nenhum número, dado ou exemplo concreto no texto. Um detalhe específico costuma tornar o texto mais credível e menos genérico.");

    return flags;
  }

  function renderStyleCheckInto(containerId, text) {
    var out = document.getElementById(containerId);
    if (!out) return;
    var flags = scanForAiTells(text);
    if (!flags.length) {
      out.innerHTML = '<div class="style-ok">✓ Nenhum sinal comum de texto "com cara de IA" encontrado. Continue a rever lendo em voz alta — é o teste que mais funciona.</div>';
      return;
    }
    out.innerHTML = '<div class="style-warn"><strong>' + flags.length + (flags.length === 1 ? " ponto a rever:" : " pontos a rever:") + "</strong><ul>" +
      flags.map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("") + "</ul></div>";
  }

  function duplicateItem(kind, id) {
    var src = findById(DATA[kind], id);
    if (!src) return;
    var copy = JSON.parse(JSON.stringify(src));
    copy.id = nextId(kind);
    if (copy.title) copy.title = copy.title + " (cópia)";
    if (copy.date !== undefined) copy.date = TODAY_ISO;
    if (copy.status !== undefined) copy.status = "Rascunho";
    overrides[kind][copy.id] = copy;
    saveOverrides();
    rebuildData();
    toast("Item duplicado — a abrir para edição.");
    go("#/manage/" + kind + "/" + copy.id + "/edit");
  }

  function deleteItem(kind, id) {
    overrides.deleted[kind] = overrides.deleted[kind] || [];
    if (overrides.deleted[kind].indexOf(id) === -1) overrides.deleted[kind].push(id);
    delete overrides[kind][id];
    saveOverrides();
    rebuildData();
    toast("Item eliminado.");
  }

  /* ---------- routing ---------- */

  var simpleRoutes = {
    home: renderHome,
    posts: renderPostsList,
    carousels: renderCarouselsList,
    articles: renderArticlesList,
    news: renderNewsList,
    comments: renderComments,
    calendar: function () { renderCalendar(); },
    ideas: renderIdeas,
    categories: renderCategories,
    search: function () { renderSearch(""); },
    guide: renderGuide,
    "comment-tool": renderCommentTool,
    reviews: renderReviewsList
  };

  function parseHash() {
    var h = (location.hash || "#/home").replace(/^#\/?/, "");
    var parts = h.split("/").filter(Boolean);
    return { view: parts[0] || "home", param: parts.slice(1).join("/") };
  }

  function router() {
    var r = parseHash();
    highlightNav(r.view);
    root.innerHTML = "";
    root.focus();
    window.scrollTo && window.scrollTo(0, 0);

    if (r.view === "posts" && r.param) return renderPostDetail(r.param);
    if (r.view === "carousels" && r.param) return renderCarouselDetail(r.param);
    if (r.view === "articles" && r.param) return renderArticleDetail(r.param);
    if (r.view === "calendar" && r.param) return renderCalendar(r.param);
    if (r.view === "categories" && r.param) return renderCategoryDetail(decodeURIComponent(r.param));
    if (r.view === "search" && r.param) return renderSearch(decodeURIComponent(r.param));
    if (r.view === "reviews" && r.param) return renderReviewDetail(r.param);
    if (r.view === "manage") return renderManage(r.param);

    var fn = simpleRoutes[r.view] || renderHome;
    fn();
  }

  function highlightNav(view) {
    document.querySelectorAll("#mainNav a").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-route") === view);
    });
  }

  function go(hash) { location.hash = hash; }

  /* ---------- shared: content card + binding ---------- */

  function contentCard(item, kind) {
    var sub = item.hook || item.summary || "";
    var statusBadge = item.status ? '<span class="badge status-' + esc(item.status) + '">' + esc(item.status) + "</span>" : "";
    var kindInfo = KIND_LABELS[kind];
    var kindBadge = kindInfo ? '<span class="badge kind-badge">' + kindInfo.icon + " " + kindInfo.label + "</span>" : "";
    var doneBadge = isPublished(kind, item.id) ? '<span class="badge badge-done">Publicado ✓</span>' : "";
    var theme = item.theme || item.category || "";
    var footRight = kind === "carousels" ? (item.slides ? item.slides.length + " slides" : "") : fmtDateTime(item.date, item.time);
    var copyBtn = (kind === "posts" || kind === "articles" || kind === "carousels")
      ? '<button class="btn small" data-copy="' + esc(item.id) + '" data-kind="' + kind + '">Copiar</button>'
      : "";
    return '<article class="card">' + coverImg(item) +
      '<div class="card-body"><div class="badge-row">' + kindBadge + (theme ? '<span class="badge">' + esc(theme) + "</span>" : "") + statusBadge + doneBadge + "</div>" +
      "<h3>" + esc(item.title) + "</h3><p>" + nl2br(sub) + "</p>" +
      '<div class="card-foot"><span class="card-date">' + esc(footRight) + '</span>' +
      '<div class="btn-row"><button class="btn small" data-open="' + kind + "/" + esc(item.id) + '">Abrir</button>' +
      copyBtn +
      "</div></div></div></article>";
  }

  function bindCardActions(scope) {
    scope.querySelectorAll("[data-open]").forEach(function (b) { b.onclick = function () { go("#/" + b.getAttribute("data-open")); }; });
    scope.querySelectorAll("[data-copy]").forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute("data-copy");
        var kind = b.getAttribute("data-kind");
        var item = findById(DATA[kind], id);
        if (!item) return;
        if (kind === "posts") copyText(postFullText(item));
        else if (kind === "articles") copyText(articleFullText(item));
        else if (kind === "carousels") copyText(carouselFullText(item));
      };
    });
  }

  function resultSection(label, items, kind) {
    if (!items.length) return "";
    return '<h4 style="font-family:var(--font-display);margin:22px 0 10px">' + esc(label) + '</h4><div class="grid">' +
      items.map(function (item) { return contentCard(item, kind); }).join("") + "</div>";
  }

  /* ---------- HOME ("Hoje") ---------- */

  function renderHome() {
    var post = pickForToday(DATA.posts);
    var carousel = pickForToday(DATA.carousels);
    var article = pickForToday(DATA.articles);
    var news = sortByDate(DATA.news)[0] || null;
    var comment = DATA.comments.length ? DATA.comments[dayOfYear(TODAY) % DATA.comments.length] : null;

    var html = "";
    html += '<div class="page-head"><div><div class="eyebrow">' + fmtDate(TODAY_ISO) + '</div><h1>Hoje</h1><div class="page-sub">O essencial para publicar em menos de 60 segundos: abrir, copiar, publicar.</div></div></div>';
    html += '<div class="home-stack">';
    html += homeBlock("Post do dia", post, "posts", post ? post.hook.split("\n")[0] : "");
    html += homeBlock("Carrossel da semana", carousel, "carousels", carousel ? carousel.summary : "");
    html += homeBlock("Artigo da semana", article, "articles", article ? article.summary : "");

    if (news) {
      html += '<div class="home-block"><div class="cover" style="background:var(--navy);display:flex;align-items:center;justify-content:center;color:#fff;font-family:var(--font-mono);font-size:11px;">📰 NOTÍCIA</div>' +
        '<div><div class="label">Notícia para repost</div><h3>' + esc(news.title) + '</h3><p>' + esc(news.summary) + '</p></div>' +
        '<button class="btn primary" data-go="#/news">Abrir</button></div>';
    } else {
      html += '<div class="home-block"><div class="home-empty">Sem notícia marcada para repost.</div></div>';
    }

    if (comment) {
      html += '<div class="home-block comment"><div><div class="label">Comentário do dia</div><h3>' + esc(comment.title) + '</h3><p>' + esc(comment.text) + '</p></div>' +
        '<button class="btn gold" data-copy-comment="' + esc(comment.id) + '">Copiar</button></div>';
    }
    html += "</div>";
    root.innerHTML = html;

    root.querySelectorAll("[data-go]").forEach(function (b) { b.onclick = function () { go(b.getAttribute("data-go")); }; });
    root.querySelectorAll("[data-copy-comment]").forEach(function (b) {
      b.onclick = function () { var c = findById(DATA.comments, b.getAttribute("data-copy-comment")); if (c) copyText(c.text); };
    });
  }

  function homeBlock(label, item, kind, sub) {
    if (!item) return '<div class="home-block"><div class="home-empty">Nada agendado em ' + esc(label.toLowerCase()) + ".</div></div>";
    var badge = KIND_LABELS[kind] ? KIND_LABELS[kind].icon + " " + KIND_LABELS[kind].label : "";
    var timeNote = item.time ? " · publicar às " + esc(item.time) : "";
    return '<div class="home-block">' + coverImg(item) +
      '<div><div class="label">' + esc(label) + " · " + badge + timeNote + '</div><h3>' + esc(item.title) + '</h3><p>' + esc(sub || "") + "</p></div>" +
      '<button class="btn primary" data-go="#/' + kind + "/" + esc(item.id) + '">Abrir</button></div>';
  }

  /* ---------- POSTS ---------- */

  function renderPostsList() {
    var themes = uniqueSorted(DATA.posts.map(function (p) { return p.theme; }));
    root.innerHTML =
      '<div class="page-head"><div><div class="eyebrow">Biblioteca</div><h1>Posts</h1><div class="page-sub">Conteúdo, imagem e hashtags preparados para publicação manual no LinkedIn.</div></div></div>' +
      '<div class="toolbar"><input type="text" id="postSearch" placeholder="Pesquisar por título, tema ou texto…"><select id="postTheme"><option value="">Todos os temas</option>' +
      themes.map(function (t) { return '<option value="' + esc(t) + '">' + esc(t) + "</option>"; }).join("") +
      '</select><select id="postStatus"><option value="">Todos os estados</option><option>Pronto</option><option>Rascunho</option><option>Publicado</option></select></div>' +
      '<div id="postGrid" class="grid"></div>';

    var q = document.getElementById("postSearch");
    var themeSel = document.getElementById("postTheme");
    var statusSel = document.getElementById("postStatus");
    function refresh() { drawPostGrid(q.value, themeSel.value, statusSel.value); }
    q.oninput = refresh; themeSel.onchange = refresh; statusSel.onchange = refresh;
    drawPostGrid("", "", "");
  }

  function drawPostGrid(query, theme, status) {
    var grid = document.getElementById("postGrid");
    var qq = (query || "").toLowerCase();
    var list = DATA.posts.filter(function (p) {
      var hay = (p.title + " " + p.theme + " " + p.text + " " + p.hashtags).toLowerCase();
      return (!qq || hay.indexOf(qq) >= 0) && (!theme || p.theme === theme) && (!status || p.status === status);
    });
    grid.innerHTML = list.length ? list.map(function (p) { return contentCard(p, "posts"); }).join("") : '<div class="empty-state">Nenhum post encontrado com estes filtros.</div>';
    bindCardActions(grid);
  }

  function renderPostDetail(id) {
    var p = findById(DATA.posts, id);
    if (!p) return renderNotFound("posts");
    var related = DATA.comments.filter(function (c) { return c.category === p.theme; });
    var done = isPublished("posts", p.id);

    root.innerHTML =
      '<a class="back-link" href="#/posts">← Voltar a Posts</a>' +
      '<div class="detail-layout"><div class="cover-wrap">' + coverImg(p) + '</div>' +
      '<div class="detail-panel"><div class="badge-row"><span class="badge kind-badge">🖼️ Imagem</span>' +
      '<span class="badge">' + esc(p.theme) + '</span><span class="badge status-' + esc(p.status) + '">' + esc(p.status) + '</span>' +
      '<span class="badge gold">' + esc(p.format) + '</span><span class="badge">' + esc(p.audience) + '</span></div>' +
      '<h2>' + esc(p.title) + '</h2>' +
      '<div class="schedule-line">📅 ' + esc(fmtDateTime(p.date, p.time)) + " (Lisboa)</div>" +
      '<div class="hook">' + nl2br(p.hook) + '</div>' +
      '<pre>' + esc(p.text) + '\n\n' + esc(p.cta) + '</pre>' +
      '<pre style="color:var(--blue);font-weight:600">' + esc(p.hashtags) + '</pre>' +
      '<div class="prompt-box"><strong>Prompt da imagem:</strong> ' + esc(p.imagePrompt || "—") + "</div>" +
      '<div class="btn-row">' +
      '<button class="btn primary" id="actCopy">Copiar texto</button>' +
      '<button class="btn" id="actDownload">Baixar imagem</button>' +
      '<button class="btn" id="actStyleCheck">✒️ Verificar tom</button>' +
      '<button class="btn" id="actEdit">Editar</button>' +
      '<button class="btn" id="actDuplicate">Duplicar</button>' +
      '<button class="btn ' + (done ? "gold" : "") + '" id="actPublish">' + (done ? "Publicado ✓" : "Marcar publicado") + "</button>" +
      "</div>" +
      '<div id="styleCheckOut" style="margin-top:14px"></div>' +
      (related.length ? '<div class="related"><h4>Comentários relacionados</h4><div class="list">' + related.map(function (c) {
        return '<div class="list-item"><span class="badge">' + esc(c.category) + '</span><h3>' + esc(c.title) + '</h3><p>' + esc(c.text) + '</p><button class="btn small" data-copy-related="' + esc(c.id) + '">Copiar comentário</button></div>';
      }).join("") + "</div></div>" : "") +
      "</div></div>";

    document.getElementById("actCopy").onclick = function () { copyText(postFullText(p)); };
    document.getElementById("actDownload").onclick = function () { downloadCover(p); };
    document.getElementById("actStyleCheck").onclick = function () { renderStyleCheckInto("styleCheckOut", [p.hook, p.text, p.cta].join("\n\n")); };
    document.getElementById("actEdit").onclick = function () { go("#/manage/posts/" + p.id + "/edit"); };
    document.getElementById("actDuplicate").onclick = function () { duplicateItem("posts", p.id); };
    document.getElementById("actPublish").onclick = function () { togglePublished("posts", p.id); renderPostDetail(p.id); };
    root.querySelectorAll("[data-copy-related]").forEach(function (b) {
      b.onclick = function () { copyText(findById(DATA.comments, b.getAttribute("data-copy-related")).text); };
    });
  }

  /* ---------- CAROUSELS ---------- */

  function renderCarouselsList() {
    root.innerHTML =
      '<div class="page-head"><div><div class="eyebrow">Biblioteca</div><h1>Carrosséis</h1><div class="page-sub">Sequências de slides prontas, cada uma com a sua própria capa exclusiva.</div></div></div>' +
      '<div class="grid">' + DATA.carousels.map(function (c) { return contentCard(c, "carousels"); }).join("") + "</div>";
    bindCardActions(root);
  }

  function renderCarouselDetail(id) {
    var c = findById(DATA.carousels, id);
    if (!c) return renderNotFound("carousels");
    var done = isPublished("carousels", c.id);

    root.innerHTML =
      '<a class="back-link" href="#/carousels">← Voltar a Carrosséis</a>' +
      '<div class="page-head"><div><div class="badge-row"><span class="badge kind-badge">📚 Carrossel</span><span class="badge">' + esc(c.theme) + '</span><span class="badge status-' + esc(c.status) + '">' + esc(c.status) + '</span></div>' +
      '<h1 style="margin-top:8px">' + esc(c.title) + '</h1><div class="page-sub">' + esc(c.summary) + "</div>" +
      '<div class="schedule-line">📅 ' + esc(fmtDateTime(c.date, c.time)) + " (Lisboa)</div></div></div>" +
      '<div class="slide-strip" id="slideStrip"></div>' +
      '<div class="detail-panel" style="margin-top:20px"><h4 style="font-family:var(--font-display);margin-top:0">Texto do post + CTA</h4>' +
      '<pre>' + esc(c.cta) + '</pre>' +
      '<pre style="color:var(--blue);font-weight:600">' + esc(c.hashtags) + '</pre>' +
      '<div class="prompt-box"><strong>Prompt da capa:</strong> ' + esc(c.imagePrompt || "—") + "</div>" +
      '<div class="btn-row">' +
      '<button class="btn primary" id="actCopy">Copiar texto do carrossel</button>' +
      '<button class="btn" id="actPdf">Baixar PDF</button>' +
      '<button class="btn" id="actDownload">Baixar capa</button>' +
      '<button class="btn" id="actStyleCheck">✒️ Verificar tom</button>' +
      '<button class="btn" id="actEdit">Editar</button>' +
      '<button class="btn" id="actDuplicate">Duplicar</button>' +
      '<button class="btn ' + (done ? "gold" : "") + '" id="actPublish">' + (done ? "Publicado ✓" : "Marcar publicado") + "</button>" +
      "</div><div id=\"styleCheckOut\" style=\"margin-top:14px\"></div></div>";

    document.getElementById("slideStrip").innerHTML = c.slides.map(function (s, i) {
      return '<div class="slide"><div><div class="n">SLIDE ' + (i + 1) + " / " + c.slides.length + '</div><h4>' + esc(s.title) + '</h4><p>' + esc(s.body) + "</p></div></div>";
    }).join("");

    document.getElementById("actCopy").onclick = function () { copyText(carouselFullText(c)); };
    document.getElementById("actDownload").onclick = function () { downloadCover(c); };
    document.getElementById("actStyleCheck").onclick = function () {
      var combined = [c.summary, c.slides.map(function (s) { return s.title + " " + s.body; }).join(" "), c.cta].join("\n\n");
      renderStyleCheckInto("styleCheckOut", combined);
    };
    document.getElementById("actEdit").onclick = function () { go("#/manage/carousels/" + c.id + "/edit"); };
    document.getElementById("actDuplicate").onclick = function () { duplicateItem("carousels", c.id); };
    document.getElementById("actPublish").onclick = function () { togglePublished("carousels", c.id); renderCarouselDetail(c.id); };
    document.getElementById("actPdf").onclick = function () { printCarousel(c); };
  }

  function printCarousel(c) {
    var w = window.open("", "_blank");
    if (!w) { toast("Permita pop-ups para gerar o PDF."); return; }
    var pages = c.slides.map(function (s, i) {
      return '<section class="p"><div class="n">Slide ' + (i + 1) + " de " + c.slides.length + '</div><h1>' + esc(s.title) + '</h1><p>' + esc(s.body) + "</p></section>";
    }).join("");
    w.document.write(
      '<!doctype html><html><head><meta charset="utf-8"><title>' + esc(c.title) + '</title><style>' +
      "@page{size:A4;margin:0}body{font-family:Georgia,serif;margin:0}" +
      ".p{width:100%;height:100vh;box-sizing:border-box;padding:80px;background:#0B1B33;color:#fff;page-break-after:always;display:flex;flex-direction:column;justify-content:center}" +
      ".n{font-family:monospace;color:#C9A227;font-size:14px;margin-bottom:16px;letter-spacing:2px}" +
      "h1{font-size:36px;margin:0 0 18px}p{font-size:18px;line-height:1.6;color:#E8D9A8}" +
      "</style></head><body>" + pages + '<script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>'
    );
    w.document.close();
  }

  /* ---------- ARTICLES ---------- */

  function renderArticlesList() {
    root.innerHTML =
      '<div class="page-head"><div><div class="eyebrow">Biblioteca</div><h1>Artigos</h1><div class="page-sub">Textos longos para publicação como artigo no LinkedIn.</div></div></div>' +
      '<div class="grid">' + DATA.articles.map(function (a) { return contentCard(a, "articles"); }).join("") + "</div>";
    bindCardActions(root);
  }

  function renderArticleDetail(id) {
    var a = findById(DATA.articles, id);
    if (!a) return renderNotFound("articles");
    var done = isPublished("articles", a.id);

    root.innerHTML =
      '<a class="back-link" href="#/articles">← Voltar a Artigos</a>' +
      '<div class="detail-layout"><div class="cover-wrap">' + coverImg(a) + '</div>' +
      '<div class="detail-panel"><div class="badge-row"><span class="badge kind-badge">📖 Artigo</span><span class="badge">' + esc(a.theme) + '</span><span class="badge gold">' + esc(a.readTime) + '</span><span class="badge status-' + esc(a.status) + '">' + esc(a.status) + '</span></div>' +
      '<h2>' + esc(a.title) + '</h2>' +
      '<div class="schedule-line">📅 ' + esc(fmtDateTime(a.date, a.time)) + " (Lisboa)</div>" +
      '<pre>' + esc(a.body) + '</pre>' +
      '<pre style="color:var(--blue);font-weight:600">' + esc(a.hashtags) + '</pre>' +
      '<div class="prompt-box"><strong>Prompt da imagem:</strong> ' + esc(a.imagePrompt || "—") + "</div>" +
      '<div class="btn-row"><button class="btn primary" id="actCopy">Copiar artigo</button>' +
      '<button class="btn" id="actDownload">Baixar capa</button>' +
      '<button class="btn" id="actStyleCheck">✒️ Verificar tom</button>' +
      '<button class="btn" id="actEdit">Editar</button>' +
      '<button class="btn" id="actDuplicate">Duplicar</button>' +
      '<button class="btn ' + (done ? "gold" : "") + '" id="actPublish">' + (done ? "Publicado ✓" : "Marcar publicado") + "</button></div>" +
      '<div id="styleCheckOut" style="margin-top:14px"></div></div></div>';

    document.getElementById("actCopy").onclick = function () { copyText(articleFullText(a)); };
    document.getElementById("actDownload").onclick = function () { downloadCover(a); };
    document.getElementById("actStyleCheck").onclick = function () { renderStyleCheckInto("styleCheckOut", a.body); };
    document.getElementById("actEdit").onclick = function () { go("#/manage/articles/" + a.id + "/edit"); };
    document.getElementById("actDuplicate").onclick = function () { duplicateItem("articles", a.id); };
    document.getElementById("actPublish").onclick = function () { togglePublished("articles", a.id); renderArticleDetail(a.id); };
  }

  /* ---------- NEWS ---------- */

  function renderNewsList() {
    root.innerHTML =
      '<div class="page-head"><div><div class="eyebrow">Biblioteca</div><h1>Notícias</h1><div class="page-sub">Espaço para guardar notícias e o texto final do repost com opinião executiva.</div></div></div>' +
      '<div class="list">' + sortByDate(DATA.news).map(function (n) {
        return '<div class="list-item"><div class="badge-row"><span class="badge kind-badge">📰 Notícia</span><span class="badge">' + esc(n.source) + '</span><span class="card-date">' + fmtDateTime(n.date, n.time) + "</span></div>" +
          '<h3>' + esc(n.title) + '</h3><p>' + esc(n.summary) + '</p>' +
          '<div class="prompt-box">' + esc(n.repost) + "</div>" +
          '<pre style="color:var(--blue);font-weight:600;margin:0 0 10px">' + esc(n.hashtags) + '</pre>' +
          '<div class="btn-row">' + (n.url ? '<a class="btn small" href="' + esc(n.url) + '" target="_blank" rel="noopener">Abrir fonte</a>' : "") +
          '<button class="btn small" data-copy-news="' + esc(n.id) + '">Copiar rascunho</button>' +
          '<button class="btn small" data-edit-news="' + esc(n.id) + '">Editar</button></div></div>';
      }).join("") + "</div>";

    root.querySelectorAll("[data-copy-news]").forEach(function (b) {
      b.onclick = function () { var n = findById(DATA.news, b.getAttribute("data-copy-news")); copyText(n.repost + "\n\n" + n.hashtags); };
    });
    root.querySelectorAll("[data-edit-news]").forEach(function (b) {
      b.onclick = function () { go("#/manage/news/" + b.getAttribute("data-edit-news") + "/edit"); };
    });
  }

  /* ---------- COMMENTS ---------- */

  function renderComments() {
    var cats = uniqueSorted(DATA.comments.map(function (c) { return c.category; }));
    root.innerHTML =
      '<div class="page-head"><div><div class="eyebrow">Biblioteca</div><h1>Comentários</h1><div class="page-sub">Comentários executivos prontos para copiar e adaptar.</div></div></div>' +
      '<div class="chip-row" id="commentChips"><button class="chip active" data-cat="">Todos</button>' +
      cats.map(function (c) { return '<button class="chip" data-cat="' + esc(c) + '">' + esc(c) + "</button>"; }).join("") +
      '</div><div class="list" id="commentList"></div>';

    document.querySelectorAll("#commentChips .chip").forEach(function (chip) {
      chip.onclick = function () {
        document.querySelectorAll("#commentChips .chip").forEach(function (c) { c.classList.remove("active"); });
        chip.classList.add("active");
        drawComments(chip.getAttribute("data-cat"));
      };
    });
    drawComments("");
  }

  function drawComments(cat) {
    var list = DATA.comments.filter(function (c) { return !cat || c.category === cat; });
    document.getElementById("commentList").innerHTML = list.map(function (c) {
      return '<div class="list-item"><span class="badge">' + esc(c.category) + '</span><h3>' + esc(c.title) + '</h3><p>' + esc(c.text) + '</p>' +
        '<div class="btn-row"><button class="btn small" data-copy-c="' + esc(c.id) + '">Copiar comentário</button>' +
        '<button class="btn small" data-edit-c="' + esc(c.id) + '">Editar</button></div></div>';
    }).join("");
    document.querySelectorAll("[data-copy-c]").forEach(function (b) { b.onclick = function () { copyText(findById(DATA.comments, b.getAttribute("data-copy-c")).text); }; });
    document.querySelectorAll("[data-edit-c]").forEach(function (b) { b.onclick = function () { go("#/manage/comments/" + b.getAttribute("data-edit-c") + "/edit"); }; });
  }

  /* ---------- CALENDAR ---------- */

  var calendarViewMode = "month"; // "month" | "six"

  function renderCalendar(monthParam) {
    var base = monthParam ? new Date(monthParam + "-01T00:00:00") : new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);
    if (isNaN(base.getTime())) base = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);
    var year = base.getFullYear(), month = base.getMonth();

    var step = calendarViewMode === "six" ? 6 : 1;
    var prevAnchor = new Date(year, month - step, 1);
    var nextAnchor = new Date(year, month + step, 1);
    var prevKey = prevAnchor.getFullYear() + "-" + pad(prevAnchor.getMonth() + 1);
    var nextKey = nextAnchor.getFullYear() + "-" + pad(nextAnchor.getMonth() + 1);

    var rangeLabel;
    if (calendarViewMode === "six") {
      var endMonth = new Date(year, month + 5, 1);
      rangeLabel = capitalize(base.toLocaleDateString("pt-PT", { month: "long", year: "numeric" })) + " – " + capitalize(endMonth.toLocaleDateString("pt-PT", { month: "long", year: "numeric" }));
    } else {
      rangeLabel = capitalize(base.toLocaleDateString("pt-PT", { month: "long", year: "numeric" }));
    }

    var filters = [
      { key: "all", label: "Todos" },
      { key: "posts", label: "🖼️ Posts" },
      { key: "carousels", label: "📚 Carrosséis" },
      { key: "articles", label: "📖 Artigos" },
      { key: "news", label: "📰 Notícias" },
      { key: "reviews", label: "📊 Revisões" }
    ];
    var views = [
      { key: "month", label: "📅 Vista mensal" },
      { key: "six", label: "🗓️ Próximos 6 meses" }
    ];

    root.innerHTML =
      '<div class="page-head"><div><div class="eyebrow">Planeamento</div><h1>Calendário editorial</h1><div class="page-sub">Todos os posts, carrosséis, artigos e notícias agendados — filtre por tipo ou planeie com até 6 meses de antecedência.</div></div></div>' +
      '<div class="chip-row" id="calViews">' +
      views.map(function (v) { return '<button class="chip' + (v.key === calendarViewMode ? " active" : "") + '" data-cal-view="' + v.key + '">' + v.label + "</button>"; }).join("") +
      "</div>" +
      '<div class="chip-row calendar-filters" id="calFilters">' +
      filters.map(function (f) { return '<button class="chip' + (f.key === calendarTypeFilter ? " active" : "") + '" data-cal-filter="' + f.key + '">' + f.label + "</button>"; }).join("") +
      "</div>" +
      '<div class="calendar-nav"><button class="btn small" data-cal-nav="' + prevKey + '">← Anterior</button><h2>' + rangeLabel + '</h2><button class="btn small" data-cal-nav="' + nextKey + '">Seguinte →</button></div>' +
      '<div id="calendarGrid"></div>';

    root.querySelectorAll("[data-cal-nav]").forEach(function (b) { b.onclick = function () { go("#/calendar/" + b.getAttribute("data-cal-nav")); }; });
    root.querySelectorAll("[data-cal-view]").forEach(function (b) {
      b.onclick = function () {
        calendarViewMode = b.getAttribute("data-cal-view");
        renderCalendar(year + "-" + pad(month + 1));
      };
    });
    root.querySelectorAll("[data-cal-filter]").forEach(function (b) {
      b.onclick = function () {
        calendarTypeFilter = b.getAttribute("data-cal-filter");
        root.querySelectorAll("[data-cal-filter]").forEach(function (c) { c.classList.remove("active"); });
        b.classList.add("active");
        drawCalendarBody(year, month);
      };
    });

    drawCalendarBody(year, month);
  }

  function drawCalendarBody(year, month) {
    if (calendarViewMode === "six") drawSixMonthOverview(year, month);
    else drawCalendarGrid(year, month);
  }

  function calendarEventsForFilter() {
    var all = [];
    if (calendarTypeFilter === "all" || calendarTypeFilter === "posts") DATA.posts.forEach(function (x) { all.push(calEvent(x, "posts")); });
    if (calendarTypeFilter === "all" || calendarTypeFilter === "carousels") DATA.carousels.forEach(function (x) { all.push(calEvent(x, "carousels")); });
    if (calendarTypeFilter === "all" || calendarTypeFilter === "articles") DATA.articles.forEach(function (x) { all.push(calEvent(x, "articles")); });
    if (calendarTypeFilter === "all" || calendarTypeFilter === "news") DATA.news.forEach(function (x) { all.push(calEvent(x, "news")); });
    if (calendarTypeFilter === "all" || calendarTypeFilter === "reviews") DATA.reviews.forEach(function (x) { all.push(calEvent(x, "reviews")); });
    return all;
  }

  function drawCalendarGrid(year, month) {
    var dows = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    var firstDow = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var all = calendarEventsForFilter();

    var cells = "";
    for (var i = 0; i < firstDow; i += 1) cells += '<div class="day empty"></div>';
    for (var d = 1; d <= daysInMonth; d += 1) {
      var iso = year + "-" + pad(month + 1) + "-" + pad(d);
      var events = all.filter(function (e) { return e.date === iso; });
      cells += '<div class="day"><span class="num">' + d + "</span>" +
        events.map(function (e) {
          return '<div class="event ' + e.cls + '" data-cal-open="' + e.kind + "/" + esc(e.id) + '" title="' + esc(e.title) + (e.time ? " · " + e.time : "") + '">' + e.icon + (e.time ? " " + e.time : "") + " " + esc(e.title) + "</div>";
        }).join("") + "</div>";
    }

    document.getElementById("calendarGrid").innerHTML =
      '<div class="calendar">' + dows.map(function (x) { return '<div class="cal-dow">' + x + "</div>"; }).join("") + cells + "</div>";
    document.querySelectorAll("[data-cal-open]").forEach(function (b) { b.onclick = function () { go("#/" + b.getAttribute("data-cal-open")); }; });
  }

  function drawSixMonthOverview(year, month) {
    var all = calendarEventsForFilter();
    var blocks = "";
    for (var i = 0; i < 6; i += 1) {
      var d = new Date(year, month + i, 1);
      var y = d.getFullYear(), m = d.getMonth();
      var label = capitalize(d.toLocaleDateString("pt-PT", { month: "long", year: "numeric" }));
      var monthPrefix = y + "-" + pad(m + 1) + "-";
      var monthEvents = all.filter(function (e) { return e.date.indexOf(monthPrefix) === 0; })
        .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });

      blocks += '<div class="month-block"><h3>' + esc(label) + " · " + monthEvents.length + (monthEvents.length === 1 ? " item" : " itens") + "</h3>";
      blocks += monthEvents.length
        ? monthEvents.map(function (e) {
            var day = e.date.slice(8, 10);
            return '<div class="mb-event" data-cal-open="' + e.kind + "/" + esc(e.id) + '"><span>' + e.icon + " " + esc(e.title) + '</span><span class="card-date">' + day + (e.time ? " · " + e.time : "") + "</span></div>";
          }).join("")
        : '<div class="mb-empty">Sem conteúdo agendado.</div>';
      blocks += "</div>";
    }

    document.getElementById("calendarGrid").innerHTML = '<div class="six-month-grid">' + blocks + "</div>";
    document.querySelectorAll("[data-cal-open]").forEach(function (b) { b.onclick = function () { go("#/" + b.getAttribute("data-cal-open")); }; });
  }

  function calEvent(item, kind) {
    var cls = kind === "carousels" ? "carousel" : kind === "articles" ? "article" : kind === "news" ? "news" : kind === "reviews" ? "review" : "";
    return { id: item.id, date: item.date, time: item.time, title: item.title, kind: kind, cls: cls, icon: KIND_LABELS[kind].icon };
  }

  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* ---------- IDEAS ---------- */

  function renderIdeas() {
    var byTheme = {};
    DATA.ideas.forEach(function (idea) {
      byTheme[idea.theme] = byTheme[idea.theme] || [];
      byTheme[idea.theme].push(idea);
    });
    var themes = Object.keys(byTheme).sort();
    root.innerHTML =
      '<div class="page-head"><div><div class="eyebrow">Backlog editorial</div><h1>Banco de Ideias</h1><div class="page-sub">Temas futuros organizados por assunto, prontos para virar post, carrossel ou artigo.</div></div>' +
      '<button class="btn primary" data-go="#/manage/ideas/new">+ Nova ideia</button></div>' +
      '<div class="idea-groups">' + themes.map(function (t) {
        return '<div class="idea-group"><h3>' + esc(t) + '</h3><div class="idea-list">' +
          byTheme[t].map(function (i) { return '<div class="idea-item">' + esc(i.text) + '<div class="btn-row" style="margin-top:8px"><button class="btn small" data-edit-idea="' + esc(i.id) + '">Editar</button></div></div>'; }).join("") +
          "</div></div>";
      }).join("") + "</div>";
    root.querySelectorAll("[data-go]").forEach(function (b) { b.onclick = function () { go(b.getAttribute("data-go")); }; });
    root.querySelectorAll("[data-edit-idea]").forEach(function (b) { b.onclick = function () { go("#/manage/ideas/" + b.getAttribute("data-edit-idea") + "/edit"); }; });
  }

  /* ---------- CATEGORIES ---------- */

  function countForCategory(cat) {
    var n = 0;
    n += DATA.posts.filter(function (p) { return p.theme === cat; }).length;
    n += DATA.carousels.filter(function (p) { return p.theme === cat; }).length;
    n += DATA.articles.filter(function (p) { return p.theme === cat; }).length;
    n += DATA.ideas.filter(function (p) { return p.theme === cat; }).length;
    n += DATA.comments.filter(function (p) { return p.category === cat; }).length;
    return n;
  }

  function renderCategories() {
    root.innerHTML =
      '<div class="page-head"><div><div class="eyebrow">Filtros rápidos · atualizados automaticamente</div><h1>Categorias</h1><div class="page-sub">Calculadas a partir do conteúdo existente — criar um post ou ideia com um tema novo cria a categoria automaticamente.</div></div></div>' +
      '<div class="category-grid">' + DATA.categories.map(function (c) {
        var n = countForCategory(c);
        return '<button class="category-tile" data-cat-open="' + encodeURIComponent(c) + '"><span class="name">' + esc(c) + '</span><span class="count">' + n + " " + (n === 1 ? "item" : "itens") + "</span></button>";
      }).join("") + "</div>";
    root.querySelectorAll("[data-cat-open]").forEach(function (b) { b.onclick = function () { go("#/categories/" + b.getAttribute("data-cat-open")); }; });
  }

  function renderCategoryDetail(cat) {
    var posts = DATA.posts.filter(function (p) { return p.theme === cat; });
    var carousels = DATA.carousels.filter(function (p) { return p.theme === cat; });
    var articles = DATA.articles.filter(function (p) { return p.theme === cat; });
    var ideas = DATA.ideas.filter(function (p) { return p.theme === cat; });

    root.innerHTML =
      '<a class="back-link" href="#/categories">← Voltar a Categorias</a>' +
      '<div class="page-head"><div><div class="eyebrow">Categoria</div><h1>' + esc(cat) + "</h1></div></div>" +
      resultSection("Posts", posts, "posts") +
      resultSection("Carrosséis", carousels, "carousels") +
      resultSection("Artigos", articles, "articles") +
      (ideas.length ? '<h4 style="font-family:var(--font-display);margin:22px 0 10px">Ideias</h4><div class="idea-list">' + ideas.map(function (i) { return '<div class="idea-item">' + esc(i.text) + "</div>"; }).join("") + "</div>" : "");

    bindCardActions(root);
  }

  /* ---------- SEARCH ---------- */

  function renderSearch(initialQuery) {
    root.innerHTML =
      '<div class="page-head"><div><div class="eyebrow">Pesquisa</div><h1>Pesquisar tudo</h1><div class="page-sub">Procure em posts, carrosséis, artigos, comentários e notícias.</div></div></div>' +
      '<div class="toolbar"><input type="text" id="searchInput" placeholder="Ex.: Azure, IA, liderança…" value="' + esc(initialQuery || "") + '"></div>' +
      '<div id="searchResults"></div>';

    var input = document.getElementById("searchInput");
    input.oninput = function () { drawSearch(input.value); };
    input.focus();
    drawSearch(initialQuery || "");
  }

  function drawSearch(query) {
    var q = (query || "").toLowerCase().trim();
    var out = document.getElementById("searchResults");
    if (!q) { out.innerHTML = '<div class="empty-state">Escreva um termo para pesquisar em toda a biblioteca.</div>'; return; }

    var posts = DATA.posts.filter(function (p) { return (p.title + p.theme + p.text + p.hashtags).toLowerCase().indexOf(q) >= 0; });
    var carousels = DATA.carousels.filter(function (c) { return (c.title + c.theme + c.summary).toLowerCase().indexOf(q) >= 0; });
    var articles = DATA.articles.filter(function (a) { return (a.title + a.theme + a.body).toLowerCase().indexOf(q) >= 0; });
    var comments = DATA.comments.filter(function (c) { return (c.title + c.category + c.text).toLowerCase().indexOf(q) >= 0; });
    var news = DATA.news.filter(function (n) { return (n.title + n.source + n.summary).toLowerCase().indexOf(q) >= 0; });

    var total = posts.length + carousels.length + articles.length + comments.length + news.length;
    if (!total) { out.innerHTML = '<div class="empty-state">Nenhum resultado para "' + esc(query) + '".</div>'; return; }

    var html = "";
    html += resultSection("Posts", posts, "posts");
    html += resultSection("Carrosséis", carousels, "carousels");
    html += resultSection("Artigos", articles, "articles");
    if (comments.length) {
      html += '<h4 style="font-family:var(--font-display);margin:22px 0 10px">Comentários</h4><div class="list">' +
        comments.map(function (c) { return '<div class="list-item"><span class="badge">' + esc(c.category) + '</span><h3>' + esc(c.title) + '</h3><p>' + esc(c.text) + '</p><button class="btn small" data-copy-c="' + esc(c.id) + '">Copiar</button></div>'; }).join("") + "</div>";
    }
    if (news.length) {
      html += '<h4 style="font-family:var(--font-display);margin:22px 0 10px">Notícias</h4><div class="list">' +
        news.map(function (n) { return '<div class="list-item"><h3>' + esc(n.title) + '</h3><p>' + esc(n.summary) + "</p></div>"; }).join("") + "</div>";
    }
    out.innerHTML = html;
    bindCardActions(out);
    out.querySelectorAll("[data-copy-c]").forEach(function (b) { b.onclick = function () { copyText(findById(DATA.comments, b.getAttribute("data-copy-c")).text); }; });
  }

  /* ---------- GUIDE (escrita executiva e humanizada) ---------- */

  function renderGuide() {
    var good = [
      "Comece pelo facto, pela tensão ou pela experiência concreta — não pelo contexto óbvio (\"no mundo atual…\").",
      "Use um exemplo, número ou situação real sempre que possível. Especificidade é o que mais diferencia texto humano de texto genérico.",
      "Escreva como fala. Se uma frase soa estranha lida em voz alta, reescreva-a.",
      "Varie o comprimento das frases. Uma frase curta a seguir a uma longa cria ritmo — texto de IA tende a ser uniforme.",
      "Tenha uma opinião clara, mesmo que discutível. Texto executivo que não arrisca nada também não gera conversa.",
      "Termine com uma pergunta genuína — algo que você realmente quer saber, não uma pergunta de fórmula."
    ];
    var bad = [
      '"Não é apenas X, é Y" — a estrutura mais repetida em texto gerado por IA.',
      '"No mundo atual/Na era digital/No cenário atual…" como abertura genérica.',
      '"É importante notar que…", "Vale ressaltar que…" — anunciar a frase em vez de a dizer.',
      "Excesso de travessões (—) a fazer o trabalho da pontuação normal.",
      'Palavras vagas de discurso corporativo: "revolucionário", "sinergia", "disruptivo", "holístico".',
      'Fechos formulaicos: "Em suma…", "Em conclusão…", "Por fim, mas não menos importante…".',
      "Três parágrafos com exatamente o mesmo tamanho e a mesma estrutura — parece gerado, não escrito."
    ];
    var checklist = [
      "Há pelo menos um facto, número ou exemplo concreto — não só afirmações genéricas?",
      "Se eu ler em voz alta, soa como eu a falar, ou como um relatório?",
      "Tirei as frases que só anunciam o que vou dizer, sem dizer nada?",
      "A opinião está clara, ou ficou tudo em cima do muro para agradar a todos?",
      "O CTA/pergunta final é algo que eu realmente quero saber?"
    ];

    root.innerHTML =
      '<div class="page-head"><div><div class="eyebrow">Tom de voz</div><h1>Guia de Escrita Executiva</h1>' +
      '<div class="page-sub">Regras práticas para manter o conteúdo executivo e 100% humanizado — evitando os sinais mais comuns de texto "com cara de IA".</div></div></div>' +

      '<div class="guide-section"><h2>O que fazer</h2><div class="guide-list">' +
      good.map(function (g) { return '<div class="guide-item good">' + esc(g) + "</div>"; }).join("") +
      "</div></div>" +

      '<div class="guide-section"><h2>Sinais a evitar</h2><div class="guide-list">' +
      bad.map(function (b) { return '<div class="guide-item bad">' + esc(b) + "</div>"; }).join("") +
      "</div></div>" +

      '<div class="guide-section"><h2>Checklist antes de publicar</h2><div class="guide-list">' +
      checklist.map(function (c) { return '<div class="guide-item">☐ ' + esc(c) + "</div>"; }).join("") +
      "</div></div>" +

      '<div class="detail-panel"><h4 style="font-family:var(--font-display);margin-top:0">Verificação automática</h4>' +
      '<p style="color:var(--muted);font-size:13.5px;line-height:1.6;margin:0">Ao criar ou editar um post, carrossel ou artigo em <a href="#/manage" style="color:var(--blue);font-weight:600">Gerir Conteúdo</a>, ' +
      'há um botão <strong>"Verificar tom"</strong> que analisa o texto à procura destes sinais automaticamente. Não impede publicar — é só um alerta para rever antes de copiar para o LinkedIn.</p></div>';
  }

  /* ---------- COMMENT TOOL (sugestões a partir de uma publicação colada) ---------- */

  var COMMENT_SKELETONS = [
    "Concordo com o ponto sobre [tema]. Na minha experiência em [contexto/empresa], vi algo parecido quando [situação real] — e o que resolveu foi [ação concreta].",
    "Eu discordaria só num ponto: [onde discorda] — porque [motivo baseado em experiência própria]. Fora isso, [tema] é mesmo um dos maiores desafios que vejo em [contexto].",
    "Isto conecta diretamente com algo que aprendi a lidar em [tema]: [lição específica]. Curioso para saber como resolveram [pergunta pontual sobre o post].",
    "Um dado que reforça este ponto: [número ou estatística real que conheça]. Sem isso, fica difícil convencer quem decide orçamento em [tema].",
    "O que mais me marcou aqui foi [frase ou ideia específica do post]. Isso mudou a forma como penso [algo concreto na sua prática].",
    "Pergunta genuína: como é que lidam com [situação difícil relacionada com o tema] quando [restrição real, ex.: equipa pequena / prazo apertado]?"
  ];

  function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  function detectThemes(text) {
    var low = text || "";
    return DATA.categories.filter(function (cat) {
      var re = new RegExp("\\b" + escapeRegex(cat) + "\\b", "i");
      return re.test(low);
    });
  }

  function renderCommentTool() {
    root.innerHTML =
      '<div class="page-head"><div><div class="eyebrow">A partir de uma publicação</div><h1>Sugestões de Comentário</h1>' +
      '<div class="page-sub">Cole aqui o texto de uma publicação (sua ou de outra pessoa) para ver comentários já guardados sobre o mesmo tema e estruturas de rascunho para adaptar. Isto não escreve o comentário por si — evita texto genérico, como no <a href="#/guide" style="color:var(--blue);font-weight:600">Guia de Escrita</a>.</div></div></div>' +
      '<div class="ct-panel" style="margin-bottom:20px">' +
      '<label class="field"><span>Texto da publicação</span><textarea id="ctPasted" rows="6" placeholder="Cole aqui o texto do post…"></textarea></label>' +
      '<button class="btn primary" id="ctAnalyze">Analisar publicação</button>' +
      "</div>" +
      '<div id="ctResults"></div>';

    document.getElementById("ctAnalyze").onclick = function () {
      var text = document.getElementById("ctPasted").value.trim();
      if (!text) { toast("Cole o texto da publicação primeiro."); return; }
      analyzePastedPost(text);
    };
  }

  function analyzePastedPost(text) {
    var detected = detectThemes(text);
    var out = document.getElementById("ctResults");

    var selectOptions = DATA.categories.map(function (c) {
      return '<option value="' + esc(c) + '"' + (detected[0] === c ? " selected" : "") + ">" + esc(c) + "</option>";
    }).join("");

    out.innerHTML =
      '<div class="ct-panel" style="margin-bottom:20px">' +
      (detected.length
        ? '<div class="ct-theme-badges">' + detected.map(function (t) { return '<span class="badge gold">' + esc(t) + "</span>"; }).join("") + "</div>" +
          '<p style="color:var(--muted);font-size:13px;margin:0 0 12px">Tema' + (detected.length > 1 ? "s" : "") + " detetado" + (detected.length > 1 ? "s" : "") + " automaticamente. Pode ajustar abaixo."
        : '<p style="color:var(--muted);font-size:13px;margin:0 0 12px">Não foi detetado nenhum tema conhecido no texto — escolha manualmente.</p>') +
      '<label class="field"><span>Tema para filtrar sugestões</span><select id="ctTheme">' + selectOptions + "</select></label>" +
      "</div>" +
      '<div class="ct-layout">' +
      '<div class="ct-panel"><h4>Comentários já guardados sobre este tema</h4><div id="ctExisting"></div></div>' +
      '<div class="ct-panel"><h4>Estruturas para começar (edite antes de usar)</h4><div id="ctSkeletons"></div></div>' +
      "</div>" +
      '<div class="ct-panel" style="margin-top:20px">' +
      '<h4>O seu comentário</h4>' +
      '<label class="field"><span>Categoria</span><select id="ctDraftCategory">' + selectOptions + "</select></label>" +
      '<label class="field"><span>Título (para o guardar no banco de comentários)</span><input type="text" id="ctDraftTitle" placeholder="Ex.: Reação a post sobre Azure Landing Zones"></label>' +
      '<label class="field"><span>Comentário</span><textarea id="ctDraftText" rows="5" placeholder="Escreva aqui, a partir de uma das sugestões ou do zero…"></textarea></label>' +
      '<div class="btn-row"><button class="btn" id="ctStyleCheck">✒️ Verificar tom</button><button class="btn" id="ctCopy">Copiar</button><button class="btn primary" id="ctSave">Guardar no banco de comentários</button></div>' +
      '<div id="ctStyleOut" style="margin-top:12px"></div>' +
      "</div>";

    function drawExisting() {
      var theme = document.getElementById("ctTheme").value;
      var matches = DATA.comments.filter(function (c) { return c.category === theme; });
      var box = document.getElementById("ctExisting");
      box.innerHTML = matches.length
        ? matches.map(function (c) {
            return '<div class="ct-suggestion"><span class="src">' + esc(c.title) + '</span>' + esc(c.text) +
              '<div class="btn-row" style="margin-top:8px"><button class="btn small" data-use-existing="' + esc(c.id) + '">Usar como base</button><button class="btn small" data-copy-existing="' + esc(c.id) + '">Copiar</button></div></div>';
          }).join("")
        : '<div class="ct-empty">Ainda não há comentários guardados neste tema. Pode criar um a partir das estruturas ao lado.</div>';

      box.querySelectorAll("[data-use-existing]").forEach(function (b) {
        b.onclick = function () {
          var c = findById(DATA.comments, b.getAttribute("data-use-existing"));
          document.getElementById("ctDraftText").value = c.text;
          document.getElementById("ctDraftCategory").value = c.category;
          toast("Texto colocado no rascunho — adapte antes de guardar.");
        };
      });
      box.querySelectorAll("[data-copy-existing]").forEach(function (b) {
        b.onclick = function () { copyText(findById(DATA.comments, b.getAttribute("data-copy-existing")).text); };
      });
    }

    function drawSkeletons() {
      var theme = document.getElementById("ctTheme").value;
      var box = document.getElementById("ctSkeletons");
      box.innerHTML = COMMENT_SKELETONS.map(function (s, i) {
        var filled = s.replace(/\[tema\]/gi, theme || "[tema]");
        return '<div class="ct-suggestion"><span class="src">Estrutura ' + (i + 1) + '</span>' + esc(filled) +
          '<div class="btn-row" style="margin-top:8px"><button class="btn small" data-use-skeleton="' + i + '">Usar como base</button></div></div>';
      }).join("");
      box.querySelectorAll("[data-use-skeleton]").forEach(function (b) {
        b.onclick = function () {
          var idx = parseInt(b.getAttribute("data-use-skeleton"), 10);
          var theme2 = document.getElementById("ctTheme").value;
          document.getElementById("ctDraftText").value = COMMENT_SKELETONS[idx].replace(/\[tema\]/gi, theme2 || "[tema]");
          toast("Estrutura colocada no rascunho — preencha os colchetes antes de guardar.");
        };
      });
    }

    document.getElementById("ctTheme").onchange = function () { drawExisting(); drawSkeletons(); };
    drawExisting(); drawSkeletons();

    document.getElementById("ctStyleCheck").onclick = function () {
      renderStyleCheckInto("ctStyleOut", document.getElementById("ctDraftText").value);
    };
    document.getElementById("ctCopy").onclick = function () {
      var v = document.getElementById("ctDraftText").value.trim();
      if (!v) { toast("Escreva o comentário primeiro."); return; }
      copyText(v);
    };
    document.getElementById("ctSave").onclick = function () {
      var textVal = document.getElementById("ctDraftText").value.trim();
      var titleVal = document.getElementById("ctDraftTitle").value.trim();
      var catVal = document.getElementById("ctDraftCategory").value;
      if (!textVal) { toast("Escreva o comentário antes de guardar."); return; }
      if (!titleVal) { toast("Dê um título ao comentário antes de guardar."); return; }
      if (/\[.*\]/.test(textVal)) { toast("Ainda há colchetes [ ] por preencher no comentário."); return; }
      var id = nextId("comments");
      overrides.comments[id] = { id: id, category: catVal, title: titleVal, text: textVal };
      saveOverrides();
      rebuildData();
      toast("Comentário guardado no banco.");
      document.getElementById("ctDraftText").value = "";
      document.getElementById("ctDraftTitle").value = "";
    };
  }

  /* ---------- REVIEWS (revisões mensais) ---------- */

  var REVIEW_CHECK_KEY = "ecr_review_checks_v1";
  var reviewChecks = safeParse(localStorage.getItem(REVIEW_CHECK_KEY)) || {};
  function isChecked(reviewId, idx) { return !!(reviewChecks[reviewId] && reviewChecks[reviewId][idx]); }
  function toggleChecked(reviewId, idx) {
    reviewChecks[reviewId] = reviewChecks[reviewId] || {};
    reviewChecks[reviewId][idx] = !reviewChecks[reviewId][idx];
    localStorage.setItem(REVIEW_CHECK_KEY, JSON.stringify(reviewChecks));
  }
  function checkedCount(review) {
    var n = 0;
    (review.checklist || []).forEach(function (_, idx) { if (isChecked(review.id, idx)) n += 1; });
    return n;
  }

  function renderReviewsList() {
    var list = sortByDate(DATA.reviews);
    root.innerHTML =
      '<div class="page-head"><div><div class="eyebrow">No fim de cada mês</div><h1>Revisões Mensais</h1>' +
      '<div class="page-sub">Um checklist fixo para validar os números antes de seguir para o mês seguinte. Aparecem também no Calendário, no último dia útil de cada mês.</div></div></div>' +
      '<div class="grid">' + list.map(function (r) {
        var total = (r.checklist || []).length;
        var done = checkedCount(r);
        return '<article class="card"><div class="card-body"><div class="badge-row"><span class="badge kind-badge">📊 Revisão</span><span class="badge gold">' + esc(r.period || "") + '</span></div>' +
          "<h3>" + esc(r.title) + "</h3><p>" + esc(r.summary || "") + "</p>" +
          '<div class="card-foot"><span class="card-date">' + done + "/" + total + " validado" + (total === 1 ? "" : "s") + '</span>' +
          '<div class="btn-row"><button class="btn small" data-open-review="' + esc(r.id) + '">Abrir</button></div></div></div></article>';
      }).join("") + "</div>";

    root.querySelectorAll("[data-open-review]").forEach(function (b) { b.onclick = function () { go("#/reviews/" + b.getAttribute("data-open-review")); }; });
  }

  function renderReviewDetail(id) {
    var r = findById(DATA.reviews, id);
    if (!r) return renderNotFound("reviews");
    var total = (r.checklist || []).length;
    var done = checkedCount(r);

    root.innerHTML =
      '<a class="back-link" href="#/reviews">← Voltar a Revisões Mensais</a>' +
      '<div class="page-head"><div><div class="badge-row"><span class="badge kind-badge">📊 Revisão</span><span class="badge gold">' + esc(r.period || "") + "</span></div>" +
      '<h1 style="margin-top:8px">' + esc(r.title) + '</h1><div class="page-sub">' + esc(r.summary || "") + "</div></div></div>" +
      '<div class="detail-panel"><h4 style="font-family:var(--font-display);margin-top:0">Checklist — ' + done + "/" + total + ' validados</h4>' +
      '<div id="reviewChecklist"></div>' +
      '<h4 style="font-family:var(--font-display);margin-top:22px">Notas e conclusões</h4>' +
      '<pre style="white-space:pre-wrap">' + esc(r.notes || "Ainda sem notas — edite para registar as conclusões desta revisão.") + "</pre>" +
      '<div class="btn-row" style="margin-top:16px"><button class="btn" id="actEditReview">Editar</button></div>' +
      "</div>";

    drawChecklist();

    function drawChecklist() {
      var box = document.getElementById("reviewChecklist");
      box.innerHTML = (r.checklist || []).map(function (item, idx) {
        var checked = isChecked(r.id, idx);
        return '<label class="check-item' + (checked ? " done" : "") + '"><input type="checkbox" data-check-idx="' + idx + '"' + (checked ? " checked" : "") + "> " + esc(item) + "</label>";
      }).join("");
      box.querySelectorAll("[data-check-idx]").forEach(function (cb) {
        cb.onchange = function () {
          toggleChecked(r.id, parseInt(cb.getAttribute("data-check-idx"), 10));
          renderReviewDetail(id);
        };
      });
    }

    document.getElementById("actEditReview").onclick = function () { go("#/manage/reviews/" + r.id + "/edit"); };
  }

  /* ---------- MANAGE (CRUD sem código) ---------- */

  function renderManage(param) {
    var parts = param ? param.split("/").filter(Boolean) : [];
    if (!parts.length) return renderManageHome();
    var kind = parts[0];
    if (!FIELD_SCHEMAS[kind]) return renderManageHome();
    if (parts[1] === "new") return renderManageForm(kind, null);
    if (parts[1] && parts[2] === "edit") return renderManageForm(kind, decodeURIComponent(parts[1]));
    return renderManageList(kind);
  }

  function renderManageHome() {
    var kinds = ["posts", "carousels", "articles", "news", "comments", "ideas", "reviews"];
    var tiles = kinds.map(function (k) {
      return '<button class="category-tile" data-manage-open="' + k + '"><span class="name">' + KIND_LABELS[k].icon + " " + KIND_LABELS[k].plural + '</span><span class="count">' + (DATA[k] || []).length + " itens</span></button>";
    }).join("");

    root.innerHTML =
      '<div class="page-head"><div><div class="eyebrow">Sem precisar de código</div><h1>Gerir Conteúdo</h1><div class="page-sub">Adicione, edite, duplique ou elimine conteúdo diretamente aqui. Temas e categorias atualizam-se sozinhos.</div></div></div>' +
      '<div class="category-grid">' + tiles + "</div>" +
      '<div class="detail-panel" style="margin-top:24px"><h4 style="font-family:var(--font-display);margin-top:0">Guardar / partilhar alterações</h4>' +
      '<p style="color:var(--muted);font-size:13.5px;margin-bottom:14px">As alterações feitas aqui ficam guardadas apenas neste navegador. Para as levar para outro computador, ou tornar permanentes na próxima publicação no Netlify, exporte o ficheiro e substitua o conteúdo de data.js, ou importe aqui num novo dispositivo.</p>' +
      '<div class="btn-row"><button class="btn primary" id="exportBtn">Exportar dados (JSON)</button>' +
      '<label class="btn" for="importFile">Importar dados (JSON)</label><input type="file" id="importFile" accept="application/json" style="display:none">' +
      '<button class="btn" id="resetBtn" style="color:#B5490A">Repor predefinições</button></div></div>';

    document.querySelectorAll("[data-manage-open]").forEach(function (b) { b.onclick = function () { go("#/manage/" + b.getAttribute("data-manage-open")); }; });
    document.getElementById("exportBtn").onclick = exportData;
    document.getElementById("importFile").onchange = importData;
    document.getElementById("resetBtn").onclick = function () {
      if (confirm("Repor todas as alterações guardadas neste navegador? Esta ação não pode ser desfeita.")) {
        overrides = emptyOverrides(); saveOverrides(); rebuildData(); toast("Predefinições repostas."); renderManageHome();
      }
    };
  }

  function renderManageList(kind) {
    var items = DATA[kind] || [];
    var rows = items.map(function (item) {
      var theme = item.theme || item.category || "";
      var titleText = item.title || item.text || "(sem título)";
      return '<div class="list-item manage-row"><div><span class="badge">' + esc(theme) + '</span><h3>' + esc(titleText) + '</h3>' + (item.date ? '<div class="card-date">' + fmtDate(item.date) + "</div>" : "") + "</div>" +
        '<div class="btn-row"><button class="btn small" data-manage-edit="' + esc(item.id) + '">Editar</button><button class="btn small" data-manage-delete="' + esc(item.id) + '" style="color:#B5490A">Eliminar</button></div></div>';
    }).join("");

    root.innerHTML =
      '<a class="back-link" href="#/manage">← Voltar a Gerir Conteúdo</a>' +
      '<div class="page-head"><div><div class="eyebrow">Gerir conteúdo</div><h1>' + esc(KIND_LABELS[kind].plural) + '</h1></div>' +
      '<button class="btn primary" id="newBtn">+ Novo</button></div>' +
      '<div class="list">' + (rows || '<div class="empty-state">Ainda não há itens deste tipo.</div>') + "</div>";

    document.getElementById("newBtn").onclick = function () { go("#/manage/" + kind + "/new"); };
    root.querySelectorAll("[data-manage-edit]").forEach(function (b) { b.onclick = function () { go("#/manage/" + kind + "/" + b.getAttribute("data-manage-edit") + "/edit"); }; });
    root.querySelectorAll("[data-manage-delete]").forEach(function (b) {
      b.onclick = function () {
        if (confirm("Eliminar este item? Esta ação não pode ser desfeita.")) { deleteItem(kind, b.getAttribute("data-manage-delete")); renderManageList(kind); }
      };
    });
  }

  function renderManageForm(kind, id) {
    var schema = FIELD_SCHEMAS[kind];
    var existing = id ? findById(DATA[kind], id) : null;
    var isNew = !existing;

    var html = '<a class="back-link" href="#/manage/' + kind + '">← Voltar</a>' +
      '<div class="page-head"><div><div class="eyebrow">Gerir · ' + esc(KIND_LABELS[kind].plural) + '</div><h1>' + (isNew ? "Novo item" : "Editar item") + '</h1></div></div>' +
      '<div class="detail-panel form-panel">';

    schema.forEach(function (f) {
      var val = existing ? (existing[f.key] != null ? existing[f.key] : "") : "";
      html += '<label class="field"><span>' + esc(f.label) + (f.required ? " *" : "") + "</span>";
      if (f.type === "textarea") {
        html += '<textarea id="f_' + f.key + '" rows="' + (f.rows || 4) + '">' + esc(val) + "</textarea>";
      } else if (f.type === "select") {
        html += '<select id="f_' + f.key + '">' + f.options.map(function (o) { return '<option value="' + esc(o) + '"' + (o === val ? " selected" : "") + '>' + esc(o) + "</option>"; }).join("") + "</select>";
      } else {
        html += '<input type="' + (f.type === "date" ? "date" : f.type === "time" ? "time" : "text") + '" id="f_' + f.key + '" value="' + esc(val) + '">';
      }
      if (f.hint) html += '<span class="hint">' + esc(f.hint) + "</span>";
      html += "</label>";
    });

    if (kind === "carousels") {
      var slidesText = existing ? existing.slides.map(function (s) { return s.title + "\n" + s.body; }).join("\n\n") : "";
      html += '<label class="field"><span>Slides *</span><textarea id="f_slidesText" rows="12">' + esc(slidesText) + "</textarea>" +
        '<span class="hint">Um slide por bloco. Primeira linha = título da slide, restante = texto. Separe cada slide com uma linha em branco.</span></label>';
    }

    if (kind === "reviews") {
      var checklistText = existing ? (existing.checklist || []).join("\n") : "";
      html += '<label class="field"><span>Checklist *</span><textarea id="f_checklistText" rows="8">' + esc(checklistText) + "</textarea>" +
        '<span class="hint">Um item por linha — cada linha vira um ponto do checklist.</span></label>';
    }

    if (STYLE_CHECK_FIELDS[kind]) {
      html += '<div class="style-check"><button class="btn" type="button" id="styleCheckBtn">✒️ Verificar tom (evitar "cara de IA")</button><div id="styleCheckOut" style="margin-top:10px"></div></div>';
    }

    html += '<div class="btn-row" style="margin-top:16px"><button class="btn primary" id="saveBtn">Guardar</button>';
    if (!isNew) html += '<button class="btn" id="deleteBtn" style="color:#B5490A">Eliminar</button>';
    html += "</div></div>";

    root.innerHTML = html;

    document.getElementById("saveBtn").onclick = function () { saveManageForm(kind, existing ? existing.id : null); };
    if (!isNew) {
      document.getElementById("deleteBtn").onclick = function () {
        if (confirm("Eliminar este item? Esta ação não pode ser desfeita.")) { deleteItem(kind, existing.id); go("#/manage/" + kind); }
      };
    }
    var styleBtn = document.getElementById("styleCheckBtn");
    if (styleBtn) {
      styleBtn.onclick = function () {
        var combined = STYLE_CHECK_FIELDS[kind].map(function (k) {
          var el = document.getElementById("f_" + k);
          return el ? el.value : "";
        }).join("\n\n");
        renderStyleCheckInto("styleCheckOut", combined);
      };
    }
  }

  function saveManageForm(kind, existingId) {
    var schema = FIELD_SCHEMAS[kind];
    var base = existingId ? findById(DATA[kind], existingId) : null;
    var obj = base ? JSON.parse(JSON.stringify(base)) : {};

    for (var i = 0; i < schema.length; i += 1) {
      var f = schema[i];
      var el = document.getElementById("f_" + f.key);
      var value = el ? el.value : "";
      if (f.required && !value.trim()) { toast(f.label + " é obrigatório."); return; }
      obj[f.key] = value;
    }

    if (kind === "carousels") {
      var raw = document.getElementById("f_slidesText").value;
      var blocks = raw.split(/\n\s*\n/).map(function (b) { return b.trim(); }).filter(Boolean);
      if (!blocks.length) { toast("Adicione pelo menos um slide."); return; }
      obj.slides = blocks.map(function (b) {
        var lines = b.split("\n");
        return { title: lines[0] || "", body: lines.slice(1).join("\n").trim() };
      });
    }

    if (kind === "reviews") {
      var rawChecklist = document.getElementById("f_checklistText").value;
      var items = rawChecklist.split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
      if (!items.length) { toast("Adicione pelo menos um item ao checklist."); return; }
      obj.checklist = items;
    }

    obj.id = existingId || nextId(kind);
    overrides[kind][obj.id] = obj;
    saveOverrides();
    rebuildData();
    toast(existingId ? "Alterações guardadas." : "Item criado.");
    go("#/manage/" + kind);
  }

  function exportData() {
    var payload = {
      posts: DATA.posts, carousels: DATA.carousels, articles: DATA.articles,
      news: DATA.news, comments: DATA.comments, ideas: DATA.ideas, reviews: DATA.reviews, categories: DATA.categories
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = "executive-content-repository-export.json";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    toast("Dados exportados.");
  }

  function importData(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var parsed = safeParse(reader.result);
      if (!parsed) { toast("Ficheiro inválido."); return; }
      ["posts", "carousels", "articles", "news", "comments", "ideas", "reviews"].forEach(function (kind) {
        (parsed[kind] || []).forEach(function (item) { if (item.id) overrides[kind][item.id] = item; });
      });
      saveOverrides(); rebuildData(); toast("Dados importados."); renderManageHome();
    };
    reader.readAsText(file);
  }

  /* ---------- misc ---------- */

  function renderNotFound(backRoute) {
    root.innerHTML = '<div class="empty-state">Conteúdo não encontrado. <a class="back-link" href="#/' + backRoute + '">← Voltar</a></div>';
  }

  /* ---------- global search shortcut in sidebar ---------- */

  document.getElementById("globalSearch").addEventListener("keydown", function (e) {
    if (e.key === "Enter") go("#/search/" + encodeURIComponent(e.target.value.trim()));
  });

  /* ---------- init ---------- */

  rebuildData();
  window.addEventListener("hashchange", router);
  window.addEventListener("DOMContentLoaded", router);
  if (document.readyState !== "loading") router();
})();
