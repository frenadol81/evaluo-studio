import * as XLSX from 'xlsx';
import { predictGender } from '../../constants';

export interface ParsedEspaiStudent {
  name: string;
  rawName: string;
  course: string;
  gender: 'Masculí' | 'Femení';
  order: number;
  originalGroup?: string;
  round: number;
}

export interface ParsedEspaiRound {
  roundNumber: number;
  roundName: string;
  spaceName: string;
  teacherName: string;
  groupId: string;
  groupName: string;
  students: ParsedEspaiStudent[];
}

export interface ParseEspaisResult {
  rounds: ParsedEspaiRound[];
  allPlanetaBlauStudents: ParsedEspaiStudent[];
  totalStudents: number;
  detectedRoundsCount: number;
  summaryMessage: string;
}

/**
 * Normalitza el curs al format de grau sol·licitat pel docent (ex: "4º A", "4º B", "5º A", "5º B", "6º A", "6º B").
 */
export function normalizeCourseToDegreeFormat(text: string): string {
  if (!text) return "";
  const cleaned = text.trim();

  // Coincidència de número (1-6) amb o sense indicador ordinal (t, rt, è, º, etc.) i lletra A-Z
  const match = cleaned.match(/\b([1-6])\s*(?:º|t|rt|è|r|n|a|ª)?\s*[-_.]?\s*([A-Za-z])\b/i);
  if (match) {
    const num = match[1];
    const letter = match[2].toUpperCase();
    return `${num}º ${letter}`;
  }

  // Coincidència de curs només numèric amb indicador ordinal
  const matchNum = cleaned.match(/\b([1-6])\s*(?:º|t|rt|è|r|n)\b/i);
  if (matchNum) {
    return `${matchNum[1]}º`;
  }

  return cleaned;
}

/**
 * Detecta si una cel·la conté la menció d'un curs (ex: "4º A", "4t B", "5è A", "6è B", "4A", etc.)
 */
export function detectCourseFromCell(cellValue: any): string | null {
  if (cellValue === null || cellValue === undefined) return null;
  const str = String(cellValue).trim();
  if (!str) return null;

  // Si és exactament o conté un curs
  const match = str.match(/\b([1-6])\s*(?:º|t|rt|è|r|n|a|ª)?\s*[-_.]?\s*([A-Za-z])\b/i);
  if (match) {
    const num = match[1];
    const letter = match[2].toUpperCase();
    return `${num}º ${letter}`;
  }

  const matchNum = str.match(/\b([1-6])\s*(?:º|t|rt|è|r|n)\b/i);
  if (matchNum) {
    return `${matchNum[1]}º`;
  }

  return null;
}

/**
 * Rang estricte d'ordenació sol·licitat pel docent:
 * 1r: 4º A
 * 2n: 4º B
 * 3r: 5º A
 * 4t: 5º B
 * 5è: 6º A
 * 6è: 6º B
 */
export function getCourseSortRank(courseStr: string): number {
  if (!courseStr) return 999;
  const norm = normalizeCourseToDegreeFormat(courseStr);
  if (norm === '4º A') return 10;
  if (norm === '4º B') return 20;
  if (norm === '5º A') return 30;
  if (norm === '5º B') return 40;
  if (norm === '6º A') return 50;
  if (norm === '6º B') return 60;

  // Ordre per a qualsevol altre curs si existís (ex: 3r A, etc.)
  const m = norm.match(/([1-6])º?\s*([A-Za-z])?/);
  if (m) {
    const num = parseInt(m[1], 10);
    const letter = (m[2] || 'A').toUpperCase();
    return num * 100 + (letter.charCodeAt(0) - 64);
  }
  return 999;
}

/**
 * Comprova si una capçalera de columna o cel·la correspon expressament a CHRISTIAN / CRISTIAN.
 * Ignora l'altre grup de Planeta Blau i qualsevol altre espai.
 */
export function isChristianHeader(text: any): boolean {
  if (!text) return false;
  const lower = String(text).toLowerCase().trim();
  return lower.includes('christian') || lower.includes('cristian') || lower.includes('cristhian');
}

/**
 * Detecta si una cadena fa referència a Planeta Blau / Planeta Blav.
 */
export function isPlanetaBlau(text: any): boolean {
  if (!text) return false;
  const lower = String(text).toLowerCase().trim();
  return lower.includes('planeta') || lower.includes('blau') || lower.includes('blav') || lower === 'pb';
}

/**
 * Detecta el número de ronda (ex: "Ronda 1", "Planeta 1", "R1", "1a Ronda")
 */
