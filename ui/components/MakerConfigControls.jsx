
import React from 'react';
import { Hammer, Cpu, Rocket, Settings2 } from 'lucide-react';

export const MakerConfigControls = ({ config, onChange }) => {
  const { technicalLevel, creativeFreedom } = config;

  const getTechnicalLabel = (val) => {
    if (val < 0.2) return "Bàsic / Eines";
    if (val < 0.5) return "Funcional";
    if (val < 0.8) return "Estratègic";
    return "Enginyeria / Avançat";
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-emerald-100 shadow-xl space-y-10">
      <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-100"><Hammer className="w-5 h-5 text-white" /></div>
          <div>
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Configuració Maker Space</h4>
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">IA Especialitzada STEAM</p>
          </div>
      </div>

      {/* Nivell Tècnic */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-500" /> Rigor Tècnic
          </label>
          <span className="text-[9px] font-black px-4 py-1.5 bg-emerald-950 text-white rounded-full uppercase tracking-widest">
            {getTechnicalLabel(technicalLevel)}
          </span>
        </div>
        <input 
          type="range" min="0" max="1" step="0.1" value={technicalLevel} 
          onChange={(e) => onChange('technicalLevel', parseFloat(e.target.value))}
          className="w-full h-2 bg-emerald-50 rounded-lg appearance-none cursor-pointer accent-emerald-600"
        />
      </div>

      {/* Llibertat Creativa */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Rocket className="w-4 h-4 text-amber-500" /> Visió Creativa
          </label>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-50 text-amber-600">
            {creativeFreedom > 0.7 ? "Inspirador" : creativeFreedom < 0.3 ? "Descriptiu" : "Equilibrat"}
          </div>
        </div>
        <div className="relative px-2">
          <input 
            type="range" min="0" max="1" step="0.1" value={creativeFreedom} 
            onChange={(e) => onChange('creativeFreedom', parseFloat(e.target.value))}
            className="w-full h-2 bg-amber-50 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>
      </div>
    </div>
  );
};
