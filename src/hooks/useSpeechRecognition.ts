import { useState, useCallback, useRef, useEffect } from 'react';
import { isMobileDevice } from './useMobileAudio';
import { detectLanguageFromText } from '@/lib/languageDetection';

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

// Language detection is handled by the shared utility in @/lib/languageDetection.
// It covers Unicode scripts + romanized Tamil, Telugu, Kannada, Malayalam, Hinglish.

export const useSpeechRecognition = (preferredLanguage?: string): SpeechRecognitionHook => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState('en-IN');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  // Keep the selected language in a ref so recognition.lang and response routing
  // always use the CURRENT selection (startListening is memoized, so reading the
  // prop directly would use a stale value from first mount).
  const preferredLangRef = useRef<string | undefined>(preferredLanguage);
  useEffect(() => { preferredLangRef.current = preferredLanguage; }, [preferredLanguage]);

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
      const sel = preferredLangRef.current;
      if (sel && sel !== 'en-IN') {
        // Handle custom codes
        if (sel === 'hinglish') {
           recognition.lang = 'hi-IN'; // Hinglish is transcribed with the Hindi model
        } else {
           recognition.lang = sel;
        }
        console.log('Speech recognition language set to:', recognition.lang);
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
          // Language routing for voice:
          // If the user selected a specific language, the recognizer was told to
          // transcribe in THAT language — trust it. Re-detecting the transcript is
          // what turned Telugu/Bengali speech into Hindi (the browser approximates
          // unfamiliar sounds in the wrong script). Only auto-detect when the
          // selection is en-IN/auto, where the user may mix English/Hinglish/regional.
          const sel = preferredLangRef.current;
          if (sel && sel !== 'en-IN') {
            setDetectedLanguage(sel);
          } else {
            setDetectedLanguage(detectLanguageFromText(fullTranscript, 'en-IN'));
          }
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
