
import React from 'react';
import { PersonalitySelector } from '../modules/ReportGenerator/PersonalitySelector.jsx';
import { PERSONALITY_BLOCK } from '../../core/config/personalityRubric.js';
import { getRubricLevels } from '../../core/config/rubricLevels.js';
import { isOptionSelected, updateRowSelectionSafely } from '../../core/utils/rubricMatcher.js';
import { Check, PenTool } from 'lucide-react';

const ALL_PERSONALITY_DEFS = PERSONALITY_BLOCK.flatMap(s => 
  s.dimensions.flatMap(d => [
    ...(d.excess || []), 
    ...(d.balance || []), 
    ...(d.defect || [])
  ].map(t => t.definition))
);

export const RubricFactory = ({ section, studentData, onUpdate, density = 'balanced' }) => {
  if (!section || !studentData) return null;

  const displayName = studentData.info?.name || "l'alumne/a";

  const handleToggleObservation = (text, categoryId) => {
    const currentTags = Array.isArray(studentData.content?.tags) ? [...studentData.content.tags] : [];

    if (section.inputType === 'TAG_CLOUD') {
      const isAlreadySelected = currentTags.includes(text);
      let nextTags;
      if (isAlreadySelected) nextTags = currentTags.filter(t => t !== text);
      else {
        nextTags = [...currentTags, text];
      }
      onUpdate('content', { tags: nextTags });
      return;
    }

    const activeRow = section.data?.find(d => d.id === categoryId);
    if (!activeRow || !activeRow.options) return;

    // BLINDATGE ANTI-BUIDAT:
    // Un cop emplenada una fila de rúbrica, mai es torna a buidar per un clic accidental!
    // Si es fa clic sobre l'opció ja activa, es manté seleccionada.
    // Si es fa clic sobre un altre nivell, canvia al nou nivell de manera neta.
    const nextTags = updateRowSelectionSafely(currentTags, activeRow, text, displayName, false);
    onUpdate('content', { tags: nextTags });
  };

  const handleToggleSenseEvidencies = (categoryId) => {
    const currentTags = Array.isArray(studentData.content?.tags) ? [...studentData.content.tags] : [];
    const activeRow = section.data?.find(d => d.id === categoryId);
    if (!activeRow) return;

    // Protecció anti-buidat per a 'Sense evidències'
    const nextTags = updateRowSelectionSafely(currentTags, activeRow, '', displayName, true);
    onUpdate('content', { tags: nextTags });
  };
  
  const handleUpdateNuance = (rowId, value) => {
    const currentNuances = studentData.content?.nuances || {};
    onUpdate('content', { 
      ...studentData.content, 
      nuances: { ...currentNuances, [rowId]: value } 
    });
  };

  const handleBulkAssign = (levelIndex) => {
    if (!section.data) return;
    const currentTags = Array.isArray(studentData.content?.tags) ? [...studentData.content.tags] : [];
    let updatedTags = [...currentTags];

    section.data.forEach(row => {
      const optionText = row.options ? row.options[levelIndex] : null;
      if (optionText) {
        updatedTags = updateRowSelectionSafely(updatedTags, row, optionText, displayName, false);
      }
    });

    onUpdate('content', { tags: updatedTags });
  };

  const getDensityClasses = () => {
    if (density === 'compact') return { row: 'py-2.5 px-6', text: 'text-[11px]', btn: 'w-12 h-9 text-[9px]' };
    if (density === 'wide') return { row: 'py-8 px-12', text: 'text-base', btn: 'w-18 h-14 text-[12px]' };
    return { row: 'py-5 px-8', text: 'text-[13px]', btn: 'w-15 h-11 text-[11px]' };
  };

  const dc = getDensityClasses();

  if (section.inputType === 'TAG_CLOUD') {
    return (
      <PersonalitySelector 
        selectedTraits={studentData.content.tags || []} 
        onToggle={(id, definition) => handleToggleObservation(definition)} 
        density={density}
      />
    );
  }

  const levels = getRubricLevels(section);

  if (section.inputType === 'GRID_4_LEVELS' && section.data) {
    return (
      <div className="bg-white rounded-[2.5rem] border border-warm-200 shadow-sm overflow-visible animate-fade-in mb-10">
        <div className="bg-warm-50/50 border-b border-warm-100 px-8 py-3.5 flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Assignació ràpida del bloc</span>
            <div className="flex gap-2">
                {levels.map((lvl, idx) => (
                    <button 
                        key={idx} 
                        onClick={() => handleBulkAssign(idx)}
                        className={`px-4 py-1.5 rounded-xl text-[9px] font-black text-white ${lvl.color} hover:scale-105 active:scale-95 transition-all shadow-md`}
                    >
                        Tots {lvl.label}
                    </button>
                ))}
            </div>
        </div>

        <div className="divide-y divide-warm-100">
          {section.data.map((row) => {
            const currentTags = studentData.content?.tags || [];
            const selectedRowOptions = (row.options || []).filter(opt => isOptionSelected(currentTags, opt, displayName));
            const hasMultiple = selectedRowOptions.length > 1;
            const currentNuance = (studentData.content?.nuances || {})[row.id] || "";
            const seTag = `pb_${row.id}_sense_evidencies`;
            const isSenseEvidenciesSelected = currentTags.includes(seTag);
            
            return (
              <div key={row.id} className={`group flex flex-col hover:bg-warm-50/30 transition-colors gap-4 ${dc.row}`}>
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="lg:w-[45%] flex items-start gap-4">
                    <div className={`mt-1 p-1.5 rounded-xl transition-all shadow-sm ${selectedRowOptions.length > 0 || isSenseEvidenciesSelected ? 'bg-primary-900 text-white' : 'bg-warm-100 text-slate-200'}`}>
                      <Check className="w-3 h-3" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className={`${dc.text} font-black text-slate-800 uppercase tracking-tight`}>{row.label}</h4>
                        {hasMultiple && (
                          <span className="px-2 py-0.5 rounded-full text-[8px] font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-wider">
                            Transició ({selectedRowOptions.length})
                          </span>
                        )}
                        {isSenseEvidenciesSelected && (
                          <span className="px-2 py-0.5 rounded-full text-[8px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
                            Sense evidències
                          </span>
                        )}
                      </div>
                      {selectedRowOptions.map((opt, i) => (
                        <p key={i} className="text-[11px] text-slate-500 font-semibold italic line-clamp-1 transition-all">"{(row.displayOptionsByLevel?.[levels[row.options.indexOf(opt)]?.label] || opt).replace(/\{nom\}/g, displayName)}"</p>
                      ))}
                      {isSenseEvidenciesSelected && (
                        <p className="text-[11px] text-slate-400 font-semibold italic line-clamp-1 transition-all">"{row.senseEvidencies}"</p>
                      )}
                    </div>
                  </div>

                  <div className="lg:flex-1 flex justify-end">
                     <div className="flex bg-warm-50 rounded-2xl p-1 gap-1 border border-warm-200 shadow-inner">
                        {levels.map((lvl, idx) => {
                          const optionText = row.options ? row.options[idx] : null;
                          if (!optionText) return null;
                          const isSelected = isOptionSelected(currentTags, optionText, displayName);
                          const renderedOption = (row.displayOptionsByLevel?.[lvl.label] || optionText).replace(/\{nom\}/g, displayName);
                          
                          return (
                            <div key={idx} className="relative group/btn">
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-5 bg-slate-900 text-white text-[11px] rounded-2xl z-50 shadow-2xl opacity-0 group-hover/btn:opacity-100 transition-all duration-300 delay-[1300ms] pointer-events-none text-center border border-white/10 leading-relaxed font-medium">
                                  <p className={`font-black mb-1.5 uppercase tracking-widest text-[9px] ${isSelected ? 'text-white' : 'text-slate-400'}`}>{lvl.full}</p>
                                  {renderedOption}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900"></div>
                              </div>

                              <button 
                                type="button"
                                onClick={() => handleToggleObservation(optionText, row.id)}
                                className={`rounded-xl font-black transition-all flex items-center justify-center border-2 shadow-sm ${dc.btn} ${
                                  isSelected 
                                  ? `${lvl.color} text-white border-black/10 shadow-lg scale-110 z-10` 
                                  : 'bg-white text-slate-300 border-transparent hover:text-slate-500 hover:border-warm-200'
                                }`}
                              >
                                {lvl.label}
                              </button>
                            </div>
                          );
                        })}

                        {row.senseEvidencies && (
                          <div className="relative group/btn ml-1 pl-1 border-l border-warm-200">
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-4 bg-slate-900 text-white text-[11px] rounded-2xl z-50 shadow-2xl opacity-0 group-hover/btn:opacity-100 transition-all duration-300 delay-[500ms] pointer-events-none text-center border border-white/10 leading-relaxed font-medium">
                              <p className="font-black mb-1 uppercase tracking-widest text-[9px] text-slate-300">Sense evidències</p>
                              {row.senseEvidencies}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900"></div>
                            </div>
                            <button 
                              type="button"
                              onClick={() => handleToggleSenseEvidencies(row.id)}
                              className={`rounded-xl font-black transition-all flex items-center justify-center border-2 shadow-sm ${dc.btn} ${
                                isSenseEvidenciesSelected 
                                ? 'bg-slate-700 text-white border-black/10 shadow-lg scale-110 z-10' 
                                : 'bg-white text-slate-300 border-transparent hover:text-slate-500 hover:border-warm-200'
                              }`}
                              title="Sense evidències"
                            >
                              SE
                            </button>
                          </div>
                        )}
                     </div>
                  </div>
                </div>

                {/* Input de Matís */}
                <div className="mt-2 pt-3 border-t border-warm-100/50 flex items-center gap-3">
                  <div className="bg-warm-100 p-1.5 rounded-lg">
                    <PenTool className="w-3 h-3 text-warm-400" />
                  </div>
                  <input 
                    type="text"
                    value={currentNuance}
                    onChange={(e) => handleUpdateNuance(row.id, e.target.value)}
                    placeholder="Afegeix un matís o detall personalitzat per a aquest ítem..."
                    className="flex-1 bg-transparent text-[10px] font-bold text-slate-600 outline-none placeholder:text-warm-300 placeholder:italic uppercase tracking-tight"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
};
