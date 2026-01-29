export type NoteName = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';

export interface ScaleDefinition {
  name: string;
  intervals: number[]; // Semitones from root. e.g. Major: [0, 2, 4, 5, 7, 9, 11]
}

export interface ChordDefinition {
  name: string;
  shortName: string;
  intervals: number[];
}

export interface TuningDefinition {
  name: string;
  notes: NoteName[]; 
}

export type ZoomLevel = 'fit' | 'low' | 'high';
export type ThemeName = 'deep-jewel' | 'coffee' | 'pure-vibrance';

export interface SelectedChord {
  rootNote: NoteName;
  quality: ChordDefinition;
  rootStringIndex: number;
  rootFret: number;
  customVoicing?: string[]; // "string-fret"
  mutedStrings?: number[];  // Array of string indices
}

export interface SavedChord {
  id: string;
  chord: SelectedChord;
  label: string;
}

export interface AppState {
  numStrings: number;
  tuning: NoteName[];
  rootNote: NoteName;
  scale: ScaleDefinition;
  showAllNotes: boolean;
  zoomLevel: ZoomLevel;
  selectedChord: SelectedChord | null;
  savedChords: SavedChord[];
  isLocked: boolean;
  theme: ThemeName;
}