
import React, { useState, useRef, useEffect } from 'react';
import { StudentPortrait } from '../../../components/StudentPortrait';
import { buildReportPrompt } from '../../../infrastructure/api/promptBuilder';
import { calculatePromptConfig } from '../../../core/logic/toneMatrix';
import { reportFingerprint } from '../../../application/useCases/reportFingerprint';
import { 
  Sparkles, Loader2, Mic, Quote, MessageSquare, 
  UserRoundSearch, Workflow, BookText, 
  PenTool, X, FileCheck, Check, PanelRightClose, PanelRightOpen,
  Calculator, ChevronLeft, LayoutGrid, Minimize2, Maximize2,
  User, Target, Zap, Terminal, Bookmark, Hammer, Settings2, Cpu,
  ScrollText, RefreshCw, ArrowLeft, Trophy, Globe, Microscope, GripVertical, Waves
} from 'lucide-react';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ToneControls } from '../../components/ToneControls.jsx';
import { MakerConfigControls } from '../../components/MakerConfigControls.jsx';
import { useReportGenerator } from './GeneratorHook.js';
import { getRubricsForTrimester } from '../../../core/config/rubrics/index.js';
import { RubricFactory } from '../../components/RubricFactory.jsx';
import { SYSTEM_INSTRUCTION, MAKER_SYSTEM_INSTRUCTION, PLANETA_BLAU_SYSTEM_INSTRUCTION } from '../../../constants';
import { ReportResult } from '../../../components/ReportResult';
import { PedagogicalInspector } from '../../components/PedagogicalInspector';
import { db } from '../../../infrastructure/storage/db';

const SortableTabItem = ({ tab, activeTab, isProcessing, onTabChange }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: tab.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`relative ${isDragging ? 'shadow-lg rounded-2xl' : ''}`}>
        <button 
            disabled={tab.disabled || isProcessing}
            onClick={() => onTabChange(tab.id)}
            className={`w-full flex items-center justify-center lg:justify-start gap-3 p-3 rounded-2xl transition-all group disabled:opacity-20 disabled:grayscale ${
                activeTab === tab.id 
                ? 'bg-white shadow-md border border-warm-200 text-primary-900' 
                : 'text-slate-400 hover:bg-warm-100/50'
            }`}
        >
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-slate-300 hover:text-slate-500 transition-colors hidden lg:block">
                <GripVertical className="w-3 h-3" />
            </div>
            <div className={`${activeTab === tab.id ? tab.color : 'text-slate-300 group-hover:text-slate-500'}`}>
                {tab.icon}
            </div>
            <span className="hidden lg:block text-[11px] font-bold uppercase tracking-tight">{tab.label}</span>
        </button>
    </div>
  );
};

