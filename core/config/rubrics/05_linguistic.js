
export const RUBRIC_LINGUISTIC = {
  id: 'ambit_linguistic',
  title: 'Àmbit Lingüístic',
  inputType: 'GRID_4_LEVELS',
  levels: ['Inici', 'En progrés', 'Assolit', 'Avançat'],
  data: [
    {
      id: 'l_comp_oral',
      label: 'Comprensió Oral',
      options: [
        "Comprèn només informació molt explícita; dificultats per seguir interaccions complexes.",
        "Identifica la informació principal, però perd matisos o detalls concrets del discurs.",
        "Mostra una comprensió oral correcta i fluida en les diferents interaccions habituals.",
        "Capta el sentit global i els detalls; respon de forma crítica o argumentada a les interaccions de l'aula."
      ]
    },
    {
      id: 'l_expr_oral',
      label: 'Expressió Oral',
      options: [
        "Mostra dificultats per estructurar les oracions i ordenar les idees quan parla; elabora un discurs senzill o fragmentat que necessita guiatge per fer-se entendre amb claredat.",
        "S’expressa de manera entenedora en les situacions d'aula, tot i que utilitza estructures d'oració simples i un vocabulari bàsic, necessitant suport puntual per organitzar el discurs.",
        "Estructura el seu discurs amb ordre i coherència. Enllaça les idees amb claredat, fa servir un vocabulari adequat i manté un to de veu i pronunciació que faciliten la comprensió.",
        "Elabora un discurs molt ben estructurat, cohesionat i ric en vocabulari. Exposa idees amb gran claredat i precisió lèxica, utilitza connectors variats i adapta la seva expressió a cada situació."
      ]
    },
    {
      id: 'l_comp_lect',
      label: 'Comprensió Lectora',
      options: [
        "Pel que fa a la comprensió lectora, presenta dificultats per identificar la idea principal i necessita suport constant de l'adult per extreure el sentit global del text, fins i tot en lectures senzilles.",
        "Pel que fa a la comprensió lectora, localitza informació explícita amb certa facilitat, tot i que encara li costa realitzar inferències senzilles o resumir les idees principals del text sense una guia directa.",
        "Pel que fa a la comprensió lectora, identifica la intencionalitat de l'autor i dedueix informació implícita de forma habitual. És capaç de sintetitzar els punts clau del text i explicar-los amb les seves pròpies paraules.",
        "Pel que fa a la comprensió lectora, analitza críticament la intencionalitat i el sentit figurat en textos diversos. Realitza síntesis precises, connecta el contingut amb coneixements previs i mostra una gran autonomia lectora."
      ]
    },
    {
      id: 'l_creativitat',
      label: 'Creativitat i Vocabulari',
      options: [
        "Escrits molt breus i sense iniciativa creativa. Repeteix constantment les mateixes paraules i no s'aprecia esforç per variar el lèxic.",
        "Els textos són senzills i predictibles. El vocabulari és bàsic i es detecten algunes repeticions que limiten la qualitat del relat.",
        "Proposa idees originals i adequades al tema. Utilitza un vocabulari correcte i variat, evitant repeticions innecessàries de paraules comodí.",
        "Demostra una gran iniciativa creativa amb idees originals. Utilitza un vocabulari ric, precís i variat, incorporant adjectius i recursos expressius per enriquir el text."
      ]
    },
    {
      id: 'l_coherencia',
      label: 'Coherència i Estructura',
      options: [
        "Text sense ordre lògic ni puntuació. Les idees es barregen sense connectors ni pauses que les separin.",
        "Estructura bàsica però repetitiva. Ús limitat de connectors i puntuació sovint absent o incorrecta.",
        "Idees ordenades amb una estructura clara. Utilitza la puntuació bàsica i alguns connectors per unir frases.",
        "Textos perfectament organitzats amb punts i comes que faciliten la lectura. Ús variat i precís de connectors."
      ]
    },
    {
      id: 'l_ortografia',
      label: 'Ortografia',
      options: [
        "Dificultats greus en l'ortografia de base i lèxic habitual que dificulten notablement la comprensió del text.",
        "Presenta dubtes i errors freqüents en l'ortografia d'ús i regles bàsiques. Necessita suport per detectar i corregir les faltes.",
        "Aplica les normes ortogràfiques treballades amb pocs errors. Revisa el text seguint les pautes de millora.",
        "Aplica correctament la normativa treballada i l'ortografia d'ús. Demostra autonomia total en l'autocorrecció i revisió final del text."
      ]
    },
    {
      id: 'l_caligrafia',
      label: 'Presentació i Cal·ligrafia',
      options: [
        "Absència d'ordre i polidesa. Marges inexistents i cal·ligrafia molt desorganitzada que impedeix la correcció del text.",
        "Presentació poc acurada. Cal·ligrafia irregular que dificulta la lectura àgil.",
        "Té cura de la presentació, respectant marges i polidesa. La cal·ligrafia és clara i entenedora en tot el text.",
        "Presentació impecable que denota ordre i polidesa. Marges ben definits i distribució espacial harmònica. Cal·ligrafia fluida, proporcionada i perfectament llegible."
      ]
    },
    {
      id: 'l_bitacola',
      label: 'Diari de Bitàcola',
      options: [
        "Mostra poca motivació o dificultats per expressar què ha après o com se sent.",
        "Descriu l'activitat de forma senzilla, amb poca reflexió personal sobre el seu aprenentatge.",
        "Mostra interès per reflexionar. Escrits extensos on aplica les normes i consells donats.",
        "Reflexiona de forma profunda i autònoma, connectant conceptes i proposant-se reptes de millora."
      ]
    }
  ]
};
