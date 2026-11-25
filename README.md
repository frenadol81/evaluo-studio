# Evaluo Studio

Aplicació per preparar informes pedagògics a partir de rúbriques i observacions.

Amb Node.js 24, executa `pnpm install --frozen-lockfile` i `pnpm run dev`. Obre [Evaluo Studio](http://localhost:3000).

Per activar Gemini, copia `.env.example` a `.env.local`, configura la teva clau a `GEMINI_API_KEY` i executa `node --env-file=.env.local --import tsx server.ts`.

Per activar Google Drive, configura `VITE_FIREBASE_CONFIG` amb la configuració web del teu projecte Firebase i habilita l'accés amb Google. La configuració web de Firebase és visible al navegador.

La conversió de DOC i ODT requereix LibreOffice. DOCX, ZIP i imatges es poden importar directament.

A Google AI Studio, importa el repositori des de Build amb **Import from GitHub**. Per incorporar canvis posteriors, utilitza **Settings → GitHub → Pull**.



## Registre acumulat de matemàtiques i informes (T1)

Botó **Mates**: importa el fitxer Excel amb la pestanya `Export Evalua Studio` (preferida) o el CSV exportat d'aquesta pestanya. Conserva el registre acumulat i els matisos docents; no assigna nivells genèrics a partir de dades pendents. La versió anterior del registre Tram 1 continua admesa. Les normes persistents són a `core/config/reportWritingRules.js`, vinculades a la rúbrica T1 i al constructor de prompts. El resultat és un esborrany que necessita revisió docent; regenera els informes previs per aplicar les normes noves. Proves del lector CSV: `node --test tests/mathRegisterExport.test.js`.
