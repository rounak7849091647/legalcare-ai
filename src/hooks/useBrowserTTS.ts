import { useState, useCallback, useRef, useEffect } from 'react';
import { prepareTextForVoice } from '@/lib/textToVoice';

interface BrowserTTSHook {
  isSpeaking: boolean;
  speak: (text: string, language?: string) => Promise<void>;
  stop: () => void;
  isSupported: boolean;
  isLoading: boolean;
  availableVoices: SpeechSynthesisVoice[];
}

// Language to voice name preferences (prioritized list)
const VOICE_PREFERENCES: Record<string, string[]> = {
  'hi-IN': ['Google हिन्दी', 'Microsoft Swara', 'Hindi India', 'hi-IN', 'Hindi'],
  'hinglish': ['Google हिन्दी', 'Microsoft Swara', 'Hindi India', 'hi-IN', 'Hindi'],
  'ta-IN': ['Google தமிழ்', 'Microsoft Valluvar', 'Tamil India', 'ta-IN', 'Tamil'],
  'te-IN': ['Google తెలుగు', 'Microsoft Chitra', 'Telugu India', 'te-IN', 'Telugu'],
  'bn-IN': ['Google বাংলা', 'Microsoft Tanishaa', 'Bengali India', 'bn-IN', 'Bengali'],
  'mr-IN': ['Google मराठी', 'Microsoft Aarohi', 'Marathi India', 'mr-IN', 'Marathi'],
  'gu-IN': ['Google ગુજરાતી', 'Microsoft Dhwani', 'Gujarati India', 'gu-IN', 'Gujarati'],
  'kn-IN': ['Google ಕನ್ನಡ', 'Microsoft Sapna', 'Kannada India', 'kn-IN', 'Kannada'],
  'ml-IN': ['Google മലയാളം', 'Microsoft Sobhana', 'Malayalam India', 'ml-IN', 'Malayalam'],
  'pa-IN': ['Google ਪੰਜਾਬੀ', 'Microsoft Neerja', 'Punjabi India', 'pa-IN', 'Punjabi'],
  'or-IN': ['Odia India', 'or-IN', 'Odia'],
  'as-IN': ['Assamese India', 'as-IN', 'Assamese'],
  'en-IN': ['Google UK English Female', 'Microsoft Neerja', 'Google US English', 'en-IN', 'English India'],
  'en-US': ['Google US English', 'Microsoft Zira', 'en-US', 'English'],
};

const findBestVoice = (voices: SpeechSynthesisVoice[], language: string): SpeechSynthesisVoice | null => {
  const preferences = VOICE_PREFERENCES[language] || VOICE_PREFERENCES['en-IN'];
  
  // First try exact preference matches
  for (const pref of preferences) {
    const match = voices.find(v => 
      v.name.toLowerCase().includes(pref.toLowerCase()) ||
      v.lang.toLowerCase() === pref.toLowerCase()
    );
    if (match) return match;
  }
  
  // Try matching by language code
  const langCode = language.split('-')[0];
  const langMatch = voices.find(v => v.lang.startsWith(langCode));
  if (langMatch) return langMatch;
  
  // Fall back to any English voice
  const englishVoice = voices.find(v => v.lang.startsWith('en'));
  if (englishVoice) return englishVoice;
  
  // Return first available voice
  return voices[0] || null;
};

export const useBrowserTTS = (): BrowserTTSHook => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Load voices when available
  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setAvailableVoices(voices);
        console.log(`Loaded ${voices.length} TTS voices`);
      }
    };

    // Load immediately if available
    loadVoices();

    // Also listen for voiceschanged event (Chrome loads voices async)
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, [isSupported]);

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setIsSpeaking(false);
    setIsLoading(false);
  }, [isSupported]);

  const speak = useCallback(async (rawText: string, language: string = 'en-IN') => {
    if (!rawText?.trim() || !isSupported) return;

    stop();
    setIsLoading(true);

    // Clean and prepare text for natural voice output
    const text = prepareTextForVoice(rawText, language);
    
    if (!text.trim()) {
      setIsLoading(false);
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;

      // Find the best voice for this language
      const bestVoice = findBestVoice(availableVoices, language);
      if (bestVoice) {
        utterance.voice = bestVoice;
        console.log(`Using voice: ${bestVoice.name} (${bestVoice.lang})`);
      }

      // Map language codes
      const langMap: Record<string, string> = { 'hinglish': 'hi-IN' };
      utterance.lang = langMap[language] || language;

      // Natural speech settings
      utterance.rate = 0.92; // Slightly slower for clarity
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        setIsLoading(false);
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        utteranceRef.current = null;
      };

      utterance.onerror = (event) => {
        console.error('TTS error:', event.error);
        setIsSpeaking(false);
        setIsLoading(false);
        utteranceRef.current = null;
      };

      // Chrome bug workaround: resume synthesis if paused
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      window.speechSynthesis.speak(utterance);

      // Chrome bug workaround: restart synthesis if it gets stuck
      const checkSpeaking = setInterval(() => {
        if (!window.speechSynthesis.speaking && utteranceRef.current === utterance) {
          clearInterval(checkSpeaking);
          if (isSpeaking) {
            setIsSpeaking(false);
          }
        }
      }, 100);

      // Cleanup interval after max duration (60 seconds)
      setTimeout(() => clearInterval(checkSpeaking), 60000);

    } catch (error) {
      console.error('TTS error:', error);
      setIsLoading(false);
      setIsSpeaking(false);
    }
  }, [isSupported, availableVoices, stop, isSpeaking]);

  return {
    isSpeaking,
    speak,
    stop,
    isSupported,
    isLoading,
    availableVoices,
  };
};
