import React, { useEffect, useRef, useState } from 'react';
import { liveQuery } from 'dexie';
import * as xlsx from 'xlsx';
import type { PhotoCrop } from '../types';
import { db, type ClassroomEvidence as Evidence } from '../infrastructure/storage/db';
import { dojoFields, guessDojoColumns, reviewDojoRows, type DojoColumns, type DojoPupil } from '../infrastructure/services/classDojoImport';
import { dojoPeriod, matchDojoSummary, parseDojoSummary, type DojoSummary, type DojoSummaryRow } from '../infrastructure/services/classDojoSummary';
import { StudentPortrait } from './StudentPortrait';

type Pupil = DojoPupil & { photoUrl?: string; photoCrop?: PhotoCrop };
const button = 'min-h-10 rounded-lg border border-warm-200 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50';
const primary = 'min-h-10 rounded-lg bg-primary-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50';
const marks = ['Ajuda un company', 'Col·labora', 'Completa la tasca', 'Tasca pendent', 'Cal recordar el material'];

export function ClassroomEvidence({ groupId, groupName, pupils, pupil, onClose }: {
  groupId: string; groupName: string; pupils: Pupil[]; pupil?: Pupil; onClose: () => void;
}) {
  const [records, setRecords] = useState<Evidence[] | null>(null);
  const [lastId, setLastId] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [summaries, setSummaries] = useState<DojoSummary[]>([]);
  const busyRef = useRef(false);
  useEffect(() => {
    const subscription = liveQuery(() => db.classroomEvidence.toArray()).subscribe({
      next: setRecords,
      error: () => { setRecords(null); setStatus('No s’ha pogut obrir el registre d’evidències.'); },
    });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    setSummaries([]);
    if (!pupil) return;
    const subscription = liveQuery(() => db.dojoSummaries.where('pupilId').equals(pupil.id).toArray()).subscribe({
      next: setSummaries,
      error: () => setStatus('No s’han pogut obrir els resums de ClassDojo.'),
    });
    return () => subscription.unsubscribe();
  }, [pupil?.id]);

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
      {importOpen && <DojoPreview groupId={groupId} groupName={groupName} pupils={pupils} records={records} busy={busy} status={status}
        onImportSummary={entries => save(async () => {
          const count = await db.transaction('rw', db.dojoSummaries, async () => {
            const existing = await db.dojoSummaries.bulkGet(entries.map(entry => entry.id));
            const current = entries.filter((entry, index) => !existing[index] || existing[index]!.end <= entry.end);
            if (current.length) await db.dojoSummaries.bulkPut(current);
            return current.length;
          });
          setImportOpen(false);
          return `${count} resums desats · ${entries.length - count} tenien un resum més recent.`;
        })}
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
        {summaries.length > 0 && <section className="mb-4 border-y border-warm-200 py-2">
          <h4 className="font-semibold">Resums de ClassDojo</h4>
          {[...summaries].sort((a, b) => b.end.localeCompare(a.end)).map(summary =>
            <details key={summary.id} className="py-1 text-sm">
              <summary className="cursor-pointer font-medium">
                {summary.start} — {summary.end}{summary.groupId === groupId ? '' : ` · ${summary.groupId}`}
              </summary>
              <ul className="divide-y divide-warm-200">
                {summary.categories.map(({ label, weight, count }, index) =>
                  <li key={index} className="flex justify-between gap-2 py-1">
                    <span>{label} ({weight > 0 ? '+' : ''}{weight})</span><strong>{count}</strong>
                  </li>)}
              </ul>
              {!!summary.metrics.length && <dl className="mt-2 border-t border-warm-200 pt-1 text-slate-600">
                {summary.metrics.map(({ label, value }, index) =>
                  <div key={index} className="flex justify-between gap-2"><dt>{label}</dt><dd>{value}</dd></div>)}
              </dl>}
            </details>)}
        </section>}
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

function DojoPreview({ groupId, groupName, pupils, records, busy, status, onClose, onImport, onImportSummary }: {
  groupId: string; groupName: string; pupils: Pupil[]; records: Evidence[] | null; busy: boolean;
  status: string;
  onClose: () => void; onImport: (entries: Evidence[]) => void;
  onImportSummary: (entries: DojoSummary[]) => void;
}) {
  const [data, setData] = useState<string[][]>([]);
  const [columns, setColumns] = useState<DojoColumns | null>(null);
  const [choices, setChoices] = useState<Record<number, string>>({});
  const [summary, setSummary] = useState<DojoSummaryRow[] | null>(null);
  const [period, setPeriod] = useState({ start: '', end: '' });
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);

  async function read(file: File) {
    setReading(true);
    setData([]);
    setChoices({});
    setColumns(null);
    setSummary(null);
    setError('');
    try {
      if (file.size > 10_000_000) throw new Error();
      const workbook = xlsx.read(await file.arrayBuffer(), { type: 'array' });
      const rows = xlsx.utils.sheet_to_json<string[]>(workbook.Sheets[workbook.SheetNames[0]],
        { header: 1, defval: '', raw: false, blankrows: false });
      if (rows.length < 2) throw new Error();
      const aggregate = parseDojoSummary(rows);
      if (aggregate) {
        setSummary(aggregate);
        setPeriod(dojoPeriod(file.name));
      } else {
        setData(rows);
        setColumns(guessDojoColumns(rows[0]));
      }
    } catch {
      setError('No s’ha pogut llegir el fitxer. Tria un CSV o Excel amb una capçalera i almenys una fila.');
    } finally { setReading(false); }
  }

  const mapped = columns && dojoFields.every(field => columns[field.key] >= 0) && new Set(Object.values(columns)).size === dojoFields.length;
  const rows = mapped ? reviewDojoRows(data.slice(1), columns, pupils, groupId, choices,
    new Set((records || []).map(entry => entry.id))) : [];
  const ready = rows.flatMap(row => row.record && !row.duplicate ? [row.record] : []);
  const duplicate = rows.filter(row => row.duplicate).length;
  const reviewed = summary ? matchDojoSummary(summary, pupils, choices) : [];
  const readySummaries = reviewed.filter(row => row.valid && row.pupilId && !row.repeated);
  const validPeriod = Boolean(period.start && period.end && period.start <= period.end);

  function importSummaries() {
    if (!validPeriod) return;
    onImportSummary(readySummaries.map(({ pupilId, categories, metrics }) => ({
      id: JSON.stringify([groupId, pupilId, period.start]), groupId, pupilId, ...period, categories, metrics,
    })));
  }

  return (
    <dialog ref={dialog} aria-labelledby="dojo-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
      className="m-auto max-h-[90vh] w-[min(46rem,calc(100vw-2rem))] overflow-auto rounded-2xl border border-warm-200 bg-white p-4 text-slate-900 backdrop:bg-slate-900/40">
      <h3 id="dojo-title" className="text-lg font-bold">Importar punts de ClassDojo</h3>
      <p className="mb-3 text-sm">Grup de destinació · <strong>{groupName}</strong></p>
      <label className="grid gap-1 text-sm font-semibold">Fitxer de punts
        <input type="file" accept=".csv,.xlsx,.xls" disabled={busy || reading} className="max-w-full text-sm"
          onChange={event => { const file = event.target.files?.[0]; if (file) void read(file); }} />
      </label>
      {error && <p role="alert" className="mt-2 text-sm text-rose-700">{error}</p>}
      {status && <p role="status" className="mt-2 text-sm">{status}</p>}
      {reading && <p role="status" className="mt-2 text-sm">Llegint el fitxer…</p>}
      {summary && <>
        <div className="my-3 flex flex-wrap gap-3 text-sm">
          <label className="grid gap-1">Inici del període
            <input type="date" value={period.start} disabled={busy} className="rounded border border-warm-200 p-2"
              onChange={event => setPeriod({ ...period, start: event.target.value })} />
          </label>
          <label className="grid gap-1">Final del període
            <input type="date" value={period.end} min={period.start} disabled={busy} className="rounded border border-warm-200 p-2"
              onChange={event => setPeriod({ ...period, end: event.target.value })} />
          </label>
        </div>
        <p className="my-2 text-sm font-semibold">{readySummaries.length} alumnes preparats · {reviewed.length - readySummaries.length} pendents · {summary[0]?.categories.length || 0} categories detectades</p>
        <ul className="max-h-64 divide-y divide-warm-200 overflow-auto border-y border-warm-200 text-sm">
          {reviewed.map(row => <li key={row.index} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span>{row.name}</span>
            {!row.valid ? <span>Recompte no vàlid</span> : row.pupilId && !row.repeated && choices[row.index] === undefined
              ? <span>Coincidència trobada</span>
              : <label className="flex flex-wrap items-center gap-2">{row.repeated ? 'Alumne repetit' : 'Assignació'}
                <select aria-label={`Assignació de ${row.name}`} className="max-w-full rounded border border-warm-200 p-1"
                  disabled={busy} value={row.pupilId} onChange={event => setChoices({ ...choices, [row.index]: event.target.value })}>
                  <option value="">Omet aquesta fila</option>
                  {(row.candidates.length > 1 ? row.candidates : pupils).map(person =>
                    <option key={person.id} value={person.id}>{person.name}</option>)}
                </select>
              </label>}
          </li>)}
        </ul>
      </>}
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
        {summary
          ? <button type="button" className={primary} disabled={busy || reading || !validPeriod || !readySummaries.length}
              onClick={importSummaries}>Importar resums ({readySummaries.length})</button>
          : <button type="button" className={primary} disabled={busy || reading || !records || !ready.length}
              onClick={() => onImport(ready)}>Importar ({ready.length})</button>}
        <button type="button" className={button} disabled={busy} onClick={onClose}>Cancel·lar</button>
      </div>
    </dialog>
  );
}
