import { useState, useCallback, useRef } from 'react';

interface OpenAITTSHook {
  isSpeaking: boolean;
  speak: (text: string, language?: string) => Promise<void>;
  stop: () => void;
  isSupported: boolean;
  isLoading: boolean;
}

const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`;

export const useOpenAITTS = (): OpenAITTSHook => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const isSupported = typeof window !== 'undefined';

  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    cleanupAudio();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsLoading(false);
  }, [cleanupAudio]);

  const speak = useCallback(
    async (text: string, language: string = 'en-IN') => {
      if (!text?.trim() || !isSupported) return;

      stop();

      try {
        setIsLoading(true);
        abortControllerRef.current = new AbortController();

        const response = await fetch(TTS_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: text.substring(0, 4096), language }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType?.includes('application/json')) {
            const errorData = await response.json();
            console.warn('OpenAI TTS unavailable, using browser fallback:', errorData.error);
            setIsLoading(false);
            fallbackSpeak(text, language);
            return;
          }
          throw new Error(`TTS request failed: ${response.status}`);
        }

        // Stream-friendly: get blob as it arrives
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        objectUrlRef.current = audioUrl;

        setIsLoading(false);

        const audio = new Audio();
        audio.preload = 'auto';
        audio.src = audioUrl;
        audioRef.current = audio;

        audio.onended = () => {
          setIsSpeaking(false);
          cleanupAudio();
        };

        audio.onerror = (e) => {
          console.error('Audio playback error:', e);
          setIsSpeaking(false);
          cleanupAudio();
        };

        audio.onplay = () => {
          setIsSpeaking(true);
        };

        try {
          await audio.play();
        } catch (playError) {
          console.warn('Autoplay blocked:', playError);
          setIsSpeaking(false);
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        console.error('OpenAI TTS error, using browser fallback:', error);
        setIsLoading(false);
        fallbackSpeak(text, language);
      }
    },
    [isSupported, stop, cleanupAudio]
  );

  return { isSpeaking, speak, stop, isSupported, isLoading };
};

// Browser TTS fallback when OpenAI API is unavailable
function fallbackSpeak(text: string, language: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.substring(0, 500));
  utterance.lang = language === 'hinglish' ? 'hi-IN' : language;
  utterance.rate = 0.95;
  utterance.pitch = 1.0;
  window.speechSynthesis.speak(utterance);
}
