import React, { useMemo } from 'react';
import { ALL_NOTES, CHORD_QUALITIES, SCALES, TUNINGS } from '../constants';
import { AppState, ChordDefinition, NoteName, ZoomLevel } from '../types';
import { getPlayableChordCandidates, identifyChord } from '../utils/musicTheory';
import { THEMES } from '../themeConfig';

interface ControlsProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const Controls: React.FC<ControlsProps> = ({ state, setState }) => {
  const availableTunings = TUNINGS[state.numStrings] || [];
  const isCustomTuning = !availableTunings.find(t => JSON.stringify(t.notes) === JSON.stringify(state.tuning));
  const palette = THEMES[state.theme];

  const getTextColor = (bgClass: string) => bgClass.replace('bg-', 'text-').replace('dark:bg-', 'dark:text-');
  const getFocusRingColor = (bgClass: string) => bgClass.replace('bg-', 'focus:ring-').replace('dark:bg-', 'dark:focus:ring-');

  const identifiedChordName = useMemo(() => {
    if (!state.selectedChord) return '';
    return identifyChord(
        state.selectedChord.rootNote, 
        state.selectedChord.customVoicing || [], 
        state.tuning
    );
  }, [state.selectedChord, state.tuning]);

  const handleNumStringsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newNum = parseInt(e.target.value, 10);
    const defaultTuning = TUNINGS[newNum][0].notes;
    setState(prev => ({ ...prev, numStrings: newNum, tuning: defaultTuning }));
  };

  const handleTuningPresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === 'custom') return;
    const selectedPreset = availableTunings.find(t => t.name === e.target.value);
    if (selectedPreset) {
      setState(prev => ({ ...prev, tuning: selectedPreset.notes }));
    }
  };

  const handleCustomStringTuning = (index: number, note: NoteName) => {
    const newTuning = [...state.tuning];
    newTuning[index] = note;
    setState(prev => ({ ...prev, tuning: newTuning }));
  };

  const handleChordQualityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newQuality = CHORD_QUALITIES.find(q => q.name === e.target.value);
    if (newQuality && state.selectedChord) {
        setState(prev => ({
            ...prev,
            selectedChord: {
                ...prev.selectedChord!,
                quality: newQuality,
                customVoicing: prev.selectedChord?.customVoicing
            }
        }));
    }
  };

  const saveChord = () => {
      if (!state.selectedChord) return;
      const newSavedChord = {
          id: Date.now().toString(),
          chord: state.selectedChord,
          label: identifiedChordName || `${state.selectedChord.rootNote} ${state.selectedChord.quality.shortName}`
      };
      setState(prev => ({ ...prev, savedChords: [...prev.savedChords, newSavedChord] }));
  };

  const clearChordSelection = () => {
      setState(prev => ({ ...prev, selectedChord: null, isLocked: false }));
  };

  const toggleLock = () => {
      setState(prev => {
          const isNowLocked = !prev.isLocked;
          let newSelectedChord = prev.selectedChord;

          if (isNowLocked && prev.selectedChord && !prev.selectedChord.customVoicing) {
              const suggestions = getPlayableChordCandidates(
                  prev.tuning,
                  prev.selectedChord.rootNote,
                  prev.selectedChord.quality,
                  prev.selectedChord.rootFret
              );
              newSelectedChord = {
                  ...prev.selectedChord,
                  customVoicing: Array.from(suggestions)
              };
          }

          return { ...prev, isLocked: isNowLocked, selectedChord: newSelectedChord };
      });
  };

  // Shared classes for consistency
  const controlBase = `appearance-none bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white px-4 h-11 rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-4 ${getFocusRingColor(palette.light.scaleBg).replace('focus:ring-', 'focus:ring-')}/20 transition-all cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-750`;

  if (state.selectedChord) {
      return (
        <div className="bg-slate-900 border-b border-slate-700 p-6 shadow-md z-50 transition-colors duration-300 relative overflow-hidden">
            <div className="absolute inset-0 bg-amber-900/10 pointer-events-none"></div>
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                <div className="flex items-center space-x-6">
                    <div className="flex flex-col">
                         <span className="text-amber-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Chord Explorer</span>
                         <h2 className="text-3xl font-black text-white flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-lg shadow-lg ${palette.light.chordRootBg} ${palette.dark.chordRootBg} ${palette.light.chordRootText} ${palette.dark.chordRootText}`}>
                                {state.selectedChord.rootNote}
                            </span>
                            <button 
                                onClick={toggleLock}
                                className={`ml-2 p-1.5 rounded-lg transition-all ${state.isLocked ? 'text-rose-500 bg-rose-500/10' : 'text-slate-600 hover:text-slate-400'}`}
                            >
                                {state.isLocked ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                                    </svg>
                                )}
                            </button>
                         </h2>
                    </div>

                    <div className="h-10 w-px bg-slate-700/50"></div>

                    <div className="flex flex-col space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Show Notes In</label>
                        <div className="relative">
                            <select 
                                value={state.selectedChord.quality.name} 
                                onChange={handleChordQualityChange}
                                className={`appearance-none bg-slate-800 text-amber-400 font-black h-11 pl-4 pr-10 rounded-xl border border-slate-600 focus:outline-none focus:ring-4 ${getFocusRingColor(palette.light.scaleBg).replace('focus:ring-', 'focus:ring-')}/20 hover:bg-slate-700 transition-all cursor-pointer w-48`}
                            >
                                {CHORD_QUALITIES.map(q => (
                                    <option key={q.name} value={q.name}>{q.name}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-amber-500/50">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Calculated Chord</label>
                        <div className={`bg-slate-800 border ${palette.light.scaleBg.replace('bg-', 'border-')}/30 px-5 h-11 rounded-xl flex items-center gap-3 shadow-inner`}>
                             <div className={`w-2 h-2 rounded-full ${palette.light.scaleBg} animate-pulse shadow-[0_0_8px_rgba(20,184,166,0.8)]`}></div>
                             <span className={`${getTextColor(palette.light.scaleBg)} font-mono font-black whitespace-nowrap tracking-wider text-sm`}>
                                {identifiedChordName}
                             </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <button 
                        onClick={saveChord}
                        className="h-11 px-6 bg-slate-800 text-amber-500 border border-amber-500/50 hover:bg-amber-500 hover:text-slate-900 font-black rounded-xl transition-all shadow-lg shadow-amber-900/40 flex items-center gap-2 group"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-hover:scale-125" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Save to Riff Strip
                    </button>
                    <button 
                        onClick={clearChordSelection} 
                        className="h-11 px-4 text-slate-500 hover:text-white transition-colors font-bold border border-transparent hover:border-slate-700 rounded-xl"
                    >
                        Exit Editor
                    </button>
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6 shadow-md z-50 transition-colors duration-300">
      <div className="max-w-7xl mx-auto flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-center lg:gap-12">
        <div className="flex flex-col md:flex-row md:justify-center gap-6">
            <div className="flex flex-col space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] whitespace-nowrap">Strings</label>
                <div className="relative">
                    <select 
                        value={state.numStrings} 
                        onChange={handleNumStringsChange} 
                        className={`${controlBase} w-full md:w-36 pr-10 font-bold`}
                    >
                        <option value={6}>6 String</option>
                        <option value={7}>7 String</option>
                        <option value={8}>8 String</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                </div>
            </div>
            <div className="flex flex-col space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] whitespace-nowrap">Tuning Preset</label>
                <div className="relative">
                    <select 
                        value={isCustomTuning ? 'custom' : availableTunings.find(t => JSON.stringify(t.notes) === JSON.stringify(state.tuning))?.name} 
                        onChange={handleTuningPresetChange}
                        className={`${controlBase} w-full md:w-52 pr-10 font-bold`}
                    >
                        {availableTunings.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                        <option value="custom">Custom Tuning</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                </div>
            </div>
            <div className="flex flex-col space-y-2">
                 <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] whitespace-nowrap">String Setup</label>
                 <div className="flex space-x-1.5">
                     {state.tuning.map((note, idx) => (
                        <select 
                            key={idx} 
                            value={note} 
                            onChange={(e) => handleCustomStringTuning(idx, e.target.value as NoteName)} 
                            className={`appearance-none w-12 h-11 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-black rounded-xl border border-slate-300 dark:border-slate-700 text-center focus:outline-none focus:ring-4 ${getFocusRingColor(palette.light.scaleBg).replace('focus:ring-', 'focus:ring-')}/20 transition-all hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer`}
                        >
                            {ALL_NOTES.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                     ))}
                 </div>
            </div>
        </div>
        <div className="flex flex-col md:flex-row md:justify-center gap-6">
             <div className="flex flex-col space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] whitespace-nowrap">Scale Root</label>
                <div className="relative">
                    <select 
                        value={state.rootNote} 
                        onChange={(e) => setState(prev => ({ ...prev, rootNote: e.target.value as NoteName }))} 
                        className={`${controlBase} w-24 pr-10 font-black`}
                    >
                        {ALL_NOTES.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                </div>
            </div>
             <div className="flex flex-col space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] whitespace-nowrap">Mode / Scale</label>
                <div className="relative">
                    <select 
                        value={state.scale.name} 
                        onChange={(e) => {
                            const newScale = SCALES.find(s => s.name === e.target.value);
                            if (newScale) setState(prev => ({ ...prev, scale: newScale }));
                        }} 
                        className={`${controlBase} w-full md:w-56 pr-10 font-bold`}
                    >
                        {SCALES.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                </div>
            </div>
             <div className="flex flex-col space-y-2">
                 <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] whitespace-nowrap">Viewport</label>
                 <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-300 dark:border-slate-700 h-11 items-center shadow-sm">
                    {(['fit', 'low', 'high'] as ZoomLevel[]).map((level) => (
                        <button 
                            key={level} 
                            onClick={() => setState(prev => ({ ...prev, zoomLevel: level }))} 
                            className={`min-w-[64px] px-2 h-full text-[11px] font-black rounded-lg transition-all whitespace-nowrap flex items-center justify-center ${state.zoomLevel === level ? `bg-white ${palette.dark.scaleBg} ${getTextColor(palette.light.scaleBg)} ${palette.dark.scaleText} shadow-md ring-1 ring-slate-200/50 dark:ring-0` : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                        >
                            {level === 'fit' ? 'FIT' : level === 'low' ? '0-12' : '12-24'}
                        </button>
                    ))}
                 </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Controls;