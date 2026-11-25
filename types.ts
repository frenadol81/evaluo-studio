
export type Gender = 'Masculí' | 'Femení';

export interface ReportConfig {
  studentName: string;
  gender: Gender;
  selectedObservations: string[]; // List of tags from rubric
  observations: string; // Raw text input from textarea (manual)
  anecdote?: string; // The "Anecdote" field for human touch
  selfAssessment?: string; // NEW: Teacher's feedback on student's self-evaluation
  recommendations: string[]; // Specific Work Plan tags
  hasIndividualPlan: boolean; // NEW: Toggle for PI (Pla Individual)
  language: string;
  tone: string;
  customInstructions?: string;
}

export interface ReportResponse {
  text: string;
}

export interface RubricItem {
  id: string;
  text: string;
}

export interface RubricCategory {
  name: string;
  items: RubricItem[];
}

export interface Rubric {
  name: string;
  categories: RubricCategory[];
}

export interface HistoryItem {
  id: number;
  date: string;
  studentName: string;
  report: string;
  config: ReportConfig;
}

export interface Snippet {
  id: string;
  text: string;
}

// --- BATCH MODE TYPES ---

// Updated: 'reviewed' added for the Reviewed/Final state
export type BatchStatus = 'idle' | 'ready' | 'pending' | 'generating' | 'completed' | 'reviewed' | 'error';

/**
 * Updated BatchStudent interface to strictly match the domain model structure
 * returned by the student factory (createStudent).
 */
export interface BatchStudent {
  id: string;
  info: {
    name: string;
    gender: Gender;
    isPI: boolean;
    nickname: string;
    course?: string;
    order?: number;
    groupId?: string;
    photoUrl?: string;
  };
  metrics: {
    readingSpeed: number;
    comprehensionDecatype: number;
    readingErrors?: string;
    readingCompText?: string;
    readingDate?: string;
    readingLevelTag?: string;
  };
  content: {
    manualObservations: string[];
    tags: string[];
    anecdote: string;
    selfAssessment: string;
    recommendations: string[];
    nuances?: Record<string, string[]>;
    aiSuggestions?: string[];
    suggestedEvolutions?: { pos: string[]; neg: string[] };
    evolutionPhrases?: string[];
    maker?: { narrative?: string };
    planetaBlau?: { narrative?: string };
    conference?: any;
    mathRegister?: { schema: string; status: string; version: string; evidence: string; draft: string } | null;
    reading?: {
      wpm: number;
      levelTag?: string;
      errors?: string;
      comp?: string;
      date?: string;
    } | null;
  };
  state: {
    status: BatchStatus;
    generatedReport: string | null;
  };
  trimesters?: Record<number, {
    content: any;
    state: any;
  }>;
  // Optional config snapshot for legacy integration
  config?: ReportConfig;
}

// --- CLASS GROUP TYPE (NEW) ---
export interface ClassGroup {
    id: string;
    name: string;
    students: BatchStudent[];
    // Persist raw table data for import windows
    rawImportData?: {
        speed?: string;
        comprehension?: string;
    };
}
