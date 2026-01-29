import { ThemeName } from './types';

export interface ColorSet {
  appBg: string;
  fretboardBg: string;
  nutBg: string;
  scaleBg: string;
  scaleText: string;
  scaleRing: string;
  rootBg: string;
  rootText: string;
  rootRing: string;
  chordToneBg: string;
  chordToneText: string;
  chordToneRing: string;
  chordRootBg: string;
  chordRootText: string;
  chordRootRing: string;
}

export interface ThemeDefinition {
  name: string;
  light: ColorSet;
  dark: ColorSet;
}

export const THEMES: Record<ThemeName, ThemeDefinition> = {
  'pure-vibrance': {
    name: 'Pure Vibrance',
    light: {
      appBg: 'bg-slate-50',
      fretboardBg: 'bg-white',
      nutBg: 'bg-slate-100',
      scaleBg: 'bg-teal-400', scaleText: 'text-black', scaleRing: 'ring-black/20',
      rootBg: 'bg-rose-400', rootText: 'text-black', rootRing: 'ring-black/20',
      chordToneBg: 'bg-amber-400', chordToneText: 'text-black', chordToneRing: 'ring-black/20',
      chordRootBg: 'bg-orange-400', chordRootText: 'text-black', chordRootRing: 'ring-black/20'
    },
    dark: {
      appBg: 'dark:bg-slate-950',
      fretboardBg: 'dark:bg-slate-900',
      nutBg: 'dark:bg-slate-800',
      scaleBg: 'dark:bg-teal-400', scaleText: 'dark:text-black', scaleRing: 'dark:ring-white/20',
      rootBg: 'dark:bg-rose-400', rootText: 'dark:text-black', rootRing: 'dark:ring-white/20',
      chordToneBg: 'dark:bg-amber-400', chordToneText: 'dark:text-black', chordToneRing: 'dark:ring-white/20',
      chordRootBg: 'dark:bg-orange-400', chordRootText: 'dark:text-black', chordRootRing: 'dark:ring-white/20'
    }
  },
  'deep-jewel': {
    name: 'Deep Jewel',
    light: {
      appBg: 'bg-slate-50',
      fretboardBg: 'bg-white',
      nutBg: 'bg-slate-100',
      scaleBg: 'bg-blue-800', scaleText: 'text-white', scaleRing: 'ring-black/20',
      rootBg: 'bg-rose-800', rootText: 'text-white', rootRing: 'ring-black/20',
      chordToneBg: 'bg-amber-500', chordToneText: 'text-black', chordToneRing: 'ring-black/20',
      chordRootBg: 'bg-amber-700', chordRootText: 'text-white', chordRootRing: 'ring-black/20'
    },
    dark: {
      appBg: 'dark:bg-slate-950',
      fretboardBg: 'dark:bg-slate-900',
      nutBg: 'dark:bg-slate-800',
      scaleBg: 'dark:bg-blue-700', scaleText: 'dark:text-white', scaleRing: 'dark:ring-white/20',
      rootBg: 'dark:bg-rose-700', rootText: 'dark:text-white', rootRing: 'dark:ring-white/20',
      chordToneBg: 'dark:bg-amber-400', chordToneText: 'dark:text-black', chordToneRing: 'dark:ring-white/20',
      chordRootBg: 'dark:bg-amber-600', chordRootText: 'dark:text-white', chordRootRing: 'dark:ring-white/20'
    }
  },
  'coffee': {
    name: 'Coffee Roast',
    light: {
      appBg: 'bg-amber-50',
      fretboardBg: 'bg-white',
      nutBg: 'bg-amber-100/50',
      scaleBg: 'bg-stone-300', scaleText: 'text-stone-900', scaleRing: 'ring-stone-400/30',
      rootBg: 'bg-amber-900', rootText: 'text-white', rootRing: 'ring-amber-950/20',
      chordToneBg: 'bg-amber-200', chordToneText: 'text-amber-950', chordToneRing: 'ring-amber-300',
      chordRootBg: 'bg-amber-800', chordRootText: 'text-white', chordRootRing: 'ring-amber-900/40'
    },
    dark: {
      appBg: 'dark:bg-[#120c0a]',
      fretboardBg: 'dark:bg-[#1c1410]',
      nutBg: 'dark:bg-[#2a1d17]',
      scaleBg: 'dark:bg-[#4e342e]', scaleText: 'dark:text-[#d7ccc8]', scaleRing: 'dark:ring-[#3e2723]/50',
      rootBg: 'dark:bg-[#d7ccc8]', rootText: 'dark:text-[#1c1410]', rootRing: 'dark:ring-[#f5ebe0]/30',
      chordToneBg: 'dark:bg-[#3e2723]', chordToneText: 'dark:text-[#d7ccc8]', chordToneRing: 'dark:ring-[#4e342e]',
      chordRootBg: 'dark:bg-[#8d6e63]', chordRootText: 'dark:text-white', chordRootRing: 'dark:ring-[#795548]/50'
    }
  }
};