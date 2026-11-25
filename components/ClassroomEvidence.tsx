import React, { useEffect, useRef, useState } from 'react';
import { liveQuery } from 'dexie';
import * as xlsx from 'xlsx';
import type { PhotoCrop } from '../types';
import { db, type ClassroomEvidence as Evidence } from '../infrastructure/storage/db';
import { dojoFields, guessDojoColumns, reviewDojoRows, type DojoColumns, type DojoPupil } from '../infrastructure/services/classDojoImport';
import { StudentPortrait } from './StudentPortrait';

type Pupil = DojoPupil & { photoUrl?: string; photoCrop?: PhotoCrop };
const button = 'min-h-10 rounded-lg border border-warm-200 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50';
const primary = 'min-h-10 rounded-lg bg-primary-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50';
const marks = ['Ajuda un company', 'Col·labora', 'Completa la tasca', 'Tasca pendent', 'Cal recordar el material'];

export function ClassroomEvidence({ groupId, pupils, pupil, onClose }: {
  groupId: string; pupils: Pupil[]; pupil?: Pupil; onClose: () => void;
}) {
  const [records, setRecords] = useState<Evidence[] | null>(null);
  const [lastId, setLastId] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  useEffect(() => {
    const subscription = liveQuery(() => db.classroomEvidence.toArray()).subscribe({
      next: setRecords,
      error: () => { setRecords(null); setStatus('No s’ha pogut obrir el registre d’evidències.'); },
    });
    return () => subscription.unsubscribe();
  }, []);

  async function save(action: () => Promise<string>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try { setStatus(await action()); }
    catch { setStatus('No s’ha pogut desar el canvi. Torna-ho a provar.'); }
    finally { busyRef.current = false; setBusy(false); }
  }

  const history = (records || []).filter(entry => entry.pupilId === pupil?.id)
    .sort((first, second) => second.date.localeCompare(first.date));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className={button} onClick={() => setImportOpen(value => !value)} aria-expanded={importOpen}>
        Importar ClassDojo
      </button>
      <span role="status" className="text-sm text-slate-700">{status}</span>
      {importOpen && <DojoPreview groupId={groupId} pupils={pupils} records={records} busy={busy} status={status}
        onClose={() => setImportOpen(false)} onImport={entries => save(async () => {
          const count = await db.transaction('rw', db.classroomEvidence, async () => {
            const existing = await db.classroomEvidence.bulkGet(entries.map(entry => entry.id));
            const pending = entries.filter((_, index) => !existing[index]);
            if (pending.length) await db.classroomEvidence.bulkAdd(pending);
            return pending.length;
          });
          setImportOpen(false);
          return count === 1 ? '1 registre importat.' : `${count} registres importats.`;
        })} />}
      {pupil && <aside aria-label={`Evidències de ${pupil.name}`} className="fixed bottom-4 right-4 z-30 max-h-[75vh] w-[min(25rem,calc(100vw-2rem))] overflow-auto rounded-2xl border border-warm-300 bg-white p-4 shadow-xl">
        <header className="flex items-center gap-3">
          <StudentPortrait src={pupil.photoUrl} crop={pupil.photoCrop} name={pupil.name} size="h-12 w-12" thumbnail />
          <h3 className="min-w-0 flex-1 break-words font-bold">{pupil.name}</h3>
          <button type="button" className={button} onClick={onClose}>Tanca</button>
        </header>
        <div className="my-3 flex flex-wrap gap-2">
          {marks.map(label => <button key={label} type="button" className={button} disabled={busy || !records}
            onClick={() => save(async () => {
              const id = crypto.randomUUID();
              await db.classroomEvidence.add({ id, pupilId: pupil.id, groupId, label, date: new Date().toISOString(), source: 'classroom' });
              setLastId(id);
              return `Evidència desada per a ${pupil.name}.`;
            })}>{label}</button>)}
        </div>
        <h4 className="font-semibold">Evidències recents</h4>
        {!history.length && <p className="text-sm text-slate-600">{records ? 'Encara no hi ha evidències.' : 'Registre no disponible.'}</p>}
        <ul className="divide-y divide-warm-200 text-sm">
          {history.slice(0, 8).map(entry => <li key={entry.id} className="py-2">
            <span className="font-medium">{entry.label}</span>
            <span className="block text-slate-600">
              {entry.source === 'classdojo' ? `ClassDojo · ${entry.points}` : 'Observació d’aula'} · {entry.date.slice(0, entry.source === 'classroom' ? 10 : undefined)}
            </span>
          </li>)}
        </ul>
        {history.some(entry => entry.id === lastId) && <button type="button" className={button} disabled={busy}
          onClick={() => save(async () => {
            await db.classroomEvidence.delete(lastId);
            setLastId('');
            return 'Última anotació desfeta.';
          })}>Desfer l’última anotació</button>}
      </aside>}
    </div>
  );
}

