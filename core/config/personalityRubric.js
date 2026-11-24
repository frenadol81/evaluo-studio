
/**
 * PERSONALITY_BLOCK: Rúbrica oficial d'adjectius organitzada per Eixos, Dimensions i Matisos.
 * Organització: Excés (Massa...) | Equilibri (Potència) | Defecte (Manca...)
 */
export const PERSONALITY_BLOCK = [
  {
    id: 'motor',
    title: 'Motor i Actitud',
    color: 'blue',
    dimensions: [
      {
        name: 'Iniciativa',
        excess: [
          { id: 'disp', label: 'Dispers', type: 'excess', definition: "Es distreu amb qualsevol estímul; comença moltes coses però no les acaba." },
          { id: 'impa', label: 'Impacient', type: 'excess', definition: "Vol acabar tan ràpid que comet moltes errades per falta d'atenció." }
        ],
        balance: [
          { id: 'proa', label: 'Proactiu', type: 'balance', definition: "S'avança a les necessitats; busca què pot fer un cop ha acabat la seva tasca." },
          { id: 'curi', label: 'Curiós', type: 'balance', definition: "Té ganes de saber més; pregunta i investiga sobre els temes tractats." },
          { id: 'moti', label: 'Motivat', type: 'balance', definition: "Té moltes ganes d'aprendre i participa amb il·lusió en els projectes." }
        ],
        defect: [
          { id: 'pass', label: 'Passiu', type: 'defect', definition: "No pren mai la iniciativa; espera que el mestre li digui cada pas que ha de fer." },
          { id: 'desm', label: 'Desmotivat', type: 'defect', definition: "No mostra interès per les activitats ni pels aprenentatges del curs." },
          { id: 'conf', label: 'Conformista', type: 'defect', definition: "Es limita a fer el mínim necessari per complir; no s'esforça per millorar." }
        ]
      },
      {
        name: 'Constància',
        excess: [
          { id: 'obse', label: 'Obsessiu', type: 'excess', definition: "No pot parar de repetir una tasca o un tema fins que és 'perfecte' o ho acaba." },
          { id: 'toss', label: 'Tossut', type: 'excess', definition: "No vol canviar d'opinió ni acceptar suggeriments, encara que se li demostri l'error." }
        ],
        balance: [
          { id: 'pers', label: 'Perseverant', type: 'balance', definition: "Insisteix i ho torna a provar quan una cosa no li surt; no es rendeix." },
          { id: 'esfo', label: 'Esforçat', type: 'balance', definition: "Posa molta dedicació en el seu treball, independentment del resultat final." },
          { id: 'cons', label: 'Constant', type: 'balance', definition: "Treballa de forma regular durant tot el trimestre, mantenint l'esforç." }
        ],
        defect: [
          { id: 'inco', label: 'Inconstant', type: 'defect', definition: "El seu esforç i actitud pugen i baixen; un dia treballa molt i l'altre gens." },
          { id: 'depe_c', label: 'Dependent', type: 'defect', definition: "Li costa fer qualsevol cosa sense l'aprovació o el suport del mestre o d'un company." }
        ]
      },
      {
        name: 'Autonomia',
        excess: [
          { id: 'aill', label: 'Aïllat', type: 'excess', definition: "Evita activament la interacció amb els companys; es manté al marge de la dinàmica de grup, sovint per dificultats de relació o retraïment." },
          { id: 'soli', label: 'Solitari', type: 'excess', definition: "Mostra una preferència voluntària per treballar o estar sol; se sent còmode en la seva pròpia companyia sense que això impliqui un conflicte amb el grup." }
        ],
        balance: [
          { id: 'auto', label: 'Autònom', type: 'balance', definition: "Treballa sol sense necessitar guia constant; gestiona el seu material correctament." },
          { id: 'reso', label: 'Resolutiu', type: 'balance', definition: "Busca solucions pràctiques als problemes quotidians sense bloquejar-se." }
        ],
        defect: [
          { id: 'depe_a', label: 'Dependent', type: 'defect', definition: "Li costa fer qualsevol cosa sense l'aprovació o el suport del mestre o d'un company." },
          { id: 'inse', label: 'Insegur', type: 'defect', definition: "Necessita validació i aprovació constant de l'adult per començar o continuar una tasca, mostrant poca confiança en la seva pròpia iniciativa." }
        ]
      },
      {
        name: 'Mentalitat',
        excess: [
          { id: 'caot_m', label: 'Caòtic', type: 'excess', definition: "Molt desordenat; perd els fulls, té la taula plena i no segueix cap mètode." },
          { id: 'deso', label: 'Desorganitzat', type: 'excess', definition: "No sap planificar-se les tasques ni l'espai de treball; se li acumula la feina." }
        ],
        balance: [
          { id: 'crea', label: 'Creatiu', type: 'balance', definition: "Aporta idees noves i diferents; busca solucions originals als problemes." },
          { id: 'flex', label: 'Flexible', type: 'balance', definition: "S'adapta bé als canvis de grup, d'activitat o de normes sense frustrar-se." },
          { id: 'resi', label: 'Resilient', type: 'balance', definition: "Es recupera ràpidament d'un error o un mal moment i segueix endavant." }
        ],
        defect: [
          { id: 'rigi_m', label: 'Rígid', type: 'defect', definition: "Li costen molt els canvis; vol que tot es faci sempre de la mateixa manera." },
          { id: 'meca', label: 'Mecànic', type: 'defect', definition: "Fa les coses seguint els passos però sense entendre realment el perquè." },
          { id: 'bloq', label: 'Bloquejat', type: 'defect', definition: "Es queda paralitzat davant d'una dificultat o quan hi ha molta feina; no sap arrencar." }
        ]
      }
    ]
  },
  {
    id: 'caracter',
    title: 'Caràcter i Emoció',
    color: 'rose',
    dimensions: [
      {
        name: 'To Vital',
        excess: [
          { id: 'teat', label: 'Teatral', type: 'excess', definition: "Exagera les seves reaccions i emocions per buscar l'atenció de l'entorn." },
          { id: 'eufo', label: 'Eufòric', type: 'excess', definition: "Mostra una excitació excessiva que pot dificultar la concentració i la calma a l'aula." }
        ],
        balance: [
          { id: 'aleg', label: 'Alegre', type: 'balance', definition: "Transmet bon humor i optimisme; la seva actitud facilita un clima positiu a l'aula." },
          { id: 'gene', label: 'Generós', type: 'balance', definition: "Ajuda els altres i comparteix el seu temps o materials sense problemes." },
          { id: 'resp', label: 'Respectuós', type: 'balance', definition: "Tracta bé els companys i el material, seguint les normes de convivència." }
        ],
        defect: [
          { id: 'iras', label: 'Irascible', type: 'defect', definition: "S'enfada molt ràpidament per coses petites o frustracions del dia a dia." },
          { id: 'tris', label: 'Trist', type: 'defect', definition: "Es mostra desanimat o amb poca energia vital durant la jornada escolar." },
          { id: 'desc', label: 'Desconfiat', type: 'defect', definition: "Pensa que els altres el volen perjudicar; li costa confiar en les intencions del grup." }
        ]
      },
      {
        name: 'Empatia',
        excess: [
          { id: 'pate', label: 'Paternalista', type: 'excess', definition: "Vol ajudar tant els altres que acaba fent la feina per ells, sense deixar-los aprendre." },
          { id: 'sobr', label: 'Sobreprotector', type: 'excess', definition: "Actua amb un excés de cura cap als companys que pot limitar l'autonomia d'aquests." }
        ],
        balance: [
          { id: 'empa', label: 'Empàtic', type: 'balance', definition: "Entén i se solidaritza amb els sentiments dels altres; sap escoltar." },
          { id: 'conc', label: 'Conciliador', type: 'balance', definition: "Busca solucions en els conflictes; ajuda a fer que el grup estigui en harmonia." }
        ],
        defect: [
          { id: 'indi', label: 'Individualista', type: 'defect', definition: "Només pensa en el seu propi treball; li costa col·laborar per un objectiu comú." },
          { id: 'domi_e', label: 'Dominant', type: 'defect', definition: "Vol controlar les decisions del grup i imposar la seva voluntat sobre els altres." },
          { id: 'ranc', label: 'Rancuniós', type: 'defect', definition: "Li costa oblidar un conflicte passat; manté l'enuig durant molt de temps." }
        ]
      },
      {
        name: 'Sociabilitat',
        excess: [
          { id: 'dema', label: 'Demandant', type: 'excess', definition: "Necessita i reclama l'atenció exclusiva de l'adult de manera constant." },
          { id: 'inva', label: 'Invasiu', type: 'excess', definition: "No respecta l'espai o el temps dels altres; interromp constantment." }
        ],
        balance: [
          { id: 'extr', label: 'Extrovertit', type: 'balance', definition: "Molt sociable; s'expressa amb facilitat i seguretat davant dels altres." },
          { id: 'soci', label: 'Sociable', type: 'balance', definition: "Es relaciona amb naturalitat i fluïdesa amb tothom a l'escola." }
        ],
        defect: [
          { id: 'intr', label: 'Introvertit', type: 'defect', definition: "Reservat i silenciós; prefereix estar en un segon pla i li costa obrir-se." },
          { id: 'rese', label: 'Reservat', type: 'defect', definition: "Guarda les seves opinions i emocions per a ell mateix; costa saber què pensa." },
          { id: 'timi', label: 'Tímid', type: 'defect', definition: "Se sent incòmode o vergonyós en situacions socials o en parlar en públic." }
        ]
      },
      {
        name: 'Assertivitat',
        excess: [
          { id: 'domi_a', label: 'Dominant', type: 'excess', definition: "Vol controlar les decisions del grup i imposar la seva voluntat sobre els altres." },
          { id: 'agre', label: 'Agressiu', type: 'excess', definition: "S'expressa o actua amb una força excessiva que pot intimidar o ferir els altres." }
        ],
        balance: [
          { id: 'asse', label: 'Assertiu', type: 'balance', definition: "Defensa la seva opinió amb respecte, sense ser agressiu ni deixar-se influenciar." },
          { id: 'lide', label: 'Líder positiu', type: 'balance', definition: "Guia el grup de manera constructiva, motivant i incloent tothom." }
        ],
        defect: [
          { id: 'poca', label: 'Poc assertiu', type: 'defect', definition: "No sap dir que no o no s'atreveix a expressar el que realment pensa." },
          { id: 'frag', label: 'Fràgil', type: 'defect', definition: "Molt sensible a les crítiques o correccions; s'afecta molt emocionalment." },
          { id: 'subm', label: 'Submís', type: 'defect', definition: "Es deixa portar pel que diuen els altres sense oposar cap resistència ni opinió." }
        ]
      }
    ]
  },
  {
    id: 'gestio',
    title: 'Estil de Gestió',
    color: 'emerald',
    dimensions: [
      {
        name: 'Ordre',
        excess: [
          { id: 'perf', label: 'Perfeccionista', type: 'excess', definition: "Vol que tot sigui impecable; pateix si veu una errada o el treball brut." },
          { id: 'rigi_o', label: 'Rígid', type: 'excess', definition: "Li costen molt els canvis; vol que tot es faci sempre de la mateixa manera." }
        ],
        balance: [
          { id: 'orga', label: 'Organitzat', type: 'balance', definition: "Sap on té les coses i planifica bé els passos de la seva feina." },
          { id: 'meti', label: 'Meticulós', type: 'balance', definition: "Molt precís; té cura de tots els detalls i de la polidesa del treball." }
        ],
        defect: [
          { id: 'caot_o', label: 'Caòtic', type: 'defect', definition: "Molt desordenat; perd els fulls, té la taula plena i no segueix cap mètode." },
          { id: 'descu', label: 'Descurat', type: 'defect', definition: "No para atenció a la presentació dels treballs; fa les coses sense cura." },
          { id: 'supe', label: 'Superficial', type: 'defect', definition: "Fa les tasques molt ràpid i sense aprofundir; no revisa mai el que lliura." }
        ]
      },
      {
        name: 'Focus',
        excess: [
          { id: 'hipe', label: 'Hiperfocalitzat', type: 'excess', definition: "Tan concentrat en un detall que perd la visió global o no sent quan se li parla." },
          { id: 'abso', label: 'Absorbit', type: 'excess', definition: "Es tanca tant en la seva feina que s'oblida de l'entorn i de les indicacions temporals." }
        ],
        balance: [
          { id: 'foca', label: 'Focalitzat', type: 'balance', definition: "És capaç de concentrar-se profundament en una sola tasca sense distreure's." },
          { id: 'aten', label: 'Atent', type: 'balance', definition: "Escolta i segueix les explicacions amb atenció; està pendent del que passa a classe." }
        ],
        defect: [
          { id: 'somi', label: 'Somiador', type: 'defect', definition: "Es perd sovint en els seus pensaments; sembla estar 'als núvols' durant la classe." },
          { id: 'disp_f', label: 'Dispers', type: 'defect', definition: "Es distreu amb qualsevol estímul; comença moltes coses però no les acaba." },
          { id: 'dist', label: 'Distret', type: 'defect', definition: "No està pendent de la tasca; sovint està mirant altres coses o perd el fil." }
        ]
      },
      {
        name: 'Ritme',
        excess: [
          { id: 'prec_r', label: 'Precipitat', type: 'excess', definition: "Vol acabar tan ràpid que comet moltes errades per falta d'atenció." },
          { id: 'impu_r', label: 'Impulsiu', type: 'excess', definition: "Actua abans de pensar; respon o fa les coses sense llegir bé les indicacions." }
        ],
        balance: [
          { id: 'agil', label: 'Àgil', type: 'balance', definition: "Té un ritme de treball viu; entén i executa les tasques amb rapidesa." },
          { id: 'efic', label: 'Eficient', type: 'balance', definition: "Fa la feina ben feta en un temps adequat; aprofita bé les estones de classe." },
          { id: 'dina', label: 'Dinàmic', type: 'balance', definition: "Participa activament i amb energia en totes les propostes d'aula." }
        ],
        defect: [
          { id: 'paus', label: 'Pausat', type: 'defect', definition: "Treballa amb calma i tranquil·litat, sense córrer però amb constància." },
          { id: 'lent', label: 'Lent', type: 'defect', definition: "El seu ritme de treball és molt inferior al de la classe, sovint per falta d'agilitat." },
          { id: 'refl_ex', label: 'Reflexiu (en excés)', type: 'defect', definition: "El seu excés de reflexió alenteix la producció o la presa de decisions." }
        ]
      },
      {
        name: 'Reflexivitat',
        excess: [
          { id: 'dubi', label: 'Dubitatiu', type: 'excess', definition: "Té molts dubtes abans d'actuar; té por a equivocar-se i això el frena." },
          { id: 'inse_r', label: 'Insegur', type: 'excess', definition: "Mostra por a equivocar-se en les seves respostes o conclusions; dubta de la validesa dels seus propis raonaments encara que siguin correctes." }
        ],
        balance: [
          { id: 'refl', label: 'Reflexiu', type: 'balance', definition: "Pensa abans de parlar o actuar; analitza bé la situació o el problema." },
          { id: 'prud', label: 'Prudent', type: 'balance', definition: "Actua amb cautela i seny; no pren riscos innecessaris i és respectuós." }
        ],
        defect: [
          { id: 'impu_rx', label: 'Impulsiu', type: 'defect', definition: "Actua abans de pensar; respon o fa les coses sense llegir bé les indicacions." },
          { id: 'prec_rx', label: 'Precipitat', type: 'defect', definition: "Vol acabar tan ràpid que comet moltes errades per falta d'atenció." }
        ]
      }
    ]
  }
];
