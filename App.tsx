
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppState, NoteName, ThemeName, SavedChord, ZoomLevel, ScaleDefinition, FretboardMaterial, InlayStyle, InlayMaterial, ChordDisplayMode } from './types';
import { CHORD_QUALITIES, SCALES, TUNINGS, ALL_NOTES } from './constants';
import { getScaleNotes, suggestChordQuality, getChordNotes, getNoteOnFret, generateSmartVoicings, identifyChord } from './utils/musicTheory';
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
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [infoTab, setInfoTab] = useState<'about' | 'donate' | 'support'>('about');

  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mobileActiveDrawer, setMobileActiveDrawer] = useState<'scale' | 'instrument' | 'riff' | null>(null);

  const themeMenuRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const infoModalRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  const palette = THEMES[appState.theme];

  const identifiedChordName = useMemo(() => {
    if (!appState.selectedChord) return '';
    return identifyChord(
        appState.selectedChord.rootNote, 
        appState.selectedChord.customVoicing || [], 
        appState.tuning
    );
  }, [appState.selectedChord, appState.tuning]);

  const getTextColor = (bgClass: string) => {
    return bgClass.replace('bg-', 'text-').replace('dark:bg-', 'dark:text-');
  };

  const getFocusRingColor = (bgClass: string) => {
    return bgClass.replace('bg-', 'focus:ring-').replace('dark:bg-', 'dark:focus:ring-');
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      if (infoModalRef.current && !infoModalRef.current.contains(event.target as Node)) {
        setIsInfoModalOpen(false);
      }
      // Only close drawer if click is outside drawer AND outside nav bar
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        if (navRef.current && navRef.current.contains(event.target as Node)) {
           return;
        }
        setMobileActiveDrawer(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleThemeMode = () => setIsDarkMode(!isDarkMode);
  const setTheme = (theme: ThemeName) => setAppState(prev => ({ ...prev, theme }));
  const toggleLeftHanded = () => setAppState(prev => ({ ...prev, isLeftHanded: !prev.isLeftHanded }));

  const handleExport = () => {
    const exportData = { ...appState, isDarkMode, exportDate: new Date().toISOString() };
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
      setAppState(prev => ({ ...prev, ...parsed, selectedChord: null, isLocked: false, focusedNote: null }));
      if (typeof parsed.isDarkMode === 'boolean') setIsDarkMode(parsed.isDarkMode);
      setIsImportModalOpen(false);
      setImportText('');
      setImportError(null);
    } catch (err: any) {
      setImportError(err.name === 'SyntaxError' ? 'Invalid JSON format' : err.message);
    }
  };

  const toggleFocusedNote = (note: NoteName) => {
    setAppState(prev => ({ ...prev, focusedNote: prev.focusedNote === note ? null : note }));
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
                    focusedNote: null,
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
                 selectedChord: { rootNote: note, quality: suggestedQuality, rootStringIndex: stringIndex, rootFret: fretIndex, customVoicing: [`${stringIndex}-${fretIndex}`], mutedStrings: [] }
             }));
             shouldPlayAudio = true;
        }
    } else {
        const scaleNotes = getScaleNotes(appState.rootNote, appState.scale);
        const suggestedQuality = suggestChordQuality(note, scaleNotes);
        setAppState(prev => ({
            ...prev,
            focusedNote: null,
            selectedChord: { rootNote: note, quality: suggestedQuality, rootStringIndex: stringIndex, rootFret: fretIndex, customVoicing: [`${stringIndex}-${fretIndex}`], mutedStrings: [] }
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
      setAppState(prev => ({ ...prev, focusedNote: null, selectedChord: saved.chord }));
      if (isMobile) setMobileActiveDrawer(null);
  };

  const deleteSavedChord = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setAppState(prev => ({ ...prev, savedChords: prev.savedChords.filter(c => c.id !== id) }));
  };

  const handleStrum = () => {
    if (!appState.selectedChord) return;
    audioEngine.strumChord(appState.tuning, appState.selectedChord.customVoicing || [], appState.selectedChord.mutedStrings || []);
  };

  const saveCurrentChord = () => {
      if (!appState.selectedChord) return;
      const newSavedChord = {
          id: Date.now().toString(),
          chord: appState.selectedChord,
          label: identifiedChordName || `${appState.selectedChord.rootNote} ${appState.selectedChord.quality.shortName}`
      };
      setAppState(prev => ({ ...prev, savedChords: [...prev.savedChords, newSavedChord] }));
  };

  const clearChordExplorer = () => {
      setAppState(prev => ({ ...prev, selectedChord: null, isLocked: false }));
      if (isMobile) setMobileActiveDrawer(null);
  };

  const handleNextVoicing = () => {
    if (!appState.selectedChord) return;
    const suggestions = generateSmartVoicings(appState.tuning, appState.selectedChord.rootNote, appState.selectedChord.quality, appState.selectedChord.rootFret);
    if (suggestions.length === 0) return;

    const currentVoicingStr = JSON.stringify([...(appState.selectedChord.customVoicing || [])].sort());
    const currentIndex = suggestions.findIndex(v => JSON.stringify([...v].sort()) === currentVoicingStr);
    const nextIndex = (currentIndex + 1) % suggestions.length;
    const nextVoicing = suggestions[nextIndex];

    const usedStrings = new Set(nextVoicing.map(pos => parseInt(pos.split('-')[0])));
    const mutedStrings = appState.tuning.map((_, i) => i).filter(i => !usedStrings.has(i));

    setAppState(prev => ({
        ...prev,
        selectedChord: {
            ...prev.selectedChord!,
            customVoicing: nextVoicing,
            mutedStrings: mutedStrings
        }
    }));
  };

  const buttonStyle = `p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 ${getFocusRingColor(palette.light.scaleBg)} ${getFocusRingColor(palette.dark.scaleBg)} bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100`;

  const renderActiveContext = () => {
      if (appState.selectedChord) {
          return (
              <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Chord Explorer</span>
                  <span className="text-lg font-black text-slate-900 dark:text-white leading-tight">{identifiedChordName}</span>
              </div>
          );
      }
      return (
          <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Active Mode</span>
              <span className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                <span className={`${getTextColor(palette.light.rootBg)} ${getTextColor(palette.dark.rootBg)}`}>{appState.rootNote}</span> {appState.scale.name}
              </span>
          </div>
      );
  };

  return (
    <div className={`fixed inset-0 ${palette.light.appBg} ${palette.dark.appBg} flex flex-col font-sans selection:bg-teal-500 selection:text-white transition-colors duration-300 overflow-hidden`}>
      <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between transition-colors duration-300 relative z-[100]">
        <div className="flex items-center space-x-3">
            {!isMobile && (
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-lg transition-colors ${palette.light.scaleBg} ${palette.dark.scaleBg}`}>
                    <span className={`font-bold text-lg ${palette.light.scaleText} ${palette.dark.scaleText}`}>F</span>
                </div>
            )}
            {isMobile ? renderActiveContext() : (
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    Fret <span className={`${getTextColor(palette.light.scaleBg)} ${getTextColor(palette.dark.scaleBg)}`}>Visual</span>
                </h1>
            )}
        </div>

        <div className="flex items-center space-x-2 md:space-x-4">
            <div className="hidden md:flex items-center space-x-2">
                <button onClick={() => setIsImportModalOpen(true)} title="Import" className={buttonStyle}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                </button>
                <button onClick={handleExport} title="Export" className={buttonStyle}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                </button>
            </div>
            
            <div className="hidden md:block h-8 w-px bg-slate-200 dark:bg-slate-800"></div>

            <div className="flex items-center space-x-1 md:space-x-2">
                <div className="relative" ref={themeMenuRef}>
                    <button 
                        onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
                        title="Themes & Customization"
                        className={`p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 ${getFocusRingColor(palette.light.scaleBg)} ${getFocusRingColor(palette.dark.scaleBg)} ${isThemeMenuOpen ? `bg-slate-200 dark:bg-slate-700 ${getTextColor(palette.light.scaleBg)} ${getTextColor(palette.dark.scaleBg)}` : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8z" />
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11a1 1 0 110-2 1 1 0 010 2zM11 8a1 1 0 110-2 1 1 0 010 2zM15 8a1 1 0 110-2 1 1 0 010 2zM18 11a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                    </button>
                    {isThemeMenuOpen && (
                        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 overflow-y-auto max-h-[80vh] ring-1 ring-black/5 animate-in fade-in zoom-in duration-200 z-[200]">
                            <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Select Theme</div>
                            {(Object.keys(THEMES) as ThemeName[]).map((themeKey) => (
                                <button key={themeKey} onClick={() => setTheme(themeKey)} className={`w-full text-left px-4 py-2 text-sm font-bold flex items-center justify-between transition-colors ${appState.theme === themeKey ? `bg-slate-50 dark:bg-slate-700/50 ${getTextColor(THEMES[themeKey].light.scaleBg)} ${getTextColor(THEMES[themeKey].dark.scaleBg)}` : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50'}`}>
                                    {THEMES[themeKey].name}
                                </button>
                            ))}
                            <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-700 mt-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Neck Visuals</div>
                            <div className="px-4 py-3">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Material</label>
                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    {(['vector', 'rosewood', 'maple', 'ebony'] as FretboardMaterial[]).map((mat) => (
                                        <button key={mat} onClick={() => setAppState(prev => ({ ...prev, fretboardMaterial: mat }))} className={`px-2 py-1.5 text-[10px] font-black rounded border transition-all ${appState.fretboardMaterial === mat ? `${palette.light.scaleBg} ${palette.light.scaleText} border-transparent` : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{mat.toUpperCase()}</button>
                                    ))}
                                </div>

                                <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-700">
                                    <span className="text-xs font-bold text-slate-900 dark:text-white">Enable Inlays</span>
                                    <button 
                                        onClick={() => setAppState(prev => ({ ...prev, inlaysEnabled: !prev.inlaysEnabled }))}
                                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${appState.inlaysEnabled ? palette.light.scaleBg : 'bg-slate-200 dark:bg-slate-700'}`}
                                    >
                                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${appState.inlaysEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </button>
                                </div>

                                {appState.inlaysEnabled && (
                                    <div className="mt-2 space-y-3 animate-in slide-in-from-top-2">
                                        <div>
                                            <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1.5">Style</label>
                                            <div className="flex gap-1">
                                                {(['dots', 'blocks', 'diamond'] as InlayStyle[]).map(style => (
                                                    <button key={style} onClick={() => setAppState(prev => ({ ...prev, inlayStyle: style }))} className={`px-2 py-1 text-[9px] font-black rounded border ${appState.inlayStyle === style ? 'bg-slate-200 dark:bg-slate-600' : 'bg-transparent text-slate-400'}`}>{style.toUpperCase()}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1.5">Material</label>
                                            <div className="flex gap-1">
                                                {(['pearl', 'abalone', 'neon'] as InlayMaterial[]).map(mat => (
                                                    <button key={mat} onClick={() => setAppState(prev => ({ ...prev, inlayMaterial: mat }))} className={`px-2 py-1 text-[9px] font-black rounded border ${appState.inlayMaterial === mat ? 'bg-slate-200 dark:bg-slate-600' : 'bg-transparent text-slate-400'}`}>{mat.toUpperCase()}</button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <button onClick={toggleThemeMode} title="Toggle Mode" className={buttonStyle}>
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

            <div className="md:h-8 md:w-px md:bg-slate-200 md:dark:bg-slate-800"></div>

            <div className="relative" ref={settingsMenuRef}>
                <button onClick={() => setIsSettingsMenuOpen(!isSettingsMenuOpen)} title="Settings" className={buttonStyle}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </button>
                {isSettingsMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 ring-1 ring-black/5 animate-in fade-in zoom-in duration-200 z-[200]">
                        <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700 text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Options</div>
                        <button onClick={toggleLeftHanded} className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">Left Handed</span>
                            <div className={`w-9 h-5 rounded-full relative transition-colors ${appState.isLeftHanded ? palette.light.scaleBg : 'bg-slate-200 dark:bg-slate-700'}`}>
                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${appState.isLeftHanded ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                            </div>
                        </button>
                        <button onClick={() => setAppState(prev => ({ ...prev, enableNotePreview: !prev.enableNotePreview }))} className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">Note Feedback</span>
                            <div className={`w-9 h-5 rounded-full relative transition-colors ${appState.enableNotePreview ? palette.light.scaleBg : 'bg-slate-200 dark:bg-slate-700'}`}>
                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${appState.enableNotePreview ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                            </div>
                        </button>
                    </div>
                )}
            </div>
            
            <button onClick={() => setIsInfoModalOpen(true)} title="About & Support" className={buttonStyle}>
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
            </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {!isMobile && <Controls state={appState} setState={setAppState} />}
        
        <div className="flex-1 overflow-hidden relative flex flex-col justify-center transition-colors duration-300">
           <div className={`absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-200 via-transparent to-transparent dark:from-white/5 dark:via-transparent dark:to-transparent opacity-50 pointer-events-none`}></div>
           <div className="relative z-10 w-full px-2 md:px-4 flex flex-col h-full justify-center">
              {!isMobile && (
                  <div className="mb-4 md:mb-8 text-center flex-shrink-0">
                      {!appState.selectedChord ? (
                        <>
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white mb-2 md:mb-4">
                                <span className={`${getTextColor(palette.light.rootBg)} ${getTextColor(palette.dark.rootBg)}`}>{appState.rootNote}</span> {appState.scale.name}
                            </h2>
                            <div className="flex flex-wrap justify-center gap-1 md:gap-2 max-w-4xl mx-auto">
                                {getScaleNotes(appState.rootNote, appState.scale).map(note => {
                                  const isActive = appState.focusedNote === note;
                                  return (
                                    <button key={note} onClick={() => toggleFocusedNote(note)} className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-sm md:text-lg font-black transition-all ${isActive ? `${palette.light.scaleBg} ${palette.dark.scaleBg} ${palette.light.scaleText} ${palette.dark.scaleText} scale-110 shadow-lg ring-2` : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:scale-105 shadow-sm'}`}>{note}</button>
                                  );
                                })}
                            </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center">
                             <p className="text-amber-600 dark:text-amber-500 text-xs md:text-sm font-bold uppercase tracking-widest animate-pulse mb-1">Explorer Mode</p>
                             <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-xs md:text-base">Constructing <span className="text-amber-500 font-bold">{identifiedChordName}</span> voicing.</p>
                        </div>
                      )}
                  </div>
              )}
              
              <div className="flex-shrink-0 min-h-0">
                <Fretboard 
                    tuning={appState.tuning} rootNote={appState.rootNote} scale={appState.scale}
                    showAllNotes={appState.showAllNotes} zoomLevel={appState.zoomLevel}
                    selectedChord={appState.selectedChord} theme={appState.theme}
                    isLeftHanded={appState.isLeftHanded} onNoteClick={handleNoteClick}
                    chordDisplayMode={appState.chordDisplayMode} focusedNote={appState.focusedNote}
                    fretboardMaterial={appState.fretboardMaterial} inlaysEnabled={appState.inlaysEnabled}
                    inlayStyle={appState.inlayStyle} inlayMaterial={appState.inlayMaterial}
                />
              </div>

               {!isMobile && (
                  <div className="mt-4 md:mt-8 text-center flex-shrink-0">
                      <p className="text-[10px] md:text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          {appState.selectedChord ? 'Pin/Unpin Frets • Cycle Nut Status: Open • Muted • Empty' : 'Click any note to start a chord • Header notes to isolate'}
                      </p>
                  </div>
               )}
           </div>
        </div>

        {isMobile && appState.selectedChord && (
            <button 
                onClick={handleStrum}
                className={`fixed bottom-24 right-6 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all active:scale-90 z-[150] ${palette.light.scaleBg} ${palette.dark.scaleBg} ${palette.light.scaleText} ${palette.dark.scaleText}`}
            >
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                </svg>
            </button>
        )}
      </main>

      {isMobile && (
          <nav ref={navRef} className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 flex items-center justify-around h-20 pb-safe z-[150]">
              {[
                  { id: 'scale', label: 'Theory', icon: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3' },
                  { id: 'instrument', label: 'Tuning', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
                  { id: 'riff', label: 'Saved', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' }
              ].map((tab) => (
                  <button key={tab.id} onClick={() => setMobileActiveDrawer(prev => prev === tab.id ? null : tab.id as any)} className={`flex flex-col items-center justify-center w-full h-full transition-all ${mobileActiveDrawer === tab.id ? getTextColor(palette.light.scaleBg) + ' ' + getTextColor(palette.dark.scaleBg) : 'text-slate-400 dark:text-slate-500'}`}>
                      <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={mobileActiveDrawer === tab.id ? 2.5 : 2} d={tab.icon} /></svg>
                      <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                  </button>
              ))}
          </nav>
      )}

      {isMobile && mobileActiveDrawer && (
          <div className="fixed inset-0 z-[155] bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" />
      )}

      {isMobile && mobileActiveDrawer && (
          <div ref={drawerRef} className="fixed bottom-0 left-0 right-0 z-[160] bg-white dark:bg-slate-900 rounded-t-[32px] shadow-2xl border-t border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[75vh] animate-in slide-in-from-bottom duration-300">
              <div className="flex-shrink-0 flex justify-center py-4">
                  <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
              </div>
              
              <div className="flex-1 overflow-y-auto px-6 pb-32 overscroll-contain">
                {mobileActiveDrawer === 'scale' && (
                    <div className="space-y-8">
                        {appState.selectedChord ? (
                            /* Chord Explorer Mobile Drawer Content */
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Show Notes In</label>
                                    <select 
                                        value={appState.selectedChord.quality.name} 
                                        onChange={(e) => {
                                            const newQuality = CHORD_QUALITIES.find(q => q.name === e.target.value);
                                            if (newQuality && appState.selectedChord) {
                                                setAppState(prev => ({ ...prev, selectedChord: { ...prev.selectedChord!, quality: newQuality } }));
                                            }
                                        }}
                                        className="w-full bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl font-black appearance-none border-none outline-none focus:ring-2 focus:ring-amber-500/50"
                                    >
                                        {CHORD_QUALITIES.map(q => <option key={q.name} value={q.name}>{q.name}</option>)}
                                    </select>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Display</label>
                                        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 h-11">
                                            {(['note', 'interval'] as ChordDisplayMode[]).map((mode) => (
                                                <button key={mode} onClick={() => setAppState(prev => ({ ...prev, chordDisplayMode: mode }))} className={`flex-1 text-[10px] font-black rounded-lg transition-all ${appState.chordDisplayMode === mode ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500'}`}>{mode.toUpperCase()}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Discovery</label>
                                        <button onClick={handleNextVoicing} className="w-full h-11 bg-slate-100 dark:bg-slate-800 text-amber-600 dark:text-amber-400 rounded-xl font-black text-[10px] flex items-center justify-center gap-2 active:bg-amber-100 transition-colors">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                            NEXT SHAPE
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                                    <button onClick={saveCurrentChord} className="w-full py-4 bg-amber-500 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                        Save to Riff Strip
                                    </button>
                                    <button onClick={clearChordExplorer} className="w-full py-4 text-slate-500 font-bold hover:text-slate-800 transition-colors">Exit Explorer</button>
                                </div>
                            </div>
                        ) : (
                            /* Scale/Theory Mobile Drawer Content */
                            <>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Root Note Selection</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {ALL_NOTES.map(n => (
                                            <button key={n} onClick={() => setAppState(prev => ({ ...prev, rootNote: n }))} className={`py-3 rounded-2xl font-black text-sm transition-all ${appState.rootNote === n ? `${palette.light.scaleBg} ${palette.dark.scaleBg} ${palette.light.scaleText} ${palette.dark.scaleText} shadow-lg scale-105` : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'}`}>{n}</button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Scale / Mode Type</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {SCALES.map(s => (
                                            <button key={s.name} onClick={() => setAppState(prev => ({ ...prev, scale: s }))} className={`py-4 px-3 rounded-2xl text-xs font-bold text-center transition-all ${appState.scale.name === s.name ? `${palette.light.scaleBg} ${palette.dark.scaleBg} ${palette.light.scaleText} ${palette.dark.scaleText} shadow-lg` : 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200'}`}>{s.name}</button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {mobileActiveDrawer === 'instrument' && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Strings</label>
                                <select value={appState.numStrings} onChange={(e) => { const n = parseInt(e.target.value); setAppState(prev => ({ ...prev, numStrings: n, tuning: TUNINGS[n][0].notes })); }} className="w-full bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl font-bold appearance-none border-none outline-none focus:ring-2 focus:ring-teal-500/50 transition-all">
                                    {[4, 5, 6, 7, 8, 9].map(n => <option key={n} value={n}>{n} Strings</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Presets</label>
                                <select onChange={(e) => { const t = TUNINGS[appState.numStrings].find(p => p.name === e.target.value); if (t) setAppState(prev => ({ ...prev, tuning: t.notes })); }} className="w-full bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl font-bold appearance-none border-none outline-none focus:ring-2 focus:ring-teal-500/50 transition-all">
                                    {TUNINGS[appState.numStrings].map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">String Setup (Individual Tunings)</label>
                            <div className="grid grid-cols-3 gap-3">
                                {appState.tuning.map((note, idx) => (
                                    <div key={idx} className="flex flex-col items-center bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl relative">
                                        <span className="text-[9px] font-bold text-slate-400 mb-1">STRING {idx + 1}</span>
                                        <select value={note} onChange={(e) => { const newT = [...appState.tuning]; newT[idx] = e.target.value as NoteName; setAppState(prev => ({ ...prev, tuning: newT })); }} className="bg-transparent font-black text-xl appearance-none text-center outline-none w-full">
                                            {ALL_NOTES.map(n => <option key={n} value={n}>{n}</option>)}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {mobileActiveDrawer === 'riff' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                             <button onClick={() => setIsImportModalOpen(true)} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs active:scale-95 transition-all hover:bg-slate-200 dark:hover:bg-slate-700">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                Import
                             </button>
                             <button onClick={handleExport} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs active:scale-95 transition-all hover:bg-slate-200 dark:hover:bg-slate-700">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Export
                             </button>
                        </div>
                        
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Your Riff Strip</label>
                        {appState.savedChords.length === 0 ? (
                            <div className="py-20 text-center flex flex-col items-center justify-center">
                                <svg className="w-12 h-12 text-slate-200 dark:text-slate-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                <span className="text-slate-400 text-sm font-bold">No saved chords.</span>
                                <span className="text-slate-300 text-xs mt-1">Select notes on the neck to build one!</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {appState.savedChords.map(saved => (
                                    <div key={saved.id} onClick={() => handleSavedChordClick(saved)} className={`flex items-center justify-between p-5 rounded-[24px] border transition-all ${appState.selectedChord?.rootNote === saved.chord.rootNote && appState.selectedChord?.quality.name === saved.chord.quality.name ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-500 ring-2 ring-amber-500/20' : 'bg-slate-50 dark:bg-slate-800/50 border-transparent hover:bg-slate-100'}`}>
                                        <div className="flex flex-col">
                                            <span className="font-black text-xl text-slate-900 dark:text-white">{saved.label}</span>
                                            <span className="text-[11px] font-mono text-slate-400">Position: Fret {saved.chord.rootFret}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button onClick={(e) => { e.stopPropagation(); audioEngine.strumChord(appState.tuning, saved.chord.customVoicing || [], saved.chord.mutedStrings || []); }} className="p-4 bg-white dark:bg-slate-700 rounded-2xl text-amber-500 shadow-md active:scale-90 transition-transform"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg></button>
                                            <button onClick={(e) => deleteSavedChord(e, saved.id)} className="p-4 bg-rose-500/10 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
              </div>
          </div>
      )}

      {isImportModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
           <div ref={modalRef} className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                 <h3 className="text-xl font-bold text-slate-900 dark:text-white">Import Session</h3>
                 <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <div className="p-6">
                 <textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder='Paste JSON config here...' className="w-full h-72 p-5 font-mono text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-teal-500/20 transition-all" />
              </div>
              <div className="px-6 py-5 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
                 <button onClick={() => setIsImportModalOpen(false)} className="px-5 py-2 text-sm font-bold text-slate-600">Cancel</button>
                 <button onClick={handleImport} className={`px-8 py-2 rounded-2xl text-sm font-black shadow-lg transition-all ${palette.light.scaleBg} ${palette.dark.scaleBg} ${palette.light.scaleText} ${palette.dark.scaleText}`}>Restore Configuration</button>
              </div>
           </div>
        </div>
      )}

      {isInfoModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
           <div ref={infoModalRef} className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
                 <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Fret Visual</h3>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-500 uppercase">Beta</span>
                 </div>
                 <button onClick={() => setIsInfoModalOpen(false)} className="text-slate-400 hover:text-slate-600"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                 <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6 flex-shrink-0">
                    <button onClick={() => setInfoTab('about')} className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${infoTab === 'about' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>ABOUT</button>
                    <button onClick={() => setInfoTab('donate')} className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${infoTab === 'donate' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>DONATE</button>
                    <button onClick={() => setInfoTab('support')} className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${infoTab === 'support' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>SUPPORT</button>
                 </div>
                 
                 {infoTab === 'about' && (
                     <div className="space-y-6 animate-in slide-in-from-left-4 fade-in duration-300">
                         <div>
                             <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-2">Built for Exploration</h4>
                             <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                 Fret Visual brings together the tools needed for writing music on guitar-family instruments into a single, cohesive workspace. It is designed to help you visualize context, discover new voicings, and explore the neck without switching between different reference tools.
                             </p>
                         </div>
                         <div>
                             <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-2">The Engine</h4>
                             <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                 Unlike static chord dictionaries, the <strong>Geometric Voicing Engine</strong> calculates playable shapes in real-time based on your specific tuning and instrument configuration. It prioritizes ergonomic reach, allowing it to support anything from a standard 6-string guitar to a 9-string extended range instrument.
                             </p>
                         </div>
                         <div className="pt-4">
                             <a href="https://github.com/jbridgma/Fret-Visual" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm hover:opacity-90 transition-opacity">
                                 <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"></path></svg>
                                 View Source on GitHub
                             </a>
                         </div>
                     </div>
                 )}

                 {infoTab === 'donate' && (
                     <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                         <div>
                             <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-3">Support the Project</h4>
                             <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50">
                                 <iframe 
                                    id='kofiframe' 
                                    src='https://ko-fi.com/fretvisual/?hidefeed=true&widget=true&embed=true&preview=true' 
                                    style={{ border: 'none', width: '100%', padding: '4px', background: '#f9f9f9' }} 
                                    height='500' 
                                    title='fretvisual'
                                 ></iframe>
                             </div>
                             <p className="mt-3 text-xs text-center text-slate-400">
                                 Fret Visual is free, ad-free, and respects your privacy.
                             </p>
                         </div>
                     </div>
                 )}

                 {infoTab === 'support' && (
                     <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                         <div>
                             <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-3">Feedback & Contact</h4>
                             <div className="flex flex-col gap-3">
                                 <a href="mailto:support@fretvisual.org" className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group">
                                     <div className={`p-2 rounded-lg ${palette.light.scaleBg} ${palette.dark.scaleBg} ${palette.light.scaleText} ${palette.dark.scaleText}`}>
                                         <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                     </div>
                                     <div className="flex flex-col">
                                         <span className="text-sm font-bold text-slate-900 dark:text-white">Email Support</span>
                                         <span className="text-xs text-slate-500 dark:text-slate-400">support@fretvisual.org</span>
                                     </div>
                                 </a>
                                 <a href="https://github.com/jbridgma/Fret-Visual/issues" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group">
                                     <div className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                         <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                                     </div>
                                     <div className="flex flex-col">
                                         <span className="text-sm font-bold text-slate-900 dark:text-white">Report a Bug</span>
                                         <span className="text-xs text-slate-500 dark:text-slate-400">Open an issue on GitHub</span>
                                     </div>
                                 </a>
                             </div>
                         </div>
                     </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
