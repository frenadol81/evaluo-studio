
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Printer, Wand2, Sparkles, Save, ArrowLeft, Feather, Zap, Loader2, Heart, Copy, Check, ShieldCheck, Library, AlertTriangle, Info, Globe, RotateCcw, RefreshCw, Wind, Undo, Redo, FileText, Trash2, LineChart, History, Plus, X } from 'lucide-react';
import { getTextVariations, getEvolutionSuggestions, injectEvolutionPhrase } from '../services/geminiService';
import { getLocalReportAlternatives, type ReportEditMode } from '../core/config/reportEditingAlternatives';
import ReactMarkdown from 'react-markdown';

interface ReportResultProps {
  report: string;
  studentName?: string;
  language?: string;
  student?: any;
  trimester?: number;
  onReset: () => void;
  onReportChange?: (newReport: string) => void;
  onUpdateContent?: (field: string, value: any) => void;
}

export const ReportResult: React.FC<ReportResultProps> = ({ report: initialReport, studentName, language, student, trimester, onReset, onReportChange, onUpdateContent }) => {
  const ensureBreath = (text: string) => text.trim() + "\n\n";

  // Funció per processar les etiquetes de resaltat en el text de l'informe
  const processHighlights = (text: string) => {
    if (!text) return "";
    // Reemplacem [text](evolution-highlight) per un format que puguem visualitzar millor
    // Per a l'editor contentEditable, si volem que sigui editable, millor netejar-ho o usar una visualització especial
    return text.replace(/\[(.*?)\]\(evolution-highlight\)/g, '$1');
  };
  
  const [fullReport, setFullReport] = useState(ensureBreath(initialReport));
  const [showEvolutionHighlights, setShowEvolutionHighlights] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'family' | 'student'>('family');
  const [isRewriting, setIsRewriting] = useState(false);
  const [candidates, setCandidates] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [activeSelection, setActiveSelection] = useState<string | null>(null);
  const [originalSentence, setOriginalSentence] = useState<string | null>(null);
  const [attenuationLevel, setAttenuationLevel] = useState(0); // 0: original, 1: suavitzat, 2: neutre, 3: repte
  
  const [sidebarTab, setSidebarTab] = useState<'tuning' | 'evolution'>('tuning');
  const [isLoadingEvolution, setIsLoadingEvolution] = useState(false);
  const [suggestedEvolutions, setSuggestedEvolutions] = useState<{pos: string[], neg: string[]} | null>(() => {
    if (student?.content?.suggestedEvolutions) {
        return student.content.suggestedEvolutions;
    }
    return null;
  });

  // Sincronitzem suggeriments si canvia l'alumne o s'actualitzen des d'un altre component (PI)
  useEffect(() => {
    if (student?.content?.suggestedEvolutions) {
        setSuggestedEvolutions(student.content.suggestedEvolutions);
    } else {
        setSuggestedEvolutions(null);
    }
  }, [student?.id, JSON.stringify(student?.content?.suggestedEvolutions)]);

  // Eliminada la carrega automàtica de fetchEvolution per respectar la petició de l'usuari de control manual.
  
  const [isInjecting, setIsInjecting] = useState(false);
  
  const contentEditableRef = useRef<HTMLDivElement>(null);

  const reportParts = useMemo(() => {
    const separator = "--- SECCIÓ ALUMNE ---";
    const parts = fullReport.split(separator);
    return { family: parts[0].trim(), student: parts[1]?.trim() || "" };
  }, [fullReport]);

  const currentText = activeTab === 'family' ? reportParts.family : reportParts.student;

  useEffect(() => {
    if (initialReport) {
      const formatted = ensureBreath(initialReport);
      setFullReport(prev => {
        if (prev && prev !== formatted) {
          // Guardem l'informe previ (incloent edicions manuals) a l'historial abans de sobreescriure'l amb la nova generació
          setHistory(h => [prev, ...h].slice(0, 50));
          setRedoStack([]);
        }
        return formatted;
      });
    }
  }, [initialReport]);

  const lastSyncedTextRef = useRef(currentText);

  const escapeHtml = (str: string): string => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  useEffect(() => {
    if (contentEditableRef.current) {
        if (showEvolutionHighlights) {
            const safeEscaped = escapeHtml(currentText);
            contentEditableRef.current.innerHTML = safeEscaped.replace(/\[(.*?)\]\(evolution-highlight\)/g, '<span style="background-color: #e0e7ff; border-bottom: 2px solid #818cf8; font-weight: bold; padding: 0 4px; border-radius: 4px;">$1</span>');
        } else {
            const domText = contentEditableRef.current.innerText;
            const isFocused = document.activeElement === contentEditableRef.current;
            
            // Si el text ha canviat des de l'última sincronització (canvi extern com Undo/IA), 
            // o si no estem enfocats i el DOM és diferent del que diu l'estat, sincronitzem.
            const isExternalChange = currentText.trim() !== lastSyncedTextRef.current.trim();
            
            if (isExternalChange || (!isFocused && domText.trim() !== currentText.trim())) {
                contentEditableRef.current.innerText = currentText;
                lastSyncedTextRef.current = currentText;
            }
        }
    }
  }, [currentText, showEvolutionHighlights]);

  const hasEvolutionMarkers = useMemo(() => fullReport.includes('(evolution-highlight)'), [fullReport]);

  const savedRangeRef = useRef<Range | null>(null);
  const alternativesRequestRef = useRef<AbortController | null>(null);
  const [alternativesError, setAlternativesError] = useState('');
  const manualTypingTimeoutRef = useRef<any>(null);

  const buildFullReport = (tabText: string, tab: 'family' | 'student' = activeTab) => {
    const textWithBreath = ensureBreath(tabText);
    if (tab === 'family') {
      const studentPart = reportParts.student ? "\n\n--- SECCIÓ ALUMNE ---\n" + reportParts.student : "";
      return textWithBreath + studentPart;
    } else {
      return reportParts.family + "\n\n--- SECCIÓ ALUMNE ---\n" + textWithBreath;
    }
  };

  const updateCurrentText = (newText: string, skipHistory = false) => {
      const newFullReport = buildFullReport(newText);

      if (!skipHistory && newFullReport !== fullReport) {
        setHistory(prev => [fullReport, ...prev].slice(0, 50));
        setRedoStack([]);
      }

      setFullReport(newFullReport);
      if (onReportChange) onReportChange(newFullReport);
      return newFullReport;
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[0];
    setRedoStack(prev => [fullReport, ...prev]);
    setHistory(prev => prev.slice(1));
    clearTimeout(manualTypingTimeoutRef.current);
    setFullReport(previous);
    if (onReportChange) onReportChange(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setHistory(prev => [fullReport, ...prev]);
    setRedoStack(prev => prev.slice(1));
    clearTimeout(manualTypingTimeoutRef.current);
    setFullReport(next);
    if (onReportChange) onReportChange(next);
  };

  const handleClearHistory = () => {
    if (window.confirm("Vols esborrar tot l'historial de canvis d'aquest informe?")) {
        setHistory([]);
        setRedoStack([]);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        handleRedo();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullReport, history, redoStack, handleUndo, handleRedo]);

  const handleReset = () => {
    saveCurrentToState();
    onReset();
  };

  const handleTabChange = (tab: 'family' | 'student') => {
    saveCurrentToState();
    setActiveTab(tab);
  };

  const saveCurrentToState = () => {
    if (contentEditableRef.current) {
      const newText = contentEditableRef.current.innerText;
      if (newText.trim() !== currentText.trim()) {
        lastSyncedTextRef.current = newText;
        updateCurrentText(newText);
      }
    }
  };

  const handleSave = async () => {
    const currentDomText = contentEditableRef.current ? contentEditableRef.current.innerText : currentText;
    const targetReport = buildFullReport(currentDomText);
    lastSyncedTextRef.current = currentDomText;
    setFullReport(targetReport);

    setSaveStatus('saving');
    try {
      if (onReportChange) {
        await Promise.resolve(onReportChange(targetReport));
      }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (err) {
      console.error("Error guardant l'informe:", err);
      setSaveStatus('error');
    }
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        // Si estem esborrant una selecció, netegem l'estat d'ajust quirúrgic per evitar confusions
        // i assegurem que el contentEditable no estigui bloquejat per isRewriting
        clearEditingSelection();
      }
    }
  };

  const handlePrint = () => {
    saveCurrentToState();
    window.print();
  };

  const handleExportWord = () => {
    saveCurrentToState();
    const text = contentEditableRef.current ? contentEditableRef.current.innerText : currentText;
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5; }
        p { margin: 0 0 11pt 0; text-align: justify; }
        .header { font-weight: bold; font-size: 14pt; margin-bottom: 20pt; border-bottom: 1px solid #ccc; padding-bottom: 10pt; }
      </style>
      </head>
      <body>
        ${studentName ? `<div class="header">Informe de l'alumne/a: ${studentName}</div>` : ''}
        ${text.split('\n').map(p => p.trim() ? `<p>${p}</p>` : '').join('')}
      </body>
      </html>
    `;
    
    const blob = new Blob(['\ufeff', htmlContent], {
      type: 'application/msword'
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Informe_${activeTab}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    saveCurrentToState();
    const textToCopy = contentEditableRef.current ? contentEditableRef.current.innerText : currentText;
    
    // Create HTML version for formatted copy
    const htmlToCopy = `
      <div style="font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5; text-align: justify;">
        ${textToCopy.split('\n').map(p => p.trim() ? `<p style="margin-bottom: 11pt;">${p}</p>` : '').join('')}
      </div>
    `;

    try {
      const typeText = "text/plain";
      const typeHtml = "text/html";
      const blobText = new Blob([textToCopy], { type: typeText });
      const blobHtml = new Blob([htmlToCopy], { type: typeHtml });
      
      const data = [new ClipboardItem({
        [typeText]: blobText,
        [typeHtml]: blobHtml,
      })];
      
      await navigator.clipboard.write(data);
    } catch (err) {
      // Fallback to plain text if ClipboardItem is not supported
      await navigator.clipboard.writeText(textToCopy);
    }
    
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fetchAlternatives = async (instruction: string, textOverride?: string, mode: ReportEditMode = 'rewrite') => {
    const targetText = textOverride || activeSelection;
    if (!targetText) return;
    alternativesRequestRef.current?.abort();
    const request = new AbortController();
    alternativesRequestRef.current = request;
    setAlternativesError('');
    const local = getLocalReportAlternatives(targetText, mode);
    if (mode === 'synonyms' && local.length) {
        setCandidates(local);
        setIsRewriting(false);
        return;
    }
    setIsRewriting(true);
    setCandidates([]);
    try {
        const context = contentEditableRef.current?.innerText || currentText;
        const vars = await getTextVariations(targetText, instruction, context, request.signal);
        if (request.signal.aborted) return;
        const proposals = [...new Set(vars.map(v => v.replace(/^["']|["']$/g, '').trim()))]
            .filter(v => v && v !== targetText).slice(0, 3);
        setCandidates(proposals.length ? proposals : local);
        if (!proposals.length && !local.length) setAlternativesError('No hem trobat alternatives per a aquest fragment.');
    } catch (e) {
        if (request.signal.aborted) return;
        setCandidates(local);
        if (!local.length) setAlternativesError(e instanceof Error ? e.message : 'No s’han pogut obtenir alternatives.');
    } finally {
        if (!request.signal.aborted) setIsRewriting(false);
    }
  };

  const clearEditingSelection = () => {
    alternativesRequestRef.current?.abort();
    savedRangeRef.current = null;
    setActiveSelection(null);
    setCandidates([]);
    setAlternativesError('');
    setIsRewriting(false);
  };

  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) {
        clearEditingSelection();
        return;
    }
    const range = selection.getRangeAt(0);
    if (!contentEditableRef.current?.contains(range.commonAncestorContainer)) return;
    const text = selection.toString().trim();
    if (text.length >= 2) {
        clearEditingSelection();
        savedRangeRef.current = range.cloneRange();
        setActiveSelection(text);
        setOriginalSentence(text);
        setAttenuationLevel(0);
        setSidebarTab('tuning');
        if (/^\p{L}+(?:[’'·-]\p{L}+)*$/u.test(text)) {
            void fetchAlternatives("Proposa tres sinònims en català que es puguin substituir directament en aquest context. Conserva la flexió i la categoria gramatical.", text, 'synonyms');
        }
    } else {
        clearEditingSelection();
    }
  };

  const applyCandidate = (candidate: string) => {
    const editor = contentEditableRef.current;
    const range = savedRangeRef.current;
    if (!editor || !range || !activeSelection) return;
    const selectedText = range.toString();
    if (!editor.contains(range.commonAncestorContainer) || selectedText.trim() !== activeSelection) {
        clearEditingSelection();
        return;
    }

    const leading = selectedText.match(/^\s*/)?.[0] || '';
    const trailing = selectedText.match(/\s*$/)?.[0] || '';
    range.deleteContents();
    range.insertNode(document.createTextNode(leading + candidate + trailing));
    const newText = editor.innerText;
    lastSyncedTextRef.current = newText;
    updateCurrentText(newText);
    window.getSelection()?.removeAllRanges();
    clearEditingSelection();
  };

  const fetchEvolution = async (force = false) => {
    if (!student || isLoadingEvolution) return;
    
    // Si ja tenim dades i no estem forçant, no fem res
    if (!force && suggestedEvolutions && (suggestedEvolutions.pos.length > 0 || suggestedEvolutions.neg.length > 0)) {
        return;
    }

    setIsLoadingEvolution(true);
    try {
      // PII safe: evitar logs amb noms d'alumnes o historials d'avaluació
      const lang = language || 'Català';
      const targetTrimester = trimester || 3;
        
        const raw = await getEvolutionSuggestions(student, lang, targetTrimester);
        
        const pos = raw
            .filter(s => s.toUpperCase().includes('[POS]'))
            .map(s => s.replace(/\[POS\][:\s-]*/i, '').trim());
            
        const neg = raw
            .filter(s => s.toUpperCase().includes('[NEG]'))
            .map(s => s.replace(/\[NEG\][:\s-]*/i, '').trim());
        
        let results = { pos, neg };
        
        if (pos.length === 0 && neg.length === 0 && raw.length > 0) {
            results = { pos: raw, neg: [] };
        }
        
        setSuggestedEvolutions(results);
        
        if (onUpdateContent) {
            onUpdateContent('suggestedEvolutions', results);
        }
    } catch (e: any) {
        console.error("Error al carregar evolució:", e);
        alert("S'ha produït un problema en connectar amb el servei d'anàlisi. Revisa que l'API Key sigui vàlida.");
    } finally {
        setIsLoadingEvolution(false);
    }
  };

  const handleInjectPhrase = async (phrase: string) => {
    if (isInjecting) return;
    setIsInjecting(true);
    try {
        const studentInfo = { 
            name: student?.info?.name || studentName, 
            gender: student?.info?.gender || 'Masculí' 
        };
        const rawText = await injectEvolutionPhrase(currentText, phrase, studentInfo);
        
        // Persistir la frase com a validada per conservar-la "marcada"
        if (onUpdateContent) {
            const currentPhrases = student?.content?.evolutionPhrases || [];
            if (!currentPhrases.includes(phrase)) {
                onUpdateContent('evolutionPhrases', [...currentPhrases, phrase]);
            }
        }

        const parts = rawText.split('@@@');
        if (parts.length === 3) {
            const cleanText = parts.join('');
            const startIndex = parts[0].length;
            const length = parts[1].length;
            
            updateCurrentText(cleanText);
            
            setTimeout(() => {
                const el = contentEditableRef.current;
                if (el) {
                    // Cerca recursivament el node de text correcte segons l'índex
                    let currentPos = 0;
                    let found = false;

                    const traverseNodes = (node: Node) => {
                        if (found) return;
                        if (node.nodeType === Node.TEXT_NODE) {
                            const text = node.textContent || "";
                            if (currentPos + text.length >= startIndex && !found) {
                                const range = document.createRange();
                                const internalStart = startIndex - currentPos;
                                
                                // Ens assegurem que el rang no surti del node
                                const safeStart = Math.max(0, internalStart);
                                const safeEnd = Math.min(text.length, internalStart + length);
                                
                                range.setStart(node, safeStart);
                                range.setEnd(node, safeEnd);
                                
                                const sel = window.getSelection();
                                if (sel) {
                                    sel.removeAllRanges();
                                    sel.addRange(range);
                                    el.focus();
                                    
                                    // Soft scroll
                                    const rect = range.getBoundingClientRect();
                                    const containerRect = el.getBoundingClientRect();
                                    if (rect.top < containerRect.top || rect.bottom > containerRect.bottom) {
                                        el.scrollTop = el.scrollTop + (rect.top - containerRect.top) - 100;
                                    }
                                }
                                found = true;
                            }
                            currentPos += text.length;
                        } else {
                            for (let i = 0; i < node.childNodes.length; i++) {
                                traverseNodes(node.childNodes[i]);
                            }
                        }
                    };

                    traverseNodes(el);
                }
            }, 150);
        } else {
            updateCurrentText(rawText.replace(/@@@/g, ''));
        }
    } catch (e) {
        console.error(e);
    } finally {
        setIsInjecting(false);
    }
  };

  return (
    <div className="w-full h-full animate-slide-up flex flex-col">
      <style>{`
        .report-content::selection {
            background-color: rgba(15, 23, 42, 0.12);
            color: #0f172a;
        }
        .report-content {
            padding-bottom: 200px !important;
            min-height: 100%;
        }
      `}</style>
      <div className="bg-white overflow-hidden flex flex-col md:flex-row h-full">
        
        {/* Rail de navegació (Esquerra) */}
        <div className="md:w-20 p-4 flex flex-col items-center bg-primary-900 text-white shrink-0 h-full z-50">
           <div className="flex flex-col items-center gap-10 w-full mt-2">
                <button 
                  onClick={handleSave} 
                  disabled={saveStatus === 'saving'}
                  data-tooltip={saveStatus === 'error' ? "Error en desar. Clica per reintentar." : "Desar canvis a la fitxa de l'alumne"}
                  className={`p-4 rounded-xl shadow-xl transition-all border ${
                    saveStatus === 'saving'
                      ? 'bg-amber-500 text-white border-amber-600 animate-pulse'
                      : saveStatus === 'saved'
                      ? 'bg-white text-emerald-600 border-emerald-500 shadow-emerald-200'
                      : saveStatus === 'error'
                      ? 'bg-rose-600 text-white border-rose-700 hover:bg-rose-700'
                      : 'bg-emerald-600 text-white hover:bg-emerald-500 border-emerald-500/30'
                  }`}
                >
                    {saveStatus === 'saving' ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : saveStatus === 'saved' ? (
                      <Check className="w-5 h-5" />
                    ) : saveStatus === 'error' ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                </button>
                <div className="flex flex-col items-center gap-10">
                    <button onClick={() => handleTabChange('family')} className={`flex flex-col items-center gap-2 transition-all ${activeTab === 'family' ? 'text-primary-100' : 'text-primary-600 opacity-40 hover:opacity-100'}`}>
                        <Feather className="w-6 h-6" />
                        <span className="text-[8px] font-black uppercase tracking-widest">Família</span>
                    </button>
                    <button onClick={() => handleTabChange('student')} className={`flex flex-col items-center gap-2 transition-all ${activeTab === 'student' ? 'text-primary-100' : 'text-primary-600 opacity-40 hover:opacity-100'}`}>
                        <Heart className="w-6 h-6" />
                        <span className="text-[8px] font-black uppercase tracking-widest">Alumne</span>
                    </button>
                </div>
           </div>
        </div>

        {/* Àrea de contingut (Text) - OPTIMITZADA */}
        <div className="flex-1 flex flex-col bg-white relative overflow-hidden border-r border-warm-100 h-full">
            <div className="p-4 border-b border-warm-100 bg-white/95 backdrop-blur-sm flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={handleReset} className="p-2 hover:bg-warm-50 rounded-xl text-slate-300 hover:text-primary-900 transition-all border border-transparent hover:border-warm-200"><ArrowLeft className="w-5 h-5" /></button>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-primary-900 uppercase tracking-widest flex items-center gap-2">
                           Edició Quirúrgica <Sparkles className="w-3 h-3 text-amber-500" />
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                     {hasEvolutionMarkers && (
                        <button 
                            onClick={() => {
                                if (showEvolutionHighlights) {
                                    // Netegem el text de les marques si l'usuari vol "acceptar" el resaltat
                                    const cleaned = fullReport.replace(/\[(.*?)\]\(evolution-highlight\)/g, '$1');
                                    updateCurrentText(cleaned);
                                }
                                setShowEvolutionHighlights(!showEvolutionHighlights);
                            }}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border-2 ${showEvolutionHighlights ? 'bg-indigo-600 text-white border-indigo-700 shadow-lg' : 'bg-white text-indigo-600 border-indigo-100 hover:border-indigo-600'}`}
                        >
                            <Sparkles className="w-3 h-3" />
                            {showEvolutionHighlights ? 'Netejar Marks' : 'Veure Evolució'}
                        </button>
                     )}
                     <div className="flex items-center gap-1 bg-warm-50 p-1 rounded-xl border border-warm-100 mr-2">
                        <button 
                          onClick={handleUndo} 
                          disabled={history.length === 0}
                          className="p-2 text-slate-400 hover:text-primary-900 disabled:opacity-30 disabled:hover:text-slate-400 transition-all"
                          title="Desfer (Ctrl+Z)"
                        >
                          <Undo className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={handleRedo} 
                          disabled={redoStack.length === 0}
                          className="p-2 text-slate-400 hover:text-primary-900 disabled:opacity-30 disabled:hover:text-slate-400 transition-all"
                          title="Refer (Ctrl+Y)"
                        >
                          <Redo className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={handleClearHistory} 
                          disabled={history.length === 0 && redoStack.length === 0}
                          className="p-2 text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-slate-400 transition-all"
                          title="Esborrar historial de canvis"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                     </div>
                     <button onClick={handleCopy} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border-2 shadow-sm ${copied ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white text-slate-500 border-warm-100 hover:border-primary-900 hover:text-primary-900'}`}>
                        {copied ? <Check className="w-3 h-3" /> : <Library className="w-3 h-3" />}
                        {copied ? 'Copiat' : 'Copiar'}
                     </button>
                     <button onClick={handlePrint} className="p-3 bg-warm-50 text-slate-400 hover:text-primary-900 rounded-xl border border-warm-100 hover:border-warm-200 transition-all"><Printer className="w-5 h-5" /></button>
                     <button onClick={handleExportWord} className="p-3 bg-warm-50 text-slate-400 hover:text-primary-900 rounded-xl border border-warm-100 hover:border-warm-200 transition-all" title="Exportar a Word"><FileText className="w-5 h-5" /></button>
                </div>
            </div>

            {/* Reducció de padding per aprofitar espai */}
            <div className="flex-1 px-4 lg:px-8 bg-warm-50/20 flex justify-start overflow-y-auto custom-scrollbar" onMouseUp={handleMouseUp}>
                <div 
                    ref={contentEditableRef}
                    contentEditable={!isInjecting}
                    suppressContentEditableWarning={true}
                    spellCheck={false}
                    onBlur={saveCurrentToState}
                    onKeyDown={handleEditorKeyDown}
                    onKeyUp={(event) => {
                        if (event.key === 'Shift' || (event.shiftKey && /^(Arrow|Home|End|Page)/.test(event.key))) {
                            const selected = window.getSelection()?.toString().trim();
                            if (selected !== activeSelection) handleMouseUp();
                        }
                    }}
                    onPaste={(e) => {
                        e.preventDefault();
                        const text = e.clipboardData.getData('text/plain');
                        document.execCommand('insertText', false, text);
                    }}
                    onInput={() => {
                        if (activeSelection) {
                            clearEditingSelection();
                        }
                        if (manualTypingTimeoutRef.current) clearTimeout(manualTypingTimeoutRef.current);
                        manualTypingTimeoutRef.current = setTimeout(() => {
                            if (contentEditableRef.current) {
                                const newText = contentEditableRef.current.innerText;
                                if (newText.trim() !== lastSyncedTextRef.current.trim()) {
                                    lastSyncedTextRef.current = newText;
                                    updateCurrentText(newText);
                                }
                            }
                        }, 800);
                    }}
                    className={`report-content w-full max-w-[850px] font-serif text-slate-800 text-lg outline-none whitespace-pre-wrap leading-relaxed text-justify pt-10 ${isInjecting ? 'opacity-50' : ''}`}
                >
                    {/* Gestionem el contingut manualment per evitar re-renders agressius que trenquin la selecció o el cursor */}
                </div>
            </div>
        </div>

        {/* Barra lateral d'Ajust (IA) - EIXAMPLADA A 420px */}
        <div className="bg-warm-50 flex flex-col shrink-0 h-full w-[420px] border-l border-warm-100">
            <div className="border-b border-warm-100 bg-white/50 backdrop-blur-md">
                <div className="flex">
                    <button 
                        onClick={() => setSidebarTab('tuning')}
                        className={`flex-1 p-5 flex items-center justify-center gap-3 transition-all border-b-2 ${sidebarTab === 'tuning' ? 'border-primary-900 bg-white' : 'border-transparent text-slate-400 hover:bg-white/50'}`}
                    >
                        <Wand2 className={`w-4 h-4 ${sidebarTab === 'tuning' ? 'text-amber-500' : ''}`} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Ajust Redacció</span>
                    </button>
                      <button 
                        onClick={() => {
                            setSidebarTab('evolution');
                        }}
                        className={`flex-1 p-5 flex items-center justify-center gap-3 transition-all border-b-2 ${sidebarTab === 'evolution' ? 'border-indigo-600 bg-white shadow-inner' : 'border-transparent text-slate-400 hover:bg-white/50'}`}
                    >
                        <LineChart className={`w-4 h-4 ${sidebarTab === 'evolution' ? 'text-indigo-500' : ''}`} />
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] font-black uppercase tracking-widest">Anàlisi Anual</span>
                            {((student?.content?.evolutionPhrases?.length || 0) > 0) && (
                                <span className="text-[7px] text-indigo-500 font-bold uppercase tracking-tight animate-pulse">
                                    {student.content.evolutionPhrases.length} frases validades
                                </span>
                            )}
                        </div>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {sidebarTab === 'tuning' ? (
                    <div className="p-6 space-y-6">
                        {activeSelection ? (
                            <div className="space-y-6 animate-fade-in">
                                {/* Area de Focus de l'original */}
                                <div className="p-5 bg-white/70 rounded-2xl border border-warm-200 shadow-sm relative overflow-hidden backdrop-blur-sm">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-primary-400"></div>
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-[8px] font-black text-slate-300 uppercase tracking-widest block">Original seleccionat</label>
                                        <button 
                                          onClick={() => applyCandidate(originalSentence || "")} 
                                          className="flex items-center gap-1.5 text-[8px] font-black text-primary-900 uppercase tracking-widest hover:text-emerald-600 transition-colors"
                                        >
                                            <RotateCcw className="w-2.5 h-2.5" /> Restaurar
                                        </button>
                                    </div>
                                    <p className="text-[12px] font-serif text-slate-700 leading-relaxed italic">"{activeSelection}"</p>
                                </div>
                                
                                {/* Botó d'acció explícita per generar alternatives */}
                                <button
                                    onClick={() => fetchAlternatives("Reescriu per millorar el ritme i la fluïdesa pedagògica sense canviar gens el to ni la intensitat.", activeSelection)}
                                    disabled={isRewriting}
                                    className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-primary-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-md active:scale-95 disabled:opacity-50"
                                >
                                    {isRewriting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-400" />}
                                    {isRewriting ? "Generant propostes..." : "Proposar alternatives amb IA"}
                                </button>

                                {/* Tauler de Control d'Eines */}
                                <div className="space-y-4">
                                    <div className="bg-white border border-warm-200 rounded-2xl p-4 shadow-sm">
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex flex-col">
                                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Atenuació Progresiva</label>
                                                <span className="text-[7px] text-slate-300 font-bold uppercase mt-0.5">(Ajusta el to i la intensitat de la frase)</span>
                                            </div>
                                            <span className="text-[10px] font-bold text-primary-600">
                                                {attenuationLevel === 0 ? 'Original' : 
                                                 attenuationLevel === 1 ? 'Suau / Prudent' : 
                                                 attenuationLevel === 2 ? 'Neutre / Objectiu' : 'Repte / Millora'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {[0, 1, 2, 3].map((level) => (
                                                <button
                                                    key={level}
                                                    onClick={() => {
                                                        setAttenuationLevel(level);
                                                        const prompts = [
                                                            "Millora el ritme sense canviar el to ni la intensitat positiva.",
                                                            "Atenua la intensitat positiva de la frase, fent-la més suau, prudent i matisada.",
                                                            "Transforma la frase en una descripció totalment neutra, objectiva i basada en fets, sense adjectius valoratius.",
                                                            "Reescriu la frase girant el focus: en lloc de destacar l'èxit, presenta-ho com un repte constant o un aspecte que requereix atenció/impuls."
                                                        ];
                                                        fetchAlternatives(prompts[level], undefined, level === 1 ? 'soften' : level === 2 ? 'direct' : 'rewrite');
                                                    }}
                                                    className={`flex-1 h-2 rounded-full transition-all ${
                                                        attenuationLevel === level 
                                                        ? (level === 0 ? 'bg-emerald-500' : level === 1 ? 'bg-amber-400' : level === 2 ? 'bg-orange-400' : 'bg-rose-500')
                                                        : 'bg-warm-100 hover:bg-warm-200'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                        <div className="flex justify-between mt-2 px-1">
                                            <span className="text-[7px] font-bold text-emerald-500 uppercase">Positiu / Elogi</span>
                                            <span className="text-[7px] font-bold text-rose-500 uppercase">Constructiu / Repte</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <button 
                                            onClick={() => fetchAlternatives("Redueix la intensitat positiva de la frase. Fes-la més neutra, subtil i equilibrada, evitant adjectius massa entusiastes o elogis excessius.", undefined, 'soften')}
                                            data-tooltip="Redueix la positivitat excessiva per fer la frase més neutra i equilibrada."
                                            className="p-4 bg-white border border-warm-200 rounded-2xl hover:border-blue-400 hover:bg-blue-50/10 transition-all flex flex-col items-center gap-2 shadow-sm text-center"
                                        >
                                            <ShieldCheck className="w-5 h-5 text-blue-400" />
                                            <span className="text-[9px] font-black uppercase text-slate-600">Atenuar</span>
                                        </button>

                                    <button 
                                        onClick={() => fetchAlternatives("Reformular la frase per fer-la més explícita, clara i directa.", undefined, 'direct')}
                                        data-tooltip="Fa la frase més clara, explícita i directa, destacant la realitat dels fets."
                                        className="p-4 bg-white border border-warm-200 rounded-2xl hover:border-amber-400 hover:bg-amber-50/10 transition-all flex flex-col items-center gap-2 shadow-sm text-center"
                                    >
                                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                                        <span className="text-[9px] font-black uppercase text-slate-600">Potenciar</span>
                                    </button>

                                    <button 
                                        onClick={() => fetchAlternatives("Torna a escriure la frase de manera COMPLETAMENT DIFERENT. Canvia l'estructura, el vocabulari i la forma totalment.")} 
                                        data-tooltip="Canvi radical: busca una forma totalment nova de dir el mateix."
                                        className="p-4 bg-white border border-warm-200 rounded-2xl hover:border-emerald-400 hover:bg-emerald-50/10 transition-all flex flex-col items-center gap-2 shadow-sm text-center"
                                    >
                                        <RefreshCw className="w-5 h-5 text-emerald-500" />
                                        <span className="text-[9px] font-black uppercase text-slate-600">Parafrasejar</span>
                                    </button>

                                    <button 
                                        onClick={() => fetchAlternatives("Millora la musicalitat, el ritme i la fluïdesa de la frase.")} 
                                        data-tooltip="Musicalitat i fluïdesa: fa que la frase soni més harmònica i elegant."
                                        className="p-4 bg-white border border-warm-200 rounded-2xl hover:border-indigo-400 hover:bg-indigo-50/10 transition-all flex flex-col items-center gap-2 shadow-sm text-center"
                                    >
                                        <Wind className="w-5 h-5 text-indigo-500" />
                                        <span className="text-[9px] font-black uppercase text-slate-600">Ritme</span>
                                    </button>
                                </div>
                            </div>

                                <button 
                                    onClick={() => fetchAlternatives("Reescriu la frase per millorar el ritme i la fluïdesa sense canviar el to.")} 
                                    data-tooltip="Ajust mínim per polir la frase sense canvis dràstics."
                                    className="w-full p-3 bg-warm-100 border border-warm-200 rounded-xl hover:bg-white transition-all text-[9px] font-black uppercase tracking-widest text-slate-400"
                                >
                                    Ajust Neutre (Polir mínimament)
                                </button>

                                {/* Resultats suggerits */}
                                <div className="space-y-4 pt-4 border-t border-warm-200">
                                    {alternativesError && <p role="status" className="text-xs text-amber-800">{alternativesError}</p>}
                                    {isRewriting ? (
                                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                                            <Loader2 className="w-6 h-6 animate-spin text-primary-900" />
                                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Generant variants...</p>
                                        </div>
                                    ) : candidates.map((cand, i) => (
                                        <button 
                                          key={i} 
                                          onClick={() => applyCandidate(cand)} 
                                          data-tooltip="Fes clic per aplicar aquesta variant al text"
                                          className="w-full text-left p-5 bg-white border border-warm-200 rounded-[1.5rem] hover:border-primary-900 hover:shadow-lg transition-all animate-fade-in group relative"
                                        >
                                            <div className="absolute top-2 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Zap className="w-3 h-3 text-amber-400" />
                                            </div>
                                            <p className="text-[13px] font-serif text-slate-900 leading-relaxed italic">"{cand}"</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full py-20 flex flex-col items-center justify-center opacity-30 text-center gap-6 px-10">
                                <div className="p-6 bg-warm-100 rounded-full">
                                   <Feather className="w-12 h-12 text-slate-400" />
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed tracking-wider">
                                   Selecciona un fragment del text de l'informe per activar les eines d'ajust intel·ligent.
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Anàlisi d'Evolució */
                    <div className="p-6 space-y-8 animate-fade-in">
                        <div className="space-y-2">
                             <div className="flex justify-between items-center">
                                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Evolució del Curs</h4>
                                <button 
                                    onClick={() => fetchEvolution(true)}
                                    disabled={isLoadingEvolution}
                                    className="p-2 hover:bg-indigo-50 rounded-lg text-indigo-600 transition-all flex items-center gap-1"
                                    title="Recarregar anàlisi"
                                >
                                    <span className="text-[8px] font-black uppercase">Recarregar</span>
                                    <RefreshCw className={`w-3 h-3 ${isLoadingEvolution ? 'animate-spin' : ''}`} />
                                </button>
                             </div>
                             <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Clica sobre una frase per injectar-la directament a l'informe.</p>
                        </div>

                        {isLoadingEvolution ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em]">Analitzant T1 i T2...</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {((suggestedEvolutions?.pos && suggestedEvolutions.pos.length > 0) || (suggestedEvolutions?.neg && suggestedEvolutions.neg.length > 0)) ? (
                                    <div className="space-y-6">
                                        {suggestedEvolutions?.pos && suggestedEvolutions.pos.length > 0 && (
                                            <div className="space-y-3">
                                                <label className="text-[8px] font-black text-emerald-600 uppercase tracking-widest px-1 flex items-center gap-2">
                                                    <Sparkles className="w-3 h-3" /> Progressió i Avenços
                                                </label>
                                                <div className="grid gap-2">
                                                    {suggestedEvolutions.pos.map((sug, i) => {
                                                        const isValidated = student?.content?.evolutionPhrases?.includes(sug);
                                                        return (
                                                            <button 
                                                                key={i}
                                                                onClick={() => handleInjectPhrase(sug)}
                                                                disabled={isInjecting}
                                                                className={`group relative text-left p-4 bg-white border rounded-2xl transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 ${isValidated ? 'border-emerald-500 bg-emerald-50/30' : 'border-warm-200 hover:border-emerald-400'}`}
                                                            >
                                                                <p className="text-[11px] font-serif text-slate-700 leading-tight italic pr-6">"{sug}"</p>
                                                                {isValidated ? (
                                                                    <Check className="absolute top-4 right-4 w-4 h-4 text-emerald-500" />
                                                                ) : (
                                                                    <Plus className="absolute top-4 right-4 w-4 h-4 text-emerald-500 opacity-20 group-hover:opacity-100 transition-opacity" />
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {suggestedEvolutions?.neg && suggestedEvolutions.neg.length > 0 && (
                                            <div className="space-y-3">
                                                <label className="text-[8px] font-black text-amber-600 uppercase tracking-widest px-1 flex items-center gap-2">
                                                    <AlertTriangle className="w-3 h-3" /> Reptes i Millores
                                                </label>
                                                <div className="grid gap-2">
                                                    {suggestedEvolutions.neg.map((sug, i) => {
                                                        const isValidated = student?.content?.evolutionPhrases?.includes(sug);
                                                        return (
                                                            <button 
                                                                key={i}
                                                                onClick={() => handleInjectPhrase(sug)}
                                                                disabled={isInjecting}
                                                                className={`group relative text-left p-4 bg-white border rounded-2xl transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 ${isValidated ? 'border-amber-500 bg-amber-50/30' : 'border-warm-200 hover:border-amber-400'}`}
                                                            >
                                                                <p className="text-[11px] font-serif text-slate-700 leading-tight italic pr-6">"{sug}"</p>
                                                                {isValidated ? (
                                                                    <Check className="absolute top-4 right-4 w-4 h-4 text-amber-500" />
                                                                ) : (
                                                                    <Plus className="absolute top-4 right-4 w-4 h-4 text-amber-500 opacity-20 group-hover:opacity-100 transition-opacity" />
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="py-12 flex flex-col items-center justify-center text-center px-4 gap-6 bg-white/40 border-2 border-dashed border-indigo-100 rounded-[3rem]">
                                        <div className="p-6 bg-indigo-50 rounded-full">
                                            <History className="w-12 h-12 text-indigo-300" />
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[12px] font-black text-slate-900 uppercase tracking-widest px-8 leading-relaxed">Analitza l'evolució del curs</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight px-10 leading-relaxed">
                                                L'IA revisarà els informes del T1 i T2 per trobar patrons, progressos i reptes anuals.
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => fetchEvolution(true)}
                                            className="px-10 py-4 bg-indigo-600 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl hover:-translate-y-1 active:scale-95 flex items-center gap-3"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                            Començar Anàlisi
                                        </button>
                                    </div>
                                )}

                                {student?.content?.evolutionPhrases && student.content.evolutionPhrases.length > 0 && (
                                    <div className="space-y-4 pt-4 border-t border-indigo-100">
                                        <label className="text-[8px] font-black text-indigo-600 uppercase tracking-widest px-1 flex items-center gap-2">
                                            <ShieldCheck className="w-3 h-3" /> Frases Validades al Perfil
                                        </label>
                                        <div className="grid gap-2">
                                            {student.content.evolutionPhrases.map((phrase: string, i: number) => (
                                                <button 
                                                    key={i}
                                                    onClick={() => handleInjectPhrase(phrase)}
                                                    disabled={isInjecting}
                                                    className="group relative text-left p-4 bg-indigo-600 text-white rounded-2xl hover:bg-black transition-all shadow-xl active:scale-[0.98] border border-indigo-700"
                                                >
                                                    <p className="text-[11px] font-bold leading-tight italic pr-6">"{phrase}"</p>
                                                    <Zap className="absolute top-4 right-4 w-4 h-4 text-amber-300 opacity-40 group-hover:opacity-100 transition-opacity" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {isInjecting && (
                            <div className="fixed inset-0 z-[60] bg-white/20 backdrop-blur-[2px] flex items-center justify-center p-8">
                                <div className="bg-primary-900 p-6 rounded-[2rem] shadow-2xl flex items-center gap-6 animate-pulse">
                                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                                    <p className="text-white text-[10px] font-black uppercase tracking-widest">Injectant evolució...</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
