import { loadStore } from './data.js';
import { initDrawer, closeDrawer } from './components.js';
import { qs, qsa, fmtDate } from './lib/util.js';
import { renderHome } from './views/home.js';
import { renderCalendar } from './views/calendar.js';
import { renderProduction } from './views/production.js';
import { renderLibrary } from './views/library.js';
import { renderNews } from './views/news.js';
import { renderComments } from './views/comments.js';
import { renderCommentTool } from './views/comment-tool.js';
import { renderCampaigns, renderCampaignDetail } from './views/campaigns.js';
import { renderLive } from './views/live.js';
import { renderIdeas } from './views/ideas.js';
import { renderReviews, renderReviewDetail } from './views/reviews.js';
import { renderSearch } from './views/search.js';
import { renderGuide } from './views/guide.js';
import { renderGovernance } from './views/governance.js';

const root = qs('#view-root');
let STORE = null;

function navigate(hash) { location.hash = hash; }

function parseHash() {
  const h = (location.hash || '#/home').replace(/^#\/?/, '');
  const parts = h.split('/').filter(Boolean);
  return { view: parts[0] || 'home', param: parts.slice(1).join('/') };
}

function highlightNav(view) {
  qsa('#mainNav a').forEach(a => a.classList.toggle('active', a.getAttribute('data-route') === view));
  const crumb = qs('#topbarCrumb');
  const label = qs(`[data-route="${view}"] span:last-child`)?.textContent;
  if (crumb) crumb.textContent = label ? `Executive Content Studio · ${label}` : 'Executive Content Studio';
}

function router() {
  const { view, param } = parseHash();
  highlightNav(view);
  root.scrollTo?.(0, 0);
  qs('#sidebar').classList.remove('open');
  closeDrawer();

  const routes = {
    home: () => renderHome(root, STORE, navigate),
    posts: () => renderLibrary(root, STORE, navigate, 'Post', { eyebrow: 'Biblioteca', title: 'Posts', sub: 'Conteúdo, imagem e hashtags preparados para publicação manual no LinkedIn.' }),
    carousels: () => renderLibrary(root, STORE, navigate, 'Carousel', { eyebrow: 'Biblioteca', title: 'Carrosséis', sub: 'Sequências de slides com capa própria, uma por item.' }),
    articles: () => renderLibrary(root, STORE, navigate, 'Article', { eyebrow: 'Biblioteca', title: 'Artigos', sub: 'Textos longos para publicação como artigo, com cascata de promoção e derivados.' }),
    news: () => renderNews(root, STORE, navigate),
    comments: () => renderComments(root, STORE, navigate),
    'comment-tool': () => renderCommentTool(root, STORE, navigate),
    calendar: () => renderCalendar(root, STORE, navigate, param || null),
    campaigns: () => param ? renderCampaignDetail(root, STORE, navigate, decodeURIComponent(param)) : renderCampaigns(root, STORE, navigate),
    live: () => renderLive(root, STORE, navigate),
    ideas: () => renderIdeas(root, STORE, navigate),
    production: () => renderProduction(root, STORE, navigate),
    reviews: () => param ? renderReviewDetail(root, STORE, navigate, param) : renderReviews(root, STORE, navigate),
    search: () => renderSearch(root, STORE, navigate, param ? decodeURIComponent(param) : ''),
    guide: () => renderGuide(root, STORE, navigate),
    governance: () => renderGovernance(root, STORE, navigate)
  };
  (routes[view] || routes.home)();
}

async function boot() {
  initDrawer();
  qs('#menuToggle').addEventListener('click', () => qs('#sidebar').classList.toggle('open'));
  const dateEl = qs('#topbarDate');
  if (dateEl) dateEl.textContent = fmtDate(new Date().toISOString().slice(0, 10));
  qs('#globalSearch').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') navigate('#/search/' + encodeURIComponent(e.target.value.trim()));
  });

  try {
    STORE = await loadStore();
  } catch (err) {
    root.innerHTML = `<div class="empty-state"><span class="ic">⚠️</span>Não foi possível carregar o calendário canónico (${err.message}). Verifique a ligação e recarregue.</div>`;
    console.error(err);
    return;
  }

  addEventListener('hashchange', router);
  router();
}

boot();
