// NOTE: hook name is legacy ("OpenAI TTS") — under the hood it now calls our Express
// backend's `/functions/v1/speak`, which routes to Google Cloud TTS with sentence-aware
// chunking + MP3 concatenation. This means LONG answers play in full (no truncation),
// every supported Indian language gets a native FEMALE Wavenet voice, and English uses
// the British female en-GB Neural2-C voice.
import { useState, useCallback, useRef } from 'react';
import { getAudioContext, unlockAudioContext } from '@/hooks/useMobileAudio';
import { invokeFunction } from '@/lib/api';

// Strip emojis + pictographs so the TTS voice never reads "smiling face", "scales", etc.
// Covers: faces, transport, symbols, dingbats, flags, supplemental, plus variation selector
// and zero-width joiner. Mirrors the server's stripEmojis() so behavior is identical whether
// we hit Google TTS or fall back to the browser's speechSynthesis.
const stripEmojis = (txt: string): string => {
  if (!txt) return '';
  return txt
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{1F000}-\u{1F2FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1F1E6}-\u{1F1FF}]/gu, '')
    .replace(/[\u{FE0F}\u{200D}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

interface OpenAITTSHook {
  isSpeaking: boolean;
  speak: (text: string, language?: string) => Promise<void>;
  stop: () => void;
  isSupported: boolean;
  isLoading: boolean;
}

export const useOpenAITTS = (): OpenAITTSHook => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const isSupported = typeof window !== 'undefined';

  const cleanupAudio = useCallback(() => {
    if (audioSourceRef.current) {
      try { audioSourceRef.current.stop(); } catch {}
      try { audioSourceRef.current.disconnect(); } catch {}
      audioSourceRef.current = null;
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
    async (rawText: string, language: string = 'en-IN') => {
      if (!rawText?.trim() || !isSupported) return;
      // Strip emojis CLIENT-SIDE before any TTS call. Why both sides?
      //   - Server: when Google TTS is healthy, server's prepForTTS strips them too.
      //   - Client: when Google TTS errors (e.g. billing disabled), we fall back to the
      //     browser's speechSynthesis using THIS text — so the strip must happen here too,
      //     otherwise the browser voice literally reads "smiling face", "scales", etc.
      const text = stripEmojis(rawText).trim();
      if (!text) return;

      stop();

      try {
        setIsLoading(true);
        abortControllerRef.current = new AbortController();

        // Server returns { audioContent (base64 MP3, possibly multi-chunk concatenated), provider }
        const { data, error } = await invokeFunction('speak', {
          body: { text, language },
        });

        if (error || !data?.audioContent) {
          console.warn('Server TTS unavailable, using browser fallback:', error || 'no audioContent');
          setIsLoading(false);
          fallbackSpeak(text, language);
          return;
        }

        // Decode base64 → ArrayBuffer for Web Audio
        const b64 = data.audioContent as string;
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const arrayBuffer = bytes.buffer;

        setIsLoading(false);

        let audioContext = getAudioContext();
        if (!audioContext) {
          audioContext = await unlockAudioContext();
        }

        if (!audioContext) {
          console.warn('AudioContext not available, falling back to browser TTS');
          fallbackSpeak(text, language);
          return;
        }

        if (audioContext.state === 'suspended') {
          try { await audioContext.resume(); } catch (e) { console.warn('resume failed:', e); }
        }

        try {
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          const source = audioContext.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(audioContext.destination);

          source.onended = () => {
            setIsSpeaking(false);
            cleanupAudio();
          };

          audioSourceRef.current = source;
          source.start(0);
          setIsSpeaking(true);
        } catch (decodeError) {
          console.error('Audio decode error:', decodeError);
          fallbackSpeak(text, language);
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        console.error('TTS error, using browser fallback:', error);
        setIsLoading(false);
        fallbackSpeak(text, language);
      }
    },
    [isSupported, stop, cleanupAudio]
  );

  return { isSpeaking, speak, stop, isSupported, isLoading };
};

// Browser TTS fallback when our backend is unreachable. Best-effort only —
// the browser's voices are far worse than Google's. We do NOT cap the text here either.
function fallbackSpeak(text: string, language: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language === 'hinglish' ? 'hi-IN' : language;
  utterance.rate = 0.95;
  utterance.pitch = 1.0;
  // Prefer a female voice if the browser exposes one.
  const voices = window.speechSynthesis.getVoices();
  const female = voices.find(v => v.lang.startsWith(language.slice(0, 2)) && /female|woman|samantha|victoria|kate|fiona|tessa|moira|karen/i.test(v.name));
  if (female) utterance.voice = female;
  window.speechSynthesis.speak(utterance);
}
