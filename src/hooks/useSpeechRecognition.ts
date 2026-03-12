import { useState, useCallback, useRef, useEffect } from 'react';
import { isMobileDevice } from './useMobileAudio';

interface SpeechRecognitionHook {
  isListening: boolean;
  transcript: string;
  detectedLanguage: string;
  startListening: () => Promise<void>;
  stopListening: () => void;
  resetTranscript: () => void;
  isSupported: boolean;
  error: string | null;
}

// Type declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognition, ev: Event & { error: string }) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

// Indian language detection patterns based on Unicode script ranges
const detectIndianLanguage = (text: string): string => {
  // Check for Devanagari (Hindi, Marathi)
  const devanagariCount = (text.match(/[\u0900-\u097F]/g) || []).length;
  const latinCount = (text.match(/[a-zA-Z]/g) || []).length;
  
  // If significant Devanagari, it's Hindi
  if (devanagariCount > 0 && devanagariCount >= latinCount * 0.3) {
    return 'hi-IN';
  }
  
  // Check other Indian scripts
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta-IN'; // Tamil
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te-IN'; // Telugu
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn-IN'; // Kannada
  if (/[\u0D00-\u0D7F]/.test(text)) return 'ml-IN'; // Malayalam
  if (/[\u0980-\u09FF]/.test(text)) return 'bn-IN'; // Bengali/Assamese
  if (/[\u0A80-\u0AFF]/.test(text)) return 'gu-IN'; // Gujarati
  if (/[\u0A00-\u0A7F]/.test(text)) return 'pa-IN'; // Punjabi (Gurmukhi)
  if (/[\u0B00-\u0B7F]/.test(text)) return 'or-IN'; // Odia
  
  // Check for Hinglish (Hindi words in Roman script)
  const hinglishPatterns = /\b(kya|hai|hain|nahi|aur|mein|toh|kaise|kyun|kab|kaun|kaha|ho|kar|raha|rahe|tha|thi|the|mujhe|tumhe|aap|tum|yeh|woh|kuch|bahut|accha|theek|abhi|phir)\b/i;
  if (hinglishPatterns.test(text)) {
    return 'hinglish';
  }
  
  return 'en-IN';
};

export const useSpeechRecognition = (preferredLanguage?: string): SpeechRecognitionHook => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState('en-IN');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const isSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Start listening - MUST be called from user gesture on mobile
  const startListening = useCallback(async () => {
    if (!isSupported) {
      const msg = 'Speech recognition not supported in this browser.';
      setError(msg);
      throw new Error(msg);
    }

    setError(null);

    try {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognitionAPI();
      
      const recognition = recognitionRef.current;
      
      // Settings optimized for multilingual recognition
      recognition.continuous = !isMobileDevice(); // Single result on mobile is more reliable
      recognition.interimResults = true;
      
      // Set the recognition language to match the user's selected language
      // This ensures the browser transcribes in the correct language/script
      if (preferredLanguage && preferredLanguage !== 'en-IN') {
        recognition.lang = preferredLanguage;
        console.log('Speech recognition language set to:', preferredLanguage);
      } else {
        // Default: let browser auto-detect
        recognition.lang = 'en-IN';
      }

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
        console.log('Speech recognition started - multilingual mode');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event: Event & { error: string }) => {
        console.error('Speech recognition error:', event.error);
        
        switch (event.error) {
          case 'not-allowed':
          case 'permission-denied':
            setError('Microphone access denied. Please allow in browser settings.');
            break;
          case 'no-speech':
            // Not an error
            break;
          case 'network':
            setError('Network error. Check connection.');
            break;
          case 'audio-capture':
            setError('No microphone found.');
            break;
          case 'aborted':
            break;
          default:
            if (event.error) setError(`Speech error: ${event.error}`);
        }
        
        setIsListening(false);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let fullTranscript = '';

        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript;
        }

        if (fullTranscript) {
          setDetectedLanguage(detectIndianLanguage(fullTranscript));
        }

        setTranscript(fullTranscript);
      };

      // Web Speech API handles mic permission internally
      // This MUST be triggered by user gesture on mobile
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      const msg = err instanceof Error ? err.message : 'Failed to start voice input';
      setError(msg);
      throw new Error(msg);
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore
      }
    }
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    detectedLanguage,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
    error
  };
};
