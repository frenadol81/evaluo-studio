import { normalizeDojoName, type DojoPupil } from './classDojoImport';

type Category = { label: string; weight: number; count: number };
type Metric = { label: string; value: string };
export type DojoSummaryRow = { name: string; categories: Category[]; metrics: Metric[]; valid: boolean };
export type DojoSummary = Omit<DojoSummaryRow, 'name' | 'valid'> & {
  id: string; groupId: string; pupilId: string; start: string; end: string;
};

export function parseDojoSummary(rows: string[][]) {
  const [headers = [], ...body] = rows;
  const nameColumn = headers.findIndex(header =>
    ['estudiante', 'alumno', 'alumne', 'student', 'student name', 'nombre del estudiante', 'nom de l alumne'].includes(normalizeDojoName(header)));
  const categories = headers.flatMap((header, index) => {
    const match = header.match(/^(.+?)\s*\(\s*([+−-]?\d+)\s*\)\s*$/u);
    return match ? [{ index, label: match[1].trim(), weight: Number(match[2].replace('−', '-')) }] : [];
  });
  if (nameColumn < 0 || !categories.length) return null;
  const categoryColumns = new Set(categories.map(category => category.index));
  return body.flatMap((row): DojoSummaryRow[] => {
    const name = row[nameColumn]?.trim();
    if (!name) return [];
    const values = categories.map(({ index, label, weight }) => ({
      label, weight, count: Number(row[index]?.trim() || '0'),
    }));
    const metrics = headers.flatMap((label, index) => {
      const value = row[index]?.trim();
      return index !== nameColumn && label.trim() && value && !categoryColumns.has(index) ? [{ label: label.trim(), value }] : [];
    });
    return [{ name, categories: values, metrics,
      valid: values.every(({ count, weight }) => Number.isSafeInteger(count) && count >= 0 && Number.isSafeInteger(weight)) }];
  });
}

export function dojoPeriod(filename: string) {
  const match = filename.match(/_(\d{1,2})_(\d{1,2})_(\d{4})_(\d{1,2})_(\d{1,2})_(\d{4})\.[^.]+$/);
  if (!match) return { start: '', end: '' };
  return { start: date(match[1], match[2], match[3]), end: date(match[4], match[5], match[6]) };
}

function date(day: string, month: string, year: string) {
  const iso = [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
  const parsed = new Date(iso);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === iso ? iso : '';
}

export function matchDojoSummary(rows: DojoSummaryRow[], pupils: DojoPupil[], choices: Record<number, string>) {
  const reviewed = rows.map((row, index) => {
    const candidates = pupils.filter(person => normalizeDojoName(person.name) === normalizeDojoName(row.name));
    return { ...row, index, candidates, pupilId: choices[index] ?? (candidates.length === 1 ? candidates[0].id : '') };
  });
  const counts = new Map<string, number>();
  for (const { pupilId, valid } of reviewed) {
    if (valid && pupilId) counts.set(pupilId, (counts.get(pupilId) || 0) + 1);
  }
  return reviewed.map(row => ({ ...row, repeated: (counts.get(row.pupilId) || 0) > 1 }));
}
