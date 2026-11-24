import React, { useState, useRef } from 'react';
import { Mic, MicOff, X, Save, Loader2 } from 'lucide-react';
import { transcribeAudio } from '../services/geminiService';

interface NuanceEditorProps {
  studentName: string;
  rubricLabel: string;
  initialValue: string[];
  onSave: (nuances: string[]) => void;
  onClose: () => void;
}

export const NuanceEditor: React.FC<NuanceEditorProps> = ({ 
  studentName, 
  rubricLabel, 
  initialValue, 
  onSave, 
  onClose 
}) => {
  const [nuances, setNuances] = useState<string[]>(Array.isArray(initialValue) ? initialValue : []);
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await handleTranscription(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("No s'ha pogut accedir al micròfon.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleTranscription = async (blob: Blob) => {
    setIsTranscribing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        const transcription = await transcribeAudio(base64Audio, 'audio/webm');
        if (transcription) {
          setInputText(prev => prev ? `${prev} ${transcription}` : transcription);
        }
      };
    } catch (err) {
      console.error("Transcription error:", err);
    } finally {
      setIsTranscribing(false);
    }
  };

  const addNuance = (text: string) => {
    if (text.trim() && !nuances.includes(text.trim())) {
      setNuances(prev => [...prev, text.trim()]);
    }
  };

  const removeNuance = (index: number) => {
    setNuances(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const finalNuances = [...nuances];
    if (inputText.trim() && !finalNuances.includes(inputText.trim())) {
      finalNuances.push(inputText.trim());
    }
    onSave(finalNuances);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-warm-200 overflow-hidden flex flex-col animate-slide-up max-h-[90vh]">
        <div className="bg-primary-900 p-6 text-white flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary-300 mb-1">Matisos Pedagògics</h3>
            <p className="font-bold text-lg leading-tight">{studentName}</p>
            <p className="text-[10px] font-medium opacity-70 uppercase tracking-widest mt-1">{rubricLabel}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
          {/* Llista de matisos seleccionats */}
          {nuances.length > 0 && (
            <div className="space-y-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Matisos seleccionats</p>
              <div className="space-y-2">
                {nuances.map((n, i) => (
                  <div key={i} className="flex items-start gap-3 bg-warm-50 p-4 rounded-2xl border border-warm-100 group">
                    <p className="text-[11px] text-slate-700 leading-relaxed font-medium flex-1 italic">"{n}"</p>
                    <button 
                      onClick={() => removeNuance(i)}
                      className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggeriments ràpids */}
          <div className="space-y-4">
            {rubricLabel === 'Comprensió Lectora' && (
              <div className="space-y-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Suggeriment ràpid</p>
                <button
                  onClick={() => addNuance("S'ha detectat una certa irregularitat en els resultats de les activitats de comprensió lectora; tot i que demostra capacitats per a una bona interpretació, encara li manca estabilitat per mantenir un nivell d'èxit constant en diferents contextos lectors.")}
                  className="w-full text-left p-3 bg-primary-50 border border-primary-100 rounded-2xl text-[10px] text-primary-900 font-medium hover:bg-primary-100 transition-colors leading-relaxed"
                >
                  "S'ha detectat una certa irregularitat en els resultats de les activitats de comprensió lectora..."
                </button>
              </div>
            )}

            {rubricLabel === 'Expressió Oral' && (
              <div className="space-y-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Suggeriment ràpid</p>
                <button
                  onClick={() => addNuance("Es detecten certes interferències lingüístiques que sovint es traslladen de l'oralitat a la producció escrita. Aquesta influència del castellà es manifesta especialment en l'ús de lèxic no normatiu, aspecte que anirà millorant a mesura que puguem enriquir el seu vocabulari en llengua catalana.")}
                  className="w-full text-left p-3 bg-primary-50 border border-primary-100 rounded-2xl text-[10px] text-primary-900 font-medium hover:bg-primary-100 transition-colors leading-relaxed"
                >
                  "Es detecten certes interferències lingüístiques que sovint es traslladen de l'oralitat..."
                </button>
              </div>
            )}

            {(rubricLabel === 'Expressió Escrita' || 
              rubricLabel === 'Coherència i Estructura' || 
              rubricLabel === 'Creativitat i Vocabulari' || 
              rubricLabel === 'Ortografia' || 
              rubricLabel === 'Presentació i Cal·ligrafia') && (
              <div className="space-y-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Suggeriments ràpids</p>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => addNuance("Tot i tenir bones idees i una estructura narrativa coherent, sovint oblida revisar el text final, cosa que fa que apareguin errades ortogràfiques que sabria resoldre per si mateix/a.")}
                    className="w-full text-left p-3 bg-primary-50 border border-primary-100 rounded-2xl text-[10px] text-primary-900 font-medium hover:bg-primary-100 transition-colors leading-relaxed"
                  >
                    "Tot i tenir bones idees, sovint oblida revisar el text final..."
                  </button>
                  <button
                    onClick={() => addNuance("La presentació i la cura en la lletra han millorat, però en moments de cansament o pressa, la llegibilitat del text se'n resenteix considerablement.")}
                    className="w-full text-left p-3 bg-primary-50 border border-primary-100 rounded-2xl text-[10px] text-primary-900 font-medium hover:bg-primary-100 transition-colors leading-relaxed"
                  >
                    "La presentació ha millorat, però la llegibilitat se'n resenteix amb la pressa..."
                  </button>
                </div>
              </div>
            )}

            {(rubricLabel === 'Treball Cooperatiu' || 
              rubricLabel === 'Integració i convivència a l’aula' || 
              rubricLabel === 'Participació i comunicació' ||
              rubricLabel.includes('Treball Col·laboratiu') ||
              rubricLabel.toLowerCase().includes('cooperatiu') ||
              rubricLabel.toLowerCase().includes('col·laboratiu') ||
              rubricLabel.toLowerCase().includes('convivència') ||
              rubricLabel.toLowerCase().includes('participació') ||
              rubricLabel.toLowerCase().includes('comunicació')) && (
              <div className="space-y-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Suggeriments ràpids</p>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => addNuance("Es troba còmode en el treball en grup, però tendeix a deixar que siguin els altres qui prenguin les decisions importants o assumeixin el pes de la feina.")}
                    className="w-full text-left p-3 bg-primary-50 border border-primary-100 rounded-2xl text-[10px] text-primary-900 font-medium hover:bg-primary-100 transition-colors leading-relaxed"
                  >
                    "Es troba còmode en el treball en grup, però tendeix a deixar que els altres assumeixin el pes..."
                  </button>
                  <button
                    onClick={() => addNuance("Té una gran capacitat d'iniciativa en els treballs de grup, però ha d'aprendre a escoltar més les propostes dels companys i no imposar sempre el seu criteri.")}
                    className="w-full text-left p-3 bg-primary-50 border border-primary-100 rounded-2xl text-[10px] text-primary-900 font-medium hover:bg-primary-100 transition-colors leading-relaxed"
                  >
                    "Té iniciativa, però ha d'aprendre a escoltar més les propostes dels companys..."
                  </button>
                </div>
              </div>
            )}

            {(rubricLabel.toUpperCase().includes('ORGANITZA') || 
              rubricLabel.toUpperCase().includes('IMPLICA') || 
              rubricLabel.toLowerCase().includes('organitzo') || 
              rubricLabel.toLowerCase().includes('implico')) && (
              <div className="space-y-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Suggeriments ràpids (Actitud i Esforç)</p>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => addNuance("Durant les sessions de Planeta Blau ha mantingut una actitud sovint passiva, participant de manera molt discreta i requerint estímuls continus per involucrar-se en les propostes de l'equip.")}
                    className="w-full text-left p-3 bg-amber-50 border border-amber-100 rounded-2xl text-[10px] text-amber-900 font-medium hover:bg-amber-100 transition-colors leading-relaxed"
                  >
                    "Actitud pasiva / Participació discreta que requereix estímuls continus..."
                  </button>
                  <button
                    onClick={() => addNuance("En l'apartat d'esforç i dedicació, ha mostrat una implicació bastant justa i irregular, costant-li mantenir la constància necessària davant de les dificultats que han sorgit durant els experiments.")}
                    className="w-full text-left p-3 bg-amber-50 border border-amber-100 rounded-2xl text-[10px] text-amber-900 font-medium hover:bg-amber-100 transition-colors leading-relaxed"
                  >
                    "Esforç escàs / Implicació justa i irregular davant les dificultats..."
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Suggeriment General</p>
              <button
                onClick={() => addNuance("Seria recomanable reforçar la pràctica a casa de manera regular per tal de guanyar agilitat i confiança.")}
                className="w-full text-left p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] text-slate-600 font-medium hover:bg-slate-100 transition-colors leading-relaxed"
              >
                "Seria recomanable reforçar la pràctica a casa de manera regular..."
              </button>
            </div>

            {(rubricLabel === 'Adaptació a les rutines i funcionament de 4t' || 
              rubricLabel === 'Ritme de treball' ||
              rubricLabel.toLowerCase().includes('rutines') || 
              rubricLabel.toLowerCase().includes('ritme')) && (
              <div className="space-y-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Suggeriments ràpids</p>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => addNuance("Cal que guanyi una mica d'agilitat i fluïdesa en el ritme de treball diari.")}
                    className="w-full text-left p-3 bg-primary-50 border border-primary-100 rounded-2xl text-[10px] text-primary-900 font-medium hover:bg-primary-100 transition-colors leading-relaxed"
                  >
                    "Cal que guanyi una mica d'agilitat i fluïdesa en el ritme de treball diari."
                  </button>
                </div>
              </div>
            )}

            {(rubricLabel === 'Consolidació de les taules' || rubricLabel === 'Divisions') && (
              <div className="space-y-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Suggeriments ràpids</p>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => addNuance("Tot i conèixer el mecanisme de l'operació, es mostra irregular i poc segur/a en l'execució, fet que provoca errors freqüents. Cal guanyar confiança i atenció per consolidar el procés.")}
                    className="w-full text-left p-3 bg-amber-50 border border-amber-100 rounded-2xl text-[10px] text-amber-900 font-medium hover:bg-amber-100 transition-colors leading-relaxed"
                  >
                    "Tot i conèixer el mecanisme, es mostra irregular i poc segur/a..."
                  </button>
                  <button
                    onClick={() => addNuance("L'execució de les operacions és encara una mica lenta i denota falta de seguretat. Per tal de guanyar agilitat i confiança, seria molt recomanable reforçar la pràctica a casa de manera regular.")}
                    className="w-full text-left p-3 bg-blue-50 border border-blue-100 rounded-2xl text-[10px] text-blue-900 font-medium hover:bg-blue-100 transition-colors leading-relaxed"
                  >
                    "L'execució és encara una mica lenta i denota falta de seguretat..."
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Nota personal o dictat</p>
            <div className="relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Escriu o grava un matís personalitzat..."
                className="w-full h-32 p-6 bg-warm-50 border-2 border-warm-100 rounded-3xl focus:border-primary-900 focus:bg-white outline-none transition-all text-sm font-medium leading-relaxed resize-none custom-scrollbar"
              />
              {isTranscribing && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-3xl">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-900" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary-900">Transcrivint àudio...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-8 bg-warm-50 border-t border-warm-200 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95 ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-slate-600 border border-warm-200 hover:bg-warm-100'}`}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              {isRecording ? 'Aturar' : 'Gravar'}
            </button>

            <button
              onClick={handleSave}
              className="flex-[2] flex items-center justify-center gap-3 py-4 bg-primary-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95"
            >
              <Save className="w-4 h-4 text-primary-300" />
              Guardar tots els matisos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
