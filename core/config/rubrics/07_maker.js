export const RUBRIC_MAKER = {
  id: 'ambit_maker',
  title: 'Àmbit Maker / STEAM',
  inputType: 'GRID_4_LEVELS',
  levels: ['NA', 'AS', 'AN', 'AE'],
  data: [
    {
      id: 'mkr_disseny',
      label: 'I. Disseny i Resolució de Reptes',
      options: [
        "El prototip final no resol la necessitat ni el repte plantejat inicialment.",
        "Es dissenya una solució que funciona, tot i que podria guanyar en originalitat o eficiència en la resolució del problema.",
        "Es dissenya una solució creativa i eficaç que resol el repte plantejat, aplicant correctament el procés de disseny.",
        "Es dissenya una solució molt creativa i innovadora que respon al repte amb gran eficàcia, utilitzant pensament computacional/disseny."
      ]
    },
    {
      id: 'mkr_tecnologia',
      label: 'II. Ús de la Tecnologia i Digitalització',
      options: [
        "Manca d'efectivitat o seguretat en l'ús de les eines digitals o de fabricació.",
        "Utilitza algunes eines o programari (3D, tall recte, etc.) amb supervisió constant.",
        "Domina l'ús d'eines i programari de l'espai, aplicant-les correctament al seu projecte.",
        "Mostra un domini avançat en l'ús d'eines i tecnologies, ajudant fins i tot els seus companys."
      ]
    },
    {
      id: 'mkr_colaboracio',
      label: 'III. Treball Col·laboratiu i Habilitats Socials',
      options: [
        "Dificultats per col·laborar amb l'equip i per assumir les tasques o les decisions col·lectives.",
        "Treball en grup present, tot i que amb necessitat puntual d'assignació de tasques o dificultats per acceptar idees alienes.",
        "Participació activa en les tasques, assumpció de responsabilitats pròpies i col·laboració per arribar a acords.",
        "Cooperació activa i contribució a la cohesió i lideratge positiu del grup, incorporant idees alienes amb empatia."
      ]
    },
    {
      id: 'mkr_error',
      label: 'IV. Gestió de l\'Error i Reflexió',
      options: [
        "Aparició de frustració davant les dificultats o evitació de la revisió i correcció d'errors del procés.",
        "Reconeixement dels errors propis, però amb necessitat d'ajuda per trobar la millor manera de solucionar-los.",
        "Ús de l'error com a oportunitat d'aprenentatge, fent ajustos durant el procés per millorar els resultats.",
        "Identificació raonada d'errors i dificultats, amb proposta de canvis en l'estratègia i millora iterativa del prototip."
      ]
    },
    {
      id: 'mkr_comunicacio',
      label: 'V. Comunicació i Documentació',
      options: [
        "Documentació incompleta del procés o manca de comunicació efectiva dels resultats obtinguts.",
        "Documentació centrada només en el resultat final o algunes parts, amb una comunicació senzilla.",
        "Registre de les parts importants del procés (idees, proves, resultats) i presentació de conclusions al grup de forma coherent.",
        "Documentació de tot el procés al portfoli, i comunicació del resultat de manera clara, creativa i justificada, respectant l'autoria."
      ]
    },
    {
      id: 'mkr_sostenibilitat',
      label: 'VI. Sostenibilitat i Ús Ètic',
      options: [
        "Manca de consideració de les implicacions ètiques o de l'impacte ambiental o social de la creació.",
        "Consideració de la sostenibilitat principalment en l'elecció de materials, però sense aprofundir en l'impacte global.",
        "El projecte inclou aspectes de sostenibilitat (ús responsable, reutilització...) o fomenta el respecte a la diversitat.",
        "Aplicació de criteris ètics i de sostenibilitat des del disseny inicial, valorant l'impacte de la solució en l'entorn proper."
      ]
    },
    {
      id: 'mkr_autoavaluacio',
      label: 'VII. Capacitat d\'Autoavaluació',
      options: [
        "(Desconnexió/Irrealisme): Presenta dificultats per connectar amb la realitat del seu treball; la seva percepció és irregular, alternant visió excessivament positiva amb inseguretat.",
        "(Sobreestimació): Tendeix a mostrar una visió excessivament optimista de l'esforç i resultats, fet que li impedeix identificar amb realisme punts de millora o errades.",
        "(Infravaloració): Es mostra molt exigent i crític amb la seva pròpia feina; manifesta una tendència a la infravaloració que sovint no li permet reconèixer la vàlua real dels seus projectes.",
        "(Realisme Metacognitiu): Demostra una gran maduresa i honestedat; analitza amb precisió tant el seu procés com el resultat final."
      ]
    }
  ]
};