export function detectRoundNumber(text: string): number | null {
  if (!text) return null;
  const lower = text.toLowerCase().trim();

  const m1 = lower.match(/(?:ronda|planeta)\s*([1-9])/);
  if (m1) return parseInt(m1[1], 10);

  const m2 = lower.match(/(?:^|\s)(?:r|p)([1-9])(?:\s|$)/);
  if (m2) return parseInt(m2[1], 10);

  const m3 = lower.match(/([1-9])(?:a|ª|ra|na|ta|a\.)?\s*(?:ronda|planeta)/);
  if (m3) return parseInt(m3[1], 10);

  // Si és un número sol
  if (/^[1-9]$/.test(lower)) {
    return parseInt(lower, 10);
  }

  return null;
}

/**
 * Extreu el primer cognom respectant partícules nobiliàries o catalanes/castellanes ("de la", "del", "de", "d'").
 */
export function extractFirstSurname(surnamesStr: string): string {
  if (!surnamesStr) return "";
  const tokens = surnamesStr.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return "";
  if (tokens.length === 1) return tokens[0];

  const lower0 = tokens[0].toLowerCase();
  const lower1 = tokens[1]?.toLowerCase();

  // Partícules de 3 paraules: "de la", "de les", "de los", "de las"
  if ((lower0 === 'de' || lower0 === 'de la') && tokens.length >= 3 && (lower1 === 'la' || lower1 === 'les' || lower1 === 'los' || lower1 === 'las')) {
    return `${tokens[0]} ${tokens[1]} ${tokens[2]}`;
  }
  // Partícules de 2 paraules: "de", "del", "d'"
  if ((lower0 === 'de' || lower0 === 'del' || lower0.startsWith("d'")) && tokens.length >= 2) {
    return `${tokens[0]} ${tokens[1]}`;
  }

  return tokens[0];
}

/**
 * Capitalitza la paraula respectant partícules
 */
export function capitalizeWord(word: string): string {
  if (!word) return "";
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function capitalizeName(str: string): string {
  if (!str) return "";
  return str
    .split(/\s+/)
    .map(word => {
      const lower = word.toLowerCase();
      if (['de', 'del', 'la', 'les', 'los', 'las', 'i', "d'"].includes(lower)) {
        return lower;
      }
      return capitalizeWord(word);
    })
    .join(' ');
}

/**
 * Transforma el nom en el format sol·licitat:
 * [Nom] [Primer Cognom] [Curs com a segon cognom] (ex: "Marc Garcia 4º A")
 */
export function formatStudentNameWithCourse(rawName: string, course: string): { formattedName: string; firstName: string; firstSurname: string } {
  let clean = rawName.trim();

  // Neteja numeració inicial (ex: "1. Marc García", "12 - Laura Vidal")
  clean = clean.replace(/^\d+[\.\-\)\s]+/, '').trim();

  // Neteja curs entre parèntesis/claudàtors al final
  clean = clean.replace(/[\(\[\-]\s*[1-6](?:r|n|t|è|º|rt)?\s*[A-Za-z]?\s*[\)\]]?$/i, '').trim();

  const normCourse = normalizeCourseToDegreeFormat(course);

  let firstName = "";
  let firstSurname = "";

  if (clean.includes(',')) {
    // Format "Cognoms, Nom" (ex: "García Pérez, Marc" o "Vidal Soler, Laura")
    const parts = clean.split(',').map(p => p.trim());
    const rawFirst = parts[1] || "";
    const rawSurnames = parts[0] || "";

    firstName = capitalizeName(rawFirst);
    firstSurname = capitalizeName(extractFirstSurname(rawSurnames));
  } else {
    // Format "Nom Cognom1 Cognom2" (ex: "Marc García Pérez" o "Laura Vidal Soler")
    const tokens = clean.split(/\s+/).filter(Boolean);
    if (tokens.length === 1) {
      firstName = capitalizeName(tokens[0]);
      firstSurname = "";
    } else if (tokens.length === 2) {
      firstName = capitalizeName(tokens[0]);
      firstSurname = capitalizeName(tokens[1]);
    } else {
      // 3 o més paraules: comprovem noms compostos coneguts
      const compound2 = `${tokens[0]} ${tokens[1]}`.toLowerCase();
      const isCompound = ['josep maria', 'maria del mar', 'joan carles', 'ana maria', 'juan carlos', 'maria teresa', 'marc antoni'].includes(compound2);

      if (isCompound && tokens.length >= 3) {
        firstName = capitalizeName(`${tokens[0]} ${tokens[1]}`);
        const rest = tokens.slice(2).join(' ');
        firstSurname = capitalizeName(extractFirstSurname(rest));
      } else {
        firstName = capitalizeName(tokens[0]);
        const rest = tokens.slice(1).join(' ');
        firstSurname = capitalizeName(extractFirstSurname(rest));
      }
    }
  }

  let formattedName = "";
  if (firstSurname && normCourse) {
    formattedName = `${firstName} ${firstSurname} ${normCourse}`;
  } else if (firstSurname) {
    formattedName = `${firstName} ${firstSurname}`;
  } else if (normCourse) {
    formattedName = `${firstName} ${normCourse}`;
  } else {
    formattedName = firstName || clean;
  }

  return { formattedName, firstName, firstSurname };
}

