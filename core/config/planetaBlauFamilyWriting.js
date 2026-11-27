// Frases per a les famílies. Les opcions de la rúbrica continuen sent les dades d'avaluació.
const seguentPasComunicacio = "De cara al futur, el repte consistirà a seguir amb cura els passos del mètode científic i enriquir les explicacions amb el vocabulari específic que ja anem dominant.";
export const comunicacioNivell2 = `Quan comparteix els descobriments, sap explicar les idees principals. ${seguentPasComunicacio}`;
export const autoavaluacioNivell4 = "Quan fa balanç de la seva feina, reconeix amb sinceritat què li ha costat i identifica amb realisme què pot millorar.";
export const organitzacioNivell2 = "Durant l’activitat, els recordatoris freqüents l’ajuden a tenir clar quin pas toca i a mantenir la feina ordenada.";
export const implicacioPerNivell = [
  "En la majoria de les activitats de grup, la seva actitud envers la feina compartida no ha estat l’adequada. Li costa implicar-se en la tasca i mantenir l’esforç quan apareixen dificultats, i necessita acompanyament freqüent per participar en el que fa el grup. El primer pas és assumir una responsabilitat i mantenir-la fins al final de l’activitat. També cal reforçar l’escolta dels companys i la participació en la cura i la recollida del material.",
  "La seva implicació en les tasques de grup ha estat irregular. Hi ha hagut activitats en què s’ha esforçat i ha contribuït a fer avançar la feina compartida. En moltes altres, la seva participació ha estat insuficient o ha perdut empenta quan la tasca s’ha complicat. Ha de guanyar constància per assumir la part que li toca, col·laborar amb els companys i continuar implicant-s’hi fins que el grup hagi acabat la feina i recollit el material.",
  "En general, manté una bona actitud en les tasques de grup. S’interessa pel que està fent l’equip i continua esforçant-se quan alguna cosa es complica. Escolta les aportacions dels companys i els dona un cop de mà quan ho necessiten. Aquesta manera de col·laborar es manté fins al final de l’activitat, quan té cura del material i assumeix la seva part de la recollida amb responsabilitat.",
  "Mostra una actitud excel·lent en les tasques de grup i exerceix un lideratge positiu. Quan l’equip troba una dificultat, pren la iniciativa i busca com ajudar-lo a continuar. Escolta les aportacions dels companys i els dona espai perquè puguin intervenir i proposar idees. Aquesta implicació es manté fins al final de l’activitat. Pren la iniciativa també a l’hora de cuidar i recollir el material, i contribueix així al bon funcionament del grup.",
];
export const autoavaluacioPerNivell = [
  "Quan fa balanç de la seva feina, encara necessita ajuda per identificar què li ha sortit bé, què li ha costat i què pot millorar.",
  "Quan valora com li ha anat, es fixa sobretot en el que li ha sortit bé. Amb orientació, va identificant també què pot millorar.",
  "Quan fa balanç de la seva feina, es fixa més en allò que li ha costat i li costa reconèixer el que ha aconseguit. L’ajudem a identificar els seus encerts concrets.",
  autoavaluacioNivell4,
];

