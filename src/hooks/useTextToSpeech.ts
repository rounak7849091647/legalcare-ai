import { useState, useCallback, useRef, useEffect } from 'react';
import { isMobileDevice, useMobileAudio } from './useMobileAudio';
import { invokeFunction } from '@/lib/api';

interface TextToSpeechHook {
  isSpeaking: boolean;
  speak: (text: string, language?: string) => Promise<void>;
  stop: () => void;
  isSupported: boolean;
  isLoading: boolean;
}

export const useTextToSpeech = (): TextToSpeechHook => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const isCancelledRef = useRef(false);
  const { audioContext, isUnlocked } = useMobileAudio();

  // Keep track of the shared audio context
  useEffect(() => {
    if (audioContext) {
      audioContextRef.current = audioContext;
    }
  }, [audioContext]);

  const stop = useCallback(() => {
    isCancelledRef.current = true;
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch (e) {
        // Ignore errors if already stopped
      }
      sourceRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsLoading(false);
  }, []);

  const playAudioBuffer = async (base64Audio: string) => {
    try {
      // Decode base64
      const binaryString = window.atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Ensure we have a context
      let ctx = audioContextRef.current;
      if (!ctx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        ctx = new AudioContextClass();
        audioContextRef.current = ctx;
      }

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      // Decode audio data
      const audioBuffer = await ctx.decodeAudioData(bytes.buffer);

      // Play
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      
      source.onended = () => {
        setIsSpeaking(false);
        sourceRef.current = null;
      };

      sourceRef.current = source;
      source.start(0);
      setIsSpeaking(true);

    } catch (err) {
      console.error('AudioContext playback failed:', err);
      throw err;
    }
  };

  const speak = useCallback(async (text: string, language: string = 'en-IN') => {
    if (!text?.trim()) return;

    stop();
    isCancelledRef.current = false;
    setIsLoading(true);

    try {
      // 1. Try OpenAI TTS via Backend
      const { data, error } = await invokeFunction('speak', {
        body: { text, voice: 'alloy' }
      });

      if (error || !data?.audioContent) throw new Error(error || 'No audio content');

      if (isCancelledRef.current) return;

      await playAudioBuffer(data.audioContent);

    } catch (err) {
      console.error('OpenAI TTS failed, falling back to native:', err);
      
      // 2. Fallback to Native Browser TTS
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language;
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [stop]);

  return {
    isSpeaking,
    speak,
    stop,
    isSupported: true,
    isLoading,
  };
};
