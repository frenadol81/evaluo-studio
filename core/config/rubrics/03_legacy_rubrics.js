
import { DEFAULT_RUBRICS } from '../../../constants';

/**
 * Adaptamos las rúbricas clásicas al sistema modular.
 * Usamos un nuevo tipo 'COMPACT_SELECTOR' para mantener la estética de botones pequeños.
 */
export const RUBRIC_LEGACY = {
  id: 'legacy_rubrics',
  title: 'Rúbriques Acadèmiques i Convivència',
  inputType: 'LEGACY_SELECTOR',
  data: DEFAULT_RUBRICS
};
