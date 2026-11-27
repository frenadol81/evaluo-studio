import { RUBRIC_PLANETA_BLAU } from '../../core/config/rubrics/08_planeta_blau.js';
import { PLANETA_BLAU_FAMILY_PHRASES } from '../../core/config/planetaBlauFamilyWriting.js';
import { normalizeReportVocabulary } from '../../core/utils/reportVocabulary.js';

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
  clean = clean.replace(/^(?:(?:en|na|el|la)\s+|l['’]\s*)/i, '');

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
 * Genera el relat per a les famílies a partir dels nivells i matisos del docent.
 */
export const buildPlanetaBlauReport = (student) => {
  if (!student) return "";

  const info = student.info || {};
  const content = student.content || {};
  const tags = content.tags || [];
  const nuances = content.nuances || {};
  const customPhrases = content.customPhrases || {};
  const pbLevels = content.planetaBlauLevels || {};
  const singleLevels = {};

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
      return appendObservation(senseText, cid);
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

    const levels = Object.entries(criterion.optionsByLevel || {})
      .filter(([level, option]) => matchingOptions.includes(option) || matchingOptions.includes(rowOptions[Number(level) - 1]))
      .map(([level]) => level);
    if (levels.length === 0 && criterion.optionsByLevel?.[pbLevels[cid]]) {
      levels.push(pbLevels[cid]);
    }
    if (levels.length === 1) singleLevels[cid] = Number(levels[0]);
    const phrases = levels.map(level => PLANETA_BLAU_FAMILY_PHRASES[cid][Number(level) - 1]);
    if (phrases.length > 1) {
      return appendObservation(`El que hem observat varia segons l’activitat. ${phrases.join(' ')}`, cid);
    }
    return appendObservation(phrases[0] || '', cid);
  };

  const appendObservation = (text, criterionId) => {
    const rawNuance = nuances[criterionId];
    if (!rawNuance) return text;
    const nuanceText = Array.isArray(rawNuance) ? rawNuance.join('. ').trim() : String(rawNuance).trim();
    if (!nuanceText) return text;

    // Assegurar punt final abans d'afegir l'observació
    if (!text) return nuanceText;
    const cleanBase = /[.!?]$/.test(text) ? text : `${text}.`;
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

  const openingContext = "Durant els tres reptes de Planeta Blau —la flotació i la densitat, l’electricitat i el canvi climàtic—,";
  const recordsResults = singleLevels.investigo >= 2;
  const opening = recordsResults
    ? `${openingContext} ${firstName} ha anotat què observava i quins resultats obtenia a les proves.`
    : `${openingContext} hem observat què passava quan posàvem les idees a prova.`;

  // Les descripcions que comparteixen una mateixa acció es redacten juntes.
  // Els criteris amb una frase del docent o més d'un nivell mantenen el text propi.
  const linksResultsToIdeasWithHelp = singleLevels.investigo === 2 && singleLevels.comprenc === 2;
  let investigation = investigoText;
  if (linksResultsToIdeasWithHelp) {
    investigation = appendObservation(appendObservation(
      "A partir del que ha anotat, l’acompanyem a comparar els resultats amb el que pensava al principi i a treure’n conclusions senzilles. Això l’ajuda a donar sentit al que ha observat i a explicar amb les idees de ciències què ha passat i per què.",
      'investigo',
    ), 'comprenc');
  } else if (recordsResults) {
    const followUp = {
      2: "A partir del que ha anotat, l’ajudem a comparar-ho amb el que pensava al principi i a treure’n conclusions senzilles.",
      3: "Quan comprova si s’ha complert el que esperava, compara els resultats pel seu compte i explica quines proves donen suport a les seves conclusions.",
      4: "Interpreta pel seu compte allò que ha anotat i ho compara amb el que esperava. Sap explicar què ens mostren les proves i què encara cal comprovar.",
    };
    investigation = appendObservation(followUp[singleLevels.investigo], 'investigo');
  }

  const application = singleLevels.aplico === 3 ? appendObservation(
    "Davant d’un repte, sap fer servir el que hem après per proposar una solució, provar-la i millorar-la pel seu compte a partir del que veu.",
    'aplico',
  ) : aplicoText;
  const science = [
    ...(singleLevels.aplico >= 3 ? [application, investigation] : [investigation, application]),
    linksResultsToIdeasWithHelp ? '' : comprencText,
    comunicoText,
  ].filter(Boolean).join(' ');

  const teamwork = [organitzoText, implicoText].filter(Boolean).join(' ');
  const closing = `Ha estat un plaer compartir aquest espai amb tu, ${finalName}. Continua fent-te preguntes i provant les teves idees!`;

  return normalizeReportVocabulary([opening, science, teamwork, autoavaluacioText, closing].filter(Boolean).join('\n\n'));
};
