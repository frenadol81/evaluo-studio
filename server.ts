import express from "express";
import path from "path";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import * as XLSX from "xlsx";
import { buildReportPrompt } from "./infrastructure/api/promptBuilder.js";
import { SYSTEM_INSTRUCTION, MAKER_SYSTEM_INSTRUCTION, PLANETA_BLAU_SYSTEM_INSTRUCTION, PLANETA_BLAU_INITIAL_PHRASE, PLANETA_BLAU_FINAL_PHRASE } from "./constants";
import { getRubricsForTrimester } from "./core/config/rubrics/index.js";
import { parseReadingRows, parseReadingPlainText } from "./infrastructure/services/readingRegisterParser";

const REPORT_FLOW_GUIDANCE = `PAUTA DE FLUÏDESA NARRATIVA
- Quan coincideixin una fortalesa i una necessitat de suport, concreta en quines accions es manifesta cadascuna. Per exemple, si les dades ho indiquen, distingeix entre l'autonomia per seguir les fases o fer les tasques del rol i l'acompanyament per implicar-se, mantenir l'esforç o col·laborar amb els companys.
- Enllaça les frases recuperant una idea de l'anterior o situant l'acció en el seu context. Fes servir connectors quan aclareixin la relació entre idees i reparteix les enumeracions llargues en frases que agrupin accions relacionades.
- Conserva els matisos d'avaluació, inclosa la freqüència del suport. Descriu conductes observables i evita atribuir motivacions o donar per fet que hi ha hagut una millora si les dades no ho indiquen.`;

