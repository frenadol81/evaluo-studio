export function normalizeReportVocabulary(text) {
  if (typeof text !== 'string') return text;
  return text.replace(/\b(?:(a|de|per)\s+)?les\s+paraules\s+de\s+ci[eè]ncies(?:\s+treballades)?\b/giu, (phrase, preposition) => {
    const contracted = { a: 'al', de: 'del', per: 'pel' };
    const article = preposition ? contracted[preposition.toLowerCase()] : 'el';
    const articleWithCase = /^[A-Z]/.test(phrase) ? article[0].toUpperCase() + article.slice(1) : article;
    const suffix = /treballades$/iu.test(phrase) ? ' treballat' : '';
    return `${articleWithCase} vocabulari científic${suffix}`;
  });
}

function normalizeEntry(entry) {
  const original = entry?.state?.generatedReport;
  const report = normalizeReportVocabulary(original);
  const originalNarrative = entry?.content?.planetaBlau?.narrative;
  const narrative = normalizeReportVocabulary(originalNarrative);
  if (report === original && narrative === originalNarrative) return entry;
  return {
    ...entry,
    ...(report !== original ? { state: { ...entry.state, generatedReport: report } } : {}),
    ...(narrative !== originalNarrative ? {
      content: { ...entry.content, planetaBlau: { ...entry.content.planetaBlau, narrative } },
    } : {}),
  };
}

export function normalizeSavedReportVocabulary(student) {
  const entry = normalizeEntry(student);
  if (!entry?.trimesters) return entry;
  return {
    ...entry,
    trimesters: Object.fromEntries(Object.entries(entry.trimesters).map(([term, saved]) => [term, normalizeEntry(saved)])),
  };
}
