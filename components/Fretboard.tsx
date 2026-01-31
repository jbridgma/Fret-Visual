
import React, { useMemo, useRef, useEffect } from 'react';
import { NoteName, ScaleDefinition, SelectedChord, ZoomLevel, ThemeName, ChordDisplayMode, FretboardMaterial, InlayStyle, InlayMaterial } from '../types';
import { FRET_MARKERS, TOTAL_FRETS } from '../constants';
import { getNoteOnFret, getScaleNotes, isNoteInScale, isRootNote, getPlayableChordCandidates, getIntervalType, IntervalType, getIntervalDegree } from '../utils/musicTheory';
import { THEMES } from '../themeConfig';

interface FretboardProps {
  tuning: NoteName[];
  rootNote: NoteName;
  scale: ScaleDefinition;
  showAllNotes: boolean;
  zoomLevel: ZoomLevel;
  selectedChord: SelectedChord | null;
  theme: ThemeName;
  isLeftHanded: boolean;
  chordDisplayMode: ChordDisplayMode;
  focusedNote: NoteName | null;
  onNoteClick: (note: NoteName, stringIndex: number, fretIndex: number) => void;
  // Neck Customization
  fretboardMaterial: FretboardMaterial;
  inlaysEnabled: boolean;
  inlayStyle: InlayStyle;
  inlayMaterial: InlayMaterial;
}

