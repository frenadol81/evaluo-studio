
import React, { useState, useMemo, useRef } from 'react';
import { StudentPortrait } from '../../components/StudentPortrait';
import { 
    Sparkles, Loader2, MessageSquare, Quote, UserCheck, 
    ListChecks, Plus, X, Mic, Globe, Lightbulb, 
    Zap, ChevronRight, RefreshCcw, BookmarkPlus,
    PenTool, Check, Hammer, Copy, RefreshCw,
    CircleDashed, CheckCircle, ShieldCheck, AlertCircle,
    Trash2, LineChart, History, Waves, BookOpen
} from 'lucide-react';
import { getConstructiveSuggestion, getEvolutionSuggestions, generateMakerNarrative, generatePlanetaBlauNarrative } from '../../services/geminiService';
import { MAKER_SYSTEM_INSTRUCTION, PLANETA_BLAU_SYSTEM_INSTRUCTION } from '../../constants';
import { RUBRIC_MAKER } from '../../core/config/rubrics/07_maker';
import { RUBRIC_PLANETA_BLAU } from '../../core/config/rubrics/08_planeta_blau';
import { buildPlanetaBlauReport } from '../../application/useCases/buildPlanetaBlauReport.js';
import { isOptionSelected } from '../../core/utils/rubricMatcher.js';

interface PedagogicalInspectorProps {
  student: any;
  onGenerate: () => void;
  isGenerating: boolean;
  onUpdateContent: (field: string, value: any) => void;
  makerInstructions?: string;
  planetaBlauInstructions?: string;
  onUpdateStudent: (updates: any) => void;
  onClose?: () => void;
  trimester?: number;
}

