import { useState } from 'react';
import { executeGenerateReport } from '../../../application/useCases/generateStudentReport.js';

/**
 * Hook useReportGenerator
 * Orquestra el procés de generació asíncron des de la UI.
 */
export const useReportGenerator = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);

  /**
   * Dispara la generació de l'informe.
   * @param {Object} student - Entitat de domini de l'alumne.
   * @param {Object} config - Configuració d'estil i intensitat.
   * @param {number} trimester - Trimestre seleccionat.
   */
  const generate = async (student, config, trimester = 2) => {
    if (!student || !student.info?.name) {
      setError("Falten dades de l'alumne per generar l'informe.");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // AQUÍ OCORRE LA MÀGIA: Cridem al cas d'ús pur de l'aplicació
      const res = await executeGenerateReport(student, config, trimester);
      const text = typeof res === 'string' ? res : (res?.text || "");
      setReport(text);
    } catch (err) {
      console.error("Error generating report:", err);
      setError(err.message || "S'ha produït un error inesperat en generar l'informe.");
    } finally {
      setLoading(false);
    }
  };

  const resetReport = () => {
    setReport(null);
    setError(null);
  };

  return { generate, loading, error, report, resetReport };
};