function DojoPreview({ groupId, pupils, records, busy, status, onClose, onImport }: {
  groupId: string; pupils: Pupil[]; records: Evidence[] | null; busy: boolean;
  status: string;
  onClose: () => void; onImport: (entries: Evidence[]) => void;
}) {
  const [data, setData] = useState<string[][]>([]);
  const [columns, setColumns] = useState<DojoColumns | null>(null);
  const [choices, setChoices] = useState<Record<number, string>>({});
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);

  async function read(file: File) {
    setReading(true);
    setData([]);
    setChoices({});
    setColumns(null);
    setError('');
    try {
      if (file.size > 10_000_000) throw new Error();
      const workbook = xlsx.read(await file.arrayBuffer(), { type: 'array' });
      const rows = xlsx.utils.sheet_to_json<string[]>(workbook.Sheets[workbook.SheetNames[0]],
        { header: 1, defval: '', raw: false, blankrows: false });
      if (rows.length < 2) throw new Error();
      setData(rows);
      setColumns(guessDojoColumns(rows[0]));
    } catch {
      setError('No s’ha pogut llegir el fitxer. Tria un CSV o Excel amb una capçalera i almenys una fila.');
    } finally { setReading(false); }
  }

  const mapped = columns && dojoFields.every(field => columns[field.key] >= 0) && new Set(Object.values(columns)).size === dojoFields.length;
  const rows = mapped ? reviewDojoRows(data.slice(1), columns, pupils, groupId, choices,
    new Set((records || []).map(entry => entry.id))) : [];
  const ready = rows.flatMap(row => row.record && !row.duplicate ? [row.record] : []);
  const duplicate = rows.filter(row => row.duplicate).length;

  return (
    <dialog ref={dialog} aria-labelledby="dojo-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
      className="m-auto max-h-[90vh] w-[min(46rem,calc(100vw-2rem))] overflow-auto rounded-2xl border border-warm-200 bg-white p-4 text-slate-900 backdrop:bg-slate-900/40">
      <h3 id="dojo-title" className="text-lg font-bold">Importar punts de ClassDojo</h3>
      <p className="mb-3 text-sm">Tria el fitxer del grup actual. Cada fila ha de tenir alumne, data, motiu i punts.</p>
      <label className="grid gap-1 text-sm font-semibold">Fitxer de punts
        <input type="file" accept=".csv,.xlsx,.xls" disabled={busy || reading} className="max-w-full text-sm"
          onChange={event => { const file = event.target.files?.[0]; if (file) void read(file); }} />
      </label>
      {error && <p role="alert" className="mt-2 text-sm text-rose-700">{error}</p>}
      {status && <p role="status" className="mt-2 text-sm">{status}</p>}
      {reading && <p role="status" className="mt-2 text-sm">Llegint el fitxer…</p>}
      {columns && <div className="my-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {dojoFields.map(field => <label key={field.key} className="grid gap-1 text-sm font-semibold">{field.label}
          <select value={columns[field.key]} disabled={busy} className="w-full rounded border border-warm-200 p-2"
            onChange={event => { setColumns({ ...columns, [field.key]: Number(event.target.value) }); setChoices({}); }}>
            <option value={-1}>Tria la columna</option>
            {data[0].map((header, index) => <option key={index} value={index}>{header || `Columna ${index + 1}`}</option>)}
          </select>
        </label>)}
      </div>}
      {columns && !mapped && <p className="text-sm">Assigna una columna diferent a cada camp per veure els registres.</p>}
      {mapped && <>
        <p role="status" className="my-2 text-sm font-semibold">{ready.length} per importar · {duplicate} duplicats · {rows.length - ready.length - duplicate} pendents o incomplets</p>
        <ul className="max-h-64 divide-y divide-warm-200 overflow-auto border-y border-warm-200 text-sm">
          {rows.map(row => <li key={row.index} className="py-2">
            <p><strong>{row.name || 'Sense nom'}</strong> · {row.label || 'Sense motiu'} · {row.date || 'Sense data'}</p>
            {!row.valid ? 'Fila incompleta o punts no vàlids' : <>
              <span>{row.points} punts · {row.duplicate ? 'Ja importat' : row.pupilId ? 'Preparat' : 'Revisa la coincidència'}</span>
              <select aria-label={`Alumne de la fila ${row.index + 2}: ${row.name}`} value={row.pupilId} disabled={busy}
                className="ml-2 max-w-full rounded border border-warm-200 p-1"
                onChange={event => setChoices({ ...choices, [row.index]: event.target.value })}>
                <option value="">Omet aquesta fila</option>
                {(row.candidates.length > 1 ? row.candidates : pupils).map(person =>
                  <option key={person.id} value={person.id}>{person.name}</option>)}
              </select>
            </>}
          </li>)}
        </ul>
      </>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={primary} disabled={busy || reading || !records || !ready.length}
          onClick={() => onImport(ready)}>Importar ({ready.length})</button>
        <button type="button" className={button} disabled={busy} onClick={onClose}>Cancel·lar</button>
      </div>
    </dialog>
  );
}
