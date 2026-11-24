
import React, { useState, useEffect, useRef } from 'react';
import { BatchStudent, ReportConfig, Snippet, ClassGroup } from '../types';
import { RubricSelector } from './RubricSelector';
import { X, Save, Mic, MicOff, Sparkles, Heart, ListChecks, FileCheck, BookmarkPlus, Quote, AlertCircle, Plus, Edit3, ArrowRightLeft, UserCheck, BookOpen } from 'lucide-react';
import { SYSTEM_INSTRUCTION, RECOMMENDATION_MAPPINGS, saveGenderOverride } from '../constants';

interface StudentDrawerProps {
    isOpen: boolean;
    student: BatchStudent | null;
    /* Fix: onClose should be a function */
    onClose: () => void;
    onSave: (id: string, updates: Partial<ReportConfig>) => void;
    // New Props for Moving
    availableGroups?: ClassGroup[];
    currentGroupId?: string;
    onMoveStudent?: (studentId: string, targetGroupId: string) => void;
}

export const StudentDrawer: React.FC<StudentDrawerProps> = ({ 
    isOpen, 
    student, 
    onClose, 
    onSave,
    availableGroups = [],
    currentGroupId,
    onMoveStudent
}) => {
    const [config, setConfig] = useState<ReportConfig | null>(null);
    
    // Voice Dictation States
    const [listeningField, setListeningField] = useState<'observations' | 'anecdote' | 'recommendation' | 'selfAssessment' | null>(null);
    const [dictationLang, setDictationLang] = useState<'es-ES' | 'ca-ES'>('es-ES'); // DEFAULT SPANISH
    
    const [snippets, setSnippets] = useState<Snippet[]>([]);
    const [newRecommendation, setNewRecommendation] = useState('');
    const [editingRecommendationIndex, setEditingRecommendationIndex] = useState<number | null>(null);
    
    // Voice Refs
    const recognitionRef = useRef<any>(null);
    const isExplicitlyStopped = useRef(false);
    
    // Refs to hold current values for onresult closure
    const observationsRef = useRef('');
    const anecdoteRef = useRef('');
    const selfAssessmentRef = useRef('');
    const newRecRef = useRef('');

    useEffect(() => {
        if (student) {
            // FIX: Initialize internal config from the student domain structure if config is missing
            const initialConfig: ReportConfig = student.config || {
                studentName: student.info.name,
                gender: student.info.gender,
                selectedObservations: student.content.tags,
                observations: Array.isArray(student.content.manualObservations) ? student.content.manualObservations.join('\n') : (typeof student.content.manualObservations === 'string' ? student.content.manualObservations : ''),
                anecdote: student.content.anecdote,
                selfAssessment: student.content.selfAssessment,
                recommendations: student.content.recommendations,
                hasIndividualPlan: student.info.isPI,
                language: 'Català',
                tone: 'Empàtic i Constructiu'
            };
            setConfig(JSON.parse(JSON.stringify(initialConfig))); // Deep copy
            observationsRef.current = initialConfig.observations;
            anecdoteRef.current = initialConfig.anecdote || '';
            selfAssessmentRef.current = initialConfig.selfAssessment || '';
        }
    }, [student]);

    // Keep refs in sync when manual edits happen
    useEffect(() => { if(config) observationsRef.current = config.observations; }, [config?.observations]);
    useEffect(() => { if(config) anecdoteRef.current = config.anecdote || ''; }, [config?.anecdote]);
    useEffect(() => { if(config) selfAssessmentRef.current = config.selfAssessment || ''; }, [config?.selfAssessment]);
    useEffect(() => { newRecRef.current = newRecommendation; }, [newRecommendation]);

    // Load snippets
    useEffect(() => {
        const saved = localStorage.getItem('pedagogic_snippets');
        if (saved) try { setSnippets(JSON.parse(saved)); } catch (e) {}
    }, []);

    if (!isOpen || !student || !config) return null;

    const handleUpdate = (field: keyof ReportConfig, value: any) => {
        setConfig(prev => prev ? ({ ...prev, [field]: value }) : null);
        
        // If updating gender manually, save preference
        if (field === 'gender' && config.studentName) {
            saveGenderOverride(config.studentName, value);
        }
    };

    const handleSaveAndClose = () => {
        if (config) {
            onSave(student.id, config);
        }
        /* Fix: onClose is now correctly typed as a function */
        onClose();
    };

    const applySnippet = (text: string) => {
        const current = config.observations;
        const separator = current.length > 0 && !current.endsWith(' ') ? ' ' : '';
        handleUpdate('observations', current + separator + text);
    };

    // Unified Voice Handler
    const toggleListening = (field: 'observations' | 'anecdote' | 'recommendation' | 'selfAssessment') => {
        // Fix: Use type casting to access vendor-prefixed SpeechRecognition API which is not in standard Window type.
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) { alert("Navegador no compatible."); return; }

        // Stop if currently listening
        if (listeningField) {
            isExplicitlyStopped.current = true;
            if (recognitionRef.current) recognitionRef.current.stop();
            
            if (listeningField === field) {
                setListeningField(null);
                return;
            }
        }

        isExplicitlyStopped.current = false;
        const recognition = new SpeechRecognition();
        
        // Use default ES or selected
        recognition.lang = dictationLang;
        
        recognition.continuous = true;
        recognition.interimResults = true;
        
        recognition.onstart = () => setListeningField(field);
        
        recognition.onresult = (event: any) => {
            let final = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) final += event.results[i][0].transcript;
            }
            if (final) {
                if (field === 'observations') {
                    const current = observationsRef.current;
                    const sep = current.length > 0 && !current.endsWith(' ') ? ' ' : '';
                    handleUpdate('observations', current + sep + final);
                } else if (field === 'anecdote') {
                    const current = anecdoteRef.current;
                    const sep = current.length > 0 && !current.endsWith(' ') ? ' ' : '';
                    handleUpdate('anecdote', current + sep + final);
                } else if (field === 'selfAssessment') {
                    const current = selfAssessmentRef.current;
                    const sep = current.length > 0 && !current.endsWith(' ') ? ' ' : '';
                    handleUpdate('selfAssessment', current + sep + final);
                } else if (field === 'recommendation') {
                    const current = newRecRef.current;
                    const sep = current.length > 0 && !current.endsWith(' ') ? ' ' : '';
                    setNewRecommendation(current + sep + final);
                }
            }
        };
        
        recognition.onend = () => {
            if (!isExplicitlyStopped.current && listeningField === field) recognition.start();
            else if (listeningField === field) setListeningField(null);
        };
        
        recognitionRef.current = recognition;
        recognition.start();
    };

    const checkAndAddAutoRecommendation = (text: string) => {
        for (const [keyword, recommendation] of Object.entries(RECOMMENDATION_MAPPINGS)) {
            if (text.toLowerCase().includes(keyword.toLowerCase())) {
                if (!config.recommendations.includes(recommendation)) {
                    handleUpdate('recommendations', [...config.recommendations, recommendation]);
                }
            }
        }
    };

    // Helper for toggle UI
    const LangToggle = () => (
        <div className="flex bg-gray-100 rounded-md p-0.5 border border-gray-200">
            <button onClick={() => setDictationLang('es-ES')} className={`px-1.5 text-[10px] font-bold rounded ${dictationLang === 'es-ES' ? 'bg-white shadow text-gray-800' : 'text-gray-400'}`}>ES</button>
            <button onClick={() => setDictationLang('ca-ES')} className={`px-1.5 text-[10px] font-bold rounded ${dictationLang === 'ca-ES' ? 'bg-white shadow text-gray-800' : 'text-gray-400'}`}>CA</button>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-primary-900/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            
            {/* Drawer Panel */}
            <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-slide-left border-l border-gray-200">
                
                {/* Header */}
                <div className="px-6 py-4 bg-primary-50 border-b border-primary-100 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        {student.info.photoUrl && (
                            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary-300 shadow-md shrink-0">
                                <img src={student.info.photoUrl} alt={student.info.name} className="w-full h-full object-cover" />
                            </div>
                        )}
                        <div>
                            {/* FIX: Access name from the student info structure */}
                            <h2 className="text-xl font-bold text-primary-900">{student.info.name}</h2>
                            <div className="flex items-center gap-2">
                                <p className="text-xs text-primary-600">Edició detallada</p>
                            </div>
                            {/* MOVE STUDENT DROPDOWN */}
                            {onMoveStudent && availableGroups.length > 1 && (
                                <div className="relative group ml-2">
                                    <button className="flex items-center gap-1 text-[10px] bg-white border border-gray-200 px-2 py-0.5 rounded hover:bg-gray-50 text-gray-500">
                                        <ArrowRightLeft className="w-3 h-3" /> Moure
                                    </button>
                                    <div className="absolute left-0 mt-1 w-32 bg-white border border-gray-200 rounded shadow-lg hidden group-hover:block z-10">
                                        {availableGroups.filter(g => g.id !== currentGroupId).map(g => (
                                            <button 
                                                key={g.id}
                                                onClick={() => onMoveStudent(student.id, g.id)}
                                                className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-50 text-gray-700"
                                            >
                                                {g.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleSaveAndClose} className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary-700 flex items-center gap-2 shadow-lg shadow-primary-200/50">
                            <Save className="w-4 h-4" /> Guardar
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-8">
                    
                    {/* 1. PI & Gender Toggle */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className={`flex-1 p-3 rounded-xl border flex items-center justify-between transition-colors ${config.hasIndividualPlan ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${config.hasIndividualPlan ? 'bg-amber-100 text-amber-600' : 'bg-white text-gray-400'}`}>
                                    <FileCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <span className={`block text-sm font-bold ${config.hasIndividualPlan ? 'text-amber-900' : 'text-gray-600'}`}>Pla Individual (PI)</span>
                                    <span className="text-[10px] text-gray-500">Activar adaptacions</span>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={config.hasIndividualPlan} onChange={(e) => handleUpdate('hasIndividualPlan', e.target.checked)} />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                            </label>
                        </div>

                        <div className="flex-1 p-3 rounded-xl bg-gray-50 border border-gray-200 flex flex-col justify-center">
                             <span className="text-xs font-bold text-gray-500 mb-2">Gènere Gramatical</span>
                             <div className="flex bg-white rounded-lg p-1 border border-gray-200">
                                 <button 
                                    onClick={() => handleUpdate('gender', 'Masculí')}
                                    className={`flex-1 py-1 text-xs font-bold rounded ${config.gender === 'Masculí' ? 'bg-blue-100 text-blue-700' : 'text-gray-400'}`}
                                 >Masculí</button>
                                 <button 
                                    onClick={() => handleUpdate('gender', 'Femení')}
                                    className={`flex-1 py-1 text-xs font-bold rounded ${config.gender === 'Femení' ? 'bg-pink-100 text-pink-700' : 'text-gray-400'}`}
                                 >Femení</button>
                             </div>
                        </div>
                    </div>

                    {/* Reading Register Badge Card */}
                    {(() => {
                        const reading: any = student.content?.reading || {};
                        const cat = reading.cat || (reading.wpm ? reading : null) || (student.metrics?.readingSpeed ? { wpm: student.metrics.readingSpeed, errors: student.metrics.readingErrors, comp: student.metrics.readingCompText, levelTag: student.metrics.readingLevelTag } : null);
                        const cast = reading.cast || null;
                        if (!cat && !cast) return null;
                        return (
                            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                                        <BookOpen className="w-4 h-4 text-blue-600" /> Registre de Lectura (Català i Castellà)
                                    </div>
                                </div>
                                {cat && (
                                    <div className="bg-white/90 p-3 rounded-lg border border-blue-100 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-blue-900 text-xs flex items-center gap-1">
                                                <span className="w-2 h-2 rounded-full bg-blue-600"></span> Català
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black uppercase">
                                                {cat.wpm} ppm {cat.levelTag ? `• ${cat.levelTag}` : ''}
                                            </span>
                                        </div>
                                        {cat.errors && <p className="text-xs text-slate-700 font-medium">Mecànica: "{cat.errors}"</p>}
                                        {cat.comp && <p className="text-xs text-slate-600 italic">Comprensió: "{cat.comp}"</p>}
                                    </div>
                                )}
                                {cast && (
                                    <div className="bg-white/90 p-3 rounded-lg border border-indigo-100 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-indigo-900 text-xs flex items-center gap-1">
                                                <span className="w-2 h-2 rounded-full bg-indigo-600"></span> Castellà
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase">
                                                {cast.wpm} ppm {cast.levelTag ? `• ${cast.levelTag}` : ''}
                                            </span>
                                        </div>
                                        {cast.errors && <p className="text-xs text-slate-700 font-medium">Mecànica: "{cast.errors}"</p>}
                                        {cast.comp && <p className="text-xs text-slate-600 italic">Comprensió: "{cast.comp}"</p>}
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* 2. Anecdote - UPDATED ICON AND COLOR */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <Quote className="w-4 h-4 text-orange-500" /> Anècdota Personal
                            </label>
                            <div className="relative">
                                <textarea
                                    value={config.anecdote || ''}
                                    onChange={(e) => handleUpdate('anecdote', e.target.value)}
                                    placeholder="Detall clau..."
                                    className="w-full h-24 p-3 rounded-xl border border-orange-200 bg-orange-50/30 focus:ring-2 focus:ring-orange-200 outline-none text-sm resize-none pr-10"
                                />
                                <div className="absolute bottom-2 right-2 flex items-center gap-1">
                                    <LangToggle />
                                    <button
                                        onClick={() => toggleListening('anecdote')}
                                        className={`p-1.5 rounded-full transition-all ${listeningField === 'anecdote' ? 'bg-red-500 text-white animate-pulse' : 'bg-white/50 text-gray-400 hover:text-orange-600'}`}
                                        title={`Dictar en ${dictationLang === 'ca-ES' ? 'Català' : 'Español'}`}
                                    >
                                        {listeningField === 'anecdote' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* NEW: SELF ASSESSMENT FEEDBACK */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 flex items-center gap-2 mb-2">
                                <UserCheck className="w-4 h-4 text-teal-600" /> Feedback Autoevaluació
                            </label>
                            <div className="relative">
                                <textarea 
                                    value={config.selfAssessment || ''} 
                                    onChange={(e) => handleUpdate('selfAssessment', e.target.value)} 
                                    placeholder="Com s'ha avaluat? (Realista, exigent, baixa autoestima...)" 
                                    className="block w-full rounded-xl border-teal-200 border bg-teal-50/20 p-3 pl-4 pr-10 focus:ring-2 focus:ring-teal-200 text-sm resize-none h-24" 
                                />
                                {/* MIC FOR SELF ASSESSMENT */}
                                <div className="absolute right-2 top-2 flex items-center gap-1">
                                    <LangToggle />
                                    <button 
                                        onClick={() => toggleListening('selfAssessment')}
                                        className={`p-1.5 rounded-full transition-all ${listeningField === 'selfAssessment' ? 'bg-red-500 text-white animate-pulse' : 'bg-white/50 text-gray-400 hover:text-teal-600'}`}
                                        title={`Dictar en ${dictationLang === 'ca-ES' ? 'Català' : 'Español'}`}
                                    >
                                        {listeningField === 'selfAssessment' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. Observations & Voice */}
                    <div className="relative group">
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center justify-between">
                            <span>Observacions Manuals</span>
                            {listeningField === 'observations' && <span className="text-red-500 text-xs font-bold animate-pulse">Escoltant...</span>}
                        </label>
                        <textarea
                            value={config.observations}
                            onChange={(e) => handleUpdate('observations', e.target.value)}
                            className="w-full h-32 p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-200 outline-none resize-none text-sm"
                            placeholder="Escriu o dicta observacions específiques..."
                        />
                        <div className="absolute bottom-4 right-4 flex items-center gap-2">
                            <LangToggle />
                            <button
                                onClick={() => toggleListening('observations')}
                                className={`p-2 rounded-full shadow-md transition-all ${listeningField === 'observations' ? 'bg-red-500 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}
                                title={`Dictar en ${dictationLang === 'ca-ES' ? 'Català' : 'Español'}`}
                            >
                                {listeningField === 'observations' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                            </button>
                        </div>
                        
                        {/* Snippets */}
                        {snippets.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {snippets.map(s => (
                                    <button key={s.id} onClick={() => applySnippet(s.text)} className="text-[10px] px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded border border-gray-200 text-gray-600 truncate max-w-[150px]">
                                        {s.text}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 4. Recommendations */}
                    <div className="bg-violet-50/50 p-4 rounded-xl border border-violet-100">
                        <label className="text-sm font-bold text-violet-900 mb-3 block flex items-center gap-2">
                            <ListChecks className="w-4 h-4" /> Pla de Treball (Propostes)
                        </label>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {config.recommendations.map((rec, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-white border border-violet-200 text-violet-800 px-3 py-1.5 rounded-lg text-xs shadow-sm">
                                    <span>{rec}</span>
                                    <button onClick={() => handleUpdate('recommendations', config.recommendations.filter((_, i) => i !== idx))} className="text-violet-400 hover:text-red-500">
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2 relative">
                            <input 
                                className="flex-1 text-xs p-2 border border-violet-200 rounded-lg outline-none pr-8"
                                placeholder="Afegir recomanació..."
                                value={newRecommendation}
                                onChange={(e) => setNewRecommendation(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newRecommendation.trim()) {
                                        handleUpdate('recommendations', [...config.recommendations, newRecommendation.trim()]);
                                        setNewRecommendation('');
                                    }
                                }}
                            />
                            
                            {/* MIC FOR RECOMMENDATIONS */}
                            <div className="absolute right-10 top-1.5 flex items-center gap-1">
                                <LangToggle />
                                <button 
                                    onClick={() => toggleListening('recommendation')}
                                    className={`p-1 rounded transition-all ${listeningField === 'recommendation' ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-violet-600'}`}
                                    title={`Dictar en ${dictationLang === 'ca-ES' ? 'Català' : 'Español'}`}
                                >
                                    {listeningField === 'recommendation' ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                                </button>
                            </div>

                            <button 
                                onClick={() => {
                                    if(newRecommendation.trim()) {
                                        handleUpdate('recommendations', [...config.recommendations, newRecommendation.trim()]);
                                        setNewRecommendation('');
                                    }
                                }}
                                className="bg-violet-100 text-violet-600 p-2 rounded-lg hover:bg-violet-200"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* 5. Full Rubric Selector */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Rúbrica Completa</label>
                        <RubricSelector 
                            onSelectObservation={(text) => {
                                const current = config.selectedObservations;
                                const updated = current.includes(text) 
                                    ? current.filter(t => t !== text) 
                                    : [...current, text];
                                handleUpdate('selectedObservations', updated);
                                if (!current.includes(text)) checkAndAddAutoRecommendation(text);
                            }}
                            onSelectMultipleObservations={(texts) => {
                                const newItems = texts.filter(t => !config.selectedObservations.includes(t));
                                if (newItems.length > 0) {
                                    handleUpdate('selectedObservations', [...config.selectedObservations, ...newItems]);
                                    newItems.forEach(checkAndAddAutoRecommendation);
                                }
                            }}
                            selectedItems={config.selectedObservations}
                        />
                    </div>

                </div>
            </div>
        </div>
    );
};
