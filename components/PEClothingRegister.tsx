import React, { useState } from 'react';
import type { PhotoCrop } from '../types';
import { clothingEvidence, clothingTotals, type ClothingMark, type ClothingSession } from '../infrastructure/services/peClothing';
import { StudentPortrait } from './StudentPortrait';

type Pupil = { id: string | number; info: { name: string; photoUrl?: string; photoCrop?: PhotoCrop } };
type Register = { sessions: ClothingSession[]; regular: number; occasional: number };

interface RegisterProps {
  groupId: string;
  pupils: Pupil[];
  trimester: number;
  rubricAvailable: boolean;
  onApply: (entries: { id: string; text: string }[]) => Promise<void>;
}

export function PEClothingRegister({ groupId, pupils, trimester, rubricAvailable, onApply }: RegisterProps) {
  const key = 'evaluo_pe_clothing_' + groupId;
  const [register, setRegister] = useState<Register>(() => {
    try { return JSON.parse(localStorage.getItem(key) || 'null') || { sessions: [], regular: 80, occasional: 50 }; }
    catch { return { sessions: [], regular: 80, occasional: 50 }; }
  });
  const [date, setDate] = useState(() => new Date().toLocaleDateString('sv-SE'));
  const [overrides, setOverrides] = useState<Record<string, ClothingMark>>({});
  const [previousMarks, setPreviousMarks] = useState<Record<string, 'yes' | 'no'>>({});
  const [summary, setSummary] = useState(false);
  const [selected, setSelected] = useState<string[] | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const sessions = register.sessions.filter(session => session.trimester === trimester);
  const saved = sessions.find(session => session.date === date);
  const markOf = (id: string) => overrides[id] ?? saved?.marks[id] ?? (saved ? 'absent' : 'yes');
  const suggestions = pupils.map(pupil => {
    const id = String(pupil.id);
    const totals = clothingTotals(sessions, id);
    return { id, name: pupil.info.name, totals, text: clothingEvidence(totals, register.regular, register.occasional) };
  });
  const applicable = suggestions.filter(item => item.text && (selected === null || selected.includes(item.id)));

  function store(next: Register, success: string) {
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setRegister(next);
      setMessage(success);
      return true;
    } catch {
      setMessage('No s’ha pogut desar el registre al navegador.');
      return false;
    }
  }

  function saveSession() {
    if (!date || !pupils.length) return;
    const marks = { ...saved?.marks };
    for (const pupil of pupils) marks[String(pupil.id)] = markOf(String(pupil.id));
    const session = { date, trimester, marks };
    const kept = register.sessions.filter(item => item.date !== date || item.trimester !== trimester);
    if (store({ ...register, sessions: [...kept, session] }, 'Sessió desada.')) setOverrides({});
  }

  function toggle(id: string, mark: ClothingMark) {
    setOverrides(previous => ({ ...previous, [id]: mark }));
    setMessage('');
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-warm-200 bg-white p-4">
        <div>
          <h3 className="font-semibold">Roba i canvi · Educació Física</h3>
          <p className="text-sm text-slate-600">Marca les excepcions i desa la sessió. Totes les marques comencen en Sí.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {!summary && <label className="grid gap-1 text-sm">Data de la sessió
            <input type="date" value={date} onChange={event => {
              setDate(event.target.value);
              setOverrides({});
              setPreviousMarks({});
              setMessage('');
            }} className="rounded-lg border border-warm-200 p-2" />
          </label>}
          <button type="button" aria-pressed={summary} onClick={() => { setSummary(!summary); setMessage(''); }}
            className="rounded-lg border border-warm-200 px-3 py-2 text-sm font-semibold">
            {summary ? 'Torna al registre' : 'Resum i rúbrica'}
          </button>
          {!summary && <button type="button" disabled={!pupils.length || !date} onClick={saveSession}
            className="rounded-lg bg-primary-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">
            Desa la sessió
          </button>}
        </div>
      </div>
      {message && <p role="status" className="rounded-lg bg-white p-3 text-sm">{message}</p>}
      {!summary ? (
        <>
          <p className="text-sm text-slate-600">{saved ? 'Sessió desada per a aquesta data.' : 'Sessió encara sense desar.'} · {sessions.length} sessions al trimestre.</p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(154px,1fr))] gap-3">
            {pupils.map(pupil => {
              const id = String(pupil.id);
              const mark = markOf(id);
              return (
                <article key={id} className="rounded-xl border border-warm-200 bg-white p-2.5">
                  <div className="mb-2 flex items-center gap-2">
                    {pupil.info.photoUrl && <StudentPortrait src={pupil.info.photoUrl} name={pupil.info.name} crop={pupil.info.photoCrop} size="h-10 w-10" thumbnail />}
                    <span className="text-sm font-semibold">{pupil.info.name}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button type="button" aria-label={`${pupil.info.name}: ${mark === 'absent' ? 'Absent' : mark === 'no' ? 'No' : 'Sí'}`} disabled={mark === 'absent'}
                      onClick={() => toggle(id, mark === 'yes' ? 'no' : 'yes')}
                      className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-bold disabled:bg-slate-100 disabled:text-slate-400 ${mark === 'no' ? 'bg-rose-100 text-rose-900' : 'bg-emerald-100 text-emerald-900'}`}>
                      {mark === 'absent' ? '—' : mark === 'no' ? 'No' : 'Sí'}
                    </button>
                    <button type="button" aria-pressed={mark === 'absent'} onClick={() => {
                      if (mark !== 'absent') setPreviousMarks(previous => ({ ...previous, [id]: mark }));
                      toggle(id, mark === 'absent' ? previousMarks[id] || 'yes' : 'absent');
                    }}
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold aria-pressed:bg-slate-700 aria-pressed:text-white">
                      Absent
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      ) : (
        <div className="space-y-3 rounded-2xl border border-warm-200 bg-white p-4">
          <p className="text-sm text-slate-600">Es compten les sessions desades amb assistència. Calen almenys 3 sessions per suggerir una frase.</p>
          <div className="flex flex-wrap items-center gap-4">
            <label className="text-sm">Habitual a partir de{' '}
              <input type="number" min={register.occasional} max={100} value={register.regular}
                onChange={event => {
                  const regular = event.currentTarget.valueAsNumber;
                  if (regular >= register.occasional && regular <= 100) store({ ...register, regular }, 'Criteri desat.');
                }} className="w-16 rounded border p-1" /> %
            </label>
            <label className="text-sm">Irregular a partir de{' '}
              <input type="number" min={0} max={register.regular} value={register.occasional}
                onChange={event => {
                  const occasional = event.currentTarget.valueAsNumber;
                  if (occasional >= 0 && occasional <= register.regular) store({ ...register, occasional }, 'Criteri desat.');
                }} className="w-16 rounded border p-1" /> %
            </label>
          </div>
          <ul className="divide-y divide-warm-100">
            {suggestions.map(item => <li key={item.id} className="py-2">
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" disabled={!item.text || busy}
                  checked={Boolean(item.text) && (selected === null || selected.includes(item.id))}
                  onChange={event => {
                    const current = selected ?? suggestions.filter(candidate => candidate.text).map(candidate => candidate.id);
                    setSelected(event.currentTarget.checked ? [...current, item.id] : current.filter(id => id !== item.id));
                  }} />
                <span><strong>{item.name}</strong> · {item.totals.yes}/{item.totals.attended}
                  <span className="block text-slate-600">{item.text || 'Encara no hi ha prou sessions.'}</span>
                </span>
              </label>
            </li>)}
          </ul>
          {!rubricAvailable && <p className="text-sm text-slate-600">La rúbrica d’EF no és al trimestre seleccionat.</p>}
          <button type="button" disabled={!applicable.length || !rubricAvailable || busy}
            onClick={async () => {
              setBusy(true);
              try { await onApply(applicable); setMessage(`S’han incorporat ${applicable.length} resums a Hàbits i autonomia.`); }
              catch { setMessage('No s’han pogut incorporar tots els resums. Torna-ho a provar.'); }
              finally { setBusy(false); }
            }} className="rounded-lg bg-primary-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
            Incorpora a la rúbrica
          </button>
        </div>
      )}
    </section>
  );
}
