/**
 * Utilitats de concordança, normalització i protecció de rúbriques.
 * Garanteix que les rúbriques emplenades NO es tornin a buidar per clics accidentals
 * ni per petites variacions de redactat ({nom}, pronoms, cometes, etiquetes històriques).
 */

/**
 * Normalitza un text de tag eliminant cometes tipogràfiques, espais redundants,
 * etiquetes de diagnòstic entre parèntesis i variables d'interpolació.
 */
export const normalizeTagText = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text
    // Elimina etiquetes diagnòstiques entre parèntesis ex: "(Realisme Metacognitiu):", "(Sobreestimació):"
    .replace(/^\s*\([^\)]+\)\s*:?\s*/gi, '')
    .replace(/\s*\((?:realisme|metacognitiu|sobreestimaci[oó]|infravaloraci[oó]|desconnexi[oó]|irrealisme)[^\)]*\)\s*:?\s*/gi, ' ')
    // Normalitza variables com {nom}, {nom_final}, {ajudar_pronom}
    .replace(/\{nom\}|\{nom_final\}/gi, '')
    .replace(/\{ajudar_pronom\}|ajudar-la\/lo|ajudar-lo\/la|ajudar-la|ajudar-lo/gi, '')
    // Normalitza inicis alternatius històrics de Planeta Blau
    .replace(/^(durant les investigacions|a l’hora d’investigar|a l'hora d'investigar),?\s*/gi, '')
    .replace(/amb alguns recordatoris|amb algunes indicacions/gi, '')
    .replace(/sap explicar|sap exposar/gi, '')
    // Normalitza la frase d'autoavaluació sense la clàusula de propers reptes
    .replace(/,?\s*(?:i\s*)?identifica(?:nt)? amb realisme els seus propers reptes/gi, '')
    // Normalitza cometes i apòstrofs
    .replace(/[‘’`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
};

/**
 * Comprova si una opció de rúbrica està seleccionada dins d'un conjunt de tags.
 * Suporta:
 * 1. Coincidència directa.
 * 2. Coincidència amb el nom de l'alumne substituït (nom complet o de pila).
 * 3. Coincidència semàntica normalitzada (tolerant a canvis de redactat anteriors).
 */
export const isOptionSelected = (tagList, optionText, studentName = '') => {
  if (!Array.isArray(tagList) || tagList.length === 0 || !optionText) return false;

  // 1. Coincidència exacta directa
  if (tagList.includes(optionText)) return true;

  // 2. Coincidència amb interpolació de nom
  if (studentName) {
    const cleanName = String(studentName).replace(/\s*[\(\[]?[1-6](?:º|t|rt|è|r|n)?\s*[A-Za-z]?[\)\]]?$/i, '').trim();
    const firstName = cleanName.replace(/^(?:(?:en|na|el|la)\s+|l['’]\s*)/i, '').split(/\s+/)[0] || cleanName;

    const subFullName = optionText.replace(/\{nom\}/g, cleanName);
    if (tagList.includes(subFullName)) return true;

    const subFirstName = optionText.replace(/\{nom\}/g, firstName);
    if (tagList.includes(subFirstName)) return true;
  }

  // Compatibilitat amb textos històrics d'organitzo (nivell 1 i 2 anteriors)
  if (optionText.includes("presenta dificultats notables per organitzar la feina")) {
    if (tagList.some(t => t.includes("necessita recordatoris freqüents per consultar les consignes") || t.includes("recordatoris freqüents"))) return true;
  }
  if (optionText.includes("s'organitza amb un acompanyament freqüent")) {
    if (tagList.some(t => t.includes("en el treball diari, consulta les consignes") || t.includes("amb algunes indicacions"))) return true;
  }

  // 3. Coincidència normalitzada estricta i per solapament de paraules clau
  const normOption = normalizeTagText(optionText);
  if (normOption.length < 12) {
    return tagList.some(t => normalizeTagText(t) === normOption);
  }

  return tagList.some(tag => {
    const normTag = normalizeTagText(tag);
    if (normTag === normOption) return true;

    // Comprovació de paraules clau comunes (mínim 88% de solapament i 82% de proporció de mida)
    // per evitar falsos positius i solapaments entre nivells veïns (ex: nivell 3 i 4 de Planeta Blau)
    const wordsTag = new Set(normTag.split(/\s+/).filter(w => w.length > 3));
    const wordsOption = new Set(normOption.split(/\s+/).filter(w => w.length > 3));
    
    if (wordsTag.size > 0 && wordsOption.size > 0) {
      let common = 0;
      for (const w of wordsTag) {
        if (wordsOption.has(w)) common++;
      }
      const minLen = Math.min(wordsTag.size, wordsOption.size);
      const maxLen = Math.max(wordsTag.size, wordsOption.size);
      if (minLen > 0 && (common / minLen) >= 0.88 && (minLen / maxLen) >= 0.82) {
        return true;
      }
    }
    return false;
  });
};

/**
 * Troba quina opció de la fila de la rúbrica està seleccionada actualment als tags de l'estudiant.
 */
export const getSelectedRowOption = (tagList, rowOptions, studentName = '') => {
  if (!Array.isArray(tagList) || !Array.isArray(rowOptions)) return null;
  for (const opt of rowOptions) {
    if (isOptionSelected(tagList, opt, studentName)) {
      return opt;
    }
  }
  return null;
};

/**
 * BLINDATGE CONTRA EL BUIDAT DE RÚBRIQUES:
 * 
 * Un cop una fila de la rúbrica té una valoració assignada (nivell 1, 2, 3, 4 o SE):
 * - Si es clica la mateixa opció que ja estava seleccionada, NO es buida! Es manté intacta.
 * - Si es clica una altra opció de la mateixa fila, es reemplaça netament l'anterior per la nova.
 * - Garanteix que cap fila emplenada es quedi buida per clics accidentals.
 * 
 * @param {string[]} currentTags - Llista actual de tags de l'alumne
 * @param {object} row - Fila de la rúbrica ({ id, options, senseEvidencies })
 * @param {string} targetOptionText - Text de l'opció que s'ha clicat (o seTag)
 * @param {string} studentName - Nom de l'alumne per a comparació
 * @param {boolean} isSenseEvidencies - Indica si es vol marcar 'Sense evidències'
 * @returns {string[]} Nova llista de tags protegida
 */
export const updateRowSelectionSafely = (currentTags = [], row, targetOptionText, studentName = '', isSenseEvidencies = false) => {
  const tags = Array.isArray(currentTags) ? [...currentTags] : [];
  if (!row || !row.options) return tags;

  const rowOptions = row.options || [];
  const seTag = `pb_${row.id}_sense_evidencies`;

  if (isSenseEvidencies) {
    // Si ja està marcat com a Sense Evidències, fer clic el desmarca (toggle)
    if (tags.includes(seTag)) {
      return tags.filter(t => t !== seTag);
    }
    // Netegem qualsevol nivell 1-4 previ d'aquesta fila i establim SE
    const filtered = tags.filter(t => !rowOptions.some(ro => isOptionSelected([t], ro, studentName)) && t !== seTag);
    filtered.push(seTag);
    return filtered;
  }

  // Comprovem si aquest nivell ja està actiu
  const isAlreadyActive = isOptionSelected(tags, targetOptionText, studentName);
  
  // Netegem qualsevol tag de Sense Evidències d'aquesta fila
  let filtered = tags.filter(t => t !== seTag);

  // Trobem quines opcions d'aquesta fila estan actualment seleccionades
  const currentlySelectedInRow = rowOptions.filter(ro => isOptionSelected(filtered, ro, studentName));

  if (isAlreadyActive) {
    // DESMARCAR: Si ja estava seleccionada, fer clic la desmarca (toggle)
    return filtered.filter(t => !isOptionSelected([t], targetOptionText, studentName));
  } else {
    // MARCAR / AFEGIR PER A TRANSICIÓ (màxim 2 nivells simultanis)
    let nextTags = filtered.filter(t => !isOptionSelected([t], targetOptionText, studentName));
    
    // Si ja hi ha 2 opcions seleccionades en aquesta fila, eliminem la més antiga (la primera) per mantenir màxim 2 (transició)
    if (currentlySelectedInRow.length >= 2) {
      const oldestOpt = currentlySelectedInRow[0];
      nextTags = nextTags.filter(t => !isOptionSelected([t], oldestOpt, studentName));
    }

    nextTags.push(targetOptionText);
    return nextTags;
  }
};

/**
 * Auto-curació i sanejament dels tags d'un estudiant.
 * Normalitza tags amb redaccions antigues o amb noms incrustats cap al format canònic de la rúbrica.
 */
export const healStudentTags = (tags = [], rubrics = [], studentName = '') => {
  if (!Array.isArray(tags) || tags.length === 0) return [];
  const options = [...new Set(rubrics.flatMap(rubric => (rubric.data || []).flatMap(row => row.options || [])))];
  const canonical = new Set(options);
  const healed = [];

  for (const tag of tags) {
    // Comprova si és un tag de Sense Evidències
    if (tag.startsWith('pb_') && tag.endsWith('_sense_evidencies')) {
      healed.push(tag);
      continue;
    }

    if (canonical.has(tag)) {
      healed.push(tag);
      continue;
    }
    const matches = options.filter(option => isOptionSelected([tag], option, studentName));
    // Una etiqueta amb més d'una correspondència conserva el text original.
    healed.push(matches.length === 1 ? matches[0] : tag);
  }

  return [...new Set(healed)];
};
