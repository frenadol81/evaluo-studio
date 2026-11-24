
/**
 * Factoria de dades de prova (Mock Data) per a Evaluo Studio.
 * GARANTIA: 3 perfils integrals amb marques en TOTS els 33 ítems.
 * ELS STRINGS SÓN CÒPIES EXACTES DE LES RÚBRIQUES PER GARANTIR EL CHECK VISUAL.
 */

export const MOCK_PROFILES = {
  HIGH_ACADEMIC: {
    studentName: "Marc Ventura",
    gender: "Masculí",
    hasIndividualPlan: false,
    selectedObservations: [
      // PERSONALITAT (12/12)
      "S'avança a les necessitats; busca què pot fer un cop ha acabat la seva tasca.", 
      "Posa molta dedicació en el seu treball, independentment del resultat final.", 
      "Treballa sol sense necessitar guia constant; gestiona el seu material correctament.", 
      "Aporta idees nou i diferents; busca solucions originals als problemes.", 
      "Transmet bon humor i optimisme; la seva actitud facilita un clima positiu a l'aula.", 
      "Entén i se solidaritza amb els sentiments dels altres; sap escoltar.", 
      "Molt sociable; s'expressa amb facilitat i seguretat davant dels altres.", 
      "Guia el grup de manera constructiva, motivant i incloent tothom.", 
      "Sap on té les coses i planifica bé els passos de la seva feina.", 
      "És capaç de concentrar-se profundament en una sola tasca sense distreure's.", 
      "Té un ritme de treball viu; entén i executa les tasques amb rapidesa.", 
      "Pensa abans de parlar o actuar; analitza bé la situació o el problema.", 

      // HÀBITS (9/9)
      "Actua com a referent positiu i mostra habilitats de mediació per resoldre conflictes de manera proactiva.",
      "Mostra una actitud molt implicada, curiosa i orientada a superar reptes.",
      "Analitza l'origen de l'error, proposa alternatives i ajusta la seva estratègia de manera autònoma.",
      "Participa amb seguretat, escolta activament i enriqueix el diàleg col·lectiu connectant idees.",
      "Anticipa necessitats, gestiona els seus propis recursos de consulta i orienta els companys.",
      "Gestiona molt bé el temps, s'organitza sense recordatoris i adapta el ritme segons la tasca.",
      "Treballs rigorosos, reflexius i amb una clara voluntat d’anar més enllà.",
      "Presentació molt acurada i exemplar.",
      "Mostra una responsabilitat exemplar i cuida també el material compartit.",

      // LLENGUA (8/8)
      "Analitza la intencionalitat, dedueix idees implícites i realitza síntesis de textos diversos.",
      "Capta el sentit global i els detalls; respon de forma crítica o argumentada a l'interacció de l'aula.",
      "Discurs estructurat i ric en vocabulari. Domina el to i l'expressivitat per captar l'atenció.",
      "Textos perfectament organitzats amb punts i comes que faciliten la lectura. Ús variat i precís de connectors.",
      "Demostra una gran iniciativa creativa amb idees originals. Utilitza un vocabulari ric, precís i variat, incorporant adjectius i recursos expressius per enriquir el text.",
      "Aplica correctament la normativa treballada i l'ortografia d'ús. Demostra autonomia total en l'autocorrecció i revisió final del text.",
      "Presentació impecable que denota ordre i polidesa. Marges ben definits i distribució espacial harmònica. Cal·ligrafia fluida, proporcionada i perfectament llegible.",
      "Reflexiona de forma profunda i autònoma, connectant conceptes i proposant-se reptes de millora.",

      // MATEMÀTIQUES (4/4)
      "En relació amb l’àrea de matemàtiques, s’interessa pel contingut que es treballa a l’aula i participa en les converses matemàtiques que es produeixen, on comparteix idees, compara estratègies i explica el seu raonament.",
      "Té assolides les taules de multiplicar i que en fa ús a l’hora de fer càlcul mental on intervingui la multiplicació, i ha trobat la utilitat de saber-se les taules per aplicar-les en un context de la vida real. A l’hora de realitzar multiplicacions amb factors elevats, ha entès i sap aplicar amb facilitat l’estratègia de la multiplicació per àrees o per descomposició dels nombres.",
      "Pel que fa a la divisió, l’ha entès com a repartiment i és capaç d’utilitzar diferents recursos (capsetes multiplicatives, repartiments, esquemes, algoritme) per resoldre tant situacions concretes i contextualitzades com situacions més abstractes.",
      "Identifica clarament les dades i la pregunta dels problemes, tria l'estratègia més eficient i és capaç de verificar si el resultat és lògic. Resol situacions complexes de forma autònoma i sap explicar el procés seguit."
    ],
    observations: "Alumne amb un rendiment excepcional.",
    anecdote: "Va liderar la setmana de la ciència amb un entusiasme contagiós.",
    selfAssessment: "Valora amb molta precisió els seus punts de millora."
  },

  AVERAGE_MAKER: {
    studentName: "Júlia Soler",
    gender: "Femení",
    hasIndividualPlan: false,
    selectedObservations: [
      // PERSONALITAT (12/12)
      "Té ganes de saber més; pregunta i investiga sobre els temes tractats.", 
      "Treballa de forma regular durant tot el trimestre, mantenint l'esforç.",
      "Busca solucions pràctiques als problemes quotidians sense bloquejar-se.",
      "S'adapta bé als canvis de grup, d'activitat o de normes sense frustrar-se.",
      "Ajuda els altres i comparteix el seu temps o materials sense problemes.",
      "Busca solucions en els conflictes; ajuda a fer que el grup estigui en harmonia.",
      "Es relaciona amb seguretat i obertura amb el grup d'iguals.",
      "Defensa la seva opinió amb respecte, sense ser agressiu ni deixar-se influenciar.",
      "Molt precís; té cura de tots els detalls i de la polidesa del treball.",
      "Escolta i segueix les explicacions amb atenció; està pendent del que passa a classe.",
      "Fa la feina ben feta en un temps adequat; aprofita bé les estones de classe.",
      "Actua amb cautela i seny; no pren riscos innecessaris i és respectuós.",

      // HÀBITS (9/9)
      "Està ben integrat/da i manté una convivència positiva i respectuosa.",
      "Manté una actitud positiva, constant i amb voluntat de millora.",
      "Accepta l’error com a part de l’aprenentatge i persevera.",
      "Participa activament i expressa idees amb claredat.",
      "Treballa de manera autònoma, pren decisions i mostra iniciativa.",
      "Manté un ritme adequat i constant en les activitats.",
      "Treballs complets, ben elaborats i amb bon nivell d’aprofundiment.",
      "Presentació ordenada, clara i polida.",
      "És responsable amb el material propi i d’aula.",

      // LLENGUA (8/8)
      "Identifica la intencionalitat, localitza informació explícita i dedueix la implícita sovint.",
      "Mostra una comprensió oral correcta i fluida en les diferents interaccions habituals.",
      "S’expressa amb seguretat i claredat. Cuida el to de veu i la pronunciació de forma conscient.",
      "Idees ordenades amb una estructura clara. Utilitza la puntuació bàsica i alguns connectors per unir frases.",
      "Proposa idees originals i adequades al tema. Utilitza un vocabulari correcte i variat, evitant repeticions innecessàries de paraules comodí.",
      "Aplica les normes ortogràfiques treballades amb pocs errors. Revisa el text seguint les pautes de millora.",
      "Té cura de la presentació, respectant marges i polidesa. La cal·ligrafia és clara i entenedora en tot el text.",
      "Mostra interès per reflexionar. Escrits extensos on aplica les normes i consells donats.",

      // MATEMÀTIQUES (4/4)
      "En relació amb l’àrea de matemàtiques, s’interessa pel contingut que es treballa a l’aula i acostuma a participar en les converses matemàtiques que es produeixen, a vegades comparteix algunes idees o estratègies i explica el seu raonament.",
      "Té assolides la majoria de les taules de multiplicar, però encara presenta algun dubte, estaria bé que les practiqui per tal d’agafar més agilitat. A l’hora de realitzar multiplicacions amb factors elevats, ha après i aplica, tot i que encara necessita alguna indicació, les estratègies de la multiplicació per àrees i per descomposició.",
      "Pel que fa a la divisió, l’ha entès com a repartiment i és capaç d’utilitzar alguns recursos (capseta multiplicativa, esquemes, material manipulatiu) per resoldre una situació concreta i contextualitzada. Quant a l’algoritme de la divisió, està en procés de saber-lo utilitzar correctament i aplicar-lo en diferents situacions.",
      "Identifica les dades i la pregunta dels problemes i aplica estratègies adequades per resoldre'ls. Acostuma a arribar a la solució correcta, tot i que a vegades necessita revisar el procés per assegurar la coherència del resultat."
    ],
    observations: "Alumna molt creativa i col·laborativa.",
    anecdote: "Va ajudar espontàniament a organitzar la biblioteca de l'aula.",
    selfAssessment: "Molt positiva i encoratjadora."
  },

  LOW_SUPPORT: {
    studentName: "Pau Rius",
    gender: "Masculí",
    hasIndividualPlan: true,
    selectedObservations: [
      // PERSONALITAT (12/12)
      "Es distreu amb qualsevol estímul; comença moltes coses però no les acaba.", 
      "El seu esforç i actitud pugen i baixen; un dia treballa molt i l'altre gens.",
      "Li falta confiança en ell mateix tot i ser capaç de fer les coses.",
      "Li costen molt els canvis; vol que tot es faci sempre de la mateixa manera.",
      "Es mostra desanimat o amb poca energia vital durant la jornada escolar.",
      "Entén i se solidaritza amb els sentiments dels altres; sap escoltar.",
      "Se sent incòmode o vergonyós en situacions socials o en parlar en públic.",
      "No sap dir que no o no s'atreveix a expressar el que realment pensa.",
      "Molt desordenat; perd els fulls, té la taula plena i no segueix cap mètode.",
      "Es perd sovint en els seus pensaments; sembla estar 'als núvols' durant la classe.",
      "El seu ritme de treball és molt inferior al de la classe, sovint per falta d'agilitat.",
      "Actua abans de pensar; respon o fa les coses sense llegir bé les indicacions.",

      // HÀBITS (9/9)
      "S’integra de manera progressiva, with suport puntual.",
      "Té una actitud variable; necessita estímuls externs.",
      "Es frustra davant l’error i tendeix a abandonar.",
      "Participa quan se li demana; aportacions simples.",
      "Depèn constantment de l’adult per iniciar i continuar les tasques.",
      "Ritme poc adequat; li costa acabar les tasques en el temps previst.",
      "Mostra esforç, però amb un nivell d’aprofundiment irregular.",
      "Presentació desordenada o poc cuidada.",
      "Necessita recordatoris constants per tenir cura del material.",

      // LLENGUA (8/8)
      "Té dificultats per identificar la idea principal i requereix suport per comprendre el text.",
      "Comprèn només informació molt explícita; dificultats per seguir interaccions complexes.",
      "S’expressa amb inseguretat i frases curtes.",
      "Text sense ordre lògic ni puntuació. Las idees es barregen sense connectors ni pauses que les separin.",
      "Escrits molt breus i sense iniciativa creativa. Repeteix constantment les mateixes paraules i no s'aprecia esforç per variar el lèxic.",
      "Dificultats greus en l'ortografia de base i léxic habitual que dificulten notablement la comprensió del text.",
      "Absència d'ordre i polidesa. Marges inexistents i cal·ligrafia molt desorganitzada que impedeix la correcció del text.",
      "Mostra poca motivació o dificultats per expressar què ha après o com se sent.",

      // MATEMÀTIQUES (4/4)
      "En relació amb l’àrea de matemàtiques, mostra dificultats per participar en les converses de l’aula i necessita suport per expressar idees o seguir els raonaments dels companys.",
      "Presenta dificultats significatives en l’aprenentatge de les taules de multiplicar. A l’hora de realitzar multiplicacions amb factors elevats, requereix acompanyament constant i l'ús de suport visual o manipulatiu per aplicar les estratègies.",
      "Pel que fa a la divisió, mostra dificultats per comprendre el concepte de repartiment. Necessita l'ajuda directa de l'adult i l'ús constant de materials manipulatius per resoldre operacions senzilles i seguir els passos de l'algoritme.",
      "Presenta dificultats per comprendre el que demana el problema. Necessita acompanyament constant per identificar les dades, representar la situació i decidir quina operació ha de realitzar."
    ],
    observations: "Alumne que necessita reforç positiu constant.",
    anecdote: "Va ser el primer a consolar un company que havia caigut al pati.",
    selfAssessment: "Li costa veure els seus èxits, cal treballar l'autoconcepte."
  }
};

export const getMockProfilesList = () => [
  { id: 'profile_a', title: 'Alt Rendiment Integral', data: MOCK_PROFILES.HIGH_ACADEMIC, color: 'emerald' },
  { id: 'profile_b', title: 'Perfil Mitjà / Maker', data: MOCK_PROFILES.AVERAGE_MAKER, color: 'amber' },
  { id: 'profile_c', title: 'Suport / Líder Emocional', data: MOCK_PROFILES.LOW_SUPPORT, color: 'rose' }
];
