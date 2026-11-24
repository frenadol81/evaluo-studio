
import { RUBRIC_INTRO } from './00_introduccio.js';
import { RUBRIC_PERSONALITY } from './01_personality.js';
import { RUBRIC_HABITS } from './04_habits.js';
import { RUBRIC_LINGUISTIC } from './05_linguistic.js';
import { RUBRIC_MATEMATIC } from './06_matematic.js';
import { RUBRIC_MEDI } from './06d_medi.js';
import { RUBRIC_VALORS } from '../06c_valors.js';
import { RUBRIC_MAKER } from './07_maker.js';
import { RUBRIC_PLANETA_BLAU } from '../08_planeta_blau.js';

export const ALL_RUBRICS = [
  RUBRIC_INTRO,
  RUBRIC_PERSONALITY,
  RUBRIC_HABITS,
  RUBRIC_LINGUISTIC,
  RUBRIC_MATEMATIC,
  RUBRIC_MEDI,
  RUBRIC_VALORS,
  RUBRIC_MAKER,
  RUBRIC_PLANETA_BLAU
].filter(Boolean);
