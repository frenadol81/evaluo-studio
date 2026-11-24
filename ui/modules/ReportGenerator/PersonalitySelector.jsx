
import React from 'react';
import { PERSONALITY_BLOCK } from '../../../core/config/personalityRubric.js';
import { Zap, Heart, Brain, Check, ArrowRight, ArrowLeft, Target } from 'lucide-react';

export const PersonalitySelector = ({ selectedTraits = [], onToggle, density = 'balanced' }) => {

  const TraitButton = ({ trait, type }) => {
    const isSelected = selectedTraits.includes(trait.definition);
    
    // Densitat reponsiva a controls
    const densityStyles = {
        compact: "px-1.5 py-1.5 text-[9px]",
        balanced: "px-2 py-2 text-[10px]",
        wide: "px-3 py-3 text-[11px]"
    };

    const baseStyles = `${densityStyles[density]} rounded-xl font-bold border transition-all active:scale-95 flex items-center justify-center gap-1.5 relative group/btn h-full shadow-sm`;
    
    // Contrast millorat per a adjectius no seleccionats (text-slate-600 i border-warm-300)
    const styles = {
      excess: isSelected 
        ? "bg-amber-50 text-amber-700 border-amber-200 shadow-sm z-10" 
        : "bg-white text-slate-600 border-warm-300 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-600",
      balance: isSelected 
        ? "bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm z-10" 
        : "bg-white text-slate-600 border-warm-300 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600",
      defect: isSelected 
        ? "bg-rose-50 text-rose-700 border-rose-200 shadow-sm z-10" 
        : "bg-white text-slate-600 border-warm-300 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600"
    };

    return (
      <button
        type="button"
        onClick={() => onToggle(null, trait.definition)}
        className={`${baseStyles} ${styles[type]} flex-1`}
      >
        {isSelected && <Check className="w-2.5 h-2.5 shrink-0" />}
        <span className="truncate">{trait.label}</span>
        
        {/* Tooltip amb retraso de 1.3 segons (delay-[1300ms]) */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-56 p-4 bg-slate-900 text-white text-[10px] rounded-2xl z-[100] shadow-2xl opacity-0 group-hover/btn:opacity-100 transition-all duration-300 delay-[1300ms] pointer-events-none border border-white/10 text-center leading-relaxed font-medium">
            <p className="font-black mb-1 uppercase tracking-widest text-[8px] opacity-40">{trait.label}</p>
            {trait.definition}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900"></div>
        </div>
      </button>
    );
  };

  return (
    <div className={`space-y-12 animate-fade-in pb-20 ${density === 'compact' ? 'scale-[0.98] origin-top' : ''}`}>
      {PERSONALITY_BLOCK.map((axis) => (
        <div key={axis.id} className="bg-white rounded-[2.5rem] border border-warm-200 shadow-sm overflow-visible">
          <div className="bg-warm-50/30 px-8 py-5 border-b border-warm-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-2.5 rounded-2xl bg-white shadow-sm border border-warm-100`}>
                {axis.id === 'motor' ? <Zap className="w-4 h-4 text-blue-500" /> : axis.id === 'caracter' ? <Heart className="w-4 h-4 text-rose-500" /> : <Brain className="w-4 h-4 text-emerald-500" />}
              </div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{axis.title}</h3>
            </div>
            <div className="hidden md:flex items-center gap-6 text-[8px] font-black text-slate-300 uppercase tracking-[0.2em]">
               <span className="flex items-center gap-1.5"><ArrowLeft className="w-3 h-3" /> Excés</span>
               <span className="flex items-center gap-1.5"><Target className="w-3 h-3" /> Potència</span>
               <span className="flex items-center gap-1.5">Manca <ArrowRight className="w-3 h-3" /></span>
            </div>
          </div>

          <div className={`p-4 md:p-8 ${density === 'compact' ? 'space-y-3' : 'space-y-6'}`}>
            {axis.dimensions.map((dim) => (
              <div key={dim.name} className="flex flex-col lg:flex-row lg:items-center gap-4 group">
                <div className="lg:w-32 shrink-0">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-900 transition-colors">{dim.name}</span>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex gap-2 bg-amber-50/20 p-2 rounded-2xl border border-amber-100/20">
                    {dim.excess.map(t => <TraitButton key={t.id} trait={t} type="excess" />)}
                  </div>

                  <div className="flex gap-2 bg-indigo-50/20 p-2 rounded-2xl border border-indigo-100/20">
                    {dim.balance.map(t => <TraitButton key={t.id} trait={t} type="balance" />)}
                  </div>

                  <div className="flex gap-2 bg-rose-50/20 p-2 rounded-2xl border border-rose-100/20">
                    {dim.defect.map(t => <TraitButton key={t.id} trait={t} type="defect" />)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
