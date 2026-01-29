import { ALL_NOTES, CHORD_QUALITIES, TOTAL_FRETS } from '../constants';
import { ChordDefinition, NoteName, ScaleDefinition } from '../types';

export const getNoteAtStep = (root: NoteName, step: number): NoteName => {
  const rootIndex = ALL_NOTES.indexOf(root);
  const targetIndex = (rootIndex + step) % 12;
  return ALL_NOTES[targetIndex];
};

export const getScaleNotes = (root: NoteName, scale: ScaleDefinition): NoteName[] => {
  return scale.intervals.map(interval => getNoteAtStep(root, interval));
};

export const getNoteOnFret = (stringBase: NoteName, fret: number): NoteName => {
  return getNoteAtStep(stringBase, fret);
};

export const isNoteInScale = (note: NoteName, scaleNotes: NoteName[]): boolean => {
  return scaleNotes.includes(note);
};

export const isRootNote = (note: NoteName, root: NoteName): boolean => {
  return note === root;
};

// --- Chord Logic ---

export const getChordNotes = (root: NoteName, chord: ChordDefinition): NoteName[] => {
  return chord.intervals.map(interval => getNoteAtStep(root, interval));
};

export const getPlayableChordCandidates = (
  tuning: NoteName[],
  rootNote: NoteName,
  chord: ChordDefinition,
  rootFret: number
): Set<string> => {
  const chordNotes = getChordNotes(rootNote, chord);
  const minFret = Math.max(1, rootFret - 4);
  const maxFret = Math.min(TOTAL_FRETS, rootFret + 4);

  const candidates = new Set<string>();

  tuning.forEach((stringBaseNote, stringIndex) => {
    for (let fret = 0; fret <= TOTAL_FRETS; fret++) {
      const noteOnFret = getNoteOnFret(stringBaseNote, fret);
      if (chordNotes.includes(noteOnFret)) {
        if ((fret >= minFret && fret <= maxFret) || fret === 0) {
           candidates.add(`${stringIndex}-${fret}`);
        }
      }
    }
  });

  return candidates;
};

/**
 * Identifies the chord name based on pinned notes relative to a root.
 */
export const identifyChord = (root: NoteName, pinnedPositions: string[], tuning: NoteName[]): string => {
  if (pinnedPositions.length === 0) return 'No notes pinned';
  
  const uniqueNotes = new Set<NoteName>();
  pinnedPositions.forEach(pos => {
    const [sIdx, fIdx] = pos.split('-').map(Number);
    // Note: tuning is Low to High
    const note = getNoteOnFret(tuning[sIdx], fIdx);
    uniqueNotes.add(note);
  });

  const rootIndex = ALL_NOTES.indexOf(root);
  const foundIntervals = Array.from(uniqueNotes).map(n => {
    let diff = ALL_NOTES.indexOf(n) - rootIndex;
    if (diff < 0) diff += 12;
    return diff;
  }).sort((a, b) => a - b);

  // Check for perfect matches
  for (const quality of CHORD_QUALITIES) {
    const qualityIntervals = [...quality.intervals].sort((a, b) => a - b);
    if (JSON.stringify(qualityIntervals) === JSON.stringify(foundIntervals)) {
      return `${root} ${quality.name}`;
    }
  }

  // Check for partial matches (if pinned notes are a subset of a quality)
  for (const quality of CHORD_QUALITIES) {
    const qualityIntervals = new Set(quality.intervals);
    const isSubset = foundIntervals.every(interval => qualityIntervals.has(interval));
    if (isSubset && foundIntervals.length > 1) {
      return `Partial ${root} ${quality.name}`;
    }
  }

  return `${root} (Custom Voicing)`;
};

export const suggestChordQuality = (root: NoteName, scaleNotes: NoteName[]): ChordDefinition => {
  if (!scaleNotes.includes(root)) return CHORD_QUALITIES.find(q => q.name === 'Major') || CHORD_QUALITIES[0];
  const rootIndex = ALL_NOTES.indexOf(root);
  const getNoteAt = (interval: number) => ALL_NOTES[(rootIndex + interval) % 12];

  const m3 = getNoteAt(3);
  const M3 = getNoteAt(4);
  const d5 = getNoteAt(6);
  const P5 = getNoteAt(7);

  if (scaleNotes.includes(m3) && scaleNotes.includes(d5)) return CHORD_QUALITIES.find(q => q.name === 'Diminished')!;
  if (scaleNotes.includes(m3) && scaleNotes.includes(P5)) return CHORD_QUALITIES.find(q => q.name === 'Minor')!;
  if (scaleNotes.includes(M3) && scaleNotes.includes(P5)) return CHORD_QUALITIES.find(q => q.name === 'Major')!;
  
  return CHORD_QUALITIES.find(q => q.name === 'Major') || CHORD_QUALITIES[0];
};

export type IntervalType = 'root' | '3rd' | '5th' | '7th' | 'other';

export const getIntervalType = (root: NoteName, note: NoteName): IntervalType => {
  const rootIndex = ALL_NOTES.indexOf(root);
  const noteIndex = ALL_NOTES.indexOf(note);
  let diff = noteIndex - rootIndex;
  if (diff < 0) diff += 12;

  if (diff === 0) return 'root';
  if (diff === 3 || diff === 4) return '3rd';
  if (diff === 6 || diff === 7) return '5th';
  if (diff === 10 || diff === 11) return '7th';
  return 'other';
};
