/**
 * Retorna la configuració unificada de nivells per a qualsevol rúbrica.
 * Si la rúbrica defineix levels (com ['NA', 'AS', 'AN', 'AE']), utilitza aquests codis i noms.
 * En cas contrari, utilitza per defecte ['N', 'Ap', 'Av', 'Ex'] (Novell, Aprenent, Avançat, Excel·lent).
 */
export const getRubricLevels = (rubric) => {
  const colors = ['bg-red-500', 'bg-amber-500', 'bg-emerald-500', 'bg-primary-900'];
  const descriptions = {
    'NA': 'No assolit',
    'AS': 'Assolit satisfactori',
    'AN': 'Assolit notable',
    'AE': 'Assolit excel·lent',
    '1': 'Necessita acompanyament freqüent',
    '2': 'Avança amb suport',
    '3': 'Actua amb autonomia',
    '4': 'Aprofundeix o pren iniciativa',
    'N1': 'Necessita acompanyament freqüent',
    'N2': 'Avança amb suport',
    'N3': 'Actua amb autonomia',
    'N4': 'Aprofundeix o pren iniciativa',
    'N': 'Novell',
    'Ap': 'Aprenent',
    'Av': 'Avançat',
    'Ex': 'Excel·lent'
  };

  if (rubric && Array.isArray(rubric.levels) && rubric.levels.length === 4) {
    return rubric.levels.map((lvl, idx) => ({
      label: lvl,
      full: descriptions[lvl] || lvl,
      color: colors[idx] || 'bg-slate-700'
    }));
  }

  return [
    { label: 'N', full: 'Novell', color: 'bg-red-500' },
    { label: 'Ap', full: 'Aprenent', color: 'bg-amber-500' },
    { label: 'Av', full: 'Avançat', color: 'bg-emerald-500' },
    { label: 'Ex', full: 'Excel·lent', color: 'bg-primary-900' }
  ];
};
