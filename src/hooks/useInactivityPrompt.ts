import { useState, useRef, useCallback, useEffect } from 'react';

interface InactivityPromptState {
  promptIndex: number; // 0 = none, 1 = "Are you there?", 2 = "Need more assistance?", 3 = "Need more help?"
  isWaitingForResponse: boolean;
}

const INACTIVITY_PROMPTS = [
  "Are you there?",
  "Do you need any more assistance?",
  "Do you need any more help?"
];

const INACTIVITY_TIMEOUT = 15000; // 15 seconds
const PROMPT_RESPONSE_TIMEOUT = 10000; // 10 seconds to respond to each prompt

interface UseInactivityPromptOptions {
  onPrompt: (message: string) => void;
  onClose: () => void;
  isActive: boolean; // voice mode is active
  isListening: boolean;
  isSpeaking: boolean;
  isLoading: boolean;
}

export const useInactivityPrompt = ({
  onPrompt,
  onClose,
  isActive,
  isListening,
  isSpeaking,
  isLoading
}: UseInactivityPromptOptions) => {
  // Disable all inactivity prompts as requested by user
  const resetInactivityTimer = useCallback(() => {}, []);
  const onUserActivity = useCallback(() => {}, []);

  return {
    currentPromptIndex: 0,
    isWaitingForResponse: false,
    onUserActivity,
    resetInactivityTimer
  };
};
