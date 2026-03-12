import { useState, useCallback, useRef } from 'react';

interface ElevenLabsTTSHook {
  isSpeaking: boolean;
  speak: (text: string, language?: string) => Promise<void>;
  stop: () => void;
  isSupported: boolean;
  isLoading: boolean;
}

export const useElevenLabsTTS = (): ElevenLabsTTSHook => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const isSupported = typeof window !== 'undefined';

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      // Remove source to free memory
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsSpeaking(false);
    setIsLoading(false);
  }, []);

  const speak = useCallback(
    async (text: string, language: string = 'en-IN') => {
      if (!text?.trim() || !isSupported) return;

      stop();

      try {
        setIsLoading(true);
        abortControllerRef.current = new AbortController();

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ text, language }),
            signal: abortControllerRef.current.signal,
          }
        );

        if (!response.ok) {
          throw new Error(`TTS request failed: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }

        setIsLoading(false);

        // Create audio element with mobile-optimized settings
        const audio = new Audio();
        
        // Mobile audio compatibility settings
        audio.preload = 'auto';
        audio.crossOrigin = 'anonymous';
        
        // Use data URI for base64 audio - browser natively decodes it
        audio.src = `data:audio/mpeg;base64,${data.audioContent}`;
        audioRef.current = audio;

        // Set up event handlers before playing
        audio.onended = () => {
          setIsSpeaking(false);
          audioRef.current = null;
        };

        audio.onerror = (e) => {
          console.error('Audio playback error:', e);
          setIsSpeaking(false);
          audioRef.current = null;
        };

        audio.onplay = () => {
          setIsSpeaking(true);
        };

        // Attempt to play - handle mobile autoplay restrictions
        try {
          await audio.play();
        } catch (playError) {
          console.warn('Autoplay blocked, audio ready for user interaction:', playError);
          // On mobile, if autoplay is blocked, the audio is still ready
          // It will play on the next user interaction
          setIsSpeaking(false);
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          // Request was cancelled, this is expected
          return;
        }
        console.error('ElevenLabs TTS error:', error);
        setIsSpeaking(false);
        setIsLoading(false);
      }
    },
    [isSupported, stop]
  );

  return {
    isSpeaking,
    speak,
    stop,
    isSupported,
    isLoading,
  };
};
