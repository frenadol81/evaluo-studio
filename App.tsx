
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { matchStudentPhotos, photoGroupCodes, photoPlanetRound, preselectPhotoProfiles, readStudentPhotos } from './infrastructure/services/studentPhotoImport';
import { MainForm } from './ui/modules/ReportGenerator/MainForm';
import { ProfileSelector } from './ui/components/ProfileSelector';
import { BatchMode } from './components/BatchMode';
import { AiSettings } from './components/AiSettings';
import { ClassroomStudio } from './components/ClassroomStudio';
import { mergeClothingEvidence } from './infrastructure/services/peClothing';
import { studentMemberships, withSharedStudentPhotos } from './infrastructure/services/studentMemberships';
import { createStudent } from './core/domain/student.model.js';
import { db, initDB } from './infrastructure/storage/db';
import { archiveSessionDocument, exportSession, parseSessionExtras, restoreSession } from './infrastructure/storage/sessionBackup';
import { executeGenerateReport } from './application/useCases/generateStudentReport.js';
import { parseMathRegisterCSV } from './infrastructure/services/mathRegisterParser';
import { parseEspaisRegister, type ParseEspaisResult } from './infrastructure/services/espaisRegisterParser';
import { parseConferenceRegister, type ParseConferencesResult } from './infrastructure/services/conferenceRegisterParser';
import { parseReadingDocument, type ParseReadingResult } from './infrastructure/services/readingRegisterParser';
import { getRubricsForTrimester } from './core/config/rubrics/index.js';
import { healStudentTags } from './core/utils/rubricMatcher.js';
import { signInWithGoogleDrive, downloadStudentPhotoFiles, type DrivePhotoFile } from './services/googleDriveService';
import { 
  Layers, Users, Plus, LayoutDashboard, 
  UserPlus, X, Download, Upload, Loader2,
  PanelLeftClose, PanelLeftOpen, AlertCircle,
  ChevronUp, ChevronDown, Trash2, GripVertical,
  FileSpreadsheet, Sparkles, CheckCircle2, Mic, BookOpen, Cloud
} from 'lucide-react';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const Logo = ({ onReset }: { onReset: () => void }) => (
    <div onClick={onReset} className="flex items-center gap-3 cursor-pointer group">
        <div className="w-8 h-8 bg-primary-900 rounded-lg shadow-lg flex items-center justify-center group-hover:bg-red-600 transition-colors">
            <Layers className="text-white w-4 h-4" />
        </div>
        <div className="flex flex-col text-left">
            <h1 className="text-base font-black tracking-tight text-primary-900 leading-none uppercase group-hover:text-red-600">EVALUO<span className="text-warm-500 font-light italic lowercase">studio</span></h1>
        </div>
    </div>
);

