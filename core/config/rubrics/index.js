
import { ALL_RUBRICS as RUBRICS_T1 } from './T1/index.js';
import { ALL_RUBRICS as RUBRICS_T2 } from './T2/index.js';
import { ALL_RUBRICS as RUBRICS_T3 } from './T3/index.js';

/**
 * RUBRICS_BY_TRIMESTER: Agrupació de rúbriques per període.
 */
export const RUBRICS_BY_TRIMESTER = {
  1: RUBRICS_T1,
  2: RUBRICS_T2,
  3: RUBRICS_T3
};

/**
 * Funció per obtenir el set de rúbriques actiu.
 */
export const getRubricsForTrimester = (trimester) => {
  return RUBRICS_BY_TRIMESTER[trimester] || RUBRICS_T2;
};

// Mantenim ALL_RUBRICS com a T2 per defecte per evitar trencaments immediats
export const ALL_RUBRICS = RUBRICS_T2;

export { RUBRIC_MAKER } from './07_maker.js';
export { RUBRIC_PLANETA_BLAU } from './08_planeta_blau.js';
export { RUBRIC_FISICA } from './06b_fisica.js';
export { RUBRIC_VALORS } from './06c_valors.js';

/**
 * getRubricLevels: Retorna els 4 nivells adaptats a la rúbrica (NA, AS, AN, AE o N, Ap, Av, Ex)
 */
export const getRubricLevels = (rubric) => {
  const colors = ['bg-red-500', 'bg-amber-500', 'bg-emerald-500', 'bg-primary-900'];
  const descriptions = {
    'NA': 'No assolit',
    'AS': 'Assolit satisfactori',
    'AN': 'Assolit notable',
    'AE': 'Assolit excel·lent',
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
