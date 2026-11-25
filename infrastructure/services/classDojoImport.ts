import type { ClassroomEvidence } from '../storage/db';

export const dojoFields = [
  { key: 'name', label: 'Alumne', aliases: ['student', 'student name', 'name', 'nombre del alumno', 'alumne', 'nom'] },
  { key: 'date', label: 'Data o data i hora', aliases: ['date', 'date and time', 'timestamp', 'date awarded', 'fecha', 'data'] },
  { key: 'label', label: 'Habilitat o motiu', aliases: ['skill', 'skill name', 'feedback', 'reason', 'habilidad', 'habilitat', 'motivo'] },
  { key: 'points', label: 'Punts', aliases: ['points', 'point value', 'puntos', 'punts'] },
] as const;

export type DojoColumns = Record<typeof dojoFields[number]['key'], number>;
export type DojoPupil = { id: string; name: string };

export function normalizeDojoName(value: string) {
  return value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

export function guessDojoColumns(headers: string[]): DojoColumns {
  return {
    name: find('name'), date: find('date'), label: find('label'), points: find('points'),
  };
  function find(key: keyof DojoColumns) {
    const aliases: readonly string[] = dojoFields.find(field => field.key === key)!.aliases;
    return headers.findIndex(header => aliases.includes(normalizeDojoName(header)));
  }
}

export function reviewDojoRows(rows: string[][], columns: DojoColumns, pupils: DojoPupil[], groupId: string,
  choices: Record<number, string>, existing: Set<string>) {
  const occurrences = new Map<string, number>();
  return rows.map((row, index) => {
    const name = row[columns.name]?.trim() || '';
    const date = row[columns.date]?.trim() || '';
    const label = row[columns.label]?.trim() || '';
    const rawPoints = row[columns.points]?.trim() || '';
    const points = Number(rawPoints.replace('−', '-'));
    const candidates = pupils.filter(pupil => normalizeDojoName(pupil.name) === normalizeDojoName(name));
    const pupilId = choices[index] ?? (candidates.length === 1 ? candidates[0].id : '');
    const valid = Boolean(name && date && label && rawPoints && Number.isInteger(points));
    let record: ClassroomEvidence | undefined;
    if (valid && pupilId) {
      const key = JSON.stringify([groupId, pupilId, date, normalizeDojoName(label), points]);
      const occurrence = (occurrences.get(key) || 0) + 1;
      occurrences.set(key, occurrence);
      record = { id: 'dojo:' + key + ':' + occurrence, groupId, pupilId, date, label, points, source: 'classdojo' };
    }
    return { index, name, date, label, points, candidates, pupilId, valid, record,
      duplicate: Boolean(record && existing.has(record.id)) };
  });
}
