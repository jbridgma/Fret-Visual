import { useState, useEffect, useRef } from 'react';
import { AppState, NoteName, ThemeName, SavedChord, ZoomLevel, ScaleDefinition, FretboardMaterial, InlayStyle, InlayMaterial } from './types';
import { CHORD_QUALITIES, SCALES, TUNINGS, ALL_NOTES } from './constants';
import { getScaleNotes, suggestChordQuality, getChordNotes, getNoteOnFret } from './utils/musicTheory';
import { THEMES } from './themeConfig';
import { audioEngine } from './utils/audioEngine';
import Controls from './components/Controls';
import Fretboard from './components/Fretboard';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>({
    numStrings: 6,
    tuning: TUNINGS[6][0].notes, 
    rootNote: 'C',
    scale: SCALES[1],
    showAllNotes: true,
    zoomLevel: 'low',
    selectedChord: null,
    savedChords: [],
    isLocked: false,
    theme: 'pure-vibrance',
    isLeftHanded: false,
    chordDisplayMode: 'note',
    enableNotePreview: true,
    focusedNote: null,
    fretboardMaterial: 'vector',
    inlaysEnabled: false,
    inlayStyle: 'dots',
    inlayMaterial: 'pearl'
  });

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const themeMenuRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const palette = THEMES[appState.theme];

  const getTextColor = (bgClass: string) => {
    return bgClass.replace('bg-', 'text-').replace('dark:bg-', 'dark:text-');
  };

  const getFocusRingColor = (bgClass: string) => {
    return bgClass.replace('bg-', 'focus:ring-').replace('dark:bg-', 'dark:focus:ring-');
  };

  const sanitizeString = (str: string): string => {
    return str.replace(/<[^>]*>?/gm, '').trim();
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const currentPalette = isDarkMode ? palette.dark : palette.light;
    const favicon = document.getElementById('favicon') as HTMLLinkElement;
    if (favicon) {
      const bgHex = currentPalette.scaleBgHex.replace('#', '%23');
      const textHex = currentPalette.scaleTextHex.replace('#', '%23');
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='${bgHex}' /><text x='50%' y='52%' dominant-baseline='central' text-anchor='middle' font-family='sans-serif' font-weight='900' font-size='20' fill='${textHex}'>F</text></svg>`;
      favicon.href = `data:image/svg+xml,${svg}`;
    }
  }, [appState.theme, isDarkMode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setIsThemeMenuOpen(false);
      }
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setIsSettingsMenuOpen(false);
      }
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsImportModalOpen(false);
        setImportError(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleThemeMode = () => setIsDarkMode(!isDarkMode);
  
  const setTheme = (theme: ThemeName) => {
    setAppState(prev => ({ ...prev, theme }));
  };

  const toggleLeftHanded = () => {
    setAppState(prev => ({ ...prev, isLeftHanded: !prev.isLeftHanded }));
  };

  const handleExport = () => {
    const exportData = {
      ...appState,
      isDarkMode,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fret-visual-config.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    try {
      const normalizedInput = importText.trim();
      if (!normalizedInput) throw new Error('Input is empty');

      const parsed = JSON.parse(normalizedInput);
      
      if (typeof parsed !== 'object' || parsed === null) throw new Error('Invalid configuration format');
      
      const required = ['numStrings', 'tuning', 'rootNote', 'scale', 'theme'];
      for (const key of required) {
        if (!(key in parsed)) throw new Error(`Missing required field: ${key}`);
      }

      setAppState(prev => ({
        ...prev,
        ...parsed,
        selectedChord: null, 
        isLocked: false,
        focusedNote: null
      }));

      if (typeof parsed.isDarkMode === 'boolean') {
        setIsDarkMode(parsed.isDarkMode);
      }

      setIsImportModalOpen(false);
      setImportText('');
      setImportError(null);
    } catch (err: any) {
      setImportError(err.name === 'SyntaxError' ? 'Invalid JSON format' : err.message);
    }
  };

  const toggleFocusedNote = (note: NoteName) => {
    setAppState(prev => ({
      ...prev,
      focusedNote: prev.focusedNote === note ? null : note
    }));
  };

  const handleNoteClick = (note: NoteName, stringIndex: number, fretIndex: number) => {
    let shouldPlayAudio = false;

    if (appState.selectedChord) {
        const chordNotes = getChordNotes(appState.selectedChord.rootNote, appState.selectedChord.quality);
        const isChordTone = chordNotes.includes(note);

        if (isChordTone || fretIndex === 0) {
            setAppState(prev => {
                if (!prev.selectedChord) return prev;

                const noteId = `${stringIndex}-${fretIndex}`;
                const currentVoicing = new Set<string>(prev.selectedChord.customVoicing || []);
                const mutedStrings = new Set<number>(prev.selectedChord.mutedStrings || []);

                if (fretIndex === 0) {
                    if (currentVoicing.has(noteId)) {
                        currentVoicing.delete(noteId);
                        mutedStrings.add(stringIndex);
                        shouldPlayAudio = false;
                    } else if (mutedStrings.has(stringIndex)) {
                        mutedStrings.delete(stringIndex);
                        shouldPlayAudio = false;
                    } else {
                        currentVoicing.forEach(v => {
                            const [s] = v.split('-').map(Number);
                            if (s === stringIndex) currentVoicing.delete(v);
                        });
                        currentVoicing.add(noteId);
                        mutedStrings.delete(stringIndex);
                        shouldPlayAudio = true;
                    }
                } else {
                    if (currentVoicing.has(noteId)) {
                        currentVoicing.delete(noteId);
                        shouldPlayAudio = false;
                    } else {
                        currentVoicing.forEach(v => {
                            const [s] = v.split('-').map(Number);
                            if (s === stringIndex) currentVoicing.delete(v);
                        });
                        currentVoicing.add(noteId);
                        mutedStrings.delete(stringIndex);
                        shouldPlayAudio = true;
                    }
                }

                return {
                    ...prev,
                    focusedNote: null, // Clear focus on any interaction in chord mode
                    selectedChord: {
                        ...prev.selectedChord,
                        customVoicing: Array.from(currentVoicing),
                        mutedStrings: Array.from(mutedStrings)
                    }
                };
            });
        } else if (!appState.isLocked) {
             const scaleNotes = getScaleNotes(appState.rootNote, appState.scale);
             const suggestedQuality = suggestChordQuality(note, scaleNotes);
             setAppState(prev => ({
                 ...prev,
                 focusedNote: null,
                 selectedChord: {
                     rootNote: note,
                     quality: suggestedQuality, 
                     rootStringIndex: stringIndex,
                     rootFret: fretIndex,
                     customVoicing: [`${stringIndex}-${fretIndex}`],
                     mutedStrings: []
                 }
             }));
             shouldPlayAudio = true;
        }
    } else {
        const scaleNotes = getScaleNotes(appState.rootNote, appState.scale);
        const suggestedQuality = suggestChordQuality(note, scaleNotes);

        setAppState(prev => ({
            ...prev,
            focusedNote: null,
            selectedChord: {
                rootNote: note,
                quality: suggestedQuality, 
                rootStringIndex: stringIndex,
                rootFret: fretIndex,
                customVoicing: [`${stringIndex}-${fretIndex}`],
                mutedStrings: []
            }
        }));
        shouldPlayAudio = true;
    }

    if (shouldPlayAudio && appState.enableNotePreview) {
      const baseOctave = audioEngine.getStringOctave(appState.numStrings, appState.tuning, stringIndex);
      const noteIdx = ALL_NOTES.indexOf(appState.tuning[stringIndex]);
      const totalHalfSteps = noteIdx + fretIndex;
      const finalOctave = baseOctave + Math.floor(totalHalfSteps / 12);
      
      const targetNoteIdx = totalHalfSteps % 12;
      const midi = (finalOctave + 1) * 12 + targetNoteIdx;
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      audioEngine.playNote(freq);
    }
  };

  const handleSavedChordClick = (saved: typeof appState.savedChords[0]) => {
      setAppState(prev => ({
          ...prev,
          focusedNote: null,
          selectedChord: saved.chord,
      }));
  };

  const deleteSavedChord = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setAppState(prev => ({
          ...prev,
          savedChords: prev.savedChords.filter(c => c.id !== id)
      }));
  };

  const buttonStyle = `p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 ${getFocusRingColor(palette.light.scaleBg)} ${getFocusRingColor(palette.dark.scaleBg)} bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100`;

  return (
    <div className={`min-h-screen ${palette.light.appBg} ${palette.dark.appBg} flex flex-col font-sans selection:bg-teal-500 selection:text-white transition-colors duration-300`}>
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between transition-colors duration-300 relative z-[100]">
        <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-lg transition-colors ${palette.light.scaleBg} ${palette.dark.scaleBg}`}>
                <span className={`font-bold text-lg ${palette.light.scaleText} ${palette.dark.scaleText}`}>F</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Fret <span className={`${getTextColor(palette.light.scaleBg)} ${getTextColor(palette.dark.scaleBg)}`}>Visual</span>
            </h1>
        </div>
        <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setIsImportModalOpen(true)}
                  title="Import Settings"
                  className={buttonStyle}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                </button>
                <button 
                  onClick={handleExport}
                  title="Export Settings"
                  className={buttonStyle}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                </button>
            </div>
            
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800"></div>

            <div className="flex items-center space-x-2">
                <div className="relative" ref={themeMenuRef}>
                    <button 
                        onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
                        title="Change Theme & Aesthetics"
                        className={`p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 ${getFocusRingColor(palette.light.scaleBg)} ${getFocusRingColor(palette.dark.scaleBg)} ${isThemeMenuOpen ? `bg-slate-200 dark:bg-slate-700 ${getTextColor(palette.light.scaleBg)} ${getTextColor(palette.dark.scaleBg)}` : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8z" />
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11a1 1 0 110-2 1 1 0 010 2zM11 8a1 1 0 110-2 1 1 0 010 2zM15 8a1 1 0 110-2 1 1 0 010 2zM18 11a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                    </button>
                    {isThemeMenuOpen && (
                        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 overflow-y-auto max-h-[80vh] ring-1 ring-black/5 animate-in fade-in zoom-in duration-200">
                            <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700">
                                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Select Theme</span>
                            </div>
                            {(Object.keys(THEMES) as ThemeName[]).map((themeKey) => (
                                <button
                                    key={themeKey}
                                    onClick={() => setTheme(themeKey)}
                                    className={`w-full text-left px-4 py-2 text-sm font-bold flex items-center justify-between transition-colors ${appState.theme === themeKey ? `bg-slate-50 dark:bg-slate-700/50 ${getTextColor(THEMES[themeKey].light.scaleBg)} ${getTextColor(THEMES[themeKey].dark.scaleBg)}` : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                                >
                                    {THEMES[themeKey].name}
                                    {appState.theme === themeKey && (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </button>
                            ))}

                            <div className="px-4 py-2 border-t border-b border-slate-100 dark:border-slate-700 mt-2">
                                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Neck Customization</span>
                            </div>
                            
                            {/* Fretboard Material */}
                            <div className="px-4 py-3">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Fretboard Material</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['vector', 'rosewood', 'maple', 'ebony'] as FretboardMaterial[]).map((mat) => (
                                        <button 
                                            key={mat}
                                            onClick={() => setAppState(prev => ({ ...prev, fretboardMaterial: mat }))}
                                            className={`px-2 py-1.5 text-[10px] font-black rounded border transition-all ${appState.fretboardMaterial === mat ? `${palette.light.scaleBg} ${palette.light.scaleText} border-transparent` : 'bg-slate-100 dark:bg-slate-700 text-slate-500 border-slate-200 dark:border-slate-600'}`}
                                        >
                                            {mat.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Inlays Toggle */}
                            <div className="px-4 py-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-700">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-900 dark:text-white">Enable Inlays</span>
                                </div>
                                <button 
                                    onClick={() => setAppState(prev => ({ ...prev, inlaysEnabled: !prev.inlaysEnabled }))}
                                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${appState.inlaysEnabled ? palette.light.scaleBg : 'bg-slate-200 dark:bg-slate-700'}`}
                                >
                                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${appState.inlaysEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                                </button>
                            </div>

                            {appState.inlaysEnabled && (
                                <>
                                    <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Inlay Style</label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {(['dots', 'blocks', 'diamond'] as InlayStyle[]).map((style) => (
                                                <button 
                                                    key={style}
                                                    onClick={() => setAppState(prev => ({ ...prev, inlayStyle: style }))}
                                                    className={`px-2 py-1 text-[9px] font-black rounded border transition-all ${appState.inlayStyle === style ? `${palette.light.scaleBg} ${palette.light.scaleText} border-transparent` : 'bg-slate-100 dark:bg-slate-700 text-slate-500 border-slate-200 dark:border-slate-600'}`}
                                                >
                                                    {style.replace('-', ' ').toUpperCase()}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Inlay Material</label>
                                        <div className="flex gap-1.5">
                                            {(['pearl', 'abalone', 'neon'] as InlayMaterial[]).map((mat) => (
                                                <button 
                                                    key={mat}
                                                    onClick={() => setAppState(prev => ({ ...prev, inlayMaterial: mat }))}
                                                    className={`px-2 py-1 text-[9px] font-black rounded border transition-all ${appState.inlayMaterial === mat ? `${palette.light.scaleBg} ${palette.light.scaleText} border-transparent` : 'bg-slate-100 dark:bg-slate-700 text-slate-500 border-slate-200 dark:border-slate-600'}`}
                                                >
                                                    {mat.toUpperCase()}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
                <button 
                    onClick={toggleThemeMode}
                    title="Toggle Dark Mode"
                    className={`p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:${getTextColor(palette.light.scaleBg)} dark:hover:${getTextColor(palette.dark.scaleBg)} transition-colors focus:outline-none focus:ring-2 ${getFocusRingColor(palette.light.scaleBg)} ${getFocusRingColor(palette.dark.scaleBg)}`}
                >
                    {isDarkMode ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M3 12h2.25m.386-6.364 1.591 1.591M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                    )}
                </button>
            </div>

            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800"></div>

            <div className="relative" ref={settingsMenuRef}>
                <button 
                    onClick={() => setIsSettingsMenuOpen(!isSettingsMenuOpen)}
                    title="App Settings"
                    className={`p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 ${getFocusRingColor(palette.light.scaleBg)} ${getFocusRingColor(palette.dark.scaleBg)} ${isSettingsMenuOpen ? `bg-slate-200 dark:bg-slate-700 ${getTextColor(palette.light.scaleBg)} ${getTextColor(palette.dark.scaleBg)}` : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </button>
                {isSettingsMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 overflow-hidden ring-1 ring-black/5 animate-in fade-in zoom-in duration-200">
                        <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700">
                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Global Settings</span>
                        </div>
                        <div className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-900 dark:text-white">Left Handed Mode</span>
                                <span className="text-[10px] text-slate-500">Reverse neck orientation</span>
                            </div>
                            <button 
                                onClick={toggleLeftHanded}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${appState.isLeftHanded ? palette.light.scaleBg : 'bg-slate-200 dark:bg-slate-700'}`}
                            >
                                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${appState.isLeftHanded ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>
                        <div className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-900 dark:text-white">Note Feedback</span>
                                <span className="text-[10px] text-slate-500">Play note on click</span>
                            </div>
                            <button 
                                onClick={() => setAppState(prev => ({ ...prev, enableNotePreview: !prev.enableNotePreview }))}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${appState.enableNotePreview ? palette.light.scaleBg : 'bg-slate-200 dark:bg-slate-700'}`}
                            >
                                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${appState.enableNotePreview ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-hidden">
        <Controls state={appState} setState={setAppState} />
        <div className="flex-1 overflow-hidden relative flex flex-col justify-center transition-colors duration-300">
           <div className={`absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-200 via-transparent to-transparent dark:from-white/5 dark:via-transparent dark:to-transparent opacity-50 pointer-events-none transition-colors duration-300`}></div>
           <div className="relative z-10 w-full px-4 flex flex-col h-full justify-center">
              <div className="mb-8 text-center flex-shrink-0">
                  {!appState.selectedChord ? (
                    <>
                        <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-4 transition-colors duration-300">
                            <span className={`${getTextColor(palette.light.rootBg)} ${getTextColor(palette.dark.rootBg)}`}>{appState.rootNote}</span> {appState.scale.name}
                        </h2>
                        <div className="flex flex-wrap justify-center gap-2 max-w-4xl mx-auto">
                            {getScaleNotes(appState.rootNote, appState.scale).map(note => {
                              const isActive = appState.focusedNote === note;
                              const isDimmed = appState.focusedNote !== null && !isActive;
                              return (
                                <button 
                                  key={note}
                                  onClick={() => toggleFocusedNote(note)}
                                  className={`
                                    px-4 py-2 rounded-xl text-lg font-black transition-all duration-300 transform
                                    ${isActive 
                                      ? `${palette.light.scaleBg} ${palette.dark.scaleBg} ${palette.light.scaleText} ${palette.dark.scaleText} scale-110 shadow-lg ring-2 ${palette.light.scaleRing} ${palette.dark.scaleRing}` 
                                      : isDimmed
                                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 opacity-40 grayscale'
                                        : `bg-slate-100 dark:bg-slate-800 ${getTextColor(palette.light.scaleBg)} ${getTextColor(palette.dark.scaleBg)} hover:scale-105 active:scale-95 shadow-sm`
                                    }
                                  `}
                                >
                                  {note}
                                </button>
                              );
                            })}
                        </div>
                    </>
                  ) : (
                    <>
                        <div className="flex items-center justify-center gap-3 mb-2">
                             <p className="text-amber-600 dark:text-amber-500 text-sm font-bold uppercase tracking-widest animate-pulse">
                                Chord Builder Active
                            </p>
                            {appState.isLocked && (
                                <span className="bg-rose-500/20 text-rose-500 text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wide border border-rose-500/20">Pinned</span>
                            )}
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
                            Building <span className="text-amber-500 font-bold">{appState.selectedChord.rootNote} {appState.selectedChord.quality.name}</span>. 
                            Click the Nut to cycle: Open ➔ Mute ➔ Free. Click frets to pin.
                        </p>
                    </>
                  )}
              </div>
              <div className="flex-shrink-0">
                <Fretboard 
                    tuning={appState.tuning}
                    rootNote={appState.rootNote}
                    scale={appState.scale}
                    showAllNotes={appState.showAllNotes}
                    zoomLevel={appState.zoomLevel}
                    selectedChord={appState.selectedChord}
                    theme={appState.theme}
                    isLeftHanded={appState.isLeftHanded}
                    onNoteClick={handleNoteClick}
                    chordDisplayMode={appState.chordDisplayMode}
                    focusedNote={appState.focusedNote}
                    fretboardMaterial={appState.fretboardMaterial}
                    inlaysEnabled={appState.inlaysEnabled}
                    inlayStyle={appState.inlayStyle}
                    inlayMaterial={appState.inlayMaterial}
                />
              </div>
               <div className="mt-8 text-center flex-shrink-0">
                   <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors duration-300">
                       {appState.selectedChord 
                         ? 'Nut: Open • Mute (X) • Free (Bloom) • Frets: Pin/Unpin' 
                         : appState.focusedNote 
                            ? `Focused on ${appState.focusedNote} • Click any header note to clear focus`
                            : 'Click a note to enter Chord Builder • Click header notes to focus'}
                   </p>
               </div>
           </div>
        </div>

        {appState.savedChords.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 transition-colors z-20 shadow-[0_-5px_15px_rgba(0,0,0,0.1)]">
                <div className="max-w-7xl mx-auto">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Riff Strip (Saved Chords)</h3>
                    <div className="flex items-center space-x-3 overflow-x-auto pb-2 scrollbar-hide">
                        {appState.savedChords.map(saved => (
                            <div 
                                key={saved.id}
                                onClick={() => handleSavedChordClick(saved)}
                                className={`
                                    flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-all border
                                    ${appState.selectedChord?.rootNote === saved.chord.rootNote && appState.selectedChord?.quality.name === saved.chord.quality.name && appState.selectedChord?.rootFret === saved.chord.rootFret
                                        ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-500 text-amber-600 dark:text-amber-400'
                                        : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750'
                                    }
                                `}
                            >
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    audioEngine.strumChord(appState.tuning, saved.chord.customVoicing || [], saved.chord.mutedStrings || []);
                                  }}
                                  className="p-1 rounded-md hover:bg-white/50 dark:hover:bg-white/10 text-slate-400 hover:text-amber-500 transition-colors"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </button>
                                <span className="font-bold text-sm whitespace-nowrap">{saved.label}</span>
                                <span className="text-xs opacity-60 font-mono">fr.{saved.chord.rootFret}</span>
                                <button 
                                    onClick={(e) => deleteSavedChord(e, saved.id)}
                                    className="ml-2 text-slate-400 hover:text-rose-500 p-1 rounded-full hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}
      </main>

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div ref={modalRef} className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                 <h3 className="text-lg font-bold text-slate-900 dark:text-white">Import Configuration</h3>
                 <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                 </button>
              </div>
              <div className="p-6">
                 <textarea 
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder='{ "numStrings": 6, ... }'
                    className={`w-full h-64 p-4 font-mono text-xs bg-slate-50 dark:bg-slate-950 border rounded-xl focus:outline-none focus:ring-4 transition-all ${importError ? 'border-rose-500 focus:ring-rose-500/20' : `border-slate-200 dark:border-slate-800 ${getFocusRingColor(palette.light.scaleBg)}`}`}
                 />
                 {importError && (
                    <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-xs font-bold flex items-center gap-2">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                       </svg>
                       {importError}
                    </div>
                 )}
              </div>
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
                 <button 
                   onClick={() => setIsImportModalOpen(false)}
                   className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                 >
                    Cancel
                 </button>
                 <button 
                   onClick={handleImport}
                   className={`px-6 py-2 rounded-xl text-sm font-black shadow-lg transition-all ${palette.light.scaleBg} ${palette.dark.scaleBg} ${palette.light.scaleText} ${palette.dark.scaleText} hover:scale-105 active:scale-95`}
                 >
                    Load Configuration
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;