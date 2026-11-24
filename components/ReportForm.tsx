
import React, { useState, useRef, useEffect } from 'react';
import { ReportConfig, Gender, Snippet, BatchStudent, ClassGroup } from '../types';
import { TONE_OPTIONS, LANGUAGE_OPTIONS, SYSTEM_INSTRUCTION, DEFAULT_RUBRICS, RECOMMENDATION_MAPPINGS, predictGender, saveGenderOverride } from '../constants';
import { PERSONALITY_BLOCK } from '../core/config/personalityRubric.js';
import { PersonalitySelector } from '../ui/modules/ReportGenerator/PersonalitySelector';
import { Sparkles, FileText, User, MessageSquare, Settings, ChevronDown, ChevronUp, RefreshCcw, X, Tag, Mic, MicOff, Loader2, BookmarkPlus, Quote, Lightbulb, Heart, ListChecks, Edit3, Plus, AlertCircle, FileCheck, Users, Link as LinkIcon, RefreshCw, Sliders, Globe, Terminal, UserCheck } from 'lucide-react';
import { RubricSelector } from './RubricSelector';
import { getConstructiveSuggestion } from '../services/geminiService';

interface ReportFormProps {
  config: ReportConfig;
  onChange: (field: keyof ReportConfig, value: any) => void;
  onSubmit: () => void;
  isLoading: boolean;
  availableGroups?: ClassGroup[];
  currentStudentId?: string | null;
  onSelectStudent?: (studentId: string) => void;
}

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

const isImprovementAreaItem = (text: string): boolean => {
    const personalityRubric = DEFAULT_RUBRICS.find(r => r.name.includes("Personalitat"));
    if (!personalityRubric) return false;
    const improvementCategories = personalityRubric.categories.filter(c => c.name.includes("Millora"));
    return improvementCategories.some(cat => cat.items.some(item => item.text === text));
};

