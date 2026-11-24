import * as XLSX from 'xlsx';
import { calculateReadingLevel } from '../../core/logic/decatypeCalc.js';
import { parseStudentName } from '../../core/logic/nameParser.js';

export interface ReadingSubRecord {
  wpm: number;
  levelTag: string;
  levelNumber: number;
  errors: string;
  comp: string;
  date?: string;
}

export interface ParsedReadingRecord {
  name: string;
  rawName: string;
  wpm: number;
  levelTag: string;
  levelNumber: number;
  errors: string;
  comp: string;
  date?: string;
  cat?: ReadingSubRecord;
  cast?: ReadingSubRecord;
}

export interface ParseReadingResult {
  records: ParsedReadingRecord[];
  count: number;
  summaryMessage: string;
}

/**
 * Normalitza el nom d'un alumne per comparació flexible
 */
export function normalizeStudentKey(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Converteix una taula bidimensional (com la de Excel o d'un document Word)
 * en una llista de registres de velocitat lectora normalitzats (gestionant català i castellà).
 */
export function parseReadingRows(rows: any[][], defaultDate = "oct' 26"): ParsedReadingRecord[] {
  if (!rows || rows.length === 0) return [];

  const recordsMap = new Map<string, ParsedReadingRecord>();
  let currentLanguage: 'cat' | 'cast' = 'cat';

  let headerRowIdx = -1;
  let nameCol = 0;
  let speedCol = 1;
  let errorsCol = 2;
  let compCol = 3;

  for (let r = 0; r < Math.min(rows.length, 5); r++) {
    const row = rows[r].map(c => String(c || '').toLowerCase().trim());
    const hasName = row.some(c => c.includes('nom') || c.includes('alumne') || c.includes('estudiant') || c.includes('4t'));
    const hasSpeed = row.some(c => c.includes('ppm') || c.includes('wpm') || c.includes('veloc') || c.includes('oct') || c.includes('maig'));
    const hasErrors = row.some(c => c.includes('errad') || c.includes('mecanic') || c.includes('ritme') || c.includes('observaci'));
    const hasComp = row.some(c => c.includes('comp') || c.includes('decatip'));

    if (hasSpeed || hasErrors || hasComp || hasName) {
      headerRowIdx = r;
      row.forEach((cell, idx) => {
        if (cell.includes('nom') || cell.includes('alumne') || cell.includes('4t')) nameCol = idx;
        else if (cell.includes('ppm') || cell.includes('wpm') || cell.includes('veloc') || cell.includes('oct') || cell.includes('maig')) speedCol = idx;
        else if (cell.includes('errad') || cell.includes('mecanic') || cell.includes('ritme') || cell.includes('observaci')) errorsCol = idx;
        else if (cell.includes('comp') || cell.includes('decatip')) compCol = idx;
      });
      break;
    }
  }

  const startRow = headerRowIdx >= 0 ? headerRowIdx + 1 : 0;

  for (let r = startRow; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const rowText = row.map(c => String(c || '').toLowerCase()).join(' ');
    if (rowText.includes('castellà') || rowText.includes('castellano') || rowText.includes('cast.')) {
      currentLanguage = 'cast';
      continue;
    }
    if (rowText.includes('català') || rowText.includes('catalan') || rowText.includes('cat.')) {
      currentLanguage = 'cat';
      continue;
    }

    const rawName = String(row[nameCol] || '').trim();
    if (!rawName || rawName.startsWith('--') || rawName.toLowerCase().includes('total')) continue;

    // Detectar WPM
    let wpm = 0;
    const rawSpeed = row[speedCol];
    if (typeof rawSpeed === 'number') {
      wpm = Math.round(rawSpeed);
    } else if (rawSpeed) {
      const match = String(rawSpeed).match(/\b(\d{2,3})\b/);
      if (match) wpm = parseInt(match[1], 10);
    }

    if (wpm === 0) {
      for (let c = 0; c < row.length; c++) {
        if (c === nameCol) continue;
        const val = row[c];
        const match = String(val || '').match(/\b(\d{2,3})\b/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num >= 20 && num <= 250) {
            wpm = num;
            break;
          }
        }
      }
    }

    const rawErrors = String(row[errorsCol] || '').trim();
    const rawComp = String(row[compCol] || '').trim();
    const level = calculateReadingLevel(wpm);

    const key = normalizeStudentKey(rawName);
    if (!key) continue;

    let lang = currentLanguage;
    const existing = recordsMap.get(key);
    if (existing && existing.cat && !existing.cast && lang === 'cat') {
      lang = 'cast'; // Auto-switch to cast if second table block for same student
    }

    const subRecord: ReadingSubRecord = {
      wpm,
      levelTag: level.tag,
      levelNumber: level.level,
      errors: rawErrors,
      comp: rawComp,
      date: defaultDate
    };

    if (!existing) {
      recordsMap.set(key, {
        name: parseStudentName(rawName),
        rawName,
        wpm: lang === 'cat' ? wpm : 0,
        levelTag: lang === 'cat' ? level.tag : '',
        levelNumber: lang === 'cat' ? level.level : 0,
        errors: lang === 'cat' ? rawErrors : '',
        comp: lang === 'cat' ? rawComp : '',
        date: defaultDate,
        cat: lang === 'cat' ? subRecord : undefined,
        cast: lang === 'cast' ? subRecord : undefined
      });
    } else {
      if (lang === 'cast') {
        existing.cast = subRecord;
        if (!existing.cat || existing.wpm === 0) {
          existing.wpm = wpm;
          existing.levelTag = level.tag;
          existing.levelNumber = level.level;
          existing.errors = rawErrors;
          existing.comp = rawComp;
        }
      } else {
        existing.cat = subRecord;
        existing.wpm = wpm;
        existing.levelTag = level.tag;
        existing.levelNumber = level.level;
        existing.errors = rawErrors;
        existing.comp = rawComp;
      }
    }
  }

  return Array.from(recordsMap.values());
}

/**
 * Parser de contingut de text pla o extret de PDF per a registres de velocitat lectora (Català i Castellà)
 */
export function parseReadingPlainText(text: string): ParsedReadingRecord[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const recordsMap = new Map<string, ParsedReadingRecord>();
  let currentLanguage: 'cat' | 'cast' = 'cat';

  const compTriggers = [
    'comprèn', 'comprensió', 'excel.lent', 'excel·lent', 'poca comprensió',
    'ha entès', 'ha entes', 's’ha inventat', "s'ha inventat", 'idea general'
  ];

  const knownNonNameStarts = [
    'mala', 'bones', 'bon', 'ritme', 'fa', 'omet', 'algunes', 's’encalla', "s'encalla",
    'llegeix', 'conforme', 'va', 'dificultat', 'canvia', 'no', 'fluïdesa', 'comprèn',
    'comprensió', 'ha entès', 'ha entes', 'poca', 'excel.lent', 'excel·lent', 'segurament'
  ];

  const extractCandidateName = (lineStr: string): string | null => {
    const parts = lineStr.split(/[\t\d]/);
    const candidate = parts[0].trim();
    if (!candidate || candidate.length < 2) return null;
    const lower = candidate.toLowerCase();
    if (knownNonNameStarts.some(k => lower.startsWith(k))) return null;
    if (candidate.includes('.') || candidate.includes(',') || candidate.includes('(')) return null;
    if (/^[A-ZÀ-ÿ][a-zà-ÿ]+(\s+[A-ZÀ-ÿ][a-zà-ÿ]+)*$/.test(candidate)) {
      return candidate;
    }
    return null;
  };

  let currentRecord: { name: string; rawName: string; wpm: number; errors: string; comp: string; date: string } | null = null;
  let currentSection: 'errors' | 'comp' = 'errors';

  const pushCurrentRecord = () => {
    if (!currentRecord || !currentRecord.name) return;
    const key = normalizeStudentKey(currentRecord.name);
    if (!key) return;

    const level = calculateReadingLevel(currentRecord.wpm || 0);
    const subRecord: ReadingSubRecord = {
      wpm: currentRecord.wpm || 0,
      levelTag: level.tag,
      levelNumber: level.level,
      errors: (currentRecord.errors || '').trim(),
      comp: (currentRecord.comp || '').trim(),
      date: currentRecord.date || "oct' 26"
    };

    let lang = currentLanguage;
    const existing = recordsMap.get(key);
    if (existing && existing.cat && !existing.cast && lang === 'cat') {
      lang = 'cast';
    }

    if (!existing) {
      recordsMap.set(key, {
        name: parseStudentName(currentRecord.name),
        rawName: currentRecord.rawName || currentRecord.name,
        wpm: lang === 'cat' ? currentRecord.wpm : 0,
        levelTag: lang === 'cat' ? level.tag : '',
        levelNumber: lang === 'cat' ? level.level : 0,
        errors: lang === 'cat' ? (currentRecord.errors || '') : '',
        comp: lang === 'cat' ? (currentRecord.comp || '') : '',
        date: currentRecord.date || "oct' 26",
        cat: lang === 'cat' ? subRecord : undefined,
        cast: lang === 'cast' ? subRecord : undefined
      });
    } else {
      if (lang === 'cast') {
        existing.cast = subRecord;
        if (!existing.cat || existing.wpm === 0) {
          existing.wpm = currentRecord.wpm || 0;
          existing.levelTag = level.tag;
          existing.levelNumber = level.level;
          existing.errors = (currentRecord.errors || '').trim();
          existing.comp = (currentRecord.comp || '').trim();
        }
      } else {
        existing.cat = subRecord;
        existing.wpm = currentRecord.wpm || 0;
        existing.levelTag = level.tag;
        existing.levelNumber = level.level;
        existing.errors = (currentRecord.errors || '').trim();
        existing.comp = (currentRecord.comp || '').trim();
      }
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();

    if (lowerLine.includes('castellà') || lowerLine.includes('castellano') || lowerLine.includes('cast.')) {
      pushCurrentRecord();
      currentRecord = null;
      currentLanguage = 'cast';
      continue;
    }
    if (lowerLine.includes('català') || lowerLine.includes('catalan') || lowerLine.includes('cat.')) {
      pushCurrentRecord();
      currentRecord = null;
      currentLanguage = 'cat';
      continue;
    }

    if (
      line.startsWith('--') ||
      line.includes('4t B') ||
      line.includes('oct’') ||
      line.includes('maig') ||
      line.includes('113-132') ||
      line.includes('114-133')
    ) {
      continue;
    }

    const candName = extractCandidateName(line);
    if (candName) {
      pushCurrentRecord();

      const afterName = line.slice(candName.length).trim();
      const numMatch = afterName.match(/\b(\d{2,3})\b/);
      let wpm = 0;
      let remainder = afterName;

      if (numMatch) {
        wpm = parseInt(numMatch[1], 10);
        const splitIdx = afterName.indexOf(numMatch[1]);
        remainder = afterName.slice(splitIdx + numMatch[1].length).trim();
      }

      let errorsPart = remainder;
      let compPart = '';
      if (remainder.includes('\t')) {
        const parts = remainder.split('\t').map(p => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          errorsPart = parts[0];
          compPart = parts.slice(1).join(' ');
        }
      } else {
        for (const trigger of compTriggers) {
          const idx = remainder.toLowerCase().indexOf(trigger);
          if (idx > 0) {
            errorsPart = remainder.slice(0, idx).trim();
            compPart = remainder.slice(idx).trim();
            break;
          }
        }
      }

      currentRecord = {
        name: candName,
        rawName: candName,
        wpm,
        errors: errorsPart,
        comp: compPart,
        date: "oct' 26"
      };
      currentSection = compPart ? 'comp' : 'errors';
      continue;
    }

    if (!currentRecord) continue;

    const numOnlyMatch = line.match(/^(\d{2,3})([\s\t]+(.*))?$/);
    if (numOnlyMatch && (!currentRecord.wpm || currentRecord.wpm === 0)) {
      currentRecord.wpm = parseInt(numOnlyMatch[1], 10);
      if (numOnlyMatch[3]) {
        currentRecord.errors = ((currentRecord.errors || '') + ' ' + numOnlyMatch[3]).trim();
      }
      continue;
    }

    const isCompStart = compTriggers.some(t => lowerLine.includes(t));
    if (isCompStart && !currentRecord.comp) {
      currentSection = 'comp';
      currentRecord.comp = line;
      continue;
    }

    if (currentSection === 'comp') {
      currentRecord.comp = ((currentRecord.comp || '') + ' ' + line).trim();
    } else {
      currentRecord.errors = ((currentRecord.errors || '') + ' ' + line).trim();
    }
  }

  pushCurrentRecord();

  return Array.from(recordsMap.values());
}

/**
 * Converteix un fitxer (File o ArrayBuffer) a base64 i crida l'API unificada del servidor.
 * Suporta .docx (Word), .pdf, .xlsx, .xls, .csv.
 */
export async function parseReadingDocument(file: File): Promise<ParseReadingResult> {
  const fileName = file.name;
  const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();

  const arrayBuffer = await file.arrayBuffer();
  let base64 = '';
  const bytes = new Uint8Array(arrayBuffer);
  const len = bytes.byteLength;
  const chunkSize = 8192;
  const chunks: string[] = [];
  for (let i = 0; i < len; i += chunkSize) {
    const sub = bytes.subarray(i, Math.min(i + chunkSize, len));
    chunks.push(String.fromCharCode.apply(null, sub as any));
  }
  base64 = btoa(chunks.join(''));

  try {
    const res = await fetch('/api/reading-register/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName,
        base64
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.records && data.records.length > 0) {
        return {
          records: data.records,
          count: data.records.length,
          summaryMessage: `S'han importat amb èxit les dades de velocitat lectora de ${data.records.length} alumnes (en català i castellà) des de ${fileName}.`
        };
      }
    }
  } catch (err) {
    console.warn("L'API del servidor no ha pogut processar el fitxer, provant fallback client:", err);
  }

  if (['.xlsx', '.xls', '.csv'].includes(ext)) {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    const records = parseReadingRows(rows);
    return {
      records,
      count: records.length,
      summaryMessage: `S'han importat amb èxit ${records.length} registres de lectura (en català i castellà) des de ${fileName}.`
    };
  }

  throw new Error(`No s'ha pogut processar el fitxer ${fileName}. Assegura't que és un fitxer Word (.docx), PDF o Excel (.xlsx, .csv).`);
}
