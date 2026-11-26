# Evaluo Studio

Aplicació per preparar informes pedagògics a partir de rúbriques i observacions.

Amb Node.js 24, executa `pnpm install --frozen-lockfile` i `pnpm run dev`. Obre [Evaluo Studio](http://localhost:3000).

En local, obre el botó **IA** de la cantonada inferior esquerra per configurar Gemini o OpenAI. El servidor desa les claus localment i Git les ignora. També pots establir les variables privades de servidor que apareixen a `.env.example`.

Per activar Google Drive, configura `VITE_FIREBASE_CONFIG` amb la configuració web del teu projecte Firebase i habilita l'accés amb Google. La configuració web de Firebase és visible al navegador.

La conversió de DOC i ODT requereix LibreOffice. DOCX, ZIP i imatges es poden importar directament.

A Google AI Studio, importa el repositori des de Build amb **Import from GitHub**. Per incorporar canvis posteriors, utilitza **Settings → GitHub → Pull**.

A la previsualització allotjada, configura la clau i el proveïdor mitjançant els secrets del servidor (`GEMINI_API_KEY` o `OPENAI_API_KEY`, i `AI_PROVIDER` si cal triar-ne un). El panell de claus és per a la instal·lació local. Les dades del navegador no viatgen amb el repositori. Per recuperar l'alumnat, les rúbriques i els informes en un altre entorn, fes servir **Exportar** i **Importar** amb el fitxer de sessió JSON.



## Registre acumulat de matemàtiques i informes (T1)

Botó **Mates**: importa el fitxer Excel amb la pestanya `Export Evalua Studio` (preferida) o el CSV exportat d'aquesta pestanya. Conserva el registre acumulat i els matisos docents; no assigna nivells genèrics a partir de dades pendents. La versió anterior del registre Tram 1 continua admesa. Les normes persistents són a `core/config/reportWritingRules.js`, vinculades a la rúbrica T1 i al constructor de prompts. El resultat és un esborrany que necessita revisió docent; regenera els informes previs per aplicar les normes noves. Proves del lector CSV: `node --test tests/mathRegisterExport.test.js`.
