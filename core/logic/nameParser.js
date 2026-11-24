/**
 * Neteja i normalitza el nom d'un alumne.
 * Gestiona el format "Cognoms, Nom" i corregeix la capitalització.
 * 
 * @param {string} rawName - El nom sense processar.
 * @returns {string} El nom netejat i normalitzat.
 */
export const parseStudentName = (rawName) => {
  if (!rawName || typeof rawName !== 'string') return "";

  let name = rawName.trim();

  // 1. Gestionar format "Cognoms, Nom" -> "Nom Cognoms"
  if (name.includes(',')) {
    const parts = name.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      // Cas típic d'exportació de llistes: "García Pérez, Juan" -> "Juan García Pérez"
      name = `${parts[1]} ${parts[0]}`;
    }
  }

  // 2. Capitalització intel·ligent (Primera lletra de cada paraula en majúscula)
  // Evita paraules com "de", "la", "i" en minúscula si es desitja, però per simplicitat:
  return name
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};