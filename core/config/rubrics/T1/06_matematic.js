import { MATH_REPORT_WRITING_RULES } from '../../reportWritingRules.js';

export const RUBRIC_MATEMATIC_T1 = {
  id: 'ambit_matematic',
  title: 'Àmbit Matemàtic',
  inputType: 'GRID_4_LEVELS',
  writingRules: MATH_REPORT_WRITING_RULES,
  levels: ['Inici', 'En progrés', 'Assolit', 'Avançat'],
  data: [
    {
      id: 'm_numeracio_t1',
      label: 'Numeració i valor posicional',
      options: [
        "Presenta dificultats significatives en la comprensió del valor posicional i la lectura de nombres de més de tres xifres, i requereix suport visual i acompanyament constant per ordenar-los i descompondre'ls.",
        "Comprèn el valor posicional de nombres de tres i quatre xifres en contextos guiats, tot i que encara necessita temps i pautes visuals per descompondre'ls i comparar-los amb seguretat.",
        "Comprèn i utilitza amb seguretat el valor posicional dels nombres de fins a quatre xifres, sap descompondre'ls de diferents maneres i els utilitza amb criteri en les activitats de l'aula.",
        "Demostra un domini sòlid del sentit numèric i del valor posicional, és capaç d'establir relacions ràpides entre nombres grans i proposa descomposicions flexibles i eficients."
      ]
    },
    {
      id: 'm_calcul_t1',
      label: 'Càlcul i relacions multiplicatives',
      options: [
        "Mostra dificultats en el càlcul bàsic i en la relació entre la multiplicació i la divisió com a repartiment, i requereix materials manipulatius i guia individualitzada per avançar en les operacions.",
        "Està en procés de consolidar les taules de multiplicar i comprèn la relació entre multiplicació i divisió en situacions senzilles, tot i que encara necessita temps per calcular amb agilitat.",
        "Aplica amb seguretat les estratègies treballades de càlcul multiplicatiu i entén la relació entre multiplicar i dividir, utilitzant aquests recursos de forma adequada en les tasques proposades.",
        "Mostra una gran agilitat en el càlcul mental i el maneig de les relacions multiplicatives, aplica estratègies diverses amb autonomia i resol operacions combinades amb precisió."
      ]
    },
    {
      id: 'm_problemes_t1',
      label: 'Resolució de problemes i raonament',
      options: [
        "Li costa comprendre els enunciats dels problemes i identificar les dades clau; necessita acompanyament pas a pas per decidir quina operació cal aplicar i arribar a una solució.",
        "Comprèn enunciats de problemes contextualitzats i en pot extreure les dades principals, tot i que sovint necessita orientació per seleccionar l'estratègia més adient o revisar el resultat obtingut.",
        "Analitza adequadament les situacions problemàtiques, identifica la informació rellevant, selecciona l'operació correcta i acostuma a trobar la solució justificant el seu raonament.",
        "Destaca en la resolució de problemes matemàtics: planifica el procediment amb autonomia, prova diferents camins de solució, comprova la lògica del resultat i sap comunicar clarament el procés seguit."
      ]
    },
    {
      id: 'm_geometria_t1',
      label: 'Geometria i raonament espacial',
      options: [
        "Té dificultats per identificar i descriure les propietats geomètriques bàsiques de figures planes i triangles, i necessita suport directe per utilitzar el vocabulari geomètric.",
        "Reconeix i classifica formes geomètriques bàsiques i distingeix tipus de triangles amb suport de models visuals, avançant en l'ús del vocabulari geomètric propi del curs.",
        "Descriu i classifica figures geomètriques i triangles a partir de les seves característiques (costats i angles), aplicant el vocabulari geomètric amb correcció i coherència.",
        "Analitza amb precisió propietats geomètriques en figures complexes i triangles, utilitza un vocabulari geomètric ric i precís, i demostra una notable visió espacial en activitats pràctiques."
      ]
    }
  ]
};
