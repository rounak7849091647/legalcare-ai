import { useRef, useCallback } from 'react';

/**
 * Mobile browsers require user gestures for:
 * 1. AudioContext creation/resume
 * 2. MediaStream (microphone) access
 * 3. Audio playback
 * 
 * This hook provides utilities to unlock audio on first user tap.
 */

interface MobileAudioUnlock {
  unlockAudio: () => Promise<void>;
  isUnlocked: boolean;
  audioContext: AudioContext | null;
}

// Singleton audio context - shared across the app
let sharedAudioContext: AudioContext | null = null;
let isAudioUnlocked = false;

/**
 * Standalone function to unlock audio context within a user gesture.
 * Can be called directly without the hook.
 */
export const getAudioContext = (): AudioContext | null => {
  return sharedAudioContext;
};

export const unlockAudioContext = async (): Promise<AudioContext | null> => {
  if (isAudioUnlocked && sharedAudioContext?.state === 'running') return sharedAudioContext;

  try {
    if (!sharedAudioContext) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      sharedAudioContext = new AudioContextClass();
    }
    if (sharedAudioContext.state === 'suspended') {
      await sharedAudioContext.resume();
    }
    // Play silent buffer to fully unlock audio on iOS
    // Increase duration slightly to ensure it registers
    const buffer = sharedAudioContext.createBuffer(1, 1024, 22050);
    const source = sharedAudioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(sharedAudioContext.destination);
    source.start(0);
    
    // Wait for the context to actually be running
    if (sharedAudioContext.state !== 'running') {
       // double check resume
       await sharedAudioContext.resume();
    }
    
    isAudioUnlocked = true;
    console.log('Audio context unlocked, state:', sharedAudioContext.state);
    return sharedAudioContext;
  } catch (err) {
    console.error('Failed to unlock audio context:', err);
    return null;
  }
};

export const useMobileAudio = (): MobileAudioUnlock => {
  const audioContextRef = useRef<AudioContext | null>(sharedAudioContext);

  const unlockAudio = useCallback(async () => {
    if (isAudioUnlocked && sharedAudioContext?.state === 'running') {
      audioContextRef.current = sharedAudioContext;
      return;
    }

    try {
      // Create or resume AudioContext
      if (!sharedAudioContext) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        sharedAudioContext = new AudioContextClass();
      }

      // Resume if suspended (required on mobile after creation)
      if (sharedAudioContext.state === 'suspended') {
        await sharedAudioContext.resume();
      }

      // Play silent buffer to fully unlock audio on iOS
      const buffer = sharedAudioContext.createBuffer(1, 1, 22050);
      const source = sharedAudioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(sharedAudioContext.destination);
      source.start(0);

      audioContextRef.current = sharedAudioContext;
      isAudioUnlocked = true;
      console.log('Audio unlocked successfully');
    } catch (err) {
      console.error('Failed to unlock audio:', err);
    }
  }, []);

  return {
    unlockAudio,
    isUnlocked: isAudioUnlocked,
    audioContext: audioContextRef.current,
  };
};

/**
 * Helper to check if we're on a mobile device
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
};

/**
 * Wrapper to ensure audio operations happen within user gesture
 */
export const withUserGesture = <T>(fn: () => Promise<T>): Promise<T> => {
  return new Promise((resolve, reject) => {
    try {
      fn().then(resolve).catch(reject);
    } catch (err) {
      reject(err);
    }
  });
};
