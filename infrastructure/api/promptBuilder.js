
import { RUBRIC_INTRO } from '../../core/config/rubrics/00_introduccio.js';
import { RUBRIC_PERSONALITY } from '../../core/config/rubrics/01_personality.js';
import { RUBRIC_HABITS } from '../../core/config/rubrics/04_habits.js';
import { RUBRIC_LINGUISTIC } from '../../core/config/rubrics/05_linguistic.js';
import { RUBRIC_MATEMATIC } from '../../core/config/rubrics/06_matematic.js';
import { RUBRIC_MEDI } from '../../core/config/rubrics/06d_medi.js';
import { RUBRIC_FISICA } from '../../core/config/rubrics/06b_fisica.js';
import { RUBRIC_MAKER } from '../../core/config/rubrics/07_maker.js';
import { RUBRIC_PLANETA_BLAU } from '../../core/config/rubrics/08_planeta_blau.js';
import { isOptionSelected } from '../../core/utils/rubricMatcher.js';
import { getQualitativeReadingDescription } from '../../core/logic/decatypeCalc.js';
import { MAKER_SYSTEM_INSTRUCTION, PLANETA_BLAU_SYSTEM_INSTRUCTION, PLANETA_BLAU_INITIAL_PHRASE, PLANETA_BLAU_FINAL_PHRASE } from '../../constants';

/**
 * Minimitza el nom de l'alumne per reduir PII enviat a tercers (Gemini).
 * Manté l'article personal en català (En, Na, El, La, L') i només el primer nom de pila,
 * eliminant completament cognoms.
 */
