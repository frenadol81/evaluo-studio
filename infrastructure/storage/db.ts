
import Dexie, { type Table } from 'dexie';

export interface Student {
  id: string;
  groupId: string;
  info: {
    name: string;
    gender: 'Masculí' | 'Femení';
    isPI: boolean;
    order?: number;
    course?: string;
    groupId?: string;
    photoUrl?: string;
  };
  content: {
    tags: string[];
    nuances?: Record<string, string>;
    anecdote?: string;
    manualObservations?: string[];
    selfAssessment?: string;
    maker?: {
      narrative?: string;
    };
    planetaBlau?: {
      narrative?: string;
    };
    aiSuggestions?: string[];
    suggestedEvolutions?: { pos: string[]; neg: string[] };
    evolutionPhrases?: string[];
    recommendations?: string[];
    conference?: any;
    reading?: any;
  };
  metrics?: {
    readingSpeed?: number;
    comprehensionDecatype?: number;
    readingErrors?: string;
    readingCompText?: string;
    readingDate?: string;
    readingLevelTag?: string;
  };
  state: {
    status: 'idle' | 'generating' | 'completed' | 'reviewed';
    generatedReport?: string;
  };
  trimesters?: Record<number, {
    content: any;
    state: any;
  }>;
}

export interface Class {
  id?: number;
  name: string;
  year: string;
}

export class EvaluoDB extends Dexie {
  students!: Table<Student, string | number>;
  classes!: Table<Class>;

  constructor() {
    super('EvaluoDB');
    this.version(1).stores({
      classes: '++id, name, year',
      students: 'id, groupId, info.name, state.status'
    });
  }
}

export const db = new EvaluoDB();

/**
 * Inicialitza la base de dades.
 */
export const initDB = async () => {
  try {
    if (!db.isOpen()) {
      await db.open();
    }
  } catch (err) {
    console.error("Error inicialitzant la base de dades:", err);
  }
};

/**
 * Elimina físicament la base de dades del navegador.
 * Tanca la connexió prèviament per evitar bloquejos de l'SO/Navegador.
 */
export const deleteEntireDatabase = async () => {
  try {
    // Tanquem la connexió de forma immediata
    if (db.isOpen()) {
        db.close();
    }
    
    // Borrem físicament el fitxer del navegador
    await Dexie.delete('EvaluoDB');
    console.log("Base de dades esborrada completament.");
    return true;
  } catch (err) {
    console.error("Error crític eliminant la base de dades:", err);
    // Intent desesperat si el tancament net falla
    try {
        await Dexie.delete('EvaluoDB');
        return true;
    } catch (e) {
        return false;
    }
  }
};