export const ReportForm: React.FC<ReportFormProps> = ({ 
    config, 
    onChange, 
    onSubmit, 
    isLoading, 
    availableGroups = [],
    currentStudentId,
    onSelectStudent
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [listeningField, setListeningField] = useState<'observations' | 'anecdote' | 'recommendation' | 'selfAssessment' | null>(null);
  const [dictationLang, setDictationLang] = useState<'es-ES' | 'ca-ES'>('ca-ES'); 
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [customRecommendations, setCustomRecommendations] = useState<string[]>([]);
  const [newRecommendation, setNewRecommendation] = useState('');
  
  const recognitionRef = useRef<any>(null);
  const isExplicitlyStopped = useRef(false);
  
  const observationsRef = useRef(config.observations);
  const anecdoteRef = useRef(config.anecdote || '');
  const selfAssessmentRef = useRef(config.selfAssessment || '');
  const newRecRef = useRef(newRecommendation);

  const [aiSuggestion, setAiSuggestion] = useState<{ original: string, text: string } | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  
  useEffect(() => { observationsRef.current = config.observations; }, [config.observations]);
  useEffect(() => { anecdoteRef.current = config.anecdote || ''; }, [config.anecdote]);
  useEffect(() => { selfAssessmentRef.current = config.selfAssessment || ''; }, [config.selfAssessment]);
  useEffect(() => { newRecRef.current = newRecommendation; }, [newRecommendation]);

  useEffect(() => {
    const savedSnippets = localStorage.getItem('pedagogic_snippets');
    if (savedSnippets) try { setSnippets(JSON.parse(savedSnippets)); } catch (e) {}
    const savedRecs = localStorage.getItem('custom_recommendations');
    if (savedRecs) try { setCustomRecommendations(JSON.parse(savedRecs)); } catch (e) {}
  }, []);

  const saveSnippet = () => {
    if (!config.observations.trim()) return;
    const newSnippet: Snippet = { id: Date.now().toString(), text: config.observations.trim() };
    const updated = [...snippets, newSnippet];
    setSnippets(updated);
    localStorage.setItem('pedagogic_snippets', JSON.stringify(updated));
  };

  const applySnippet = (text: string) => {
    const current = config.observations;
    const separator = current.length > 0 && !current.endsWith(' ') ? ' ' : '';
    onChange('observations', current + separator + text);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange('studentName', e.target.value);
      if (e.target.value.trim().length > 2) onChange('gender', predictGender(e.target.value));
  };

  const handleManualGenderChange = (newGender: Gender) => {
      onChange('gender', newGender);
      saveGenderOverride(config.studentName, newGender);
  };

  const toggleListening = (field: 'observations' | 'anecdote' | 'recommendation' | 'selfAssessment') => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    
    if (listeningField) {
      isExplicitlyStopped.current = true;
      if (recognitionRef.current) recognitionRef.current.stop();
      if (listeningField === field) { setListeningField(null); return; }
    }

    isExplicitlyStopped.current = false;
    const recognition = new SpeechRecognition();
    recognition.lang = dictationLang;
    recognition.continuous = true;
    recognition.interimResults = true;
    
    recognition.onstart = () => setListeningField(field);
    
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
      }
      if (finalTranscript) {
        const refs = { observations: observationsRef, anecdote: anecdoteRef, selfAssessment: selfAssessmentRef, recommendation: newRecRef };
        const currentVal = refs[field].current;
        const sep = currentVal.length > 0 && !currentVal.endsWith(' ') ? ' ' : '';
        if (field === 'recommendation') setNewRecommendation(currentVal + sep + finalTranscript);
        else onChange(field, currentVal + sep + finalTranscript);
      }
    };
    
    recognition.onend = () => { 
        if (!isExplicitlyStopped.current && listeningField === field) recognition.start(); 
        else if (listeningField === field) setListeningField(null);
    };
    
    recognitionRef.current = recognition;
    recognition.start();
  };

  const LangToggle = () => (
      <div className="flex bg-warm-100 rounded-lg p-0.5 border border-warm-200 shadow-inner">
          <button onClick={() => setDictationLang('es-ES')} className={`px-2 py-1 text-[9px] font-black rounded-md transition-all ${dictationLang === 'es-ES' ? 'bg-white shadow-sm text-primary-900' : 'text-slate-400 hover:text-slate-600'}`}>ES</button>
          <button onClick={() => setDictationLang('ca-ES')} className={`px-2 py-1 text-[9px] font-black rounded-md transition-all ${dictationLang === 'ca-ES' ? 'bg-white shadow-sm text-primary-900' : 'text-slate-400 hover:text-slate-600'}`}>CA</button>
      </div>
  );

  return (
    <div className={`bg-white rounded-[3rem] shadow-2xl border transition-all duration-500 ${currentStudentId ? 'border-primary-400 ring-8 ring-primary-50' : 'border-warm-200'}`}>
      <div className="p-8 md:p-12 space-y-10">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-warm-100 pb-8">
            <div className="flex items-center gap-4">
                <div className={`p-4 rounded-2xl ${currentStudentId ? 'bg-primary-900 text-white shadow-lg' : 'bg-warm-100 text-primary-900'}`}>
                    {currentStudentId ? <LinkIcon className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                </div>
                <div>
                    <h2 className="text-2xl font-black text-primary-900 uppercase tracking-tight">Fitxa de l'Alumne</h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Dades bàsiques i acadèmiques</p>
                </div>
            </div>
            {availableGroups.length > 0 && (
                <div className="flex items-center gap-2 bg-warm-50 p-2 rounded-2xl border border-warm-200">
                    <Users className="w-4 h-4 text-warm-300 ml-2" />
                    <select className="text-[11px] font-black uppercase bg-transparent outline-none text-slate-500 pr-4 cursor-pointer" value={currentStudentId || ""} onChange={(e) => onSelectStudent && onSelectStudent(e.target.value)}>
                        <option value="">Llista d'Aula</option>
                        {availableGroups.map(group => (
                            <optgroup key={group.id} label={group.name}>
                                {group.students.map(s => <option key={s.id} value={s.id}>{s.info.name}</option>)}
                            </optgroup>
                        ))}
                    </select>
                </div>
            )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Identificació</label>
                <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-primary-600 transition-colors" />
                    <input type="text" value={config.studentName} onChange={handleNameChange} placeholder="Nom i cognoms..." className="w-full pl-12 pr-6 py-4 bg-warm-50 border border-warm-200 rounded-2xl font-bold text-slate-800 outline-none focus:border-primary-400 focus:bg-white transition-all shadow-inner" />
                </div>
            </div>
            <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Gènere Gramatical</label>
                <div className="flex gap-4">
                    {['Masculí', 'Femení'].map(g => (
                        <button key={g} onClick={() => handleManualGenderChange(g as Gender)} className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all ${config.gender === g ? 'bg-primary-900 text-white border-primary-950 shadow-xl scale-105' : 'bg-white text-slate-400 border-warm-200 hover:bg-warm-50'}`}>{g}</button>
                    ))}
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Quote className="w-3.5 h-3.5 text-orange-400" /> Anècdota</label>
                    <div className="flex items-center gap-2">
                        <LangToggle />
                        <button onClick={() => toggleListening('anecdote')} className={`p-2 rounded-xl transition-all ${listeningField === 'anecdote' ? 'bg-red-500 text-white animate-pulse shadow-lg' : 'bg-warm-100 text-slate-400 hover:text-primary-900'}`}><Mic className="w-4 h-4" /></button>
                    </div>
                </div>
                <textarea value={config.anecdote || ''} onChange={(e) => onChange('anecdote', e.target.value)} placeholder="Moment clau o detall humà..." className="w-full h-32 p-5 bg-warm-50/50 border border-warm-200 rounded-[2rem] text-xs font-medium outline-none focus:border-orange-200 focus:bg-white transition-all resize-none leading-relaxed" />
            </div>
            <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><UserCheck className="w-3.5 h-3.5 text-emerald-500" /> Autoevaluació</label>
                    <div className="flex items-center gap-2">
                        <LangToggle />
                        <button onClick={() => toggleListening('selfAssessment')} className={`p-2 rounded-xl transition-all ${listeningField === 'selfAssessment' ? 'bg-red-500 text-white animate-pulse shadow-lg' : 'bg-warm-100 text-slate-400 hover:text-primary-900'}`}><Mic className="w-4 h-4" /></button>
                    </div>
                </div>
                <textarea value={config.selfAssessment || ''} onChange={(e) => onChange('selfAssessment', e.target.value)} placeholder="Com s'ha vist l'alumne?..." className="w-full h-32 p-5 bg-warm-50/50 border border-warm-200 rounded-[2rem] text-xs font-medium outline-none focus:border-emerald-200 focus:bg-white transition-all resize-none leading-relaxed" />
            </div>
        </div>

        <button onClick={onSubmit} disabled={isLoading || !config.studentName} className={`w-full py-6 rounded-full font-black text-lg uppercase tracking-widest shadow-2xl transition-all flex items-center justify-center gap-4 ${isLoading ? 'bg-slate-100 text-slate-400' : 'bg-primary-900 text-white hover:bg-black hover:-translate-y-1'}`}>
            {isLoading ? <><Loader2 className="w-6 h-6 animate-spin" /> Redactant informe...</> : <><Sparkles className="w-6 h-6 text-amber-300" /> Generar Narrativa Pedagògica</>}
        </button>
      </div>
    </div>
  );
};
