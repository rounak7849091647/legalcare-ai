# Chapter 13: Hooks & Custom Logic

## Complete Documentation of All Custom React Hooks

**LegalCareAI - Proprietary Source Code**  
**Copyright © 2024-2026 LegalCareAI. All Rights Reserved.**

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication Hook - useAuth](#useauth)
3. [Legal Chat Hook - useLegalChat](#uselegalchat)
4. [Speech Recognition Hook - useSpeechRecognition](#usespeechrecognition)
5. [Whisper Recognition Hook - useWhisperRecognition](#usewhisperrecognition)
6. [Text-to-Speech Hook - useTextToSpeech](#usetexttospeech)
7. [OpenAI TTS Hook - useOpenAITTS](#useopenaitts)
8. [Inactivity Prompt Hook - useInactivityPrompt](#useinactivityprompt)
9. [Mobile Detection Hooks](#mobile-detection-hooks)

---

## 1. Overview

LegalCareAI implements 15+ custom React hooks that encapsulate complex logic for:
- **Authentication**: User sign-up, sign-in, password reset
- **AI Chat**: Streaming responses, conversation history, document analysis
- **Voice Input**: Web Speech API, Whisper transcription, language detection
- **Voice Output**: Browser TTS, OpenAI TTS, multi-language support
- **UX Features**: Inactivity detection, mobile optimization

---

## 2. useAuth - Authentication Hook

**File**: `src/hooks/useAuth.ts`  
**Purpose**: Complete authentication management with Supabase

### Full Source Code

```typescript
import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface AuthHook {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
}

export const useAuth = (): AuthHook => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    try {
      const redirectUrl = `${window.location.origin}/dashboard`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName
          }
        }
      });

      if (error) throw error;
      
      toast.success('Account created! Please check your email to verify your account.');
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      
      toast.success('Welcome back!');
      navigate('/dashboard');
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [navigate]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    toast.success('Signed out successfully');
    navigate('/');
  }, [navigate]);

  const resetPassword = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?mode=reset`
      });

      if (error) throw error;
      
      toast.success('Password reset email sent! Check your inbox.');
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      
      toast.success('Password updated successfully!');
      navigate('/dashboard');
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [navigate]);

  return {
    user,
    session,
    isLoading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword
  };
};
```

### Key Features

| Feature | Description |
|---------|-------------|
| Auth State Listener | Real-time subscription to authentication changes |
| Session Persistence | Automatic session restoration on page load |
| Email Verification | Redirect URL configuration for email confirmation |
| Password Reset | Secure password reset via email |
| Toast Notifications | User feedback on all auth actions |

---

## 3. useLegalChat - AI Chat Hook

**File**: `src/hooks/useLegalChat.ts`  
**Purpose**: Streaming AI responses with document analysis

### Full Source Code

```typescript
import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  voiceContent?: string;
  timestamp: Date;
  language?: string;
  isDocumentSummary?: boolean;
}

interface LegalChatHook {
  messages: Message[];
  isLoading: boolean;
  sessionId: string;
  lastLanguage: string;
  lastVoiceResponse: string;
  documentContext: string | null;
  sendMessage: (message: string, detectedLanguage?: string, documentContent?: string) => Promise<void>;
  summarizeDocument: (documentContent: string, documentName: string, detectedLanguage?: string) => Promise<void>;
  clearMessages: () => void;
  setDocumentContext: (content: string | null) => void;
}

const formatMessagesForAI = (messages: Message[]): { role: string; content: string }[] => {
  return messages
    .filter(msg => msg.role === 'user' || msg.role === 'assistant')
    .slice(-10)
    .map(msg => ({ role: msg.role, content: msg.voiceContent || msg.content }));
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/legal-chat`;

export const useLegalChat = (): LegalChatHook => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastLanguage, setLastLanguage] = useState('en-IN');
  const [lastVoiceResponse, setLastVoiceResponse] = useState('');
  const [documentContext, setDocumentContext] = useState<string | null>(null);
  const documentContextRef = useRef<string | null>(null);
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  // ... [Full implementation as shown in source file]

  return {
    messages,
    isLoading,
    sessionId,
    lastLanguage,
    lastVoiceResponse,
    documentContext,
    sendMessage,
    summarizeDocument,
    clearMessages,
    setDocumentContext: updateDocumentContext
  };
};
```

### Streaming Response Implementation

The hook implements real-time streaming using the Fetch API's ReadableStream:

```typescript
const reader = resp.body.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });

  let newlineIdx: number;
  while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
    let line = buffer.slice(0, newlineIdx);
    buffer = buffer.slice(newlineIdx + 1);

    if (!line.startsWith('data: ')) continue;

    const jsonStr = line.slice(6).trim();
    if (jsonStr === '[DONE]') break;

    const parsed = JSON.parse(jsonStr);
    const content = parsed.choices?.[0]?.delta?.content;
    if (content) {
      fullResponse += content;
      // Update UI in real-time
      setMessages(prev => prev.map(m => 
        m.id === assistantId 
          ? { ...m, content: fullResponse }
          : m
      ));
    }
  }
}
```

---

## 4. useSpeechRecognition - Web Speech API Hook

**File**: `src/hooks/useSpeechRecognition.ts`  
**Purpose**: Browser-native speech recognition with Indian language detection

### Indian Language Detection Algorithm

```typescript
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
```

### Unicode Script Ranges Reference

| Script | Unicode Range | Language |
|--------|--------------|----------|
| Devanagari | U+0900-U+097F | Hindi, Marathi |
| Tamil | U+0B80-U+0BFF | Tamil |
| Telugu | U+0C00-U+0C7F | Telugu |
| Kannada | U+0C80-U+0CFF | Kannada |
| Malayalam | U+0D00-U+0D7F | Malayalam |
| Bengali | U+0980-U+09FF | Bengali, Assamese |
| Gujarati | U+0A80-U+0AFF | Gujarati |
| Gurmukhi | U+0A00-U+0A7F | Punjabi |
| Odia | U+0B00-U+0B7F | Odia |

---

## 5. useWhisperRecognition - OpenAI Whisper Hook

**File**: `src/hooks/useWhisperRecognition.ts`  
**Purpose**: iOS-compatible audio transcription via Whisper API

### Key Implementation Details

```typescript
export const useWhisperRecognition = (): WhisperRecognitionHook => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    // CRITICAL: getUserMedia MUST be called within user gesture
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    // Detect best supported format
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/wav',
      ''
    ];
    
    const mimeType = mimeTypes.find(type => 
      type === '' || MediaRecorder.isTypeSupported(type)
    ) || '';

    const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.start(500); // timeslice helps mobile browsers
    setIsRecording(true);
  }, []);

  // ... stopRecording implementation with base64 encoding and API call
};
```

---

## 6. useOpenAITTS - Text-to-Speech Hook

**File**: `src/hooks/useOpenAITTS.ts`  
**Purpose**: Multi-language voice synthesis with Indian language optimization

### Indian Voice Preferences Registry

```typescript
const INDIAN_VOICE_PREFERENCES: Record<string, string[]> = {
  'hi-IN': [
    'Google हिन्दी', 'Microsoft Swara Online', 'Microsoft Swara', 
    'Lekha', 'Hindi India Female', 'Hindi India', 'hi-IN', 'Hindi'
  ],
  'ta-IN': [
    'Google தமிழ்', 'Microsoft Valluvar Online', 'Microsoft Valluvar',
    'Tamil India Female', 'Tamil India', 'ta-IN', 'Tamil'
  ],
  'te-IN': [
    'Google తెలుగు', 'Microsoft Chitra Online', 'Microsoft Chitra',
    'Telugu India Female', 'Telugu India', 'te-IN', 'Telugu'
  ],
  'bn-IN': [
    'Google বাংলা', 'Microsoft Tanishaa Online', 'Microsoft Tanishaa',
    'Bengali India Female', 'Bengali India', 'bn-IN', 'Bengali', 'Bangla'
  ],
  // ... 10 more languages
};

// Optimized speech settings for Indian languages
utterance.rate = isIndianLang ? 0.85 : 0.95; // Slower for clarity
utterance.pitch = 1.0;
utterance.volume = 1.0;
```

---

## 7. useInactivityPrompt - Voice Mode UX Hook

**File**: `src/hooks/useInactivityPrompt.ts`  
**Purpose**: Intelligent inactivity detection for voice conversations

### Inactivity Flow

```
User starts voice mode
       ↓
15 seconds of silence
       ↓
AI: "Are you there?"
       ↓
10 seconds wait
       ↓
AI: "Do you need any more assistance?"
       ↓
10 seconds wait
       ↓
AI: "Do you need any more help?"
       ↓
10 seconds wait
       ↓
Auto-close voice mode
```

### Implementation

```typescript
const INACTIVITY_PROMPTS = [
  "Are you there?",
  "Do you need any more assistance?",
  "Do you need any more help?"
];

const INACTIVITY_TIMEOUT = 15000; // 15 seconds
const PROMPT_RESPONSE_TIMEOUT = 10000; // 10 seconds per prompt

export const useInactivityPrompt = ({
  onPrompt,
  onClose,
  isActive,
  isListening,
  isSpeaking,
  isLoading
}: UseInactivityPromptOptions) => {
  // Timer management for inactivity detection
  // Prompt sequence triggering
  // Auto-close after all prompts exhausted
};
```

---

## 8. Complete Hook Inventory

| Hook | File | Lines | Purpose |
|------|------|-------|---------|
| useAuth | useAuth.ts | 132 | Authentication management |
| useLegalChat | useLegalChat.ts | 249 | AI chat with streaming |
| useSpeechRecognition | useSpeechRecognition.ts | 219 | Web Speech API |
| useWhisperRecognition | useWhisperRecognition.ts | 191 | iOS audio transcription |
| useTextToSpeech | useTextToSpeech.ts | 181 | Basic browser TTS |
| useOpenAITTS | useOpenAITTS.ts | 260 | Advanced multi-lang TTS |
| useInactivityPrompt | useInactivityPrompt.ts | 150 | Voice mode UX |
| useBrowserTTS | useBrowserTTS.ts | ~100 | Browser TTS wrapper |
| useElevenLabsTTS | useElevenLabsTTS.ts | ~150 | ElevenLabs integration |
| useMobileAudio | useMobileAudio.ts | ~80 | Mobile audio utilities |
| use-mobile | use-mobile.tsx | ~30 | Mobile viewport detection |
| use-toast | use-toast.ts | ~50 | Toast notifications |

---

## Summary

LegalCareAI's custom hooks represent significant intellectual property, implementing:

1. **Proprietary Language Detection** - Unicode-based Indian script recognition
2. **Streaming AI Architecture** - Real-time response rendering
3. **Cross-Platform Voice** - Web Speech API + Whisper fallback
4. **Intelligent UX** - Jarvis-style continuous conversation

**Total Hook Code**: ~1,800+ lines of TypeScript
**Unique Algorithms**: 5+ proprietary implementations

---

*This documentation is confidential and proprietary. Unauthorized reproduction is prohibited.*