/**
 * Processador principal del fitxer d'Espais / Planeta Blav (Excel / CSV).
 * Identifica la columna de Christian a la dreta i els cursos a l'esquerra,
 * ordenant estrictament per 4º A, 4º B, 5º A, 5º B, 6º A, 6º B.
 */
export function parseEspaisRegister(fileData: string | ArrayBuffer | Uint8Array): ParseEspaisResult {
  let workbook: XLSX.WorkBook;

  if (typeof fileData === 'string') {
    workbook = XLSX.read(fileData, { type: 'string' });
  } else {
    workbook = XLSX.read(new Uint8Array(fileData), { type: 'array' });
  }

  // Mapa de rondes: roundNumber -> ParsedEspaiStudent[]
  const roundsMap = new Map<number, ParsedEspaiStudent[]>();

  let sheetIndex = 0;

  for (const sheetName of workbook.SheetNames) {
    sheetIndex++;
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rawMatrix: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (!rawMatrix || rawMatrix.length === 0) continue;

    const sheetRoundNum = detectRoundNumber(sheetName);

    // Cerquem quines columnes d'aquest full corresponen a CHRISTIAN
    const christianColumns: { colIndex: number; headerRow: number; roundNum?: number }[] = [];
    const maxCols = Math.max(...rawMatrix.slice(0, 15).map(r => r.length), 0);

    for (let c = 0; c < maxCols; c++) {
      let isColChristian = false;
      let headerRowFound = 0;
      let roundFromCol: number | null = null;

      for (let r = 0; r < Math.min(10, rawMatrix.length); r++) {
        const cell = String(rawMatrix[r]?.[c] || '').trim();
        if (isChristianHeader(cell)) {
          isColChristian = true;
          headerRowFound = r;
          roundFromCol = detectRoundNumber(cell);
          break;
        }
      }

      // Si no es troba en una cel·la individual, cerquem capçaleres combinades/agrupades (ex: fila 0 "Planeta Blav", fila 1 "Christian")
      if (!isColChristian) {
        const stacked = [0, 1, 2, 3, 4]
          .map(r => String(rawMatrix[r]?.[c] || '').trim())
          .filter(Boolean)
          .join(' ');
        if (isChristianHeader(stacked)) {
          isColChristian = true;
          headerRowFound = 1;
          roundFromCol = detectRoundNumber(stacked);
        }
      }

      if (isColChristian) {
        christianColumns.push({
          colIndex: c,
          headerRow: headerRowFound,
          roundNum: roundFromCol || sheetRoundNum || sheetIndex
        });
      }
    }

    // Si no hem trobat cap columna amb "Christian" però el propi full s'anomena Christian
    if (christianColumns.length === 0 && isChristianHeader(sheetName)) {
      // Cerquem la columna que tingui Planeta Blau o la columna de l'espai
      for (let c = 0; c < maxCols; c++) {
        const stacked = [0, 1, 2, 3].map(r => String(rawMatrix[r]?.[c] || '').trim()).join(' ');
        if (isPlanetaBlau(stacked) || stacked.toLowerCase().includes('alumne') || stacked.toLowerCase().includes('estudiant')) {
          christianColumns.push({
            colIndex: c,
            headerRow: 1,
            roundNum: sheetRoundNum || sheetIndex
          });
          break;
        }
      }
    }

    // Processar cadascuna de les columnes de Christian trobades
    for (const cCol of christianColumns) {
      const activeRound = cCol.roundNum || sheetRoundNum || sheetIndex;
      let currentCourse = "";

      for (let r = cCol.headerRow + 1; r < rawMatrix.length; r++) {
        const row = rawMatrix[r];
        if (!row) continue;

        // 1. Detectar canvi de curs a les columnes de l'esquerra (col < cCol.colIndex)
        for (let leftC = 0; leftC < cCol.colIndex; leftC++) {
          const valLeft = row[leftC];
          const courseDetected = detectCourseFromCell(valLeft);
          if (courseDetected) {
            currentCourse = courseDetected;
            break;
          }
        }

        // 2. Llegir la cel·la de la columna de Christian
        const christianCell = String(row[cCol.colIndex] || '').trim();
        if (!christianCell) continue;

        const lowerCell = christianCell.toLowerCase();
        // Ignorar repeticions de títols, totals o capçaleres
        if (
          lowerCell.includes('christian') ||
          lowerCell.includes('cristian') ||
          lowerCell.includes('planeta') ||
          lowerCell === 'total' ||
          lowerCell === 'curs' ||
          lowerCell === 'alumnes' ||
          lowerCell === 'nom' ||
          lowerCell.includes('observacions')
        ) {
          continue;
        }

        let rawStudentName = "";
        const isCheckmark = ['x', 'x.', '1', 'si', 'sí', 'ok', 'v', '✓'].includes(lowerCell);

        if (isCheckmark) {
          // Si és una marca, el nom de l'alumne és a la columna de noms a l'esquerra
          for (let leftC = 0; leftC < cCol.colIndex; leftC++) {
            const valLeft = String(row[leftC] || '').trim();
            if (valLeft.length >= 3 && !detectCourseFromCell(valLeft) && !valLeft.match(/^\d+$/)) {
              rawStudentName = valLeft;
              break;
            }
          }
        } else if (christianCell.length >= 3 && !christianCell.match(/^\d+$/)) {
          // La cel·la conté directament el nom de l'alumne assignat a Christian
          rawStudentName = christianCell;
        }

        if (!rawStudentName) continue;

        // Comprovem si el propi text del nom ja portava el curs (ex: "Marc García (4º A)")
        const courseFromName = detectCourseFromCell(rawStudentName);
        const studentCourse = normalizeCourseToDegreeFormat(courseFromName || currentCourse || "4º A");

        const { formattedName, firstName } = formatStudentNameWithCourse(rawStudentName, studentCourse);

        const list = roundsMap.get(activeRound) || [];
        // Evitem duplicats a la mateixa ronda
        if (!list.some(s => s.name.toLowerCase() === formattedName.toLowerCase())) {
          list.push({
            name: formattedName,
            rawName: rawStudentName,
            course: studentCourse,
            gender: predictGender(firstName),
            order: list.length + 1,
            originalGroup: studentCourse,
            round: activeRound
          });
          roundsMap.set(activeRound, list);
        }
      }
    }
  }

  // Ordenar i generar les estructures de ronda finals
  const sortedRounds: ParsedEspaiRound[] = [];
  const allStudents: ParsedEspaiStudent[] = [];

  const roundNumbers = Array.from(roundsMap.keys()).sort((a, b) => a - b);

  for (const rNum of roundNumbers) {
    const rawList = roundsMap.get(rNum) || [];

    // CONDICIÓ DOCENT: Si la pestanya / ronda està buida d'alumnes, NO incloure res
    if (rawList.length === 0) continue;

    // ORDENACIÓ SOL·LICITADA PEL DOCENT:
    // 1r: 4º A, 4º B, 5º A, 5º B, 6º A, 6º B
    // 2n: Alfabèticament dins de cada curs
    const sortedList = [...rawList].sort((a, b) => {
      const rankA = getCourseSortRank(a.course);
      const rankB = getCourseSortRank(b.course);
      if (rankA !== rankB) return rankA - rankB;
      return a.name.localeCompare(b.name, 'ca', { sensitivity: 'base' });
    });

    // Reassignar l'ordre consecutiu 1, 2, 3...
    const indexedList = sortedList.map((s, idx) => ({
      ...s,
      order: idx + 1
    }));

    // Nom de grup sol·licitat per a la barra lateral: "Planeta 1", "Planeta 2", etc.
    const roundObj: ParsedEspaiRound = {
      roundNumber: rNum,
      roundName: `Planeta ${rNum}`,
      spaceName: "Planeta Blau",
      teacherName: "Christian",
      groupId: `G_PB_${rNum}`,
      groupName: `Planeta ${rNum}`,
      students: indexedList
    };

    sortedRounds.push(roundObj);
    allStudents.push(...indexedList);
  }

  const detectedRoundsCount = sortedRounds.length;
  const totalStudents = allStudents.length;

  const roundDetails = sortedRounds
    .map(r => `${r.groupName}: ${r.students.length} alumnes`)
    .join(', ');

  const summaryMessage = detectedRoundsCount > 0
    ? `S'han detectat ${detectedRoundsCount} rondes de Planeta Blav (Christian) amb un total de ${totalStudents} alumnes (${roundDetails}). Tots ordenats estrictament per 4º A, 4º B, 5º A, 5º B, 6º A, 6º B.`
    : "No s'han trobat alumnes associats a Planeta Blav de Christian en aquest fitxer.";

  return {
    rounds: sortedRounds,
    allPlanetaBlauStudents: allStudents,
    totalStudents,
    detectedRoundsCount,
    summaryMessage
  };
}