const SortableGroupItem = ({ g, isSidebarOpen, activeGroupId, viewMode, onSelect, onDelete }: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: g.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`group/nav relative ${isDragging ? 'shadow-lg rounded-xl' : ''}`}
    >
        <button 
          onClick={() => onSelect(g.id)} 
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-bold text-[10px] ${activeGroupId === g.id && viewMode === 'aula' ? 'bg-primary-900 text-white shadow-xl' : 'text-slate-500 hover:bg-warm-100'}`}
        >
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-slate-300 hover:text-slate-500 transition-colors">
                <GripVertical className="w-3 h-3" />
            </div>
            <Users className="w-4 h-4" /> 
            {isSidebarOpen && <span className="truncate pr-6">{g.name}</span>}
        </button>
        {isSidebarOpen && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(g.id); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-300 hover:text-red-500 opacity-0 group-hover/nav:opacity-100 transition-all"
              title="Eliminar Classe"
            >
                <Trash2 className="w-3 h-3" />
            </button>
        )}
    </div>
  );
};

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<'individual' | 'aula' | 'organitzacio'>('aula');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [initialTab, setInitialTab] = useState<string>('personalitat');
  const [studentRecords, setStudents] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const students = React.useMemo(() => withSharedStudentPhotos(studentRecords, groups), [studentRecords, groups]);
  const [activeGroupId, setActiveGroupId] = useState('ALL');
  const [selectedTrimester, setSelectedTrimester] = useState<number>(() => {
    const saved = localStorage.getItem('evaluo_trimester');
    return saved ? parseInt(saved, 10) : 2;
  });
  const [showNewClassModal, setShowNewClassModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showAiSettings, setShowAiSettings] = useState(false);
  const [showDeleteClassConfirm, setShowDeleteClassConfirm] = useState<string | null>(null);
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [driveFolderId, setDriveFolderId] = useState(localStorage.getItem('evaluo_drive_folder_id') ||
    import.meta.env.VITE_DRIVE_PHOTO_FOLDER || '');
  const [driveUserEmail, setDriveUserEmail] = useState<string | null>(null);
  const [importPreviewData, setImportPreviewData] = useState<{
    students: any[];
    groups: any[];
    rawCount: number;
    classesCount: number;
    extras?: ReturnType<typeof parseSessionExtras>;
  } | null>(null);
  const [importNotification, setImportNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isHeaderOpen, setIsHeaderOpen] = useState(true);
  const [newClassName, setNewClassName] = useState('');
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fileInputHeaderRef = useRef<HTMLInputElement>(null);
  const fileInputExcelRef = useRef<HTMLInputElement>(null);
  const fileInputEspaisRef = useRef<HTMLInputElement>(null);
  const fileInputConferenceRef = useRef<HTMLInputElement>(null);
  const fileInputReadingRef = useRef<HTMLInputElement>(null);
  const fileInputLocalPhotosRef = useRef<HTMLInputElement>(null);
  const folderInputPhotosRef = useRef<HTMLInputElement>(null);
  const [espaisSummaryModal, setEspaisSummaryModal] = useState<ParseEspaisResult | null>(null);
  const [activeEspaiRoundPreview, setActiveEspaiRoundPreview] = useState<number>(1);
  const [isSyncingDrivePhotos, setIsSyncingDrivePhotos] = useState(false);
  const [isDraggingPhotos, setIsDraggingPhotos] = useState(false);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [photoImportMessage, setPhotoImportMessage] = useState('');

  const [photoReview, setPhotoReview] = useState<{
    rows: { url: string; label: string; ids: string[]; choice: string; groupCode?: string; planetRound?: number; otherGroups?: string[]; possibleTypo?: boolean; lastMissing?: boolean }[];
    roster: { id: string; identity: string; dbKey: string | number; name: string; group: string; groupId: string; groupCode?: string; planetRound?: number; hasPhoto: boolean }[];
    errors: string[];
  } | null>(null);

  const handleUploadLocalPhotos = async (files: FileList | File[] | null, warnings: string[] = [], selectedPhotoGroup?: string) => {
    if (isUploadingPhotos || photoReview) return;
    if (!files?.length) {
      if (warnings.length) alert(warnings.join('\n'));
      return;
    }
    const inputFiles = Array.from(files);
    const errors = [...warnings];
    const rows: NonNullable<typeof photoReview>['rows'] = [];
    setPhotoImportMessage('');
    setIsUploadingPhotos(true);
    try {
      const studentsInDb = withSharedStudentPhotos(await db.students.toArray(), groups);
      const identities = studentMemberships(studentsInDb, groups);
      const roster = studentsInDb.map(student => {
        const groupId = student.info.groupId || student.groupId;
        const group = groups.find(group => group.id === groupId)?.name || groupId || student.info.course || '';
        const planetRound = photoPlanetRound(groupId || '') ?? photoPlanetRound(group);
        const codes = photoGroupCodes(group);
        const idCodes = photoGroupCodes(groupId || '');
        const courseCodes = photoGroupCodes(student.info.course || '');
        const nameCodes = photoGroupCodes(student.info.name);
        const origin = courseCodes.length === 1 ? courseCodes[0] : nameCodes.length === 1 ? nameCodes[0] : undefined;
        const groupCode = planetRound ? origin : codes.length === 1 ? codes[0] : idCodes.length === 1 ? idCodes[0] : origin;
        return {
          id: String(student.id),
          identity: identities.get(String(student.id)) || String(student.id),
          dbKey: student.id,
          name: student.info.name,
          group: planetRound ? `Planeta · Ronda ${planetRound}${origin ? ' · Origen ' + origin : ''}` : group,
          groupId,
          groupCode,
          planetRound,
          hasPhoto: Boolean(student.info.photoUrl),
        };
      }).sort((first, second) =>
        (first.groupCode || '\uffff').localeCompare(second.groupCode || '\uffff', 'ca', { numeric: true }) ||
        first.group.localeCompare(second.group, 'ca', { numeric: true }) ||
        first.name.localeCompare(second.name, 'ca'));

      for (const file of inputFiles) {
        try {
          await archiveSessionDocument(file, 'fotos');
          const codes = photoGroupCodes(file.name.replace(/\.[^.]+$/, ''));
          const folders = (file as Partial<DrivePhotoFile>).photoFolders ||
            file.webkitRelativePath?.split('/').slice(0, -1) || [];
          const parentCodes = [...folders].reverse().map(photoGroupCodes).find(found => found.length === 1);
          const groupCode = codes.length === 1 ? codes[0] : codes.length === 0 ? parentCodes?.[0] : undefined;
          const planetRound = photoPlanetRound(file.name) ?? [...folders].reverse().map(photoPlanetRound).find(Boolean);
          const eligible = roster.filter(student =>
            (!groupCode || student.groupCode === groupCode) && (!planetRound || student.planetRound === planetRound));
          const names = eligible.map(student => student.name);
          const photos = await readStudentPhotos(file, names, Boolean(groupCode));
          if (!photos.length) errors.push(file.name + ': cap foto compatible.');
          for (const photo of photos) {
            try {
              const entryCodes = [...(photo.folders || [])].reverse().map(photoGroupCodes).find(found => found.length === 1);
              const photoGroup = entryCodes?.[0] || groupCode;
              const photoRoster = photoGroup === groupCode ? eligible :
                roster.filter(student => student.groupCode === photoGroup && (!planetRound || student.planetRound === planetRound));
              const photoNames = photoRoster.map(student => student.name);
              const candidates = matchStudentPhotos(photo.label, photoNames, false, Boolean(photoGroup)).map(index => photoRoster[index]);
              const distinct = new Map<string, typeof roster[number]>();
              for (const candidate of candidates) {
                if (!distinct.has(candidate.identity) || candidate.id === candidate.identity) distinct.set(candidate.identity, candidate);
              }
              const ids = [...distinct.values()].map(candidate => candidate.id);
              const possibleTypo = ids.length > 0 && !matchStudentPhotos(photo.label, photoNames, false, Boolean(photoGroup), false).length;
              const otherGroups = !ids.length && photoGroup
                ? [...new Set(matchStudentPhotos(photo.label, roster.map(student => student.name))
                  .map(index => roster[index].group).filter(Boolean))]
                : undefined;
              rows.push({
                url: await photo.read(),
                label: photo.label || (photo.filename === file.name ? file.name : file.name + ' · ' + photo.filename.split('/').pop()),
                ids,
                groupCode: photoGroup,
                planetRound,
                choice: '',
                otherGroups,
                possibleTypo,
              });
            } catch {
              errors.push(photo.filename + ': error de lectura.');
            }
          }
        } catch (error) {
          errors.push(file.name + ': ' + (error instanceof Error ? error.message : String(error)));
        }
      }

      if (selectedPhotoGroup && rows.length === 1 && inputFiles.length === 1 &&
          /\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(inputFiles[0].name)) {
        const row = rows[0];
        const pending = roster.filter(student => student.groupId === selectedPhotoGroup && !student.hasPhoto);
        if (!row.ids.length && !row.otherGroups?.length && pending.length === 1 &&
          (!row.groupCode || row.groupCode === pending[0].groupCode) &&
          (!row.planetRound || row.planetRound === pending[0].planetRound)) {
          row.ids = [pending[0].id];
          row.lastMissing = true;
        }
      }
      preselectPhotoProfiles(rows, id => identities.get(id) || id);
      if (rows.length) setPhotoReview({ rows, roster, errors });
      else alert(errors.join('\n') || 'No hi ha fotos per revisar.');
    } catch (error) {
      console.error('Error preparant les fotos:', error);
      alert('Error en preparar les fotos.');
    } finally {
      setIsUploadingPhotos(false);
    }
  };

  const confirmPhotoReview = async () => {
    if (!photoReview || isUploadingPhotos) return;
    setIsUploadingPhotos(true);
    try {
      const saved = new Map<string, string>();
      const confirmed = new Set<string>();
      const savedIdentities = new Set<string>();
      const profiles = new Map<string, NonNullable<typeof photoReview>['roster'][number]>();
      for (const profile of photoReview.roster) profiles.set(profile.id, profile);
      const failures: string[] = [];
      for (const row of photoReview.rows) {
        if (!row.choice) continue;
        try {
          const profile = profiles.get(row.choice);
          if (!profile || (row.groupCode && row.groupCode !== profile.groupCode) ||
              (row.planetRound && row.planetRound !== profile.planetRound)) throw new Error('el perfil no és del grup del fitxer');
          if (savedIdentities.has(profile.identity)) throw new Error('ja s’ha desat una foto per a aquest alumne');
          const related = photoReview.roster.filter(student => student.identity === profile.identity);
          await db.transaction('rw', db.students, async () => {
            for (const student of related) {
              const updated = await db.students.update(student.dbKey, { 'info.photoUrl': row.url, 'info.photoCrop': undefined });
              if (!updated) throw new Error('el perfil ja no és a la llista');
            }
          });
          for (const student of related) saved.set(student.id, row.url);
          confirmed.add(row.choice);
          savedIdentities.add(profile.identity);
        } catch (error) {
          const reason = error instanceof Error && error.name === 'QuotaExceededError'
            ? 'el navegador no té prou espai'
            : error instanceof Error ? error.message : 'error de desament';
          failures.push(row.label + ': ' + reason);
        }
      }
      const updatePhotos = (list: typeof students) => list.map(student => {
        const photoUrl = saved.get(String(student.id));
        return photoUrl ? { ...student, info: { ...student.info, photoUrl, photoCrop: undefined } } : student;
      });
      studentsRef.current = updatePhotos(studentsRef.current);
      setStudents(updatePhotos);
      const summary = 'Fotos desades: ' + confirmed.size + '. Fotos sense assignar: ' + (photoReview.rows.length - confirmed.size) + '.';
      if (failures.length) {
        setPhotoReview({
          ...photoReview,
          rows: photoReview.rows.filter(row => !confirmed.has(row.choice)),
          roster: photoReview.roster.map(student => saved.has(student.id) ? { ...student, hasPhoto: true } : student),
          errors: [summary, ...failures],
        });
        return;
      }
      setPhotoReview(null);
      setPhotoImportMessage(summary);
    } catch (error) {
      console.error('Error desant les fotos:', error);
      setPhotoReview(current => current && { ...current, errors: ['No s’ha pogut desar la selecció. Torna-ho a provar.'] });
    } finally {
      setIsUploadingPhotos(false);
    }
  };

  const resetStudentPhotos = async () => {
    if (isUploadingPhotos || !window.confirm('Vols eliminar les fotos de tots els perfils?')) return;
    setIsUploadingPhotos(true);
    setPhotoImportMessage('');
    try {
      const removed = await db.transaction('rw', db.students, async () => {
        return db.students.toCollection().modify(student => {
          const legacy = student as typeof student & { photoUrl?: string };
          if (!student.info?.photoUrl && !legacy.photoUrl) return false;
          if (student.info) {
            student.info.photoUrl = '';
            delete student.info.photoCrop;
          }
          delete legacy.photoUrl;
        });
      });
      const clearPhotos = (list: typeof students) => list.map(student => ({
        ...student,
        info: { ...student.info, photoUrl: '', photoCrop: undefined },
      }));
      studentsRef.current = clearPhotos(studentsRef.current);
      setStudents(clearPhotos);
      setPhotoImportMessage(`Fotos eliminades de ${removed} perfils. Ja pots tornar a importar-les.`);
    } catch (error) {
      console.error('Error eliminant les fotos:', error);
      setPhotoImportMessage('No s’han pogut eliminar les fotos.');
    } finally {
      setIsUploadingPhotos(false);
    }
  };

  const handleSyncDrivePhotos = async (customFolderId?: string) => {
    try {
      setIsSyncingDrivePhotos(true);
      const session = await signInWithGoogleDrive();
      if (!session) return;
      const { user, accessToken } = session;
      if (user?.email) {
        setDriveUserEmail(user.email);
      }
      const targetFolderId = customFolderId || driveFolderId || '';
      if (!targetFolderId.trim()) throw new Error('Cal indicar una carpeta de Drive.');
      localStorage.setItem('evaluo_drive_folder_id', targetFolderId);

      const result = await downloadStudentPhotoFiles(targetFolderId, accessToken);
      await handleUploadLocalPhotos(result.files, result.files.length ? result.errors : [...result.errors, 'No s’han trobat fotos compatibles a la carpeta.']);
    } catch (err: any) {
      console.error('Error sincronitzant fotos de Drive:', err);
      alert(`No s'ha pogut connectar amb Google Drive (${err.message || 'Error de permisos o finestra emergent'}). Recomanació: utilitza l'opció "Seleccionar i Pujar Fotos de l'Ordinador" a continuació.`);
    } finally {
      setIsSyncingDrivePhotos(false);
    }
  };

  const [registerPreview, setRegisterPreview] = useState<{
    title: string;
    updated: string[];
    created: string[];
    unmatched: string[];
  } | null>(null);
  const registerPreviewRef = useRef<((apply: boolean) => void) | null>(null);

  const applyRegisterPreview = async (title: string, records: any[], before: any[], unmatched: string[]) => {
    if (registerPreviewRef.current) return false;
    const previous = new Map(before.map(student => [student.id, student]));
    const unique = [...new Map(records.map(student => [student.id, student])).values()];
    const changed = unique.filter(student => JSON.stringify(previous.get(student.id)) !== JSON.stringify(student));
    const label = (student: any) => student.info.course
      ? `${student.info.name} · ${student.info.course}` : student.info.name;
    const describeUpdate = (student: any) => {
      const old = previous.get(student.id);
      if (title === 'Velocitat lectora' && old.metrics?.readingSpeed !== student.metrics?.readingSpeed) {
        const prior = old.metrics?.readingSpeed || 'sense registre';
        return `${label(student)} · ${prior} → ${student.metrics.readingSpeed} ppm`;
      }
      if (title === 'Planeta Blau' && old.info?.course !== student.info.course) {
        return `${label(student)} · curs anterior: ${old.info?.course || 'sense curs'}`;
      }
      return label(student);
    };
    const approved = await new Promise<boolean>(resolve => {
      registerPreviewRef.current = resolve;
      setRegisterPreview({
        title,
        updated: changed.filter(student => previous.has(student.id)).map(describeUpdate),
        created: changed.filter(student => !previous.has(student.id)).map(label),
        unmatched: [...new Set(unmatched)],
      });
    });
    if (!approved) return false;
    await db.transaction('rw', db.students, async () => {
      const current = await db.students.bulkGet(changed.map(student => student.id));
      if (changed.some((student, index) =>
        JSON.stringify(previous.get(student.id)) !== JSON.stringify(current[index]))) {
        throw new Error('La llista ha canviat durant la revisió. Torna a obrir el fitxer.');
      }
      await db.students.bulkPut(changed);
    });
    return true;
  };

  const finishRegisterPreview = (apply: boolean) => {
    const resolve = registerPreviewRef.current;
    registerPreviewRef.current = null;
    setRegisterPreview(null);
    resolve?.(apply);
  };

  const handleImportMathCSV = async (csvText: string) => {
    if (registerPreviewRef.current) return;
    try {
      const staged: any[] = [];
      const unmatched: string[] = [];
      const parsedRecords = parseMathRegisterCSV(csvText);
      if (parsedRecords.length === 0) {
        throw new Error("No s'han trobat files d'alumnes vàlides al registre de matemàtiques.");
      }

      // Assegurem que el grup 4t B existeix
      let currentGroups = [...groups];
      let targetGroup = currentGroups.find(g => g.name === '4t B' || g.id === 'G_4B');
      if (!targetGroup) {
        targetGroup = { id: 'G_4B', name: '4t B' };
        currentGroups = [...currentGroups, targetGroup];
      }

      const allDbStudents = await db.students.toArray();
      let updatedCount = 0;
      let createdCount = 0;

      const targetGroupId = targetGroup.id;
      const targetTrimester = 1; // El registre correspon a T1

      for (const rec of parsedRecords) {
        // Cerquem coincidència exacta o per nom similar
        let existing = allDbStudents.find(s => 
          (s.info?.groupId || s.groupId) === targetGroupId &&
          (s.info?.name?.toLowerCase().trim() === rec.name.toLowerCase().trim() ||
           s.info?.name?.toLowerCase().trim() === rec.rawName.toLowerCase().trim())
        );

        if (!existing) {
          // Si no existeix al grup, provem de trobar-lo per nom a qualsevol grup
          existing = allDbStudents.find(s => 
            s.info?.name?.toLowerCase().trim() === rec.name.toLowerCase().trim() ||
            s.info?.name?.toLowerCase().trim() === rec.rawName.toLowerCase().trim()
          );
        }

        if (existing) {
          // Actualitzem les etiquetes de matemàtiques del T1 preservant la resta de dades
          const trimesters = existing.trimesters || {};
          const t1Data = trimesters[targetTrimester] || { content: { tags: [] }, state: {} };
          const existingTags: string[] = t1Data.content?.tags || [];

          // Filtrem qualsevol opció prèvia de matemàtiques que pogués tenir
          const cleanTags = existingTags.filter(t => !rec.tags.some(newTag => newTag === t));
          const mergedTags = [...cleanTags, ...rec.tags];
          const mathPatch = rec.mathRegister ? { mathRegister: rec.mathRegister } : {};

          const updatedStudent = {
            ...existing,
            content: targetTrimester === selectedTrimester 
              ? { ...existing.content, tags: [...(existing.content?.tags || []).filter(t => !rec.tags.includes(t)), ...rec.tags], ...mathPatch }
              : existing.content,
            trimesters: {
              ...trimesters,
              [targetTrimester]: {
                ...t1Data,
                content: {
                  ...(t1Data.content || {}),
                  tags: mergedTags,
                  ...mathPatch
                }
              }
            }
          };

          staged.push(JSON.parse(JSON.stringify(updatedStudent)));
          updatedCount++;
        } else {
          // Si és un alumne nou, el creem
          const newStudent = createStudent({
            id: `st_4b_${rec.num}_${Date.now()}`,
            groupId: targetGroupId,
            info: {
              name: rec.name,
              gender: 'Masculí',
              isPI: false,
              order: rec.num,
              groupId: targetGroupId
            },
            content: {
              tags: rec.tags,
              ...(rec.mathRegister ? { mathRegister: rec.mathRegister } : {}),
              nuances: {},
              anecdote: '',
              manualObservations: [],
              selfAssessment: ''
            },
            state: { status: 'idle', generatedReport: '' }
          }, targetTrimester);

          staged.push(JSON.parse(JSON.stringify(newStudent)));
          createdCount++;
        }
      }

      // Recarreguem la llista d'alumnes sincronitzada
      if (!(await applyRegisterPreview('Matemàtiques', staged, allDbStudents, unmatched))) return;
      setGroups(currentGroups);
      localStorage.setItem('evaluo_groups', JSON.stringify(currentGroups));
      const refreshed = await db.students.toArray();
      const sorted = refreshed.map(s => createStudent(s, selectedTrimester)).sort((a, b) => (a.info.order || 0) - (b.info.order || 0));
      setStudents(sorted);
      setActiveGroupId(targetGroupId);

      setImportNotification({
        type: 'success',
        message: `Registre de matemàtiques sincronitzat: ${updatedCount} alumnes actualitzats i ${createdCount} creats.`
      });
      setTimeout(() => setImportNotification(null), 5000);
    } catch (err: any) {
      setImportNotification({
        type: 'error',
        message: `Error en carregar l'Excel de matemàtiques: ${err.message}`
      });
      setTimeout(() => setImportNotification(null), 6000);
    }
  };

  const handleImportEspaisFile = async (fileData: ArrayBuffer) => {
    if (registerPreviewRef.current) return;
    try {
      const staged: any[] = [];
      const unmatched: string[] = [];
      const result = parseEspaisRegister(fileData);
      if (result.detectedRoundsCount === 0) {
        setImportNotification({
          type: 'error',
          message: "No s'han trobat alumnes assignats a Planeta Blau o a Cristian en aquest fitxer d'Espais."
        });
        setTimeout(() => setImportNotification(null), 6000);
        return;
      }

      let currentGroups = [...groups];
      let updatedCount = 0;
      let createdCount = 0;
      const allDbStudents = await db.students.toArray();

      for (const round of result.rounds) {
        if (!round.students || round.students.length === 0) continue;

        // Migrem o actualitzem noms antics ("Planeta Blau - R1", "Ronda 1") cap a "Planeta 1", "Planeta 2"
        const existingGroupIndex = currentGroups.findIndex(g => 
          g.id === round.groupId || 
          g.id === `G_PB_R${round.roundNumber}` ||
          g.name === `Planeta Blau - R${round.roundNumber}` ||
          g.name === `Ronda ${round.roundNumber}` ||
          g.name === round.groupName
        );

        if (existingGroupIndex !== -1) {
          currentGroups[existingGroupIndex] = { id: round.groupId, name: round.groupName };
        } else {
          currentGroups = [...currentGroups, { id: round.groupId, name: round.groupName }];
        }

        for (const student of round.students) {
          const existing = allDbStudents.find(s => 
            ((s.info?.groupId || s.groupId) === round.groupId || (s.info?.groupId || s.groupId) === `G_PB_R${round.roundNumber}`) &&
            (
              s.info?.name?.toLowerCase().trim() === student.name.toLowerCase().trim() ||
              s.info?.name?.toLowerCase().trim().startsWith(student.name.toLowerCase().split(' ').slice(0, 2).join(' '))
            )
          );

          if (existing) {
            const updatedStudent = {
              ...existing,
              groupId: round.groupId,
              info: {
                ...existing.info,
                name: student.name,
                course: student.course || existing.info.course,
                order: student.order,
                groupId: round.groupId
              }
            };
            staged.push(JSON.parse(JSON.stringify(updatedStudent)));
            updatedCount++;
          } else {
            const newStudent = createStudent({
              id: `st_pb_r${round.roundNumber}_${student.order}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              groupId: round.groupId,
              info: {
                name: student.name,
                gender: student.gender,
                isPI: false,
                course: student.course,
                order: student.order,
                groupId: round.groupId
              },
              content: {
                tags: [],
                nuances: {},
                anecdote: '',
                manualObservations: [],
                selfAssessment: '',
                planetaBlau: { narrative: '' }
              },
              state: { status: 'idle', generatedReport: '' }
            }, selectedTrimester);

            staged.push(JSON.parse(JSON.stringify(newStudent)));
            createdCount++;
          }
        }
      }

      if (!(await applyRegisterPreview('Planeta Blau', staged, allDbStudents, unmatched))) return;
      setGroups(currentGroups);
      localStorage.setItem('evaluo_groups', JSON.stringify(currentGroups));

      const refreshed = await db.students.toArray();
      const sorted = refreshed.map(s => createStudent(s, selectedTrimester)).sort((a, b) => (a.info.order || 0) - (b.info.order || 0));
      setStudents(sorted);

      if (result.rounds.length > 0) {
        setActiveGroupId(result.rounds[0].groupId);
        setActiveEspaiRoundPreview(result.rounds[0].roundNumber);
      }

      setEspaisSummaryModal(result);
      setImportNotification({
        type: 'success',
        message: `Planeta Blav carregat: ${result.detectedRoundsCount} rondes de Christian (${result.totalStudents} alumnes ordenats estrictament de 4º A a 6º B).`
      });
      setTimeout(() => setImportNotification(null), 6000);
    } catch (err: any) {
      console.error("Error en importar espais:", err);
      setImportNotification({
        type: 'error',
        message: `Error en processar el registre d'Espais: ${err.message}`
      });
      setTimeout(() => setImportNotification(null), 6000);
    }
  };

  const handleImportConferenceFile = async (fileData: ArrayBuffer | string) => {
    if (registerPreviewRef.current) return;
    try {
      const staged: any[] = [];
      const unmatched: string[] = [];
      const result = parseConferenceRegister(fileData);
      if (result.records.length === 0) {
        throw new Error("No s'han trobat files d'alumnes vàlides al registre de conferències.");
      }

      let currentGroups = [...groups];
      let targetGroup = currentGroups.find(g => g.name === '4t B' || g.id === 'G_4B') || currentGroups[0] || { id: 'G_4B', name: '4t B' };
      const targetGroupId = targetGroup.id;

      const allDbStudents = await db.students.toArray();
      let updatedCount = 0;
      let createdCount = 0;

      for (const rec of result.records) {
        const recClean = rec.name.toLowerCase().trim();
        const recRaw = rec.rawName.toLowerCase().trim();

        let existing = allDbStudents.find(s => {
          const sName = (s.info?.name || '').toLowerCase().trim();
          return sName === recClean || sName === recRaw ||
            (recClean.length > 3 && sName.includes(recClean)) ||
            (sName.length > 3 && recClean.includes(sName));
        });

        const targetTrimester = rec.trimester || 1;

        if (existing) {
          const trimesters = existing.trimesters || {};
          const existingTrimesterData = trimesters[targetTrimester] || { content: { tags: [] }, state: {} };

          const updatedStudent = {
            ...existing,
            content: targetTrimester === selectedTrimester 
              ? { ...(existing.content || {}), conference: rec }
              : existing.content,
            trimesters: {
              ...trimesters,
              [targetTrimester]: {
                ...existingTrimesterData,
                content: {
                  ...(existingTrimesterData.content || {}),
                  conference: rec
                }
              }
            }
          };

          staged.push(JSON.parse(JSON.stringify(updatedStudent)));
          updatedCount++;
        } else {
          const newStudent = createStudent({
            id: `st_conf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            groupId: targetGroupId,
            info: {
              name: rec.name,
              gender: rec.nameArticle?.toLowerCase() === 'la' ? 'Femení' : 'Masculí',
              isPI: false,
              groupId: targetGroupId
            },
            content: {
              tags: [],
              nuances: {},
              anecdote: '',
              manualObservations: [],
              selfAssessment: '',
              conference: rec
            },
            trimesters: {
              [targetTrimester]: {
                content: {
                  tags: [],
                  nuances: {},
                  conference: rec
                },
                state: { status: 'idle', generatedReport: '' }
              }
            },
            state: { status: 'idle', generatedReport: '' }
          }, selectedTrimester);

          staged.push(JSON.parse(JSON.stringify(newStudent)));
          createdCount++;
        }
      }

      if (!(await applyRegisterPreview('Conferències', staged, allDbStudents, unmatched))) return;
      const refreshed = await db.students.toArray();
      const sorted = refreshed.map(s => createStudent(s, selectedTrimester)).sort((a, b) => (a.info.order || 0) - (b.info.order || 0));
      setStudents(sorted);

      setImportNotification({
        type: 'success',
        message: `Registre de conferències sincronitzat: ${result.completedCount} conferències completades (T1: ${result.trimesterCounts[1] || 0}, T2: ${result.trimesterCounts[2] || 0}, T3: ${result.trimesterCounts[3] || 0}) i ${result.pendingCount} pendents.`
      });
      setTimeout(() => setImportNotification(null), 6000);
    } catch (err: any) {
      console.error("Error en importar conferències:", err);
      setImportNotification({
        type: 'error',
        message: `Error en processar el registre de conferències: ${err.message}`
      });
      setTimeout(() => setImportNotification(null), 6000);
    }
  };

  const handleImportReadingFile = async (file: File) => {
    if (registerPreviewRef.current) return;
    try {
      const staged: any[] = [];
      const unmatched: string[] = [];
      const result = await parseReadingDocument(file);
      if (!result.records || result.records.length === 0) {
        throw new Error("No s'han trobat files d'alumnes vàlides al document de velocitat lectora.");
      }

      const allDbStudents = await db.students.toArray();
      let updatedCount = 0;

      for (const rec of result.records) {
        const recClean = rec.name.toLowerCase().trim();
        const recRaw = rec.rawName.toLowerCase().trim();

        const existing = allDbStudents.find(s => {
          const sName = (s.info?.name || '').toLowerCase().trim();
          return sName === recClean || sName === recRaw ||
            (recClean.length > 2 && (sName.startsWith(recClean) || sName.includes(recClean))) ||
            (sName.length > 2 && recClean.includes(sName));
        });

        if (existing) {
          const trimesters = existing.trimesters || {};
          const currentTrimesterData = trimesters[selectedTrimester] || { content: { tags: [] }, state: {} };

          const updatedMetrics = {
            ...(existing.metrics || {}),
            readingSpeed: rec.wpm,
            readingErrors: rec.errors,
            readingCompText: rec.comp,
            readingDate: rec.date || "oct' 26",
            readingLevelTag: rec.levelTag
          };

          const readingPayload = {
            wpm: rec.wpm,
            errors: rec.errors,
            comp: rec.comp,
            date: rec.date || "oct' 26",
            levelTag: rec.levelTag
          };

          const updatedStudent = {
            ...existing,
            metrics: updatedMetrics,
            content: {
              ...(existing.content || {}),
              reading: readingPayload
            },
            trimesters: {
              ...trimesters,
              [selectedTrimester]: {
                ...currentTrimesterData,
                content: {
                  ...(currentTrimesterData.content || {}),
                  reading: readingPayload
                }
              }
            }
          };

          staged.push(JSON.parse(JSON.stringify(updatedStudent)));
          updatedCount++;
        } else { unmatched.push(rec.name); }
      }

      if (!(await applyRegisterPreview('Velocitat lectora', staged, allDbStudents, unmatched))) return;
      const refreshed = await db.students.toArray();
      const sorted = refreshed.map(s => createStudent(s, selectedTrimester)).sort((a, b) => (a.info.order || 0) - (b.info.order || 0));
      setStudents(sorted);
      studentsRef.current = sorted;

      setImportNotification({
        type: 'success',
        message: `Registre de velocitat lectora (${file.name}) processat amb èxit: ${updatedCount} alumnes sincronitzats.`
      });
      setTimeout(() => setImportNotification(null), 6000);
    } catch (err: any) {
      console.error("Error en importar registre de lectura:", err);
      setImportNotification({
        type: 'error',
        message: `Error en processar el document de velocitat lectora: ${err.message}`
      });
      setTimeout(() => setImportNotification(null), 6000);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      await updateQueueRef.current;
      await initDB();
      const allStudents = await db.students.toArray();
      if (cancelled) return;
      const activeRubrics = getRubricsForTrimester(selectedTrimester);
      
      const oldText = "S'ha detectat una certa fluctuació en els resultats de les activitats de comprensió lectora; tot i que demostra capacitats per a una bona interpretació, encara li manca estabilitat per mantenir un nivell d'èxit constant en diferents contextos lectors.";
      const newText = "S'ha detectat una certa irregularitat en els resultats de les activitats de comprensió lectora; tot i que demostra capacitats per a una bona interpretació, encara li manca estabilitat per mantenir un nivell d'èxit constant en diferents contextos lectors.";
      
      const loaded = allStudents.map(s => {
        let student = createStudent(s, selectedTrimester);

        if (student.content?.nuances?.['l_comp_lect'] === oldText) {
          student.content.nuances['l_comp_lect'] = newText;
        }

        // Auto-curació de tags per garantir que cap rúbrica es buidi per canvis de redacció
        const originalTags = student.content?.tags || [];
        const healedTags = healStudentTags(originalTags, activeRubrics, student.info?.name);

        if (JSON.stringify(originalTags) !== JSON.stringify(healedTags)) {
          student = {
            ...student,
            content: {
              ...student.content,
              tags: healedTags
            },
            trimesters: {
              ...(student.trimesters || {}),
              [selectedTrimester]: {
                ...(student.trimesters?.[selectedTrimester] || {}),
                content: {
                  ...(student.trimesters?.[selectedTrimester]?.content || {}),
                  tags: healedTags
                }
              }
            }
          };
        }

        return student;
      });

      let currentStudents = loaded;
      const savedGroups = localStorage.getItem('evaluo_groups');
      let currentGroups: any[] = [];
      if (savedGroups) {
        try { currentGroups = JSON.parse(savedGroups) || []; } catch(e) { currentGroups = []; }
      }

      const sorted = currentStudents.sort((a, b) => (a.info.order || 0) - (b.info.order || 0));
      setStudents(sorted);
      setGroups(currentGroups);
    };
    loadData();
    return () => { cancelled = true; };
  }, [selectedTrimester]);

  const studentsRef = useRef<any[]>(students);
  useEffect(() => {
    studentsRef.current = students;
  }, [students]);

  // Cua per garantir que les escriptures consecutives a Dexie mantinguin l'ordre i no es perdin
  const updateQueueRef = useRef<Promise<any>>(Promise.resolve());

  const handleUpdateStudentField = useCallback((id: string, change: any): Promise<any> => {
    if (!id) return Promise.resolve();

    const task = updateQueueRef.current.then(async () => {
      const currentList = studentsRef.current;
      const index = currentList.findIndex(s => String(s.id) === String(id));
      if (index === -1) return null;

      const oldStudent = createStudent(currentList[index], selectedTrimester);
      const updates = typeof change === 'function' ? change(oldStudent) : change;
      const mergedData = { 
        ...oldStudent, 
        ...updates,
        _isUpdate: true,
        info: updates.info ? { ...oldStudent.info, ...updates.info } : oldStudent.info,
        content: updates.content ? { ...oldStudent.content, ...updates.content } : oldStudent.content,
        state: updates.state ? { ...oldStudent.state, ...updates.state } : oldStudent.state
      };

      const updatedStudent = createStudent(mergedData, selectedTrimester);
      const cleanStudent = JSON.parse(JSON.stringify(updatedStudent));
      const photoChanged = oldStudent.info?.photoUrl !== updatedStudent.info.photoUrl ||
        JSON.stringify(oldStudent.info?.photoCrop) !== JSON.stringify(updatedStudent.info.photoCrop);
      const related = new Set<string>();
      if (photoChanged) {
        const identities = studentMemberships(currentList, groups);
        const identity = identities.get(String(id));
        for (const [member, key] of identities) {
          if (key === identity && member !== String(id)) related.add(member);
        }
      }
      const photoUrl = updatedStudent.info.photoUrl;
      const photoCrop = updatedStudent.info.photoCrop;

      // 1. Persistència real i comprovada a la base de dades
      await db.transaction('rw', db.students, async () => {
        await db.students.put(cleanStudent);
        for (const member of currentList) if (related.has(String(member.id))) {
          await db.students.update(member.id, { 'info.photoUrl': photoUrl, 'info.photoCrop': photoCrop });
        }
      });

      // 2. Sincronització immediata del ref i de l'estat de React
      const updateRecords = (list: typeof currentList) => list.map(student => String(student.id) === String(id)
        ? updatedStudent : related.has(String(student.id))
          ? { ...student, info: { ...student.info, photoUrl, photoCrop } } : student);
      studentsRef.current = updateRecords(studentsRef.current);
      setStudents(updateRecords);

      return updatedStudent;
    });

    // Encadenem el manejador d'error per no bloquejar la cua en fallades futures
    updateQueueRef.current = task.catch((err) => {
      console.error("Error en persistència de l'alumne:", err);
      setImportNotification({
        type: 'error',
        message: "No s'ha pogut desar el canvi de l'alumne. Torna-ho a provar abans de tancar l'aplicació.",
      });
      // Retornem null per mantenir la cua activa
      return null;
    });

    return task;
  }, [selectedTrimester, groups]);

  const handleRemoveStudentGlobal = useCallback(async (id: string) => {
    if (!id) return;
    const studentName = students.find(s => String(s.id) === String(id))?.info?.name || "aquest alumne";
    
    if (confirm(`Segur que vols eliminar permanentment a ${studentName}?`)) {
        try {
            // ELIMINACIÓN REAL: Primero en DB, luego en estado
            await db.students.delete(id);
            setStudents(prev => prev.filter(s => String(s.id) !== String(id)));
            if (selectedStudentId === id) setSelectedStudentId(null);
        } catch (err) {
            console.error("Error al eliminar alumno:", err);
            alert("No s'ha pogut eliminar l'alumne de la base de dades.");
        }
    }
  }, [students, selectedStudentId]);

  const handleDeleteGroup = async (groupId: string) => {
    try {
        const studentsToDelete = students.filter(s => (s.info?.groupId || s.groupId) === groupId);
        for (const s of studentsToDelete) {
            await db.students.delete(s.id);
        }
        setStudents(prev => prev.filter(s => (s.info?.groupId || s.groupId) !== groupId));
        const updatedGroups = groups.filter(g => g.id !== groupId);
        setGroups(updatedGroups);
        localStorage.setItem('evaluo_groups', JSON.stringify(updatedGroups));
        if (activeGroupId === groupId) setActiveGroupId('ALL');
        setShowDeleteClassConfirm(null);
    } catch (err) {
        console.error("Error al eliminar clase:", err);
    }
  };

  const handleAddStudentAction = (s: any) => {
    const targetGroup = activeGroupId === 'ALL' ? (groups[0]?.id || 'G1') : activeGroupId;
    const maxOrder = students.length > 0 ? Math.max(...students.map(st => st.info.order || 0)) : 0;
    const st = createStudent({ ...s, info: { ...s.info, groupId: targetGroup, order: maxOrder + 1 } }, selectedTrimester);
    db.students.put(JSON.parse(JSON.stringify(st))).then(() => {
        setStudents(prev => [...prev, st]);
        setSelectedStudentId(st.id); 
        setViewMode('individual');
        setShowAddStudentModal(false);
    });
  };

  const handleBulkImport = (list: any[]) => {
    const targetGroup = activeGroupId === 'ALL' ? (groups[0]?.id || 'G1') : activeGroupId;
    const maxOrder = students.length > 0 ? Math.max(...students.map(st => st.info.order || 0)) : 0;
    const listWithOrder = list.map((s, idx) => createStudent({ ...s, info: { ...s.info, groupId: targetGroup, order: maxOrder + idx + 1 } }, selectedTrimester));
    const puts = listWithOrder.map(s => db.students.put(JSON.parse(JSON.stringify(s))));
    Promise.all(puts).then(() => {
        setStudents(prev => [...prev, ...listWithOrder]);
        setShowAddStudentModal(false);
    });
  };

  const handleImportJSON = async (jsonData: any) => {
    try {
      const extras = parseSessionExtras(jsonData);
      let rawList: any[] = [];
      let groupsToImport: any[] = [];
      if (Array.isArray(jsonData)) {
        rawList = jsonData;
      } else if (jsonData && typeof jsonData === 'object' && Array.isArray(jsonData.students)) {
        rawList = jsonData.students;
        groupsToImport = Array.isArray(jsonData.groups) ? jsonData.groups : [];
      } else {
        throw new Error("Format no reconegut. El fitxer ha de contenir una llista d'alumnes o un objecte amb 'students'.");
      }

      if (!extras && rawList.length === 0) {
        throw new Error("El fitxer no conté cap alumne per importar.");
      }

      // 1. Validem i preparem primer TOTS els alumnes en memòria abans de modificar la base de dades
      const validated = rawList.map((s, idx) => {
        if (!s || typeof s !== 'object' || (extras && (!s.id || !s.info?.name))) {
          throw new Error(`Alumne no vàlid a la posició ${idx + 1}.`);
        }
        const created = createStudent({ ...structuredClone(s), info: { ...s.info, order: s.info?.order ?? idx } }, selectedTrimester);
        if (!created.id || !created.info?.name) {
          throw new Error(`Dades incompletes o nom no vàlid a l'alumne de la posició ${idx + 1}.`);
        }
        return extras ? s : JSON.parse(JSON.stringify(created));
      });

      // 2. Curació de grups (Group healing): Si els alumnes referencien un groupId que no és a groups,
      // el creem automàticament perquè cap alumne quedi orfe en la navegació.
      const existingGroupIds = new Set(groupsToImport.map(g => g.id));
      const healedGroups = [...groupsToImport];
      validated.forEach(s => {
        const gid = s.info?.groupId || s.groupId;
        if (gid && gid !== 'ALL' && !existingGroupIds.has(gid)) {
          existingGroupIds.add(gid);
          healedGroups.push({ id: gid, name: `Grup ${gid}` });
        }
      });

      // 3. Obrir modal de confirmació i previsualització abans de tocar la base de dades
      setImportPreviewData({
        students: validated,
        groups: healedGroups,
        rawCount: validated.length,
        classesCount: healedGroups.length,
        extras,
      });
      setShowAddStudentModal(false);
    } catch (e: any) { 
      setImportNotification({ type: 'error', message: "Error en analitzar el fitxer: " + e.message });
      setTimeout(() => setImportNotification(null), 5000);
    }
  };

  const commitTransactionalImport = async () => {
    if (!importPreviewData) return;
    try {
      const { students: validated, groups: healedGroups, extras } = importPreviewData;
      const restoredTrimester = Number(extras?.preferences.evaluo_trimester);
      const trimester = [1, 2, 3].includes(restoredTrimester) ? restoredTrimester : selectedTrimester;
      const sortedStudents = validated.map(student => createStudent(structuredClone(student), trimester))
        .sort((a, b) => (a.info.order || 0) - (b.info.order || 0));
      await updateQueueRef.current;
      await restoreSession(validated, healedGroups, extras);
      studentsRef.current = sortedStudents;
      setStudents(sortedStudents);
      setGroups(healedGroups);
      setSelectedTrimester(trimester);
      setSelectedStudentId(null);
      setActiveGroupId('ALL');
      setViewMode('aula');
      if (extras) setDriveFolderId(extras.preferences.evaluo_drive_folder_id || import.meta.env.VITE_DRIVE_PHOTO_FOLDER || '');

      setImportPreviewData(null);
      setImportNotification({ 
        type: 'success', 
        message: `Importació completada amb èxit: ${validated.length} alumnes i ${healedGroups.length} classes actualitzades.` 
      });
      setTimeout(() => setImportNotification(null), 4000);
    } catch (err: any) {
      setImportPreviewData(null);
      setImportNotification({ 
        type: 'error', 
        message: `Error durant la transacció d'importació: ${err.message}. Les dades anteriors s'han mantingut intactes.` 
      });
      setTimeout(() => setImportNotification(null), 6000);
    }
  };

  const handleExportSession = async () => {
    try {
      await updateQueueRef.current;
      const sessionData = await exportSession(groups);
      const url = URL.createObjectURL(new Blob([JSON.stringify(sessionData)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `evaluo_sessio_${sessionData.exportDate.split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      if (sessionData.unavailablePhotos) {
        setImportNotification({
          type: 'error',
          message: `Còpia descarregada. ${sessionData.unavailablePhotos} fotos temporals ja no són accessibles. Torna a carregar-les abans d’exportar si les vols recuperar en un altre navegador.`,
        });
      }
    } catch (error) {
      setImportNotification({ type: 'error', message: `No s’ha pogut crear la còpia: ${error instanceof Error ? error.message : String(error)}` });
    }
  };

  const handleMoveStudent = async (id: string, direction: 'up' | 'down') => {
    const index = students.findIndex(s => String(s.id) === String(id));
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= students.length) return;
    const newStudents = [...students];
    const currentOrder = newStudents[index].info.order;
    newStudents[index].info.order = newStudents[targetIndex].info.order;
    newStudents[targetIndex].info.order = currentOrder;
    await db.students.put(JSON.parse(JSON.stringify(newStudents[index])));
    await db.students.put(JSON.parse(JSON.stringify(newStudents[targetIndex])));
    setStudents([...newStudents].sort((a, b) => (a.info.order || 0) - (b.info.order || 0)));
  };

  const handleDragEndGroups = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setGroups((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const newGroups = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem('evaluo_groups', JSON.stringify(newGroups));
        return newGroups;
      });
    }
  };

  const handleGenerateReport = async (studentId: string, customConfig?: any) => {
    const student = students.find(s => String(s.id) === String(studentId));
    if (!student) return;
    const currentStudent = await handleUpdateStudentField(studentId, { state: { status: 'generating' } });
    if (!currentStudent) return;
    try {
      const res = await executeGenerateReport(
        currentStudent,
        { ...(customConfig || { styleLevel: 0.5, intensityLevel: 0 }), forceRegenerate: true }, 
        selectedTrimester
      );
      const reportText = typeof res === 'string' ? res : (res?.text || "");
      const fingerprint = typeof res === 'object' && res?.fingerprint ? res.fingerprint : undefined;
      await handleUpdateStudentField(studentId, { 
        state: { 
          status: 'completed', 
          generatedReport: reportText,
          reportFingerprint: fingerprint || student.state?.reportFingerprint,
          lastModified: new Date().toISOString()
        } 
      });
      return reportText;
    } catch (err: any) { 
      console.error("Error al generar informe per a l'alumne:", err);
      await handleUpdateStudentField(studentId, { state: { status: 'error' } });
      setImportNotification({
        type: 'error',
        message: `Error en generar informe: ${err?.message || "Error desconegut"}`
      });
      setTimeout(() => setImportNotification(null), 6000);
      throw err;
    }
  };

  const handleEditStudentWithTab = (id: string, tab: string = 'personalitat') => {
    setSelectedStudentId(id);
    setInitialTab(tab);
    setViewMode('individual');
  };

  const activeStudent = students.find(s => String(s.id) === String(selectedStudentId));

  return (
    <div className="flex h-screen bg-warm-50 font-sans text-slate-900 overflow-hidden">
      <aside className={`bg-white border-r border-warm-200 shadow-2xl transition-all duration-300 flex flex-col shrink-0 no-print z-50 h-full ${isSidebarOpen ? 'w-[200px]' : 'w-16'}`}>
         <div className="px-3 border-b border-warm-100 flex justify-between items-center h-14 shrink-0">
            {isSidebarOpen ? (
                <div className="flex items-center justify-between w-full">
                    <Logo onReset={() => setShowResetConfirm(true)} />
                    <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 text-slate-300 hover:text-primary-900 hover:bg-warm-50 rounded-lg transition-all"><PanelLeftClose className="w-4 h-4" /></button>
                </div>
            ) : (
                <button onClick={() => setIsSidebarOpen(true)} className="mx-auto p-1.5 text-slate-300 hover:text-primary-900 hover:bg-warm-50 rounded-lg transition-all"><PanelLeftOpen className="w-5 h-5" /></button>
            )}
         </div>
         <div className="flex-1 overflow-y-auto p-3 space-y-6 no-scrollbar bg-warm-50/10">
            <button onClick={() => { setActiveGroupId('ALL'); setViewMode('aula'); setSelectedStudentId(null); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-bold text-[10px] ${activeGroupId === 'ALL' && viewMode === 'aula' ? 'bg-primary-900 text-white shadow-xl' : 'text-slate-400 hover:bg-warm-100'}`}>
                <LayoutDashboard className="w-4 h-4" /> {isSidebarOpen && "Vista General"}
            </button>
            <div className="h-px bg-warm-200 mx-2"></div>
            {isSidebarOpen && <p className="text-[9px] font-black text-warm-500 uppercase tracking-widest px-3">Classes</p>}
            <div className="space-y-1">
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEndGroups}
              >
                <SortableContext 
                  items={groups.map(g => g.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {groups.map(g => (
                    <SortableGroupItem 
                      key={g.id}
                      g={g}
                      isSidebarOpen={isSidebarOpen}
                      activeGroupId={activeGroupId}
                      viewMode={viewMode}
                      onSelect={(id: string) => { setActiveGroupId(id); setViewMode('aula'); setSelectedStudentId(null); }}
                      onDelete={(id: string) => setShowDeleteClassConfirm(id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
            <button onClick={() => setShowNewClassModal(true)} className="w-full flex items-center gap-3 px-3 py-2.5 border-2 border-dashed border-warm-300 rounded-xl text-warm-400 hover:text-primary-900 hover:border-primary-400 transition-all text-[9px] font-black uppercase tracking-widest"><Plus className="w-4 h-4" /> {isSidebarOpen && "Nova Classe"}</button>
         </div>
      </aside>

      <div className="flex-1 flex flex-col relative h-full overflow-hidden">
        <div className={`bg-white/95 backdrop-blur-xl border-b border-warm-200 transition-all duration-300 overflow-hidden shrink-0 z-40 shadow-sm flex flex-col ${isHeaderOpen ? 'h-14 opacity-100' : 'h-0 opacity-0'}`}>
            <header className="flex-1 flex items-center justify-between px-6 gap-6 no-print overflow-x-auto min-w-0">
                {/* Grup Esquerra: Vista i Trimestres */}
                <div className="flex items-center gap-3 shrink-0">
                    <div className="flex bg-warm-100 p-0.5 rounded-xl border border-warm-200 shadow-inner">
                        <button 
                            onClick={() => { setViewMode('aula'); setSelectedStudentId(null); }} 
                            className={`px-3.5 h-7 rounded-lg text-[9px] font-black uppercase transition-all flex items-center justify-center ${viewMode === 'aula' ? 'bg-white text-primary-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Vista Aula
                        </button>
                        <button 
                            onClick={() => { setViewMode('individual'); if(!selectedStudentId && students.length > 0) setSelectedStudentId(students[0].id); }} 
                            className={`px-3.5 h-7 rounded-lg text-[9px] font-black uppercase transition-all flex items-center justify-center ${viewMode === 'individual' ? 'bg-white text-primary-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Individual
                        </button>
                        <button type="button" onClick={() => { setViewMode('organitzacio'); setSelectedStudentId(null); }}
                            className={`px-3.5 h-7 rounded-lg text-[9px] font-black uppercase transition-all ${viewMode === 'organitzacio' ? 'bg-white text-primary-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                            Organització
                        </button>
                    </div>

                    <div className="h-5 w-px bg-warm-200 shrink-0" />

                    <div className="flex items-center gap-0.5 bg-warm-100 p-0.5 rounded-xl border border-warm-200 shadow-inner">
                      {[1, 2, 3].map((t) => (
                        <button
                          key={t}
                          onClick={() => {
                            setSelectedTrimester(t);
                            localStorage.setItem('evaluo_trimester', t.toString());
                          }}
                          className={`w-8 h-7 rounded-lg text-[9px] font-black uppercase transition-all flex items-center justify-center ${selectedTrimester === t ? 'bg-primary-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                          title={`Trimestre ${t}`}
                        >
                          T{t}
                        </button>
                      ))}
                    </div>
                </div>

                {/* Grup Dreta: Registres d'Aula i Accions de Sessió */}
                <div className="flex items-center gap-3 shrink-0">
                    <input type="file" ref={fileInputHeaderRef} className="hidden" accept=".json" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                                try { handleImportJSON(JSON.parse(ev.target?.result as string)); } catch(e) { alert("Format JSON invàlid."); }
                            };
                            reader.readAsText(file);
                            e.currentTarget.value = '';
                        }
                    }} />
                    <input type="file" ref={fileInputExcelRef} className="hidden" accept=".xlsx,.xls,.csv,.txt" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.currentTarget.value = '';
                        if (!file) return;
                        try {
                            await archiveSessionDocument(file, 'matematiques');
                            let csv: string;
                            if (/\.(xlsx|xls)$/i.test(file.name)) {
                                const XLSX = await import('xlsx');
                                const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
                                const name = workbook.SheetNames.find(n => n.trim() === 'Export Evalua Studio') || workbook.SheetNames.find(n => n.trim() === 'Registre Tram 1');
                                if (!name) throw new Error("No s'ha trobat la pestanya Export Evalua Studio ni Registre Tram 1.");
                                csv = XLSX.utils.sheet_to_csv(workbook.Sheets[name]);
                            } else {
                                csv = await file.text();
                            }
                            await handleImportMathCSV(csv);
                        } catch (err: any) {
                            setImportNotification({ type: 'error', message: `Error en llegir el registre de matemàtiques: ${err.message}` });
                            setTimeout(() => setImportNotification(null), 6000);
                        }
                    }} />
                    <input type="file" ref={fileInputEspaisRef} className="hidden" accept=".xlsx,.xls,.csv,.tsv,.txt" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                                const buffer = ev.target?.result as ArrayBuffer;
                                if (buffer) void archiveSessionDocument(file, 'espais').then(() => handleImportEspaisFile(buffer))
                                    .catch(() => setImportNotification({ type: 'error', message: 'No s’ha pogut arxivar el registre d’espais.' }));
                            };
                            reader.readAsArrayBuffer(file);
                            e.target.value = '';
                        }
                    }} />
                    <input type="file" ref={fileInputConferenceRef} className="hidden" accept=".xlsx,.xls,.csv,.tsv,.txt" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                                const buffer = ev.target?.result as ArrayBuffer;
                                if (buffer) void archiveSessionDocument(file, 'conferencies').then(() => handleImportConferenceFile(buffer))
                                    .catch(() => setImportNotification({ type: 'error', message: 'No s’ha pogut arxivar el registre de conferències.' }));
                            };
                            reader.readAsArrayBuffer(file);
                            e.target.value = '';
                        }
                    }} />
                    <input type="file" ref={fileInputReadingRef} className="hidden" accept=".docx,.pdf,.xlsx,.xls,.csv,.tsv,.txt" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                            void archiveSessionDocument(file, 'lectura').then(() => handleImportReadingFile(file))
                                .catch(() => setImportNotification({ type: 'error', message: 'No s’ha pogut arxivar el registre de lectura.' }));
                            e.target.value = '';
                        }
                    }} />

                    {/* Botons Estàndard de Registres d'Aula (mateixa mida i espaiat) */}
                    <div className="flex items-center gap-1 bg-warm-100 p-0.5 rounded-xl border border-warm-200 shadow-inner">
                        <button 
                            onClick={() => fileInputExcelRef.current?.click()} 
                            className="w-[74px] h-7 flex items-center justify-center gap-1.5 bg-white hover:bg-warm-50 text-slate-700 hover:text-primary-900 rounded-lg text-[9px] font-black uppercase tracking-wider border border-warm-200/80 transition-all shadow-xs shrink-0" 
                            title="Carregar registre d'avaluació de matemàtiques (Excel / CSV)"
                        >
                            <FileSpreadsheet className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>Mates</span>
                        </button>
                        <button 
                            onClick={() => fileInputEspaisRef.current?.click()} 
                            className="w-[74px] h-7 flex items-center justify-center gap-1.5 bg-white hover:bg-warm-50 text-slate-700 hover:text-primary-900 rounded-lg text-[9px] font-black uppercase tracking-wider border border-warm-200/80 transition-all shadow-xs shrink-0" 
                            title="Carregar registre d'Espais / Planeta Blau (Excel / CSV)"
                        >
                            <Sparkles className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>Planeta</span>
                        </button>
                        <button 
                            onClick={() => fileInputConferenceRef.current?.click()} 
                            className="w-[74px] h-7 flex items-center justify-center gap-1.5 bg-white hover:bg-warm-50 text-slate-700 hover:text-primary-900 rounded-lg text-[9px] font-black uppercase tracking-wider border border-warm-200/80 transition-all shadow-xs shrink-0" 
                            title="Carregar registre d'avaluació de conferències orals (Excel .xlsx o CSV)"
                        >
                            <Mic className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>Confe</span>
                        </button>
                        <button 
                            onClick={() => fileInputReadingRef.current?.click()} 
                            className="w-[74px] h-7 flex items-center justify-center gap-1.5 bg-white hover:bg-warm-50 text-slate-700 hover:text-primary-900 rounded-lg text-[9px] font-black uppercase tracking-wider border border-warm-200/80 transition-all shadow-xs shrink-0" 
                            title="Carregar registre de velocitat lectora i mecànica (Word .docx, PDF, Excel o CSV)"
                        >
                            <BookOpen className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>Lectura</span>
                        </button>
                    </div>

                    <div className="h-5 w-px bg-warm-200 shrink-0" />

                    {/* Accions Generals de Sessió */}
                    <button 
                        onClick={() => setShowDriveModal(true)} 
                        className="h-8 px-3 bg-white border border-warm-300 text-slate-700 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-warm-50 transition-all shadow-xs flex items-center gap-1.5 shrink-0"
                        title="Importar fotos des de l'ordinador o Google Drive"
                    >
                        <Cloud className="w-3.5 h-3.5 text-blue-500" />
                        <span>Fotos</span>
                    </button>
                    <button 
                        onClick={() => fileInputHeaderRef.current?.click()} 
                        className="h-8 px-3 bg-white border border-warm-300 text-slate-700 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-warm-50 transition-all shadow-xs flex items-center gap-1.5 shrink-0"
                        title="Importar sessió en format JSON"
                    >
                        <Upload className="w-3.5 h-3.5 text-slate-400" />
                        <span>Importar</span>
                    </button>
                    <button 
                        onClick={handleExportSession} 
                        className="h-8 px-3 bg-white border border-warm-300 text-slate-700 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-warm-50 transition-all shadow-xs flex items-center gap-1.5 shrink-0"
                        title="Exportar dades de la sessió en fitxer JSON"
                    >
                        <Download className="w-3.5 h-3.5 text-slate-400" />
                        <span>Exportar</span>
                    </button>
                    <button 
                        onClick={() => setShowAddStudentModal(true)} 
                        className="h-8 px-3.5 bg-primary-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md hover:bg-black transition-all flex items-center gap-1.5 shrink-0"
                        title="Afegir nou alumne a la classe"
                    >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Nou Alumne</span>
                    </button>
                </div>
            </header>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 top-0 z-[60] no-print">
            <button 
                onClick={() => setIsHeaderOpen(!isHeaderOpen)}
                className="bg-white border border-warm-200 border-t-0 rounded-b-xl px-4 py-1 text-slate-300 hover:text-primary-900 transition-all shadow-md flex items-center justify-center group"
            >
                {isHeaderOpen ? <ChevronUp className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" /> : <ChevronDown className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />}
            </button>
        </div>
        <main className="flex-1 bg-soft-pattern overflow-y-auto custom-scrollbar flex flex-col items-center">
            <div className="w-full h-full flex flex-col">
            {students.length === 0 && groups.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-0">
                    <div className="bg-white rounded-none border-0 shadow-2xl p-12 animate-fade-in w-full h-full flex flex-col justify-center">
                        <div className="max-w-4xl w-full mx-auto space-y-10">
                            <div className="text-center">
                                <h2 className="text-4xl font-black text-primary-900 mb-4 tracking-tight uppercase">Evaluo<span className="text-warm-500 font-light italic lowercase">studio</span></h2>
                                <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px] max-w-lg mx-auto leading-relaxed">Laboratori pedagògic d'IA <br /> dissenyat per Cristian Nadal.</p>
                            </div>
                            <div className="bg-warm-50/50 p-8 rounded-[2.5rem] border border-warm-200 shadow-inner">
                              <ProfileSelector 
                                  onSelect={handleAddStudentAction} 
                                  onImportJSON={handleImportJSON} 
                                  onBulkImport={handleBulkImport} 
                              />
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="w-full h-full flex flex-col">
                    {viewMode === 'organitzacio' && (
                        <ClassroomStudio students={students} groups={groups} activeGroupId={activeGroupId}
                            trimester={selectedTrimester}
                            peRubricAvailable={getRubricsForTrimester(selectedTrimester).some(rubric =>
                              rubric.id === 'ambit_fisica' && rubric.data.some(item => item.id === 'ef_habits'))}
                            onApplyPEEvidence={async entries => {
                              for (const entry of entries) {
                                const student = studentsRef.current.find(item => String(item.id) === entry.id);
                                if (!student) throw new Error('Perfil no disponible');
                                const nuances = student.content?.nuances || {};
                                if (!(await handleUpdateStudentField(entry.id, { content: { nuances: {
                                  ...nuances, ef_habits: mergeClothingEvidence(nuances.ef_habits, entry.text),
                                } } }))) throw new Error('Perfil no disponible');
                              }
                            }}
                            onImportPhotos={() => setShowDriveModal(true)}
                            onImportFiles={(files, groupId) => handleUploadLocalPhotos(files, files.length ? [] : ['No hi ha fotos compatibles a la carpeta.'], groupId)}
                            onUpdateSupportRole={(id, supportRole) => handleUpdateStudentField(id, { info: { supportRole } })}
                            onUpdatePhoto={(id, photo) => handleUpdateStudentField(id, { info: photo })} />
                    )}
                    <div className={viewMode === 'aula' ? 'flex-1 flex flex-col overflow-hidden' : 'hidden'}>
                        <BatchMode 
                            students={students} 
                            onRemoveStudentGlobal={handleRemoveStudentGlobal}
                            onMoveStudent={handleMoveStudent}
                            onUpdateStudentField={handleUpdateStudentField}
                            onGenerateReport={handleGenerateReport}
                            groups={groups} 
                            activeGroupId={activeGroupId} 
                            onEditStudentDetails={handleEditStudentWithTab} 
                            selectedStudentId={selectedStudentId}
                            setSelectedStudentId={setSelectedStudentId}
                            trimester={selectedTrimester}
                        />
                    </div>
                    <div className={viewMode === 'individual' ? 'flex-1 flex flex-col overflow-hidden' : 'hidden'}>
                        <div className="bg-white flex-1 flex flex-col overflow-hidden animate-slide-up">
                            <div className="flex-1 overflow-hidden">
                                {selectedStudentId ? (
                                    <MainForm 
                                        student={activeStudent} 
                                        initialTab={initialTab}
                                        trimester={selectedTrimester}
                                        onUpdateStudent={(updates: any) => handleUpdateStudentField(selectedStudentId, updates)} 
                                        onBack={() => {
                                            setViewMode('aula');
                                            setSelectedStudentId(null);
                                        }}
                                        onGenerateReport={(id: string, config: any) => handleGenerateReport(id || selectedStudentId, config)}
                                    />
                                ) : (
                                    <div className="flex-1 h-full flex items-center justify-center p-20 text-center opacity-40">
                                        <p className="font-black uppercase tracking-widest text-slate-400">Torna a la vista d'aula per seleccionar un alumne</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </main>
      </div>

      {showAddStudentModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-12 bg-primary-900/60 backdrop-blur-md animate-fade-in">
            <div className="bg-white rounded-[3rem] p-10 max-w-4xl w-full relative shadow-2xl border border-warm-200 overflow-y-auto max-h-[90vh] custom-scrollbar">
                <button onClick={() => setShowAddStudentModal(false)} className="absolute top-10 right-10 p-2 text-slate-300 hover:text-primary-900 transition-colors z-20"><X className="w-6 h-6" /></button>
                <div className="text-center mb-10">
                    <h2 className="text-2xl font-black text-primary-900 uppercase tracking-tight">Afegir Alumne</h2>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] mt-2">Tria com vols començar la fitxa</p>
                </div>
                <ProfileSelector 
                    onSelect={handleAddStudentAction} 
                    onImportJSON={handleImportJSON} 
                    onBulkImport={handleBulkImport} 
                />
            </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowAiSettings(true)}
        aria-label="Configuració d’IA"
        aria-haspopup="dialog"
        aria-expanded={showAiSettings}
        title="Configuració d’IA"
        className="no-print fixed bottom-4 left-4 z-[70] grid h-12 w-12 place-items-center rounded-full border border-warm-300 bg-primary-900 text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-black hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-900 motion-reduce:transition-none"
      >
        <Sparkles className="h-6 w-6" aria-hidden="true" />
      </button>
      {showAiSettings && <AiSettings onClose={() => setShowAiSettings(false)} />}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-red-900/60 backdrop-blur-md animate-fade-in">
            <div className="bg-white rounded-[3rem] p-12 max-w-lg w-full text-center shadow-2xl">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
                <h2 className="text-2xl font-black text-primary-900 mb-4 uppercase">Esborrar-ho tot?</h2>
                <p className="text-slate-500 mb-10 text-sm">Aquesta acció eliminarà tots els alumnes i classes actuals de la sessió. No es pot desfer.</p>
                <div className="flex gap-4">
                    <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-4 bg-warm-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest">Cancel·lar</button>
                    <button onClick={async () => { await db.students.clear(); setStudents([]); setGroups([]); localStorage.removeItem('evaluo_groups'); setShowResetConfirm(false); }} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">Sí, esborrar tot</button>
                </div>
            </div>
        </div>
      )}

      {showDeleteClassConfirm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
            <div className="bg-white rounded-[3rem] p-12 max-w-lg w-full text-center shadow-2xl border border-warm-200">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <Trash2 className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-primary-900 mb-4 uppercase">Eliminar Classe?</h2>
                <p className="text-slate-500 mb-10 text-sm leading-relaxed">
                    S'eliminaran el grup <span className="font-bold text-slate-900">{groups.find(g => g.id === showDeleteClassConfirm)?.name}</span> i tots els seus alumnes permanentment.
                </p>
                <div className="flex gap-4">
                    <button onClick={() => setShowDeleteClassConfirm(null)} className="flex-1 py-4 bg-warm-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest">En darrera hora, no</button>
                    <button onClick={() => handleDeleteGroup(showDeleteClassConfirm)} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">Sí, eliminar</button>
                </div>
            </div>
        </div>
      )}

      {registerPreview && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/60 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="register-preview-title"
            className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-auto rounded-2xl bg-white p-5 shadow-xl">
            <h2 id="register-preview-title" className="text-lg font-bold">Revisa la importació · {registerPreview.title}</h2>
            <p className="text-sm text-slate-600">En aplicar-la, els valors del registre s’actualitzaran als perfils indicats.</p>
            {[
              ['Perfils amb dades que canviaran', registerPreview.updated],
              ['Perfils nous', registerPreview.created],
              ['Sense coincidència', registerPreview.unmatched],
            ].map(([label, names]: [string, string[]]) => (
              <details key={label} className="rounded-lg border border-warm-200 p-3">
                <summary className="cursor-pointer font-semibold">{label} ({names.length})</summary>
                {names.length > 0 && <ul className="ml-4 mt-2 list-disc text-sm">{names.map((name, index) => <li key={index}>{name}</li>)}</ul>}
              </details>
            ))}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => finishRegisterPreview(false)}>Cancel·la</button>
              <button type="button" onClick={() => finishRegisterPreview(true)}
                className="rounded-xl bg-primary-900 px-4 py-2 text-sm font-bold text-white">Aplica la importació</button>
            </div>
          </section>
        </div>
      )}

      {photoReview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="photo-review-title"
            className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl bg-white p-5 shadow-xl">
            <h2 id="photo-review-title" className="text-lg font-bold text-slate-900">Revisa les fotos abans de desar-les</h2>
            <p className="mb-4 mt-1 text-sm text-slate-600">
              Revisa els perfils preseleccionats o tria’ls manualment. En confirmar, les fotos noves substitueixen les existents.
            </p>
            <details className="mb-3 rounded-lg border border-warm-200 bg-warm-50 p-3" open={photoReview.rows.some(row => !row.choice)}>
              <summary className="cursor-pointer text-sm font-semibold">
                Fotos sense assignar ({photoReview.rows.filter(row => !row.choice).length}) · Alumnes pendents
              </summary>
              <p className="mt-1 text-xs text-slate-600">Arrossega una foto a un perfil sense foto per assignar-la.</p>
              <div className="mt-2 flex max-h-32 flex-wrap gap-2 overflow-auto">
                {photoReview.roster.filter(student => !student.hasPhoto &&
                  !photoReview.rows.some(row => row.choice === student.id) &&
                  photoReview.rows.some(row => (!row.groupCode || row.groupCode === student.groupCode) &&
                    (!row.planetRound || row.planetRound === student.planetRound))).map(student => (
                  <span key={student.id} onDragOver={event => event.preventDefault()} onDrop={event => {
                    event.preventDefault();
                    const payload = event.dataTransfer.getData('text/x-evaluo-photo');
                    if (!payload) return;
                    const index = Number(payload);
                    setPhotoReview(current => {
                      const row = current?.rows[index];
                      if (!current || !row || (row.groupCode && row.groupCode !== student.groupCode) ||
                        (row.planetRound && row.planetRound !== student.planetRound) ||
                        current.rows.some(item => current.roster.find(profile => profile.id === item.choice)?.identity === student.identity)) return current;
                      return { ...current, rows: current.rows.map((item, i) => i === index ? {
                        ...item, choice: student.id,
                      } : item) };
                    });
                  }} className="rounded-lg border border-dashed border-warm-400 bg-white px-2 py-1 text-xs">
                    {student.name} · {student.group}
                  </span>
                ))}
              </div>
            </details>
            {photoReview.errors.length > 0 && (
              <p className="mb-3 whitespace-pre-line text-sm text-amber-800">{photoReview.errors.join('\n')}</p>
            )}
            <div className="space-y-3 overflow-y-auto">
              {photoReview.rows.map((row, index) => (
                <div key={index} className="flex items-center gap-3 rounded-xl border border-warm-200 p-3">
                  <img src={row.url} alt={row.label} draggable onDragStart={event =>
                    event.dataTransfer.setData('text/x-evaluo-photo', String(index))}
                    className="h-20 w-20 shrink-0 cursor-grab rounded-lg bg-warm-50 object-contain" />
                  <div className="min-w-0 flex-1 text-sm font-semibold text-slate-700">
                    {row.label}
                    {row.groupCode && (
                      <span className="mt-1 block text-xs font-semibold text-primary-900">
                        Grup del fitxer · {row.groupCode}
                      </span>
                    )}
                    {row.planetRound && (
                      <span className="mt-1 block text-xs font-semibold text-primary-900">
                        Planeta · Ronda {row.planetRound}
                      </span>
                    )}
                    <span className="mt-1 block text-xs font-normal text-slate-600">
                      {row.ids.length
                        ? 'Suggeriments: ' + photoReview.roster.filter(student => row.ids.includes(student.id))
                            .map(student => student.group ? student.name + ' · ' + student.group : student.name).join(', ')
                        : (row.groupCode || row.planetRound) && !photoReview.roster.some(student =>
                            (!row.groupCode || student.groupCode === row.groupCode) &&
                            (!row.planetRound || student.planetRound === row.planetRound))
                          ? 'No hi ha alumnes que coincideixin amb el grup o la ronda del fitxer.'
                          : row.otherGroups?.length
                            ? 'Coincidència fora del grup del fitxer: ' + row.otherGroups.join(', ') + '. Revisa la carpeta de la foto.'
                            : 'Cap coincidència pel nom. Pots triar un perfil manualment.'}
                    </span>
                    {row.ids.length > 1 && (
                      <span className="mt-1 block text-xs font-medium text-amber-800">
                        Revisa la selecció · {row.ids.length} alumnes coincideixen.
                      </span>
                    )}
                    {row.possibleTypo && (
                      <span className="mt-1 block text-xs font-medium text-amber-800">
                        Possible error tipogràfic · comprova el nom abans de confirmar.
                      </span>
                    )}
                    {row.lastMissing && (
                      <span className="mt-1 block text-xs font-medium text-amber-800">
                        És l’únic perfil sense foto del grup seleccionat. Revisa’l abans de confirmar.
                      </span>
                    )}
                    {row.ids.length > 0 && !row.choice && photoReview.rows.some(item => row.ids.includes(item.choice)) && (
                      <span className="mt-1 block text-xs font-medium text-amber-800">
                        Un dels perfils coincideix amb una altra foto. Revisa les dues seleccions.
                      </span>
                    )}
                    <select value={row.choice} aria-label={'Perfil per a ' + row.label} disabled={isUploadingPhotos}
                      className="mt-1 block w-full rounded-lg border border-warm-200 bg-white p-2 font-normal"
                      onChange={event => {
                        const choice = event.target.value;
                        setPhotoReview(current => current && {
                          ...current,
                          rows: current.rows.map((item, i) => i === index ? { ...item, choice } : item),
                        });
                      }}>
                      <option value="">Deixa sense assignar</option>
                      {photoReview.roster.filter(student =>
                        (!row.ids.length || row.ids.includes(student.id) || row.choice === student.id) &&
                        (!row.groupCode || student.groupCode === row.groupCode) &&
                        (!row.planetRound || student.planetRound === row.planetRound)).map(student => {
                        const suggested = row.ids.includes(student.id);
                        const chosenElsewhere = photoReview.rows.some((item, i) => i !== index &&
                          photoReview.roster.find(profile => profile.id === item.choice)?.identity === student.identity);
                        return (
                          <option key={student.id} value={student.id} disabled={chosenElsewhere}>
                            {suggested ? 'Suggeriment: ' : ''}{student.name}{student.group ? ' · ' + student.group : ''}{student.hasPhoto ? ' (substitueix la foto)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" disabled={isUploadingPhotos} onClick={() => setPhotoReview(null)}
                className="rounded-xl border border-warm-200 px-4 py-2 text-sm font-bold text-slate-700">
                Cancel·la
              </button>
              <button type="button" disabled={isUploadingPhotos || !photoReview.rows.some(row => row.choice)} onClick={() => void confirmPhotoReview()}
                className="rounded-xl bg-primary-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                {isUploadingPhotos ? 'Desant les fotos…' : `Confirma la selecció (${photoReview.rows.filter(row => row.choice).length})`}
              </button>
            </div>
          </section>
        </div>
      )}

      {showDriveModal && !photoReview && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-primary-900/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-[3rem] p-10 max-w-xl w-full relative shadow-2xl border border-warm-200">
            <button onClick={() => setShowDriveModal(false)} className="absolute top-8 right-8 p-2 text-slate-300 hover:text-primary-900 transition-colors"><X className="w-6 h-6" /></button>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
                <Cloud className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-primary-900 uppercase tracking-tight">Importar fotos</h2>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Connecta el teu altre compte de Google i carpeta de Drive</p>
              </div>
            </div>

            <div className="space-y-5 text-sm text-slate-600">
              <div className="bg-warm-50 p-4 rounded-2xl border border-warm-200 space-y-2">
                <p className="font-bold text-slate-800 text-xs uppercase tracking-wider">Com utilitzar el teu altre compte de correu:</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  En prémer el botó d'inici de sessió, s'obrirà la finestra emergent de Google. Allà podràs triar o afegir <strong>el teu altre compte de Google</strong> (el correu alternatiu on tens guardats els documents i fotos de Planeta Blau i l'alumnat). L'aplicació accedirà només en mode lectura.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">ID de la Carpeta de Google Drive (o URL)</label>
                <input 
                  type="text" 
                  value={driveFolderId} 
                  onChange={(e) => setDriveFolderId(e.target.value)}
                  placeholder="ID de la carpeta"
                  className="w-full bg-warm-50 border-2 border-warm-200 rounded-xl px-4 py-3 text-xs font-bold font-mono outline-none focus:border-primary-500 transition-all shadow-inner"
                />
                <p className="text-[9px] text-slate-400">Pots enganxar l'ID o l'enllaç de la carpeta de Drive on tens les fotos o documents de Planeta Blau.</p>
              </div>

              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDraggingPhotos(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDraggingPhotos(false); }}
                onDrop={(e) => { 
                  e.preventDefault(); 
                  setIsDraggingPhotos(false); 
                  if (e.dataTransfer.files) handleUploadLocalPhotos(e.dataTransfer.files); 
                }}
                className={`p-6 rounded-2xl border-2 border-dashed transition-all space-y-3 text-center ${isDraggingPhotos ? 'bg-primary-50 border-primary-500 scale-[1.01]' : 'bg-warm-50/80 border-warm-300 hover:border-primary-400'}`}
              >
                {isUploadingPhotos ? (
                  <div className="py-6 space-y-3 flex flex-col items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto" />
                    <p className="font-bold text-xs uppercase tracking-wider text-slate-800">Processant fitxers i extraient fotos...</p>
                    <p className="text-[10px] text-slate-400">Això pot trigar uns segons segons el nombre d'imatges.</p>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-white text-primary-900 rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-warm-200">
                      <Upload className="w-6 h-6 text-primary-600 animate-bounce" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-xs uppercase tracking-wider">Arrossega el teu fitxer Word, ZIP o fotos aquí</p>
                      <p className="text-[10px] text-slate-500 mt-1">DOCX, DOC, ODT, ZIP i imatges. Revisa les fotos i confirma a qui pertanyen.</p>
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputLocalPhotosRef} 
                      onChange={(e) => { void handleUploadLocalPhotos(e.target.files); e.target.value = ''; }} 
                      multiple 
                      accept=".png,.jpg,.jpeg,.webp,.gif,.bmp,.docx,.doc,.odt,.zip" 
                      className="hidden" 
                    />
                    <input type="file" multiple className="hidden"
                      ref={node => {
                        folderInputPhotosRef.current = node;
                        node?.setAttribute('webkitdirectory', '');
                      }}
                      onChange={event => {
                        const files = Array.from<File>(event.currentTarget.files || []).filter(file =>
                          /\.(png|jpe?g|webp|gif|bmp|docx?|odt|zip)$/i.test(file.name));
                        void handleUploadLocalPhotos(files, files.length ? [] : ['No hi ha fotos compatibles a la carpeta.']);
                        event.currentTarget.value = '';
                      }} />
                    <button type="button" onClick={() => folderInputPhotosRef.current?.click()}
                      className="mr-2 rounded-xl bg-primary-900 px-4 py-2 text-xs font-bold text-white">
                      Selecciona una carpeta
                    </button>
                    <button 
                      onClick={() => fileInputLocalPhotosRef.current?.click()}
                      className="px-6 py-2.5 bg-primary-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-md inline-flex items-center gap-2"
                    >
                      <Upload className="w-3.5 h-3.5 text-primary-300" />
                      <span>Seleccionar fitxers</span>
                    </button>
                  </>
                )}
              </div>

              {photoImportMessage && (
                <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
                  {photoImportMessage}
                </p>
              )}
              <button type="button" disabled={isUploadingPhotos || isSyncingDrivePhotos}
                onClick={() => void resetStudentPhotos()}
                className="mt-3 text-sm font-semibold text-red-700 hover:underline disabled:opacity-50">
                Elimina totes les fotos dels perfils
              </button>
              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => setShowDriveModal(false)} 
                  className="flex-1 py-3.5 bg-warm-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-warm-200 transition-all"
                >
                  Cancel·lar
                </button>
                <button 
                  onClick={() => handleSyncDrivePhotos(driveFolderId)}
                  disabled={isSyncingDrivePhotos}
                  className="flex-2 py-3.5 bg-primary-950 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSyncingDrivePhotos ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sincronitzant Fotos...</span>
                    </>
                  ) : (
                    <>
                      <Cloud className="w-4 h-4 text-blue-400" />
                      <span>Iniciar Sessió i Sincronitzar Fotos</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showNewClassModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-primary-900/60 backdrop-blur-md animate-fade-in">
            <div className="bg-white rounded-[3rem] p-12 max-w-lg w-full relative shadow-2xl border border-warm-200">
                <button onClick={() => setShowNewClassModal(false)} className="absolute top-10 right-10 p-2 text-slate-200 hover:text-primary-900 transition-colors"><X className="w-6 h-6" /></button>
                <h2 className="text-2xl font-black text-primary-900 mb-6 uppercase tracking-tight">Nova Classe</h2>
                <input autoFocus value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder="Ex: 4t B..." className="w-full bg-warm-50 border-2 border-warm-100 rounded-2xl px-6 py-4 text-base font-bold outline-none mb-6 focus:border-primary-400 transition-all shadow-inner" onKeyDown={(e) => {
                    if (e.key === 'Enter' && newClassName.trim()) {
                        const newId = `G${Date.now()}`;
                        const updated = [...groups, {id: newId, name: newClassName.trim()}];
                        setGroups(updated);
                        localStorage.setItem('evaluo_groups', JSON.stringify(updated));
                        setShowNewClassModal(false);
                        setNewClassName('');
                        setActiveGroupId(newId);
                    }
                }} />
                <button onClick={() => {
                    if (newClassName.trim()) {
                        const newId = `G${Date.now()}`;
                        const updated = [...groups, {id: newId, name: newClassName.trim()}];
                        setGroups(updated);
                        localStorage.setItem('evaluo_groups', JSON.stringify(updated));
                        setShowNewClassModal(false);
                        setNewClassName('');
                        setActiveGroupId(newId);
                    }
                }} className="w-full py-4 bg-primary-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black hover:scale-[1.02] transition-all">Crear Classe</button>
            </div>
        </div>
      )}
      {/* Notificació d'estat d'importació (sense bloquejar amb alert) */}
      {importNotification && (
        <div className={`fixed bottom-8 right-8 z-[150] px-6 py-4 rounded-2xl shadow-2xl border text-sm font-bold flex items-center gap-3 animate-fade-in ${
          importNotification.type === 'success' 
            ? 'bg-emerald-900 text-emerald-100 border-emerald-700' 
            : 'bg-red-900 text-red-100 border-red-700'
        }`}>
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{importNotification.message}</span>
        </div>
      )}

      {/* Modal de confirmació i previsualització d'importació */}
      {importPreviewData && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-primary-950/70 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-[3rem] p-10 max-w-xl w-full text-left shadow-2xl border border-warm-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-black text-primary-900 uppercase tracking-tight">Confirmar Importació de Dades</h2>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Comprova el resum abans de sobreescriure la sessió</p>
              </div>
            </div>

            <div className="bg-warm-50/70 rounded-2xl p-5 border border-warm-200 mb-6 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600 font-medium">Alumnes detectats per importar:</span>
                <span className="font-black text-slate-900 px-3 py-1 bg-white rounded-xl border border-warm-200">{importPreviewData.rawCount}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600 font-medium">Classes/Grups associats:</span>
                <span className="font-black text-slate-900 px-3 py-1 bg-white rounded-xl border border-warm-200">{importPreviewData.classesCount}</span>
              </div>
              <div className="pt-2 border-t border-warm-200 text-[11px] text-amber-800 font-medium">
                {importPreviewData.extras
                  ? `Aquesta còpia substituirà la sessió actual, inclosos els registres, les agrupacions i els fitxers desats. Fitxers a restaurar: ${importPreviewData.extras.tables.sessionDocuments.length}.`
                  : `Aquesta còpia antiga substituirà els ${students.length} alumnes i els grups. Els altres registres locals es conservaran.`}
              </div>
            </div>

            <div className="mb-6">
              <button 
                type="button" 
                onClick={handleExportSession}
                className="w-full py-3 px-4 rounded-xl border border-warm-200 bg-white hover:bg-warm-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <Download className="w-4 h-4 text-warm-600" />
                Descarregar una còpia de seguretat abans de continuar
              </button>
            </div>

            <div className="flex gap-4">
              <button 
                type="button" 
                onClick={() => setImportPreviewData(null)} 
                className="flex-1 py-4 bg-warm-100 hover:bg-warm-200 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-colors"
              >
                Cancel·lar
              </button>
              <button 
                type="button" 
                onClick={commitTransactionalImport} 
                className="flex-1 py-4 bg-primary-900 hover:bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all"
              >
                Substituir i Carregar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
