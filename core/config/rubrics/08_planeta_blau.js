import { autoavaluacioPerNivell, comunicacioNivell2, implicacioPerNivell, organitzacioNivell2 } from '../planetaBlauFamilyWriting.js';

export const RUBRIC_PLANETA_BLAU = {
  id: 'ambit_planeta_blau',
  title: 'Àmbit Planeta Blau',
  inputType: 'GRID_4_LEVELS',
  levels: ['1', '2', '3', '4'],
  blocks: [
    {
      id: 'aprenentatge_cientific',
      title: 'Aprenentatge científic',
      criteriaIds: ['comprenc', 'investigo', 'aplico', 'comunico']
    },
    {
      id: 'manera_de_treballar',
      title: 'Manera de treballar',
      criteriaIds: ['organitzo', 'implico', 'autoavaluacio']
    }
  ],
  data: [
    {
      id: 'comprenc',
      order: 1,
      block: 'aprenentatge_cientific',
      label: 'COMPRÈN',
      docentTitle: 'COMPRÈN',
      description: 'Comprensió de les idees científiques i relació amb les experiències.',
      whatEvaluates: 'Comprendre les idees de densitat i flotació, electricitat i canvi climàtic; relacionar-les amb les experiències; utilitzar-les per interpretar situacions noves.',
      senseEvidencies: "Encara no es disposa de prou evidències per valorar la comprensió de les idees científiques.",
      optionsByLevel: {
        '1': "{nom} necessita acompanyament freqüent per comprendre els conceptes científics treballats i per relacionar-los amb les experiències de les caixes.",
        '2': "{nom} avança en la comprensió dels conceptes científics treballats, tot i que encara necessita suport per explicar-los amb precisió i relacionar-los amb les experiències de les caixes.",
        '3': "{nom} comprèn les idees científiques treballades sobre densitat i flotació, electricitat i canvi climàtic, i les relaciona amb autonomia amb les observacions i les experiències de les caixes.",
        '4': "{nom} comprèn amb precisió les idees científiques treballades sobre densitat i flotació, electricitat i canvi climàtic, les relaciona amb les experiències de les caixes i les utilitza per interpretar situacions noves."
      },
      options: [
        "{nom} necessita acompanyament freqüent per comprendre els conceptes científics treballats i per relacionar-los amb les experiències de les caixes.",
        "{nom} avança en la comprensió dels conceptes científics treballats, tot i que encara necessita suport per explicar-los amb precisió i relacionar-los amb les experiències de les caixes.",
        "{nom} comprèn les idees científiques treballades sobre densitat i flotació, electricitat i canvi climàtic, i les relaciona amb autonomia amb les observacions i les experiències de les caixes.",
        "{nom} comprèn amb precisió les idees científiques treballades sobre densitat i flotació, electricitat i canvi climàtic, les relaciona amb les experiències de les caixes i les utilitza per interpretar situacions noves."
      ]
    },
    {
      id: 'investigo',
      order: 2,
      block: 'aprenentatge_cientific',
      label: 'INVESTIGA',
      docentTitle: 'INVESTIGA',
      description: 'Registre i interpretació de resultats, contrast amb prediccions i elaboració de conclusions recolzades en proves.',
      whatEvaluates: 'Registrar observacions i dades rellevants, comparar-les amb les prediccions i fonamentar conclusions en els resultats.',
      senseEvidencies: "Encara no es disposa de prou evidències per valorar el registre i la interpretació de resultats.",
      optionsByLevel: {
        '1': "A l’hora d’investigar, necessita acompanyament freqüent per registrar observacions o dades rellevants, comparar els resultats amb les prediccions i elaborar conclusions a partir de les proves recollides.",
        '2': "A l’hora d’investigar, registra observacions i dades; amb orientació, les compara amb les prediccions inicials i n’extreu conclusions senzilles.",
        '3': "A l’hora d’investigar, registra i compara observacions o dades amb autonomia, contrasta els resultats amb les prediccions i utilitza les proves recollides per justificar les conclusions.",
        '4': "A l’hora d’investigar, registra i interpreta les dades amb autonomia, contrasta els resultats amb les prediccions i justifica les conclusions amb proves. A més, identifica què permeten afirmar els resultats i què caldria comprovar millor."
      },
      options: [
        "A l’hora d’investigar, necessita acompanyament freqüent per registrar observacions o dades rellevants, comparar els resultats amb les prediccions i elaborar conclusions a partir de les proves recollides.",
        "A l’hora d’investigar, registra observacions i dades; amb orientació, les compara amb les prediccions inicials i n’extreu conclusions senzilles.",
        "A l’hora d’investigar, registra i compara observacions o dades amb autonomia, contrasta els resultats amb les prediccions i utilitza les proves recollides per justificar les conclusions.",
        "A l’hora d’investigar, registra i interpreta les dades amb autonomia, contrasta els resultats amb les prediccions i justifica les conclusions amb proves. A més, identifica què permeten afirmar els resultats i què caldria comprovar millor."
      ]
    },
    {
      id: 'aplico',
      order: 3,
      block: 'aprenentatge_cientific',
      label: 'APLICA',
      docentTitle: 'APLICA',
      description: 'Ús dels aprenentatges per proposar, provar, valorar o millorar solucions i accions davant dels reptes.',
      whatEvaluates: 'Utilitzar coneixements científics per proposar solucions, posar-les a prova quan correspongui i introduir-hi millores justificades.',
      senseEvidencies: "Encara no es disposa de prou evidències per valorar l'ús dels aprenentatges davant dels reptes.",
      optionsByLevel: {
        '1': "Davant dels reptes de Planeta Blau, necessita acompanyament freqüent per utilitzar els coneixements científics treballats i participar en la proposta, la prova o la millora d’una solució.",
        '2': "També necessita acompanyament per aplicar aquests coneixements als reptes, proposar solucions i valorar quines millores hi pot introduir.",
        '3': "Davant dels reptes de Planeta Blau, utilitza amb autonomia els coneixements científics treballats per proposar solucions, posar-les a prova o valorar-ne la viabilitat i introduir-hi millores d’acord amb els resultats.",
        '4': "Davant dels reptes de Planeta Blau, utilitza amb autonomia els coneixements científics treballats per comparar possibles solucions, provar-les o valorar-ne la viabilitat i justificar quina respon millor al repte i com es podria millorar."
      },
      options: [
        "Davant dels reptes de Planeta Blau, necessita acompanyament freqüent per utilitzar els coneixements científics treballats i participar en la proposta, la prova o la millora d’una solució.",
        "També necessita acompanyament per aplicar aquests coneixements als reptes, proposar solucions i valorar quines millores hi pot introduir.",
        "Davant dels reptes de Planeta Blau, utilitza amb autonomia els coneixements científics treballats per proposar solucions, posar-les a prova o valorar-ne la viabilitat i introduir-hi millores d’acord amb els resultats.",
        "Davant dels reptes de Planeta Blau, utilitza amb autonomia els coneixements científics treballats per comparar possibles solucions, provar-les o valorar-ne la viabilitat i justificar quina respon millor al repte i com es podria millorar."
      ]
    },
    {
      id: 'comunico',
      displayOptionsByLevel: { '2': comunicacioNivell2 },
      order: 4,
      block: 'aprenentatge_cientific',
      label: 'COMUNICA',
      docentTitle: 'COMUNICA',
      description: 'Claredat, ordre i adequació de les explicacions sobre el procés i els descobriments.',
      whatEvaluates: 'Explicar què s’ha fet, quins resultats s’han obtingut i què s’ha après, amb ordre i claredat.',
      senseEvidencies: "Encara no es disposa de prou evidències per valorar la comunicació del treball científic.",
      optionsByLevel: {
        '1': "Quan comunica el treball científic, necessita acompanyament freqüent per explicar què ha fet, quins resultats ha obtingut i què ha après en les activitats de Planeta Blau.",
        '2': "Quan comparteix el que ha après, sap exposar les idees principals de les activitats i els descobriments. El seu proper pas és ordenar millor les explicacions, incloure la informació necessària per entendre el procés i fer servir el vocabulari científic amb més precisió.",
        '3': "Quan comunica el treball científic, explica amb autonomia, ordre i claredat què ha fet, quins resultats ha obtingut i què ha après, i utilitza el vocabulari científic treballat de manera adequada.",
        '4': "Quan comunica el treball científic, explica amb precisió el procés, els resultats i els aprenentatges de Planeta Blau, i selecciona les paraules, els dibuixos o els exemples més adequats perquè les altres persones entenguin l’explicació."
      },
      options: [
        "Quan comunica el treball científic, necessita acompanyament freqüent per explicar què ha fet, quins resultats ha obtingut i què ha après en les activitats de Planeta Blau.",
        "Quan comparteix el que ha après, sap exposar les idees principals de les activitats i els descobriments. El seu proper pas és ordenar millor les explicacions, incloure la informació necessària per entendre el procés i fer servir el vocabulari científic amb més precisió.",
        "Quan comunica el treball científic, explica amb autonomia, ordre i claredat què ha fet, quins resultats ha obtingut i què ha après, i utilitza el vocabulari científic treballat de manera adequada.",
        "Quan comunica el treball científic, explica amb precisió el procés, els resultats i els aprenentatges de Planeta Blau, i selecciona les paraules, els dibuixos o els exemples més adequats perquè les altres persones entenguin l’explicació."
      ]
    },
    {
      id: 'organitzo',
      displayOptionsByLevel: { '2': organitzacioNivell2 },
      order: 5,
      block: 'manera_de_treballar',
      label: 'S’ORGANITZA',
      docentTitle: 'S’ORGANITZA',
      description: 'Consulta de consignes, seguiment de fases, compliment del rol i autonomia per organitzar la tasca.',
      whatEvaluates: 'Consultar les consignes i els recursos, seguir les fases de treball i complir les responsabilitats del rol.',
      senseEvidencies: "Encara no es disposa de prou evidències per valorar l'organització del treball.",
      optionsByLevel: {
        '1': "{nom} presenta dificultats notables per organitzar la feina i seguir les passes establertes; necessita guiatge constant i supervisió directa per consultar les consignes, avançar en les fases de l'activitat i assumir el seu rol dins de l'equip.",
        '2': "{nom} s'organitza amb un acompanyament freqüent; sovint li costa mantenir l'ordre i seguir el fil de les fases de treball de manera autònoma sense recordatoris o indicacions per part del docent.",
        '3': "{nom} en l’organització del treball, consulta les consignes i els recursos disponibles, segueix les fases de les activitats i compleix amb autonomia les responsabilitats del seu rol dins de l’equip.",
        '4': "{nom} en l’organització del treball, consulta les consignes, segueix les fases i compleix el seu rol amb autonomia. A més, revisa com avança l’equip i proposa ajustos perquè la feina estigui més ben organitzada."
      },
      options: [
        "{nom} presenta dificultats notables per organitzar la feina i seguir les passes establertes; necessita guiatge constant i supervisió directa per consultar les consignes, avançar en les fases de l'activitat i assumir el seu rol dins de l'equip.",
        "{nom} s'organitza amb un acompanyament freqüent; sovint li costa mantenir l'ordre i seguir el fil de les fases de treball de manera autònoma sense recordatoris o indicacions per part del docent.",
        "{nom} en l’organització del treball, consulta les consignes i els recursos disponibles, segueix les fases de les activitats i compleix amb autonomia les responsabilitats del seu rol dins de l’equip.",
        "{nom} en l’organització del treball, consulta les consignes, segueix les fases i compleix el seu rol amb autonomia. A més, revisa com avança l’equip i proposa ajustos perquè la feina estigui més ben organitzada."
      ]
    },
    {
      id: 'implico',
      displayOptionsByLevel: Object.fromEntries(implicacioPerNivell.map((frase, index) => [index + 1, frase])),
      order: 6,
      block: 'manera_de_treballar',
      label: 'S’IMPLICA',
      docentTitle: 'S’IMPLICA',
      description: 'Interès, perseverança, escolta, ajuda, cura del material i participació en la recollida.',
      whatEvaluates: 'Interès per les activitats, esforç i perseverança davant les dificultats, escolta i ajuda als companys, cura del material i participació en la recollida.',
      senseEvidencies: "Encara no es disposa de prou evidències per valorar la implicació en el treball compartit.",
      optionsByLevel: {
        '1': "Pel que fa a la implicació en el treball compartit, necessita acompanyament freqüent per interessar-se per les activitats, mantenir l’esforç davant les dificultats, escoltar i ajudar els companys, tenir cura del material i participar en la recollida.",
        '2': "Mostra interès, s’esforça davant les dificultats, escolta i ajuda els companys i té cura del material. En alguns moments, necessita recordatoris per mantenir aquesta implicació fins al final de l’activitat, inclosa la recollida.",
        '3': "Pel que fa a la implicació en el treball compartit, mostra interès per les activitats, manté l’esforç davant les dificultats, escolta i ajuda els companys, té cura del material i assumeix la seva part de la recollida amb responsabilitat.",
        '4': "Pel que fa a la implicació en el treball compartit, mostra interès, busca maneres de continuar davant les dificultats i pren la iniciativa per ajudar els companys i cuidar i recollir el material. Afavoreix la participació de tothom i respecta l’espai dels altres per actuar i aportar idees."
      },
      options: [
        "Pel que fa a la implicació en el treball compartit, necessita acompanyament freqüent per interessar-se per les activitats, mantenir l’esforç davant les dificultats, escoltar i ajudar els companys, tenir cura del material i participar en la recollida.",
        "Mostra interès, s’esforça davant les dificultats, escolta i ajuda els companys i té cura del material. En alguns moments, necessita recordatoris per mantenir aquesta implicació fins al final de l’activitat, inclosa la recollida.",
        "Pel que fa a la implicació en el treball compartit, mostra interès per les activitats, manté l’esforç davant les dificultats, escolta i ajuda els companys, té cura del material i assumeix la seva part de la recollida amb responsabilitat.",
        "Pel que fa a la implicació en el treball compartit, mostra interès, busca maneres de continuar davant les dificultats i pren la iniciativa per ajudar els companys i cuidar i recollir el material. Afavoreix la participació de tothom i respecta l’espai dels altres per actuar i aportar idees."
      ]
    },
    {
      id: 'autoavaluacio',
      displayOptionsByLevel: Object.fromEntries(autoavaluacioPerNivell.map((frase, index) => [index + 1, frase])),
      order: 7,
      block: 'manera_de_treballar',
      label: 'S’AUTOAVALUA',
      docentTitle: 'VII. Capacitat d\'Autoavaluació',
      description: 'Capacitat de valorar el propi treball, esforç i aprenentatges amb realisme metacognitiu.',
      whatEvaluates: 'Analitzar amb honestedat i precisió el propi procés i el resultat final, identificant amb realisme encerts, punts de millora o errades.',
      senseEvidencies: "Encara no es disposa de prou evidències per valorar la capacitat d'autoavaluació.",
      optionsByLevel: {
        '1': "Pel que fa a l’autoavaluació, necessita acompanyament per connectar amb la realitat del seu treball, reconèixer com ha anat el procés i identificar què pot millorar.",
        '2': "Pel que fa a l’autoavaluació, tendeix a tenir una visió molt optimista de la seva feina; amb orientació, aprèn a identificar amb més realisme els punts que cal revisar o millorar.",
        '3': "Pel que fa a l’autoavaluació, es mostra molt exigent amb la seva feina i tendeix a infravalorar el que fa. Treballem perquè reconegui la vàlua real dels seus aprenentatges i guanyi seguretat en els seus èxits.",
        '4': "Destaca en l’autoavaluació: revisa amb honestedat tant el procés com el resultat i reconeix què li ha costat. Aquesta capacitat de mirar el propi treball amb criteri és una fortalesa que pot {ajudar_pronom} a avançar en els altres aprenentatges."
      },
      options: [
        "Pel que fa a l’autoavaluació, necessita acompanyament per connectar amb la realitat del seu treball, reconeix com ha anat el procés i identificar què pot millorar.",
        "Pel que fa a l’autoavaluació, tendeix a tenir una visió molt optimista de la seva feina; amb orientació, aprèn a identificar amb més realisme els punts que cal revisar o millorar.",
        "Pel que fa a l’autoavaluació, es mostra molt exigent amb la seva feina i tendeix a infravalorar el que fa. Treballem perquè reconegui la vàlua real dels seus aprenentatges i guanyi seguretat en els seus èxits.",
        "Destaca en l’autoavaluació: revisa amb honestedat tant el procés com el resultat i reconeix què li ha costat. Aquesta capacitat de mirar el propi treball amb criteri és una fortalesa que pot {ajudar_pronom} a avançar en els altres aprenentatges."
      ]
    }
  ]
};
