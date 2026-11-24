import * as XLSX from 'xlsx';
import { predictGender } from '../../constants';

export interface ConferenceCriteria {
  domini_tema: string;
  estructura: string;
  fluidesa: string;
  veu_entonacio: string;
  vocabulari: string;
  expressio_corporal: string;
  interaccio: string;
  claredat_suport: string;
  recursos_visuals: string;
  revisio_millora: string;
  terminis_acords: string;
}

export interface ParsedConferenceRecord {
  name: string;
  rawName: string;
  topic: string;
  date: string;
  trimester: number;
  language: string;
  status: 'Complet' | 'Pendent';
  nameArticle: string;
  criteria: ConferenceCriteria;
  aspectes_destacar: string;
  aspectes_millorar: string;
  observacions_docent: string;
  suggestedImprovement: string;
}

export interface ParseConferencesResult {
  records: ParsedConferenceRecord[];
  completedCount: number;
  pendingCount: number;
  trimesterCounts: { [t: number]: number };
  summaryMessage: string;
}

/**
 * Dedueix el trimestre escolar a partir de la data de la conferència.
 * Regla de curs escolar català:
 * - Fins al gener (o mesos 9, 10, 11, 12, 1) -> Trimestre 1 (T1)
 * - De febrer a Setmana Santa (mesos 2, 3, 4 abans de pasqua) -> Trimestre 2 (T2)
 * - Després de Setmana Santa fins al juny (mesos 4, 5, 6) -> Trimestre 3 (T3)
 * Si no hi ha data i l'estat és Complet, per defecte és T1 (tal com indica el docent).
 */
export function deduceTrimesterFromDate(dateStr: string): number {
  if (!dateStr || !dateStr.trim()) return 1;
  const clean = dateStr.trim();

  // Pattern DD/MM/YYYY o DD-MM-YYYY
  const parts = clean.split(/[\/\-\.]/);
  if (parts.length >= 2) {
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[0], 10);
    if (!isNaN(month)) {
      if (month >= 9 && month <= 12) return 1;
      if (month === 1 && (isNaN(day) || day <= 31)) return 1; // Fins al gener
      if (month >= 2 && month <= 3) return 2;
      if (month === 4 && day <= 15) return 2;
      if (month >= 4) return 3;
    }
  }

  const lower = clean.toLowerCase();
  if (lower.includes('trimestre 1') || lower.includes('1r trimestre') || lower.includes('t1')) return 1;
  if (lower.includes('trimestre 2') || lower.includes('2n trimestre') || lower.includes('t2')) return 2;
  if (lower.includes('trimestre 3') || lower.includes('3r trimestre') || lower.includes('t3')) return 3;
  if (lower.includes('gener') || lower.includes('desembre') || lower.includes('novembre') || lower.includes('octubre') || lower.includes('setembre')) return 1;
  if (lower.includes('febrer') || lower.includes('març')) return 2;
  if (lower.includes('abril') || lower.includes('maig') || lower.includes('juny')) return 3;

  return 1;
}

/**
 * Normalitza el nom d'un alumne (Cognoms, Nom -> Nom Cognoms).
 */
export function formatConferenceStudentName(rawName: string): string {
  if (!rawName) return "";
  let clean = rawName.trim();
  if (clean.includes(',')) {
    const parts = clean.split(',').map(p => p.trim());
    if (parts.length >= 2 && parts[1]) {
      clean = `${parts[1]} ${parts[0]}`;
    }
  }
  return clean.replace(/\s+/g, ' ');
}

/**
 * Analitza el fitxer d'avaluació de conferències (Excel .xlsx o CSV).
 */
