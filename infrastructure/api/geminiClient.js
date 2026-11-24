
/**
 * Error personalitzat per a fallades en la capa d'infraestructura (API/Network).
 */
export class InfrastructureError extends Error {
  constructor(message, status = null, originalError = null) {
    super(message);
    this.name = 'InfrastructureError';
    this.status = status;
    this.originalError = originalError;
  }
}

/**
 * Client que delega les crides de generació al servidor backend (/api/gemini/generate).
 * Manté la clau de l'API segura al servidor i evita crides directes des del navegador.
 * 
 * @param {string} promptText - El prompt final a enviar.
 * @param {Object} config - Configuració tècnica (temperature, topP, systemInstruction, etc).
 * @returns {Promise<string>} La resposta generada per l'IA.
 */
export const callGeminiAPI = async (promptText, config = {}) => {
  try {
    const response = await fetch('/api/gemini/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: promptText,
        config: {
          systemInstruction: config.systemInstruction || "Ets un assistent útil.",
          temperature: config.temperature ?? 0.7,
          topP: config.topP ?? 0.95
        }
      })
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      const code = data.code || (response.status === 429 ? 'QUOTA_EXCEEDED' : response.status === 401 ? 'INVALID_KEY' : 'SERVER_ERROR');
      let userFriendlyMessage = data.error;

      if (code === 'INVALID_KEY' || response.status === 401) {
        userFriendlyMessage = "La clau d'API de Gemini no és vàlida o ha caducat.";
      } else if (code === 'QUOTA_EXCEEDED' || response.status === 429) {
        userFriendlyMessage = "S'ha assolit el límit de quota de Gemini. Espera una estona o revisa la teva quota a Google AI Studio.";
      } else if (code === 'PERMISSION_DENIED' || response.status === 403) {
        userFriendlyMessage = "No es disposa de permisos suficients per accedir al model de Gemini.";
      } else if (code === 'INVALID_ARGUMENT' || response.status === 400) {
        userFriendlyMessage = "La petició enviada a Gemini té un format no vàlid.";
      }

      throw new InfrastructureError(userFriendlyMessage || `Error ${response.status}`, response.status, data);
    }

    const resultText = data.text;
    if (!resultText) {
      throw new InfrastructureError("L'API ha retornat una resposta buida.");
    }

    return resultText;

  } catch (error) {
    if (error instanceof InfrastructureError) {
      throw error;
    }
    
    throw new InfrastructureError(
      "S'ha produït un error en la comunicació amb l'IA: " + error.message,
      500,
      error
    );
  }
};
