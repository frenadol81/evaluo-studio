/**
 * Factory function para crear la configuración de generación del informe.
 * Define el comportamiento y tono de la IA.
 * 
 * @param {Object} data - Parámetros de configuración.
 * @returns {Readonly<Object>} Configuración inmutable.
 */
export const createReportConfig = (data = {}) => {
  return Object.freeze({
    // Nivel de estilo: 0 (Técnico/Académico) a 1 (Inspirador/Narrativo)
    styleLevel: data.styleLevel ?? 0.5,
    
    // Nivel de intensidad: -3 (Muy suave/Eufemístico) a +3 (Muy contundente/Realista)
    intensityLevel: data.intensityLevel ?? 0,
    
    // Extensión del informe: 'short', 'medium', 'long'
    length: data.length || 'medium',
    
    // Idioma del informe
    language: data.language || 'Català',
    
    // Tono descriptivo (Legacy compatibility con la UI actual)
    tone: data.tone || 'Empàtic i Constructiu',
    
    // Instrucciones de sistema personalizadas
    customInstructions: data.customInstructions || ""
  });
};
