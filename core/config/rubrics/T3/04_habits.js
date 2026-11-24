
export const RUBRIC_HABITS = {
  id: 'habits_treball',
  title: 'Aspectes Personals',
  inputType: 'GRID_4_LEVELS',
  levels: ['Novel / Insuficient', 'Aprenent / Suficient', 'Avançat / Notable', 'Expert / Excel·lent'],
  data: [
    {
      id: 'h_auton_org',
      label: 'Autonomia i Organització',
      options: [
        "Mostra dificultats severes d'organització. Perd o no cuida els materials personals i necessita guiatge constant per seguir qualsevol rutina.",
        "Comença a mostrar iniciativa, però requereix supervisió i recordatoris freqüents per completar tasques o mantenir l'ordre.",
        "Organitza les seves tasques amb autonomia. Segueix les rutines establertes i manté l'ordre de forma constant la major part del temps.",
        "Gestiona el temps amb màxima eficàcia. Planifica tasques amb iniciativa i manté el material sempre impecable sense supervisió."
      ]
    },
    {
      id: 'h_socials',
      label: 'Relacions Socials (Iguals i Adult)',
      options: [
        "Adopta una actitud distant o poc receptiva davant dels adults. Li costa integrar-se o respectar les normes bàsiques de funcionament de l’aula.",
        "Participa en el grup, però de vegades li costa cooperar o acceptar les orientacions dels adults de forma receptiva.",
        "Manté relacions positives i col·labora en les dinàmiques de grup de forma respectuosa i fluida.",
        "Es relaciona amb empatia, respecte i confiança tant amb companys com amb adults. Afavoreix activament un clima de convivència saludable."
      ]
    },
    {
      id: 'h_emocional',
      label: 'Gestió Emocional',
      options: [
        "Reacciona de forma impulsiva davant situacions que el superen. Té dificultats per expressar o posar nom als seus sentiments.",
        "Comença a identificar com se sent, encara que de vegades li manquen estratègies per regular les seves reaccions de forma autònoma.",
        "Identifica correctament les seves emocions i les gestiona de manera adequada en el dia a dia escolar.",
        "Regula les seves reaccions amb gran maduresa i serenitat davant de qualsevol repte o situació de desbordament."
      ]
    },
    {
      id: 'h_creativitat',
      label: 'Implicació i Creativitat',
      options: [
        "Mostra falta d'interès o actitud passiva. Tendeix a repetir o copiar les idees dels altres sense aportar res propi.",
        "La seva participació és ocasional o irregular. Necessita ànim extern per implicar-se de forma activa en les propostes d'aula.",
        "Participa amb ganes i motivació. Comença a aportar idees pròpies en projectes creatius de forma satisfactòria.",
        "Mostra un interès entusiasta i curiós. Aporta sempre idees innovadores, originals i molt desenvolupades."
      ]
    },
    {
      id: 'h_conflictes',
      label: 'Resolució de Conflictes',
      options: [
        "Evita els problemes o reacciona sense reflexió prèvia davant dels enfrontaments. Li costa trobar solucions dialogades.",
        "Adopta una actitud conciliadora només quan compta amb el suport o la mediació de l'adult.",
        "Utilitza habitualment el diàleg i actua amb respecte per resoldre desacords de manera conciliadora.",
        "Davant del conflicte, escolta activament, comprèn el punt de vista aliè i proposa solucions constructives amb calma."
      ]
    }
  ]
};
