
import { predictGender } from '../../constants';
import { normalizeSavedReportVocabulary } from '../utils/reportVocabulary.js';

/**
 * Factory function para crear una entidad de Estudiante.
 * DISEÑADA PARA LA SINCRONIZACIÓN TOTAL: Consolida todos los tags en un único punto.
 * Maneja múltiples nomenclaturas para asegurar compatibilidad con backups antiguos y nuevos.
 */
export const createStudent = (raw = {}, trimesterId = 2) => {
  const id = raw.id || 
    (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `st-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`);

  let processedName = raw.info?.name || raw.name || raw.studentName || raw.fullName || "Alumne sense nom";
  if (typeof processedName === 'string' && processedName.includes(',') && !raw.isEditing) {
    const parts = processedName.split(',').map(p => p.trim());
    if (parts.length >= 2) processedName = `${parts[1]} ${parts[0]}`;
  }

  // PRIORIDAD ABSOLUTA AL DATO EXPLÍCITO SOBRE LA PREDICCIÓN
  const info = {
    name: String(processedName),
    gender: raw.info?.gender || raw.gender || predictGender(String(processedName)),
    isPI: raw.info?.isPI ?? raw.hasIndividualPlan ?? raw.isPI ?? false,
    nickname: raw.info?.nickname || raw.nickname || "",
    groupId: raw.info?.groupId || raw.groupId || 'G1',
    course: raw.info?.course || raw.course || "",
    order: raw.info?.order ?? raw.order ?? Date.now(),
    photoUrl: raw.info?.photoUrl ?? raw.photoUrl ?? "",
    photoCrop: raw.info?.photoCrop,
    supportRole: raw.info?.supportRole
  };

  const metrics = {
    readingSpeed: Number(raw.metrics?.readingSpeed || raw.readingSpeed || raw.content?.reading?.wpm || 0),
    comprehensionDecatype: Number(raw.metrics?.comprehensionDecatype || raw.comprehension || 0),
    readingErrors: String(raw.metrics?.readingErrors || raw.readingErrors || raw.content?.reading?.errors || ""),
    readingCompText: String(raw.metrics?.readingCompText || raw.readingCompText || raw.content?.reading?.comp || ""),
    readingDate: String(raw.metrics?.readingDate || raw.readingDate || raw.content?.reading?.date || ""),
    readingLevelTag: String(raw.metrics?.readingLevelTag || raw.content?.reading?.levelTag || "")
  };

  // El sistema agora gestiona un mapa de trimesters: { 1: {content, state}, 2: ... }
  const trimesters = { ...raw.trimesters };

  // MIGRACIÓ DE DADES LLEGACY
  // Si no hi ha mapa de trimesters però si dades a l'arrel, les preservem al trimestre actual i al T2
  if (Object.keys(trimesters).length === 0 && (raw.content || raw.state || raw.selectedObservations)) {
    const legacyTags = [
      ...(Array.isArray(raw.content?.tags) ? raw.content.tags : []),
      ...(Array.isArray(raw.selectedObservations) ? raw.selectedObservations : []),
      ...(Array.isArray(raw.content?.maker?.tags) ? raw.content.maker.tags : []),
      ...(Array.isArray(raw.makerTags) ? raw.makerTags : [])
    ];
    
    const legacyPayload = {
      content: {
        ...raw.content,
        manualObservations: Array.isArray(raw.content?.manualObservations) 
          ? [...raw.content.manualObservations] 
          : (Array.isArray(raw.observations) ? [...raw.observations] : (typeof raw.observations === 'string' ? [raw.observations] : [])),
        tags: [...new Set(legacyTags)],
        nuances: raw.content?.nuances || raw.nuances || {},
        anecdote: raw.content?.anecdote ?? raw.anecdote ?? "",
        selfAssessment: raw.content?.selfAssessment ?? raw.selfAssessment ?? "",
        recommendations: Array.isArray(raw.content?.recommendations)
          ? [...raw.content.recommendations]
          : (Array.isArray(raw.recommendations) ? [...raw.recommendations] : []),
        aiSuggestions: Array.isArray(raw.content?.aiSuggestions) ? [...raw.content.aiSuggestions] : [],
        suggestedEvolutions: raw.content?.suggestedEvolutions ?? raw.suggestedEvolutions ?? null,
        evolutionPhrases: Array.isArray(raw.content?.evolutionPhrases) 
          ? [...raw.content.evolutionPhrases] 
          : (Array.isArray(raw.evolutionPhrases) ? [...raw.evolutionPhrases] : []),
        maker: { narrative: raw.content?.maker?.narrative || raw.makerNarrative || "" },
        planetaBlau: { narrative: raw.content?.planetaBlau?.narrative || raw.planetaBlauNarrative || "" },
        conference: raw.content?.conference || null,
        reading: raw.content?.reading || null,
        mathRegister: raw.content?.mathRegister || null
      },
      state: {
        status: raw.state?.status || raw.status || (raw.generatedReport || raw.state?.generatedReport ? 'completed' : 'idle'),
        generatedReport: raw.state?.generatedReport || raw.generatedReport || null,
        reportFingerprint: raw.state?.reportFingerprint || raw.reportFingerprint || null,
        lastModified: raw.state?.lastModified || raw.lastModified || new Date().toISOString()
      }
    };

    trimesters[trimesterId] = JSON.parse(JSON.stringify(legacyPayload));
    if (trimesterId !== 2) {
      trimesters[2] = JSON.parse(JSON.stringify(legacyPayload));
    }
  }

  // Dades per al trimestre seleccionat
  const savedTrimester = trimesters[trimesterId];
  const trimesterData = savedTrimester ? {
    ...savedTrimester,
    content: { ...savedTrimester.content },
    state: { ...savedTrimester.state },
  } : {
    content: {
      manualObservations: [],
      tags: [],
      nuances: {},
      anecdote: "",
      selfAssessment: "",
      recommendations: [],
      aiSuggestions: [],
      suggestedEvolutions: null,
      evolutionPhrases: [],
      maker: { narrative: "" },
      planetaBlau: { narrative: "" },
      conference: null,
      reading: null,
      mathRegister: null
    },
    state: {
      status: 'idle',
      generatedReport: null,
      reportFingerprint: null,
      lastModified: new Date().toISOString()
    }
  };

  // BLINDATGE ANTI-BUIDAT: Si aquest trimestre no té tags però l'alumne ja en tenia a l'arrel
  // o en un altre trimestre de referència, mai buidem les rúbriques a zero!
  if (!savedTrimester) {
    if (Array.isArray(raw.content?.tags) && raw.content.tags.length > 0) {
      trimesterData.content.tags = [...raw.content.tags];
    } else {
      for (const t of [2, 1, 3]) {
        if (trimesters[t]?.content?.tags?.length > 0) {
          trimesterData.content.tags = [...trimesters[t].content.tags];
          if (Object.keys(trimesters[t].content?.nuances || {}).length > 0 && Object.keys(trimesterData.content.nuances || {}).length === 0) {
            trimesterData.content.nuances = { ...trimesters[t].content.nuances };
          }
          break;
        }
      }
    }
  }

  // VITAL: Només apliquem el contingut d'arrel si ve d'una actualització UI (raw._isUpdate === true)
  // o si és un alumne nou / migració (no té mapa de trimestres encara).
  // Evitem que la "projecció" guardada a la DB infecti altres trimestres en carregar.
  if (raw._isUpdate || Object.keys(trimesters).length === 0) {
    if (raw.content) trimesterData.content = { ...trimesterData.content, ...raw.content };
    if (raw.evolutionPhrases && (!trimesterData.content.evolutionPhrases || trimesterData.content.evolutionPhrases.length === 0)) {
      trimesterData.content.evolutionPhrases = Array.isArray(raw.evolutionPhrases) ? [...raw.evolutionPhrases] : [];
    }
    if (raw.suggestedEvolutions && !trimesterData.content.suggestedEvolutions) {
      trimesterData.content.suggestedEvolutions = raw.suggestedEvolutions;
    }
    if (raw.state) {
      trimesterData.state = { ...trimesterData.state, ...raw.state };
      if (raw.state.reportFingerprint !== undefined) {
        trimesterData.state.reportFingerprint = raw.state.reportFingerprint;
      }
    }
  }

  trimesters[trimesterId] = trimesterData;

  return Object.freeze(normalizeSavedReportVocabulary({
    id,
    groupId: info.groupId, 
    info,
    metrics,
    trimesters,
    // Projeccions (NO es guarden com a font de veritat si l'app és neta, però es fan servir per compatibilitat)
    content: trimesterData.content,
    state: trimesterData.state
  }));
};
