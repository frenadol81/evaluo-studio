import { RUBRIC_MATEMATIC_T1 } from '../../core/config/rubrics/T1/06_matematic.js';

export interface ParsedMathRecord {
  num: number;
  name: string;
  rawName: string;
  levels: {
    numeracio: number;
    calcul: number;
    problemes: number;
    geometria: number;
  };
  tags: string[];
}

function parseNum(val: string | undefined): number {
  if (!val) return 0;
  return parseFloat(val.replace(',', '.').trim()) || 0;
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
  const lines = csvContent.split('\n');
  const results: ParsedMathRecord[] = [];

  const c1 = RUBRIC_MATEMATIC_T1.data[0].options;
  const c2 = RUBRIC_MATEMATIC_T1.data[1].options;
  const c3 = RUBRIC_MATEMATIC_T1.data[2].options;
  const c4 = RUBRIC_MATEMATIC_T1.data[3].options;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Cerquem les línies d'alumnes que comencen per número (ex: 1,"Ahmed Shahzadi, Hooria",...)
    const match = line.match(/^(\d+),\"([^\"]+)\"/);
    if (!match) continue;

    const num = parseInt(match[1], 10);
    const raw = match[2];
    const parts = raw.split(',').map(s => s.trim());
    let name = raw;
    if (parts.length === 2) {
      name = `${parts[1]} ${parts[0]}`;
    }

    // Parse CSV line amb cometes
    const cols: string[] = [];
    let cur = '';
    let inQ = false;
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (ch === '\"') {
        inQ = !inQ;
      } else if (ch === ',' && !inQ) {
        cols.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    cols.push(cur.trim());

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

    // Pesos competencials de la rúbrica de T1:
    // 1. Numeració i sentit numèric: T1 (/2) + T2 (/2) -> total /4
    const numRatio = (t1 + t2) / 4;
    // 2. Càlcul i relacions multiplicatives: T3 (/3) + Càlcul (/2) -> total /5
    const calcRatio = (t3 + calcul) / 5;
    // 3. Resolució de problemes i raonament: T4 (/2) -> total /2
    const probRatio = t4 / 2;
    // 4. Geometria i raonament espacial: T5 (/3) + T6 (/2) -> total /5
    const geoRatio = (t5 + t6) / 5;

    const lvl1 = toLevel(numRatio);
    const lvl2 = toLevel(calcRatio);
    const lvl3 = toLevel(probRatio);
    const lvl4 = toLevel(geoRatio);

    const tags = [c1[lvl1], c2[lvl2], c3[lvl3], c4[lvl4]];

    results.push({
      num,
      name,
      rawName: raw,
      levels: {
        numeracio: lvl1,
        calcul: lvl2,
        problemes: lvl3,
        geometria: lvl4
      },
      tags
    });
  }

  return results;
}
