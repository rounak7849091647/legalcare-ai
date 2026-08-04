/**
 * Voice-input send mode for the courtroom / discussion chat.
 *
 *  - 'auto'   : speech is transcribed and sent immediately (original behaviour).
 *  - 'manual' : speech is transcribed into the input field for the user to
 *               review/edit, then they press Send or Enter. Prevents accidental
 *               submissions and lets them fix transcription errors.
 *
 * The preference is remembered in localStorage across sessions.
 */
export type VoiceSendMode = 'auto' | 'manual';

const STORAGE_KEY = 'legalcare-voice-send-mode';

export const getVoiceSendMode = (): VoiceSendMode => {
  if (typeof window === 'undefined') return 'auto';
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'manual' ? 'manual' : 'auto';
  } catch {
    return 'auto'; // storage blocked (private mode) → safe default
  }
};

export const setVoiceSendMode = (mode: VoiceSendMode): void => {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(STORAGE_KEY, mode); } catch { /* ignore */ }
};

/**
 * Pure decision for a completed voice transcript. Kept separate from the
 * component so it can be unit-tested without a DOM.
 *   - auto   + non-empty text -> send it
 *   - manual + non-empty text -> stage it in the input for review/edit
 *   - empty text (any mode)   -> stage (never send an empty message)
 */
export const resolveVoiceTranscript = (
  mode: VoiceSendMode,
  transcript: string,
): { action: 'send' | 'stage'; text: string } => {
  const text = (transcript || '').trim();
  if (!text) return { action: 'stage', text: '' };
  return mode === 'auto' ? { action: 'send', text } : { action: 'stage', text };
};
