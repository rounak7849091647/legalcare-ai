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
  const [state, setState] = useState<InactivityPromptState>({
    promptIndex: 0,
    isWaitingForResponse: false
  });
  
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const promptTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Reset inactivity timer
  const resetInactivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();

    // Reset prompt state
    setState({ promptIndex: 0, isWaitingForResponse: false });

    // Clear existing timers
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    if (promptTimerRef.current) {
      clearTimeout(promptTimerRef.current);
      promptTimerRef.current = null;
    }

    // Only set new timer if voice mode is active, we're listening for the user,
    // and the AI isn't speaking/loading.
    if (isActive && isListening && !isSpeaking && !isLoading) {
      inactivityTimerRef.current = setTimeout(() => {
        // Start the prompt sequence
        triggerNextPrompt(0);
      }, INACTIVITY_TIMEOUT);
    }
  }, [isActive, isListening, isSpeaking, isLoading]);

  // Trigger the next prompt in sequence
  const triggerNextPrompt = useCallback((currentIndex: number) => {
    if (currentIndex >= INACTIVITY_PROMPTS.length) {
      // All prompts exhausted, close mic
      console.log('No response after all prompts, closing voice mode');
      onClose();
      setState({ promptIndex: 0, isWaitingForResponse: false });
      return;
    }

    const prompt = INACTIVITY_PROMPTS[currentIndex];
    console.log(`Inactivity prompt ${currentIndex + 1}: ${prompt}`);
    
    setState({ 
      promptIndex: currentIndex + 1, 
      isWaitingForResponse: true 
    });
    
    onPrompt(prompt);
    
    // Wait for response
    promptTimerRef.current = setTimeout(() => {
      // No response, try next prompt
      triggerNextPrompt(currentIndex + 1);
    }, PROMPT_RESPONSE_TIMEOUT);
  }, [onPrompt, onClose]);

  // Called when user provides any input (voice or otherwise)
  const onUserActivity = useCallback(() => {
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  // Effect to manage timers based on state changes
  useEffect(() => {
    if (!isActive) {
      // Clear all timers when voice mode is off
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      if (promptTimerRef.current) {
        clearTimeout(promptTimerRef.current);
        promptTimerRef.current = null;
      }
      setState({ promptIndex: 0, isWaitingForResponse: false });
      return;
    }

    // Never allow the inactivity countdown to run while the AI is speaking/loading,
    // or when we're not actually listening for the user.
    if (isSpeaking || isLoading || !isListening) {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      return;
    }

    // Start/reset timer when we're ready for user input.
    // IMPORTANT: don't reset while we're in the inactivity prompt sequence,
    // otherwise prompt #1 repeats forever and #2/#3 never run.
    if (!state.isWaitingForResponse) {
      resetInactivityTimer();
    }
  }, [isActive, isListening, isSpeaking, isLoading, resetInactivityTimer, state.isWaitingForResponse]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (promptTimerRef.current) clearTimeout(promptTimerRef.current);
    };
  }, []);

  return {
    currentPromptIndex: state.promptIndex,
    isWaitingForResponse: state.isWaitingForResponse,
    onUserActivity,
    resetInactivityTimer
  };
};
