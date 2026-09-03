// "Verificação de tom" -- heuristic scanner for common AI-writing tells,
// ported verbatim (same rules, same PT-PT messages) from the legacy app.
// Pure client-side pattern matching, no API calls, never blocks publishing --
// it's a review aid only.

export function scanForAiTells(text) {
  const t = text || '';
  const flags = [];
  const checks = [
    { re: /não\s+é\s+apenas[^.]*,?\s*é\b/i, msg: 'Frase em molde "não é apenas X, é Y" — muito comum em texto gerado por IA. Diga a ideia diretamente.' },
    { re: /não\s+só\b.{0,45}\bcomo\s+também\b/i, msg: 'Estrutura "não só X como também Y" — repetida em texto de IA. Considere simplificar.' },
    { re: /no\s+mundo\s+atual|na\s+era\s+digital|no\s+cenário\s+atual/i, msg: 'Abertura genérica ("no mundo atual"/"na era digital") — comece pelo facto concreto, não pelo contexto óbvio.' },
    { re: /é\s+importante\s+notar\s+que|vale\s+ressaltar\s+que|é\s+fundamental\s+destacar/i, msg: 'Frase de enchimento ("é importante notar que...") — diga a informação diretamente, sem anunciar que vai dizê-la.' },
    { re: /em\s+suma|em\s+conclusão|por\s+fim,\s+mas\s+não\s+menos\s+importante/i, msg: 'Fecho formulaico ("em suma"/"em conclusão") — normalmente a frase funciona melhor sem ele.' },
    { re: /sem\s+dúvida/i, msg: '"Sem dúvida" costuma ser dispensável — se for mesmo óbvio, a frase funciona sem ele.' },
    { re: /revolucionári|transformador|disruptiv|sinergia|holístic|inovador[a]?\b/i, msg: 'Palavra vaga de discurso corporativo ("revolucionário", "sinergia", "disruptivo"...) — troque por um resultado concreto e mensurável.' },
    { re: /desbloqueie|desbloquear\s+(o|todo)/i, msg: '"Desbloquear potencial/valor" é uma expressão muito usada por IA em português traduzido do inglês.' }
  ];
  checks.forEach(c => { if (c.re.test(t)) flags.push(c.msg); });

  const emDashCount = (t.match(/—/g) || []).length;
  if (emDashCount >= 3) flags.push(`Usa o travessão (—) ${emDashCount} vezes. Em excesso, lembra texto gerado por IA — experimente vírgulas ou frases mais curtas nalguns casos.`);

  const triadMatches = t.match(/\b\w+,\s*\w+\s+e\s+\w+\b/gi) || [];
  if (triadMatches.length >= 3) flags.push(`Padrão "X, Y e Z" repetido ${triadMatches.length} vezes. Variar a estrutura das frases ajuda a soar mais humano.`);

  const exclCount = (t.match(/!/g) || []).length;
  if (exclCount >= 3) flags.push(`Muitos pontos de exclamação (${exclCount}). Um tom executivo costuma ser mais contido.`);

  const sentences = t.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  if (sentences.length >= 5) {
    const lens = sentences.map(s => s.split(/\s+/).filter(Boolean).length);
    const avg = lens.reduce((a, b) => a + b, 0) / lens.length;
    const variance = lens.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / lens.length;
    if (variance < 4) flags.push('As frases têm quase todas o mesmo comprimento. Misture frases curtas e longas para soar mais natural.');
  }
  if (!/\d/.test(t) && t.length > 300) flags.push('Não há nenhum número, dado ou exemplo concreto no texto. Um detalhe específico costuma tornar o texto mais credível e menos genérico.');
  return flags;
}

export function toneCheckHtml(text) {
  const flags = scanForAiTells(text);
  if (!flags.length) return '<div class="badge ok" style="display:block;padding:10px 14px;font-size:12.5px;text-transform:none;font-family:var(--font-body)">✓ Nenhum sinal comum de texto "com cara de IA" encontrado.</div>';
  return `<div class="panel" style="border-color:var(--warn)"><strong style="font-size:13px">${flags.length} ${flags.length === 1 ? 'ponto a rever' : 'pontos a rever'}:</strong><ul style="margin:8px 0 0;padding-left:18px;font-size:13px;color:var(--muted);line-height:1.6">${flags.map(f => `<li>${f}</li>`).join('')}</ul></div>`;
}
