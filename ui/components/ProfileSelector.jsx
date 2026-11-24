
import React, { useState } from 'react';
import { Star, Hammer, Heart, ChevronRight, PlusCircle, FileJson, Users, ClipboardList, Zap, ArrowRight, UserPlus } from 'lucide-react';
import { getMockProfilesList } from '../../core/utils/mockFactory.js';
import { createStudent } from '../../core/domain/student.model.js';
import { parseStudentName } from '../../core/logic/nameParser.js';

export const ProfileSelector = ({ onSelect, onImportJSON, onBulkImport }) => {
  const [pastedNames, setPastedNames] = useState('');
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const profiles = getMockProfilesList();

  const handleSelect = (rawProfileData) => {
    const student = createStudent(rawProfileData);
    onSelect(student);
  };

  const handleCreateEmpty = () => {
    const student = createStudent({ name: "Alumne Nou", gender: "Masculí" });
    onSelect(student);
  };

  const handleBulkImport = () => {
    if (!pastedNames.trim()) return;
    const lines = pastedNames.split('\n').filter(line => line.trim().length > 0);
    const newStudents = lines.map(line => {
      const cleanedName = parseStudentName(line);
      return createStudent({ name: cleanedName });
    });
    if (onBulkImport) onBulkImport(newStudents);
    setPastedNames('');
    setShowBulkPaste(false);
  };

  return (
    <div className="space-y-10 w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div 
            className="group border-2 border-dashed border-warm-200 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer relative min-h-[180px] shadow-sm"
          >
              <input type="file" accept=".json" onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      try {
                        onImportJSON(JSON.parse(ev.target.result));
                      } catch(e) { alert("Format JSON invàlid."); }
                    };
                    reader.readAsText(file);
                  }
              }} className="absolute inset-0 opacity-0 cursor-pointer" />
              <div className="bg-white p-4 rounded-2xl shadow-md mb-4 group-hover:scale-110 transition-transform border border-warm-100">
                <FileJson className="w-8 h-8 text-indigo-600" />
              </div>
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Importar Sessió</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Arrossega el teu fitxer .json</p>
          </div>

          <div className="flex flex-col gap-4">
              <button onClick={handleCreateEmpty} className="flex items-center justify-between p-6 bg-white border border-warm-200 rounded-[2rem] hover:border-indigo-600 hover:shadow-xl hover:-translate-y-1 transition-all group shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100"><UserPlus className="w-5 h-5" /></div>
                  <div className="text-left">
                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Nou Alumne</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Crear fitxa individual</p>
                  </div>
                </div>
                <div className="bg-warm-50 p-2 rounded-full group-hover:bg-indigo-50 transition-colors">
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 transition-all" />
                </div>
              </button>
              
              <button onClick={() => setShowBulkPaste(true)} className="flex items-center justify-between p-6 bg-white border border-warm-200 rounded-[2rem] hover:border-emerald-600 hover:shadow-xl hover:-translate-y-1 transition-all group shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-100"><ClipboardList className="w-5 h-5" /></div>
                  <div className="text-left">
                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Importar Llista</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Copiar des d'Excel / Llistat</p>
                  </div>
                </div>
                <div className="bg-warm-50 p-2 rounded-full group-hover:bg-emerald-50 transition-colors">
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-600 transition-all" />
                </div>
              </button>
          </div>
      </div>

      {showBulkPaste && (
          <div className="animate-slide-up bg-slate-900 rounded-[3rem] p-8 text-white space-y-6 shadow-2xl relative overflow-hidden border border-slate-800">
              <div className="flex justify-between items-center relative z-10">
                <div className="flex items-center gap-3">
                    <ClipboardList className="w-5 h-5 text-emerald-400" />
                    <h4 className="text-[11px] font-black uppercase tracking-[0.3em]">Importació per lots</h4>
                </div>
                <button onClick={() => setShowBulkPaste(false)} className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest transition-colors">Cancel·lar</button>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">Enganxa els noms un per línia. El sistema detectarà automàticament el gènere i normalitzarà el format.</p>
              <textarea 
                value={pastedNames}
                onChange={(e) => setPastedNames(e.target.value)}
                placeholder="Garcia Perez, Juan&#10;Julia Soler&#10;Rius, Pau"
                className="w-full h-40 bg-slate-800/50 border-2 border-slate-700 rounded-[1.5rem] p-5 text-sm font-medium focus:border-emerald-500 outline-none transition-all no-scrollbar placeholder:text-slate-600"
              />
              <button 
                onClick={handleBulkImport} 
                disabled={!pastedNames.trim()}
                className="w-full py-5 bg-emerald-500 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-950/20 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
              >
                Processar Alumnes
              </button>
          </div>
      )}

      {!showBulkPaste && (
        <div className="space-y-6 pt-10 border-t border-warm-100">
            <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] flex items-center gap-3">
                <Star className="w-4 h-4 text-amber-400" /> Perfils de prova ràpids
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {profiles.map((profile) => (
                <button
                    key={profile.id}
                    onClick={() => handleSelect(profile.data)}
                    className="group p-6 rounded-[2rem] border border-warm-200 bg-white hover:border-indigo-600 hover:shadow-2xl transition-all text-left relative overflow-hidden shadow-sm"
                >
                    <div className={`w-10 h-10 rounded-xl mb-4 flex items-center justify-center transition-all group-hover:scale-110 ${
                        profile.id === 'profile_a' ? 'bg-emerald-50 text-emerald-600 shadow-emerald-50' : 
                        profile.id === 'profile_b' ? 'bg-amber-50 text-amber-600 shadow-amber-50' : 'bg-rose-50 text-rose-600 shadow-rose-50'
                    }`}>
                        {profile.id === 'profile_a' ? <Star className="w-5 h-5" /> : profile.id === 'profile_b' ? <Hammer className="w-5 h-5" /> : <Heart className="w-5 h-5" />}
                    </div>
                    <p className="text-[12px] font-black text-slate-900 leading-tight mb-1 uppercase tracking-tight">{profile.title}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{profile.data.studentName}</p>
                </button>
            ))}
            </div>
        </div>
      )}
    </div>
  );
};
