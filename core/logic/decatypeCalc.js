/**
 * Processa la velocitat lectora per retornar una etiqueta i una frase narrativa.
 * 
 * @param {number} wpm - Paraules per minut.
 * @returns {Object} { tag, level }
 */
export const calculateReadingLevel = (wpm) => {
  if (wpm < 70) return { tag: 'Novell', level: 1 };
  if (wpm < 90) return { tag: 'Novell', level: 2 };
  if (wpm < 110) return { tag: 'Aprenent', level: 3 };
  if (wpm < 130) return { tag: 'Avançat', level: 4 }; // Notable
  if (wpm <= 145) return { tag: 'Avançat', level: 5 }; // Fluid
  return { tag: 'Expert', level: 6 };
};

/**
 * Retorna la descripció qualitativa i madurativa de la velocitat lectora
 * segons la rúbrica consensuada (evitant citar números exactes de paraules per minut).
 */
export const getQualitativeReadingDescription = (wpm) => {
  if (!wpm || isNaN(wpm)) return "pendent de valoració";
  if (wpm < 70) return "velocitat baixa (clarament per sota de la mitjana madurativa esperada per al curs)";
  if (wpm < 90) return "velocitat un xic per sota de la mitjana madurativa esperada";
  if (wpm < 110) return "velocitat adequada / dins de la mitjana madurativa esperada";
  if (wpm < 130) return "velocitat bona / un xic per damunt del nivell maduratiu";
  if (wpm <= 145) return "velocitat alta / fluïda i consolidada";
  return "velocitat molt alta / expert (excel·lent domini de la fluïdesa lectora)";
};

/**
 * Tradueix un decatipus de comprensió lectora a una categoria pedagògica.
 * 
 * @param {number} decatype - Valor de 1 a 10.
 * @returns {Object} { tag, label }
 */
export const calculateComprehensionLevel = (decatype) => {
  const score = Math.max(1, Math.min(10, Math.round(decatype)));
  
  if (score <= 2) return { tag: 'Novell', label: 'Molt Baix' };
  if (score === 3) return { tag: 'Aprenent', label: 'Baix' };
  if (score <= 6) return { tag: 'Normal', label: 'Mitjà' };
  if (score <= 8) return { tag: 'Avançat', label: 'Alt' };
  if (score === 9) return { tag: 'Expert', label: 'Molt Alt' };
  return { tag: 'Expert', label: 'Excel·lent' };
};

/**
 * Utility per trobar la 'X' en una fila d'una taula importada.
 * 
 * @param {Array<string>} cells - Array de contingut de les cel·les.
 * @param {number} startIndex - Índex on comencen les columnes del 1 al 10.
 * @returns {number} El decatipus trobat (1-10) o 0 si no n'hi ha.
 */
export const findDecatypeInRow = (cells, startIndex = 2) => {
  for (let i = 0; i < 10; i++) {
    const cellValue = cells[startIndex + i]?.trim().toUpperCase();
    if (cellValue === 'X' || (cellValue && cellValue.length > 0)) {
      return i + 1;
    }
  }
  return 0;
};