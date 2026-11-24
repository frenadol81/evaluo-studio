
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { FloatingHalo } from './FloatingHalo.jsx';
import { executeTuneSentence } from '../../../application/useCases/tuneSelectedSentence.js';

/**
 * InteractiveReport: El visualitzador de l'informe generat que permet edicions quirúrgiques.
 */
export const InteractiveReport = ({ initialReport, student, onUpdate }) => {
  const [reportText, setReportText] = useState(initialReport);
  const [selection, setSelection] = useState(null);
  const [isTuning, setIsTuning] = useState(false);
  const [currentIntensity, setCurrentIntensity] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    setReportText(initialReport);
  }, [initialReport]);

  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.toString().trim().length < 5) {
      setSelection(null);
      return;
    }

    const text = sel.toString().trim();
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Utilitzem coordenades relatives al viewport fixat
    setSelection({
      text,
      x: rect.left + rect.width / 2,
      y: rect.top 
    });
  };

  const handleTune = async (intensity) => {
    if (!selection || isTuning) return;
    
    setIsTuning(true);
    setCurrentIntensity(intensity);

    try {
      const context = { 
        name: student.info?.name || student.studentName, 
        gender: student.info?.gender || student.gender 
      };

      const rewritten = await executeTuneSentence(selection.text, context, intensity);
      
      const newFullText = reportText.replace(selection.text, rewritten);
      
      setReportText(newFullText);
      if (onUpdate) onUpdate(newFullText);
      
      setSelection(null);
      window.getSelection()?.removeAllRanges();
    } catch (error) {
      console.error(error);
      alert("Error al refinar el text.");
    } finally {
      setIsTuning(false);
      setCurrentIntensity(0);
    }
  };

  const handleReimagine = () => {
    handleTune(0);
  };

  return (
    <div 
      ref={containerRef}
      className="relative bg-paper p-8 md:p-12 rounded-3xl shadow-inner border border-gray-100 min-h-[400px]"
      onMouseUp={handleMouseUp}
    >
      {selection && (
        <FloatingHalo 
          position={{ x: selection.x, y: selection.y }}
          onTune={handleTune}
          onReimagine={handleReimagine}
          isLoading={isTuning}
          currentIntensity={currentIntensity}
        />
      )}

      <div className={`
        prose prose-slate max-w-none prose-p:leading-loose prose-p:text-lg font-serif text-gray-800
        ${isTuning ? 'opacity-50 pointer-events-none' : ''}
        transition-opacity duration-300
      `}>
        <ReactMarkdown
          components={{
            a: ({node, ...props}) => {
              if (props.href === 'evolution-highlight') {
                return (
                  <span className="bg-indigo-50/80 text-indigo-700 font-bold px-1.5 py-0.5 rounded-lg border-b-2 border-indigo-200/50 hover:bg-indigo-100 transition-colors inline-block my-0.5 shadow-sm">
                    {props.children}
                  </span>
                );
              }
              return <a {...props} />;
            }
          }}
        >
          {reportText}
        </ReactMarkdown>
      </div>

      <div className="mt-8 pt-4 border-t border-gray-100 flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
        <span>Mode Editor Quirúrgic Actiu</span>
        <span>Selecciona text per refinar el matís</span>
      </div>
    </div>
  );
};
