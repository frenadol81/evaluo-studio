
import React from 'react';
import { Zap, Feather, ShieldCheck, AlertTriangle } from 'lucide-react';

export const ToneControls = ({ config, onChange }) => {
  const { styleLevel, intensityLevel } = config;

  const getIntensityFeedback = (val) => {
    if (val <= -2) return { text: "Prudent / Protector", color: "text-blue-600", bg: "bg-blue-50", icon: <ShieldCheck className="w-4 h-4" /> };
    if (val < 0) return { text: "Suau / Educat", color: "text-blue-400", bg: "bg-blue-50/50", icon: null };
    if (val === 0) return { text: "Neutre / Estàndard", color: "text-gray-500", bg: "bg-gray-50", icon: null };
    if (val < 2) return { text: "Directe / Clar", color: "text-amber-500", bg: "bg-amber-50/50", icon: null };
    return { text: "Contundent / Realista", color: "text-orange-600", bg: "bg-orange-50", icon: <AlertTriangle className="w-4 h-4" /> };
  };

  const getStyleLabel = (val) => {
    if (val < 0.2) return "Tècnic";
    if (val < 0.4) return "Acadèmic";
    if (val < 0.6) return "Equilibrat";
    if (val < 0.8) return "Narratiu";
    return "Inspirador";
  };

  const feedback = getIntensityFeedback(intensityLevel);

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl space-y-10">
      {/* Estil */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <Feather className="w-4 h-4 text-primary-500" /> Estil Narratiu
          </label>
          <span className="text-[10px] font-black px-4 py-1.5 bg-primary-950 text-white rounded-full uppercase tracking-widest transition-all">
            {getStyleLabel(styleLevel)}
          </span>
        </div>
        <input 
          type="range" min="0" max="1" step="0.1" value={styleLevel} 
          onChange={(e) => onChange('styleLevel', parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary-600"
        />
      </div>

      {/* Intensitat (7 Nivells) */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <Zap className="w-4 h-4 text-secondary-500" /> Intensitat del Matís
          </label>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${feedback.bg} ${feedback.color}`}>
            {feedback.icon} {feedback.text}
          </div>
        </div>
        <div className="relative px-2">
          <input 
            type="range" min="-3" max="3" step="1" value={intensityLevel} 
            onChange={(e) => onChange('intensityLevel', parseInt(e.target.value, 10))}
            className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-secondary-600"
          />
          <div className="flex justify-between mt-4">
            {[-3, -2, -1, 0, 1, 2, 3].map((v) => (
              <div key={v} className="flex flex-col items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full transition-all ${intensityLevel === v ? 'bg-secondary-600 scale-150 shadow-lg' : 'bg-gray-200'}`} />
                <span className={`text-[9px] font-black ${intensityLevel === v ? 'text-secondary-900' : 'text-gray-300'}`}>{v > 0 ? `+${v}` : v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
