# Voice & Speech Systems

## Audio Processing Documentation

---

## 1. Overview

LegalCareAI features a comprehensive voice interaction system that enables users to:
- Speak legal queries in multiple Indian languages
- Listen to AI responses automatically (Jarvis-style)
- Use continuous voice mode for hands-free operation

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          VOICE SYSTEM                                    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    SPEECH TO TEXT (STT)                          │    │
│  │  ┌──────────────────┐       ┌──────────────────┐                │    │
│  │  │ Web Speech API   │       │ Whisper API      │                │    │
│  │  │ (Browser Native) │       │ (Edge Function)  │                │    │
│  │  │ - Fast           │       │ - Accurate       │                │    │
│  │  │ - Free           │       │ - Multi-language │                │    │
│  │  └──────────────────┘       └──────────────────┘                │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│                                    ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    TEXT PROCESSING                               │    │
│  │               Language Detection + AI Chat                       │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│                                    ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    TEXT TO SPEECH (TTS)                          │    │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │    │
│  │  │ OpenAI TTS   │ │ ElevenLabs   │ │ Browser TTS  │            │    │
│  │  │ (Primary)    │ │ (Alternative)│ │ (Fallback)   │            │    │
│  │  └──────────────┘ └──────────────┘ └──────────────┘            │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Speech-to-Text Hooks

### 3.1 useSpeechRecognition

Browser native Web Speech API implementation.

```typescript
// src/hooks/useSpeechRecognition.ts
import { useState, useRef, useCallback, useEffect } from 'react';

interface UseSpeechRecognitionProps {
  onTranscript: (transcript: string, language: string) => void;
  language?: string;
  continuous?: boolean;
}

export const useSpeechRecognition = ({
  onTranscript,
  language = 'hi-IN',
  continuous = false,
}: UseSpeechRecognitionProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognition = 
      window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);
    recognitionRef.current = new SpeechRecognition();
    
    const recognition = recognitionRef.current;
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        }
      }
      
      if (finalTranscript) {
        onTranscript(finalTranscript, language);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      if (continuous && isListening) {
        recognition.start();
      } else {
        setIsListening(false);
      }
    };
  }, [language, continuous, onTranscript]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
  };
};
```

### 3.2 useWhisperRecognition

OpenAI Whisper API for accurate multi-language transcription.

```typescript
// src/hooks/useWhisperRecognition.ts
import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseWhisperRecognitionProps {
  onTranscript: (transcript: string, language: string) => void;
  language?: string;
}

export const useWhisperRecognition = ({
  onTranscript,
  language = 'hi-IN',
}: UseWhisperRecognitionProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        
        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          
          // Call Whisper API
          const { data, error } = await supabase.functions.invoke('voice-to-text', {
            body: { audio: base64Audio, language },
          });

          if (data?.transcript) {
            onTranscript(data.transcript, language);
          }
          
          setIsProcessing(false);
        };
        reader.readAsDataURL(audioBlob);
        
        // Stop tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }, [language, onTranscript]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  return {
    isRecording,
    isProcessing,
    startRecording,
    stopRecording,
  };
};
```

---

## 4. Text-to-Speech Hooks

### 4.1 useOpenAITTS

Primary TTS using OpenAI's API.

```typescript
// src/hooks/useOpenAITTS.ts
import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useOpenAITTS = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speak = useCallback(async (text: string, language: string) => {
    if (!text || isSpeaking) return;

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text, language },
      });

      if (error) throw error;
      
      if (data?.audio) {
        // Stop any current playback
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }

        // Create and play audio
        const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
        audioRef.current = audio;
        
        audio.onended = () => {
          setIsSpeaking(false);
          audioRef.current = null;
        };
        
        audio.onerror = () => {
          setIsSpeaking(false);
          console.error('Audio playback error');
        };

        setIsSpeaking(true);
        await audio.play();
      }
    } catch (error) {
      console.error('TTS error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isSpeaking]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
    isLoading,
  };
};
```

### 4.2 useBrowserTTS

Fallback using browser's native SpeechSynthesis.

```typescript
// src/hooks/useBrowserTTS.ts
import { useState, useCallback } from 'react';

export const useBrowserTTS = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = useCallback((text: string, language: string) => {
    if (!text || !window.speechSynthesis) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
  };
};
```

### 4.3 useTextToSpeech (Unified Interface)

```typescript
// src/hooks/useTextToSpeech.ts
import { useOpenAITTS } from './useOpenAITTS';
import { useBrowserTTS } from './useBrowserTTS';

type TTSProvider = 'openai' | 'browser' | 'auto';

export const useTextToSpeech = (provider: TTSProvider = 'auto') => {
  const openaiTTS = useOpenAITTS();
  const browserTTS = useBrowserTTS();

  const speak = async (text: string, language: string) => {
    if (provider === 'browser') {
      browserTTS.speak(text, language);
      return;
    }

    if (provider === 'openai') {
      await openaiTTS.speak(text, language);
      return;
    }

    // Auto mode: try OpenAI first, fallback to browser
    try {
      await openaiTTS.speak(text, language);
    } catch {
      browserTTS.speak(text, language);
    }
  };

  const stop = () => {
    openaiTTS.stop();
    browserTTS.stop();
  };

  return {
    speak,
    stop,
    isSpeaking: openaiTTS.isSpeaking || browserTTS.isSpeaking,
  };
};
```

