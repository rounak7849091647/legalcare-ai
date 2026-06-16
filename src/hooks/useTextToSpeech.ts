import { useState, useCallback, useRef, useEffect } from 'react';
import { isMobileDevice, useMobileAudio, getAudioContext, unlockAudioContext } from './useMobileAudio';
import { invokeFunction } from '@/lib/api';
import { cleanTextForVoice } from '@/lib/textToVoice';

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
  
  // Use the hook just to trigger updates if needed, though we rely on getAudioContext()
  const { audioContext } = useMobileAudio();

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
      try {
        sourceRef.current.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
      sourceRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsLoading(false);
    
    // Global Mute Guard OFF
    (window as any).isAITalking = false;
    
    // Dispatch Global Event: Speaking Stopped
    window.dispatchEvent(new CustomEvent('ai-speech-stopped'));
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

      // Ensure we have a context - prefer shared one
      let ctx = getAudioContext();
      
      if (!ctx) {
        // Try to unlock (might fail without gesture, but worth a try if just missing)
        ctx = await unlockAudioContext();
      }

      if (!ctx) {
        // Fallback: create new one (will likely be suspended on iOS)
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        ctx = new AudioContextClass();
        // We can't update shared context here safely without knowing if it's the first one
      }
      
      audioContextRef.current = ctx;

      if (ctx.state === 'suspended') {
        try {
          await ctx.resume();
        } catch (e) {
          console.warn('Failed to resume audio context:', e);
        }
      }

      // Double-check state after resume attempt
      if (ctx.state === 'suspended') {
        console.warn('AudioContext is still suspended. iOS might have blocked it.');
        // Try one last desperate resume
        ctx.resume().catch(e => console.error('Final resume failed:', e));
      }

      // Decode audio data
      // Note: decodeAudioData detaches the buffer, so we can't reuse bytes.buffer easily if it fails
      const audioBuffer = await ctx.decodeAudioData(bytes.buffer);

      // Play
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      
      // AEC ROUTING: Connect to destination (default)
      // Ideally, we would connect to a MediaStreamDestination to mix it, 
      // but connecting to ctx.destination is usually enough for the OS to see it as "System Output"
      source.connect(ctx.destination);
      
      source.onended = () => {
        setIsSpeaking(false);
        sourceRef.current = null;
        // Global Mute Guard OFF
        (window as any).isAITalking = false;
      };

      sourceRef.current = source;
      
      // Global Mute Guard ON right before audio starts playing
      (window as any).isAITalking = true;
      
      // SAFETY NET: Calculate duration and force-unmute slightly after expected end
      // in case onended never fires (e.g. background mode)
      const duration = audioBuffer.duration;
      setTimeout(() => {
        if ((window as any).isAITalking) {
          console.log('Safety unmute triggered');
          (window as any).isAITalking = false;
        }
      }, (duration * 1000) + 500); // Duration + 500ms buffer

      source.start(0);
      setIsSpeaking(true);

    } catch (err) {
      console.error('AudioContext playback failed:', err);
      (window as any).isAITalking = false;
      throw err;
    }
  };

  const speak = useCallback(async (rawText: string, language: string = 'en-IN') => {
    if (!rawText?.trim()) return;
    const text = cleanTextForVoice(rawText);
    if (!text?.trim()) return;

    stop();
    isCancelledRef.current = false;
    setIsLoading(true);
    
    // Global Mute Guard ON (Pre-emptive)
    (window as any).isAITalking = true;
    
    // Dispatch Global Event: Speaking Started
    window.dispatchEvent(new CustomEvent('ai-speech-started'));

    try {
      // 1. Try TTS via Backend (Google for Indian languages, OpenAI fallback)
      const { data, error } = await invokeFunction('speak', {
        body: { text, voice: 'alloy', language }
      });

      if (error || !data?.audioContent) throw new Error(error || 'No audio content');

      if (isCancelledRef.current) return;

      await playAudioBuffer(data.audioContent);

    } catch (err) {
      console.error('OpenAI TTS failed:', err);
      // Removed native fallback to ensure quality consistency
      // If AI voice fails, we should show an error, not use robot voice
      // which would ruin the experience.
      setIsSpeaking(false);
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
