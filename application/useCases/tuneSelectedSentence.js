
import { calculatePromptConfig } from '../../core/logic/toneMatrix.js';
import { callGeminiAPI } from '../../infrastructure/api/geminiClient.js';

/**
 * Cas d'ús: Ajustar Frase Seleccionada
 * Permet a l'usuari canviar la intensitat d'un fragment específic de l'informe.
 * 
 * @param {string} originalSentence - La frase que es vol editar.
 * @param {Object} contextStudent - Context mínim de l'alumne { name, gender }.
 * @param {number} newIntensityLevel - El nou nivell d'intensitat (-3 a +3).
 * @returns {Promise<string>} La frase reescrita per l'IA.
 */
export const executeTuneSentence = async (originalSentence, contextStudent, newIntensityLevel) => {
  try {
    // 1. Obtenir les directrius de to per a la nova intensitat
    const { systemInstruction } = calculatePromptConfig(0.5, newIntensityLevel);

    // 2. Construir un mini-prompt específic per a l'edició quirúrgica
    const prompt = `
Context de l'alumne: ${contextStudent.name} (${contextStudent.gender}).
Reescriu la següent frase d'un informe escolar: "${originalSentence}".
Aplica aquest to: ${systemInstruction}.

REQUISITS:
- Manté el sentit pedagògic original.
- Ajusta la contundència i precisió dels adjectius segons el to indicat.
- Retorna NOMÉS la frase editada, sense cometes ni explicacions.
`.trim();

    // 3. Cridar a l'API amb una temperatura baixa per garantir precisió en l'edició
    const tunedSentence = await callGeminiAPI(prompt, {
      systemInstruction: "Ets un editor de textos pedagògics expert en matisos lingüístics.",
      temperature: 0.3,
      topP: 0.8
    });

    return tunedSentence.trim();

  } catch (error) {
    console.error("Error en el cas d'ús TuneSelectedSentence:", error);
    throw new Error("No s'ha pogut reescriure la frase. Si us plau, revisa la connexió.");
  }
};
