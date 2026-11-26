import { reportFingerprint } from './reportFingerprint.js';

import { calculatePromptConfig } from '../../core/logic/toneMatrix.js';
import { buildReportPrompt } from '../../infrastructure/api/promptBuilder.js';
import { callGeminiAPI } from '../../infrastructure/api/geminiClient.js';
import { db } from '../../infrastructure/storage/db';
import { MAKER_SYSTEM_INSTRUCTION, SYSTEM_INSTRUCTION, PLANETA_BLAU_SYSTEM_INSTRUCTION } from '../../constants';
import { getRubricsForTrimester } from '../../core/config/rubrics/index.js';
import { buildPlanetaBlauReport } from './buildPlanetaBlauReport.js';

/**
 * Cas d'ús: Generar Informe d'Alumne
 * Coordina el flux des de la configuració de la UI fins a la recepció del text de l'IA.
 */
export const executeGenerateReport = async (student, configUI, trimester = 2) => {
  try {
    const rubrics = getRubricsForTrimester(trimester);

    // 1. Calcular la configuració de prompt (paràmetres tècnics)
    const { systemInstruction: toneInstruction, temperature, topP } = calculatePromptConfig(
      configUI.styleLevel, 
      configUI.intensityLevel
    );

    // --- SISTEMA DE HUELLA / CACHÉ ---
    // Historial trimestral que influeix directament en la redacció de l'informe
    const currentFingerprint = reportFingerprint(student, configUI, trimester);

    // Si ja existeix un informe i la huella coincideix, retornem el que ja tenim (tret que es forci la regeneració)
    if (!configUI?.forceRegenerate && student.state?.generatedReport && student.state?.reportFingerprint === currentFingerprint) {
      console.log("♻️ Reutilitzant informe existent per huella idèntica.");
      return { text: student.state.generatedReport, fingerprint: currentFingerprint, reused: true };
    }
    // ---------------------------------

    // 2. Construir el prompt de contingut
    const promptText = buildReportPrompt(student, toneInstruction, rubrics, trimester);

    // 3. Triar la System Instruction base segons el mode
    const isPureMaker = promptText.includes("### ROL: FACILITADOR/A DE L'ESPAI MAKER (STEAM) - ESPECIALISTA");
    const isPurePlanetaBlau = promptText.includes("### ROL: FACILITADOR/A DE L'ESPAI PLANETA BLAU - ESPECIALISTA");
    
    // Planeta Blau genera el relat per a les famílies localment.
    let generatedText = "";
    if (isPurePlanetaBlau) {
      generatedText = buildPlanetaBlauReport(student);
    } else {
      const finalSystemInstruction = isPureMaker 
        ? MAKER_SYSTEM_INSTRUCTION 
        : SYSTEM_INSTRUCTION;

      generatedText = await callGeminiAPI(promptText, {
        systemInstruction: finalSystemInstruction,
        temperature,
        topP
      });
    }

    // 4b. Determinisme PI: Si l'alumne té marcat Pla Individual (PI), incorporem
    // la clàusula legal obligatòria de forma determinista en codi local, sense dependre
    // de l'al·lucinació de la IA ni enviar dades sensibles de salut/necessitats especials al model.
    const piClause = "Aquesta avaluació s'ha realitzat d'acord amb els criteris i les adaptacions recollides al seu Pla Individual (PI).";
    if (student.info?.isPI && !generatedText.includes(piClause)) {
      generatedText = `${generatedText.trim()}\n\n${piClause}`;
    }

    // 5. Persistir el resultat a la base de dades local
    if (student.id) {
      try {
        // Obtenim objecte complet per mantenir la integritat del mapa de trimestres si cal
        const s = await db.students.get(student.id);
        if (s) {
            const trimesters = s.trimesters || {};
            if (!trimesters[trimester]) trimesters[trimester] = { content: {}, state: {} };
            
            trimesters[trimester].state = {
                ...trimesters[trimester].state,
                status: 'completed',
                generatedReport: generatedText,
                reportFingerprint: currentFingerprint,
                lastModified: new Date().toISOString()
            };

            await db.students.put({ ...s, trimesters });
        }
      } catch (dbErr) {
        console.warn("No s'ha pogut guardar a la DB, però l'informe s'ha generat:", dbErr);
      }
    }

    return { text: generatedText, fingerprint: currentFingerprint, reused: false };

  } catch (error) {
    console.error("Error en el cas d'ús GenerateStudentReport:", error);
    throw error;
  }
};
