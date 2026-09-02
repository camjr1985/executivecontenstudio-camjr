/* ============================================================
   EXECUTIVE CONTENT REPOSITORY — COVERS
   Cada post, carrossel e artigo precisa de identidade visual
   própria e nunca repetida. Em vez de reutilizar imagens ou
   depender de fotografia externa, este módulo gera uma capa
   editorial exclusiva por item (determinística, a partir do
   próprio ID), num sistema de motivos gráficos premium em
   tons de azul, branco e dourado — a mesma direção visual em
   toda a biblioteca, sem duas capas iguais.

   Para substituir por fotografia real no futuro, basta trocar
   a chamada Cover.render(...) por uma tag <img src="...">.
   ============================================================ */
(function (global) {
  "use strict";

  var PALETTE = {
    navy: "#0B1B33",
    navy2: "#13294B",
    blue: "#2451B5",
    blueLight: "#5C87E6",
    gold: "#C9A227",
    goldSoft: "#E8D9A8",
    paper: "#F7F8FA"
  };

  var MOTIFS = ["diagonal", "arcs", "grid", "chevron", "radial"];

  function hash(str) {
    var h = 0;
    for (var i = 0; i < str.length; i += 1) {
      h = (h << 5) - h + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }

  function initials(title) {
    var words = String(title || "").trim().split(/\s+/).filter(Boolean);
    var letters = words.slice(0, 2).map(function (w) { return w[0]; }).join("");
    return letters.toUpperCase() || "EC";
  }

  function motifSvg(kind, h) {
    switch (kind) {
      case "diagonal":
        return (
          '<g opacity="0.9">' +
          '<rect x="-40" y="120" width="620" height="26" fill="' + PALETTE.gold + '" transform="rotate(-8 300 133)"/>' +
          '<rect x="-40" y="200" width="620" height="10" fill="' + PALETTE.blueLight + '" opacity="0.55" transform="rotate(-8 300 205)"/>' +
          '<rect x="-40" y="70" width="620" height="6" fill="' + PALETTE.goldSoft + '" opacity="0.6" transform="rotate(-8 300 73)"/>' +
          "</g>"
        );
      case "arcs":
        return (
          '<g fill="none" stroke-width="10">' +
          '<circle cx="' + (h % 120 + 420) + '" cy="90" r="150" stroke="' + PALETTE.gold + '" opacity="0.85"/>' +
          '<circle cx="' + (h % 120 + 420) + '" cy="90" r="200" stroke="' + PALETTE.blueLight + '" opacity="0.45"/>' +
          '<circle cx="' + (h % 120 + 420) + '" cy="90" r="250" stroke="' + PALETTE.goldSoft + '" opacity="0.3"/>' +
          "</g>"
        );
      case "grid":
        var dots = "";
        var cols = 9, rows = 5;
        var offX = h % 30;
        for (var r = 0; r < rows; r += 1) {
          for (var c = 0; c < cols; c += 1) {
            var active = (r * cols + c + h) % 5 === 0;
            dots += '<circle cx="' + (40 + c * 58 + offX) + '" cy="' + (36 + r * 58) + '" r="' + (active ? 8 : 3.5) + '" fill="' + (active ? PALETTE.gold : PALETTE.blueLight) + '" opacity="' + (active ? 0.95 : 0.35) + '"/>';
          }
        }
        return '<g>' + dots + '</g>';
      case "chevron":
        var chevrons = "";
        for (var i = 0; i < 6; i += 1) {
          var x = -60 + i * 90 + (h % 40);
          chevrons += '<path d="M' + x + ' -20 L' + (x + 60) + ' 150 L' + x + ' 320" fill="none" stroke="' + (i % 2 === 0 ? PALETTE.gold : PALETTE.blueLight) + '" stroke-width="14" opacity="' + (i % 2 === 0 ? 0.9 : 0.4) + '"/>';
        }
        return '<g>' + chevrons + '</g>';
      case "radial":
      default:
        var rays = "";
        var cx = 470, cy = 40;
        for (var k = 0; k < 14; k += 1) {
          var ang = (k / 14) * Math.PI * 1.1 - 0.4;
          var len = 260 + (k % 3) * 20;
          var x2 = cx + Math.cos(ang) * len;
          var y2 = cy + Math.sin(ang) * len;
          rays += '<line x1="' + cx + '" y1="' + cy + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + (k % 3 === 0 ? PALETTE.gold : PALETTE.blueLight) + '" stroke-width="' + (k % 3 === 0 ? 6 : 2) + '" opacity="' + (k % 3 === 0 ? 0.85 : 0.35) + '"/>';
        }
        return '<g>' + rays + "</g>";
    }
  }

  function escapeXml(v) {
    return String(v || "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c];
    });
  }

  // Returns raw <svg> markup, 600x320, unique per id.
  function svgMarkup(id, theme, title) {
    var h = hash(id);
    var motif = MOTIFS[h % MOTIFS.length];
    var bgFrom = h % 2 === 0 ? PALETTE.navy : PALETTE.navy2;
    var mark = initials(title);
    return (
      '<svg viewBox="0 0 600 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + escapeXml(title) + '">' +
      '<defs><linearGradient id="bg-' + id + '" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + bgFrom + '"/>' +
      '<stop offset="1" stop-color="' + PALETTE.navy + '"/>' +
      "</linearGradient></defs>" +
      '<rect width="600" height="320" fill="url(#bg-' + id + ')"/>' +
      '<g clip-path="url(#clip-' + id + ')">' +
      '<clipPath id="clip-' + id + '"><rect width="600" height="320"/></clipPath>' +
      motifSvg(motif, h) +
      "</g>" +
      '<rect x="0" y="0" width="600" height="320" fill="none" stroke="' + PALETTE.goldSoft + '" stroke-opacity="0.25" stroke-width="1"/>' +
      '<text x="28" y="270" font-family="IBM Plex Mono, monospace" font-size="12" letter-spacing="2" fill="' + PALETTE.goldSoft + '" opacity="0.85">' + escapeXml((theme || "").toUpperCase()) + "</text>" +
      '<text x="28" y="296" font-family="Fraunces, Georgia, serif" font-size="30" font-weight="600" fill="#FFFFFF">' + escapeXml(mark) + "</text>" +
      "</svg>"
    );
  }

  function dataUri(id, theme, title) {
    var svg = svgMarkup(id, theme, title);
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  }

  global.Cover = { svgMarkup: svgMarkup, dataUri: dataUri };
})(window);
