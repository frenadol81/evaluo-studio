export type ReportEditMode = 'synonyms' | 'rewrite' | 'soften' | 'direct';

const synonyms: Record<string, string[]> = {
  millorar: ['perfeccionar', 'polir', 'fer progressos'],
  aprendre: ['assimilar', 'entendre', 'adquirir coneixements'],
  explicar: ['exposar', 'descriure', 'fer entendre'],
  ajudar: ['donar suport', 'acompanyar', 'donar un cop de mà'],
  ajuda: ['suport', 'acompanyament', 'orientació'],
  suport: ['ajuda', 'acompanyament', 'orientació'],
  dificultat: ['obstacle', 'entrebanc', 'repte'],
  dificultats: ['obstacles', 'entrebancs', 'reptes'],
  repte: ['desafiament', 'objectiu', 'fita'],
  esforç: ['dedicació', 'constància', 'perseverança'],
  feina: ['treball', 'tasca', 'activitat'],
  treball: ['feina', 'tasca', 'activitat'],
  tasca: ['feina', 'activitat', 'encàrrec'],
  resultat: ['resultat obtingut', 'fruit del treball', 'allò que ha aconseguit'],
  participa: ['pren part', 's’hi implica', 'hi col·labora'],
  destaca: ['sobresurt', 'crida l’atenció', 'té un paper destacat'],
  comprèn: ['entén', 'assimila', 'capta'],
  comprensió: ['entesa', 'assimilació', 'capacitat d’entendre'],
  observacions: ['anotacions', 'apunts', 'allò que ha observat'],
  proper: ['pròxim', 'següent', 'vinent'],
};

const rewrites: Record<Exclude<ReportEditMode, 'synonyms'>, Array<[RegExp, string[]]>> = {
  soften: [
    [/necessita acompanyament freqüent/i, ['sovint li va bé tenir acompanyament', 'li va bé comptar amb ajuda sovint', 'sovint l’acompanyem']],
    [/li costa/i, ['encara necessita ajuda per', 'li demana més esforç', 'encara li suposa un repte']],
    [/amb molta autonomia/i, ['amb autonomia', 'pel seu compte', 'de manera autònoma']],
    [/excel·lent/i, ['molt bo', 'de molta qualitat', 'destacat']],
  ],
  direct: [
    [/li va bé comptar amb (?:ajuda|suport) sovint/i, ['sovint necessita ajuda', 'necessita suport sovint', 'li cal ajuda sovint']],
    [/de manera autònoma/i, ['pel seu compte', 'sense ajuda', 'amb autonomia']],
    [/posa en pràctica/i, ['aplica', 'utilitza', 'fa servir']],
    [/fer ús de/i, ['utilitzar', 'fer servir', 'emprar']],
  ],
  rewrite: [
    [/amb autonomia/i, ['pel seu compte', 'de manera autònoma', 'sense ajuda']],
    [/per tal de/i, ['per', 'a fi de', 'amb l’objectiu de']],
    [/durant el procés/i, ['al llarg del procés', 'mentre treballa', 'en el transcurs de la feina']],
    [/el (?:proper|pròxim) pas és/i, ['el pas següent és', 'ara ens proposem', 'a partir d’ara treballarem per']],
    [/a l[’']hora de/i, ['quan es tracta de', 'en el moment de', 'quan cal']],
    [/fa servir/i, ['utilitza', 'empra', 'se serveix de']],
    [/posa a prova/i, ['prova', 'comprova', 'sotmet a prova']],
  ],
};

function matchInitialCase(source: string, replacement: string) {
  return /^\p{Lu}/u.test(source) ? replacement[0].toUpperCase() + replacement.slice(1) : replacement;
}

export function getLocalReportAlternatives(text: string, mode: ReportEditMode): string[] {
  if (mode === 'synonyms') {
    const key = text.toLocaleLowerCase('ca');
    return Object.hasOwn(synonyms, key) ? synonyms[key].map(word => matchInitialCase(text, word)) : [];
  }
  for (const [pattern, alternatives] of rewrites[mode]) {
    if (pattern.test(text)) {
      return alternatives.map(word => text.replace(pattern, original => matchInitialCase(original, word)));
    }
  }
  return [];
}