export const MainForm = ({ student, onUpdateStudent, onBack, initialTab, onGenerateReport, trimester }) => {
  const rubrics = getRubricsForTrimester(trimester);
  const [toneConfig, setToneConfig] = useState({ styleLevel: 0.5, intensityLevel: 0 });
  const [manualReport, setManualReport] = useState(null);
  const [makerConfig, setMakerConfig] = useState({ technicalLevel: 0.5, creativeFreedom: 0.5, customMakerPrompt: MAKER_SYSTEM_INSTRUCTION });
  const [planetaBlauConfig, setPlanetaBlauConfig] = useState({ customPlanetaBlauPrompt: PLANETA_BLAU_SYSTEM_INSTRUCTION });
  const [activeTab, setActiveTab] = useState(initialTab || 'personalitat');
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [density, setDensity] = useState('balanced');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showMakerAdvanced, setShowMakerAdvanced] = useState(false);
  const [showPlanetaBlauAdvanced, setShowPlanetaBlauAdvanced] = useState(false);
  const [lastNonNarrativeTab, setLastNonNarrativeTab] = useState('personalitat');
  const [isProcessing, setIsProcessing] = useState(false);
  const [duplicates, setDuplicates] = useState([]);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [groupsMap, setGroupsMap] = useState({});
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [tabOrder, setTabOrder] = useState(() => {
    const saved = localStorage.getItem('evaluo_tab_order');
    if (saved) {
      try { return JSON.parse(saved); } catch(e) { return null; }
    }
    return null;
  });

  const { generate, loading, report, resetReport } = useReportGenerator();
  
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
      if (initialTab !== 'narrativa') setLastNonNarrativeTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    const checkDuplicates = async () => {
      if (!student?.info?.name) return;
      
      try {
        const allStudents = await db.students.toArray();
        const otherStudents = allStudents.filter(s => {
          if (s.id === student.id) return false;
          
          const nameA = student.info.name?.trim().toLowerCase() || '';
          const nameB = s.info.name?.trim().toLowerCase() || '';
          
          if (!nameA || !nameB) return false;

          // Exact match
          if (nameA === nameB) return true;

          // Partial match: one contains the other (e.g. "Lucas Cubero" vs "Lucas Cubero Garcia")
          // We use a lower limit for exact prefix matches (e.g. "Ben" vs "Benjamín")
          const minLen = Math.min(nameA.length, nameB.length);
          if (minLen >= 3) {
            if (nameA.startsWith(nameB) || nameB.startsWith(nameA)) return true;
          }
          
          // General inclusion (e.g. "Lucas Cubero" inside "Lucas Cubero Garcia")
          if (nameA.length >= 5 && nameB.length >= 5) {
            if (nameA.includes(nameB) || nameB.includes(nameA)) return true;
          }

          // Token match: check if they share the first word
          const tokensA = nameA.split(/\s+/);
          const tokensB = nameB.split(/\s+/);
          if (tokensA.length >= 1 && tokensB.length >= 1) {
            // If they share the first word and it's long enough (e.g. "Benjamín")
            if (tokensA[0] === tokensB[0] && tokensA[0].length >= 3) return true;
          }

          return false;
        });
        
        // PII safe: evitem incloure el nom de l'alumne al registre de consola
        console.log(`[Sync] Found ${otherStudents.length} potential duplicate records.`);
        setDuplicates(otherStudents);
  
        const savedGroups = localStorage.getItem('evaluo_groups');
        if (savedGroups) {
          const gList = JSON.parse(savedGroups);
          const gMap = gList.reduce((acc, g) => ({ ...acc, [g.id]: g.name }), {});
          setGroupsMap(gMap);
        }
      } catch (err) {
        console.error("[Sync] Error checking duplicates:", err);
      }
    };
    checkDuplicates();
  }, [student?.id, student?.info?.name]);

  const handleSyncFrom = (otherStudent) => {
    const mergedContent = {
      ...student.content,
      tags: Array.from(new Set([...(student.content.tags || []), ...(otherStudent.content.tags || [])])),
      anecdote: [student.content.anecdote, otherStudent.content.anecdote].filter(Boolean).join('\n\n'),
      manualObservations: Array.from(new Set([...(student.content.manualObservations || []), ...(otherStudent.content.manualObservations || [])])),
      maker: {
        ...student.content.maker,
        ...otherStudent.content.maker
      },
      planetaBlau: {
        ...student.content.planetaBlau,
        ...otherStudent.content.planetaBlau
      }
    };
    onUpdateStudent({ content: mergedContent });
    setShowSyncModal(false);
    alert(`Dades sincronitzades des de ${groupsMap[otherStudent.groupId] || 'altre grup'}`);
  };

  const currentReport = student?.state?.generatedReport;

  const openManualReport = () => {
    const { systemInstruction } = calculatePromptConfig(toneConfig.styleLevel, toneConfig.intensityLevel);
    const anonymousStudent = { ...student, info: { ...student.info, name: 'ALUMNE' } };
    setManualReport({
      prompt: buildReportPrompt(anonymousStudent, systemInstruction, rubrics, trimester),
      text: '',
      fingerprint: reportFingerprint(student, toneConfig, trimester),
      saving: false,
      error: '',
    });
  };

  const saveManualReport = async () => {
    if (!manualReport?.text.trim() || manualReport.saving) return;
    setManualReport({ ...manualReport, saving: true });
    try {
      await onUpdateStudent({ state: {
        ...student.state,
        generatedReport: manualReport.text.trim().replace(/\bALUMNE\b/g, () => student.info.name.split(' ')[0]),
        status: 'completed',
        reportFingerprint: manualReport.fingerprint,
        lastModified: new Date().toISOString(),
      } });
      setManualReport(null);
      setActiveTab('narrativa');
    } catch {
      setManualReport({ ...manualReport, saving: false, error: 'No s’ha pogut desar el text.' });
    }
  };

  const handleUpdateContent = (field, value) => {
    onUpdateStudent({ content: { [field]: value } });
  };

  const handleRubricUpdate = (field, update) => onUpdateStudent(current => ({
    [field]: update(current[field] || {}),
  }));

  const handleTogglePI = () => {
    onUpdateStudent({ info: { ...student.info, isPI: !student.info.isPI } });
  };

  const handleToggleGender = () => {
    const newGender = student.info.gender === 'Masculí' ? 'Femení' : 'Masculí';
    onUpdateStudent({ info: { ...student.info, gender: newGender } });
  };

  const handleGenerate = async () => {
    setIsProcessing(true);
    try {
      await onGenerateReport(student.id, toneConfig);
      setActiveTab('narrativa');
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragEndTabs = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const currentTabs = getOrderedTabs();
      const oldIndex = currentTabs.findIndex((i) => i.id === active.id);
      const newIndex = currentTabs.findIndex((i) => i.id === over.id);
      const newTabs = arrayMove(currentTabs, oldIndex, newIndex);
      const newOrder = newTabs.map(t => t.id);
      setTabOrder(newOrder);
      localStorage.setItem('evaluo_tab_order', JSON.stringify(newOrder));
    }
  };

  const getOrderedTabs = () => {
    const baseTabs = [
      { id: 'personalitat', label: 'Caràcter', icon: <UserRoundSearch className="w-4 h-4" />, color: 'text-amber-500', visible: true },
      { id: 'habits', label: trimester === 1 ? 'Adaptació' : (trimester === 3 ? 'Aspectes' : 'Hàbits'), icon: <Workflow className="w-4 h-4" />, color: 'text-indigo-500', visible: true },
      { id: 'linguistic', label: 'Lingüístic', icon: <BookText className="w-4 h-4" />, color: 'text-rose-500', visible: rubrics.some(r => r.id === 'ambit_linguistic') },
      { id: 'matematic', label: 'Matemàtic', icon: <Calculator className="w-4 h-4" />, color: 'text-blue-500', visible: rubrics.some(r => r.id === 'ambit_matematic') },
      { id: 'medi', label: 'Medi', icon: <Microscope className="w-4 h-4" />, color: 'text-emerald-600', visible: rubrics.some(r => r.id === 'ambit_medi') },
      { id: 'fisica', label: 'E. Física', icon: <Trophy className="w-4 h-4" />, color: 'text-orange-500', visible: rubrics.some(r => r.id === 'ambit_fisica') },
      { id: 'valors', label: 'Valors', icon: <Globe className="w-4 h-4" />, color: 'text-sky-500', visible: rubrics.some(r => r.id === 'ambit_valors') },
      { id: 'maker', label: 'Maker', icon: <Hammer className="w-4 h-4" />, color: 'text-emerald-500', visible: rubrics.some(r => r.id === 'ambit_maker') },
      { id: 'planeta_blau', label: 'Planeta Blau', icon: <Waves className="w-4 h-4" />, color: 'text-cyan-500', visible: rubrics.some(r => r.id === 'ambit_planeta_blau') },
      { id: 'narrativa', label: 'Narrativa', icon: <ScrollText className="w-4 h-4" />, color: 'text-violet-500', disabled: !currentReport, visible: true },
      { id: 'ia', label: 'Config. IA', icon: <Sparkles className="w-4 h-4" />, color: 'text-primary-900', visible: true },
    ];

    const validTabs = baseTabs.filter(t => t.visible);

    if (!tabOrder) return validTabs;

    // Filter out IDs that might no longer exist or are not visible, and add new ones
    const ordered = tabOrder
      .map(id => validTabs.find(t => t.id === id))
      .filter(Boolean);
    
    const missing = validTabs.filter(t => !tabOrder.includes(t.id));
    return [...ordered, ...missing];
  };

  const tabs = [
    ...getOrderedTabs(),
    ...(duplicates.length > 0 ? [{ id: 'sync', label: 'Sincronitzar', icon: <RefreshCw className="w-4 h-4 animate-spin-slow" />, color: 'text-indigo-600' }] : []),
  ];

  const handleTabChange = (id) => {
    if (id === 'sync') {
      setShowSyncModal(true);
      return;
    }
    if (id !== 'narrativa') setLastNonNarrativeTab(id);
    setActiveTab(id);
  };

  if (activeTab === 'narrativa' && currentReport) {
    return (
      <div className="fixed inset-0 z-[100] bg-warm-50/50 backdrop-blur-xl p-4 md:p-8 animate-fade-in flex flex-col">
        <div className="flex-1 overflow-hidden relative">
          <ReportResult 
            report={currentReport} 
            student={student}
            trimester={trimester}
            studentName={student?.info?.name}
            language={student?.info?.language || 'Català'}
            onUpdateContent={handleUpdateContent}
            onReset={() => setActiveTab(lastNonNarrativeTab)} 
            onReportChange={(newReport) => onUpdateStudent({ state: { ...student.state, generatedReport: newReport } })} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-white overflow-hidden relative">
      {manualReport && (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-900/60 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="manual-report-title"
            className="max-h-[90vh] w-full max-w-2xl space-y-3 overflow-auto rounded-2xl bg-white p-5 shadow-xl">
            <h2 id="manual-report-title" className="text-lg font-bold">Redactar amb ChatGPT</h2>
            <p className="text-sm text-slate-600">Revisa el text i elimina dades identificatives de les observacions abans de copiar-lo. Enganxa aquí el resultat per desar-lo com a esborrany pendent de revisió.</p>
            <textarea aria-label="Instruccions per copiar" className="h-40 w-full rounded-lg border p-2 text-sm"
              value={manualReport.prompt} onChange={event => setManualReport({ ...manualReport, prompt: event.target.value })} />
            <button type="button" className="text-sm font-bold text-primary-800"
              onClick={async () => {
                try { await navigator.clipboard.writeText(manualReport.prompt); }
                catch { setManualReport({ ...manualReport, error: 'Selecciona el text i copia’l manualment.' }); }
              }}>Copiar instruccions</button>
            <textarea aria-label="Esborrany de l’informe" placeholder="Enganxa l’esborrany aquí"
              className="h-40 w-full rounded-lg border p-2 text-sm" value={manualReport.text}
              onChange={event => setManualReport({ ...manualReport, text: event.target.value })} />
            {manualReport.error && <p role="alert" className="text-sm text-rose-700">{manualReport.error}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" disabled={manualReport.saving} onClick={() => setManualReport(null)}>Cancel·la</button>
              <button type="button" disabled={manualReport.saving || !manualReport.text.trim()} onClick={saveManualReport}
                className="rounded-xl bg-primary-900 px-4 py-2 text-sm text-white disabled:opacity-40">Desa l’esborrany</button>
            </div>
          </section>
        </div>
      )}
      {isProcessing && (
        <div className="absolute inset-0 z-[1000] bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in">
           <div className="bg-primary-900 p-8 rounded-[3rem] shadow-2xl flex flex-col items-center gap-6">
              <Loader2 className="w-12 h-12 text-white animate-spin" />
              <div className="text-center">
                <p className="text-white font-black uppercase tracking-[0.2em] text-sm">Escrivint narrativa...</p>
                <p className="text-primary-300 text-[10px] uppercase font-bold mt-2">Transformant matisos en paraules</p>
              </div>
           </div>
        </div>
      )}

      <nav className="w-16 lg:w-56 border-r border-warm-100 bg-warm-50/20 flex flex-col shrink-0 no-print">
        <div className="flex-1 p-4 lg:p-6 space-y-4 overflow-y-auto custom-scrollbar">
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4 hidden lg:block">Àrees d'avaluació</p>
            <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEndTabs}
            >
                <SortableContext 
                    items={tabs.map(t => t.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {tabs.map(tab => (
                        <SortableTabItem 
                            key={tab.id}
                            tab={tab}
                            activeTab={activeTab}
                            isProcessing={isProcessing}
                            onTabChange={handleTabChange}
                        />
                    ))}
                </SortableContext>
            </DndContext>
        </div>
      </nav>

      <div className="flex-1 flex flex-col min-w-0 bg-white relative">
        <div className="min-h-12 border-b border-warm-100 flex items-center justify-between px-6 py-2 bg-warm-50/30 shrink-0 z-30 shadow-sm">
            <div className="flex items-center gap-4">
                <button onClick={onBack} disabled={isProcessing} className="p-1.5 bg-white border border-warm-200 rounded-lg text-slate-400 hover:text-primary-900 transition-all shadow-sm"><ChevronLeft className="w-4 h-4" /></button>
                {student?.info?.photoUrl && <StudentPortrait src={student.info.photoUrl} name={student.info.name} />}
                <div className="flex flex-col">
                    <h2 className="text-[11px] font-black text-primary-900 uppercase tracking-tight leading-none">{student?.info?.name}</h2>
                    <span className="text-[7px] font-black uppercase tracking-[0.2em] text-warm-500 mt-0.5">Editor Individual Avançat</span>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <button type="button" disabled={isProcessing} onClick={openManualReport}
                    className="rounded-lg border border-warm-200 px-3 py-1.5 text-xs font-bold">
                    Redactar amb ChatGPT
                </button>
                {duplicates.length > 0 && (
                  <button 
                    onClick={() => setShowSyncModal(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg text-[8px] font-black uppercase hover:bg-indigo-100 transition-all shadow-sm animate-pulse"
                  >
                    <RefreshCw className="w-3 h-3" /> Sincronització Disponible
                  </button>
                )}
                <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-warm-200 shadow-sm">
                    <button onClick={handleToggleGender} disabled={isProcessing} className={`px-2 py-0.5 rounded-md text-[9px] font-black transition-all ${student.info.gender === 'Masculí' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-400 hover:text-blue-500'}`}>♂</button>
                    <button onClick={handleToggleGender} disabled={isProcessing} className={`px-2 py-0.5 rounded-md text-[9px] font-black transition-all ${student.info.gender === 'Femení' ? 'bg-pink-500 text-white shadow-sm' : 'text-slate-400 hover:text-pink-500'}`}>♀</button>
                </div>
                <button 
                    onClick={handleTogglePI}
                    disabled={isProcessing}
                    className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all border shadow-sm ${student.info.isPI ? 'bg-amber-500 text-white border-amber-600' : 'bg-white text-slate-400 border-warm-100 hover:text-amber-500'}`}
                >
                    Pla Individual (PI)
                </button>
                <div className="w-px h-4 bg-warm-200 mx-2" />
                <div className="flex bg-white border border-warm-200 rounded-lg p-0.5 shadow-sm">
                    <button onClick={() => setDensity('compact')} className={`p-1 rounded-md transition-all ${density === 'compact' ? 'bg-primary-900 text-white shadow-sm' : 'text-slate-300 hover:text-primary-900'}`} title="Compacte"><Minimize2 className="w-3 h-3" /></button>
                    <button onClick={() => setDensity('balanced')} className={`p-1 rounded-md transition-all ${density === 'balanced' ? 'bg-primary-900 text-white shadow-sm' : 'text-slate-300 hover:text-primary-900'}`} title="Equilibrat"><LayoutGrid className="w-3 h-3" /></button>
                    <button onClick={() => setDensity('wide')} className={`p-1 rounded-md transition-all ${density === 'wide' ? 'bg-primary-900 text-white shadow-sm' : 'text-slate-300 hover:text-primary-900'}`} title="Ampli"><Maximize2 className="w-3 h-3" /></button>
                </div>
                <button 
                  onClick={() => setInspectorOpen(!inspectorOpen)}
                  disabled={isProcessing}
                  className={`p-1.5 rounded-lg border transition-all shadow-sm ${inspectorOpen ? 'bg-warm-100 border-warm-200 text-primary-900' : 'bg-white border-warm-100 text-slate-300 hover:text-primary-900'}`}
                >
                    {inspectorOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-warm-50/5">
            <div className="max-w-5xl mx-auto p-6 lg:p-10 animate-fade-in">
                {activeTab === 'personalitat' && (
                    <div className="space-y-12">
                        <div className="space-y-8">
                            <header className="flex items-center gap-4">
                                <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 border border-amber-100"><ScrollText className="w-4 h-4" /></div>
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Frase Pont / Inici d'Informe</h3>
                            </header>
                            <RubricFactory density={density} section={rubrics.find(r => r.id === 'introduccio_informe')} studentData={student} onUpdate={handleRubricUpdate} />
                        </div>

                        <div className="space-y-8 pt-12 border-t border-warm-100">
                            <header className="flex items-center gap-4">
                                <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 border border-amber-100"><UserRoundSearch className="w-4 h-4" /></div>
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Personalitat i Caràcter</h3>
                            </header>
                            <RubricFactory density={density} section={rubrics.find(r => r.id === 'personality_block')} studentData={student} onUpdate={handleRubricUpdate} />
                        </div>
                    </div>
                )}

                {activeTab === 'habits' && (
                    <div className="space-y-8">
                        <header className="flex items-center gap-4">
                            <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 border border-indigo-100"><Workflow className="w-4 h-4" /></div>
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                                {trimester === 3 ? 'Aspectes Personals' : 'Hàbits i Socialització'}
                            </h3>
                        </header>
                        <RubricFactory density={density} section={rubrics.find(r => r.id === 'habits_treball')} studentData={student} onUpdate={handleRubricUpdate} />
                    </div>
                )}

                {activeTab === 'linguistic' && (
                    <div className="space-y-8">
                        <header className="flex items-center gap-4">
                            <div className="w-8 h-8 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500 border border-rose-100"><BookText className="w-4 h-4" /></div>
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Àmbit Lingüístic</h3>
                        </header>
                        <RubricFactory density={density} section={rubrics.find(r => r.id === 'ambit_linguistic')} studentData={student} onUpdate={handleRubricUpdate} />
                    </div>
                )}

                {activeTab === 'matematic' && (
                    <div className="space-y-8">
                        <header className="flex items-center gap-4">
                            <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 border border-blue-100"><Calculator className="w-4 h-4" /></div>
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Àmbit Matemàtic</h3>
                        </header>
                        <RubricFactory density={density} section={rubrics.find(r => r.id === 'ambit_matematic')} studentData={student} onUpdate={handleRubricUpdate} />
                    </div>
                )}

                {activeTab === 'medi' && (
                    <div className="space-y-8">
                        <header className="flex items-center gap-4">
                            <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-100"><Microscope className="w-4 h-4" /></div>
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Àmbit de Medi</h3>
                        </header>
                        <RubricFactory density={density} section={rubrics.find(r => r.id === 'ambit_medi')} studentData={student} onUpdate={handleRubricUpdate} />
                    </div>
                )}

                {activeTab === 'fisica' && (
                    <div className="space-y-8">
                        <header className="flex items-center gap-4">
                            <div className="w-8 h-8 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500 border border-orange-100"><Trophy className="w-4 h-4" /></div>
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Educació Física</h3>
                        </header>
                        <RubricFactory density={density} section={rubrics.find(r => r.id === 'ambit_fisica')} studentData={student} onUpdate={handleRubricUpdate} />
                    </div>
                )}

                {activeTab === 'valors' && (
                    <div className="space-y-8">
                        <header className="flex items-center gap-4">
                            <div className="w-8 h-8 bg-sky-50 rounded-xl flex items-center justify-center text-sky-500 border border-sky-100"><Globe className="w-4 h-4" /></div>
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Valors Cívics i Ètics</h3>
                        </header>
                        <RubricFactory density={density} section={rubrics.find(r => r.id === 'ambit_valors')} studentData={student} onUpdate={handleRubricUpdate} />
                    </div>
                )}

                {activeTab === 'maker' && (
                    <div className="space-y-8">
                        <header className="flex items-center gap-4">
                            <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500 border border-emerald-100"><Hammer className="w-4 h-4" /></div>
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Àmbit Maker / STEAM</h3>
                        </header>
                        <RubricFactory 
                            density={density} 
                            section={rubrics.find(r => r.id === 'ambit_maker')} 
                            studentData={student} 
                            onUpdate={handleRubricUpdate}
                        />
                    </div>
                )}

                {activeTab === 'planeta_blau' && (
                    <div className="space-y-8">
                        <header className="flex items-center gap-4">
                            <div className="w-8 h-8 bg-cyan-50 rounded-xl flex items-center justify-center text-cyan-500 border border-cyan-100"><Waves className="w-4 h-4" /></div>
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Àmbit Planeta Blau</h3>
                        </header>
                        <RubricFactory 
                            density={density} 
                            section={rubrics.find(r => r.id === 'ambit_planeta_blau')} 
                            studentData={student} 
                            onUpdate={handleRubricUpdate}
                        />
                    </div>
                )}

                {activeTab === 'ia' && (
                    <div className="max-w-2xl space-y-12 animate-fade-in">
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 px-2">
                                <Settings2 className="w-5 h-5 text-primary-900" />
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Configuració Tutor General</h3>
                            </div>
                            <ToneControls config={toneConfig} onChange={(f, v) => setToneConfig(p => ({ ...p, [f]: v }))} />
                            
                            <div className="px-4">
                                <button 
                                    onClick={() => setShowAdvanced(!showAdvanced)} 
                                    className="flex items-center gap-3 text-[10px] font-black text-slate-400 hover:text-primary-900 uppercase tracking-widest transition-colors"
                                >
                                    <Terminal className="w-4 h-4" /> 
                                    {showAdvanced ? "Amagar directrius Tutor" : "Veure System Prompt del Tutor"}
                                </button>
                                {showAdvanced && (
                                    <div className="mt-6 bg-slate-900 text-indigo-100 p-8 rounded-[2rem] border border-slate-700 font-mono text-[10px] leading-relaxed max-h-[300px] overflow-y-auto no-scrollbar shadow-2xl animate-slide-up">
                                        <pre className="whitespace-pre-wrap opacity-80">{SYSTEM_INSTRUCTION}</pre>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-6 pt-6 border-t border-warm-100">
                            <div className="flex items-center gap-3 px-2">
                                <Cpu className="w-5 h-5 text-emerald-600" />
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Configuració Independent Maker</h3>
                            </div>
                            <MakerConfigControls config={makerConfig} onChange={(f, v) => setMakerConfig(p => ({ ...p, [f]: v }))} />
                            
                            <div className="px-4">
                                <button 
                                    onClick={() => setShowMakerAdvanced(!showMakerAdvanced)} 
                                    className="flex items-center gap-3 text-[10px] font-black text-slate-400 hover:text-emerald-600 uppercase tracking-widest transition-colors"
                                >
                                    <Terminal className="w-4 h-4" /> 
                                    {showMakerAdvanced ? "Amagar directrius Maker" : "Veure System Prompt Maker Space"}
                                </button>
                                {showMakerAdvanced && (
                                    <div className="mt-6 bg-emerald-950 text-emerald-100 p-8 rounded-[2rem] border border-emerald-800 font-mono text-[10px] leading-relaxed max-h-[300px] overflow-y-auto no-scrollbar shadow-2xl animate-slide-up">
                                        <textarea 
                                            value={makerConfig.customMakerPrompt}
                                            onChange={(e) => setMakerConfig(p => ({ ...p, customMakerPrompt: e.target.value }))}
                                            className="w-full bg-transparent border-none outline-none resize-none h-[200px] no-scrollbar opacity-80"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-6 pt-6 border-t border-warm-100">
                            <div className="flex items-center gap-3 px-2">
                                <Waves className="w-5 h-5 text-cyan-600" />
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Configuració Independent Planeta Blau</h3>
                            </div>
                            
                            <div className="px-4">
                                <button 
                                    onClick={() => setShowPlanetaBlauAdvanced(!showPlanetaBlauAdvanced)} 
                                    className="flex items-center gap-3 text-[10px] font-black text-slate-400 hover:text-cyan-600 uppercase tracking-widest transition-colors"
                                >
                                    <Terminal className="w-4 h-4" /> 
                                    {showPlanetaBlauAdvanced ? "Amagar directrius Planeta Blau" : "Veure System Prompt Planeta Blau"}
                                </button>
                                {showPlanetaBlauAdvanced && (
                                    <div className="mt-6 bg-cyan-950 text-cyan-100 p-8 rounded-[2rem] border border-cyan-800 font-mono text-[10px] leading-relaxed max-h-[300px] overflow-y-auto no-scrollbar shadow-2xl animate-slide-up">
                                        <textarea 
                                            value={planetaBlauConfig.customPlanetaBlauPrompt}
                                            onChange={(e) => setPlanetaBlauConfig(p => ({ ...p, customPlanetaBlauPrompt: e.target.value }))}
                                            className="w-full bg-transparent border-none outline-none resize-none h-[200px] no-scrollbar opacity-80"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <div className="h-20 shrink-0" />
        </div>
      </div>

      <div className={`transition-all duration-500 ease-in-out shrink-0 bg-white border-l border-warm-100 ${inspectorOpen ? 'w-[380px]' : 'w-0 overflow-hidden opacity-0'}`}>
        <PedagogicalInspector 
            student={student} 
            onGenerate={handleGenerate} 
            isGenerating={loading || isProcessing}
            onUpdateContent={handleUpdateContent}
            makerInstructions={makerConfig.customMakerPrompt}
            planetaBlauInstructions={planetaBlauConfig.customPlanetaBlauPrompt}
            onUpdateStudent={onUpdateStudent}
            trimester={trimester}
        />
      </div>
      
      {showSyncModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl border border-warm-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-primary-900 uppercase tracking-tight">Sincronitzar Alumne</h3>
              <button onClick={() => setShowSyncModal(false)} className="text-slate-300 hover:text-primary-900"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-slate-500 text-xs mb-8 leading-relaxed">
              Hem trobat a <span className="font-bold text-slate-900">{student.info.name}</span> en altres classes. Vols importar les seves rúbriques i observacions?
            </p>
            <div className="space-y-3">
              {duplicates.map(other => (
                <button 
                  key={other.id}
                  onClick={() => handleSyncFrom(other)}
                  className="w-full flex items-center justify-between p-4 bg-warm-50 hover:bg-indigo-50 border border-warm-100 hover:border-indigo-200 rounded-2xl transition-all group"
                >
                  <div className="text-left">
                    <p className="text-[10px] font-black text-slate-900 uppercase">{other.info.name}</p>
                    <p className="text-[8px] text-indigo-500 font-bold uppercase tracking-widest mt-0.5">
                      {groupsMap[other.groupId] || 'Grup desconegut'}
                    </p>
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                      {other.content.tags?.length || 0} ítems avaluats
                    </p>
                  </div>
                  <Workflow className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {!inspectorOpen && (
          <button 
            onClick={() => setInspectorOpen(true)}
            className="absolute right-0 top-1/2 -translate-y-1/2 bg-white border border-warm-200 border-r-0 rounded-l-xl p-4 shadow-xl z-50 hover:bg-warm-50 transition-all group"
          >
             <ChevronLeft className="w-4 h-4 text-primary-900 group-hover:-translate-x-1 transition-transform" />
          </button>
      )}
    </div>
  );
};
