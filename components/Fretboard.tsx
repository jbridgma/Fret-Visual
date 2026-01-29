import React, { useMemo, useRef, useEffect } from 'react';
import { AppState, NoteName, ScaleDefinition, SelectedChord, ZoomLevel, ThemeName } from '../types';
import { FRET_MARKERS, TOTAL_FRETS } from '../constants';
import { getNoteOnFret, getScaleNotes, isNoteInScale, isRootNote, getPlayableChordCandidates, getIntervalType, IntervalType } from '../utils/musicTheory';
import { THEMES, ColorSet } from '../themeConfig';

interface FretboardProps {
  tuning: NoteName[];
  rootNote: NoteName;
  scale: ScaleDefinition;
  showAllNotes: boolean;
  zoomLevel: ZoomLevel;
  selectedChord: SelectedChord | null;
  theme: ThemeName;
  onNoteClick: (note: NoteName, stringIndex: number, fretIndex: number) => void;
}

const Fretboard: React.FC<FretboardProps> = ({ 
  tuning, 
  rootNote, 
  scale, 
  showAllNotes, 
  zoomLevel,
  selectedChord,
  theme,
  onNoteClick
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
          if (zoomLevel === 'fit' || zoomLevel === 'low') {
              scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
          } else if (zoomLevel === 'high') {
              const scrollTarget = (scrollRef.current.scrollWidth * 0.45); 
              scrollRef.current.scrollTo({ left: scrollTarget, behavior: 'smooth' });
          }
      }
  }, [zoomLevel]);

  const fretMinWidth = zoomLevel === 'fit' ? 'min-w-[40px]' : 'min-w-[90px]';

  return (
    <div 
        ref={scrollRef}
        className={`w-full overflow-x-auto fret-scroll ${palette.light.fretboardBg} ${palette.dark.fretboardBg} border-t-4 border-b-4 border-slate-200 dark:border-slate-800 shadow-2xl relative select-none transition-colors duration-300`}
    >
      <div 
        className="relative py-12" 
        style={{ width: 'max-content' }}
      >
        <div className="absolute inset-0 flex pointer-events-none">
            <div className={`flex-shrink-0 w-16 ${palette.light.nutBg} ${palette.dark.nutBg} border-r-8 border-amber-900/10 dark:border-amber-100/20 relative z-10 flex flex-col justify-end pb-2 items-center transition-colors`}>
                 <span className="text-xs text-slate-400 dark:text-slate-500 font-bold tracking-widest uppercase mb-2">Nut</span>
            </div>
            {Array.from({ length: TOTAL_FRETS }).map((_, i) => {
                const fretNum = i + 1;
                const isMarked = FRET_MARKERS.includes(fretNum);
                return (
                    <div 
                        key={fretNum} 
                        className={`flex-1 border-r-2 border-slate-300 dark:border-slate-400/30 relative flex flex-col justify-end items-center pb-2 ${fretMinWidth} ${isMarked ? 'bg-slate-100/50 dark:bg-slate-800/40' : ''}`}
                    >
                        <span className="text-slate-400 dark:text-slate-500 font-mono text-xs mt-2">{fretNum}</span>
                    </div>
                );
            })}
        </div>

        <div className="relative z-20 flex flex-col justify-between h-[400px]">
          {reversedTuning.map((stringRoot, visualStringIndex) => {
             const originalStringIndex = tuning.length - 1 - visualStringIndex;
             const isStringPinned = pinnedStrings.has(originalStringIndex);
             const isStringMuted = mutedStrings.has(originalStringIndex);

             return (
              <div key={visualStringIndex} className="relative w-full flex items-center">
                <div className={`absolute w-full h-[1px] bg-slate-400/30 pointer-events-none`}></div>
                <div className="w-16 flex-shrink-0 flex justify-center items-center relative z-30">
                     <Note 
                        note={stringRoot} 
                        rootNote={rootNote}
                        theme={theme}
                        interval={selectedChord ? getIntervalType(selectedChord.rootNote, stringRoot) : undefined} 
                        inScale={isNoteInScale(stringRoot, scaleNotes)}
                        showAll={showAllNotes}
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
                <div className="flex-1 flex">
                    {Array.from({ length: TOTAL_FRETS }).map((_, fretIndex) => {
                        const fretNum = fretIndex + 1;
                        const note = getNoteOnFret(stringRoot, fretNum);
                        const posId = `${originalStringIndex}-${fretNum}`;
                        return (
                            <div key={fretNum} className={`flex-1 flex justify-center items-center relative z-30 ${fretMinWidth}`}>
                                <Note 
                                    note={note} 
                                    rootNote={rootNote}
                                    theme={theme}
                                    interval={selectedChord ? getIntervalType(selectedChord.rootNote, note) : undefined}
                                    inScale={isNoteInScale(note, scaleNotes)} 
                                    showAll={showAllNotes}
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
    interval?: IntervalType;
    inScale: boolean; 
    showAll: boolean;
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

const Note: React.FC<NoteProps> = ({ note, rootNote, theme, interval, inScale, showAll, chordState, onClick }) => {
    const palette = THEMES[theme];
    let containerClass = "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm transition-all duration-300 transform cursor-pointer select-none ";

    if (chordState) {
        if (chordState.isMuted) {
            containerClass += " bg-rose-500/10 text-rose-600 border border-rose-500/30 scale-100 z-40 ring-2 ring-rose-500 ring-offset-1 ring-offset-white dark:ring-offset-slate-900";
            return <div className={containerClass} onClick={onClick}>✕</div>;
        }

        if (chordState.isPlayable) {
            const isChordRoot = interval === 'root';
            
            if (chordState.isTrueRoot) {
                containerClass += " scale-150 z-50 ";
            } else {
                containerClass += chordState.isPinned ? " scale-110 z-45 " : " scale-100 z-40 ";
            }

            // Background & Text Colors based on Interval
            if (isChordRoot) {
                containerClass += ` ${palette.light.chordRootBg} ${palette.dark.chordRootBg} ${palette.light.chordRootText} ${palette.dark.chordRootText} shadow-lg `;
            } else {
                containerClass += ` ${palette.light.chordToneBg} ${palette.dark.chordToneBg} ${palette.light.chordToneText} ${palette.dark.chordToneText} `;
            }

            if (!chordState.isPinned) {
                containerClass += " animate-pulse opacity-90 ";
            }

            containerClass += " ring-offset-1 ring-offset-white dark:ring-offset-slate-900 ";
            
            // Fixed Interval Ring Color Coding
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

    return (
        <div className={containerClass} onClick={onClick}>
            {note}
        </div>
    );
};

export default Fretboard;