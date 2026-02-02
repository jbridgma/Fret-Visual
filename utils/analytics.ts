import { NoteName } from "../types";

/**
 * Clean wrapper for gtag to prevent errors if blocked by extensions
 */
export const trackEvent = (action: string, params?: object) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', action, params);
  }
};

/**
 * Tracks virtual page views for Single Page App transitions
 */
export const trackPageView = (pageName: string) => {
  trackEvent('page_view', { 
    page_title: pageName, 
    page_location: window.location.href,
    page_path: `/${pageName.toLowerCase().replace(/\s+/g, '-')}` 
  });
};

interface NoteInteractionParams {
    note_name: NoteName;
    fret_number: number;
    string_index: number;
    tuning_context: string;
    string_count: number;
    mode: 'theory' | 'explorer';
}

/**
 * Specifically tracks note interactions on the fretboard for heatmapping
 */
export const trackNoteInteraction = (params: NoteInteractionParams) => {
    trackEvent('note_interaction', params);
};