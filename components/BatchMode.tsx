
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getRubricsForTrimester, getRubricLevels } from '../core/config/rubrics/index.js';
import { isOptionSelected, updateRowSelectionSafely } from '../core/utils/rubricMatcher.js';
import { PERSONALITY_BLOCK } from '../core/config/personalityRubric.js';
import { 
  Users, LayoutGrid, List, Edit3, Trash2, Play, Loader2, 
  CheckCircle, Eye, ArrowUp, ArrowDown, Maximize2, Minimize2,
  Zap, Sparkles, RefreshCw, CircleDashed, ShieldCheck, FileDown,
  MessageSquarePlus, UserCircle, X, BookOpen, Cloud
} from 'lucide-react';
import { ReportResult } from './ReportResult';
import { NuanceEditor } from './NuanceEditor';
import { PedagogicalInspector } from '../ui/components/PedagogicalInspector';
import { StudentPortrait } from './StudentPortrait';

const PersonalityMatrixView = ({ students, onUpdateStudentField, trimester, setSelectedStudentId, onEditStudentDetails, groups, activeGroupId }: any) => {
  const [activeStudentModal, setActiveStudentModal] = useState<any | null>(null);

  const isTagSelected = (studentTags: string[], tagLabel: string) => {
    return studentTags.some(t => {
      const cleanT = t.toLowerCase();
      const cleanLabel = tagLabel.toLowerCase();
      return cleanT.includes(cleanLabel) || cleanT.startsWith(cleanLabel);
    });
  };

  const handleToggleTag = (student: any, optionObj: any) => {
    const currentTags = student.content?.tags || [];
    const studentName = student.info?.name || "l'alumne/a";
    const formattedText = `${optionObj.label} ("${optionObj.definition.replace(/\{nom\}/g, studentName)}")`;
    
    const existingIndex = currentTags.findIndex((t: string) => t.toLowerCase().includes(optionObj.label.toLowerCase()));
    let nextTags = [...currentTags];
    if (existingIndex >= 0) {
      nextTags.splice(existingIndex, 1);
    } else {
      nextTags.push(formattedText);
    }
    onUpdateStudentField(student.id, { content: { ...student.content, tags: nextTags } });
  };

  return (
    <div className="flex-1 overflow-auto bg-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-primary-900 text-white p-6 rounded-3xl shadow-xl flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-primary-300 mb-1">Matriu de Personalitat i Caràcter (Trimestre {trimester})</h3>
            <p className="text-xs text-white/80 font-medium">Avalua de forma àgil i visual els trets de personalitat, motor i estil de gestió de tot l'alumnat sense obrir-los un a un.</p>
          </div>
          <span className="px-3 py-1 bg-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest">{students.length} Alumnes</span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {students.map((student: any) => {
            const studentTags = student.content?.tags || [];
            
            return (
              <div key={student.id} className="bg-warm-50/60 border border-warm-200 rounded-2xl p-5 hover:shadow-md transition-all flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                <div className="flex items-center gap-3 shrink-0 w-full md:w-64">
                  <button 
                    onClick={() => setSelectedStudentId(student.id)}
                    className="p-2 rounded-xl bg-white shadow-sm text-primary-900 hover:bg-primary-900 hover:text-white transition-all"
                    title="Veure perfil individual"
                  >
                    {student.info.photoUrl ? (
                      <StudentPortrait src={student.info.photoUrl} name={student.info.name} thumbnail />
                    ) : <UserCircle className="w-5 h-5" />}
                  </button>
                  <div className="flex flex-col min-w-0">
                    <button 
                      onClick={() => onEditStudentDetails(student.id, 'personalitat')}
                      className="text-sm font-black text-slate-900 uppercase tracking-tight text-left truncate hover:text-primary-900 transition-colors"
                    >
                      {student.info.name}
                    </button>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      {studentTags.filter((t: string) => PERSONALITY_BLOCK.some(block => block.dimensions.some(dim => [...dim.balance, ...dim.excess, ...dim.defect].some(opt => t.toLowerCase().includes(opt.label.toLowerCase()))) )).length} trets seleccionats
                    </span>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                  {PERSONALITY_BLOCK.map((block: any) => (
                    <div key={block.id} className="bg-white p-3.5 rounded-xl border border-warm-200 shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2 pb-2 border-b border-warm-100">
                        <span className="text-[10px] font-black uppercase tracking-wider text-primary-900">{block.title}</span>
                        <button
                          onClick={() => setActiveStudentModal({ student, block })}
                          className="px-2.5 py-1 bg-primary-50 text-primary-900 rounded-lg text-[9px] font-bold hover:bg-primary-900 hover:text-white transition-all flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" /> Editar
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 min-h-[40px] items-center">
                        {block.dimensions.flatMap((dim: any) => [...dim.balance, ...dim.excess, ...dim.defect]).filter((opt: any) => isTagSelected(studentTags, opt.label)).length === 0 ? (
                          <span className="text-[10px] text-slate-300 italic">Cap tret seleccionat...</span>
                        ) : (
                          block.dimensions.flatMap((dim: any) => [...dim.balance, ...dim.excess, ...dim.defect]).filter((opt: any) => isTagSelected(studentTags, opt.label)).map((opt: any, i: number) => (
                            <span key={i} className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${opt.type === 'balance' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : opt.type === 'excess' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-rose-100 text-rose-800 border border-rose-200'}`}>
                              {opt.label}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {activeStudentModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-warm-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-primary-900 p-6 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary-300 mb-1">Editor Ràpid de Caràcter</h3>
                <p className="font-bold text-lg leading-tight">{activeStudentModal.student.info.name}</p>
                <p className="text-[10px] font-medium opacity-70 uppercase tracking-widest mt-1">Àmbit: {activeStudentModal.block.title}</p>
              </div>
              <button onClick={() => setActiveStudentModal(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              {activeStudentModal.block.dimensions.map((dim: any) => (
                <div key={dim.name} className="space-y-3 bg-warm-50 p-4 rounded-2xl border border-warm-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary-900">{dim.name}</p>
                  
                  <div className="space-y-2">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 mb-1">Equilibri / Fortaleses</p>
                      <div className="flex flex-wrap gap-2">
                        {dim.balance.map((opt: any) => {
                          const active = isTagSelected(activeStudentModal.student.content?.tags || [], opt.label);
                          return (
                            <button
                              key={opt.id}
                              onClick={() => {
                                handleToggleTag(activeStudentModal.student, opt);
                                setActiveStudentModal((prev: any) => ({
                                  ...prev,
                                  student: {
                                    ...prev.student,
                                    content: {
                                      ...prev.student.content,
                                      tags: active 
                                        ? prev.student.content.tags.filter((t: string) => !t.toLowerCase().includes(opt.label.toLowerCase()))
                                        : [...(prev.student.content?.tags || []), `${opt.label} ("${opt.definition}")`]
                                    }
                                  }
                                }));
                              }}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border ${active ? 'bg-emerald-600 text-white border-emerald-700 shadow-md scale-105' : 'bg-white text-slate-700 border-warm-200 hover:bg-emerald-50'}`}
                            >
                              {opt.label} {active && '✓'}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {(dim.excess.length > 0 || dim.defect.length > 0) && (
                      <div className="pt-2 border-t border-warm-200/60">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-amber-700 mb-1">Matisos de Millora / Tendències</p>
                        <div className="flex flex-wrap gap-2">
                          {[...dim.excess, ...dim.defect].map((opt: any) => {
                            const active = isTagSelected(activeStudentModal.student.content?.tags || [], opt.label);
                            return (
                              <button
                                key={opt.id}
                                onClick={() => {
                                  handleToggleTag(activeStudentModal.student, opt);
                                  setActiveStudentModal((prev: any) => ({
                                    ...prev,
                                    student: {
                                      ...prev.student,
                                      content: {
                                        ...prev.student.content,
                                        tags: active 
                                          ? prev.student.content.tags.filter((t: string) => !t.toLowerCase().includes(opt.label.toLowerCase()))
                                          : [...(prev.student.content?.tags || []), `${opt.label} ("${opt.definition}")`]
                                      }
                                    }
                                  }));
                                }}
                                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border ${active ? 'bg-amber-600 text-white border-amber-700 shadow-md scale-105' : 'bg-white text-slate-700 border-warm-200 hover:bg-amber-50'}`}
                              >
                                {opt.label} {active && '✓'}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 bg-warm-50 border-t border-warm-200 flex justify-end shrink-0">
              <button
                onClick={() => setActiveStudentModal(null)}
                className="px-6 py-2.5 bg-primary-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-md"
              >
                Acceptar i Tancar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TraitsMatrixView = ({ students, onUpdateStudentField, trimester, setSelectedStudentId, groups, activeGroupId }: any) => {
  const [activeBlockId, setActiveBlockId] = useState('motor');

  const isTagSelected = (studentTags: string[], tagLabel: string) => {
    return studentTags.some(t => {
      const cleanT = t.toLowerCase();
      const cleanLabel = tagLabel.toLowerCase();
      return cleanT.includes(cleanLabel) || cleanT.startsWith(cleanLabel);
    });
  };

  const handleToggleTag = (student: any, optionObj: any) => {
    const currentTags = student.content?.tags || [];
    const studentName = student.info?.name || "l'alumne/a";
    const formattedText = `${optionObj.label} ("${optionObj.definition.replace(/\{nom\}/g, studentName)}")`;
    
    const existingIndex = currentTags.findIndex((t: string) => t.toLowerCase().includes(optionObj.label.toLowerCase()));
    let nextTags = [...currentTags];
    if (existingIndex >= 0) {
      nextTags.splice(existingIndex, 1);
    } else {
      nextTags.push(formattedText);
    }
    onUpdateStudentField(student.id, { content: { ...student.content, tags: nextTags } });
  };

  const activeBlock = PERSONALITY_BLOCK.find(b => b.id === activeBlockId) || PERSONALITY_BLOCK[0];

  return (
    <div className="flex-1 overflow-auto bg-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-gradient-to-r from-primary-900 to-primary-950 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-900 text-[9px] font-black uppercase tracking-widest">Ideal Trimestre 1</span>
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-primary-200">Matriu per Trets i Característiques</h3>
            </div>
            <p className="text-xs text-white/80 font-medium">Pensa en un tret o adjectiu (p. ex. Motivat, Curiós, Esforçat) i marca'l ràpidament a tots els alumnes que el compleixin. Pots llegir la frase exacta que s'inclourà a l'informe.</p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-2xl shrink-0 flex-wrap">
            {PERSONALITY_BLOCK.map(block => (
              <button
                key={block.id}
                onClick={() => setActiveBlockId(block.id)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeBlockId === block.id ? 'bg-white text-primary-900 shadow-md' : 'text-white/70 hover:text-white'}`}
              >
                {block.title}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {activeBlock.dimensions.map((dim: any) => (
            <div key={dim.name} className="bg-warm-50/60 border border-warm-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-warm-200/60 pb-3">
                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-primary-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary-600" />
                  {dim.name}
                </h4>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{students.length} Alumnes avaluats</span>
              </div>

              <div className="space-y-4">
                {/* Balance (Fortaleses) */}
                {dim.balance.map((opt: any) => (
                  <div key={opt.id} className="bg-white p-4 rounded-2xl border border-warm-200 shadow-sm space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-black uppercase tracking-wider">
                            {opt.label}
                          </span>
                          <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-widest">Fortalesa / Equilibri</span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium italic">
                          Frase exacta: "{opt.definition}"
                        </p>
                      </div>
                      <div className="text-[10px] font-bold text-slate-400">
                        {students.filter(s => isTagSelected(s.content?.tags || [], opt.label)).length} / {students.length} alumnes marcats
                      </div>
                    </div>

                    {/* Student Toggles Grid */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-warm-100">
                      {students.map((student: any) => {
                        const active = isTagSelected(student.content?.tags || [], opt.label);
                        return (
                          <button
                            key={student.id}
                            onClick={() => handleToggleTag(student, opt)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border flex items-center gap-1.5 ${active ? 'bg-emerald-600 text-white border-emerald-700 shadow-md scale-105' : 'bg-warm-50 text-slate-700 border-warm-200 hover:bg-emerald-50 hover:text-emerald-900'}`}
                            title={`Clic per ${active ? 'treure' : 'assignar'} "${opt.label}" a ${student.info.name}`}
                          >
                            <span className="truncate max-w-[140px]">{student.info.name}</span>
                            {active && <span className="text-white font-black">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Excess & Defect (Matisos / Tendències) */}
                {[...dim.excess, ...dim.defect].map((opt: any) => {
                  const isExcess = opt.type === 'excess';
                  return (
                    <div key={opt.id} className="bg-white p-4 rounded-2xl border border-warm-200 shadow-sm space-y-3">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-xl border text-[10px] font-black uppercase tracking-wider ${isExcess ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-rose-100 text-rose-800 border-rose-200'}`}>
                              {opt.label}
                            </span>
                            <span className={`text-[9px] font-bold uppercase tracking-widest ${isExcess ? 'text-amber-700' : 'text-rose-700'}`}>
                              {isExcess ? 'Matís d\'Excés / Tendència' : 'Matís de Millora'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 font-medium italic">
                            Frase exacta: "{opt.definition}"
                          </p>
                        </div>
                        <div className="text-[10px] font-bold text-slate-400">
                          {students.filter(s => isTagSelected(s.content?.tags || [], opt.label)).length} / {students.length} alumnes marcats
                        </div>
                      </div>

                      {/* Student Toggles Grid */}
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-warm-100">
                        {students.map((student: any) => {
                          const active = isTagSelected(student.content?.tags || [], opt.label);
                          return (
                            <button
                              key={student.id}
                              onClick={() => handleToggleTag(student, opt)}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border flex items-center gap-1.5 ${active ? (isExcess ? 'bg-amber-600 text-white border-amber-700 shadow-md scale-105' : 'bg-rose-600 text-white border-rose-700 shadow-md scale-105') : 'bg-warm-50 text-slate-700 border-warm-200 hover:bg-warm-100'}`}
                              title={`Clic per ${active ? 'treure' : 'assignar'} "${opt.label}" a ${student.info.name}`}
                            >
                              <span className="truncate max-w-[140px]">{student.info.name}</span>
                              {active && <span className="text-white font-black">✓</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const BatchMode = ({ 
    students, 
    onRemoveStudentGlobal, 
    onEditStudentDetails,
    onMoveStudent,
    groups, 
    activeGroupId, 
    onUpdateStudentField, 
    onGenerateReport,
    selectedStudentId,
    setSelectedStudentId,
    trimester
}: any) => {
  const [viewMode, setViewMode] = useState<'list' | 'matrix' | 'traits'>('traits');
  const [density, setDensity] = useState<'balanced' | 'compact' | 'wide'>('balanced');
  const [activeTabId, setActiveTabId] = useState('habits_treball');
  const [reportInLabOpen, setReportInLabOpen] = useState(false);
  const [activeStudentIdInLab, setActiveStudentIdInLab] = useState<string | null>(null);
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [activeNuance, setActiveNuance] = useState<{ studentId: string, rubricId: string, rubricLabel: string, studentName: string } | null>(null);
  
  // Si el grup actiu és d'Espai Planeta Blau, seleccionem per defecte la seva rúbrica
  useEffect(() => {
    const currentGroupName = groups.find(g => g.id === activeGroupId)?.name || '';
    if (currentGroupName.toLowerCase().includes('planeta')) {
      setActiveTabId('ambit_planeta_blau');
    } else if (currentGroupName.toLowerCase().includes('maker')) {
      setActiveTabId('ambit_maker');
    }
  }, [activeGroupId, groups]);

  const rubrics = useMemo(() => getRubricsForTrimester(trimester), [trimester]);
  
  const filteredStudents = useMemo(() => {
    return students.filter(s => activeGroupId === 'ALL' || (s.info?.groupId || s.groupId) === activeGroupId);
  }, [students, activeGroupId]);

  const activeRubric = rubrics.find(r => r.id === activeTabId);
  const currentRubricLevels = useMemo(() => getRubricLevels(activeRubric), [activeRubric]);

  const handleBulkAssign = (rowId: string, levelIndex: number) => {
    const row = activeRubric?.data?.find(r => r.id === rowId);
    if (!row || !row.options) return;
    const optionText = row.options[levelIndex];
    if (!optionText) return;

    filteredStudents.forEach(s => {
      const currentTags = s.content?.tags || [];
      const nextTags = updateRowSelectionSafely(currentTags, row, optionText, s.info?.name, false);
      onUpdateStudentField(s.id, { content: { ...s.content, tags: nextTags } });
    });
  };

  const cancelBulkRef = useRef(false);

  const handleGenerateAllPending = async () => {
    const pending = filteredStudents.filter(s => !s.state?.generatedReport && s.state?.status !== 'generating');
    if (pending.length === 0) return;
    
    setIsBulkGenerating(true);
    setIsStopping(false);
    cancelBulkRef.current = false;
    let completedCount = 0;

    for (const student of pending) {
      if (cancelBulkRef.current) {
        break;
      }
      try {
        await onGenerateReport(student.id);
        completedCount++;
      } catch (e: any) {
        console.error("Error generating student:", student.info.name, e);
        const isQuota = e?.message?.includes("quota") || e?.message?.includes("429") || e?.message?.includes("QUOTA_EXCEEDED");
        if (isQuota) {
          alert(`S'ha aturat la generació per grup perquè s'ha assolit el límit de quota de Gemini. Els ${completedCount} informes completats prèviament s'han conservat correctament.`);
          break;
        }
      }
    }
    setIsBulkGenerating(false);
    setIsStopping(false);
  };

  const handleCancelBulk = () => {
    cancelBulkRef.current = true;
    setIsStopping(true);
  };

  const handleExportToWord = () => {
    const studentsWithReport = filteredStudents.filter(s => s.state?.generatedReport);
    if (studentsWithReport.length === 0) return;

    const className = activeGroupId === 'ALL' ? 'Tots els Alumnes' : groups.find(g => g.id === activeGroupId)?.name || 'Classe';
    
    let htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>Informes - ${className}</title>
        <style>
          @page { size: A4; margin: 25mm 20mm 25mm 20mm; }
          body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.6; color: #1e293b; }
          .cover-title { text-align: center; color: #0f172a; font-size: 22pt; font-weight: 800; text-transform: uppercase; margin-top: 40px; margin-bottom: 8px; }
          .cover-subtitle { text-align: center; color: #64748b; font-size: 11pt; margin-bottom: 50px; }
          .student-report { margin-bottom: 30px; page-break-after: always; break-after: page; }
          .student-header { border-bottom: 2.5px solid #0f172a; padding-bottom: 8px; margin-bottom: 20px; }
          .student-name { font-size: 18pt; font-weight: bold; color: #0f172a; text-transform: uppercase; margin: 0 0 4px 0; }
          .student-meta { font-size: 9.5pt; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; margin: 0; }
          .section-title { font-size: 11pt; font-weight: bold; color: #475569; margin-top: 22px; margin-bottom: 10px; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
          .report-content { font-size: 11pt; white-space: pre-wrap; text-align: justify; line-height: 1.65; color: #1e293b; }
          .footer { font-size: 8.5pt; color: #94a3b8; margin-top: 40px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="cover-title">Recull d'Informes d'Avaluació</div>
        <div class="cover-subtitle">${className} · Trimestre ${trimester} · Generat el ${new Date().toLocaleDateString('ca-ES')}</div>
    `;

    studentsWithReport.forEach((s, idx) => {
      const report = s.state.generatedReport;
      const separator = "--- SECCIÓ ALUMNE ---";
      const parts = report.split(separator);
      const familyPart = parts[0].trim();
      const studentPart = parts[1]?.trim() || "";

      htmlContent += `
        ${idx > 0 ? `<br clear="all" style="page-break-before:always; mso-break-type:section-break;" />` : ''}
        <div class="student-report" style="page-break-after: always; break-after: page;">
          <div class="student-header">
            <h2 class="student-name">${s.info.name}</h2>
            <p class="student-meta">Grup: ${className} &nbsp;|&nbsp; Trimestre ${trimester} &nbsp;|&nbsp; ${studentsWithReport.length} alumnes avaluats</p>
          </div>
          
          <div class="section-title">Informe d'Avaluació per a la Família</div>
          <div class="report-content">${familyPart}</div>
          
          ${studentPart ? `
            <div class="section-title" style="margin-top: 28px;">Missatge personalitzat per a l'Alumne/a</div>
            <div class="report-content">${studentPart}</div>
          ` : ''}
        </div>
      `;
    });

    htmlContent += `
        <div class="footer">
          Generat amb Evaluo Studio - Eina de suport a la redacció pedagògica
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], {
      type: 'application/msword'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Informes_${className.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const calculateRichness = (student) => {
    const { content } = student;
    let score = 0;
    if (content.tags?.length > 0) score += Math.min(60, content.tags.length * 4);
    if (content.anecdote?.length > 20) score += 15;
    if (content.manualObservations?.length > 0) score += 15;
    if (content.selfAssessment?.length > 10) score += 10;
    return Math.min(100, score);
  };

  const getDensityClasses = () => {
    if (density === 'compact') return { padding: 'py-2 px-3', text: 'text-[10px]', icon: 'w-3.5 h-3.5', row: 'h-10', btn: 'w-4 h-4 rounded-md', colName: 'w-[160px]', colRubric: 'w-[180px]' };
    if (density === 'wide') return { padding: 'py-6 px-10', text: 'text-base', icon: 'w-5 h-5', row: 'h-24', btn: 'w-8 h-8 rounded-lg', colName: 'w-[280px]', colRubric: 'w-[320px]' };
    return { padding: 'py-3.5 px-6', text: 'text-[12px]', icon: 'w-4 h-4', row: 'h-14', btn: 'w-5 h-5 rounded-md', colName: 'w-[220px]', colRubric: 'w-[240px]' };
  };

  const dc = getDensityClasses();

  const matrixRubrics = rubrics.filter(r => r.inputType === 'GRID_4_LEVELS' || r.id === 'personality_block');

  const selectedStudent = useMemo(() => 
    students.find(s => s.id === selectedStudentId), 
    [students, selectedStudentId]
  );

  return (
    <div className="bg-white h-full flex overflow-hidden animate-fade-in relative shadow-sm">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="bg-white border-b border-warm-200 px-8 py-4 flex justify-between items-center shrink-0 z-50 shadow-sm">
         <div className="flex items-center gap-6">
            <h2 className="font-black text-xl text-slate-900 flex items-center gap-3">
                {activeGroupId === 'ALL' ? 'Vista General' : groups.find(g => g.id === activeGroupId)?.name}
                <span className="text-warm-300 font-light text-2xl">/</span>
                <span className="text-primary-900 text-[10px] font-black uppercase tracking-[0.2em]">{filteredStudents.length} Alumnes</span>
            </h2>

            <div className="flex bg-warm-50 border border-warm-200 rounded-xl p-0.5 shadow-inner">
                <button onClick={() => setDensity('compact')} className={`p-2 rounded-lg transition-all ${density === 'compact' ? 'bg-primary-900 text-white shadow-md' : 'text-slate-300 hover:text-slate-500'}`} title="Vista Compacta"><Minimize2 className="w-4 h-4" /></button>
                <button onClick={() => setDensity('balanced')} className={`p-2 rounded-lg transition-all ${density === 'balanced' ? 'bg-primary-900 text-white shadow-md' : 'text-slate-300 hover:text-slate-500'}`} title="Vista Equilibrada"><LayoutGrid className="w-4 h-4" /></button>
                <button onClick={() => setDensity('wide')} className={`p-2 rounded-lg transition-all ${density === 'wide' ? 'bg-primary-900 text-white shadow-md' : 'text-slate-300 hover:text-slate-500'}`} title="Vista Àmplia"><Maximize2 className="w-4 h-4" /></button>
            </div>
         </div>

         <div className="flex items-center gap-4">
             <button 
                 onClick={handleExportToWord} 
                disabled={filteredStudents.filter(s => s.state?.generatedReport).length === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl disabled:opacity-30 disabled:pointer-events-none active:scale-95"
            >
                <FileDown className="w-4 h-4 text-primary-300" />
                Exportar a Word
            </button>
            {isBulkGenerating ? (
              <button 
                onClick={handleCancelBulk} 
                disabled={isStopping}
                className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-xl active:scale-95 disabled:opacity-75"
                title="Es finalitzarà l'informe de l'alumne actual i s'aturarà la generació de la resta."
              >
                {isStopping ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                {isStopping ? "Aturant després de l'alumne actual..." : "Aturar Generació"}
              </button>
            ) : (
              <button 
                onClick={handleGenerateAllPending} 
                disabled={filteredStudents.filter(s => !s.state?.generatedReport).length === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl disabled:opacity-30 disabled:pointer-events-none active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                Generar Pendents
              </button>
            )}
            <div className="flex bg-warm-50 border border-warm-200 rounded-xl p-0.5 shadow-inner">
                <button onClick={() => setViewMode('list')} className={`flex items-center gap-2 px-3 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'list' ? 'bg-primary-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}><List className="w-4 h-4" /> Llista</button>
                <button onClick={() => setViewMode('traits')} className={`flex items-center gap-2 px-3 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'traits' ? 'bg-primary-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}><Sparkles className="w-4 h-4" /> Per Trets (T1)</button>
                <button onClick={() => setViewMode('matrix')} className={`flex items-center gap-2 px-3 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'matrix' ? 'bg-primary-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid className="w-4 h-4" /> Matriu Alumnes (T2/T3)</button>
            </div>
         </div>
      </div>
      
      {viewMode === 'matrix' && (
        <div className="bg-warm-50 border-b border-warm-200 px-8 py-2.5 flex gap-3 overflow-x-auto no-scrollbar shrink-0">
            {matrixRubrics.map(r => (
                <button key={r.id} onClick={() => setActiveTabId(r.id)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border-2 ${activeTabId === r.id ? 'bg-primary-900 text-white border-primary-950 shadow-md' : 'bg-white text-slate-400 border-warm-200 hover:text-primary-900 hover:border-primary-200'}`}>{r.title}</button>
            ))}
        </div>
      )}

      <div className="flex-1 overflow-auto custom-scrollbar relative bg-white">
        {viewMode === 'traits' ? (
          <TraitsMatrixView 
            students={filteredStudents}
            onUpdateStudentField={onUpdateStudentField}
            trimester={trimester}
            setSelectedStudentId={setSelectedStudentId}
            groups={groups}
            activeGroupId={activeGroupId}
          />
        ) : viewMode === 'matrix' ? (
          activeTabId === 'personality_block' ? (
            <PersonalityMatrixView 
              students={filteredStudents}
              onUpdateStudentField={onUpdateStudentField}
              trimester={trimester}
              setSelectedStudentId={setSelectedStudentId}
              onEditStudentDetails={onEditStudentDetails}
              groups={groups}
              activeGroupId={activeGroupId}
            />
          ) : (
            <table className="w-full text-left border-collapse table-fixed min-w-max">
              <thead className="sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-sm">
                  <tr>
                      <th style={{ width: dc.colName }} className={`${dc.padding} border-b border-warm-200 border-r sticky left-0 z-50 bg-white font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 shadow-[2px_0_10px_-3px_rgba(0,0,0,0.05)]`}>Alumne/a</th>
                      {activeRubric?.data?.map(row => (
                        <th key={row.id} style={{ width: dc.colRubric }} className={`${dc.padding} border-b border-warm-200 border-r text-center group/th`}>
                           <div className="flex flex-col items-center gap-2">
                              <p className="font-black text-[9px] uppercase tracking-tight text-slate-400 group-hover/th:text-primary-950 transition-colors truncate w-full px-2">{row.label}</p>
                              <div className="flex items-center justify-center gap-1.5 opacity-30 group-hover/th:opacity-100 transition-opacity">
                                {currentRubricLevels.map((lvlObj, lIdx) => (
                                  <button 
                                    key={lvlObj.label} 
                                    onClick={() => handleBulkAssign(row.id, lIdx)}
                                    className="px-1.5 h-5 flex items-center justify-center text-[7px] font-black rounded-lg border border-warm-200 bg-white text-slate-400 hover:bg-primary-900 hover:text-white transition-all shadow-sm"
                                    title={`Assignar ${lvlObj.label} (${lvlObj.full}) a tota la columna`}
                                  >
                                    {lvlObj.label}
                                  </button>
                                ))}
                              </div>
                           </div>
                        </th>
                      ))}
                  </tr>
              </thead>
              <tbody className="divide-y divide-warm-100">
                  {filteredStudents.map((s) => (
                      <tr key={s.id} className={`${dc.row} hover:bg-primary-50/10 transition-all group/tr`}>
                          <td className={`${dc.padding} ${dc.text} bg-white sticky left-0 z-30 border-r border-warm-200 font-bold uppercase tracking-tight text-slate-800 shadow-[2px_0_10px_-3px_rgba(0,0,0,0.05)] flex items-center justify-between gap-2 overflow-hidden`}>
                             <div className="flex items-center gap-2 flex-1 min-w-0">
                               <button 
                                  onClick={() => setSelectedStudentId(s.id === selectedStudentId ? null : s.id)}
                                  className={`p-1 rounded-lg transition-all ${s.id === selectedStudentId ? 'bg-primary-900 text-white' : 'text-slate-300 hover:text-primary-600 hover:bg-primary-50'}`}
                                  title="Veure detalls de l'alumne"
                               >
                                  {s.info.photoUrl ? (
                                    <StudentPortrait src={s.info.photoUrl} name={s.info.name} thumbnail />
                                  ) : <UserCircle className="w-4 h-4" />}
                               </button>
                                <div className="flex items-center gap-1.5 w-full overflow-hidden">
                                   <div className="flex flex-col gap-1 w-full overflow-hidden py-1">
                                      <button 
                                         onClick={() => onEditStudentDetails(s.id, 'narrativa')}
                                         className="bg-transparent font-bold text-slate-800 text-left hover:text-primary-900 transition-all truncate w-full text-xs"
                                         title="Veure informe individual"
                                      >
                                         {s.info.name}
                                      </button>
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        {s.info.course && (
                                          <span className="shrink-0 px-1.5 py-0.5 rounded bg-warm-100 text-slate-500 border border-warm-200 text-[7px] font-bold uppercase tracking-wider" title={`Curs d'origen: ${s.info.course}`}>
                                            {s.info.course}
                                          </span>
                                        )}
                                        {(() => {
                                          const conf = s.content?.conference || s.trimesters?.[trimester]?.content?.conference;
                                          const isThisTrimester = conf && (conf.trimester === trimester || (!conf.trimester && trimester === 1));
                                          if (isThisTrimester && conf.status === 'Complet') {
                                            return (
                                              <span 
                                                className="shrink-0 px-1.5 py-0.5 rounded bg-warm-100 text-slate-600 border border-warm-200 text-[7px] font-bold uppercase tracking-wider flex items-center gap-1" 
                                                title={`Conferència oral (T${trimester}): «${conf.topic}»`}
                                              >
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                                <span className="truncate max-w-[80px]">{conf.topic || 'Conf.'}</span>
                                              </span>
                                            );
                                          }
                                          return null;
                                        })()}
                                        {(() => {
                                          const rSpeed = s.metrics?.readingSpeed || s.content?.reading?.wpm || s.trimesters?.[trimester]?.content?.reading?.wpm;
                                          const rErrors = s.metrics?.readingErrors || s.content?.reading?.errors || '';
                                          const rComp = s.metrics?.readingCompText || s.content?.reading?.comp || '';
                                          if (rSpeed && rSpeed > 0) {
                                            return (
                                              <span 
                                                className="shrink-0 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[7px] font-bold uppercase tracking-wider flex items-center gap-1" 
                                                title={`Lectura en veu alta: ${rSpeed} ppm${rErrors ? ` | Observacions: ${rErrors}` : ''}${rComp ? ` | Prova puntual comp: ${rComp}` : ''}`}
                                              >
                                                <BookOpen className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                                                <span>{rSpeed} ppm</span>
                                              </span>
                                            );
                                          }
                                          return null;
                                        })()}
                                      </div>
                                   </div>
                                </div>
                             </div>
                          </td>
                          {activeRubric?.data?.map(row => {
                              const nuanceVal = s.content.nuances?.[row.id];
                              const hasNuance = Array.isArray(nuanceVal) ? nuanceVal.length > 0 : !!nuanceVal;
                              
                              return (
                                <td key={row.id} className="border-r border-warm-100 text-center relative group/td-cell hover:z-50">
                                    {/* Nuance Indicator & Tooltip */}
                                    <div className="absolute top-0 right-0 z-20 p-1">
                                        <div className="relative group/nuance">
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setActiveNuance({
                                                        studentId: String(s.id),
                                                        rubricId: row.id,
                                                        rubricLabel: row.label,
                                                        studentName: s.info.name
                                                      });
                                                }}
                                                className={`p-1 rounded-full transition-all shadow-sm ${hasNuance ? 'bg-primary-900 text-white scale-110 ring-2 ring-white' : 'bg-white text-slate-200 opacity-0 group-hover/td-cell:opacity-100 hover:text-primary-900 hover:scale-125'}`}
                                                title={hasNuance ? "Veure/Editar matisos" : "Afegir matís o aclaració"}
                                            >
                                                <MessageSquarePlus className="w-3 h-3" />
                                            </button>
                                            
                                            {hasNuance && (
                                                <div className="absolute bottom-full left-0 mb-2 w-64 p-4 bg-white border-2 border-primary-900 rounded-2xl shadow-2xl opacity-0 group-hover/nuance:opacity-100 transition-all pointer-events-none z-[100] translate-y-2 group-hover/nuance:translate-y-0">
                                                    <div className="flex items-center gap-2 mb-2 border-b border-warm-100 pb-2">
                                                        <div className="w-2 h-2 bg-primary-900 rounded-full animate-pulse" />
                                                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-primary-900">Matisos Pedagògics</p>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {(Array.isArray(nuanceVal) ? nuanceVal : [nuanceVal]).map((n, i) => (
                                                            <p key={i} className="text-[11px] text-slate-700 leading-relaxed font-medium italic border-l-2 border-primary-100 pl-2">
                                                                "{n}"
                                                            </p>
                                                        ))}
                                                    </div>
                                                    {/* Arrow */}
                                                    <div className="absolute top-full left-3 border-8 border-transparent border-t-primary-900" />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex justify-center gap-1.5 w-full mx-auto">
                                      {currentRubricLevels.map((lvlObj, levelIdx) => {
                                          const opt = row.options ? row.options[levelIdx] : null;
                                          if (!opt) return null;
                                          const active = isOptionSelected(s.content?.tags || [], opt, s.info?.name);
                                          
                                          return (
                                            <div key={lvlObj.label} className="relative group/cell">
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-56 p-4 bg-slate-900 text-white text-[10px] rounded-2xl z-50 shadow-2xl opacity-0 group-hover/cell:opacity-100 transition-all duration-300 delay-[1300ms] pointer-events-none text-center border border-white/10 leading-relaxed font-medium">
                                                    <p className="font-black mb-1 uppercase tracking-widest text-[8px] text-primary-300">{lvlObj.label} ({lvlObj.full}):</p>
                                                    {opt.replace(/\{nom\}/g, s.info?.name || "l'alumne/a")}
                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900"></div>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        const currentTags = s.content?.tags || [];
                                                        // BLINDATGE ANTI-BUIDAT:
                                                        // Un cop assignat un nivell a la fila, mai es buida per un clic accidental!
                                                        // Si es clica un altre nivell, es canvia de forma neta.
                                                        const nextTags = updateRowSelectionSafely(currentTags, row, opt, s.info?.name, false);
                                                        onUpdateStudentField(s.id, { content: { ...s.content, tags: nextTags } });
                                                    }}
                                                    title={`${lvlObj.label} - ${lvlObj.full}`}
                                                    className={`border transition-all active:scale-90 shadow-sm ${dc.btn} ${active ? `${lvlObj.color} border-black/10 scale-125 shadow-md` : 'bg-warm-100/60 border-warm-200 hover:border-warm-300 hover:bg-white'}`} 
                                                />
                                            </div>
                                          );
                                      })}
                                  </div>
                                </td>
                              );
                          })}
                      </tr>
                  ))}
              </tbody>
          </table>
          )
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-sm">
                <tr>
                    <th className={`${dc.padding} border-b border-warm-200 font-black text-[10px] uppercase text-slate-400 tracking-widest w-20`}>Pos.</th>
                    <th className={`${dc.padding} border-b border-warm-200 font-black text-[10px] uppercase text-slate-400 tracking-widest`}>Alumne/a</th>
                    <th className={`${dc.padding} border-b border-warm-200 font-black text-[10px] uppercase text-slate-400 tracking-widest text-center`}>Gènere / PI</th>
                    <th className={`${dc.padding} border-b border-warm-200 font-black text-[10px] uppercase text-slate-400 tracking-widest text-center`}>Riquesa</th>
                    <th className={`${dc.padding} border-b border-warm-200 font-black text-[10px] uppercase text-slate-400 tracking-widest text-center`}>Estat</th>
                    <th className={`${dc.padding} border-b border-warm-200 font-black text-[10px] uppercase text-slate-400 tracking-widest text-right`}>Accions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
                {filteredStudents.map((s, idx) => {
                    const prog = Math.min(100, Math.round(((s.content.tags?.length || 0) / 25) * 100));
                    const isCompleted = s.state?.status === 'completed';
                    const isReviewed = s.state?.status === 'reviewed';
                    const isGenerating = s.state?.status === 'generating';
                    const hasReport = !!s.state?.generatedReport;
                    const richness = calculateRichness(s);

                    return (
                        <tr key={s.id} className={`${dc.row} hover:bg-primary-50/20 group transition-all`}>
                            <td className={dc.padding}>
                                <div className="flex flex-col gap-0.5 items-center">
                                    <button onClick={() => onMoveStudent(s.id, 'up')} className="text-slate-200 hover:text-primary-600 transition-colors"><ArrowUp className={dc.icon} /></button>
                                    <span className={`${dc.text} font-black text-slate-400 bg-warm-50 px-2 py-0.5 rounded-lg`}>{idx + 1}</span>
                                    <button onClick={() => onMoveStudent(s.id, 'down')} className="text-slate-200 hover:text-primary-600 transition-colors"><ArrowDown className={dc.icon} /></button>
                                </div>
                            </td>
                            <td className={dc.padding}>
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => setSelectedStudentId(s.id === selectedStudentId ? null : s.id)}
                                            className={`p-1 rounded-lg transition-all ${s.id === selectedStudentId ? 'bg-primary-900 text-white' : 'text-slate-300 hover:text-primary-600 hover:bg-primary-50'}`}
                                            title="Veure detalls de l'alumne"
                                        >
                                            {s.info.photoUrl ? (
                                                <StudentPortrait src={s.info.photoUrl} name={s.info.name} thumbnail />
                                            ) : <UserCircle className="w-4 h-4" />}
                                        </button>
                                        <div className="flex items-center gap-2 w-full">
                                            <input 
                                                value={s.info.name}
                                                onChange={(e) => onUpdateStudentField(s.id, { info: { ...s.info, name: e.target.value } })}
                                                className={`${density === 'wide' ? 'text-xl' : 'text-sm'} font-black text-slate-900 uppercase tracking-tight bg-transparent border-b border-transparent focus:border-primary-900 outline-none flex-1`}
                                            />
                                            {s.info.course && (
                                                <span className="shrink-0 px-1.5 py-0.5 rounded bg-warm-100 text-slate-500 border border-warm-200 text-[8px] font-bold uppercase tracking-wider" title={`Curs d'origen: ${s.info.course}`}>
                                                    {s.info.course}
                                                </span>
                                            )}
                                            {(() => {
                                              const conf = s.content?.conference || s.trimesters?.[trimester]?.content?.conference;
                                              const isThisTrimester = conf && (conf.trimester === trimester || (!conf.trimester && trimester === 1));
                                              if (isThisTrimester && conf.status === 'Complet') {
                                                return (
                                                  <span 
                                                    className="shrink-0 px-2 py-0.5 rounded bg-warm-100 text-slate-700 border border-warm-200 text-[8px] font-bold uppercase tracking-wider flex items-center gap-1.5" 
                                                    title={`Conferència d'expressió oral (T${trimester}): «${conf.topic}»`}
                                                  >
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                                    <span className="truncate max-w-[130px]">{conf.topic || 'Conferència'}</span>
                                                  </span>
                                                );
                                              }
                                              return null;
                                            })()}
                                            {(() => {
                                              const rSpeed = s.metrics?.readingSpeed || s.content?.reading?.wpm || s.trimesters?.[trimester]?.content?.reading?.wpm;
                                              const rErrors = s.metrics?.readingErrors || s.content?.reading?.errors || '';
                                              const rComp = s.metrics?.readingCompText || s.content?.reading?.comp || '';
                                              if (rSpeed && rSpeed > 0) {
                                                return (
                                                  <span 
                                                    className="shrink-0 px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[8px] font-bold uppercase tracking-wider flex items-center gap-1.5" 
                                                    title={`Velocitat lectora: ${rSpeed} ppm${rErrors ? ` | Mecànica: ${rErrors}` : ''}${rComp ? ` | Prova puntual comp: ${rComp}` : ''}`}
                                                  >
                                                    <BookOpen className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                                                    <span>{rSpeed} ppm</span>
                                                  </span>
                                                );
                                              }
                                              return null;
                                            })()}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <div className={`w-32 ${density === 'compact' ? 'h-1' : 'h-2'} bg-warm-100 rounded-full overflow-hidden shadow-inner`}>
                                        <div className="h-full bg-emerald-500 transition-all duration-1000 shadow-sm" style={{ width: `${prog}%` }}></div>
                                      </div>
                                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{prog}%</span>
                                    </div>
                                </div>
                            </td>
                            <td className={`${dc.padding} text-center`}>
                                <div className="flex justify-center gap-3">
                                    <button 
                                      onClick={() => onUpdateStudentField(s.id, { info: { ...s.info, gender: s.info.gender === 'Masculí' ? 'Femení' : 'Masculí' } })}
                                      className={`${density === 'compact' ? 'w-8 h-8' : 'w-10 h-10'} rounded-2xl flex items-center justify-center text-[11px] font-black border transition-all hover:scale-110 active:scale-95 shadow-sm ${s.info.gender === 'Masculí' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-pink-50 text-pink-600 border-pink-100'}`}
                                      title="Canviar Gènere"
                                    >
                                      {s.info.gender === 'Masculí' ? '♂' : '♀'}
                                    </button>
                                    <button 
                                      onClick={() => onUpdateStudentField(s.id, { info: { ...s.info, isPI: !s.info.isPI } })}
                                      className={`${density === 'compact' ? 'w-8 h-8' : 'w-10 h-10'} rounded-2xl flex items-center justify-center text-[10px] font-black border transition-all hover:scale-110 active:scale-95 shadow-sm ${s.info.isPI ? 'bg-amber-500 text-white border-amber-600' : 'bg-warm-50 text-slate-200 border-warm-100'}`}
                                      title="Toggle Pla Individual"
                                    >
                                      PI
                                    </button>
                                </div>
                            </td>
                            <td className={`${dc.padding} text-center`}>
                                <button 
                                  onClick={() => onEditStudentDetails(s.id, 'ia')}
                                  className="group/richness flex flex-col items-center gap-2 transition-all hover:scale-110 active:scale-95 mx-auto"
                                  title="Millorar riquesa (Config. IA)"
                                >
                                    <div className={`rounded-2xl border-2 transition-all shadow-sm flex items-center justify-center ${density === 'compact' ? 'w-8 h-8' : 'w-10 h-10'} ${richness > 70 ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : richness > 40 ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-warm-50 border-warm-200 text-slate-300'}`}>
                                        <Zap className={`${dc.icon} ${richness > 15 ? 'fill-current' : ''}`} />
                                    </div>
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">{richness}%</span>
                                </button>
                            </td>
                            <td className={`${dc.padding} text-center`}>
                                {isGenerating ? (
                                    <div className="flex flex-col items-center gap-1.5">
                                        <Loader2 className="w-5 h-5 animate-spin text-primary-900" />
                                        <span className="text-[7px] font-black uppercase text-primary-300 tracking-widest">Escrivint...</span>
                                    </div>
                                ) : hasReport ? (
                                    <button 
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            let nextStatus = 'idle';
                                            if (s.state?.status === 'idle') nextStatus = 'completed';
                                            else if (s.state?.status === 'completed') nextStatus = 'reviewed';
                                            else if (s.state?.status === 'reviewed') nextStatus = 'idle';
                                            
                                            onUpdateStudentField(s.id, { state: { ...s.state, status: nextStatus } });
                                        }} 
                                        className="mx-auto group/done flex flex-col items-center gap-1.5 hover:opacity-70 transition-all active:scale-90"
                                        title={isReviewed ? "Marca com a PENDENT" : isCompleted ? "Marca com a REVISAT" : "Marca com a COMPLET"}
                                    >
                                        {isReviewed ? (
                                            <ShieldCheck className={`${dc.icon} text-indigo-600 group-hover/done:scale-125 transition-transform pointer-events-none`} />
                                        ) : isCompleted ? (
                                            <CheckCircle className={`${dc.icon} text-emerald-500 group-hover/done:scale-125 transition-transform pointer-events-none`} />
                                        ) : (
                                            <CircleDashed className={`${dc.icon} text-slate-300 group-hover/done:scale-125 transition-transform pointer-events-none`} />
                                        )}
                                        <span className={`text-[8px] font-black uppercase tracking-widest pointer-events-none ${isReviewed ? 'text-indigo-600' : isCompleted ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            {isReviewed ? 'Revisat' : isCompleted ? 'Enllestit' : 'Pendent'}
                                        </span>
                                    </button>
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <button 
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                onGenerateReport(s.id);
                                            }} 
                                            className={`flex items-center justify-center ${density === 'compact' ? 'w-8 h-8' : 'w-10 h-10'} bg-primary-900 text-white rounded-[1.25rem] hover:bg-black transition-all shadow-xl active:scale-95 group/play`}
                                            title="Generar amb IA"
                                        >
                                            <Play className={`${dc.icon} fill-current group-hover/play:scale-110 transition-transform`} />
                                        </button>
                                    </div>
                                )}
                            </td>
                            <td className={`${dc.padding} text-right`}>
                                <div className="flex items-center justify-end gap-3">
                                    {hasReport ? (
                                      <>
                                        <button onClick={() => onGenerateReport(s.id)} className={`flex items-center justify-center ${density === 'compact' ? 'w-8 h-8' : 'w-10 h-10'} bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-2xl transition-all border border-emerald-100 group/regen shadow-sm`} title="Regenerar Informe">
                                          <RefreshCw className={`${dc.icon} group-hover/regen:rotate-180 transition-transform duration-500`} />
                                        </button>
                                        <button onClick={() => { setActiveStudentIdInLab(s.id); setReportInLabOpen(true); }} className={`flex items-center justify-center ${density === 'compact' ? 'w-8 h-8' : 'w-10 h-10'} bg-indigo-50 text-indigo-500 hover:bg-indigo-600 hover:text-white rounded-2xl transition-all border border-indigo-100 group/btn shadow-sm`} title="Laboratori de Redacció IA">
                                          <Eye className={`${dc.icon} group-hover/btn:scale-110 transition-transform`} />
                                        </button>
                                      </>
                                    ) : (
                                      <button 
                                        onClick={() => onGenerateReport(s.id)} 
                                        className={`flex items-center justify-center ${density === 'compact' ? 'w-8 h-8' : 'w-10 h-10'} bg-primary-50 text-primary-900 hover:bg-primary-900 hover:text-white rounded-2xl transition-all border border-primary-200 group/gen shadow-sm`} 
                                        title="Generar Informe amb IA"
                                      >
                                        <Sparkles className={`${dc.icon} group-hover/gen:scale-110 transition-transform`} />
                                      </button>
                                    )}
                                    <button onClick={() => onEditStudentDetails(s.id)} className={`flex items-center justify-center ${density === 'compact' ? 'w-8 h-8' : 'w-10 h-10'} bg-warm-50 text-slate-300 hover:text-primary-900 hover:bg-white border border-warm-100 rounded-2xl transition-all shadow-sm`} title="Editar Fitxa"><Edit3 className={dc.icon} /></button>
                                    <button 
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemoveStudentGlobal(s.id); }} 
                                        className={`flex items-center justify-center ${density === 'compact' ? 'w-8 h-8' : 'w-10 h-10'} text-slate-200 hover:text-red-500 transition-all active:scale-90`}
                                        title="Eliminar Alumne"
                                    >
                                        <Trash2 className={dc.icon} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
          </table>
        )}
      </div>
      </div>

      {selectedStudent && (
        <div className="w-[400px] border-l border-warm-200 bg-warm-50/30 flex flex-col animate-slide-in-right shrink-0">
          <PedagogicalInspector 
            student={selectedStudent}
            onGenerate={() => onGenerateReport(selectedStudent.id)}
            isGenerating={selectedStudent.state?.status === 'generating'}
            onUpdateContent={(field, value) => onUpdateStudentField(selectedStudent.id, { content: { ...selectedStudent.content, [field]: value } })}
            onUpdateStudent={(updates) => onUpdateStudentField(selectedStudent.id, updates)}
            onClose={() => setSelectedStudentId(null)}
            trimester={trimester}
          />
        </div>
      )}

      {reportInLabOpen && activeStudentIdInLab && (
        <div className="fixed inset-0 z-[100] bg-warm-50/50 backdrop-blur-xl p-4 md:p-8 animate-fade-in flex flex-col">
          <div className="flex-1 overflow-hidden relative">
            {(() => {
              const s = students.find(s => s.id === activeStudentIdInLab);
              if (!s) return null;
              return (
                <ReportResult 
                  report={s.state?.generatedReport || ""} 
                  student={s}
                  trimester={trimester}
                  studentName={s?.info?.name}
                  onUpdateContent={(field, value) => onUpdateStudentField(s.id, { content: { ...s.content, [field]: value } })}
                  onReset={() => { setReportInLabOpen(false); setActiveStudentIdInLab(null); }} 
                  onReportChange={(newReport) => onUpdateStudentField(s.id, { state: { ...s.state, generatedReport: newReport } })} 
                />
              );
            })()}
          </div>
        </div>
      )}

      {activeNuance && (
        <NuanceEditor 
          studentName={activeNuance.studentName}
          rubricLabel={activeNuance.rubricLabel}
          initialValue={students.find(s => String(s.id) === String(activeNuance.studentId))?.content.nuances?.[activeNuance.rubricId] || []}
          onClose={() => setActiveNuance(null)}
          onSave={(nuances) => {
            const student = students.find(s => String(s.id) === String(activeNuance.studentId));
            if (student) {
              const currentNuances = student.content.nuances || {};
              const nextNuances = { ...currentNuances };
              if (nuances.length > 0) {
                nextNuances[activeNuance.rubricId] = nuances;
              } else {
                delete nextNuances[activeNuance.rubricId];
              }
              onUpdateStudentField(student.id, { content: { ...student.content, nuances: nextNuances } });
            }
            setActiveNuance(null);
          }}
        />
      )}
    </div>
  );
};