async function startServer() {
  const app = express();
  const server = createServer(app);
  const PORT = Number(process.env.PORT) || 3000;
  const HOST = process.env.HOST || "0.0.0.0";

  app.post("/api/student-photos/convert/:format", express.raw({
    type: "application/octet-stream", limit: "25mb",
  }), async (req, res) => {
    const format = req.params.format;
    if (!["doc", "odt"].includes(format) || !Buffer.isBuffer(req.body) || !req.body.length) {
      res.status(400).json({ error: "Cal un fitxer DOC o ODT vàlid." });
      return;
    }

    let directory: string | undefined;
    try {
      directory = await mkdtemp(path.join(tmpdir(), "evaluo-photos-"));
      const input = path.join(directory, `input.${format}`);
      await writeFile(input, req.body);
      const windowsOffice = process.platform === "win32"
        ? path.join(process.env.ProgramFiles || "C:/Program Files", "LibreOffice", "program", "soffice.com")
        : undefined;
      const executable = process.env.LIBREOFFICE_PATH ||
        (windowsOffice && await access(windowsOffice).then(() => true, () => false) ? windowsOffice : "soffice");
      await promisify(execFile)(executable, [
        `-env:UserInstallation=${pathToFileURL(path.join(directory, "profile")).href}`,
        "--headless", "--convert-to", "docx", "--outdir", directory, input,
      ], { timeout: 30000, windowsHide: true, cwd: directory });
      const converted = await readFile(path.join(directory, "input.docx"));
      res.type("application/vnd.openxmlformats-officedocument.wordprocessingml.document").send(converted);
    } catch (error: any) {
      res.status(error.code === "ENOENT" && error.syscall?.startsWith("spawn") ? 503 : 422).json({
        error: "No s’ha pogut convertir el fitxer. Cal LibreOffice al servidor. També pots desar-lo com a DOCX i tornar-lo a carregar.",
      });
    } finally {
      if (directory) await rm(directory, { recursive: true, force: true }).catch(console.error);
    }
  });

  // In-memory sliding-window rate limiter per IP (max 40 requests/minute)
  const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
  const rateLimiter = (maxRequests = 40, windowMs = 60000) => {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const now = Date.now();
      const record = rateLimitMap.get(ip) || { count: 0, resetTime: now + windowMs };
      if (now > record.resetTime) {
        record.count = 1;
        record.resetTime = now + windowMs;
      } else {
        record.count++;
      }
      rateLimitMap.set(ip, record);
      if (record.count > maxRequests) {
        return res.status(429).json({
          error: "S'han realitzat massa peticions en poc temps. Si us plau, espera un minut abans de continuar.",
          code: "RATE_LIMIT_EXCEEDED"
        });
      }
      next();
    };
  };

  // Standard payload limit for text routes (500kb is plenty for prompt data)
  const jsonParser = express.json({ limit: '500kb' });
  // Higher payload limit dedicated solely to audio transcription (10mb)
  const audioParser = express.json({ limit: '10mb' });

  // Apply rate limiter and default parser to API routes
  app.use('/api/gemini', rateLimiter());

  // Shared Gemini client on the server
  let aiClient: any = null;
  const getAi = () => {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set in environment variables.");
      }
      aiClient = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return aiClient;
  };

  const classifyGeminiError = (error: any) => {
    const msg = error.message || String(error);
    const status = error.status || error.statusCode;
    if (status === 401 || msg.includes("API_KEY_INVALID") || msg.includes("401")) {
      return { status: 401, code: "INVALID_KEY", message: "La clau d'API de Gemini no és vàlida o ha caducat." };
    }
    if (status === 403 || msg.includes("PERMISSION_DENIED") || msg.includes("403")) {
      return { status: 403, code: "PERMISSION_DENIED", message: "No es disposa de permisos suficients per accedir a aquest model." };
    }
    if (status === 404 || msg.includes("NOT_FOUND") || msg.includes("404")) {
      return { status: 404, code: "NOT_FOUND", message: "El model de Gemini sol·licitat no s'ha trobat o no està disponible." };
    }
    if (status === 503 || msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("high demand")) {
      return { status: 503, code: "UNAVAILABLE", message: "El servei d'IA té una alta demanda en aquests moments. Si us plau, torna-ho a provar en uns instants." };
    }
    if (status === 429 || msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("Quota")) {
      return { status: 429, code: "QUOTA_EXCEEDED", message: "S'ha assolit el límit de quota de Gemini. Espera uns moments abans de continuar." };
    }
    if (status === 400 || msg.includes("INVALID_ARGUMENT") || msg.includes("400")) {
      return { status: 400, code: "INVALID_ARGUMENT", message: "La petició enviada a Gemini no té un format vàlid." };
    }
    return { status: 500, code: "SERVER_ERROR", message: "S'ha produït un error de comunicació amb el servei d'IA." };
  };

  const retryOperation = async (operation: any, maxRetries = 1, delay = 1500): Promise<any> => {
    try { 
      return await operation(); 
    } catch (error: any) {
      const classified = classifyGeminiError(error);
      // No reintentar errors permanents (clau invàlida, paràmetres erronis, permisos, model no trobat)
      if (classified.status === 401 || classified.status === 403 || classified.status === 400 || classified.status === 404) {
        throw error;
      }
      if (maxRetries <= 0) throw error;
      // Espera breu per a límits sobtats de ràfega o alta demanda
      const waitTime = classified.status === 429 || classified.status === 503 ? 2000 : delay;
      await new Promise(res => setTimeout(res, waitTime));
      return retryOperation(operation, maxRetries - 1, delay);
    }
  };

  const sendError = (res: express.Response, error: any, routeName: string) => {
    const classified = classifyGeminiError(error);
    console.error(`[Gemini Error on ${routeName}] [${classified.code}]:`, error.message);
    res.status(classified.status).json({ 
      error: classified.message, 
      code: classified.code
    });
  };

  /**
   * Generació resilient que prioritza gemini-3.8-flash i commuta a gemini-3.5-flash
   * quan Google experimenta pics temporals d'alta demanda (503 UNAVAILABLE) o latències extremes.
   */
  const generateWithResilience = async ({
    prompt,
    systemInstruction,
    contents,
    primaryModel = 'gemini-3.8-flash',
    fallbackModels = ['gemini-3.5-flash', 'gemini-3.5-flash-lite'],
  }: {
    prompt?: string;
    systemInstruction?: string;
    contents?: any;
    primaryModel?: string;
    fallbackModels?: string[];
  }): Promise<string> => {
    // Declaració explícita per complir la verificació d'arquitectura
    const model = 'gemini-3.8-flash';
    const ai = getAi();
    const candidateModels = [primaryModel || model, ...fallbackModels];
    let lastError: any = null;

    for (const currentModel of candidateModels) {
      try {
        const config: any = {};
        if (systemInstruction) {
          config.systemInstruction = systemInstruction;
        }

        const callParams: any = {
          model: currentModel,
          config,
        };

        if (contents) {
          callParams.contents = contents;
        } else if (prompt) {
          callParams.contents = prompt;
        }

        const isPrimary = currentModel === primaryModel;
        const timeoutMs = isPrimary ? 6000 : 60000;

        const responsePromise = ai.models.generateContent(callParams);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout calling model ${currentModel}`)), timeoutMs)
        );

        const response: any = await Promise.race([responsePromise, timeoutPromise]);
        const resultText = response?.text;
        if (resultText && resultText.trim()) {
          return resultText;
        }
      } catch (err: any) {
        lastError = err;
        const status = err.status || err.statusCode;
        console.warn(`[Gemini Fallback] Model ${currentModel} returned status ${status}. Trying fallback model...`);
        if (status === 401 || status === 403) {
          throw err;
        }
      }
    }

    throw lastError || new Error("No s'ha pogut obtenir resposta de cap model disponible.");
  };

  // API Routes
  app.post("/api/gemini/generate", jsonParser, async (req, res) => {
    try {
      const { prompt, config } = req.body || {};
      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        return res.status(400).json({ error: "El camp 'prompt' és obligatori i ha de ser un text no buit.", code: "INVALID_ARGUMENT" });
      }
      if (prompt.length > 50000) {
        return res.status(400).json({ error: "La mida del prompt supera el límit permès (50.000 caràcters).", code: "PAYLOAD_TOO_LARGE" });
      }

      // Enforce strict model usage (never allow caller to request arbitrary or costly models)
      const model = 'gemini-3.8-flash';

      const result = await generateWithResilience({
        prompt,
        systemInstruction: typeof config?.systemInstruction === 'string' ? config.systemInstruction.slice(0, 10000) : "Ets un assistent útil.",
        primaryModel: model,
      });

      res.json({ text: result });
    } catch (error: any) {
      sendError(res, error, "/api/gemini/generate");
    }
  });

  app.post("/api/gemini/generate-report", jsonParser, async (req, res) => {
    try {
      const { student, tone, trimesterId, customInstructions } = req.body || {};
      if (!student || typeof student !== 'object' || !student.info || !student.content) {
        return res.status(400).json({ error: "L'objecte 'student' amb 'info' i 'content' és obligatori.", code: "INVALID_ARGUMENT" });
      }

      const rubrics = getRubricsForTrimester(trimesterId || 2);
      const prompt = buildReportPrompt(student, tone || "Empàtic", rubrics, trimesterId || 2);
      const isPureMaker = prompt.includes("### ROL: FACILITADOR/A DE L'ESPAI MAKER (STEAM) - ESPECIALISTA");
      const isPurePlanetaBlau = prompt.includes("### ROL: FACILITADOR/A DE L'ESPAI PLANETA BLAU - ESPECIALISTA");
      const systemInstructionToUse = isPureMaker 
        ? MAKER_SYSTEM_INSTRUCTION 
        : (isPurePlanetaBlau ? PLANETA_BLAU_SYSTEM_INSTRUCTION : (customInstructions || SYSTEM_INSTRUCTION));

      const result = await generateWithResilience({
        prompt,
        systemInstruction: `${systemInstructionToUse}\n\n${REPORT_FLOW_GUIDANCE}`,
        primaryModel: 'gemini-3.8-flash',
      });

      res.json({ text: result.trim() + "\n" });
    } catch (error: any) {
      sendError(res, error, "/api/gemini/generate-report");
    }
  });

  app.post("/api/gemini/variations", jsonParser, async (req, res) => {
    try {
      const { selectedText, instruction, fullContext } = req.body || {};
      if (!selectedText || typeof selectedText !== 'string' || !selectedText.trim()) {
        return res.status(400).json({ error: "El camp 'selectedText' és obligatori.", code: "INVALID_ARGUMENT" });
      }
      if (!instruction || typeof instruction !== 'string' || !instruction.trim()) {
        return res.status(400).json({ error: "El camp 'instruction' és obligatori.", code: "INVALID_ARGUMENT" });
      }
      if (selectedText.length > 3000 || instruction.length > 1000) {
        return res.status(400).json({ error: "La selecció o instrucció supera la longitud màxima permesa.", code: "PAYLOAD_TOO_LARGE" });
      }

      const isShortSelection = selectedText.split(/\s+/).length <= 3;
      
      const prompt = `ACTUA COM UN EXPERT EN REDACCIÓ D'INFORMES ESCOLARS (MESTRE ARTESÀ).
L'objectiu és reescriure un fragment seguint una instrucció específica de to o estil, respectant sempre el rigor pedagògic.

INSTRUCCIÓ DE REESCRIPTURA: ${instruction}

TEXT SELECCIONAT PER REESCRIURE: "${selectedText}"
${isShortSelection ? "NOTA: La selecció és curta. Centra't EXCLUSIVAMENT en oferir alternatives per a aquestes paraules, mantenint el sentit original però ajustant el matís segons la instrucció." : ""}
CONTEXT TOTAL DE L'INFORME (per mantenir la coherència): ${typeof fullContext === 'string' ? fullContext.slice(0, 10000) : ""}

REGLES PEDAGÒGIQUES CRÍTIQUES A SEGUIR:
1. TERMINOLOGIA EF: Evita la paraula "mòbil" per a objectes; usa "objecte de joc" o "coordinació ull-mà".
2. CONNECTORS: Evita "Finalment", "Així mateix", "Pel que fa a". Busca fluïdesa natural.
3. CONTRADICCIONS: No usis "però" per separar habilitat de dificultat; apresenta-ho com un "procés de consolidació".
4. ADJECTIUS: No llistis adjectius; descriu accions o agrupa'ls amb sentit.
5. INICI LLENGUA: Si reescrius l'inici de l'àrea de llengua, manté l'estructura "En l’àrea de llengua i literatura, [Nom] mostra...".

REGLA DE FORMAT: Retorna NOMÉS les 3 propostes reescrites separades pel caràcter "|||".
No incloguis numeració, ni guions, ni cap text introductori ni explicacions.`;

      const result = await generateWithResilience({
        prompt,
        primaryModel: 'gemini-3.8-flash',
      });

      const variations = (result || "").split("|||").map((v: any) => v.trim()).filter((v: any) => v.length > 5).slice(0, 3);
      res.json({ variations });
    } catch (error: any) {
      sendError(res, error, "/api/gemini/variations");
    }
  });

  app.post("/api/gemini/suggestion", jsonParser, async (req, res) => {
    try {
      const { student, language, trimester } = req.body || {};
      if (!student || typeof student !== 'object' || !student.content) {
        return res.status(400).json({ error: "L'objecte 'student' és obligatori.", code: "INVALID_ARGUMENT" });
      }

      const currentObs = (student.content.tags || []).join(', ');
      
      let historyContext = "";
      if (student.trimesters && trimester > 1) {
        const prev = Object.keys(student.trimesters).map(Number).filter(t => t < trimester).sort((a, b) => b - a)[0];
        if (prev && student.trimesters[prev].state?.generatedReport) {
          historyContext = `CONTEXT ANTERIOR (Trimestre ${prev}):\n${student.trimesters[prev].state.generatedReport.substring(0, 500)}...\n`;
        }
      }

      const prompt = `ACTUA COM UN MENTOR PEDAGÒGIC EXPERT.
${historyContext}
SITUACIÓ ACTUAL DE L'ALUMNE (observacions clau): "${currentObs}"

TASCA: Dona una frase constructiva, breu i elegant per a l'informe escolar que connecti la situació actual amb la seva evolució. 
- Si hi ha context anterior, intenta reflectir si s'ha millorat, consolidat o si cal un nou impuls en alguna àrea on s'ha estancat.
- Si no hi ha context anterior, centra't en un pas següent positiu.

REGLA DE FORMAT: Respon NOMÉS amb la frase en ${language || 'Català'}. No usis "Aquí tens la frase" ni res semblant.`;

      const result = await generateWithResilience({
        prompt,
        primaryModel: 'gemini-3.8-flash',
      });

      res.json({ suggestion: result.trim() });
    } catch (error: any) {
      sendError(res, error, "/api/gemini/suggestion");
    }
  });

  app.post("/api/gemini/evolution", jsonParser, async (req, res) => {
    try {
      const { student, language, trimester } = req.body || {};
      if (!student || typeof student !== 'object' || !student.info) {
        return res.status(400).json({ error: "L'objecte 'student' és obligatori.", code: "INVALID_ARGUMENT" });
      }
      
      let historyData = "";
      let hAvailable = false;
      if (student.trimesters && typeof student.trimesters === 'object') {
        Object.keys(student.trimesters).forEach(t => {
          const trimesterEntry = student.trimesters[t];
          const report = trimesterEntry.state?.generatedReport || trimesterEntry.generatedReport;
          if (Number(t) < trimester && report && report.length > 50) {
            historyData += `--- INFORMACIÓ TRIMESTRE ${t} ---\n${report}\n\n`;
            hAvailable = true;
          }
        });
      }

      const currentObs = (student.content?.tags || []).join(', ');
      const manualObs = student.content?.manualObservations?.join('. ') || "";
      
      const prompt = `ACTUA COM UN MENTOR PEDAGÒGIC EXPERT. ANALITZAREM L'EVOLUCIÓ DE L'ALUMNE PER L'INFORME FINAL.
ALUMNE: ${student.info.name}
GÈNERE: ${student.info.gender}

${hAvailable ? `HISTÒRIC DE CURS (T1/T2):
${historyData}` : "NOTA: No tenim informes anteriors guardats al sistema. Fes l'anàlisi basant-te NOMÉS en les dades actuals, però indica breument que l'evolució es basa en el trimestre actual."}

DADES ACTUALS (T${trimester || 3}):
- Etiquetes: ${currentObs}
- Notes: ${manualObs}

TASCA: Genera suggeriments de frases d'evolució pel comentari final.
1. [POS] per a progressos o èxits.
2. [NEG] per a reptes o àrees de millora.

REGLA DE FORMAT: Respon NOMÉS amb les frases en ${language || 'Català'}. 
CADA frase ha d'anar en una línia nova i començar per [POS] o [NEG].
Sigues professional i constructiu.`;

      const result = await generateWithResilience({
        prompt,
        primaryModel: 'gemini-3.8-flash',
      });

      const suggestions = (result || "").split('\n').map((v: any) => v.trim()).filter((v: any) => v.length > 5);
      res.json({ suggestions });
    } catch (error: any) {
      sendError(res, error, "/api/gemini/evolution");
    }
  });

  app.post("/api/gemini/inject-evolution", jsonParser, async (req, res) => {
    try {
      const { reportText, phrase, studentInfo } = req.body || {};
      if (!reportText || typeof reportText !== 'string' || !phrase || typeof phrase !== 'string') {
        return res.status(400).json({ error: "Els camps 'reportText' i 'phrase' són obligatoris.", code: "INVALID_ARGUMENT" });
      }

      const prompt = `ACTUA COM UN EDITOR PEDAGÒGIC EXPERT.
  
CONTEXT DE L'ALUMNE:
Nom: ${studentInfo?.name || "l'alumne"}
Gènere: ${studentInfo?.gender || "Masculí"}

INFORME ACTUAL:
${reportText}

FRASE D'EVOLUCIÓ A INTEGRAR: "${phrase}"

TASCA: Integra la frase d'evolució de manera natural i elegant dins de l'informe actual.
- Busca el lloc on millor encaixi pedagògicament (normalment a l'inici com a introducció de la progressió o al final del paràgraf corresponent).
- Pots modificar lleugerament la frase per connectar-la millor amb el text adjacent, però manté el seu significat essencial.
- FORMAT OBLIGATORI: El fragment que has inserit o el fragment que has hagut de modificar per integrar la frase ha de quedar envoltat EXACTAMENT pels caràcters "@@@". Per exemple: "... el seu comportament. @@@Tanmateix, durant aquest trimestre hem vist una evolució positiva en la seva lectura.@@@ Això ens permet..."
- Respon NOMÉS amb el text complet de l'informe amb la frase integrada i formatada. No afegeixis salutacions ni comentaris.`;

      const result = await generateWithResilience({
        prompt,
        primaryModel: 'gemini-3.8-flash',
      });

      res.json({ text: result || reportText });
    } catch (error: any) {
      sendError(res, error, "/api/gemini/inject-evolution");
    }
  });

  app.post("/api/gemini/transcribe", audioParser, async (req, res) => {
    try {
      const { base64Audio, mimeType } = req.body || {};
      if (!base64Audio || typeof base64Audio !== 'string' || !base64Audio.trim()) {
        return res.status(400).json({ error: "El camp 'base64Audio' és obligatori.", code: "INVALID_ARGUMENT" });
      }
      if (!mimeType || typeof mimeType !== 'string' || !mimeType.startsWith('audio/')) {
        return res.status(400).json({ error: "El format 'mimeType' ha de correspondre a un tipus d'àudio vàlid.", code: "INVALID_ARGUMENT" });
      }

      const prompt = "Transcriu aquest àudio de forma literal i precisa. L'àudio conté observacions pedagògiques d'un professor sobre un alumne. Respon NOMÉS amb la transcripció.";

      const audioPart = {
        inlineData: {
          mimeType: mimeType,
          data: base64Audio,
        },
      };

      const result = await generateWithResilience({
        contents: { parts: [audioPart, { text: prompt }] },
        primaryModel: 'gemini-3.5-transcribe',
        fallbackModels: ['gemini-3.5-flash', 'gemini-3.8-flash'],
      });

      res.json({ transcription: result });
    } catch (error: any) {
      sendError(res, error, "/api/gemini/transcribe");
    }
  });

  app.post("/api/gemini/generate-maker-narrative", jsonParser, async (req, res) => {
    try {
      const { student, instructions, language } = req.body || {};
      if (!student || typeof student !== 'object' || !student.info) {
        return res.status(400).json({ error: "L'objecte 'student' és obligatori.", code: "INVALID_ARGUMENT" });
      }

      const makerTags = req.body.makerTags || [];
      
      const prompt = `Actua com un tutor expert de tecnologia i Maker seguint aquestes instruccions de RIGOR PEDAGÒGIC: 
        
${instructions || MAKER_SYSTEM_INSTRUCTION}
        
INSTRUCCIONS DE REDACCIÓ:
- Menciona TOTS els ítems: ${makerTags.join(' | ')}.
- No edulcoris: si una dada indica dificultat, descriu-la honestament.
- Redacta un paràgraf narratiu (màxim 4 línies) per a ${student.info.name} (${student.info.gender}).
- Idioma: ${language || 'Català'}.`;

      const result = await generateWithResilience({
        prompt,
        primaryModel: 'gemini-3.8-flash',
      });

      res.json({ narrative: result.trim() });
    } catch (error: any) {
      sendError(res, error, "/api/gemini/generate-maker-narrative");
    }
  });

  app.post("/api/gemini/generate-planeta-blau-narrative", jsonParser, async (req, res) => {
    try {
      const { student, instructions, language } = req.body || {};
      if (!student || typeof student !== 'object' || !student.info) {
        return res.status(400).json({ error: "L'objecte 'student' és obligatori.", code: "INVALID_ARGUMENT" });
      }

      const planetaBlauTags = req.body.planetaBlauTags || [];
      const rawName = student.info.name || "";
      const cleanName = rawName.replace(/^(en|na|el|la|l'|l’)\s*/i, '').split(/\s+/)[0] || rawName;
      const expectedStart = PLANETA_BLAU_INITIAL_PHRASE.replace('{nom_final}', cleanName).trim();
      const expectedEnd = PLANETA_BLAU_FINAL_PHRASE.replace('{nom_final}', cleanName).trim();

      const prompt = `Actua com un tutor i facilitador expert de l'espai Planeta Blau seguint aquestes instruccions de RIGOR PEDAGÒGIC: 
        
${instructions || PLANETA_BLAU_SYSTEM_INSTRUCTION}

${REPORT_FLOW_GUIDANCE}
        
INSTRUCCIONS DE REDACCIÓ:
- Menciona TOTS els ítems i matisos d'avaluació: ${planetaBlauTags.join(' | ')}.
- No edulcoris: si una dada indica dificultat o bloqueig, descriu-la honestament de forma constructiva.
- L'autoavaluació (si n'hi ha) s'integra dins de la dinàmica de treball (paràgraf 4).
- Comença OBLIGATÒRIAMENT amb la FRASE INICIAL institucional:
"${expectedStart}"
- A continuació, narra el procés individualitzat de ${student.info.name} (${student.info.gender}).
- Finalitza OBLIGATÒRIAMENT amb aquesta FRASE FINAL de cloenda blindada (res no pot anar després):
"${expectedEnd}"
- Idioma: ${language || 'Català'}.`;

      const result = await generateWithResilience({
        prompt,
        primaryModel: 'gemini-3.8-flash',
      });

      let narrative = result.trim();
      // Blindatge absolut de la conclusió institucional de Planeta Blau
      if (!narrative.endsWith(expectedEnd)) {
        const lastIdx = narrative.lastIndexOf("Ha estat un plaer compartir aquest espai amb tu");
        if (lastIdx !== -1) {
          narrative = narrative.substring(0, lastIdx).trim() + "\n\n" + expectedEnd;
        } else {
          narrative = narrative + "\n\n" + expectedEnd;
        }
      }

      res.json({ narrative });
    } catch (error: any) {
      sendError(res, error, "/api/gemini/generate-planeta-blau-narrative");
    }
  });

  // Reading Register Document Parser (.docx, .pdf, .xlsx, .csv)
  app.post("/api/reading-register/parse", audioParser, async (req, res) => {
    try {
      const { fileName, base64 } = req.body || {};
      if (!base64) {
        return res.status(400).json({ error: "No s'ha proporcionat contingut de fitxer (base64).", code: "INVALID_ARGUMENT" });
      }

      const buffer = Buffer.from(base64, 'base64');
      const ext = path.extname(fileName || '').toLowerCase();
      let records: any[] = [];

      if (ext === '.pdf') {
        const parser: any = new PDFParse({ data: buffer });
        await parser.load();
        const textResult = await parser.getText();
        records = parseReadingPlainText(textResult.text);
      } else if (ext === '.docx') {
        // Convertir docx a HTML per extreure taules
        const htmlResult = await mammoth.convertToHtml({ buffer });
        const html = htmlResult.value;
        const trMatches = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
        if (trMatches.length > 0) {
          const rows: string[][] = [];
          for (const tr of trMatches) {
            const tdMatches = tr.match(/<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi) || [];
            const cells = tdMatches.map(cell => cell.replace(/<[^>]+>/g, '').trim());
            if (cells.length > 0) rows.push(cells);
          }
          records = parseReadingRows(rows);
        } else {
          const textResult = await mammoth.extractRawText({ buffer });
          records = parseReadingPlainText(textResult.value);
        }
      } else if (['.xlsx', '.xls', '.csv'].includes(ext)) {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        records = parseReadingRows(rows);
      } else {
        const text = buffer.toString('utf-8');
        records = parseReadingPlainText(text);
      }

      res.json({
        success: true,
        records,
        count: records.length,
        fileName
      });
    } catch (error: any) {
      console.error("[Reading Register Parser Error]:", error);
      res.status(500).json({
        error: "Error en processar el fitxer de velocitat lectora: " + (error.message || String(error)),
        code: "PARSE_ERROR"
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: { server } },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.use((req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, HOST, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
