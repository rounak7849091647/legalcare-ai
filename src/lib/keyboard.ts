/**
 * Keyboard handling for the chat composer.
 *
 * Chat convention (ChatGPT / Slack / WhatsApp Web):
 *   - Enter               -> send the message
 *   - Shift + Enter       -> insert a newline
 *
 * This is a pure function so it can be unit-tested without a DOM. It takes the
 * fields we care about from a KeyboardEvent and returns whether the composer
 * should submit.
 *
 * IMPORTANT for a multilingual app: while an IME is composing (typing Hindi,
 * Tamil, Bengali, Chinese, Japanese, etc.), Enter confirms the candidate word —
 * it must NOT submit. Browsers signal this via `event.isComposing` and, on older
 * engines, `keyCode === 229`. Both are checked.
 */
export interface EnterKeyState {
  key: string;
  shiftKey: boolean;
  /** Cross-browser: also treat ctrl/cmd+Enter as newline-safe (never here). */
  isComposing?: boolean;
  keyCode?: number;
}

export const shouldSubmitOnEnter = (e: EnterKeyState): boolean => {
  if (e.key !== 'Enter') return false;       // only the Enter key
  if (e.shiftKey) return false;              // Shift+Enter -> newline
  if (e.isComposing) return false;           // mid-IME composition -> Enter confirms candidate
  if (e.keyCode === 229) return false;       // legacy IME sentinel (older browsers)
  return true;                               // plain Enter -> send
};