---

## 5. Mobile Audio Support

### 5.1 useMobileAudio

Handles mobile browser audio restrictions.

```typescript
// src/hooks/useMobileAudio.ts
import { useRef, useCallback } from 'react';

let sharedAudioContext: AudioContext | null = null;
let isAudioUnlocked = false;

export const useMobileAudio = () => {
  const audioContextRef = useRef<AudioContext | null>(sharedAudioContext);

  const unlockAudio = useCallback(async () => {
    if (isAudioUnlocked && sharedAudioContext?.state === 'running') {
      audioContextRef.current = sharedAudioContext;
      return;
    }

    try {
      // Create or resume AudioContext
      if (!sharedAudioContext) {
        const AudioContextClass = 
          window.AudioContext || (window as any).webkitAudioContext;
        sharedAudioContext = new AudioContextClass();
      }

      // Resume if suspended (required on mobile)
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

export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
};
```

---

## 6. AI Orb Voice Interface

### 6.1 AiOrb Component

The main voice interaction UI component.

```typescript
// src/components/AiOrb.tsx (excerpt)
interface AiOrbProps {
  onTranscript: (transcript: string, language: string) => void;
  isProcessing: boolean;
  responseText?: string;
  responseLanguage?: string;
}

const AiOrb = ({ 
  onTranscript, 
  isProcessing, 
  responseText, 
  responseLanguage 
}: AiOrbProps) => {
  const { currentLanguage } = useLanguage();
  const { unlockAudio } = useMobileAudio();
  const [isListening, setIsListening] = useState(false);
  
  const { 
    startListening, 
    stopListening, 
    isListening: speechListening 
  } = useSpeechRecognition({
    onTranscript,
    language: currentLanguage.code,
    continuous: false,
  });

  const handleOrbClick = async () => {
    // Unlock audio on mobile
    await unlockAudio();
    
    if (isListening) {
      stopListening();
      setIsListening(false);
    } else {
      startListening();
      setIsListening(true);
    }
  };

  return (
    <button
      onClick={handleOrbClick}
      className={cn(
        "relative w-32 h-32 rounded-full",
        "bg-gradient-to-br from-primary/20 to-primary/40",
        "hover:scale-105 transition-transform",
        isListening && "animate-pulse ring-2 ring-primary",
        isProcessing && "animate-spin"
      )}
    >
      <Mic 
        className={cn(
          "absolute inset-0 m-auto w-12 h-12",
          isListening ? "text-primary" : "text-muted-foreground"
        )} 
      />
    </button>
  );
};
```

---

## 7. Auto-Speak Feature

### 7.1 Jarvis-Style Auto Response

```typescript
// src/components/MainContent.tsx (excerpt)
const MainContent = () => {
  const { messages, isLoading, lastLanguage, lastVoiceResponse } = useLegalChat();
  const { speak, stop, isSpeaking } = useOpenAITTS();
  const lastSpokenIdRef = useRef<string | null>(null);

  // Auto-speak new assistant responses
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    
    if (
      lastMessage?.role === 'assistant' &&
      lastMessage.id !== lastSpokenIdRef.current &&
      !isLoading
    ) {
      lastSpokenIdRef.current = lastMessage.id;
      const textToSpeak = lastMessage.voiceContent || lastMessage.content;
      
      if (textToSpeak) {
        speak(textToSpeak, lastMessage.language || lastLanguage);
      }
    }
  }, [messages, isLoading, lastLanguage, speak]);

  // Stop speaking when user starts talking
  const handleVoiceTranscript = useCallback(async (transcript: string, language: string) => {
    if (isSpeaking) {
      stop();
    }
    await sendMessage(transcript, language);
  }, [sendMessage, isSpeaking, stop]);

  // ...
};
```

---

## 8. Language Support

### 8.1 Supported Languages

| Code | Language | STT Support | TTS Support |
|------|----------|-------------|-------------|
| en-IN | English | ✓ | ✓ |
| hi-IN | Hindi | ✓ | ✓ |
| ta-IN | Tamil | ✓ | ✓ |
| te-IN | Telugu | ✓ | ✓ |
| bn-IN | Bengali | ✓ | ✓ |
| mr-IN | Marathi | ✓ | ✓ |
| gu-IN | Gujarati | ✓ | ✓ |
| kn-IN | Kannada | ✓ | ✓ |
| ml-IN | Malayalam | ✓ | ✓ |
| pa-IN | Punjabi | ✓ | ✓ |
| or-IN | Odia | ✓ | ✓ |

---

*This voice & speech systems documentation is part of the LegalCareAI Copyright & Trademark Filing Documentation.*