export const getCleanFirstName = (rawName) => {
  if (!rawName) return "l'alumne/a";
  let trimmed = rawName.trim();
  // Elimina curs afegit com a segon cognom si existeix (ex: "Lucía Pérez 4º A" -> "Lucía Pérez", "Pau (4t A)" -> "Pau")
  trimmed = trimmed.replace(/\s*[\(\[]?[1-6](?:º|t|rt|è|r|n)?\s*[A-Za-z]?[\)\]]?$/i, '').trim();
  const articleMatch = trimmed.match(/^(en|na|el|la|l'|l’)\s+/i);
  if (articleMatch) {
    const article = articleMatch[0];
    const rest = trimmed.slice(article.length).trim();
    const firstName = rest.split(/\s+/)[0] || "";
    return `${article}${firstName}`.trim();
  }
  // Si comença per L' sense espai (ex: L'Aina)
  if (/^l['’]/i.test(trimmed)) {
    const withoutApostrophe = trimmed.replace(/^l['’]/i, '');
    const firstName = withoutApostrophe.split(/\s+/)[0] || "";
    return `l'${firstName}`;
  }
  return trimmed.split(/\s+/)[0] || trimmed;
};

/**
 * buildReportPrompt: Organitza la informació amb separació estricta.
 * Si l'alumne només té dades de Maker, activa el mode "Maker Pur".
 */
export const buildReportPrompt = (student, toneInstruction, rubrics = [], trimesterId = 2) => {
  const { info, content, trimesters } = student;
  const studentFirstName = getCleanFirstName(info.name);
  const tags = content.tags || [];
  const nuances = content.nuances || {};

  // 0. CONTEXT HISTÒRIC (SI N'HI HA)
  let historyPrompt = "";
  if (trimesters && trimesterId > 1) {
    const previousTrimesters = Object.keys(trimesters)
      .map(Number)
      .filter(t => t < trimesterId)
      .sort((a, b) => b - a); // Del més recent al més antic
    
    if (previousTrimesters.length > 0) {
      historyPrompt = "\n### CONTEXT D'AVALUACIÓ ANTERIOR (HISTÒRIC):\n";
      previousTrimesters.forEach(t => {
        const data = trimesters[t];
        if (data.content?.tags?.length > 0 || data.state?.generatedReport) {
          historyPrompt += `- TRIMESTRE ${t}:\n`;
          if (data.content.tags.length > 0) historyPrompt += `  * Etiquetes clau: ${data.content.tags.slice(0, 10).join(', ')}${data.content.tags.length > 10 ? '...' : ''}\n`;
          if (data.state.generatedReport) {
            // Un resum o extracte de l'informe anterior per donar context de progressió
            const summary = data.state.generatedReport.substring(0, 300) + "...";
            historyPrompt += `  * Extracte informe: "${summary}"\n`;
          }
        }
      });
      historyPrompt += "\nIMPORTANT: Fes servir aquesta informació per detectar progressió, millora o estancament respecte als trimestres anteriors si és pertinent.\n";
    }
  }

  // 1. CLASSIFICACIÓ DE TAGS PER ÀREES
  // Utilitzem les rúbriques passades per argument o provem de trobar-les per ID
  const findRubric = (id) => rubrics.find(r => r.id === id);

  const filterTags = (rubricId, excludeItemIds = []) => {
    const rubric = findRubric(rubricId);
    if (!rubric) return [];
    
    const activeData = excludeItemIds.length > 0
      ? rubric.data.filter(d => !excludeItemIds.includes(d.id))
      : rubric.data;

    const options = activeData.flatMap(d => d.options || d.dimensions?.flatMap(dim => [...(dim.excess || []), ...(dim.balance || []), ...(dim.defect || [])].map(t => t.definition)) || []);
    const areaTags = tags.filter(t => options.includes(t));
    
    const areaNuances = activeData
      .filter(d => nuances[d.id])
      .map(d => {
        const nuanceVal = nuances[d.id];
        const nuanceText = Array.isArray(nuanceVal) ? nuanceVal.join('. ') : nuanceVal;
        return `MATÍS PRIORITARI SOBRE "${d.label || d.title || d.name || 'aquest ítem'}": ${nuanceText}`;
      });
    
    return [...areaTags, ...areaNuances];
  };

  const filterTagsOrdered = (rubricId) => {
    const rubric = findRubric(rubricId);
    if (!rubric) return [];

    const rubricOptions = rubric.data.flatMap(d => d.options || d.dimensions?.flatMap(dim => [...(dim.excess || []), ...(dim.balance || []), ...(dim.defect || [])].map(t => t.definition)) || []);
    const areaTags = rubricOptions.filter(opt => tags.includes(opt));
    
    const areaNuances = rubric.data
      .filter(d => nuances[d.id])
      .map(d => {
        const nuanceVal = nuances[d.id];
        const nuanceText = Array.isArray(nuanceVal) ? nuanceVal.join('. ') : nuanceVal;
        return `MATÍS PRIORITARI SOBRE "${d.label || d.title || d.name || 'aquest ítem'}": ${nuanceText}`;
      });
      
    return [...areaTags, ...areaNuances];
  };

  // Conferència d'expressió oral (específica del trimestre actiu)
  const confFromContent = content?.conference;
  const confFromTrimester = trimesters?.[trimesterId]?.content?.conference;
  const currentConference = confFromContent || confFromTrimester || null;

  // Comprovem si la conferència pertany a aquest trimestre (T1 per defecte si no s'especifica)
  const confTrimester = currentConference?.trimester || 1;
  const isConferenceForThisTrimester = Boolean(
    currentConference && 
    (currentConference.status === 'Complet' || currentConference.topic) && 
    confTrimester === trimesterId
  );

  const traits = filterTags('personality_block');
  const habits = filterTags('habits_treball');
  // Si l'alumne té conferència en aquest trimestre, obviem expressament la comprensió oral ('l_comp_oral')
  // perquè la conferència ja aporta una anàlisi oral integral i exhaustiva, evitant duplicacions i solapaments.
  const linguisticExcluded = isConferenceForThisTrimester ? ['l_comp_oral'] : [];
  const linguistic = filterTags('ambit_linguistic', linguisticExcluded);
  const math = filterTagsOrdered('ambit_matematic');
  const mediTags = filterTags('ambit_medi');
  
  const fisica = filterTagsOrdered('ambit_fisica');
  const valors = filterTags('ambit_valors');
  const intro = filterTags('introduccio_informe');

  const t3MediIntro = "Durant aquest tercer trimestre hem desenvolupat el projecte sobre el cos humà, centrant-nos en els aparells circulatori i respiratori. Aquest projecte ha facilitat l’aprofundiment en el coneixement dels diferents sistemes i les seves funcions, així com el desenvolupament d’habilitats d’observació, experimentació i treball cooperatiu. ";
  
  const currentTrimesterName = { 1: 'primer', 2: 'segon', 3: 'tercer' }[trimesterId] || 'actual';

  // 1.5 DADES DE LECTURA I VELOCITAT LECTORA (AMB CRITERI DE PRUDÈNCIA FORMATIVA)
  const readingObj = student.content?.reading || {};
  const catData = readingObj.cat || (readingObj.wpm ? { wpm: readingObj.wpm, errors: readingObj.errors, comp: readingObj.comp, levelTag: readingObj.levelTag } : null) || (student.metrics?.readingSpeed ? { wpm: student.metrics.readingSpeed, errors: student.metrics.readingErrors, comp: student.metrics.readingCompText, levelTag: student.metrics.readingLevelTag } : null);
  const castData = readingObj.cast || null;
  const catQual = catData ? getQualitativeReadingDescription(catData.wpm) : '';
  const castQual = castData ? getQualitativeReadingDescription(castData.wpm) : '';
  const hasReadingData = catData || castData;

  const readingPromptBlock = hasReadingData ? `
  * REGISTRE DE LECTURA EN VEU ALTA A L'AULA (CATALÀ I CASTELLÀ - VALORACIÓ QUALITATIVA I MADURATIVA):
    ${catData ? `    - Català: Valoració: "${catQual}" (${catData.levelTag || ''})${catData.errors ? ` | Mecànica: "${catData.errors}"` : ''}${catData.comp ? ` | Comprensió: "${catData.comp}"` : ''}` : ''}
    ${castData ? `    - Castellà: Valoració: "${castQual}" (${castData.levelTag || ''})${castData.errors ? ` | Mecànica: "${castData.errors}"` : ''}${castData.comp ? ` | Comprensió: "${castData.comp}"` : ''}` : ''}
    - MANDAT DE RIGOR I PRUDÈNCIA PEDAGÒGICA (MOLT IMPORTANT):
      «PROHIBIT EXPLICITAMENT CITAR NÚMEROS EXACTES DE PARAULES PER MINUT (PPM o WPM) AL TEXT DE L'INFORME. Les observacions de lectura en veu alta reflecteixen la pràctica d'aula (fluïdesa, pauses, articulació i expressivitat). Fes servir exclusivament la valoració qualitativa i madurativa (velocitat alta, baixa, un xic per sota o per damunt de la mitjana madurativa, fluida, etc.) sense mencionar quantes paraules llegeix per minut. Pel que fa a la dada de comprensió lectora d'aquesta prova puntual, tracta-la ÚNICAMENTE com a matís orientatiu i prudent; MAI com una sentència categòrica sobre si la seva comprensió és bona o dolenta, ja que la comprensió a l'aula es construeix amb múltiples evidències contínues d'avaluació. Evita frases genèriques de plantilla buida i expressa els avenços i reptes reals de l'alumne amb naturalitat i calidesa.»` : '';

  let linguisticSection = null;
  if (linguistic.length > 0 || isConferenceForThisTrimester || hasReadingData) {
    if (isConferenceForThisTrimester) {
      const c = currentConference.criteria || {};
      const topic = currentConference.topic || "el tema escollit";
      const aspectesDestacar = currentConference.aspectes_destacar || currentConference.observacions_docent || "";
      const aspectesMillorar = currentConference.aspectes_millorar || "";

      linguisticSection = `- LLENGUA I EXPRESSIÓ ORAL (INCLOU CONFERÈNCIA DE 4T EN AQUEST ${currentTrimesterName.toUpperCase()} TRIMESTRE):
  * DADES CURRICULARS DE COMPRENSIÓ I EXPRESSIÓ ESCRITA:
    ${linguistic.length > 0 ? linguistic.join(' | ') : "Seguiment regular de la comprensió i expressió escrita."}
${readingPromptBlock}

  * REGISTRE PEDAGÒGIC D'EVIDÈNCIES DE LA CONFERÈNCIA ORAL:
    - Tema: «${topic}»
    - Data d'exposició: ${currentConference.date || `Trimestre ${trimesterId}`}
    - Llengua: ${currentConference.language || "Català"}
    - Domini del tema: ${c.domini_tema || "Adequat"}
    - Estructura i fil conductor: ${c.estructura || "Coherent"}
    - Fluïdesa i comunicació: ${c.fluidesa || "Adequada"}
    - Veu i entonació: ${c.veu_entonacio || "Adequada"}
    - Vocabulari i precisió lèxica: ${c.vocabulari || "Adequat"}
    - Expressió corporal i contacte visual: ${c.expressio_corporal || "Adequada"}
    - Interacció i atenció als companys: ${c.interaccio || "Respectuosa i atenta"}
    - Suport digital (claredat i cura): ${c.claredat_suport || "Ben estructurat"}
    - Recursos visuals (imatges, absència d'errades): ${c.recursos_visuals || "Ben escollits"}
    - Procés de revisió i millora (seguiment previ): ${c.revisio_millora || "Assolit"}
    - Terminis i compromisos acordats: ${c.terminis_acords || "Assolit"}
    - OBSERVACIONS PERSONALS DEL MESTRE (ASPECTES A DESTACAR - MÀXIMA PRIORITAT): "${aspectesDestacar}"
    - PROPOSTES DE MILLORA DEL MESTRE (ASPECTES A MILLORAR - MÀXIMA PRIORITAT): "${aspectesMillorar}"

  * FILOSOFIA RECTORA I MANDAT PEDAGÒGIC (MOLT IMPORTANT):
    «Fes servir la primera versió com a referència d'estil (naturalitat, calidesa, cohesió narrativa, capacitat d'imaginar l'alumne comunicant i zero etiquetes mecàniques) i la segona versió com a referència de profunditat avaluativa (precisió de la rúbrica, exhaustivitat de les dimensions, suport digital, vocabulari, procés previ de treball, compliment de terminis i seguiment docent).»

  * TEXT DE REFERÈNCIA CANÒNIC (MODEL DE QUALITAT A REPLICAR EN TO, RITME I DENSITAT):
    "Pel que fa a l’expressió oral, en [Nom] ha dut a terme una molt bona conferència sobre «[Tema]». Ha demostrat un bon coneixement del tema i ha organitzat l’exposició de manera clara i coherent. Ha destacat especialment per la tranquil·litat amb què s’ha expressat i per la capacitat d’anar més enllà de la informació de les diapositives, utilitzant-les com a guia i ampliant les explicacions amb les seves pròpies paraules. Això ha posat de manifest una bona comprensió dels continguts treballats.

    Durant l’exposició, ha parlat amb fluïdesa, ha utilitzat un vocabulari variat i precís i ha mantingut un ritme que ha facilitat la comprensió. El suport digital ha estat molt ben estructurat, amb imatges ben escollides, una presentació visual cuidada i sense errades ortogràfiques. També ha mostrat una actitud respectuosa i atenta davant les preguntes i aportacions dels companys.

    Pel que fa al procés de treball, ha complert els compromisos acordats i ha sabut aprofitar les indicacions rebudes per millorar la seva feina. De cara a properes exposicions, serà important que continuï treballant la projecció de la veu i que procuri mantenir més contacte visual amb el públic per aconseguir una comunicació encara més directa."

  * MODEL D'ESTRUCTURA DE 4T (ORDRE OPCIÓ 1 - LA CONFERÈNCIA COM A CAPÇALERA D'OBERTURA DE LLENGUA):
    Quan l'alumne tingui conferència en aquest trimestre, l'àrea de Llengua ha de seguir OBLIGATÒRIAMENT aquest ordre pedagògic:

    1. PARÀGRAF 1: OBERTURA DE LLENGUA, TEMA I SINGULARITAT DE L'ALUMNE (PRIORITZAR LES OBSERVACIONS PERSONALS):
       - Comença obligatòriament com a capçalera de l'àrea: "Pel que fa a l’àrea de llengua, i de manera especial en l’expressió oral, [L'article] [Nom] ha dut a terme una [bona / molt bona] conferència sobre «${topic}»."
       - Desenvolupa el coneixement del tema i com ha organitzat l'exposició de manera clara i coherent.
       - PRIORITAT MÀXIMA: Destaca immediatament la conducta concreta i diferencial observada pel mestre ("${aspectesDestacar}"): la tranquil·litat o serenitat amb què s'ha expressat, i la capacitat clau d'anar més enllà de la informació de les diapositives utilitzant-les com a guia i ampliant les explicacions amb les seves pròpies paraules, reflectint una comprensió real dels continguts treballats.

    2. PARÀGRAF 2: L'EXPOSICIÓ A L'AULA I EL SUPORT DIGITAL:
       - Desenvolupa la comunicació: fluïdesa verbal, vocabulari variat i precís, i ritme sostingut que ha facilitat la comprensió per part dels companys.
       - Descriu el suport digital: presentació ben estructurada, imatges ben escollides, presentació visual cuidada i sense errades ortogràfiques.
       - Reflecteix l'actitud respectuosa i atenta davant les preguntes i aportacions dels companys.

    3. PARÀGRAF 3: PROCÉS DE TREBALL PREVI I REPTES CONSTRUCTIUS DE FUTUR:
       - PROCÉS DE TREBALL (DIMENSIÓ PEDAGÒGICA CLAU): És OBLIGATORI avaluar el procés de recerca i preparació: "Pel que fa al procés de treball, ha complert els compromisos acordats i ha sabut aprofitar les indicacions rebudes per millorar la seva feina."
       - REPTES DE FUTUR (SENSE CONTRADICCIONS): Introdueix els aspectes a millorar començant amb: "De cara a properes exposicions, serà important que..." i formula amb to engrescador i motivador els reptes observats pel docent ("${aspectesMillorar}"): per exemple, treballar la projecció de la veu o procurar mantenir més contacte visual amb el públic per aconseguir una comunicació encara més directa.

    4. PARÀGRAF 4: COMPRENSIÓ LECTORA I EXPRESSIÓ ESCRITA (CLOENDA DE L'ÀREA DE LLENGUA):
       - Just després dels 3 paràgrafs de la conferència oral, enllaça de manera fluida amb la comprensió lectora i el treball escrit habitual a l'aula començant amb:
       "D'altra banda, pel que fa a la comprensió lectora i el treball escrit a l'aula, [Nom] [integra aquí les dades reals de lectura en veu alta, pauses, mecànica i treball escrit sense caure en tòpics de plantilla]...". Si no hi ha dades específiques de lectura/escriptura, no inventis res.

  * LES 4 REGLES D'OR DE RIGOR (CRÍTIQUES - APLICACIÓ ESTRICTA):
    - Regla 1 (Prioritzar el que distingeix l'alumne): La tranquil·litat, la comprensió del tema i l'ampliació oral de les diapositives són observacions personals del mestre que han d'anar al primer paràgraf, mai diluïdes ni al final.
    - Regla 2 (Conservar l'avaluació del procés): Una conferència no és només exposar davant del grup; avalua sempre la responsabilitat en els compromisos i la incorporació de millores prèvies.
    - Regla 3 (Evitar contradiccions): Si a les notes docents es demana "parlar més fort" o "treballar la projecció de la veu", PROHIBIT dir que "regula o projecta perfectament el volum". S'ha de distingir entre entonació/to i projecció, o reservar la projecció per al repte de futur. Si es demana "mirar més al públic", no diguis que manté un contacte visual constant; enfoca-ho com a repte constructiu.
    - Regla 4 (Llenguatge avaluatiu natural, sense exageracions): Prohibides les expressions excessivament elogioses com "impecable", "magistral", "sublim" o "encara més propera i segura". Fes servir un to avaluatiu proper, clar per a les famílies, rigorós i natural.
    - Regla 5 (Zero etiquetes soltes): Prohibit escriure "Aspectes a destacar:" o "Aspectes a millorar:". Tota la informació docent ha de quedar integrada com a prosa viva.
    - Regla 6 (Omissió de comprensió oral rutinària): Com que la conferència oral ja recull amb detall tota la dimensió oral de l'alumne, PROHIBIT afegir frases genèriques de comprensió oral; el bloc posterior s'ha de centrar exclusivament en la comprensió lectora i l'expressió escrita per evitar qualsevol solapament o redundància.`;
    } else {
      linguisticSection = `- LLENGUA: ${linguistic.length > 0 ? linguistic.join(' | ') : "Seguiment regular de la comprensió i expressió escrita."}
${readingPromptBlock}
(Aquest alumne NO ha fet la conferència en aquest ${currentTrimesterName} trimestre; per tant, NO facis cap esment a conferències ni a exposicions orals de conferències).`;
    }
  }

  // Preparem les línies acadèmiques només si hi ha dades
  const academicSections = [
    linguisticSection,
    math.length > 0 ? `- MATEMÀTIQUES: ${math.join(' | ')}` : null,
    mediTags.length > 0 ? `- MEDI: ${trimesterId === 3 ? t3MediIntro : ''}${mediTags.join(' | ')}` : null,
    fisica.length > 0 ? `- EDUCACIÓ FÍSICA: ${fisica.join(' | ')}` : null,
    valors.length > 0 ? `- VALORS: ${valors.join(' | ')}` : null
  ].filter(Boolean);
  
  const rPlanetaBlau = findRubric('ambit_planeta_blau') || RUBRIC_PLANETA_BLAU;
  const getPlanetaBlauTags = () => {
    if (!rPlanetaBlau) return [];
    const options = rPlanetaBlau.data?.flatMap(d => d.options || []) || [];
    const studentName = student.info?.name || '';
    const areaTags = tags.filter(t => options.some(opt => isOptionSelected([t], opt, studentName)));
    const areaNuances = (rPlanetaBlau.data || [])
      .filter(d => nuances[d.id])
      .map(d => {
        const nuanceVal = nuances[d.id];
        const nuanceText = Array.isArray(nuanceVal) ? nuanceVal.join('. ') : nuanceVal;
        return `MATÍS PRIORITARI SOBRE "${d.label || d.title || d.name || 'aquest ítem'}": ${nuanceText}`;
      });
    return [...areaTags, ...areaNuances];
  };

  const planetaBlauTags = getPlanetaBlauTags();
  const hasPlanetaBlauData = (planetaBlauTags.length > 0) || Boolean(content.planetaBlau?.narrative);

  const studentGroupId = String(student.groupId || student.info?.groupId || '').toLowerCase();
  const studentGroupName = String(student.groupName || student.info?.groupName || '').toLowerCase();
  const isPlanetaBlauGroup = studentGroupId.startsWith('g_pb') || 
                             studentGroupId.includes('pb') || 
                             studentGroupId.includes('planeta') ||
                             studentGroupName.includes('planeta');

  const rMaker = findRubric('ambit_maker');
  const makerTechnicalIds = ['mkr_disseny', 'mkr_tecnologia', 'mkr_comunicacio', 'mkr_sostenibilitat'];
  const makerHumanIds = ['mkr_colaboracio', 'mkr_error', 'mkr_autoavaluacio'];

  const autoavaluacioOptions = [
    "(Desconnexió/Irrealisme): Presenta dificultats per connectar amb la realitat del seu treball; la seva percepció és irregular, alternant visió excessivament positiva amb inseguretat.",
    "(Sobreestimació): Tendeix a mostrar una visió excessivament optimista de l'esforç i resultats, fet que li impedeix identificar amb realisme punts de millora o errades.",
    "(Infravaloració): Es mostra molt exigent i crític amb la seva pròpia feina; manifesta una tendència a la infravaloració que sovint no li permet reconèixer la vàlua real dels seus projectes.",
    "(Realisme Metacognitiu): Demostra una gran maduresa i honestedat; analitza amb precisió tant el seu procés com el resultat final.",
    "(Realisme Metacognitiu): Demostra una gran maduresa i honestedat; analitza amb precisió tant el seu procés com el resultat final, identificant amb realisme els seus propers reptes."
  ];

  const getMakerTagsByGroup = (ids) => {
    if (!rMaker) return [];
    const rubricDataForIds = rMaker.data.filter(d => ids.includes(d.id));
    const options = rubricDataForIds.flatMap(d => d.options);
    const studentName = student.info?.name || '';
    const areaTags = tags.filter(t => options.some(opt => isOptionSelected([t], opt, studentName)));
    
    const areaNuances = rubricDataForIds
      .filter(d => nuances[d.id])
      .map(d => {
        const nuanceVal = nuances[d.id];
        const nuanceText = Array.isArray(nuanceVal) ? nuanceVal.join('. ') : nuanceVal;
        return `MATÍS PRIORITARI SOBRE "${d.label || d.title || d.name || 'aquest ítem'}": ${nuanceText}`;
      });
      
    return [...areaTags, ...areaNuances];
  };

  const makerTechnicalTags = getMakerTagsByGroup(makerTechnicalIds);
  let makerHumanTags = getMakerTagsByGroup(makerHumanIds);

  // Desambiguació crítica: Si l'alumne fa Planeta Blau o pertany a un grup de Planeta Blau,
  // i no té etiquetes tècniques de Maker ni narrativa Maker, les opcions compartides d'autoavaluació
  // pertanyen estrictament a Planeta Blau i NO han d'activar falsament Maker.
  if ((hasPlanetaBlauData || isPlanetaBlauGroup) && makerTechnicalTags.length === 0 && !content.maker?.narrative) {
    makerHumanTags = makerHumanTags.filter(t => !autoavaluacioOptions.includes(t));
  }

  const hasMakerData = (makerTechnicalTags.length + makerHumanTags.length > 0) || Boolean(content.maker?.narrative);

  // 2. DETECCIÓ DE MODE PUR (MAKER O PLANETA BLAU)
  const hasCurricularSubjects = (linguistic.length + math.length + mediTags.length + fisica.length + valors.length) > 0 || isConferenceForThisTrimester;
  const hasAcademic = (traits.length + habits.length + linguistic.length + math.length + mediTags.length + fisica.length + valors.length) > 0 || isConferenceForThisTrimester || hasReadingData;

  const isPurePlanetaBlau = (isPlanetaBlauGroup || hasPlanetaBlauData) && (!hasCurricularSubjects && !hasMakerData);
  const isPureMaker = !isPurePlanetaBlau && !hasAcademic && hasMakerData && !hasPlanetaBlauData;

  // 3. CONSTRUCCIÓ DEL PROMPT SEGONS EL MODE PUR
  if (isPureMaker) {
    const pureMakerEvolution = content.evolutionPhrases || [];
    const pureMakerRecs = content.recommendations || [];
    return `
### ROL: FACILITADOR/A DE L'ESPAI MAKER (STEAM) - ESPECIALISTA
Ets l'especialista de l'Espai Maker. No ets el tutor de l'aula.
${historyPrompt}

${pureMakerEvolution.length > 0 ? `### FRASES D'EVOLUCIÓ VALIDADES PEL MESTRE:
${pureMakerEvolution.map(p => `- "${p}"`).join('\n')}
Integra aquestes evidències d'evolució al llarg del redactat.
` : ""}

### INSTRUCCIONS DE RIGOR (CRÍTIQUES):
- Menciona TOTS els ítems evaluats. No ometis cap dada tècnica o humana.
- Descriu honestament les dificultats o bloquejos si apareixen a les dades.
- Usa le plural "projectes".

### FILOSOFIA:
${MAKER_SYSTEM_INSTRUCTION}

### DADES TÈCNIQUES (PARÀGRAF 1):
- Etiquetes seleccionades d'aquests IDs (Disseny, Tecnologia, Comunicació, Sostenibilitat): ${makerTechnicalTags.join(' | ')}
- Observacions docent manuals: ${content.manualObservations?.join('. ') || "Cap"}
- Esborrany highlight (narrativa ràpida del mestre): ${content.maker?.narrative || "Cap"}

### DADES HUMANES (PARÀGRAF 2):
- Etiquetes seleccionades d'aquests IDs (Col·laboració, Error, Autoavaluació): ${makerHumanTags.join(' | ')}

${pureMakerRecs.length > 0 ? `### RECOMANACIONS I ORIENTACIONS PER AL FUTUR:
${pureMakerRecs.map(r => `- ${r}`).join('\n')}
Integra aquestes recomanacions de manera constructiva i engrescadora.
` : ""}

### DADES DE L'ALUMNE/A:
- Nom: ${studentFirstName}
- Gènere: ${info.gender}
- To: ${toneInstruction || "Pedagògic, respectuós i constructiu"}
- Trimestre: ${trimesterId}
- Idioma: Català.
`.trim();
  }

  if (isPurePlanetaBlau) {
    const purePbEvolution = content.evolutionPhrases || [];
    const purePbRecs = content.recommendations || [];
    return `
### ROL: FACILITADOR/A DE L'ESPAI PLANETA BLAU - ESPECIALISTA
Ets l'especialista de l'espai d'aprenentatge Planeta Blau. No ets el tutor de l'aula.
${historyPrompt}

${purePbEvolution.length > 0 ? `### FRASES D'EVOLUCIÓ VALIDADES PEL MESTRE:
${purePbEvolution.map(p => `- "${p}"`).join('\n')}
Integra aquestes evidències d'evolució al llarg del redactat.
` : ""}

### INSTRUCCIONS DE RIGOR (CRÍTIQUES):
- Menciona TOTS els ítems i matisos avaluats. No ometis cap dada d'investigació, idees científiques, resolució de reptes, comunicació o treball cooperatiu.
- Descriu honestament tant els punts forts com els aspectes a consolidar amb to constructiu.
- Parla de reptes, experiments i investigacions en plural.
- Comença OBLIGATÒRIAMENT amb aquesta FRASE INICIAL literal:
"${PLANETA_BLAU_INITIAL_PHRASE.replace('{nom_final}', studentFirstName)}"
- A continuació, narra el procés d'aprenentatge de ${studentFirstName}. L'autoavaluació s'integra dins de la dinàmica de treball (paràgraf 4).
- Finalitza OBLIGATÒRIAMENT i SENSE EXCEPCIÓ amb aquesta FRASE FINAL literal de cloenda blindada (res no pot anar després):
"${PLANETA_BLAU_FINAL_PHRASE.replace('{nom_final}', studentFirstName)}"

### FILOSOFIA:
${PLANETA_BLAU_SYSTEM_INSTRUCTION}

### DADES D'AVALUACIÓ PLANETA BLAU:
- Etiquetes seleccionades i matisos: ${planetaBlauTags.join(' | ')}
- Observacions docent manuals: ${content.manualObservations?.join('. ') || "Cap"}
- Esborrany highlight (narrativa ràpida del mestre): ${content.planetaBlau?.narrative || "Cap"}

${purePbRecs.length > 0 ? `### RECOMANACIONS I ORIENTACIONS DE MILLORA:
${purePbRecs.map(r => `- ${r}`).join('\n')}
Integra aquestes orientacions de manera positiva i constructiva.
` : ""}

### DADES DE L'ALUMNE/A:
- Nom: ${studentFirstName}
- Gènere: ${info.gender}
- To: ${toneInstruction || "Pedagògic, respectuós i constructiu"}
- Trimestre: ${trimesterId}
- Idioma: Català.
`.trim();
  }

  // 4. MODE TUTOR GENERAL (Inclou bloc Maker com a secció final)
  const t3IntroHeader = `
  PER AL TERCER TRIMESTRE (T3), L'INFORME ÉS UN INFORME FINAL DE CURS.
  HA DE COMENÇAR OBLIGATÒRIAMENT AMB AQUESTS TRES PARÀGRAFS QUE RECOLLEIXEN L'ESSÈNCIA DEL CURS SENCER:
  "Al llarg d’aquest curs hem viscut una etapa plena d’experiències compartides i aprenentatges significatius. Hem afrontat nous reptes, hem celebrat èxits i hem construït, pas a pas, un vincle com a grup que ens ha fet créixer plegats. Cada activitat, cada projecte i cada dia viscut a l’aula han estat espais d’enriquiment personal i col·lectiu, on hem après coneixements i també valors que perduraran.
  Hem compartit històries, moments de complicitat i moltes rialles. Les colònies i les propostes fora de l’aula ens han regalat vivències úniques que han ampliat la nostra mirada i han reforçat els llaços entre companys i companyes. El treball cooperatiu i la capacitat per afrontar junts nous reptes han estat claus en aquest camí d’aprenentatge i creixement.
  Ara que tanquem el curs, és un bon moment per mirar enrere i valorar tot el que hem aconseguit. Cadascun dels vostres avenços són motiu de satisfacció. L’interès, la constància i la motivació que heu mostrat al llarg d’aquests mesos són una mostra clara del vostre compromís i ganes d’aprendre."

  Després d'aquests paràgrafs, continua amb el relat individual de l'alumne/a, posant èmfasi en l'evolució global de tot l'any.
  `;

  const evolutionPhrases = content.evolutionPhrases || [];

  const roleTitle = trimesterId === 1
    ? "INFORME D'ACOLLIDA, ADAPTACIÓ I PRIMERS APRENENTATGES (T1)"
    : (trimesterId === 2 
        ? "INFORME DE CONSOLIDACIÓ I RENDIMENT (T2)" 
        : "INFORME FINAL DE CURS (T3)");

  const trimesterFocusInstruction = trimesterId === 1
    ? `### ENFOCAMENT DEL PRIMER TRIMESTRE (T1):
Com que estem al Primer Trimestre, l'informe reflecteix l'arrencada del curs a 4t:
- Centra't en com ha estat l'adaptació a les dinàmiques d'aula, la convivència i el respecte amb els companys, la disposició inicial davant les tasques i el progrés en els primers aprenentatges.
- Mantén una mirada acollidora, constructiva i encoratjadora per al curs.`
    : (trimesterId === 2
        ? `### ENFOCAMENT DEL SEGON TRIMESTRE (T2):
Com que estem al Segon Trimestre, l'informe reflecteix la consolidació del curs:
- Posa l'èmfasi en la constància, els hàbits de treball adquirits, la perseverança davant la dificultat i el progrés en cadascuna de les àrees curriculars.`
        : `### INFORME FINAL (IMPORTANT - T3):
Com que estem al Tercer Trimestre, aquest informe actua com a cloenda de tot el curs escolar. 
- No et quedis només en el que ha passat aquests últims mesos.
- Utilitza el context històric per descriure com ha evolucionat l'alumne des del setembre fins ara.
- L'informe ha de transmetre una sensació de camí recorregut i creixement personal.`);

  return `
### ROL: TUTOR I MENTOR PEDAGÒGIC - ${roleTitle}
Genera un informe escolar fluid en cascada. Evita llistes i negretes.
${historyPrompt}

${trimesterFocusInstruction}

${evolutionPhrases.length > 0 ? `### FRASES D'EVOLUCIÓ SELECCIONADES PEL MESTRE (OBLIGATÒRIES):
El mestre ha validat aquestes frases d'evolució que HAS D'INTEGRAR de manera literal i natural en la narrativa (on millor encaixin segons el context):
${evolutionPhrases.map(p => `- "${p}"`).join('\n')}

IMPORTANT: Per a cadascuna d'aquestes frases d'evolució integrades, l'HAURÀS DE FORMATAR obligatòriament exactament així: [la frase d'evolució](evolution-highlight). Per exemple: "[Amb el pas dels mesos ha guanyat molta seguretat](evolution-highlight)". Això és necessari per ressaltar-les visualment.
` : ""}

### INSTRUCCIONS DE SEGURETAT I RIGOR (MOLT IMPORTANT):
- NO INVENTIS INFORMACIÓ. Només pots escriure sobre les àrees que tenen dades (etiquetes o matisos) a continuació.
- Si una àrea apareix buida o no apareix a la secció d'aprenentatges, NO l'esmentis en absolut a l'informe.
- Si NO hi ha dades o secció d'Espai Maker a continuació, PROHIBIT esmentar l'Espai Maker o fer qualsevol introducció sobre Maker.
- Si NO hi ha dades o secció de Planeta Blau a continuació, PROHIBIT esmentar Planeta Blau o fer qualsevol introducció sobre Planeta Blau.
- L'objectiu és la fidelitat absoluta a les dades seleccionades pel mestre.

### INSTRUCCIONS DE SEQÜÈNCIA (CRÍTIQUES):
${trimesterId === 3 ? t3IntroHeader : `- **INICI OBLIGATORI:** L'informe HA DE COMENÇAR directament amb la frase: "En aquest ${currentTrimesterName} trimestre, [L'article] [Nom]...". No incloguis cap títol, ni data, ni introducció genèrica.`}
- En l'àrea d'Educació Física, l'estructura ha de seguir OBLIGATÒRIAMENT l'Opció A:
    1. Comença amb: "Durant aquest trimestre, a l'àrea d'educació física, hem estat treballant la iniciació als esports de raqueta, un context on [Nom] [frase de ef_joc sobre coordinació/colpeig]."
    2. Continua amb: "A més, hem continuat amb el treball de les habilitats motrius bàsiques, on ha pogut demostrar [frase de ef_hmb sobre control corporal/equilibri]."
    3. La resta d'ítems (Esforç, Respecte, Hàbits) s'han d'integrar a continuació de manera fluida.
- En l'àrea de llengua:
  * Si l'alumne/a TÉ conferència d'expressió oral en aquest trimestre (OPCIÓ 1): Desplega la conferència com a obertura de l'àrea (començant per "Pel que fa a l’àrea de llengua, i de manera especial en l’expressió oral, [L'article] [Nom] ha dut a terme una [bona / molt bona] conferència sobre «[Tema]»..."), seguida dels 3 paràgrafs canònics (obertura i singularitat, exposició i suport, procés i reptes de futur), i conclou l'àrea enllaçant amb la comprensió lectora i l'expressió escrita a l'aula ("D'altra banda, pel que fa a la comprensió lectora i el treball escrit a l'aula, ...").
  * Si l'alumne/a NO té conferència en aquest trimestre: Comença amb: "En l’àrea de llengua i literatura, [L'article] [Nom] mostra [contingut de l'ítem seleccionat]...".
${trimesterId === 1 ? `- **ESTRUCTURA OBLIGATÒRIA DE MATEMÀTIQUES (T1 - 4 PARÀGRAFS SEPARATS):**
  Quan redactis l'àrea de matemàtiques al primer trimestre, NO l'ajuntis tot en un sol paràgraf dens. Has de construir OBLIGATÒRIAMENT 4 paràgrafs ben diferenciats i separats per un salt de línia, seguint aquest ordre lògic:
  1. **Paràgraf 1 (Sentit numèric i operacions):** Comença amb "Pel que fa a les matemàtiques..." i desenvolupa com llegeix, escriu i comprèn els nombres (fins a 6 xifres) i la seva precisió en el càlcul d'operacions bàsiques (sumes, restes i taules).
  2. **Paràgraf 2 (Raonament i estratègies multiplicatives):** Centra't exclusivament en CÒM PENSA: com dedueix nous resultats a partir d'operacions conegudes, com explica el seu raonament i com utilitza models visuals (files i columnes) per relacionar multiplicació i divisió com a repartiment.
  3. **Paràgraf 3 (Resolució de problemes i comunicació):** Analitza com comprèn els reptes quotidians, com selecciona l'estratègia correcta i la qualitat de la resposta escrita que redacta.
  4. **Paràgraf 4 (Geometria i reptes de futur):** Descriu la seva visió espacial, orientació i classificació de figures i triangles, i conclou amb els reptes pedagògics concrets a seguir treballant al segon trimestre.` : ""}
- En la resta d'àrees, integra la informació de manera fluida segons aparegui.
- Integra tota la informació de manera narrativa i cohesionada.

### ESTRUCTURA DE LA NARRATIVA (ORDRE ESTRICTE):

1. PERSONALITAT I ESSÈNCIA:
   - Introducció/Frase Pont: ${intro.join(' | ')}
   - Trets: ${traits.join(' | ')}
   - Anècdota: ${content.anecdote || "No n'hi ha"}
   - Autoevaluació: ${content.selfAssessment || "No n'hi ha"}

2. DINÀMICA D'AULA I HÀBITS:
   - Hàbits: ${habits.join(' | ')}
   - Observacions manuals: ${content.manualObservations?.join('. ')}

3. APRENENTATGES ACADÈMICS (NOMÉS ELS QUE TINGUIN DADES):
${academicSections.length > 0 ? academicSections.join('\n') : "No hi ha dades acadèmiques marcades. No inventis res d'aquest bloc."}

${content.recommendations && content.recommendations.length > 0 ? `
ORIENTACIONS I RECOMANACIONS PER AL PROGRÉS (PER A LA FAMÍLIA I L'ALUMNE/A):
${content.recommendations.map(r => `- ${r}`).join('\n')}
INSTRUCCIÓ: Integra aquestes recomanacions o propostes de millora de manera constructiva, càlida i motivadora en la conclusió de les valoracions generals.
` : ""}
${hasMakerData ? `
4. SECCIÓ ESPAI MAKER (BLOC INDEPENDENT):
   ### FILOSOFIA I REGLES MAKER (TOTALITAT I CLARETAT):
   ${MAKER_SYSTEM_INSTRUCTION}
   
   DADES PER AL PARÀGRAF 1 (TÈCNIC):
   - ${makerTechnicalTags.join(' | ')}
   - Esborrany highlight: ${content.maker?.narrative || ""}
   
   DADES PER AL PARÀGRAF 2 (HUMÀ):
   - ${makerHumanTags.join(' | ')}
   
   IMPORTANT: Integra aquestes dades seguint els principis de totalitat i dualitat. Si hi ha dades contradictòries o nivells baixos, reflecteix-ho amb claredat pedagògica.
` : ""}
${hasPlanetaBlauData ? `
5. SECCIÓ ESPAI PLANETA BLAU (BLOC SEPARAT CONSECUTIU DESPRÉS DE MAKER):
   ### FILOSOFIA I REGLES PLANETA BLAU (TOTALITAT I CLARETAT):
   ${PLANETA_BLAU_SYSTEM_INSTRUCTION}
   
   DADES D'AVALUACIÓ PLANETA BLAU:
   - ${planetaBlauTags.join(' | ')}
   - Esborrany highlight: ${content.planetaBlau?.narrative || ""}
   
   INSTRUCCIONS DE REDACCIÓ PER A PLANETA BLAU:
   - Situa aquesta secció com un bloc independent separat consecutiu just després de Maker (o al final de l'informe si l'alumne no té Maker).
   - Comença aquest bloc OBLIGATÒRIAMENT amb la FRASE INICIAL institucional exacta:
   "${PLANETA_BLAU_INITIAL_PHRASE.replace('{nom_final}', studentFirstName)}"
   - Integra TOTS els ítems i matisos avaluats (inclosa l'autoavaluació en la dinàmica de treball).
   - Conclou aquest bloc OBLIGATÒRIAMENT amb la FRASE FINAL de cloenda blindada (és la conclusió definitiva que tanca Planeta Blau; res no pot anar després):
   "${PLANETA_BLAU_FINAL_PHRASE.replace('{nom_final}', studentFirstName)}"
` : ""}

### DADES DE L'ALUMNE:
- Nom: ${studentFirstName}
- Gènere: ${info.gender}
- To: ${toneInstruction}
- Trimestre: ${trimesterId}
- Idioma: Català.
`.trim();
};
