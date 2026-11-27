import type { Table } from 'dexie';
import { db, type SessionDocument } from './db';
import { withSharedStudentPhotos } from '../services/studentMemberships';
import { normalizeSavedReportVocabulary } from '../../core/utils/reportVocabulary.js';

const extraTables = ['classes', 'classroomEvidence', 'dojoSummaries', 'sessionDocuments'] as const;
type ExtraTable = typeof extraTables[number];
type ExtraData = Record<ExtraTable, Array<Record<string, unknown>>>;
const preferenceKeys = new Set([
  'evaluo_trimester', 'evaluo_tab_order', 'evaluo_drive_folder_id',
  'evaluo_classroom_layouts', 'evaluo_classroom_history', 'pedagogic_rubrics_data',
  'pedagogic_snippets', 'custom_recommendations',
]);
const isPreference = (key: string) => preferenceKeys.has(key) || key.startsWith('evaluo_pe_clothing_');

function readPreferences() {
  const preferences: Record<string, string> = {};
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (key && isPreference(key)) {
      const value = localStorage.getItem(key);
      if (value !== null) preferences[key] = value;
    }
  }
  return preferences;
}

function writePreferences(preferences: Record<string, string>) {
  for (const key of Object.keys(readPreferences())) {
    if (!(key in preferences)) localStorage.removeItem(key);
  }
  for (const [key, value] of Object.entries(preferences)) localStorage.setItem(key, value);
}

const pendingArchives = new Set<Promise<void>>();

function readDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function archiveSessionDocument(file: File, source: string) {
  const pending = readDataUrl(file).then(async dataUrl => {
    const document: SessionDocument = {
      id: crypto.randomUUID(), name: file.name, type: file.type, source,
      importedAt: new Date().toISOString(), base64: dataUrl.slice(dataUrl.indexOf(',') + 1),
    };
    await db.sessionDocuments.add(document);
  });
  pendingArchives.add(pending);
  const settled = () => { pendingArchives.delete(pending); };
  void pending.then(settled, settled);
  return pending;
}

export async function exportSession(groups: { id: string; name: string }[]) {
  await Promise.all(pendingArchives);
  const snapshot = await db.transaction('r', [db.students, ...extraTables.map(name => db[name])], async () => {
    const [students, classes, classroomEvidence, dojoSummaries, sessionDocuments] = await Promise.all([
      db.students.toArray(), db.classes.toArray(), db.classroomEvidence.toArray(),
      db.dojoSummaries.toArray(), db.sessionDocuments.toArray(),
    ]);
    return {
      version: 2, exportDate: new Date().toISOString(), students, groups,
      tables: { classes, classroomEvidence, dojoSummaries, sessionDocuments },
      preferences: readPreferences(),
    };
  });
  const photos = new Map<string, Promise<string | null>>();
  const students = await Promise.all(withSharedStudentPhotos(snapshot.students, groups).map(async student => {
    const photoUrl = student.info.photoUrl;
    if (!photoUrl?.startsWith('blob:')) return student;
    if (!photos.has(photoUrl)) {
      photos.set(photoUrl, fetch(photoUrl).then(response => {
        if (!response.ok) throw new Error();
        return response.blob();
      }).then(readDataUrl).catch(() => null));
    }
    const embedded = await photos.get(photoUrl);
    return embedded ? { ...student, info: { ...student.info, photoUrl: embedded } } : student;
  }));
  return {
    ...snapshot,
    students: students.map(normalizeSavedReportVocabulary),
    unavailablePhotos: students.filter(student => student.info.photoUrl?.startsWith('blob:')).length,
  };
}

export function parseSessionExtras(data: any) {
  if (data?.version === undefined || data.version === 1) return;
  if (data.version !== 2 || !data.tables || !data.preferences || Array.isArray(data.preferences) ||
      typeof data.preferences !== 'object') throw new Error('Versió o format de còpia no compatible.');
  const tables = {} as ExtraData;
  for (const name of extraTables) {
    const rows = data.tables[name];
    if (!Array.isArray(rows) || rows.some(row => !row || typeof row !== 'object' ||
        (name === 'classes' ? typeof row.id !== 'number' : typeof row.id !== 'string') ||
        (name === 'sessionDocuments' && (typeof row.name !== 'string' ||
          typeof row.base64 !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(row.base64) || row.base64.length % 4 !== 0)))) {
      throw new Error(`Dades no vàlides a ${name}.`);
    }
    tables[name] = rows;
  }
  const preferences = Object.fromEntries(Object.entries(data.preferences).filter(([key, value]) =>
    isPreference(key) && typeof value === 'string')) as Record<string, string>;
  return { tables, preferences };
}

export async function restoreSession(students: any[], groups: unknown[], extras?: ReturnType<typeof parseSessionExtras>) {
  await Promise.all(pendingArchives);
  const oldPreferences = readPreferences();
  const oldGroups = localStorage.getItem('evaluo_groups');
  let writingPreferences = false;
  try {
    await db.transaction('rw', [db.students, ...(extras ? extraTables.map(name => db[name]) : [])], async () => {
      await db.students.clear();
      await db.students.bulkAdd(students);
      if (extras) {
        for (const name of extraTables) {
          const table: Table = db[name];
          await table.clear();
          await table.bulkAdd(extras.tables[name]);
        }
      }
      writingPreferences = true;
      if (extras) writePreferences(extras.preferences);
      localStorage.setItem('evaluo_groups', JSON.stringify(groups));
    });
  } catch (error) {
    if (writingPreferences) {
      writePreferences(oldPreferences);
      if (oldGroups === null) localStorage.removeItem('evaluo_groups');
      else localStorage.setItem('evaluo_groups', oldGroups);
    }
    throw error;
  }
}
