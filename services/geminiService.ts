
import { ReportConfig } from "../types";

export const generateReport = async (config: ReportConfig): Promise<string> => {
  const response = await fetch("/api/gemini/generate-report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      student: {
        id: "temp-id",
        info: { name: config.studentName, gender: config.gender, isPI: config.hasIndividualPlan },
        content: {
          tags: config.selectedObservations || [],
          manualObservations: config.observations ? [config.observations] : [],
          anecdote: config.anecdote,
          selfAssessment: config.selfAssessment,
          recommendations: config.recommendations,
          maker: { narrative: "" }
        }
      },
      tone: config.tone || "Empàtic",
      trimesterId: 3, // Per defecte
      customInstructions: config.customInstructions
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.text;
};

export const getTextVariations = async (selectedText: string, instruction: string, fullContext: string): Promise<string[]> => {
  const response = await fetch("/api/gemini/variations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ selectedText, instruction, fullContext }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.variations || [];
};

export const getConstructiveSuggestion = async (student: any, language: string, trimester: number = 2): Promise<string> => {
  const response = await fetch("/api/gemini/suggestion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student, language, trimester }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.suggestion || "";
};

export const getEvolutionSuggestions = async (student: any, language: string, trimester: number = 3): Promise<string[]> => {
  const response = await fetch("/api/gemini/evolution", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student, language, trimester }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.suggestions || [];
};

export const injectEvolutionPhrase = async (reportText: string, phrase: string, studentInfo: any): Promise<string> => {
  const response = await fetch("/api/gemini/inject-evolution", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reportText, phrase, studentInfo }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.text || reportText;
};

export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
  const response = await fetch("/api/gemini/transcribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64Audio, mimeType }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.transcription || "";
};

export const generateMakerNarrative = async (student: any, instructions: string, makerTags: string[], language: string): Promise<string> => {
  const response = await fetch("/api/gemini/generate-maker-narrative", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student, instructions, makerTags, language }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.narrative || "";
};

export const generatePlanetaBlauNarrative = async (student: any, instructions: string, planetaBlauTags: string[], language: string): Promise<string> => {
  const response = await fetch("/api/gemini/generate-planeta-blau-narrative", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student, instructions, planetaBlauTags, language }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.narrative || "";
};