export const PedagogicalInspector: React.FC<PedagogicalInspectorProps> = ({ 
    student, 
    onGenerate, 
    isGenerating,
    onUpdateContent,
    makerInstructions = MAKER_SYSTEM_INSTRUCTION,
    planetaBlauInstructions = PLANETA_BLAU_SYSTEM_INSTRUCTION,
    onUpdateStudent,
    onClose,
    trimester = 2
}) => {
  const { content, state } = student;
  const [listeningField, setListeningField] = useState<string | null>(null);
  const [dictationLang, setDictationLang] = useState('ca-ES');
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isLoadingEvolution, setIsLoadingEvolution] = useState(false);
  const [isGeneratingMaker, setIsGeneratingMaker] = useState(false);
  const [makerCopied, setMakerCopied] = useState(false);
  const [isGeneratingPlanetaBlau, setIsGeneratingPlanetaBlau] = useState(false);
  const [planetaBlauCopied, setPlanetaBlauCopied] = useState(false);
  const recognitionRef = useRef<any>(null);

  const handleToggleVoice = (field: string) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    
    if (listeningField === field) { 
        recognitionRef.current?.stop(); 
        setListeningField(null); 
        return; 
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = dictationLang;
    recognition.continuous = true;
    recognition.onstart = () => setListeningField(field);
    recognition.onresult = (event: any) => {
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) { 
          if (event.results[i].isFinal) final += event.results[i][0].transcript; 
      }
      if (final) {
        if (field === 'manualObservations') {
          const currentManual = Array.isArray(content.manualObservations) ? content.manualObservations : (typeof content.manualObservations === 'string' ? [content.manualObservations] : []);
          onUpdateContent('manualObservations', [...currentManual, final]);
        }
        else onUpdateContent(field, ((content[field] || "") + " " + final).trim());
      }
    };
    recognition.onend = () => setListeningField(null);
    recognitionRef.current = recognition;
    recognition.start();
  };

  const fetchAiSuggestions = async () => {
    setIsLoadingSuggestions(true);
    try {
        const suggestion = await getConstructiveSuggestion(
            student, 
            dictationLang === 'ca-ES' ? 'Català' : 'Castellà',
            trimester
        );
        const currentSuggestions = content.aiSuggestions || [];
        const nextSuggestions = [...new Set([...currentSuggestions, suggestion])].slice(-5);
        onUpdateContent('aiSuggestions', nextSuggestions);
    } catch (e) {
        console.error(e);
    } finally {
        setIsLoadingSuggestions(false);
    }
  };

  const fetchEvolutionSuggestions = async () => {
    setIsLoadingEvolution(true);
    try {
        const language = dictationLang === 'ca-ES' ? 'Català' : 'Castellà';
        const rawSuggestions = await getEvolutionSuggestions(student, language, trimester);
        
        // Parsing robust que accepti prefixes amb o sense espais/punts
        const pos = rawSuggestions
            .filter(s => s.toUpperCase().includes('[POS]'))
            .map(s => s.replace(/\[POS\][:\s-]*/i, '').trim());
            
        const neg = rawSuggestions
            .filter(s => s.toUpperCase().includes('[NEG]'))
            .map(s => s.replace(/\[NEG\][:\s-]*/i, '').trim());

        onUpdateContent('suggestedEvolutions', { pos, neg });
    } catch (e) {
        console.error(e);
    } finally {
        setIsLoadingEvolution(false);
    }
  };

  const handleGenerateMaker = async () => {
    const makerOptions = RUBRIC_MAKER.data.flatMap(d => d.options);
    const makerTags = (content.tags || []).filter(t => makerOptions.includes(t));
    
    // Recollir també els matisos (nuances) de l'Espai Maker per incorporar-los al relat generat
    const nuances = content.nuances || {};
    const makerNuances = RUBRIC_MAKER.data
      .filter(d => nuances[d.id])
      .map(d => {
        const nuanceVal = nuances[d.id];
        const nuanceText = Array.isArray(nuanceVal) ? nuanceVal.join('. ') : nuanceVal;
        return `MATÍS PRIORITARI SOBRE "${d.label || d.title || d.name || 'aquest ítem'}": ${nuanceText}`;
      });
      
    const allMakerTags = [...makerTags, ...makerNuances];
    
    if (allMakerTags.length === 0 && !content.maker?.narrative) return;
    
    setIsGeneratingMaker(true);
    try {
        const text = await generateMakerNarrative(
            student,
            makerInstructions,
            allMakerTags,
            dictationLang === 'ca-ES' ? 'Català' : 'Castellà'
        );
        onUpdateContent('maker', { ...content.maker, narrative: text });
    } catch (e) {
        console.error(e);
    } finally {
        setIsGeneratingMaker(false);
    }
  };

  const copyMakerNarrative = () => {
    if (content.maker?.narrative) {
        navigator.clipboard.writeText(content.maker.narrative);
        setMakerCopied(true);
        setTimeout(() => setMakerCopied(false), 2000);
    }
  };

  const handleGeneratePlanetaBlau = async () => {
    const pbOptions = RUBRIC_PLANETA_BLAU.data.flatMap(d => d.options);
    const studentName = student.info?.name || '';
    const pbTags = (content.tags || []).filter(t => pbOptions.some(opt => isOptionSelected([t], opt, studentName)));
    
    const nuances = content.nuances || {};
    const pbNuances = RUBRIC_PLANETA_BLAU.data
      .filter(d => nuances[d.id])
      .map(d => {
        const nuanceVal = nuances[d.id];
        const nuanceText = Array.isArray(nuanceVal) ? nuanceVal.join('. ') : nuanceVal;
        return `MATÍS PRIORITARI SOBRE "${d.label || d.title || d.name || 'aquest ítem'}": ${nuanceText}`;
      });
      
    const allPBTags = [...pbTags, ...pbNuances];
    
    if (allPBTags.length === 0 && !content.planetaBlau?.narrative) return;
    
    setIsGeneratingPlanetaBlau(true);
    try {
        const text = buildPlanetaBlauReport(student);
        onUpdateContent('planetaBlau', { ...content.planetaBlau, narrative: text });
    } catch (e) {
        console.error(e);
    } finally {
        setIsGeneratingPlanetaBlau(false);
    }
  };

  const copyPlanetaBlauNarrative = () => {
    if (content.planetaBlau?.narrative) {
        navigator.clipboard.writeText(content.planetaBlau.narrative);
        setPlanetaBlauCopied(true);
        setTimeout(() => setPlanetaBlauCopied(false), 2000);
    }
  };

  const richness = useMemo(() => {
    let score = 0;
    if (content.tags?.length > 0) score += Math.min(60, content.tags.length * 4);
    if (content.anecdote?.length > 20) score += 15;
    const manualObs = Array.isArray(content.manualObservations) ? content.manualObservations : (typeof content.manualObservations === 'string' ? [content.manualObservations] : []);
    if (manualObs.length > 0) score += 15;
    if (content.selfAssessment?.length > 10) score += 10;
    return Math.min(100, score);
  }, [content]);

  const handleSetStatus = (newStatus: string) => {
      onUpdateStudent({ 
          state: { 
              ...state,
              status: newStatus,
              generatedReport: newStatus === 'idle' ? null : state.generatedReport
          } 
      });
  };

  const LangSelector = () => (
      <div className="flex bg-warm-100 rounded-lg p-0.5 border border-warm-200">
          <button onClick={() => setDictationLang('ca-ES')} className={`px-2 py-0.5 text-[8px] font-black rounded-md transition-all ${dictationLang === 'ca-ES' ? 'bg-primary-900 text-white shadow-sm' : 'text-slate-400'}`}>CA</button>
          <button onClick={() => setDictationLang('es-ES')} className={`px-2 py-0.5 text-[8px] font-black rounded-md transition-all ${dictationLang === 'es-ES' ? 'bg-primary-900 text-white shadow-sm' : 'text-slate-400'}`}>ES</button>
      </div>
  );

  const pbOptionsData = RUBRIC_PLANETA_BLAU.data.flatMap(d => d.options);
  const hasPlanetaBlauData = (content.tags || []).some(t => pbOptionsData.includes(t)) || Boolean(content.planetaBlau?.narrative);

  const makerTechnicalIds = ['mkr_disseny', 'mkr_tecnologia', 'mkr_comunicacio', 'mkr_sostenibilitat'];
  const hasMakerTechnical = (content.tags || []).some(t => RUBRIC_MAKER.data.filter(d => makerTechnicalIds.includes(d.id)).flatMap(d => d.options).includes(t));
  const hasMakerSpecific = hasMakerTechnical || Boolean(content.maker?.narrative) || (content.tags || []).some(t => RUBRIC_MAKER.data.filter(d => ['mkr_colaboracio', 'mkr_error'].includes(d.id)).flatMap(d => d.options).includes(t));
  const makerOptionsData = RUBRIC_MAKER.data.flatMap(d => d.options);
  const hasMakerData = hasMakerSpecific || (!hasPlanetaBlauData && (content.tags || []).some(t => makerOptionsData.includes(t)));

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="px-6 py-4 border-b border-warm-100 bg-warm-50/30 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
              {student.info.photoUrl ? (
                <StudentPortrait src={student.info.photoUrl} name={student.info.name} />
              ) : <div className="bg-primary-900 p-2 rounded-lg shadow-md"><UserCheck className="w-4 h-4 text-white" /></div>}
              <div className="flex flex-col">
                <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none">{student.info.name}</h3>
                <p className="text-[8px] font-black text-warm-500 uppercase tracking-widest mt-1">Inspector Pedagògic</p>
              </div>
          </div>
          <div className="flex items-center gap-2">
            {student.info.photoUrl && (
              <button type="button" title="Treure la foto" aria-label="Treure la foto"
                className="rounded-md border border-warm-200 bg-white p-1.5 text-slate-700 hover:text-red-700"
                onClick={() => {
                  if (window.confirm("Vols treure la foto d’aquest perfil?")) {
                    onUpdateStudent({ info: { ...student.info, photoUrl: '' } });
                  }
                }}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            <LangSelector />
            {onClose && (
              <button 
                onClick={onClose}
                className="p-1.5 text-slate-300 hover:text-primary-900 hover:bg-warm-100 rounded-lg transition-all"
                title="Tancar"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        
        {/* ESTADO DEL INFORME */}
        <section className="bg-warm-50/50 p-4 rounded-[1.5rem] border border-warm-200 space-y-3">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block px-1">Estat de l'Informe</label>
            <div className="grid grid-cols-3 gap-1.5">
                <button 
                    onClick={() => handleSetStatus('idle')}
                    className={`flex flex-col items-center justify-center gap-1 px-1 py-2 rounded-xl text-[8px] font-black uppercase transition-all border ${state.status === 'idle' ? 'bg-white border-primary-900 text-primary-900 shadow-sm' : 'bg-warm-100/50 border-warm-200 text-slate-400 hover:bg-white'}`}
                >
                    <CircleDashed className="w-3.5 h-3.5" /> Pendent
                </button>
                <button 
                    onClick={() => handleSetStatus('completed')}
                    className={`flex flex-col items-center justify-center gap-1 px-1 py-2 rounded-xl text-[8px] font-black uppercase transition-all border ${state.status === 'completed' ? 'bg-emerald-500 border-emerald-600 text-white shadow-sm' : 'bg-warm-100/50 border-warm-200 text-slate-400 hover:bg-white'}`}
                >
                    <CheckCircle className="w-3.5 h-3.5" /> Enllestit
                </button>
                <button 
                    onClick={() => handleSetStatus('reviewed')}
                    className={`flex flex-col items-center justify-center gap-1 px-1 py-2 rounded-xl text-[8px] font-black uppercase transition-all border ${state.status === 'reviewed' ? 'bg-indigo-600 border-indigo-700 text-white shadow-sm' : 'bg-warm-100/50 border-warm-200 text-slate-400 hover:bg-white'}`}
                >
                    <ShieldCheck className="w-3.5 h-3.5" /> Revisat
                </button>
            </div>
        </section>

        {/* Anàlisi d'Evolució (Només T3) */}
        {Number(trimester) === 3 && (
            <section className="space-y-4 p-5 bg-indigo-50/20 border-2 border-indigo-100 rounded-[2.5rem] animate-fade-in shadow-sm">
                <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-indigo-700 uppercase tracking-[0.1em] flex items-center gap-2">
                        <LineChart className="w-4 h-4" /> Anàlisi Anual d'Evolució
                    </label>
                    <button 
                        onClick={fetchEvolutionSuggestions} 
                        disabled={isLoadingEvolution} 
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
                    >
                        {isLoadingEvolution ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        <span className="text-[9px] font-black uppercase">Analitzar</span>
                    </button>
                </div>

                <div className="space-y-4">
                    {(!content.suggestedEvolutions || (content.suggestedEvolutions.pos?.length === 0 && content.suggestedEvolutions.neg?.length === 0)) && !isLoadingEvolution && (
                        <div className="p-6 bg-white/60 border border-dashed border-indigo-200 rounded-[2rem] flex flex-col items-center gap-3 text-center">
                            <History className="w-6 h-6 text-indigo-200" />
                            <p className="text-[9px] text-indigo-400 font-bold uppercase leading-relaxed px-4">L'IA analitzarà els informes del T1 i T2 per suggerir l'evolució anual.</p>
                        </div>
                    )}
                    
                    {/* Progressos positius */}
                    {content.suggestedEvolutions?.pos?.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest px-2">Progressió i Avenços</p>
                            <div className="grid gap-2">
                                {content.suggestedEvolutions.pos.map((sug: string, i: number) => (
                                    <button 
                                        key={i}
                                        onClick={() => {
                                            const current = content.evolutionPhrases || [];
                                            if (!current.includes(sug)) onUpdateContent('evolutionPhrases', [...current, sug]);
                                        }}
                                        className="text-left p-3 bg-white border border-indigo-100 rounded-2xl hover:border-emerald-400 transition-all shadow-sm flex items-center gap-3 active:scale-[0.98]"
                                    >
                                        <p className="text-[10px] font-bold text-slate-700 leading-tight italic flex-1">"{sug}"</p>
                                        <Plus className="w-4 h-4 text-emerald-500 shrink-0" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Aspectes a millorar */}
                    {content.suggestedEvolutions?.neg?.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest px-2">Aspectes de Millora / Atenció</p>
                            <div className="grid gap-2">
                                {content.suggestedEvolutions.neg.map((sug: string, i: number) => (
                                    <button 
                                        key={i}
                                        onClick={() => {
                                            const current = content.evolutionPhrases || [];
                                            if (!current.includes(sug)) onUpdateContent('evolutionPhrases', [...current, sug]);
                                        }}
                                        className="text-left p-3 bg-white border border-indigo-100 rounded-2xl hover:border-amber-400 transition-all shadow-sm flex items-center gap-3 active:scale-[0.98]"
                                    >
                                        <p className="text-[10px] font-bold text-slate-700 leading-tight italic flex-1">"{sug}"</p>
                                        <Plus className="w-4 h-4 text-amber-500 shrink-0" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {content.evolutionPhrases?.length > 0 && (
                    <div className="space-y-2 pt-2 animate-slide-up bg-indigo-50/50 p-4 rounded-[1.5rem] border border-indigo-100">
                        <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest px-1">Frases d'evolució validades</p>
                        {content.evolutionPhrases.map((p: string, i: number) => (
                            <div key={i} className="flex gap-3 bg-indigo-600 p-3.5 rounded-2xl border border-indigo-700 text-white shadow-xl">
                                <History className="w-4 h-4 text-indigo-200 shrink-0 mt-0.5" />
                                <p className="text-[10px] font-bold leading-tight flex-1">{p}</p>
                                <button onClick={() => onUpdateContent('evolutionPhrases', content.evolutionPhrases.filter((_, idx: number) => idx !== i))} className="text-white/60 hover:text-white"><X className="w-4 h-4" /></button>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        )}

        {/* SECCIÓ MAKER INDEPENDENT */}
        {hasMakerData && (
            <section className="bg-emerald-50/50 p-5 rounded-[2rem] border border-emerald-100 space-y-4 animate-fade-in shadow-inner">
                <div className="flex justify-between items-center">
                    <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                        <Hammer className="w-3.5 h-3.5" /> Resultat Maker
                    </label>
                    <div className="flex gap-2">
                         <button 
                            onClick={handleGenerateMaker} 
                            disabled={isGeneratingMaker}
                            className={`p-1.5 rounded-lg transition-all ${isGeneratingMaker ? 'animate-spin' : 'hover:bg-emerald-100 text-emerald-600'}`}
                         >
                            <RefreshCw className="w-3.5 h-3.5" />
                         </button>
                    </div>
                </div>

                {content.maker?.narrative ? (
                    <div className="bg-white/80 p-4 rounded-2xl border border-emerald-100 relative group">
                        <p className="text-[11px] text-slate-700 leading-relaxed italic">"{content.maker.narrative}"</p>
                        <button 
                            onClick={copyMakerNarrative}
                            className={`absolute -top-2 -right-2 p-2 rounded-xl shadow-lg border transition-all ${makerCopied ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-white border-warm-200 text-slate-400 hover:text-emerald-600'}`}
                        >
                            {makerCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </button>
                    </div>
                ) : (
                    <button 
                        onClick={handleGenerateMaker}
                        disabled={isGeneratingMaker}
                        className="w-full py-3 border-2 border-dashed border-emerald-200 rounded-2xl text-[9px] font-black text-emerald-400 uppercase tracking-widest hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
                    >
                        {isGeneratingMaker ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" /> Redactar Highlight Maker</>}
                    </button>
                )}
            </section>
        )}

        {/* SECCIÓ PLANETA BLAU INDEPENDENT */}
        {hasPlanetaBlauData && (
            <section className="bg-cyan-50/50 p-5 rounded-[2rem] border border-cyan-100 space-y-4 animate-fade-in shadow-inner">
                <div className="flex justify-between items-center">
                    <label className="text-[9px] font-black text-cyan-600 uppercase tracking-widest flex items-center gap-2">
                        <Waves className="w-3.5 h-3.5" /> Resultat Planeta Blau
                    </label>
                    <div className="flex gap-2">
                         <button 
                            onClick={handleGeneratePlanetaBlau} 
                            disabled={isGeneratingPlanetaBlau}
                            className={`p-1.5 rounded-lg transition-all ${isGeneratingPlanetaBlau ? 'animate-spin' : 'hover:bg-cyan-100 text-cyan-600'}`}
                            title="Regenerar relat Planeta Blau"
                         >
                            <RefreshCw className="w-3.5 h-3.5" />
                         </button>
                    </div>
                </div>

                {content.planetaBlau?.narrative ? (
                    <div className="bg-white/80 p-4 rounded-2xl border border-cyan-100 relative group">
                        <p className="text-[11px] text-slate-700 leading-relaxed italic">"{content.planetaBlau.narrative}"</p>
                        <button 
                            onClick={copyPlanetaBlauNarrative}
                            className={`absolute -top-2 -right-2 p-2 rounded-xl shadow-lg border transition-all ${planetaBlauCopied ? 'bg-cyan-500 border-cyan-600 text-white' : 'bg-white border-warm-200 text-slate-400 hover:text-cyan-600'}`}
                            title="Copiar al porta-retalls"
                        >
                            {planetaBlauCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </button>
                    </div>
                ) : (
                    <button 
                        onClick={handleGeneratePlanetaBlau} 
                        disabled={isGeneratingPlanetaBlau}
                        className="w-full py-3 border-2 border-dashed border-cyan-200 rounded-2xl text-[9px] font-black text-cyan-500 uppercase tracking-widest hover:bg-cyan-50 transition-all flex items-center justify-center gap-2"
                    >
                        {isGeneratingPlanetaBlau ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" /> Redactar Highlight Planeta Blau</>}
                    </button>
                )}
            </section>
        )}

        {/* SECCIÓ VELOCITAT LECTORA I MECÀNICA */}
        {(() => {
          const rSpeed = student.metrics?.readingSpeed || content.reading?.wpm || 0;
          const rErrors = student.metrics?.readingErrors || content.reading?.errors || "";
          const rComp = student.metrics?.readingCompText || content.reading?.comp || "";
          const rDate = student.metrics?.readingDate || content.reading?.date || "oct' 26";
          const rLevel = student.metrics?.readingLevelTag || content.reading?.levelTag || (rSpeed > 0 ? (rSpeed < 70 ? 'Novell (Nivell 1)' : rSpeed < 90 ? 'Novell (Nivell 2)' : rSpeed < 110 ? 'Aprenent (Nivell 3)' : rSpeed < 130 ? 'Avançat (Nivell 4)' : rSpeed <= 145 ? 'Avançat (Nivell 5)' : 'Expert (Nivell 6)') : 'Pendent');

          if (rSpeed === 0 && !rErrors && !rComp) return null;

          return (
            <section className="bg-blue-50/50 p-5 rounded-[2rem] border border-blue-100 space-y-3.5 animate-fade-in shadow-inner">
              <div className="flex justify-between items-center">
                <label className="text-[9px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5" /> Lectura en Veu Alta ({rDate})
                </label>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[8px] font-black uppercase tracking-wider">
                    {rSpeed} ppm • {rLevel}
                  </span>
                </div>
              </div>

              {rErrors && (
                <div className="bg-white/80 p-3.5 rounded-2xl border border-blue-100 space-y-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Mecànica, pauses i fonètica</p>
                  <p className="text-[11px] text-slate-700 leading-relaxed font-medium">"{rErrors}"</p>
                </div>
              )}

              {rComp && (
                <div className="bg-white/80 p-3.5 rounded-2xl border border-blue-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Prova puntual de comprensió</p>
                    <span className="text-[7px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded" title="Avaluació orientativa que es complementa amb les múltiples evidències d'aula">
                      Ús orientatiu i prudent
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-700 leading-relaxed italic">"{rComp}"</p>
                </div>
              )}
            </section>
          );
        })()}

        {/* Observacions Lliures */}
        <section className="space-y-3">
            <div className="flex justify-between items-center">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><MessageSquare className="w-3.5 h-3.5 text-indigo-500" /> Observacions Lliures</label>
                <div className="flex items-center gap-2">
                    <LangSelector />
                    <button onClick={() => handleToggleVoice('manualObservations')} className={`p-1.5 rounded-lg transition-all ${listeningField === 'manualObservations' ? 'bg-red-500 text-white animate-pulse shadow-md' : 'text-slate-300 hover:text-primary-900'}`} title="Dictar observació"><Mic className="w-3.5 h-3.5" /></button>
                </div>
            </div>
            <div className="space-y-2">
                {(() => {
                    const manualObs = Array.isArray(content.manualObservations) ? content.manualObservations : (typeof content.manualObservations === 'string' ? [content.manualObservations] : []);
                    return manualObs.map((obs, i) => (
                        <div key={i} className="group relative bg-warm-50/50 p-3 rounded-xl border border-warm-100 flex items-start gap-2 hover:bg-white hover:shadow-sm transition-all">
                            <textarea 
                                value={obs} 
                                onChange={(e) => {
                                    const newObs = [...manualObs];
                                    newObs[i] = e.target.value;
                                    onUpdateContent('manualObservations', newObs);
                                }}
                                className="text-[11px] flex-1 text-slate-700 leading-relaxed bg-transparent border-none outline-none resize-none focus:ring-1 focus:ring-indigo-100 rounded p-1 h-auto"
                                rows={Math.max(1, Math.ceil(obs.length / 45))}
                            />
                            <button onClick={() => onUpdateContent('manualObservations', manualObs.filter((_, idx) => idx !== i))} className="opacity-0 group-hover:opacity-100 p-1 text-red-300 hover:text-red-500 shrink-0"><X className="w-3 h-3" /></button>
                        </div>
                    ));
                })()}
                <input 
                    placeholder="Escriu nota ràpida..." 
                    className="w-full bg-white border border-warm-100 rounded-xl px-4 py-3 text-[11px] outline-none focus:border-indigo-300 shadow-inner"
                    onKeyDown={(e) => { 
                        if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) { 
                            const manualObs = Array.isArray(content.manualObservations) ? content.manualObservations : (typeof content.manualObservations === 'string' ? [content.manualObservations] : []);
                            onUpdateContent('manualObservations', [...manualObs, (e.target as HTMLInputElement).value.trim()]); 
                            (e.target as HTMLInputElement).value = ""; 
                        } 
                    }}
                />
            </div>
        </section>

        {/* Anècdota Personal */}
        <section className="space-y-3">
            <div className="flex justify-between items-center">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Quote className="w-3.5 h-3.5 text-orange-400" /> Anècdota</label>
                <div className="flex items-center gap-2">
                    <LangSelector />
                    <button onClick={() => handleToggleVoice('anecdote')} className={`p-1.5 rounded-lg transition-all ${listeningField === 'anecdote' ? 'bg-red-500 text-white animate-pulse shadow-md' : 'text-slate-300 hover:text-primary-900'}`} title="Dictar anècdota"><Mic className="w-3.5 h-3.5" /></button>
                </div>
            </div>
            <textarea value={content.anecdote} onChange={(e) => onUpdateContent('anecdote', e.target.value)} placeholder="Moment destacat..." className="w-full h-24 p-4 rounded-xl bg-warm-50/30 border border-warm-100 text-[11px] outline-none focus:bg-white resize-none leading-relaxed" />
        </section>

        {/* Feedback Autoevaluació */}
        <section className="space-y-3">
            <div className="flex justify-between items-center">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><UserCheck className="w-3.5 h-3.5 text-emerald-500" /> Autoevaluació</label>
                <div className="flex items-center gap-2">
                    <LangSelector />
                    <button onClick={() => handleToggleVoice('selfAssessment')} className={`p-1.5 rounded-lg transition-all ${listeningField === 'selfAssessment' ? 'bg-red-500 text-white animate-pulse shadow-md' : 'text-slate-300 hover:text-primary-900'}`} title="Dictar autoevaluació"><Mic className="w-3.5 h-3.5" /></button>
                </div>
            </div>
            <textarea value={content.selfAssessment} onChange={(e) => onUpdateContent('selfAssessment', e.target.value)} placeholder="Com s'ha vist l'alumne?..." className="w-full h-24 p-4 rounded-xl bg-warm-50/30 border border-warm-100 text-[11px] outline-none focus:bg-white resize-none leading-relaxed" />
        </section>



        {/* Suggeriments IA */}
        <section className="space-y-4 pt-4 border-t border-warm-100">
            <div className="flex justify-between items-center">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Suggeriments</label>
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => {
                            if (window.confirm("Vols esborrar tots els suggeriments?")) {
                                onUpdateContent('aiSuggestions', []);
                            }
                        }}
                        disabled={!content.aiSuggestions || content.aiSuggestions.length === 0}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-slate-300 hover:text-red-500 transition-all disabled:opacity-30"
                        title="Esborrar tots els suggeriments"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={fetchAiSuggestions} disabled={isLoadingSuggestions} className="p-1.5 hover:bg-warm-100 rounded-lg text-primary-900 transition-all">
                        {isLoadingSuggestions ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
                    </button>
                </div>
            </div>
            
            <div className="space-y-2">
                {(content.aiSuggestions || []).map((sug: string, i: number) => (
                    <div key={i} className="group relative">
                        <button 
                            onClick={() => {
                                if (!content.recommendations?.includes(sug)) {
                                    onUpdateContent('recommendations', [...(content.recommendations || []), sug]);
                                }
                            }}
                            className="w-full text-left p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-all pr-12"
                        >
                            <p className="text-[10px] font-bold text-indigo-700 leading-tight italic">"{sug}"</p>
                            <BookmarkPlus className="absolute top-3 right-8 w-3 h-3 text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                        <button 
                            onClick={() => onUpdateContent('aiSuggestions', (content.aiSuggestions || []).filter((_: any, idx: number) => idx !== i))}
                            className="absolute top-3 right-3 p-1 text-indigo-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Eliminar suggeriment"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ))}
            </div>

            <div className="space-y-2 pt-2">
                <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Pla de Treball</p>
                {content.recommendations?.map((rec, i) => (
                    <div key={i} className="flex gap-2 bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                        <Check className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-emerald-800 font-bold leading-tight flex-1">{rec}</p>
                        <button onClick={() => onUpdateContent('recommendations', content.recommendations.filter((_, idx) => idx !== i))} className="text-emerald-300 hover:text-emerald-600"><X className="w-3 h-3" /></button>
                    </div>
                ))}
                <div className="relative">
                    <input 
                        placeholder="Afegir recomanació..." 
                        className="w-full bg-white border border-warm-100 rounded-xl px-4 py-2 text-[10px] outline-none focus:border-emerald-300 pr-10"
                        onKeyDown={(e) => { if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) { onUpdateContent('recommendations', [...content.recommendations, (e.target as HTMLInputElement).value.trim()]); (e.target as HTMLInputElement).value = ""; } }}
                    />
                    <Plus className="absolute right-3 top-2.5 w-3.5 h-3.5 text-slate-300" />
                </div>
            </div>
        </section>

        {/* Qualitat */}
        <div className="pt-6 border-t border-warm-100">
             <div className="flex justify-between items-end mb-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Zap className="w-3.5 h-3.5 text-primary-900" /> Riquesa d'Informe</label>
                <span className="text-[10px] font-black text-primary-900">{richness}%</span>
             </div>
             <div className="h-1.5 bg-warm-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary-900 transition-all duration-700" style={{ width: `${richness}%` }} />
             </div>
        </div>
      </div>

      <div className="p-6 bg-white border-t border-warm-100 space-y-3">
        {state.generatedReport && (
            <div className="flex items-center gap-2 bg-amber-50 p-3 rounded-xl border border-amber-100 animate-fade-in shadow-sm">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-[9px] font-bold text-amber-700 leading-tight">
                    <span className="uppercase text-amber-800">Atenció:</span> Tornar a generar el text eliminarà les correccions manuals que hauries pogut fer al bloc central.
                </p>
            </div>
        )}
        <button 
          onClick={onGenerate}
          disabled={isGenerating || richness < 15}
          className={`w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95 ${
            isGenerating 
              ? 'bg-warm-100 text-slate-400' 
              : richness < 15 
                ? 'bg-warm-50 text-slate-300 border border-warm-100'
                : 'bg-primary-900 text-white hover:bg-black hover:-translate-y-1'
          }`}
        >
          {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Escrivint...</> : <><Sparkles className="w-4 h-4 text-amber-300" /> Generar Narrativa</>}
        </button>
      </div>
    </div>
  );
};