export const PLANETA_BLAU_FAMILY_WRITING_RULES = `
- Escriu en català per a les famílies, amb frases de llargada variada i un to proper de mestre.
- Dona context dels reptes i enllaça com posa a prova les idees, com interpreta els resultats i com explica què ha descobert. Prioritza les fortaleses que les evidències permetin afirmar i concreta el pròxim pas.
- Distingeix les situacions en què actua pel seu compte de les que demanen orientació. Si el suport és freqüent, expressa-ho amb tacte i concreta en què consisteix.
- Reuneix l'organització i la participació en un sol paràgraf. Integra la revisió de la pròpia feina si està valorada.
- Distingeix l’organització de la tasca de l’actitud en el treball compartit. Els recordatoris d’organització ajuden a saber quin pas toca. Per descriure la implicació, fes servir el text del nivell marcat i conserva els matisos docents:
${implicacioPerNivell.map((frase, index) => `  - Nivell ${index + 1}: «${frase}»`).join('\n')}
- Parla d'accions que la família es pugui imaginar: comprovar què funciona, comparar què ha passat amb què s'esperava, explicar què s'ha descobert. Evita tecnicismes i llistes de criteris.
- Respecta els nivells i matisos docents. Mantén diferenciades les evidències de cada aprenentatge i evita atribuir destreses o evolució que no hi constin.
- Repassa tot el comentari per evitar que es repeteixin connectors, adverbis o fórmules de suport. Fes servir «sovint» com a màxim una vegada en el redactat que generes. Varia l’estructura de les frases i conserva la freqüència del suport que indiquen les evidències.
- Per al nivell 2 de Comunicació, quan sap explicar les idees principals i li cal millorar l'ordre i el vocabulari, utilitza literalment aquesta frase per defecte: «${comunicacioNivell2}». Conserva els matisos específics del docent.
- Fes que una idea porti a la següent. Per exemple, si resol reptes amb autonomia i encara necessita orientació per interpretar o comunicar, pots enllaçar-ho així: «Davant d’un repte, sap proposar una solució, provar-la i millorar-la a partir del que veu. Quan arriba el moment d’explicar què ha descobert, l’acompanyem a comparar el resultat amb allò que esperava». Aplica el mateix criteri al treball en equip: diferencia com assumeix el seu paper de com participa en la feina compartida. Fes servir aquests enllaços només quan les valoracions els justifiquin.
- Situa l’autoavaluació en el moment en què l’alumne fa balanç, sense confondre-la amb la manera com treballa o corregeix les tasques. Utilitza la redacció del nivell marcat i conserva els matisos docents:
${autoavaluacioPerNivell.map((frase, index) => `  - Nivell ${index + 1}: «${frase}»`).join('\n')}
- Acaba amb un comiat breu adreçat a l’alumne.
- Pren com a patró l’ordre d’un relat breu: situa els reptes amb una acció observada, passa a com prova les idees i a què l’ajuda a explicar els resultats, continua amb el seu paper a l’equip i acaba amb com es mira la feina. Organitza cada paràgraf al voltant d’una idea. Evita afegir una etiqueta de fortalesa si la frase següent ja mostra en què destaca.
- Quan dos criteris baixos descriuen parts del mateix procés, enllaça’ls en una sola explicació. Per exemple, si li cal orientació per comparar els resultats i per relacionar-los amb el que ha après, explica com aquest acompanyament l’ajuda a entendre què ha passat i per què. Conserva els matisos de cada criteri.
`;

export const PLANETA_BLAU_FAMILY_PHRASES = {
  comprenc: [
    "Sovint li cal ajuda per entendre les idees de ciències i fer-les servir per explicar què ha observat.",
    "Va entenent les idees de ciències. Encara l’acompanyem a fer-les servir per explicar què ha passat als experiments i per què.",
    "Sap fer servir el que ha après de ciències per explicar què ha observat als experiments.",
    "Explica amb precisió què ha observat als experiments i fa servir les mateixes idees per entendre situacions noves.",
  ],
  investigo: [
    "Quan investiga, l’acompanyem de manera habitual a anotar què observa, comprovar si ha passat el que esperava i treure’n una conclusió.",
    "Per arribar a les conclusions, anota què observa i quins resultats obté. L’ajudem a comparar-los amb el que pensava al principi i a explicar què ens mostren.",
    "Quan investiga, anota i compara els resultats pel seu compte. Els contrasta amb el que esperava i explica en quines proves basa les conclusions.",
    "Registra i interpreta els resultats pel seu compte. Quan els compara amb el que esperava, sap explicar què permeten afirmar i què encara cal comprovar.",
  ],
  aplico: [
    "A l’hora de resoldre els reptes, necessita orientació amb freqüència per aplicar el que hem après i participar en la proposta, la prova o la millora d’una solució.",
    "Amb orientació, fa servir el que hem après per proposar solucions als reptes i pensar què hi pot millorar.",
    "Davant d’un repte, sap fer servir el que hem après per proposar una solució, comprovar si funciona i millorar-la pel seu compte a partir del que veu.",
    "Quan hi ha diverses maneres de resoldre un repte, les compara pel seu compte i explica quina funciona millor, per què i com es podria millorar.",
  ],
  comunico: [
    "Quan comparteix els descobriments, l’ajudem regularment a explicar què ha fet, què ha passat i què n’ha après.",
    comunicacioNivell2,
    "Quan comparteix els descobriments, explica amb ordre què ha fet, què ha passat i què n’ha après, fent servir el vocabulari científic treballat.",
    "A l’hora d’explicar els descobriments, tria les paraules, els dibuixos o els exemples que ajuden els altres a entendre com ha treballat i què ha après.",
  ],
  organitzo: [
    "Per organitzar la feina, li cal una guia continuada per consultar les consignes, seguir els passos i assumir el seu paper dins l’equip.",
    organitzacioNivell2,
    "Consulta les consignes i els recursos, segueix els passos de cada activitat i assumeix el seu paper dins l’equip amb autonomia.",
    "Organitza la seva feina amb autonomia i es fixa en com avança l’equip per proposar canvis quan cal.",
  ],
  implico: implicacioPerNivell,
  autoavaluacio: autoavaluacioPerNivell,
};
