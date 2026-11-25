import React, { useRef, useState } from 'react';
import { Camera, GripVertical, LayoutGrid, Plus, Trash2, Users } from 'lucide-react';
import type { PhotoCrop } from '../types';
import { StudentPortrait } from './StudentPortrait';
import { PEClothingRegister } from './PEClothingRegister';
import { ClassroomEvidence } from './ClassroomEvidence';
import { isPhotoImportFile, readDroppedPhotoFiles, readStudentPhotos } from '../infrastructure/services/studentPhotoImport';
import { studentMemberships } from '../infrastructure/services/studentMemberships';
import { groupingHistory, groupingPairs, proposeGrouping, type SupportRole } from '../infrastructure/services/classroomGrouping';

type Pupil = { id: string | number; groupId?: string; info: {
  name: string; groupId?: string; course?: string; photoUrl?: string; photoCrop?: PhotoCrop; supportRole?: SupportRole;
} };
type Group = { id: string; name: string };
type Desk = { id: string; name: string; capacity: number; pupils: string[]; x?: number; y?: number; locked?: boolean };
type Layout = { id: string; name: string; desks: Desk[] };
type Layouts = Record<string, Layout[]>;
type Snapshot = { id: string; name: string; date: string; desks: Desk[] };
type History = Record<string, Snapshot[]>;

const storageKey = 'evaluo_classroom_layouts';
const historyKey = 'evaluo_classroom_history';
const defaultCrop: PhotoCrop = { x: 50, y: 0, zoom: 1.25 };
const supportRoles: { value: SupportRole; label: string; color: string; dot: string }[] = [
  { value: 'needs-support', label: 'Necessita suport', color: 'border-amber-300 bg-amber-50 text-amber-950', dot: 'bg-amber-500' },
  { value: 'independent', label: 'Autònom', color: 'border-indigo-300 bg-indigo-50 text-indigo-950', dot: 'bg-indigo-500' },
  { value: 'can-help', label: 'Pot donar suport', color: 'border-teal-300 bg-teal-50 text-teal-950', dot: 'bg-teal-600' },
];

function readLayouts(): Layouts {
  try { return JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; }
  catch { return {}; }
}

interface ClassroomStudioProps {
  students: Pupil[];
  groups: Group[];
  activeGroupId: string;
  trimester: number;
  peRubricAvailable: boolean;
  onApplyPEEvidence: (entries: { id: string; text: string }[]) => Promise<void>;
  onImportPhotos: () => void;
  onImportFiles: (files: File[], groupId: string) => Promise<void>;
  onUpdateSupportRole: (id: string, role?: SupportRole) => Promise<unknown>;
  onUpdatePhoto: (id: string, photo: { photoUrl?: string; photoCrop?: PhotoCrop }) => Promise<unknown>;
}

