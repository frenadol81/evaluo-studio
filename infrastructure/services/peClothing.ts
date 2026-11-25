export type ClothingMark = 'yes' | 'no' | 'absent';
export type ClothingSession = {
  date: string;
  trimester: number;
  marks: Record<string, ClothingMark>;
};

export function clothingTotals(sessions: ClothingSession[], id: string) {
  let yes = 0;
  let attended = 0;
  for (const session of sessions) {
    const mark = session.marks[id];
    if (mark === 'yes' || mark === 'no') attended++;
    if (mark === 'yes') yes++;
  }
  return { yes, attended, percent: attended ? yes * 100 / attended : 0 };
}

export function clothingEvidence(totals: ReturnType<typeof clothingTotals>, regular: number, occasional: number) {
  if (totals.attended < 3) return '';
  const coverage = `(${totals.yes} de ${totals.attended} sessions amb assistència)`;
  if (totals.percent === 100) return `Ha complert l’hàbit de roba i canvi a totes les sessions registrades ${coverage}.`;
  if (totals.percent >= regular) return `Habitualment ha complert l’hàbit de roba i canvi ${coverage}.`;
  if (totals.percent >= occasional) return `Ha complert l’hàbit de roba i canvi de manera irregular ${coverage}.`;
  return `El registre mostra que sovint ha tingut pendent l’hàbit de roba i canvi ${coverage}.`;
}

const evidencePrefix = '[Registre EF] ';

export function mergeClothingEvidence(previous: string | string[] | undefined, text: string) {
  const lines = (Array.isArray(previous) ? previous : (previous || '').split('\n'))
    .filter(line => line.trim() && !line.startsWith(evidencePrefix));
  return [...lines, evidencePrefix + text].join('\n');
}
