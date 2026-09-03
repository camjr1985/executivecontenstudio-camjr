// Deterministic SVG cover generator, ported from the legacy Executive Content
// Repository (covers.js). Every cover is generated client-side from a hash of
// the content ID -- no external images, no stock photography, never repeats.
// Kept behaviourally identical to the legacy version; only exported as an ES
// module instead of a `window.Cover` global.

const PALETTE = {
  navy: '#0B1B33', navy2: '#13294B', blue: '#2451B5', blueLight: '#5C87E6',
  gold: '#C9A227', goldSoft: '#E8D9A8', paper: '#F7F8FA'
};
const MOTIFS = ['diagonal', 'arcs', 'grid', 'chevron', 'radial'];

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}
function initials(title) {
  const words = String(title || '').trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function motifMarkup(motif, h, accent) {
  switch (motif) {
    case 'diagonal':
      return `<path d="M0 ${140 + (h % 40)} L420 ${40 + (h % 60)} L420 220 L0 220 Z" fill="${accent}" opacity=".16"/>`;
    case 'arcs':
      return Array.from({ length: 3 }).map((_, i) => `<circle cx="${340 - i * 50}" cy="${40 + i * 8}" r="${70 + i * 26}" fill="none" stroke="${accent}" stroke-width="1.4" opacity="${.5 - i * .12}"/>`).join('');
    case 'grid':
      return Array.from({ length: 6 }).map((_, i) => `<line x1="${i * 42}" y1="0" x2="${i * 42}" y2="220" stroke="${accent}" stroke-width="1" opacity=".12"/>`).join('');
    case 'chevron':
      return Array.from({ length: 4 }).map((_, i) => `<path d="M${-20 + i * 40} 220 L${60 + i * 40} 120 L${140 + i * 40} 220" fill="none" stroke="${accent}" stroke-width="2" opacity=".18"/>`).join('');
    case 'radial':
    default:
      return `<circle cx="${60 + (h % 300)}" cy="60" r="150" fill="${accent}" opacity=".14"/>`;
  }
}

export function svgMarkup(id, theme, title) {
  const h = hash(id + '|' + (theme || ''));
  const motif = MOTIFS[h % MOTIFS.length];
  const accent = (h % 2 === 0) ? PALETTE.gold : PALETTE.blueLight;
  const bg = (h % 3 === 0) ? PALETTE.navy2 : PALETTE.navy;
  const mono = initials(title || theme || id);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 220" width="420" height="220">
    <rect width="420" height="220" fill="${bg}"/>
    ${motifMarkup(motif, h, accent)}
    <text x="24" y="180" font-family="Georgia, serif" font-size="46" font-weight="700" fill="#ffffff" opacity=".92">${mono || 'ECS'}</text>
    <text x="24" y="200" font-family="monospace" font-size="10" letter-spacing="2" fill="${PALETTE.goldSoft}">${(theme || '').toUpperCase().slice(0, 28)}</text>
  </svg>`;
}

export function dataUri(id, theme, title) {
  const svg = svgMarkup(id, theme, title);
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