export function parseConferenceRegister(fileData: string | ArrayBuffer | Uint8Array): ParseConferencesResult {
  let workbook: XLSX.WorkBook;

  if (typeof fileData === 'string') {
    workbook = XLSX.read(fileData, { type: 'string' });
  } else {
    workbook = XLSX.read(new Uint8Array(fileData), { type: 'array' });
  }

  // 1. Cerquem la pestanya de REGISTRE o la primera que contingui columnes de conferència
  let targetSheet: XLSX.WorkSheet | null = null;
  for (const sheetName of workbook.SheetNames) {
    const lower = sheetName.toLowerCase();
    if (lower.includes('registre') || lower.includes('conferenci') || lower.includes('conferència')) {
      targetSheet = workbook.Sheets[sheetName];
      break;
    }
  }

  if (!targetSheet && workbook.SheetNames.length > 0) {
    targetSheet = workbook.Sheets[workbook.SheetNames[0]];
  }

  if (!targetSheet) {
    throw new Error("No s'ha pogut trobar cap full amb dades de conferències.");
  }

  const rawMatrix: any[][] = XLSX.utils.sheet_to_json(targetSheet, { header: 1, defval: '' });
  if (!rawMatrix || rawMatrix.length === 0) {
    throw new Error("El full de conferències està buit.");
  }

  // 2. Cerquem la fila de capçalera que conté 'Alumne/a' i els criteris
  let headerRowIndex = -1;
  let colMap: { [key: string]: number } = {};

  for (let r = 0; r < Math.min(15, rawMatrix.length); r++) {
    const row = rawMatrix[r];
    if (!Array.isArray(row)) continue;

    const rowMap: { [key: string]: number } = {};
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] || '').trim().toLowerCase();
      if (cell === 'alumne/a' || cell === 'alumne' || cell === 'nom' || cell.includes('alumne/a')) rowMap['alumne'] = c;
      if (cell.includes('tema')) rowMap['tema'] = c;
      if (cell === 'data' || cell.includes('data')) rowMap['data'] = c;
      if (cell.includes('llengua')) rowMap['llengua'] = c;
      if (cell.includes('domini')) rowMap['domini_tema'] = c;
      if (cell === 'estructura' || cell.includes('estructura')) rowMap['estructura'] = c;
      if (cell.includes('fluïdesa') || cell.includes('fluidesa')) rowMap['fluidesa'] = c;
      if (cell.includes('veu') || cell.includes('entonació')) rowMap['veu_entonacio'] = c;
      if (cell.includes('vocabulari')) rowMap['vocabulari'] = c;
      if (cell.includes('corporal')) rowMap['expressio_corporal'] = c;
      if (cell.includes('interacció') || cell.includes('interaccio')) rowMap['interaccio'] = c;
      if (cell.includes('claredat')) rowMap['claredat_suport'] = c;
      if (cell.includes('recursos visuals') || cell.includes('visuals')) rowMap['recursos_visuals'] = c;
      if (cell.includes('revisió') || cell.includes('revisio')) rowMap['revisio_millora'] = c;
      if (cell.includes('terminis') || cell.includes('acords')) rowMap['terminis_acords'] = c;
      if (cell === 'estat' || cell.includes('estat')) rowMap['estat'] = c;
      if (cell.includes('article')) rowMap['article'] = c;
      if (cell.includes('destacar')) rowMap['aspectes_destacar'] = c;
      if (cell.includes('a millorar') || cell.includes('millorar')) rowMap['aspectes_millorar'] = c;
      if (cell.includes('observacions del') || cell.includes('docent')) rowMap['observacions_docent'] = c;
    }

    if (rowMap['alumne'] !== undefined && rowMap['domini_tema'] !== undefined) {
      headerRowIndex = r;
      colMap = rowMap;
      break;
    }
  }

  // Si no s'han trobat capçaleres exactes, apliquem el mapa estàndard del fitxer oficial
  if (headerRowIndex === -1) {
    headerRowIndex = 5; // Fila 6 del registre oficial
    colMap = {
      alumne: 0,
      tema: 1,
      data: 2,
      llengua: 3,
      domini_tema: 4,
      estructura: 5,
      fluidesa: 6,
      veu_entonacio: 7,
      vocabulari: 8,
      expressio_corporal: 9,
      interaccio: 10,
      claredat_suport: 11,
      recursos_visuals: 12,
      revisio_millora: 13,
      terminis_acords: 14,
      observacions_docent: 15,
      estat: 16,
      article: 17,
      aspectes_destacar: 18,
      aspectes_millorar: 19
    };
  }

  const records: ParsedConferenceRecord[] = [];
  const trimesterCounts: { [t: number]: number } = { 1: 0, 2: 0, 3: 0 };
  let completedCount = 0;
  let pendingCount = 0;

  for (let r = headerRowIndex + 1; r < rawMatrix.length; r++) {
    const row = rawMatrix[r];
    if (!row || !Array.isArray(row)) continue;

    const rawName = String(row[colMap['alumne'] ?? 0] || '').trim();
    if (!rawName || rawName.length < 2) continue;

    const name = formatConferenceStudentName(rawName);
    const topic = String(row[colMap['tema'] ?? 1] || '').trim();
    const dateStr = String(row[colMap['data'] ?? 2] || '').trim();
    const language = String(row[colMap['llengua'] ?? 3] || 'Català').trim();

    const domini_tema = String(row[colMap['domini_tema'] ?? 4] || '').trim();
    const estructura = String(row[colMap['estructura'] ?? 5] || '').trim();
    const fluidesa = String(row[colMap['fluidesa'] ?? 6] || '').trim();
    const veu_entonacio = String(row[colMap['veu_entonacio'] ?? 7] || '').trim();
    const vocabulari = String(row[colMap['vocabulari'] ?? 8] || '').trim();
    const expressio_corporal = String(row[colMap['expressio_corporal'] ?? 9] || '').trim();
    const interaccio = String(row[colMap['interaccio'] ?? 10] || '').trim();
    const claredat_suport = String(row[colMap['claredat_suport'] ?? 11] || '').trim();
    const recursos_visuals = String(row[colMap['recursos_visuals'] ?? 12] || '').trim();
    const revisio_millora = String(row[colMap['revisio_millora'] ?? 13] || '').trim();
    const terminis_acords = String(row[colMap['terminis_acords'] ?? 14] || '').trim();

    const observacions_docent = String(row[colMap['observacions_docent'] ?? 15] || '').trim();
    const rawEstat = String(row[colMap['estat'] ?? 16] || '').trim().toLowerCase();
    const nameArticle = String(row[colMap['article'] ?? 17] || '').trim();
    const aspectes_destacar = String(row[colMap['aspectes_destacar'] ?? 18] || '').trim();
    const aspectes_millorar = String(row[colMap['aspectes_millorar'] ?? 19] || '').trim();

    // Determinar si està complet
    const hasAnyCriteria = Boolean(domini_tema || estructura || fluidesa || aspectes_destacar || aspectes_millorar);
    const isCompleted = rawEstat === 'complet' || (hasAnyCriteria && rawEstat !== 'pendent');
    const status: 'Complet' | 'Pendent' = isCompleted ? 'Complet' : 'Pendent';

    // Deduir trimestre
    const trimester = deduceTrimesterFromDate(dateStr);

    if (isCompleted) {
      completedCount++;
      trimesterCounts[trimester] = (trimesterCounts[trimester] || 0) + 1;
    } else {
      pendingCount++;
    }

    records.push({
      name,
      rawName,
      topic,
      date: dateStr,
      trimester,
      language,
      status,
      nameArticle,
      criteria: {
        domini_tema,
        estructura,
        fluidesa,
        veu_entonacio,
        vocabulari,
        expressio_corporal,
        interaccio,
        claredat_suport,
        recursos_visuals,
        revisio_millora,
        terminis_acords
      },
      aspectes_destacar,
      aspectes_millorar,
      observacions_docent,
      suggestedImprovement: ""
    });
  }

  const summaryMessage = `S'han detectat ${records.length} alumnes al registre de conferències: ${completedCount} completats (T1: ${trimesterCounts[1] || 0}, T2: ${trimesterCounts[2] || 0}, T3: ${trimesterCounts[3] || 0}) i ${pendingCount} pendents.`;

  return {
    records,
    completedCount,
    pendingCount,
    trimesterCounts,
    summaryMessage
  };
}
