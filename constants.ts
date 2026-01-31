
import { ChordDefinition, NoteName, ScaleDefinition, TuningDefinition } from './types';

export const ALL_NOTES: NoteName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const SCALES: ScaleDefinition[] = [
  { name: 'Chromatic', intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  { name: 'Major (Ionian)', intervals: [0, 2, 4, 5, 7, 9, 11] },
  { name: 'Natural Minor (Aeolian)', intervals: [0, 2, 3, 5, 7, 8, 10] },
  { name: 'Harmonic Minor', intervals: [0, 2, 3, 5, 7, 8, 11] },
  { name: 'Major Pentatonic', intervals: [0, 2, 4, 7, 9] },
  { name: 'Minor Pentatonic', intervals: [0, 3, 5, 7, 10] },
  { name: 'Blues', intervals: [0, 3, 5, 6, 7, 10] },
  { name: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10] },
  { name: 'Phrygian', intervals: [0, 1, 3, 5, 7, 8, 10] },
  { name: 'Lydian', intervals: [0, 2, 4, 6, 7, 9, 11] },
  { name: 'Mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10] },
  { name: 'Locrian', intervals: [0, 1, 3, 5, 6, 8, 10] },
];

export const CHORD_QUALITIES: ChordDefinition[] = [
  { name: 'Major', shortName: 'Maj', intervals: [0, 4, 7] },
  { name: 'Minor', shortName: 'min', intervals: [0, 3, 7] },
  { name: 'Power Chord', shortName: '5', intervals: [0, 7] },
  { name: 'Major 7', shortName: 'Maj7', intervals: [0, 4, 7, 11] },
  { name: 'Minor 7', shortName: 'm7', intervals: [0, 3, 7, 10] },
  { name: 'Dominant 7', shortName: '7', intervals: [0, 4, 7, 10] },
  { name: 'Major add9', shortName: 'add9', intervals: [0, 2, 4, 7] },
  { name: 'Minor add9', shortName: 'madd9', intervals: [0, 2, 3, 7] },
  { name: 'Suspended 2', shortName: 'sus2', intervals: [0, 2, 7] },
  { name: 'Suspended 4', shortName: 'sus4', intervals: [0, 5, 7] },
  { name: 'Diminished', shortName: 'dim', intervals: [0, 3, 6] },
  { name: 'Augmented', shortName: 'aug', intervals: [0, 4, 8] },
];

// Notes are defined Low String -> High String
export const TUNINGS: Record<number, TuningDefinition[]> = {
  4: [
    { name: 'Standard (Bass)', notes: ['E', 'A', 'D', 'G'] },
    { name: 'Drop D (Bass)', notes: ['D', 'A', 'D', 'G'] },
    { name: 'Ukulele Standard', notes: ['G', 'C', 'E', 'A'] },
  ],
  5: [
    { name: 'Standard (Bass)', notes: ['B', 'E', 'A', 'D', 'G'] },
    { name: 'Drop A (Bass)', notes: ['A', 'E', 'A', 'D', 'G'] },
  ],
  6: [
    { name: 'Standard E', notes: ['E', 'A', 'D', 'G', 'B', 'E'] },
    { name: 'Drop D', notes: ['D', 'A', 'D', 'G', 'B', 'E'] },
    { name: 'Eb Standard', notes: ['D#', 'G#', 'C#', 'F#', 'A#', 'D#'] },
    { name: 'Drop C#', notes: ['C#', 'G#', 'C#', 'F#', 'A#', 'D#'] },
    { name: 'Drop C', notes: ['C', 'G', 'C', 'F', 'A', 'D'] },
    { name: 'Open D', notes: ['D', 'A', 'D', 'F#', 'A', 'D'] },
    { name: 'Open G', notes: ['D', 'G', 'D', 'G', 'B', 'D'] },
    { name: 'DADGAD', notes: ['D', 'A', 'D', 'G', 'A', 'D'] },
  ],
  7: [
    { name: 'Drop A', notes: ['A', 'E', 'A', 'D', 'G', 'B', 'E'] },
    { name: 'Standard B', notes: ['B', 'E', 'A', 'D', 'G', 'B', 'E'] },
    { name: 'Drop G', notes: ['G', 'D', 'G', 'C', 'F', 'A', 'D'] },
  ],
  8: [
    { name: 'Drop E', notes: ['E', 'B', 'E', 'A', 'D', 'G', 'B', 'E'] },
    { name: 'Standard F#', notes: ['F#', 'B', 'E', 'A', 'D', 'G', 'B', 'E'] },
  ],
  9: [
    { name: 'Drop B', notes: ['B', 'F#', 'B', 'E', 'A', 'D', 'G', 'B', 'E'] },
    { name: 'Standard C#', notes: ['C#', 'F#', 'B', 'E', 'A', 'D', 'G', 'B', 'E'] },
  ]
};

export const TOTAL_FRETS = 24;
export const FRET_MARKERS = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];

