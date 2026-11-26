export function reportFingerprint(student, configUI, trimester) {
  const content = student.content || {};
  const previousTrimestersHistory = student.trimesters && trimester > 1
    ? Object.keys(student.trimesters)
        .map(Number)
        .filter(t => t < trimester)
        .sort((a, b) => a - b)
        .map(t => {
          const data = student.trimesters[t];
          return {
            t,
            tags: data?.content?.tags || [],
            report: data?.state?.generatedReport ? data.state.generatedReport.substring(0, 300) : ""
          };
        })
    : [];

  // Generem una huella digital completa de totes les dades d'entrada rellevants
  return JSON.stringify({
    rulesVersion: REPORT_WRITING_RULES_VERSION,
    mathRegister: content.mathRegister || student.trimesters?.[trimester]?.content?.mathRegister || null,
    tags: content.tags || [],
    nuances: content.nuances || {},
    maker: content.maker || {},
    planetaBlau: content.planetaBlau || {},
    planetaBlauLevels: content.planetaBlauLevels,
    customPhrases: content.customPhrases,
    anecdote: content.anecdote || "",
    selfAssessment: content.selfAssessment || "",
    recommendations: content.recommendations || [],
    manualObservations: content.manualObservations || [],
    evolutionPhrases: content.evolutionPhrases || [],
    config: configUI || {},
    trimester: trimester,
    studentInfo: { 
      name: student.info?.name, 
      gender: student.info?.gender,
      isPI: student.info?.isPI ?? false
    },
    history: previousTrimestersHistory
  });
}

export function isReportOutdated(student, trimester) {
  const stored = student.state?.reportFingerprint;
  if (!stored || !student.state?.generatedReport) return false;
  try {
    const previous = JSON.parse(stored);
    return reportFingerprint(student, previous.config, trimester) !== stored;
  } catch {
    return false;
  }
}
import { REPORT_WRITING_RULES_VERSION } from '../../core/config/reportWritingRules.js';

