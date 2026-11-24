
import React from 'react';
import { RotateCw, Zap, ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react';

/**
 * FloatingHalo: El menú contextual intel·ligent que apareix sobre el text seleccionat.
 * 
 * @param {Object} props
 * @param {Object} props.position - { x, y } Coordenades on mostrar el menú.
 * @param {Function} props.onTune - Callback per canviar la intensitat.
 * @param {Function} props.onReimagine - Callback per demanar variacions.
 * @param {boolean} props.isLoading - Estat de càrrega de l'IA.
 * @param {number} props.currentIntensity - Intensitat seleccionada actualment.
 */
export const FloatingHalo = ({ position, onTune, onReimagine, isLoading, currentIntensity = 0 }) => {
  if (!position) return null;

  const getIntensityStyles = () => {
    if (currentIntensity >= 2) return "border-yellow-400 shadow-yellow-200/50";
    if (currentIntensity <= -2) return "border-blue-400 shadow-blue-200/50";
    return "border-gray-200 shadow-gray-200/30";
  };

  return (
    <div 
      className={`
        fixed z-[100] bg-white/90 backdrop-blur-md p-1.5 rounded-2xl border-2 shadow-2xl transition-all animate-slide-up
        flex items-center gap-1 min-w-max
        ${getIntensityStyles()}
      `}
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y - 60}px`,
        transform: 'translateX(-50%)' 
      }}
    >
      {isLoading ? (
        <div className="px-4 py-2 flex items-center gap-3 text-primary-900 font-bold text-xs">
          <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
          Refinant frase...
        </div>
      ) : (
        <>
          <div className="flex bg-gray-100/50 rounded-xl p-1 gap-1">
            <button 
              onClick={() => onTune(-3)} 
              title="Més prudent"
              className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
            </button>
            
            <button 
              onClick={() => onTune(0)} 
              title="Neutre"
              className="px-3 py-1 text-[10px] font-bold text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              0
            </button>
            
            <button 
              onClick={() => onTune(3)} 
              title="Més contundent"
              className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
            >
              <AlertTriangle className="w-4 h-4" />
            </button>
          </div>

          <div className="w-px h-6 bg-gray-200 mx-1"></div>

          <button 
            onClick={onReimagine}
            className="flex items-center gap-2 px-3 py-2 bg-primary-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all group"
          >
            <RotateCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
            Variació
          </button>
        </>
      )}
    </div>
  );
};