const Fretboard: React.FC<FretboardProps> = ({ 
  tuning, 
  rootNote, 
  scale, 
  showAllNotes, 
  zoomLevel,
  selectedChord,
  theme,
  isLeftHanded,
  chordDisplayMode,
  focusedNote,
  onNoteClick,
  fretboardMaterial,
  inlaysEnabled,
  inlayStyle,
  inlayMaterial
}) => {
  const palette = THEMES[theme];
  const scaleNotes = useMemo(() => getScaleNotes(rootNote, scale), [rootNote, scale]);
  
  const chordCandidates = useMemo(() => {
    if (!selectedChord) return new Set<string>();
    return getPlayableChordCandidates(
        tuning, 
        selectedChord.rootNote, 
        selectedChord.quality, 
        selectedChord.rootFret
    );
  }, [selectedChord, tuning]);

  const pinnedNotes = useMemo(() => new Set<string>(selectedChord?.customVoicing || []), [selectedChord]);
  const mutedStrings = useMemo(() => new Set<number>(selectedChord?.mutedStrings || []), [selectedChord]);
  
  const pinnedStrings = useMemo(() => {
    const strings = new Set<number>();
    pinnedNotes.forEach(pos => {
        const [sIdx] = pos.split('-').map(Number);
        strings.add(sIdx);
    });
    return strings;
  }, [pinnedNotes]);

  const reversedTuning = [...tuning].reverse();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      if (scrollRef.current) {
          const { scrollWidth, clientWidth } = scrollRef.current;
          if (zoomLevel === 'fit' || zoomLevel === 'low') {
              scrollRef.current.scrollTo({ 
                left: isLeftHanded ? scrollWidth : 0, 
                behavior: 'smooth' 
              });
          } else if (zoomLevel === 'high') {
              const target = isLeftHanded ? 0 : scrollWidth * 0.45;
              scrollRef.current.scrollTo({ left: target, behavior: 'smooth' });
          }
      }
  }, [zoomLevel, isLeftHanded]);

  // Mobile optimization: Minimum width/height for touch targets
  const fretMinWidth = zoomLevel === 'fit' ? 'min-w-[40px] md:min-w-[45px]' : 'min-w-[90px] md:min-w-[100px]';
  const horizontalOrderClass = isLeftHanded ? 'flex-row-reverse' : 'flex-row';

  const getFretboardBgColor = () => {
      switch (fretboardMaterial) {
          case 'rosewood': return '#8c6b4f'; 
          case 'maple': return '#f5e1b5';
          case 'ebony': return '#352319'; 
          default: return ''; 
      }
  };

  const getInlayBaseColor = () => {
      switch (inlayMaterial) {
          case 'abalone': return '#7fbfaf';
          case 'neon': return '#00f3ff';
          case 'pearl': 
          default: return '#ffffff';
      }
  };

  const getInlayFilter = () => {
      if (inlayMaterial === 'abalone') return 'url(#abaloneFilter)';
      return undefined; 
  };

  const renderInlay = (fretNum: number) => {
      if (!inlaysEnabled || !FRET_MARKERS.includes(fretNum)) return null;
      const isDouble = fretNum === 12 || fretNum === 24;
      const baseColor = getInlayBaseColor();
      const filter = getInlayFilter();

      const inlayContent = () => {
          switch (inlayStyle) {
              case 'blocks':
                  return (
                      <div className="w-full h-full flex items-center justify-center p-2">
                          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                              <path d="M15,10 L85,25 L85,75 L15,90 Z" fill={baseColor} filter={filter} style={{ opacity: 1 }} />
                          </svg>
                      </div>
                  );
              case 'diamond':
                  return (
                      <div className="w-full h-full flex items-center justify-center">
                          <svg width="32" height="270" viewBox="0 0 32 270">
                               <polygon points="16,0 32,135 16,270 0,135" fill={baseColor} filter={filter} style={{ opacity: 1 }} />
                          </svg>
                      </div>
                  );
              case 'dots':
              default:
                  return (
                      <div className={`flex flex-col gap-10 items-center justify-center h-full`}>
                          <div style={{ backgroundColor: baseColor, filter: filter, width: '24px', height: '24px', borderRadius: '50%', opacity: 1, border: '1px solid rgba(0,0,0,0.05)' }}></div>
                          {isDouble && <div style={{ backgroundColor: baseColor, filter: filter, width: '24px', height: '24px', borderRadius: '50%', opacity: 1, border: '1px solid rgba(0,0,0,0.05)' }}></div>}
                      </div>
                  );
          }
      };

      return (
          <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden flex items-center justify-center">
              {inlayContent()}
          </div>
      );
  };

  return (
    <div 
        ref={scrollRef}
        className={`w-full overflow-x-auto fret-scroll border-t-4 border-b-4 border-slate-200 dark:border-slate-800 shadow-2xl relative select-none transition-colors duration-300 touch-pan-x`}
        style={{ backgroundColor: getFretboardBgColor() }}
    >
      <svg style={{ height: 0, width: 0, position: 'absolute' }}>
        <defs>
            <filter id="woodGrain">
                <feTurbulence type="fractalNoise" baseFrequency="0.02 0.3" numOctaves="4" result="noise" />
                <feColorMatrix type="matrix" values="0.4 0 0 0 0.2 0.2 0 0 0 0.1 0.1 0 0 0 0.05 0 0 0 1 0" />
                <feBlend mode="multiply" in="SourceGraphic" />
            </filter>
            <filter id="woodGrainLight">
                <feTurbulence type="fractalNoise" baseFrequency="0.02 0.3" numOctaves="4" result="noise" />
                <feColorMatrix type="matrix" values="0.6 0 0 0 0.2 0.4 0 0 0 0.1 0.2 0 0 0 0.05 0 0 0 0.6 0" />
                <feBlend mode="multiply" in="SourceGraphic" />
            </filter>
            <filter id="woodGrainEbony">
                <feTurbulence type="fractalNoise" baseFrequency="0.02 0.3" numOctaves="4" result="noise" />
                <feColorMatrix type="matrix" values="0.2 0 0 0 0 0.2 0 0 0 0 0.2 0 0 0 0 0 0 0 0.8 0" />
                <feBlend mode="multiply" in="SourceGraphic" />
            </filter>
            <filter id="abaloneFilter" x="-20%" y="-20%" width="140%" height="140%">
                <feFlood flood-color="#4a7a7a" result="flood" />
                <feComposite in="flood" in2="SourceGraphic" operator="in" result="opaqueBase" />
                <feTurbulence type="fractalNoise" baseFrequency="0.12" numOctaves="4" result="noise" />
                <feColorMatrix in="noise" type="matrix" values="0 2 1 0 -0.2 1 0 2 0 -0.1 0 1 1 0 0.1 0 0 0 0 1" result="iridescence" />
                <feBlend mode="overlay" in="iridescence" in2="opaqueBase" result="texturedBase" />
                <feSpecularLighting surfaceScale="2" specularConstant="1.2" specularExponent="35" lighting-color="#ccffff" in="noise">
                    <fePointLight x="-100" y="-100" z="150" />
                </feSpecularLighting>
                <feComposite in2="SourceGraphic" operator="in" result="sheen" />
                <feBlend mode="screen" in="sheen" in2="texturedBase" result="final" />
                <feComposite in="final" in2="SourceGraphic" operator="in" />
            </filter>
        </defs>
      </svg>

      <div className="relative py-12" style={{ width: 'max-content' }}>
        
        {fretboardMaterial !== 'vector' && (
            <div 
                className="absolute inset-0 pointer-events-none z-0" 
                style={{ 
                    backgroundColor: getFretboardBgColor(),
                    filter: fretboardMaterial === 'rosewood' ? 'url(#woodGrain)' : (fretboardMaterial === 'maple' ? 'url(#woodGrainLight)' : 'url(#woodGrainEbony)'),
                    backgroundImage: 'linear-gradient(90deg, transparent 95%, rgba(0,0,0,0.1) 100%), radial-gradient(circle at 50% 50%, rgba(255,255,255,0.02), transparent)'
                }}
            />
        )}

        {fretboardMaterial === 'vector' && (
            <div className={`absolute inset-0 z-0 ${palette.light.fretboardBg} ${palette.dark.fretboardBg}`} />
        )}

        <div className={`absolute inset-0 flex pointer-events-none z-10 ${horizontalOrderClass}`}>
            <div className={`flex-shrink-0 w-16 md:w-20 ${palette.light.nutBg} ${palette.dark.nutBg} ${isLeftHanded ? 'border-l-8' : 'border-r-8'} border-amber-900/10 dark:border-amber-100/20 relative z-20 flex flex-col justify-end pb-2 items-center transition-colors`}>
                 <span className="text-[10px] md:text-xs text-slate-400 dark:text-slate-500 font-bold tracking-widest uppercase mb-2">Nut</span>
            </div>
            {Array.from({ length: TOTAL_FRETS }).map((_, i) => {
                const fretNum = i + 1;
                const isMarked = FRET_MARKERS.includes(fretNum);
                const fretBorderClass = fretboardMaterial === 'maple' ? 'border-amber-900/25' : 'border-slate-300 dark:border-slate-400/30';

                return (
                    <div 
                        key={fretNum} 
                        className={`flex-1 ${isLeftHanded ? 'border-l-2' : 'border-r-2'} ${fretBorderClass} relative flex flex-col justify-end items-center pb-2 ${fretMinWidth} ${isMarked && fretboardMaterial === 'vector' ? 'bg-slate-100/50 dark:bg-slate-800/40' : ''}`}
                    >
                        {renderInlay(fretNum)}
                        <span className="text-slate-400 dark:text-slate-500 font-mono text-[10px] md:text-xs mt-2 relative z-20">{fretNum}</span>
                    </div>
                );
            })}
        </div>

        {/* Height calculation: mobile strings need more room for touch */}
        <div className="relative z-30 flex flex-col justify-between h-[340px] md:h-[400px]">
          {reversedTuning.map((stringRoot, visualStringIndex) => {
             const originalStringIndex = tuning.length - 1 - visualStringIndex;
             const isStringPinned = pinnedStrings.has(originalStringIndex);
             const isStringMuted = mutedStrings.has(originalStringIndex);
             const stringColor = fretboardMaterial === 'maple' ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.25)';

             return (
              <div key={visualStringIndex} className={`relative w-full flex items-center flex-1 ${horizontalOrderClass}`}>
                <div className={`absolute w-full h-[1px] md:h-[1.5px] pointer-events-none`} style={{ backgroundColor: stringColor }}></div>
                <div className="w-16 md:w-20 flex-shrink-0 flex justify-center items-center relative z-40">
                     <Note 
                        note={stringRoot} 
                        rootNote={rootNote}
                        theme={theme}
                        displayMode={chordDisplayMode}
                        interval={selectedChord ? getIntervalType(selectedChord.rootNote, stringRoot) : undefined} 
                        chordRoot={selectedChord?.rootNote}
                        inScale={isNoteInScale(stringRoot, scaleNotes)}
                        showAll={showAllNotes}
                        focusedNote={focusedNote}
                        chordState={selectedChord ? {
                            isPinned: pinnedNotes.has(`${originalStringIndex}-0`),
                            isMuted: isStringMuted,
                            isTrueRoot: originalStringIndex === selectedChord.rootStringIndex && 0 === selectedChord.rootFret,
                            isPlayable: (isStringPinned || isStringMuted)
                                ? pinnedNotes.has(`${originalStringIndex}-0`) 
                                : chordCandidates.has(`${originalStringIndex}-0`),
                            stringIsPinned: isStringPinned,
                            stringIsMuted: isStringMuted
                        } : undefined}
                        onClick={() => onNoteClick(stringRoot, originalStringIndex, 0)}
                     />
                </div>
                <div className={`flex-1 flex h-full ${horizontalOrderClass}`}>
                    {Array.from({ length: TOTAL_FRETS }).map((_, fretIndex) => {
                        const fretNum = fretIndex + 1;
                        const note = getNoteOnFret(stringRoot, fretNum);
                        const posId = `${originalStringIndex}-${fretNum}`;
                        return (
                            <div key={fretNum} className={`flex-1 flex justify-center items-center relative z-40 ${fretMinWidth}`}>
                                <Note 
                                    note={note} 
                                    rootNote={rootNote}
                                    theme={theme}
                                    displayMode={chordDisplayMode}
                                    interval={selectedChord ? getIntervalType(selectedChord.rootNote, note) : undefined}
                                    chordRoot={selectedChord?.rootNote}
                                    inScale={isNoteInScale(note, scaleNotes)} 
                                    showAll={showAllNotes}
                                    focusedNote={focusedNote}
                                    chordState={selectedChord ? {
                                        isPinned: pinnedNotes.has(posId),
                                        isMuted: false, 
                                        isTrueRoot: originalStringIndex === selectedChord.rootStringIndex && fretNum === selectedChord.rootFret,
                                        isPlayable: (isStringPinned || isStringMuted) 
                                            ? pinnedNotes.has(posId) 
                                            : chordCandidates.has(posId),
                                        stringIsPinned: isStringPinned,
                                        stringIsMuted: isStringMuted
                                    } : undefined}
                                    onClick={() => onNoteClick(note, originalStringIndex, fretNum)}
                                />
                            </div>
                        );
                    })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface NoteProps { 
    note: NoteName; 
    rootNote: NoteName; 
    theme: ThemeName;
    displayMode: ChordDisplayMode;
    interval?: IntervalType;
    chordRoot?: NoteName;
    inScale: boolean; 
    showAll: boolean;
    focusedNote: NoteName | null;
    chordState?: {
        isPinned: boolean;
        isMuted: boolean;
        isPlayable: boolean;
        isTrueRoot: boolean;
        stringIsPinned: boolean;
        stringIsMuted: boolean;
    };
    onClick: () => void;
}

const Note: React.FC<NoteProps> = ({ note, rootNote, theme, displayMode, interval, chordRoot, inScale, showAll, focusedNote, chordState, onClick }) => {
    const palette = THEMES[theme];
    // Mobile optimization: slightly larger notes on small screens
    let containerClass = "w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center text-xs md:text-sm font-bold shadow-sm transition-all duration-300 transform cursor-pointer select-none touch-manipulation ";

    const isCurrentlyFocused = focusedNote === note;
    const someNoteIsFocused = focusedNote !== null;

    const getDisplayText = () => {
        if (chordState && chordState.isMuted) return '✕';
        if (chordState && displayMode === 'interval' && chordRoot) {
            return getIntervalDegree(chordRoot, note);
        }
        return note;
    };

    if (chordState) {
        if (chordState.isMuted) {
            containerClass += " bg-rose-500/10 text-rose-600 border border-rose-500/30 scale-100 z-50 ring-2 ring-rose-500 ring-offset-1 ring-offset-white dark:ring-offset-slate-900";
            return <div className={containerClass} onClick={onClick}>✕</div>;
        }

        if (chordState.isPlayable) {
            const isChordRoot = interval === 'root';
            
            if (chordState.isTrueRoot) {
                containerClass += " scale-150 md:scale-175 z-[60] ";
            } else {
                containerClass += chordState.isPinned ? " scale-110 z-50 " : " scale-100 z-40 ";
            }

            if (isChordRoot) {
                containerClass += ` ${palette.light.chordRootBg} ${palette.dark.chordRootBg} ${palette.light.chordRootText} ${palette.dark.chordRootText} shadow-lg `;
            } else {
                containerClass += ` ${palette.light.chordToneBg} ${palette.dark.chordToneBg} ${palette.light.chordToneText} ${palette.dark.chordToneText} `;
            }

            if (!chordState.isPinned) {
                containerClass += " animate-pulse opacity-90 ";
            }

            containerClass += " ring-offset-1 ring-offset-white dark:ring-offset-slate-900 ";
            
            switch(interval) {
                case 'root': 
                    containerClass += ` ring-2 ${palette.light.chordRootRing} ${palette.dark.chordRootRing} `; 
                    break;
                case '3rd':  
                    containerClass += " ring-2 ring-rose-500 "; 
                    break;
                case '5th':  
                    containerClass += " ring-2 ring-teal-500 "; 
                    break;
                case '7th':  
                    containerClass += " ring-2 ring-purple-500 "; 
                    break;
                default:     
                    containerClass += ` ring-2 ${palette.light.chordToneRing} ${palette.dark.chordToneRing} `; 
                    break;
            }
            
        } else if (chordState.stringIsPinned || chordState.stringIsMuted) {
            containerClass += " opacity-0 pointer-events-none";
        } else if (inScale) {
             containerClass += " bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 border border-slate-200 dark:border-slate-700 opacity-20 scale-50";
        } else {
             containerClass += " opacity-0 pointer-events-none"; 
        }
    } else {
        const isRoot = isRootNote(note, rootNote);
        if (isRoot) {
            containerClass += ` scale-125 z-50 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ${palette.light.rootBg} ${palette.dark.rootBg} ${palette.light.rootText} ${palette.dark.rootText} ${palette.light.rootRing} ${palette.dark.rootRing} `;
        } else if (inScale) {
            containerClass += ` z-40 ${palette.light.scaleBg} ${palette.dark.scaleBg} ${palette.light.scaleText} ${palette.dark.scaleText} `;
        } else {
            if (showAll) {
                containerClass += " bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-300 dark:border-slate-700 opacity-60 scale-75";
            } else {
                 containerClass += " opacity-0 pointer-events-none";
            }
        }
    }

    if (someNoteIsFocused && !isCurrentlyFocused) {
        containerClass += " opacity-20 grayscale scale-90 ";
    } else if (someNoteIsFocused && isCurrentlyFocused) {
        containerClass += " ring-4 ring-yellow-400 dark:ring-yellow-500 ring-offset-4 ring-offset-white dark:ring-offset-slate-950 scale-125 z-[70] shadow-2xl ";
    }

    return (
        <div className={containerClass} onClick={onClick}>
            {getDisplayText()}
        </div>
    );
};

export default Fretboard;
