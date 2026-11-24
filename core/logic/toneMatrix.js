
/**
 * Mapeig de nivells d'intensitat a instruccions de redactat per a l'IA.
 * Nivells de -3 a +3.
 */
const INTENSITY_GUIDELINES = {
  '-3': "Llenguatge extremadament prudent, observacional i gairebé clínic. Evita qualsevol adjectiu contundent. Utilitza eufemismes protectors.",
  '-2': "To suau i ple de matisos. Minimitza l'impacte de les dificultats destacant sempre la intenció per sobre del resultat.",
  '-1': "Llenguatge subtil i educat. Utilitza connectors de suavitzat com 'En ocasions es mostra...' o 'Tendeix a...'.",
  '0':  "To neutre i equilibrat. Descripció pedagògica estàndard i objectiva.",
  '1':  "Llenguatge clar i directe. Descriu la realitat de l'aula de manera professional pero sense filtres innecessaris.",
  '2':  "To contundent i explícit. Adjectivació rica i precisa que no deixa espai a la interpretació ambigua sobre el rendiment.",
  '3':  "Llenguatge d'alt impacte, decidit i amb gran certesa. Descriu els èxits i reptes amb màxima precisió i realisme."
};

/**
 * Calcula la configuració del Prompt basant-se en els sliders de la UI.
 */
export const calculatePromptConfig = (styleLevel = 0.5, intensityLevel = 0) => {
  const intensityKey = Math.round(intensityLevel).toString();
  const intensityInstruction = INTENSITY_GUIDELINES[intensityKey] || INTENSITY_GUIDELINES['0'];

  // Temperature puja amb l'estil inspirador per permetre més riquesa de vocabulari
  const temperature = 0.2 + (styleLevel * 0.6); 
  const topP = 0.85 + (styleLevel * 0.1);

  const styleInstruction = styleLevel > 0.7 
    ? "Utilitza un estil narratiu evocador, ric en metàfores pedagògiques i visió de futur."
    : styleLevel < 0.3 
      ? "Utilitza terminologia tècnica, frases curtes i una estructura de dades acadèmica molt neta."
      : "Utilitza un estil narratiu equilibrat, clar i professional.";

  return {
    systemInstruction: `${intensityInstruction} ${styleInstruction}`,
    temperature,
    topP,
    seed: 42
  };
};
