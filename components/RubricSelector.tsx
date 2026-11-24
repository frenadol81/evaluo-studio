
import React, { useState, useEffect, useRef } from 'react';
import { List, Plus, ChevronDown, ChevronUp, BookOpenCheck, Sigma, Globe, BrainCircuit, Cpu, Download, Upload, RotateCcw, Zap, Check, Sprout, Fingerprint } from 'lucide-react';
import { Rubric, RubricItem } from '../types';
import { DEFAULT_RUBRICS } from '../constants';

interface RubricSelectorProps {
  onSelectObservation: (text: string) => void;
  onSelectMultipleObservations?: (texts: string[]) => void;
  selectedItems?: string[];
}

export const RubricSelector: React.FC<RubricSelectorProps> = ({ 
    onSelectObservation, 
    onSelectMultipleObservations,
    selectedItems = [] 
}) => {
  const [rubrics, setRubrics] = useState<Rubric[]>(DEFAULT_RUBRICS);
  const [currentRubricIndex, setCurrentRubricIndex] = useState(0);
  const [openCategories, setOpenCategories] = useState<Record<string, Set<string>>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load rubrics from local storage on mount
  useEffect(() => {
    const savedRubrics = localStorage.getItem('pedagogic_rubrics_data');
    if (savedRubrics) {
      try {
        const parsed = JSON.parse(savedRubrics);
        if (Array.isArray(parsed)) setRubrics(parsed);
      } catch (e) {
        console.error("Failed to parse saved rubrics", e);
      }
    }
  }, []);

  const saveRubricsToStorage = (newRubrics: Rubric[]) => {
    setRubrics(newRubrics);
    localStorage.setItem('pedagogic_rubrics_data', JSON.stringify(newRubrics));
  };

  const rubric = rubrics[currentRubricIndex] || rubrics[0] || { name: '', categories: [] };

  const toggleCategory = (rubricName: string, categoryName: string) => {
    setOpenCategories(prev => {
      const currentSet = new Set(prev[rubricName] || []);
      if (currentSet.has(categoryName)) {
        currentSet.delete(categoryName);
      } else {
        currentSet.add(categoryName);
      }
      return { ...prev, [rubricName]: currentSet };
    });
  };

  const isCategoryOpen = (rubricName: string, categoryName: string) => {
    const set = openCategories[rubricName];
    if (!set) return rubric?.categories?.[0]?.name === categoryName;
    return set.has(categoryName);
  };

  // --- PERSONALITY STYLE LOGIC ---
  const getPersonalityStyle = (text: string, isSelected: boolean) => {
      const lower = text.toLowerCase();
      const positives = ['creatiu', 'curiós', 'perseverant', 'esforçat', 'proactiu', 'autònom', 'alegre', 'empàtic', 'conciliador', 'assertiu', 'generós', 'organitzat', 'reflexiu', 'focalitzat', 'àgil', 'meticulós'];
      const neutrals = ['introvertit', 'extrovertit', 'teatral', 'pausat', 'somiador'];
      const improvements = ['passiu', 'dependent', 'inconstant', 'rígid', 'fràgil', 'irascible', 'dominant', 'desconfiat', 'demandant', 'caòtic', 'precipitat', 'perfeccionista', 'dispers', 'impulsiu', 'poc assertiu'];

      const match = text.split(':')[0].toLowerCase().trim();

      if (positives.includes(match)) {
          return isSelected 
            ? 'bg-indigo-100 text-indigo-800 border-indigo-300 ring-1 ring-indigo-300 font-bold shadow-md' 
            : 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100';
      }
      if (neutrals.includes(match)) {
          return isSelected 
            ? 'bg-slate-200 text-slate-800 border-slate-300 ring-1 ring-slate-400 font-bold shadow-md' 
            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100';
      }
      if (improvements.includes(match)) {
          return isSelected 
            ? 'bg-orange-100 text-orange-800 border-orange-300 ring-1 ring-orange-300 font-bold shadow-md' 
            : 'bg-orange-50 text-orange-800 border-orange-100 hover:bg-orange-100';
      }
      
      return isSelected ? 'bg-gray-200 text-gray-800 font-bold' : 'bg-gray-100 text-gray-800';
  };

  const getLevelColor = (text: string) => {
    const t = text.toLowerCase();
    if (t.startsWith("expert")) return "bg-indigo-50 border-indigo-200 text-indigo-800 hover:bg-indigo-100 hover:border-indigo-300";
    if (t.startsWith("avançat") || t.startsWith("avançada")) return "bg-green-50 border-green-200 text-green-800 hover:bg-green-100 hover:border-green-300";
    if (t.startsWith("aprenent")) return "bg-yellow-50 border-yellow-200 text-yellow-800 hover:bg-yellow-100 hover:border-yellow-300";
    if (t.startsWith("novell")) return "bg-red-50 border-red-200 text-red-800 hover:bg-red-100 hover:border-red-300";

    if (t.includes("energia") || t.includes("força")) return "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100";
    if (t.includes("fluid") || t.includes("peix a l'aigua")) return "bg-sky-50 border-sky-200 text-sky-800 hover:bg-sky-100";
    if (t.includes("tranquil") || t.includes("correcte")) return "bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100";
    if (t.includes("observador") || t.includes("tímid")) return "bg-violet-50 border-violet-200 text-violet-800 hover:bg-violet-100";
    if (t.includes("variable") || t.includes("altibaixos")) return "bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100";
    if (t.includes("ritme") || t.includes("lent")) return "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100";
    if (t.includes("agitat") || t.includes("conflictes")) return "bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100";
    if (t.includes("cercador") || t.includes("buscant")) return "bg-gray-50 border-gray-200 text-gray-800 hover:bg-gray-100";
    if (t.includes("carinyós")) return "bg-pink-50 border-pink-200 text-pink-800 hover:bg-pink-100";

    return "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100";
  };

  const getIconForRubric = (index: number) => {
    const rubricName = rubrics[index]?.name || "";
    if (rubricName.includes("Benestar")) return <Sprout className="w-4 h-4 text-emerald-600" />;
    if (rubricName.includes("Hàbits") || rubricName.includes("Actitud")) return <BrainCircuit className="w-4 h-4 text-indigo-600" />;
    if (rubricName.includes("Personalitat")) return <Fingerprint className="w-4 h-4 text-amber-600" />;
    if (rubricName.includes("Lingüístic") || rubricName.includes("Llengua")) return <BookOpenCheck className="w-4 h-4 text-blue-600" />;
    if (rubricName.includes("Matemàtiques")) return <Sigma className="w-4 h-4 text-rose-600" />;
    if (rubricName.includes("Medi") || rubricName.includes("Món")) return <Globe className="w-4 h-4 text-green-600" />;
    return <List className="w-4 h-4" />;
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(rubrics));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "rubriques_escola.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json) && json.length > 0 && json[0].name && json[0].categories) {
           saveRubricsToStorage(json);
           alert("Rúbriques importades correctament!");
        } else {
           alert("Format de fitxer incorrecte.");
        }
      } catch (err) {
        console.error(err);
        alert("Error en llegir el fitxer JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  const handleResetDefaults = () => {
    if(confirm("Segur que vols restaurar les rúbriques per defecte?")) {
        saveRubricsToStorage(DEFAULT_RUBRICS);
    }
  };

  const findItemByLevel = (items: RubricItem[], levelSuffix: string): RubricItem | undefined => {
      const match = items.find(item => item.id.endsWith(`-${levelSuffix}`));
      if (match) return match;

      const textPrefixMap: Record<string, string[]> = {
          'nov': ['Novell', 'Inici', 'Bajo', '1.'],
          'apr': ['Aprenent', 'En progrés', 'En progreso', '2.'],
          'adv': ['Avançat', 'Assolit', 'Satisfactorio', 'Significatiu', '3.'],
          'exp': ['Expert', 'Excelente', 'Sobresaliente', '4.']
      };
      
      const textMatch = items.find(item => 
          textPrefixMap[levelSuffix]?.some(prefix => item.text.toLowerCase().trim().startsWith(prefix.toLowerCase()))
      );

      return textMatch;
  };

  const handleBulkSelect = (e: React.MouseEvent, items: RubricItem[], levelSuffix: string) => {
    e.stopPropagation(); 
    const item = findItemByLevel(items, levelSuffix);
    if (item) {
        onSelectObservation(item.text);
    }
  };

  const handleGlobalBulkSelect = (levelSuffix: string) => {
     if (!onSelectMultipleObservations || !rubric?.categories) return;
     const allTexts: string[] = [];
     rubric.categories.forEach(category => {
         if (category.items) {
           const item = findItemByLevel(category.items, levelSuffix);
           if (item) allTexts.push(item.text);
         }
     });
     if (allTexts.length > 0) onSelectMultipleObservations(allTexts);
     else alert("No s'han trobat ítems corresponents a aquest nivell.");
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6 shadow-sm ring-1 ring-gray-100">
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex justify-end gap-2 text-xs">
         <button onClick={handleExport} className="flex items-center gap-1 text-gray-600 hover:text-pedagogical-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors" title="Exportar JSON">
            <Download className="w-3 h-3" /> Exportar
         </button>
         <button onClick={handleImportClick} className="flex items-center gap-1 text-gray-600 hover:text-pedagogical-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors" title="Importar JSON">
            <Upload className="w-3 h-3" /> Importar
         </button>
         <button onClick={handleResetDefaults} className="flex items-center gap-1 text-gray-600 hover:text-red-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors" title="Restaurar Defecte">
            <RotateCcw className="w-3 h-3" />
         </button>
         <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
      </div>

      <div className="bg-gradient-to-r from-pedagogical-50 to-white px-4 py-3 border-b border-pedagogical-100 flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="flex flex-col gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-2">
                <span className="bg-white p-1.5 rounded-lg shadow-sm border border-pedagogical-100">
                    {getIconForRubric(currentRubricIndex)}
                </span>
                <select 
                    value={currentRubricIndex}
                    onChange={(e) => setCurrentRubricIndex(Number(e.target.value))}
                    className="block w-full sm:w-64 rounded-md border-0 bg-transparent py-1.5 pl-1 pr-8 text-pedagogical-900 font-bold focus:ring-0 sm:text-sm cursor-pointer hover:text-pedagogical-700 transition-colors"
                >
                    {rubrics.map((r, idx) => (
                    <option key={idx} value={idx}>{r.name}</option>
                    ))}
                </select>
            </div>
            
            {rubric?.name && !rubric.name.includes("Personalitat") && (
                <div className="flex items-center gap-1.5 pl-9 animate-fade-in">
                    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mr-1">Tota la rúbrica:</span>
                    <button onClick={() => handleGlobalBulkSelect('nov')} className="px-2 py-1 text-[10px] font-bold rounded shadow-sm border border-red-200 bg-red-50 text-red-700 hover:bg-red-100">Novell</button>
                    <button onClick={() => handleGlobalBulkSelect('apr')} className="px-2 py-1 text-[10px] font-bold rounded shadow-sm border border-yellow-200 bg-yellow-50 text-yellow-700 hover:bg-yellow-100">Aprenent</button>
                    <button onClick={() => handleGlobalBulkSelect('adv')} className="px-2 py-1 text-[10px] font-bold rounded shadow-sm border border-green-200 bg-green-50 text-green-700 hover:bg-green-100">Avançat</button>
                    <button onClick={() => handleGlobalBulkSelect('exp')} className="px-2 py-1 text-[10px] font-bold rounded shadow-sm border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100">Expert</button>
                </div>
            )}
        </div>
        <div className="text-xs text-pedagogical-500 font-medium whitespace-nowrap bg-pedagogical-50 px-2 py-1 rounded-full">{rubric?.categories?.length || 0} categories</div>
      </div>
      
      <div className="max-h-[500px] overflow-y-auto custom-scrollbar bg-white">
        {rubric?.categories?.map((category, idx) => {
            const isOpen = isCategoryOpen(rubric.name, category.name);
            const isPersonality = rubric.name.includes("Personalitat");
            
            if (isPersonality) {
               return (
                <div key={idx} className="border-b border-gray-50 last:border-0">
                   <div className="px-4 py-2 bg-indigo-50/60 text-xs font-bold text-indigo-700 uppercase tracking-wide border-l-4 border-indigo-200">{category.name}</div>
                   <div className="p-3 flex flex-wrap gap-2">
                      {category.items?.map((item) => (
                            <button key={item.id} onClick={() => onSelectObservation(item.text)} title={item.text} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1 active:scale-95 border ${getPersonalityStyle(item.text, selectedItems.includes(item.text))}`}>
                            {item.text.split(':')[0]}
                            </button>
                        ))}
                   </div>
                </div>
               );
            }

            return (
              <div key={idx} className="border-b border-gray-50 last:border-0">
                <button onClick={() => toggleCategory(rubric.name, category.name)} className="w-full flex items-center justify-between px-4 py-3 text-left group transition-all bg-pedagogical-50/40 hover:bg-pedagogical-50 border-l-4 border-pedagogical-200">
                    <div className="flex items-center gap-3 overflow-hidden">
                        {isOpen ? <ChevronUp className="w-4 h-4 text-pedagogical-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-pedagogical-400 shrink-0" />}
                        <span className="text-sm font-bold text-pedagogical-800 uppercase tracking-wide truncate">{category.name}</span>
                    </div>
                    {rubric?.name && !rubric.name.includes("Benestar") && (
                      <div className="flex items-center gap-1 ml-2 animate-fade-in shrink-0 opacity-50 group-hover:opacity-100 transition-opacity">
                          <div className="w-6 h-6 flex items-center justify-center text-[10px] font-bold rounded-full border border-red-200 bg-red-50 text-red-700 hover:bg-red-100" onClick={(e) => handleBulkSelect(e, category.items, 'nov')}>N</div>
                          <div className="w-6 h-6 flex items-center justify-center text-[10px] font-bold rounded-full border border-yellow-200 bg-yellow-50 text-yellow-700 hover:bg-yellow-100" onClick={(e) => handleBulkSelect(e, category.items, 'apr')}>Ap</div>
                          <div className="w-6 h-6 flex items-center justify-center text-[10px] font-bold rounded-full border border-green-200 bg-green-50 text-green-700 hover:bg-green-100" onClick={(e) => handleBulkSelect(e, category.items, 'adv')}>Av</div>
                          <div className="w-6 h-6 flex items-center justify-center text-[10px] font-bold rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100" onClick={(e) => handleBulkSelect(e, category.items, 'exp')}>Ex</div>
                      </div>
                    )}
                </button>
                {isOpen && (
                    <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3 animate-fade-in bg-white">
                    {category.items?.map((item) => {
                        const isSelected = selectedItems.includes(item.text);
                        const hasColon = item.text.includes(':');
                        const keyword = hasColon ? item.text.split(':')[0] + ':' : item.text;
                        const remainder = hasColon ? item.text.split(':').slice(1).join(':') : '';
                        return (
                            <button key={item.id} onClick={() => onSelectObservation(item.text)} className={`text-left text-xs md:text-sm px-3 py-3 border rounded-xl transition-all flex items-start gap-2 group shadow-sm hover:shadow-md h-full active:scale-[0.98] ${isSelected ? 'bg-pedagogical-600 border-pedagogical-700 text-white ring-2 ring-pedagogical-200 font-medium' : getLevelColor(item.text)}`}>
                                {isSelected ? <Check className="w-4 h-4 mt-0.5 text-white flex-shrink-0" /> : <Plus className="w-4 h-4 mt-0.5 opacity-50 group-hover:opacity-100 flex-shrink-0" />}
                                <span className="leading-snug"><span className="font-bold">{keyword}</span>{remainder && <span className={`block text-xs mt-0.5 ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>{remainder}</span>}</span>
                            </button>
                        );
                    })}
                    </div>
                )}
              </div>
            );
        })}
      </div>
    </div>
  );
};
