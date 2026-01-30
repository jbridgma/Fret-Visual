import { ALL_NOTES } from '../constants';
import { NoteName } from '../types';

class AudioEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  private init() {
    if (this.context) return;
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.setValueAtTime(0.3, this.context.currentTime);
    this.masterGain.connect(this.context.destination);
  }

  private getFrequency(note: NoteName, octave: number): number {
    const noteIndex = ALL_NOTES.indexOf(note);
    // MIDI note number: C0 is 12, C4 is 60
    const midi = (octave + 1) * 12 + noteIndex;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  /**
   * Infers the correct octave for a string based on instrument type and index.
   * Strings are Low (0) to High (N).
   */
  public getStringOctave(numStrings: number, tuning: NoteName[], stringIndex: number): number {
    let currentOctave: number;
    
    // Base Octave selection
    if (numStrings <= 5) {
      // Bass instruments
      currentOctave = (stringIndex === 0 && numStrings === 5 && tuning[0] === 'B') ? 0 : 1;
    } else if (numStrings === 6) {
      // Standard Guitar
      currentOctave = 2;
    } else {
      // Extended range guitars (7, 8, 9 strings)
      currentOctave = 1;
    }

    // Iterate up to target string to track octave rollovers
    for (let i = 1; i <= stringIndex; i++) {
      const prevNoteIdx = ALL_NOTES.indexOf(tuning[i - 1]);
      const currNoteIdx = ALL_NOTES.indexOf(tuning[i]);
      if (currNoteIdx <= prevNoteIdx) {
        currentOctave++;
      }
    }

    return currentOctave;
  }

  public playNote(frequency: number, duration: number = 2.0) {
    this.init();
    if (!this.context || !this.masterGain) return;

    const ctx = this.context;
    const sampleRate = ctx.sampleRate;
    const period = Math.floor(sampleRate / frequency);
    
    // Karplus-Strong Synthesis
    const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    // 1. Fill initial period with noise (pluck)
    for (let i = 0; i < period; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    // 2. Feedback loop: averaging and dampening
    const dampening = 0.992;
    for (let i = period; i < data.length; i++) {
      data[i] = (data[i - period] + data[i - period + 1]) * 0.5 * dampening;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const volume = ctx.createGain();
    volume.gain.setValueAtTime(1.0, ctx.currentTime);
    volume.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    source.connect(volume);
    volume.connect(this.masterGain);
    source.start();
  }

  public strumChord(tuning: NoteName[], pinnedPositions: string[], mutedStrings: number[]) {
    this.init();
    const numStrings = tuning.length;
    
    // Collect active notes per string
    const stringNotes: { frequency: number, stringIndex: number }[] = [];
    
    // We handle strings from Low to High for a standard down-strum feel
    for (let sIdx = 0; sIdx < numStrings; sIdx++) {
      if (mutedStrings.includes(sIdx)) continue;
      
      const pos = pinnedPositions.find(p => p.startsWith(`${sIdx}-`));
      if (pos) {
        const fret = parseInt(pos.split('-')[1], 10);
        const baseNote = tuning[sIdx];
        const baseOctave = this.getStringOctave(numStrings, tuning, sIdx);
        
        // Calculate note and its octave after fretting
        const noteIdx = ALL_NOTES.indexOf(baseNote);
        const totalHalfSteps = noteIdx + fret;
        const noteName = ALL_NOTES[totalHalfSteps % 12];
        const finalOctave = baseOctave + Math.floor(totalHalfSteps / 12);
        
        stringNotes.push({
          frequency: this.getFrequency(noteName, finalOctave),
          stringIndex: sIdx
        });
      }
    }

    // Sort to ensure we strum from Lowest String to Highest String
    stringNotes.sort((a, b) => a.stringIndex - b.stringIndex);

    // Play with staggered delay
    stringNotes.forEach((note, i) => {
      setTimeout(() => {
        this.playNote(note.frequency);
      }, i * 35); // 35ms delay between strings
    });
  }
}

export const audioEngine = new AudioEngine();