# Evaluo Studio

Aplicació per preparar informes pedagògics a partir de rúbriques i observacions.

Amb Node.js 24, executa `pnpm install --frozen-lockfile` i `pnpm run dev`. Obre [Evaluo Studio](http://localhost:3000).

Per activar Gemini, copia `.env.example` a `.env.local`, configura la teva clau a `GEMINI_API_KEY` i executa `node --env-file=.env.local --import tsx server.ts`.

Per activar Google Drive, configura `VITE_FIREBASE_CONFIG` amb la configuració web del teu projecte Firebase i habilita l'accés amb Google. La configuració web de Firebase és visible al navegador.

La conversió de DOC i ODT requereix LibreOffice. DOCX, ZIP i imatges es poden importar directament.

A Google AI Studio, importa el repositori des de Build amb **Import from GitHub**. Per incorporar canvis posteriors, utilitza **Settings → GitHub → Pull**.

