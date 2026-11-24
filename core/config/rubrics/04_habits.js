
export const RUBRIC_HABITS = {
  id: 'habits_treball',
  title: 'Hàbits de Treball i Convivència',
  inputType: 'GRID_4_LEVELS',
  levels: ['Inici', 'En progrés', 'Assolit', 'Avançat'],
  data: [
    {
      id: 'h_integra',
      label: 'Integració i convivència a l’aula',
      options: [
        "Mostra dificultats per integrar-se i respectar la dinàmica del grup.",
        "S’integra de manera progressiva, amb suport puntual.",
        "Està ben integrat/da i manté una convivència positiva i respectuosa.",
        "Actua com a referent positiu i mostra habilitats de mediació per resoldre conflictes de manera proactiva."
      ]
    },
    {
      id: 'h_actitud',
      label: 'Actitud davant l’aprenentatge',
      options: [
        "Mostra poc interès o una actitud poc constant.",
        "Té una actitud variable; necessita estímuls externs.",
        "Manté una actitud positiva, constant i amb voluntat de millora.",
        "Mostra una actitud molt implicada, curiosa i orientada a superar reptes."
      ]
    },
    {
      id: 'h_error',
      label: 'Gestió de l’error i perseverança',
      options: [
        "Es frustra davant l’error i tendeix a abandonar.",
        "Accepta l’error amb suport i intenta millorar.",
        "Accepta l’error com a part de l’aprenentatge i persevera.",
        "Analitza l'origen de l'error, proposa alternatives i ajusta la seva estratègia de manera autònoma."
      ]
    },
    {
      id: 'h_partic',
      label: 'Participació i comunicació',
      options: [
        "Participa poc i li costa expressar idees davant del grup.",
        "Participa quan se li demana; aportacions simples.",
        "Participa activament i expressa idees amb claredat.",
        "Participa amb seguretat, escolta activament i enriqueix el diàleg col·lectiu connectant idees."
      ]
    },
    {
      id: 'h_auton',
      label: 'Autonomia i iniciativa en el treball',
      options: [
        "Depèn constantment de l’adult per iniciar i continuar les tasques.",
        "Mostra autonomia en tasques conegudes, però amb poca iniciativa.",
        "Treballa de manera autònoma, pren decisions i mostra iniciativa.",
        "Anticipa necessitats, gestiona els seus propis recursos de consulta i orienta els companys."
      ]
    },
    {
      id: 'h_ritme',
      label: 'Ritme de treball',
      options: [
        "Ritme poc adequat; li costa acabar les tasques en el temps previst.",
        "Ritme irregular; necessita millorar l’organització del temps.",
        "Manté un ritme adequat i constant en les activitats.",
        "Gestiona molt bé el temps, s'organitza sense recordatoris i adapta el ritme segons la tasca."
      ]
    },
    {
      id: 'h_qualitat',
      label: 'Qualitat i profunditat del treball',
      options: [
        "Treballs superficials, amb poc esforç o aprofundiment.",
        "Mostra esforç, però amb un nivell d’aprofundiment irregular.",
        "Treballs complets, ben elaborats i amb bon nivell d’aprofundiment.",
        "Treballs rigorosos, reflexius i amb una clara voluntat d’anar més enllà."
      ]
    },
    {
      id: 'h_presen',
      label: 'Presentació de les feines',
      options: [
        "Presentació desordenada o poc cuidada.",
        "Presentació acceptable, però poc constant.",
        "Presentació ordenada, clara i polida.",
        "Presentació molt acurada i exemplar."
      ]
    },
    {
      id: 'h_mater',
      label: 'Cura i responsabilitat del material',
      options: [
        "Necessita recordatoris constants per tenir cura del material.",
        "Té cura del material amb suport puntual.",
        "És responsable amb el material propi i d’aula.",
        "Mostra una responsabilitat exemplar i cuida també el material compartit."
      ]
    }
  ]
};
