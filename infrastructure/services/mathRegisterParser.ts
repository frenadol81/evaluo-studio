import { RUBRIC_MATEMATIC_T1 } from '../../core/config/rubrics/T1/06_matematic.js';
import { parseCsvRows, parseMathExportRows } from './mathRegisterExport.js';

export interface ParsedMathRecord {
  num: number;
  name: string;
  rawName: string;
  levels: Partial<{ numeracio: number; calcul: number; problemes: number; geometria: number }>;
  mathRegister?: { schema: string; status: string; version: string; evidence: string; draft: string };
  tags: string[];
}

function parseNum(val: string | undefined): number | null {
  if (val == null || !val.trim()) return null;
  const n = Number(val.replace(',', '.').trim());
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function toLevel(ratio: number): number {
  if (ratio < 0.40) return 0; // Inici (NA)
  if (ratio < 0.65) return 1; // En progrés (AS)
  if (ratio < 0.85) return 2; // Assolit (AN)
  return 3;                  // Avançat (AE)
}

/**
 * Analitza el contingut d'un fitxer CSV / Excel exportat del registre de matemàtiques de 4t Tram 1.
 * Extrau automàticament els alumnes, puntuacions de tasques i assigna els tags de la rúbrica oficial de T1.
 */
export function parseMathRegisterCSV(csvContent: string): ParsedMathRecord[] {
  const rows = parseCsvRows(csvContent);
  const structured = parseMathExportRows(rows);
  if (structured !== null) return structured as ParsedMathRecord[];
  const results: ParsedMathRecord[] = [];

  const c1 = RUBRIC_MATEMATIC_T1.data[0].options;
  const c2 = RUBRIC_MATEMATIC_T1.data[1].options;
  const c3 = RUBRIC_MATEMATIC_T1.data[2].options;
  const c4 = RUBRIC_MATEMATIC_T1.data[3].options;

  for (const cols of rows) {
    const num = Number(cols[0]);
    const raw = (cols[1] || '').trim();
    if (!Number.isInteger(num) || num <= 0 || !raw) continue;
    const parts = raw.split(',').map(s => s.trim());
    const name = parts.length === 2 ? `${parts[1]} ${parts[0]}` : raw;

    // Índexs de les tasques segons la capçalera del model:
    // Tasca 1 /2 (cols[18]), Tasca 2 /2 (cols[19]), Tasca 3 /3 (cols[20]),
    // Tasca 4 /2 (cols[21]), Tasca 5 /3 (cols[22]), Tasca 6 /2 (cols[23]),
    // Càlcul integrat /2 (cols[35])
    const t1 = parseNum(cols[18]);
    const t2 = parseNum(cols[19]);
    const t3 = parseNum(cols[20]);
    const t4 = parseNum(cols[21]);
    const t5 = parseNum(cols[22]);
    const t6 = parseNum(cols[23]);
    const calcul = parseNum(cols[35]);

    // Compatibilitat amb el registre antic: mai convertir absències en zeros.
    const levels: ParsedMathRecord['levels'] = {};
    const tags: string[] = [];
    if (t1 !== null && t2 !== null && t1 <= 2 && t2 <= 2) {
      levels.numeracio = toLevel((t1 + t2) / 4); tags.push(c1[levels.numeracio]);
    }
    if (t3 !== null && calcul !== null && t3 <= 3 && calcul <= 2) {
      levels.calcul = toLevel((t3 + calcul) / 5); tags.push(c2[levels.calcul]);
    }
    if (t4 !== null && t4 <= 2) {
      levels.problemes = toLevel(t4 / 2); tags.push(c3[levels.problemes]);
    }
    if (t5 !== null && t6 !== null && t5 <= 3 && t6 <= 2) {
      levels.geometria = toLevel((t5 + t6) / 5); tags.push(c4[levels.geometria]);
    }
    if (tags.length) results.push({ num, name, rawName: raw, levels, tags });
  }

  return results;
}