export function ClassroomStudio({ students, groups, activeGroupId, trimester, peRubricAvailable, onApplyPEEvidence, onImportPhotos, onImportFiles, onUpdatePhoto, onUpdateSupportRole }: ClassroomStudioProps) {
  const [tab, setTab] = useState<'pupils' | 'desks' | 'support' | 'pe'>('pupils');
  const [pickedPupil, setPickedPupil] = useState('');
  const [deskMode, setDeskMode] = useState<'organize' | 'evaluate'>('organize');
  const [evidencePupilId, setEvidencePupilId] = useState('');
  const [deskSettings, setDeskSettings] = useState('');
  const [groupChoice, setGroupChoice] = useState(activeGroupId);
  const [layouts, setLayouts] = useState(readLayouts);
  const [history, setHistory] = useState<History>(() => {
    try { return JSON.parse(localStorage.getItem(historyKey) || '{}') || {}; }
    catch { return {}; }
  });
  const [snapshotChoice, setSnapshotChoice] = useState('');
  const [snapshotDate, setSnapshotDate] = useState(() => new Date().toLocaleDateString('sv-SE'));
  const [layoutChoice, setLayoutChoice] = useState('');
  const [newName, setNewName] = useState('');
  const [selectedPupil, setSelectedPupil] = useState('');
  const [draft, setDraft] = useState<PhotoCrop | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const drag = useRef<{ x: number; y: number; crop: PhotoCrop } | null>(null);
  const folderPicker = useRef<HTMLInputElement>(null);
  const cameraPicker = useRef<HTMLInputElement>(null);
  const deskDrag = useRef<{ id: string; x: number; y: number } | null>(null);

  const groupId = groups.some(group => group.id === groupChoice) ? groupChoice : groups[0]?.id || '';
  const pupils = students.filter(student => (student.info.groupId || student.groupId) === groupId);
  const [onlyWithoutPhoto, setOnlyWithoutPhoto] = useState(false);
  const pupilsWithoutPhoto = pupils.filter(student => !student.info.photoUrl);
  const byId = new Map(pupils.map(pupil => [String(pupil.id), pupil]));
  const pupil = byId.get(selectedPupil);
  const identities = React.useMemo(() => studentMemberships(students, groups), [students, groups]);
  const linkedGroups = pupil ? students.filter(student => String(student.id) !== selectedPupil &&
    identities.get(String(student.id)) === identities.get(selectedPupil))
    .map(student => groups.find(group => group.id === (student.info.groupId || student.groupId))?.name)
    .filter(Boolean) : [];
  const crop = draft || pupil?.info.photoCrop || defaultCrop;
  const groupLayouts = layouts[groupId] || [];
  const layout = groupLayouts.find(item => item.id === layoutChoice) || groupLayouts[0];
  const desks = layout?.desks || [];
  const seated = new Set(desks.flatMap(desk => desk.pupils));
  const unassigned = pupils.filter(student => !seated.has(String(student.id)));
  const snapshots = history[groupId] || [];
  const pastTables = snapshots.map(snapshot => snapshot.desks.map(desk => desk.pupils));
  const getPairHistory = groupingHistory(pastTables);
  const currentPairs = groupingPairs(desks.map(desk => desk.pupils.filter(id => byId.has(id))), getPairHistory);
  const repeated = currentPairs.filter(pair => pair.count > 0).sort((a, b) => b.rate - a.rate || b.count - a.count);
  const unclassified = pupils.filter(student => !student.info.supportRole).length;
  const evaluating = deskMode === 'evaluate';

  function writeLayouts(next: Layouts) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setLayouts(next);
      return true;
    } catch {
      setMessage('No s’ha pogut desar la distribució al navegador.');
      return false;
    }
  }

  function createLayout(tableCount: number) {
    const id = crypto.randomUUID();
    const desks = Array.from({ length: tableCount }, (_, index) => ({
      id: crypto.randomUUID(), name: `Taula ${index + 1}`, capacity: 4, pupils: [],
    }));
    const name = newName.trim() || (tableCount ? `${tableCount} taules de 4` : `Distribució ${groupLayouts.length + 1}`);
    if (writeLayouts({ ...layouts, [groupId]: [...groupLayouts, { id, name, desks }] })) {
      setLayoutChoice(id);
      setNewName('');
      setMessage('');
    }
  }

  function updateDesks(next: Desk[]) {
    if (!layout) return;
    writeLayouts({ ...layouts, [groupId]: groupLayouts.map(item => item.id === layout.id ? { ...item, desks: next } : item) });
  }

  function captureLayout() {
    if (!layout || !seated.size || !snapshotDate) return;
    const desks = layout.desks.map(desk => ({ ...desk, pupils: desk.pupils.filter(id => byId.has(id)) }));
    if (!desks.some(desk => desk.pupils.length)) return;
    if (snapshots.some(item => item.date === snapshotDate &&
      JSON.stringify(item.desks.map(desk => [...desk.pupils].sort()).sort()) ===
      JSON.stringify(desks.map(desk => [...desk.pupils].sort()).sort()))) {
      setMessage('Aquesta distribució ja està registrada en aquesta data.');
      return;
    }
    const snapshot = { id: crypto.randomUUID(), name: layout.name, date: snapshotDate, desks };
    const next = { ...history, [groupId]: [...snapshots, snapshot] };
    try {
      localStorage.setItem(historyKey, JSON.stringify(next));
      setHistory(next);
      setSnapshotChoice(snapshot.id);
      setMessage('Agrupació registrada a l’historial.');
    } catch {
      setMessage('No s’ha pogut desar l’historial al navegador.');
    }
  }

  function addWorkingLayout(name: string, desks: Desk[]) {
    const id = crypto.randomUUID();
    if (!writeLayouts({ ...layouts, [groupId]: [...groupLayouts, { id, name, desks }] })) return false;
    setLayoutChoice(id);
    return true;
  }

  function restoreSnapshot() {
    const snapshot = snapshots.find(item => item.id === snapshotChoice);
    if (!snapshot) return;
    if (addWorkingLayout(`${snapshot.name} · ${snapshot.date}`,
      snapshot.desks.map(desk => ({ ...desk, pupils: desk.pupils.filter(id => byId.has(id)) })))) {
      setMessage('Instantània oberta com a distribució editable.');
    }
  }

  function suggestLayout() {
    const suggestion = proposeGrouping(
      pupils.map(student => ({ id: String(student.id), role: student.info.supportRole })), desks, pastTables);
    if (!suggestion) {
      setMessage('Falten places disponibles. Amplia una taula, afegeix-ne una o desbloqueja una taula fixa.');
      return;
    }
    const nextDesks = desks.map((desk, index) => ({ ...desk, pupils: suggestion[index] }));
    if (addWorkingLayout(`Proposta ${groupLayouts.length + 1}`, nextDesks)) {
      setMessage('Proposta preparada. Revisa-la i registra-la quan l’utilitzis a classe.');
    }
  }

  function movePupil(id: string, destination: string) {
    if (!byId.has(id)) return;
    const target = desks.find(desk => desk.id === destination);
    if (target?.pupils.includes(id)) return;
    if (target && target.pupils.filter(member => byId.has(member)).length >= target.capacity) {
      setMessage('Aquesta taula és plena.');
      return;
    }
    setMessage('');
    setPickedPupil('');
    updateDesks(desks.map(desk => ({
      ...desk,
      pupils: [...desk.pupils.filter(member => member !== id && byId.has(member)), ...(desk.id === destination ? [id] : [])],
    })));
  }

  function moveDesk(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const drag = deskDrag.current;
    if (!drag || event.dataTransfer.getData('text/x-evaluo-desk') !== drag.id) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.min(448, Math.max(12, (event.clientX - bounds.left - drag.x) * 760 / bounds.width));
    const y = Math.min(floorHeight - 240, Math.max(42, event.clientY - bounds.top - drag.y));
    updateDesks(desks.map(desk => desk.id === drag.id ? { ...desk, x, y } : desk));
    deskDrag.current = null;
  }

  async function savePhoto(change: Parameters<ClassroomStudioProps['onUpdatePhoto']>[1], target = pupil) {
    if (!target) return;
    setBusy(true);
    try {
      const saved = await onUpdatePhoto(String(target.id), change);
      if (!saved) throw new Error('Perfil no disponible.');
      setDraft(null);
      setMessage('Foto actualitzada.');
    } catch {
      setMessage('No s’ha pogut desar la foto.');
    } finally {
      setBusy(false);
    }
  }

  async function replacePhoto(file?: File, target = pupil) {
    if (!file || !target || busy) return;
    if (target.info.photoUrl && !window.confirm(`Vols substituir la foto de ${target.info.name}?`)) return;
    setBusy(true);
    try {
      const [image] = await readStudentPhotos(file, []);
      await savePhoto({ photoUrl: await image.read(), photoCrop: undefined }, target);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No s’ha pogut llegir la imatge.');
    } finally {
      setBusy(false);
    }
  }

  function dropIndividualPhoto(event: React.DragEvent, student: Pupil) {
    event.preventDefault();
    event.stopPropagation();
    const files = Array.from<File>(event.dataTransfer.files);
    if (files.length !== 1 || !/\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(files[0].name)) {
      setMessage('Deixa una sola imatge JPG, PNG, WEBP, GIF, BMP o AVIF sobre el perfil.');
      return;
    }
    setSelectedPupil(String(student.id));
    void replacePhoto(files[0], student);
  }

  function portrait(student: Pupil, size?: string) {
    return student.info.photoUrl ? (
      <StudentPortrait src={student.info.photoUrl} name={student.info.name} crop={student.info.photoCrop} size={size} thumbnail />
    ) : (
      <span className={`grid ${size || 'h-7 w-7'} shrink-0 place-items-center rounded-full bg-warm-100 text-slate-500`}>
        {student.info.name.trim().charAt(0).toUpperCase()}
      </span>
    );
  }

  async function assignSupport(id: string, role?: SupportRole) {
    const student = byId.get(id);
    if (!student || student.info.supportRole === role) return;
    try {
      if (!(await onUpdateSupportRole(id, role))) throw new Error('Perfil no disponible');
      setPickedPupil('');
      setMessage(`${student.info.name} · ${supportRoles.find(item => item.value === role)?.label || 'Sense valorar'}`);
    } catch {
      setMessage('No s’ha pogut desar la valoració.');
    }
  }

  function photoTile(student: Pupil) {
    const id = String(student.id);
    const role = supportRoles.find(item => item.value === student.info.supportRole);
    return (
      <button key={id} type="button" draggable={!evaluating} aria-pressed={(evaluating ? evidencePupilId : pickedPupil) === id}
        title={`${student.info.name} · ${role?.label || 'Sense valorar'}`}
        onClick={() => evaluating ? setEvidencePupilId(id) : setPickedPupil(current => current === id ? '' : id)}
        onDragStart={event => event.dataTransfer.setData('text/x-evaluo-pupil', id)}
        className={`flex min-w-0 flex-col items-center gap-1 rounded-xl border px-2 py-1.5 text-center aria-pressed:ring-2 aria-pressed:ring-primary-700 ${evaluating ? 'cursor-pointer' : 'cursor-grab'} ${role?.color || 'border-warm-200 bg-white text-slate-700'}`}>
        {portrait(student, 'h-12 w-12')}
        <span className="w-full truncate text-xs font-semibold">{student.info.name}</span>
      </button>
    );
  }

  function receiveDrop(event: React.DragEvent, deskId: string) {
    if (evaluating) return;
    const id = event.dataTransfer.getData('text/x-evaluo-pupil');
    if (!id) return;
    event.preventDefault();
    event.stopPropagation();
    movePupil(id, deskId);
  }

  const floorHeight = Math.max(550, 65 + 250 * Math.ceil(desks.length / 2),
    ...desks.map(desk => (desk.y || 0) + 245));

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-auto bg-warm-50 p-5 text-slate-900">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Organització de l’aula</h2>
        <label className="flex items-center gap-2 text-sm font-semibold">Grup
          <select aria-label="Grup" value={groupId} disabled={busy} onChange={event => {
            setGroupChoice(event.target.value);
            setLayoutChoice('');
            setSnapshotChoice('');
            setSelectedPupil('');
            setPickedPupil('');
            setEvidencePupilId('');
            setDraft(null);
            setMessage('');
          }} className="rounded-lg border border-warm-200 bg-white px-3 py-2">
            {!groups.length && <option value="">Sense grups</option>}
            {groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
        </label>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button type="button" aria-pressed={tab === 'pupils'} onClick={() => { setTab('pupils'); setPickedPupil(''); setMessage(''); }}
          className="flex items-center gap-2 rounded-lg border border-warm-200 px-3 py-2 text-sm font-semibold aria-pressed:bg-primary-900 aria-pressed:text-white">
          <Users size={16} /> Alumnat
        </button>
        <button type="button" aria-pressed={tab === 'support'} onClick={() => { setTab('support'); setPickedPupil(''); setMessage(''); }}
          className="flex items-center gap-2 rounded-lg border border-warm-200 px-3 py-2 text-sm font-semibold aria-pressed:bg-primary-900 aria-pressed:text-white">
          Suport
        </button>
        <button type="button" aria-pressed={tab === 'desks'} onClick={() => { setTab('desks'); setPickedPupil(''); setMessage(''); }}
          className="flex items-center gap-2 rounded-lg border border-warm-200 px-3 py-2 text-sm font-semibold aria-pressed:bg-primary-900 aria-pressed:text-white">
          <LayoutGrid size={16} /> Taules
        </button>
        <button type="button" aria-pressed={tab === 'pe'} onClick={() => { setTab('pe'); setPickedPupil(''); setMessage(''); }}
          className="rounded-lg border border-warm-200 px-3 py-2 text-sm font-semibold aria-pressed:bg-primary-900 aria-pressed:text-white">
          Registre d’EF
        </button>
      </div>
      {message && <p role="status" className="mb-3 rounded-lg bg-white p-2 text-sm">{message}</p>}
      {!groupId && <p className="text-sm text-slate-600">Crea o importa un grup per començar.</p>}
      {groupId && tab === 'pe' && <div key={groupId + ':' + trimester}>
        <PEClothingRegister groupId={groupId} pupils={pupils} trimester={trimester}
          rubricAvailable={peRubricAvailable} onApply={onApplyPEEvidence} />
      </div>}
      {groupId && tab === 'support' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Arrossega una foto a una columna o selecciona l’alumne i prem la categoria.</p>
          {(() => {
            const unclassifiedPupils = pupils.filter(student => !student.info.supportRole);
            return (
              <section className="rounded-2xl border border-dashed border-warm-300 bg-white p-3"
                onDragOver={event => event.preventDefault()}
                onDrop={event => { event.preventDefault(); void assignSupport(event.dataTransfer.getData('text/x-evaluo-pupil')); }}>
                <button type="button" disabled={!pickedPupil} className="mb-2 text-sm font-semibold disabled:opacity-80"
                  onClick={() => void assignSupport(pickedPupil)}>Sense valorar ({unclassifiedPupils.length})</button>
                {unclassifiedPupils.length > 0 && <div className="grid grid-cols-[repeat(auto-fill,minmax(105px,1fr))] gap-2">{unclassifiedPupils.map(photoTile)}</div>}
              </section>
            );
          })()}
          <div className="grid gap-3 md:grid-cols-3">
            {supportRoles.map(role => {
              const members = pupils.filter(student => student.info.supportRole === role.value);
              return (
                <section key={role.value} className={`min-h-44 rounded-2xl border p-3 ${role.color}`}
                  onDragOver={event => event.preventDefault()}
                  onDrop={event => { event.preventDefault(); void assignSupport(event.dataTransfer.getData('text/x-evaluo-pupil'), role.value); }}>
                  <button type="button" disabled={!pickedPupil} onClick={() => void assignSupport(pickedPupil, role.value)}
                    className="mb-3 flex items-center gap-2 font-semibold disabled:opacity-90">
                    <span className={`h-3 w-3 rounded-full ${role.dot}`} /> {role.label} ({members.length})
                  </button>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(95px,1fr))] gap-2">{members.map(photoTile)}</div>
                </section>
              );
            })}
          </div>
        </div>
      )}
      {groupId && tab === 'pupils' && (
        <>
        <div className="mb-4 rounded-2xl border-2 border-dashed border-warm-300 bg-white p-4"
          onDragOver={event => event.preventDefault()}
          onDrop={async event => {
            event.preventDefault();
            try { await onImportFiles(await readDroppedPhotoFiles(event.dataTransfer), groupId); }
            catch { setMessage('No s’ha pogut llegir la carpeta. Prova de seleccionar-la.'); }
          }}>
          <p className="font-semibold">Arrossega fotos o una carpeta amb subcarpetes</p>
          <p className="mt-1 text-sm text-slate-600">{pupilsWithoutPhoto.length} alumnes sense foto en aquest grup.</p>
          <input type="file" multiple className="hidden" ref={node => {
            folderPicker.current = node;
            node?.setAttribute('webkitdirectory', '');
          }} onChange={event => {
            const files = Array.from<File>(event.currentTarget.files || []).filter(isPhotoImportFile);
            void onImportFiles(files, groupId);
            event.currentTarget.value = '';
          }} />
          <button type="button" onClick={() => folderPicker.current?.click()}
            className="mt-3 rounded-lg bg-primary-900 px-3 py-2 text-sm font-semibold text-white">Selecciona una carpeta</button>
          <label className="ml-4 text-sm">
            <input type="checkbox" checked={onlyWithoutPhoto} onChange={event => setOnlyWithoutPhoto(event.target.checked)} /> Només alumnat sense foto
          </label>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_minmax(320px,2fr)]">
          <div className="rounded-2xl border border-warm-200 bg-white p-3">
            <button type="button" onClick={onImportPhotos}
              className="mb-3 flex items-center gap-2 rounded-lg bg-primary-900 px-3 py-2 text-sm font-semibold text-white">
              <Camera size={16} /> Importa i revisa fotos
            </button>
            <ul className="space-y-1">
              {(onlyWithoutPhoto ? pupilsWithoutPhoto : pupils).map(student => (
                <li key={student.id} onDragOver={event => event.preventDefault()}
                  onDrop={event => dropIndividualPhoto(event, student)}>
                  <button type="button" disabled={busy} aria-pressed={selectedPupil === String(student.id)}
                    onClick={() => { setSelectedPupil(String(student.id)); setDraft(null); setMessage(''); }}
                    className="flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm hover:bg-warm-50 aria-pressed:bg-warm-100">
                    {portrait(student)} {student.info.name}
                  </button>
                </li>
              ))}
            </ul>
            {!pupils.length && <p className="text-sm text-slate-600">Aquest grup encara no té alumnes.</p>}
          </div>
          <div className="rounded-2xl border border-warm-200 bg-white p-5">
            {pupil ? (
              <>
                <h3 className="mb-3 text-lg font-semibold">{pupil.info.name}</h3>
                {linkedGroups.length > 0 && <p className="mb-3 text-sm text-slate-600">També a {linkedGroups.join(', ')} · Foto compartida</p>}
                <label className="mb-4 grid max-w-sm gap-1 text-sm font-semibold">Suport a l’aula
                  <select value={pupil.info.supportRole || ''} disabled={busy} className="rounded-lg border border-warm-200 p-2"
                    onChange={async event => {
                      const value = (event.currentTarget.value || undefined) as SupportRole | undefined;
                      setBusy(true);
                      try {
                        if (!(await onUpdateSupportRole(String(pupil.id), value))) throw new Error('Perfil no disponible');
                        setMessage('Valoració desada.');
                      } catch { setMessage('No s’ha pogut desar la valoració.'); }
                      finally { setBusy(false); }
                    }}>
                    <option value="">Sense valorar</option>
                    {supportRoles.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}
                  </select>
                </label>
                {pupil.info.photoUrl && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="touch-none cursor-grab rounded-full outline outline-2 outline-warm-200"
                        onPointerDown={event => {
                          drag.current = { x: event.clientX, y: event.clientY, crop };
                          event.currentTarget.setPointerCapture(event.pointerId);
                        }}
                        onPointerMove={event => {
                          if (!drag.current) return;
                          const initial = drag.current;
                          const width = event.currentTarget.getBoundingClientRect().width;
                          const clamp = (value: number) => Math.min(100, Math.max(0, value));
                          setDraft({ ...initial.crop,
                            x: clamp(initial.crop.x - (event.clientX - initial.x) * 100 / width),
                            y: clamp(initial.crop.y - (event.clientY - initial.y) * 100 / width),
                          });
                        }}
                        onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
                        <StudentPortrait src={pupil.info.photoUrl} name={pupil.info.name} crop={crop} size="h-32 w-32" thumbnail />
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-slate-600">Arrossega la foto per centrar la cara.</p>
                        <div className="flex items-center gap-2 text-sm">
                          <StudentPortrait src={pupil.info.photoUrl} name={pupil.info.name} crop={crop} thumbnail />
                          Mida real a la llista
                        </div>
                      </div>
                    </div>
                    {([
                      ['x', 'Posició horitzontal', 0, 100, 1],
                      ['y', 'Posició vertical', 0, 100, 1],
                      ['zoom', 'Zoom', 1, 3, 0.05],
                    ] as const).map(([key, label, min, max, step]) => (
                      <label key={key} className="grid max-w-sm gap-1 text-sm">{label}
                        <input type="range" min={min} max={max} step={step} value={crop[key]} disabled={busy}
                          onChange={event => setDraft({ ...crop, [key]: event.target.valueAsNumber })} />
                      </label>
                    ))}
                    <div className="flex flex-wrap gap-3">
                      <button type="button" disabled={!draft || busy} onClick={() => void savePhoto({ photoCrop: crop })}
                        className="rounded-lg bg-primary-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">Desa l’enquadrament</button>
                      <button type="button" disabled={busy} onClick={() => setDraft(defaultCrop)} className="text-sm font-semibold">Restableix</button>
                    </div>
                  </div>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-4 rounded-lg border border-dashed border-warm-300 p-3"
                  onDragOver={event => event.preventDefault()} onDrop={event => dropIndividualPhoto(event, pupil)}>
                  <label className="cursor-pointer rounded-lg border border-warm-200 px-3 py-2 text-sm font-semibold">
                    {pupil.info.photoUrl ? 'Canvia la foto' : 'Afegeix una foto'}
                    <input type="file" accept=".png,.jpg,.jpeg,.webp,.gif,.bmp,.avif" className="sr-only" disabled={busy}
                      onChange={event => { void replacePhoto(event.currentTarget.files?.[0]); event.currentTarget.value = ''; }} />
                  </label>
                  <input type="file" accept="image/*" capture="environment" hidden ref={cameraPicker}
                    onChange={event => {
                      const photo = event.currentTarget.files?.[0];
                      event.currentTarget.value = '';
                      void replacePhoto(photo);
                    }} />
                  <button type="button" disabled={busy} onClick={() => cameraPicker.current?.click()}
                    className="flex items-center gap-2 rounded-lg border border-warm-200 px-3 py-2 text-sm font-semibold disabled:opacity-40">
                    <Camera size={16} /> Fes una foto
                  </button>
                  <span className="text-xs text-slate-600">També hi pots arrossegar una foto.</span>
                  {pupil.info.photoUrl && (
                    <button type="button" disabled={busy} className="flex items-center gap-1 text-sm font-semibold text-rose-700"
                      onClick={() => { if (window.confirm('Vols eliminar aquesta foto?')) void savePhoto({ photoUrl: '', photoCrop: undefined }); }}>
                      <Trash2 size={15} /> Elimina la foto
                    </button>
                  )}
                </div>
              </>
            ) : <p className="text-sm text-slate-600">Selecciona un alumne per editar la foto.</p>}
          </div>
        </div>
        </>
      )}
      {groupId && tab === 'desks' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2" aria-label="Mode del plànol">
            {([['organize', 'Organitzar'], ['evaluate', 'Avaluar']] as const).map(([mode, label]) =>
              <button key={mode} type="button" aria-pressed={deskMode === mode}
                className="min-h-10 rounded-lg border border-warm-200 bg-white px-3 py-2 text-sm font-semibold aria-pressed:bg-primary-900 aria-pressed:text-white"
                onClick={() => { setDeskMode(mode); setPickedPupil(''); setDeskSettings(''); setMessage(''); }}>{label}</button>
            )}
            {evaluating && <div key={groupId}><ClassroomEvidence groupId={groupId}
              pupils={pupils.map(student => ({ ...student.info, id: identities.get(String(student.id)) || String(student.id) }))}
              pupil={byId.has(evidencePupilId) ? { ...byId.get(evidencePupilId)!.info,
                id: identities.get(evidencePupilId) || evidencePupilId } : undefined}
              onClose={() => setEvidencePupilId('')} /></div>}
          </div>
          {evaluating && !layout && <div className="grid grid-cols-[repeat(auto-fill,minmax(105px,1fr))] gap-2">
            {pupils.map(photoTile)}
          </div>}
          {!evaluating && <>
          <div className="flex flex-wrap items-end gap-2 rounded-xl border border-warm-200 bg-white p-3">
            {layout && <label className="grid gap-1 text-sm font-semibold">Distribució desada
              <select value={layout.id} onChange={event => { setLayoutChoice(event.target.value); setMessage(''); }}
                className="rounded-lg border border-warm-200 p-2">
                {groupLayouts.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>}
            <label className="grid gap-1 text-sm font-semibold">Nom de la nova distribució
              <input value={newName} onChange={event => setNewName(event.target.value)} placeholder="Treball cooperatiu"
                className="rounded-lg border border-warm-200 p-2" />
            </label>
            <button type="button" onClick={() => createLayout(4)}
              className="rounded-lg bg-primary-900 px-3 py-2 text-sm font-semibold text-white">4 taules de 4</button>
            <button type="button" onClick={() => createLayout(5)}
              className="rounded-lg border border-warm-200 px-3 py-2 text-sm font-semibold">5 taules de 4</button>
            <button type="button" onClick={() => createLayout(0)}
              className="rounded-lg border border-warm-200 px-3 py-2 text-sm font-semibold">Distribució buida</button>
          </div>
          </>}
          {layout && (
            <>
              {!evaluating && <>
              <section className="space-y-3 rounded-2xl border border-warm-200 bg-white p-4">
                <h3 className="font-semibold">Historial i propostes</h3>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="grid gap-1 text-sm">Data d’ús
                    <input type="date" value={snapshotDate} onChange={event => setSnapshotDate(event.target.value)}
                      className="rounded-lg border border-warm-200 p-2" />
                  </label>
                  <button type="button" disabled={!seated.size || !snapshotDate} onClick={captureLayout}
                    className="rounded-lg border border-warm-200 px-3 py-2 text-sm font-semibold disabled:opacity-40">
                    Registra l’agrupació usada
                  </button>
                  <button type="button" disabled={!desks.length || !pupils.length} onClick={suggestLayout}
                    className="rounded-lg bg-primary-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">
                    Proposa agrupaments
                  </button>
                </div>
                {snapshots.length > 0 && <div className="flex flex-wrap items-end gap-3">
                  <label className="grid gap-1 text-sm">Instantànies desades ({snapshots.length})
                    <select value={snapshotChoice} onChange={event => setSnapshotChoice(event.target.value)}
                      className="rounded-lg border border-warm-200 p-2">
                      <option value="">Selecciona una instantània</option>
                      {[...snapshots].reverse().map(item =>
                        <option key={item.id} value={item.id}>{item.date} · {item.name}</option>)}
                    </select>
                  </label>
                  <button type="button" disabled={!snapshotChoice} onClick={restoreSnapshot}
                    className="rounded-lg border border-warm-200 px-3 py-2 text-sm font-semibold disabled:opacity-40">Obre l’instantània</button>
                </div>}
                <p className="text-sm text-slate-600">
                  {unclassified} alumnes sense valorar · {currentPairs.length - repeated.length} parelles noves · {repeated.length} parelles repetides
                </p>
                {repeated.length > 0 && <details className="text-sm">
                  <summary className="cursor-pointer font-semibold">Veure parelles repetides</summary>
                  <p className="my-1 text-xs text-slate-600">Percentatge de les instantànies en què tots dos tenien taula assignada.</p>
                  <ul className="max-h-44 space-y-1 overflow-auto">
                    {repeated.map(pair => <li key={JSON.stringify([pair.a, pair.b])}>
                      {byId.get(pair.a)?.info.name} i {byId.get(pair.b)?.info.name} · {pair.count}/{pair.opportunities} ({Math.round(pair.rate * 100)}%)
                    </li>)}
                  </ul>
                </details>}
              </section>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-slate-600">Arrossega una foto a una taula o selecciona-la i prem «Seu aquí».</p>
                <button type="button" onClick={() => updateDesks([...desks, {
                  id: crypto.randomUUID(), name: `Taula ${desks.length + 1}`, capacity: 4, pupils: [],
                }])} className="flex items-center gap-1 rounded-lg border border-warm-200 bg-white px-3 py-2 text-sm font-semibold">
                  <Plus size={16} /> Afegeix una taula
                </button>
              </div>
              </>}
              <div className="grid gap-3">
                <section onDragOver={event => event.preventDefault()} onDrop={event => receiveDrop(event, '')}
                  className="rounded-2xl border border-dashed border-warm-300 bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold">Sense assignar ({unassigned.length})</h3>
                    {pickedPupil && <button type="button" onClick={() => movePupil(pickedPupil, '')}
                      className="rounded-lg border border-warm-200 px-2 py-1 text-xs font-semibold">Deixa’l sense taula</button>}
                  </div>
                  {unassigned.length > 0 && <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(105px,1fr))] gap-2">
                    {unassigned.map(photoTile)}
                  </div>}
                </section>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-700">
                  {supportRoles.map(role => <span key={role.value} className="flex items-center gap-1.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${role.dot}`} />{role.label}
                    {' · '}{pupils.filter(student => student.info.supportRole === role.value).length}
                  </span>)}
                  <span>Sense valorar · {unclassified}</span>
                </div>
                <div className="min-w-0 overflow-auto rounded-2xl border border-warm-300">
                <div aria-label="Plànol de l’aula" onDragOver={event => event.preventDefault()} onDrop={evaluating ? undefined : moveDesk}
                  className="relative w-full min-w-[640px] overflow-hidden bg-warm-100"
                  style={{ height: floorHeight, backgroundImage: 'radial-gradient(#c8bba7 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                  <div className="absolute inset-x-0 top-0 mx-auto w-56 rounded-b-lg bg-slate-700 py-1 text-center text-xs text-white">Pissarra</div>
                  {desks.map((desk, index) => {
                    const members = desk.pupils.flatMap(id => byId.get(id) || []);
                    const needsSupport = members.filter(student => student.info.supportRole === 'needs-support').length;
                    const canHelp = members.filter(student => student.info.supportRole === 'can-help').length;
                    return (
                      <section key={desk.id} onDragOver={event => event.preventDefault()} onDrop={event => receiveDrop(event, desk.id)}
                        className="absolute h-[225px] overflow-auto rounded-2xl border-2 border-warm-400 bg-[#fffaf0] p-3 shadow-md"
                        style={{ width: '39.5%', left: `${(desk.x ?? 44 + (index % 2) * 350) / 760 * 100}%`, top: desk.y ?? 42 + Math.floor(index / 2) * 250 }}>
                        <div className="mb-2 flex items-center gap-2">
                          {!evaluating && <span draggable onDragStart={event => {
                            const bounds = event.currentTarget.closest('section')!.getBoundingClientRect();
                            deskDrag.current = { id: desk.id, x: event.clientX - bounds.left, y: event.clientY - bounds.top };
                            event.dataTransfer.setData('text/x-evaluo-desk', desk.id);
                          }} onDragEnd={() => { deskDrag.current = null; }}
                            className="cursor-grab" title="Arrossega la taula"><GripVertical size={16} /></span>}
                          <h4 className="min-w-0 flex-1 truncate text-sm font-bold">{desk.name}</h4>
                          <span className="text-xs text-slate-600">{members.length}/{desk.capacity}</span>
                          {pickedPupil && !desk.pupils.includes(pickedPupil) && (
                            <button type="button" disabled={members.length >= desk.capacity} onClick={() => movePupil(pickedPupil, desk.id)}
                              className="rounded bg-primary-900 px-2 py-1 text-xs text-white disabled:opacity-40">Seu aquí</button>
                          )}
                          {!evaluating && <button type="button" aria-expanded={deskSettings === desk.id}
                            aria-label={`Configura ${desk.name}`} title="Configura la taula"
                            onClick={() => setDeskSettings(deskSettings === desk.id ? '' : desk.id)}
                            className="rounded-lg border border-warm-300 px-2 text-sm">⋯</button>}
                        </div>
                        {deskSettings === desk.id && <div className="mb-2 rounded-lg border border-warm-200 bg-white p-2">
                        <input aria-label={`Nom de la taula ${index + 1}`} value={desk.name}
                          onChange={event => updateDesks(desks.map(item => item.id === desk.id ? { ...item, name: event.target.value } : item))}
                          className="mb-2 w-full border-b border-warm-100 text-sm font-semibold" />
                        <label className="mb-2 flex items-center gap-1 text-xs">
                          <input type="checkbox" checked={Boolean(desk.locked)}
                            onChange={event => updateDesks(desks.map(item => item.id === desk.id ? { ...item, locked: event.target.checked } : item))} />
                          Mantén aquesta taula a la proposta
                        </label>
                        <button type="button" aria-label={`Elimina ${desk.name}`}
                          onClick={() => updateDesks(desks.filter(item => item.id !== desk.id))} className="flex items-center gap-1 text-xs text-rose-700">
                          <Trash2 size={15} /> Elimina la taula
                        </button>
                        </div>}
                        {!evaluating && <label className="mb-2 flex items-center gap-2 text-xs">Places ({members.length} ocupades)
                          <input type="number" min={Math.max(1, members.length)} max={40} value={desk.capacity}
                            onChange={event => {
                              const capacity = event.target.valueAsNumber;
                              if (capacity >= Math.max(1, members.length) && capacity <= 40) {
                                updateDesks(desks.map(item => item.id === desk.id ? { ...item, capacity } : item));
                              }
                            }} className="w-14 rounded border border-warm-200 p-1" />
                        </label>}
                        {(needsSupport > 0 || canHelp > 0) && (
                          <p className={`mb-2 text-xs ${needsSupport && !canHelp ? 'text-amber-800' : 'text-slate-600'}`}>
                            {needsSupport} necessiten suport · {canHelp} poden donar suport
                          </p>
                        )}
                        <div className="grid grid-cols-2 gap-1.5 md:gap-x-6">
                          {members.map(photoTile)}
                          {Array.from({ length: Math.max(0, Math.min(4, desk.capacity) - members.length) }, (_, seat) => (
                            <div key={seat} className="grid min-h-[60px] place-items-center rounded-xl border border-dashed border-warm-300 text-xs text-slate-600">Plaça lliure</div>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
