import { RUBRIC_PLANETA_BLAU } from '../../core/config/rubrics/08_planeta_blau.js';
import { PLANETA_BLAU_INITIAL_PHRASE, PLANETA_BLAU_FINAL_PHRASE } from '../../constants';

/**
 * Neteja el curs afegit com a segon cognom si s'ha importat des d'Espais
 * (ex: "Lucía Pérez 4º A" -> "Lucía Pérez", "Marc Garcia 5º B" -> "Marc Garcia")
 */
export const cleanCourseFromName = (name) => {
  if (!name) return "";
  return name.replace(/\s*[\(\[]?[1-6](?:º|t|rt|è|r|n)?\s*[A-Za-z]?[\)\]]?$/i, '').trim();
};

/**
 * Extreu ÚNICAMENT el nom de pila net (sense cognoms, sense curs i sense article personal).
 * Exemples:
 * - "Lucía Pérez 4º A" -> "Lucía"
 * - "Marc Garcia 5º B" -> "Marc"
 * - "Na Clara Soler" -> "Clara"
 * - "En Josep Maria Puig 4º A" -> "Josep Maria"
 * - "García Pérez, Lucía 4º A" -> "Lucía"
 */
export const getCleanFirstNameOnly = (rawName) => {
  if (!rawName) return "";
  let clean = cleanCourseFromName(rawName);

  // Format "Cognoms, Nom"
  if (clean.includes(',')) {
    const parts = clean.split(',');
    if (parts[1] && parts[1].trim()) {
      clean = parts[1].trim();
    }
  }

  // Elimina articles personals catalans (En, Na, El, La, L', L')
  clean = clean.replace(/^(en|na|el|la|l'|l’)\s*/i, '');

  // Gestió de noms compostos habituals
  const compoundNames = [
    'josep maria', 'maria del mar', 'joan pau', 'maria rosa', 'ana maria', 
    'juan carlos', 'jose antonio', 'maria teresa', 'maria carmen', 'maria jesus',
    'maría del mar', 'josé maría', 'josé antonio', 'josé manuel', 'miguel ángel',
    'victor manuel', 'francisco javier'
  ];
  const lower = clean.toLowerCase();
  for (const compound of compoundNames) {
    if (lower === compound || lower.startsWith(compound + ' ')) {
      return clean.slice(0, compound.length).trim();
    }
  }

  return clean.split(/\s+/)[0] || clean;
};

/**
 * Neteja l'article personal (En, Na, El, La, L') per obtenir el vocatiu {nom_final}
 */
const getNomFinal = (rawName) => {
  return getCleanFirstNameOnly(rawName);
};

/**
 * Elimina etiquetes diagnòstiques o metacognitives entre parèntesis que no han d'aparèixer
 * a l'informe final destinat a les famílies (ex: "(realisme i metacognitiu)", "(Realisme Metacognitiu):")
 */
export const cleanDiagnosticTags = (text) => {
  if (!text) return "";
  return text
    .replace(/^\s*\([^\)]+\)\s*:?\s*/gi, '')
    .replace(/\s*\((?:realisme|metacognitiu|sobreestimaci[oó]|infravaloraci[oó]|desconnexi[oó]|irrealisme)[^\)]*\)\s*:?\s*/gi, ' ')
    // Elimina la menció als següents passos / propers reptes a l'autoavaluació per evitar duplicitats amb el paràgraf 2/3
    .replace(/,\s*reconeix què li ha costat\s*(?:,\s*)?(?:i\s*)?identifica(?:nt)? amb realisme els seus propers reptes/gi, ' i reconeix què li ha costat')
    .replace(/(?:,\s*)?(?:i\s*)?identifica(?:nt)? amb realisme els seus propers reptes/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

/**
 * Generador determinista d'informes per a l'espai Planeta Blau segons
 * l'especificació oficial v1.0.
 *
 * Construeix un informe qualitatiu estricte de 6 paràgrafs:
 * - Paràgraf 1: Introducció comuna completa.
 * - Paràgraf 2: COMPRÈN + INVESTIGA + APLICA (+ observació si n'hi ha).
 * - Paràgraf 3: COMUNICA (+ observació si n'hi ha).
 * - Paràgraf 4: S'ORGANITZA + S'IMPLICA (+ observació si n'hi ha).
 * - Paràgraf 5: S'AUTOAVALUA (+ observació si n'hi ha).
 * - Paràgraf 6: Tancament comú amb el nom de pila ({nom_final}).
 */
export const buildPlanetaBlauReport = (student) => {
  if (!student) return "";

  const info = student.info || {};
  const content = student.content || {};
  const tags = content.tags || [];
  const nuances = content.nuances || {};
  const customPhrases = content.customPhrases || {};
  const pbLevels = content.planetaBlauLevels || {};

  // El nom a utilitzar a tot l'informe ha de ser ÚNICAMENT el nom de pila, sense cognoms
  const rawFullName = (info.name || "").trim() || "l'alumne/a";
  const firstName = getCleanFirstNameOnly(rawFullName) || "l'alumne/a";
  const fullName = firstName;
  const finalName = firstName;

  // Resolució del text de cada criteri en ordre
  const getCriterionText = (criterion) => {
    const cid = criterion.id;

    // 1. Frase personalitzada té prioritat màxima si s'ha definit
    if (customPhrases[cid] && typeof customPhrases[cid] === 'string' && customPhrases[cid].trim()) {
      let phrase = customPhrases[cid].trim();
      phrase = phrase.replace(/\{nom\}/g, fullName).replace(/\{nom_final\}/g, finalName);
      phrase = cleanDiagnosticTags(phrase);
      return appendObservation(phrase, cid);
    }

    // 2. Comprovar si s'ha marcat explícitament 'sense_evidencies'
    const isExplicitSenseEvidencies = 
      pbLevels[cid] === 'sense_evidencies' || 
      tags.includes(`pb_${cid}_sense_evidencies`) ||
      tags.includes(`sense_evidencies_${cid}`);

    if (isExplicitSenseEvidencies) {
      const senseText = criterion.senseEvidencies || `Encara no es disposa de prou evidències per valorar aquest àmbit.`;
      const base = cid === 'comprenc' ? `Valoració de ${fullName}: ${senseText}` : senseText;
      return appendObservation(base, cid);
    }

    // 3. Cercar les opcions seleccionades dins dels tags de l'estudiant
    const rowOptions = criterion.options || [];
    let matchingOptions = rowOptions.filter(opt => {
      const cleanOpt = cleanDiagnosticTags(opt);
      if (tags.includes(opt) || tags.includes(cleanOpt)) return true;
      const substituted = opt.replace(/\{nom\}/g, fullName);
      if (tags.includes(substituted) || tags.includes(cleanDiagnosticTags(substituted))) return true;
      const substitutedFinal = opt.replace(/\{nom\}/g, finalName);
      if (tags.includes(substitutedFinal) || tags.includes(cleanDiagnosticTags(substitutedFinal))) return true;
      return false;
    });

    // Compatibilitat amb etiquetes històriques o diagnòstiques de l'autoavaluació
    if (cid === 'autoavaluacio' && matchingOptions.length === 0) {
      if (tags.some(t => /realisme/i.test(t)) || pbLevels['autoavaluacio'] === '4') {
        matchingOptions = [criterion.optionsByLevel['4']];
      } else if (tags.some(t => /infravaloraci[oó]/i.test(t)) || pbLevels['autoavaluacio'] === '3') {
        matchingOptions = [criterion.optionsByLevel['3']];
      } else if (tags.some(t => /sobreestimaci[oó]/i.test(t)) || pbLevels['autoavaluacio'] === '2') {
        matchingOptions = [criterion.optionsByLevel['2']];
      } else if (tags.some(t => /desconnexi[oó]|irrealisme/i.test(t)) || pbLevels['autoavaluacio'] === '1') {
        matchingOptions = [criterion.optionsByLevel['1']];
      }
    }

    let baseText = "";
    if (matchingOptions.length > 0) {
      // Si el docent ha marcat més d'un nivell (situació de transició), s'inclouen
      // les frases oficials completes dels nivells seleccionats, en l'ordre de la rúbrica.
      baseText = matchingOptions.map(opt => cleanDiagnosticTags(opt.trim())).join(' ');
    } else if (pbLevels[cid] && criterion.optionsByLevel && criterion.optionsByLevel[pbLevels[cid]]) {
      baseText = cleanDiagnosticTags(criterion.optionsByLevel[pbLevels[cid]]);
    } else {
      // 4. Cas quan no hi ha selecció (o sense evidències)
      const senseEvidencies = criterion.senseEvidencies || `Encara no es disposa de prou evidències per valorar aquest àmbit.`;
      if (cid === 'comprenc') {
        baseText = `Valoració de ${fullName}: ${senseEvidencies}`;
      } else {
        baseText = senseEvidencies;
      }
    }

    // Interpolació de variables ({nom}, {nom_final} i pronoms de gènere)
    const pronounObj = info.gender === 'Masculí' ? 'ajudar-lo' : 'ajudar-la';
    baseText = baseText
      .replace(/\{ajudar_pronom\}/g, pronounObj)
      .replace(/ajudar-la\/lo/g, pronounObj)
      .replace(/ajudar-lo\/la/g, pronounObj)
      .replace(/ajudar-\{pronom\}/g, pronounObj)
      .replace(/\{nom\}/g, fullName)
      .replace(/\{nom_final\}/g, finalName);

    // Neteja addicional de qualsevol etiqueta diagnòstica residual
    baseText = cleanDiagnosticTags(baseText);

    // 5. Afegir observació docent puntual si existeix
    return appendObservation(baseText, cid);
  };

  const appendObservation = (text, criterionId) => {
    const rawNuance = nuances[criterionId];
    if (!rawNuance) return text;
    const nuanceText = Array.isArray(rawNuance) ? rawNuance.join('. ').trim() : String(rawNuance).trim();
    if (!nuanceText) return text;

    // Assegurar punt final abans d'afegir l'observació
    const cleanBase = text.endsWith('.') ? text : `${text}.`;
    return `${cleanBase} ${nuanceText}`;
  };

  // Criteris de la rúbrica
  const criteria = RUBRIC_PLANETA_BLAU.data || [];
  const findCriterion = (id) => criteria.find(c => c.id === id) || { id, options: [] };

  const comprencText = getCriterionText(findCriterion('comprenc'));
  const investigoText = getCriterionText(findCriterion('investigo'));
  const aplicoText = getCriterionText(findCriterion('aplico'));
  const comunicoText = getCriterionText(findCriterion('comunico'));
  const organitzoText = getCriterionText(findCriterion('organitzo'));
  const implicoText = getCriterionText(findCriterion('implico'));
  const autoavaluacioText = getCriterionText(findCriterion('autoavaluacio'));

  // Composició estricta de paràgrafs:
  // Paràgraf 1: Introducció afinada
  // Paràgraf 2: Aprenentatge científic (Comprèn + Investiga + Aplica)
  // Paràgraf 3: Comunicació científica (Comunica)
  // Paràgraf 4: Manera de treballar (Organitza + Implica)
  // Paràgraf 5: Autoavaluació metacognitiva (neta, sense etiquetes de diagnòstic)
  // Paràgraf 6: Conclusió blindada comuna adaptada per a tothom
  const p1 = PLANETA_BLAU_INITIAL_PHRASE.replace(/\{nom_final\}/g, finalName).replace(/\{nom\}/g, fullName).trim();
  const p2 = [comprencText, investigoText, aplicoText].filter(Boolean).join(' ');
  const p3 = comunicoText;
  const p4 = [organitzoText, implicoText].filter(Boolean).join(' ');
  const p5 = autoavaluacioText;
  const p6 = PLANETA_BLAU_FINAL_PHRASE.replace(/\{nom_final\}/g, finalName).replace(/\{nom\}/g, fullName).trim();

  return [p1, p2, p3, p4, p5, p6].filter(Boolean).join('\n\n');
};
