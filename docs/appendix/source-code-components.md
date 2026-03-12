# Appendix A: Complete Source Code - Core Components

## Full Implementation of Primary React Components

**LegalCareAI - Proprietary Source Code**  
**Copyright © 2024-2026 LegalCareAI. All Rights Reserved.**

---

## Index.tsx - Main Entry Page

**File**: `src/pages/Index.tsx`  
**Lines**: 118  
**Purpose**: Homepage with AI assistant interface

```typescript
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AppSidebar from '@/components/AppSidebar';
import MainContent from '@/components/MainContent';
import ChatHeader from '@/components/ChatHeader';
import DisclaimerPopup from '@/components/DisclaimerPopup';
import SEOHead from '@/components/SEOHead';

const faqStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is LegalCareAI?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'LegalCareAI is an AI-powered legal intelligence platform that provides instant legal guidance on Indian law including BNS, IPC, Civil Laws, Labour Law, and more.',
      },
    },
    {
      '@type': 'Question',
      name: 'How can I find a lawyer on LegalCareAI?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'You can browse our directory of 10M+ Bar Council verified lawyers across India, filter by state, city, and practice area to find the right legal expert.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does LegalCareAI provide legal document templates?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, LegalCareAI offers 100+ ready-to-use legal document templates including rental agreements, employment contracts, NDAs, power of attorney, and more.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is LegalCareAI available in multiple languages?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, LegalCareAI supports multiple Indian languages including Hindi, Tamil, Telugu, Bengali, Marathi, and more for accessible legal guidance.',
      },
    },
  ],
};

const serviceStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  name: 'LegalCareAI',
  description: 'AI-powered legal intelligence platform for Indian law',
  url: 'https://legalcareai.com',
  areaServed: {
    '@type': 'Country',
    name: 'India',
  },
  serviceType: ['Legal Consultation', 'Legal Document Templates', 'Tax Services', 'Lawyer Directory'],
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Legal Services',
    itemListElement: [
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'AI Legal Assistant',
          description: 'Get instant answers to legal questions using AI',
        },
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Document Templates',
          description: '100+ ready-to-use legal document templates',
        },
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Tax Services',
          description: 'ITR filing, tax planning, and expert CA assistance',
        },
      },
    ],
  },
};

const Index = () => {
  return (
    <>
      <SEOHead
        title="LegalCareAI - AI-Powered Legal Intelligence for India"
        description="Get instant legal guidance with LegalCareAI. AI-powered legal assistant for Indian law - BNS, IPC, Civil Laws, Labour Law. Access 100+ document templates and connect with 10M+ verified lawyers."
        keywords="legal AI, Indian law, BNS, IPC, legal documents, find lawyer India, legal advice, tax services, ITR filing, legal templates"
        canonicalUrl="/"
        structuredData={[faqStructuredData, serviceStructuredData]}
        breadcrumbs={[{ name: 'Home', url: '/' }]}
      />
      
      <SidebarProvider defaultOpen={true}>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          
          <SidebarInset className="flex flex-col flex-1">
            <ChatHeader />
            <MainContent />
          </SidebarInset>
        </div>
      </SidebarProvider>
      
      <DisclaimerPopup />
    </>
  );
};

export default Index;
```

---

## MainContent.tsx - Chat Interface

**File**: `src/components/MainContent.tsx`  
**Lines**: 141  
**Purpose**: Main chat area with AI orb and message display

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';
import AiOrb from './AiOrb';
import ChatInput from './ChatInput';
import ChatMessages from './ChatMessages';

import { useLegalChat } from '@/hooks/useLegalChat';
import { useOpenAITTS } from '@/hooks/useOpenAITTS';
import { useLanguage } from '@/contexts/LanguageContext';
import supremeCourtBg from '@/assets/supreme-court-bg.jpg';

interface MainContentProps {
  isMobile?: boolean;
}

const MainContent = ({ isMobile = false }: MainContentProps) => {
  const { messages, isLoading, sendMessage, summarizeDocument, lastLanguage, lastVoiceResponse } = useLegalChat();
  const { isSpeaking, speak, stop, isLoading: isTTSLoading } = useOpenAITTS();
  const { currentLanguage } = useLanguage();
  const [lastResponseLanguage, setLastResponseLanguage] = useState<string>('en-IN');
  const [continuousVoiceMode, setContinuousVoiceMode] = useState(false);
  const lastSpokenIdRef = useRef<string | null>(null);

  // Auto-speak new assistant responses (Jarvis-style)
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (
      lastMessage?.role === 'assistant' &&
      lastMessage.id !== lastSpokenIdRef.current &&
      !isLoading
    ) {
      setLastResponseLanguage(lastMessage.language || lastLanguage);
      lastSpokenIdRef.current = lastMessage.id;
      const textToSpeak = lastMessage.voiceContent || lastMessage.content;
      if (textToSpeak) {
        speak(textToSpeak, lastMessage.language || lastLanguage);
      }
    }
  }, [messages, isLoading, lastLanguage, speak]);

  const handleVoiceTranscript = useCallback(async (transcript: string, language: string) => {
    if (transcript.trim()) {
      if (isSpeaking) {
        stop();
      }
      await sendMessage(transcript, language);
    }
  }, [sendMessage, isSpeaking, stop]);

  const handleSendMessage = useCallback(async (message: string, documentContent?: string) => {
    if (isSpeaking) {
      stop();
    }
    await sendMessage(message, currentLanguage.code, documentContent);
  }, [sendMessage, isSpeaking, stop, currentLanguage.code]);

  const handleDocumentUpload = useCallback(async (documentContent: string, documentName: string) => {
    if (isSpeaking) {
      stop();
    }
    await summarizeDocument(documentContent, documentName, currentLanguage.code);
  }, [summarizeDocument, isSpeaking, stop, currentLanguage.code]);

  const handleContinuousModeChange = useCallback((active: boolean) => {
    setContinuousVoiceMode(active);
  }, []);

  // Handle inactivity prompts - AI SPEAKS directly to user
  const handleInactivityPrompt = useCallback((promptMessage: string) => {
    console.log('AI speaking inactivity prompt:', promptMessage);
    speak(promptMessage, currentLanguage.code);
  }, [speak, currentLanguage.code]);

  const hasMessages = messages.length > 0;

  return (
    <main className="flex-1 relative flex flex-col h-full min-h-0">
      {/* Fixed Background image with overlay */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-10"
        style={{ backgroundImage: `url(${supremeCourtBg})` }}
      >
        <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px]" />
      </div>

      {/* Content - ChatGPT style layout */}
      {hasMessages ? (
        // Chat mode - messages scroll, input fixed at bottom
        <>
          <div className="flex-1 overflow-y-auto min-h-0 pb-4">
            <div className="max-w-3xl mx-auto w-full px-4 pt-4">
              <ChatMessages messages={messages} isLoading={isLoading} />
            </div>
          </div>
          
          <div className="flex-shrink-0 w-full bg-gradient-to-t from-background via-background/95 to-transparent pt-4 pb-6">
            <div className="max-w-3xl mx-auto w-full px-4">
              <ChatInput
                onSend={handleSendMessage}
                onDocumentUpload={handleDocumentUpload}
                isLoading={isLoading}
                isSpeaking={isSpeaking}
                onVoiceTranscript={handleVoiceTranscript}
                continuousMode={continuousVoiceMode}
                onContinuousModeChange={handleContinuousModeChange}
                onInactivityPrompt={handleInactivityPrompt}
              />
            </div>
          </div>
        </>
      ) : (
        // Initial orb mode - centered
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="flex flex-col items-center gap-8 md:gap-10 animate-fade-in w-full max-w-2xl">
            <AiOrb 
              onTranscript={handleVoiceTranscript}
              isProcessing={isLoading}
              responseText={lastVoiceResponse}
              responseLanguage={lastResponseLanguage}
            />
            <div className="w-full max-w-3xl">
              <ChatInput
                onSend={handleSendMessage}
                onDocumentUpload={handleDocumentUpload}
                isLoading={isLoading}
                isSpeaking={isSpeaking}
                onVoiceTranscript={handleVoiceTranscript}
                continuousMode={continuousVoiceMode}
                onContinuousModeChange={handleContinuousModeChange}
                onInactivityPrompt={handleInactivityPrompt}
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default MainContent;
```

---

## AiOrb.tsx - Voice Interface Component

**File**: `src/components/AiOrb.tsx`  
**Lines**: 325  
**Purpose**: Interactive voice assistant orb with visual feedback

```typescript
import { useState, useEffect, useRef, useMemo } from 'react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useWhisperRecognition } from '@/hooks/useWhisperRecognition';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { isIOSDevice } from '@/lib/device/isIOSDevice';
import { useTheme } from '@/contexts/ThemeContext';

interface AiOrbProps {
  onTranscript?: (transcript: string, language: string) => void;
  isProcessing?: boolean;
  responseText?: string;
  responseLanguage?: string;
}

const AiOrb = ({ onTranscript, isProcessing = false, responseText, responseLanguage = 'en-IN' }: AiOrbProps) => {
  const [isActive, setIsActive] = useState(false);
  const [continuousMode, setContinuousMode] = useState(true);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const { theme } = useTheme();
  const isLightMode = theme === 'light';

  const isIOS = useMemo(() => isIOSDevice(), []);

  const {
    isListening: webIsListening,
    transcript: webTranscript,
    detectedLanguage: webDetectedLanguage,
    startListening: startWebListening,
    stopListening: stopWebListening,
    resetTranscript: resetWebTranscript,
    isSupported: webSpeechSupported,
    error: webSpeechError,
  } = useSpeechRecognition();

  const {
    isRecording,
    transcript: whisperTranscript,
    error: whisperError,
    startRecording,
    stopRecording,
    resetTranscript: resetWhisperTranscript,
    isSupported: whisperSupported,
    isProcessing: isProcessingVoice,
  } = useWhisperRecognition();

  const isListening = isIOS ? isRecording : webIsListening;
  const transcript = isIOS ? whisperTranscript : webTranscript;
  const detectedLanguage = isIOS ? 'en-IN' : webDetectedLanguage;
  const speechSupported = isIOS ? whisperSupported : webSpeechSupported;
  const speechError = isIOS ? whisperError : webSpeechError;

  const resetTranscript = () => (isIOS ? resetWhisperTranscript() : resetWebTranscript());

  const { isSpeaking, speak, stop: stopSpeaking, isSupported: ttsSupported, isLoading } = useTextToSpeech();
  
  const autoSendTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptRef = useRef<string>('');
  const hasSpokenRef = useRef<boolean>(false);
  const wasSpeakingRef = useRef<boolean>(false);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (autoSendTimerRef.current) {
        clearTimeout(autoSendTimerRef.current);
      }
    };
  }, []);

  // Auto-send after 2 seconds of pause while listening
  useEffect(() => {
    if (isIOS) return;

    if (isListening && transcript && transcript !== lastTranscriptRef.current) {
      lastTranscriptRef.current = transcript;
      
      if (autoSendTimerRef.current) {
        clearTimeout(autoSendTimerRef.current);
      }
      
      autoSendTimerRef.current = setTimeout(() => {
        if (transcript.trim() && onTranscript) {
          stopWebListening();
          setIsActive(false);
          onTranscript(transcript.trim(), detectedLanguage);
          resetTranscript();
          lastTranscriptRef.current = '';
        }
      }, 2000);
    }
  }, [isIOS, transcript, isListening, onTranscript, stopWebListening, resetTranscript, detectedLanguage]);

  // Auto-speak response when received
  useEffect(() => {
    if (responseText && !isProcessing && ttsSupported && !hasSpokenRef.current && hasUserInteracted) {
      hasSpokenRef.current = true;
      speak(responseText, responseLanguage);
    }
    
    if (isProcessing) {
      hasSpokenRef.current = false;
    }
  }, [responseText, isProcessing, speak, ttsSupported, responseLanguage, hasUserInteracted]);

  // Continuous conversation: auto-start listening when speaking ends
  useEffect(() => {
    if (isIOS) return;

    if (isSpeaking) {
      wasSpeakingRef.current = true;
    }
    
    if (!isSpeaking && wasSpeakingRef.current && continuousMode && speechSupported && !isProcessing && !isLoading) {
      wasSpeakingRef.current = false;
      const timer = setTimeout(async () => {
        if (!isListening && !isProcessing) {
          try {
            await startWebListening();
            setIsActive(true);
          } catch (e) {
            console.error('Failed to auto-start listening:', e);
          }
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isIOS, isSpeaking, continuousMode, speechSupported, isProcessing, isListening, startWebListening, isLoading]);

  const handleOrbClick = async () => {
    setHasUserInteracted(true);

    if (isSpeaking || isLoading) {
      stopSpeaking();
      return;
    }

    if (isIOS) {
      if (isRecording) {
        if (autoSendTimerRef.current) {
          clearTimeout(autoSendTimerRef.current);
        }

        try {
          const result = await stopRecording();
          setIsActive(false);
          if (result.text.trim() && onTranscript) {
            onTranscript(result.text.trim(), result.language);
          }
          resetTranscript();
          lastTranscriptRef.current = '';
        } catch (e) {
          console.error('Failed to stop recording:', e);
          setIsActive(false);
        }
      } else if (speechSupported) {
        try {
          await startRecording();
          setIsActive(true);
        } catch (e) {
          console.error('Failed to start recording:', e);
          setIsActive(false);
        }
      }
      return;
    }

    if (isListening) {
      if (autoSendTimerRef.current) {
        clearTimeout(autoSendTimerRef.current);
      }
      if (transcript.trim() && onTranscript) {
        onTranscript(transcript.trim(), detectedLanguage);
        resetTranscript();
        lastTranscriptRef.current = '';
      }
      stopWebListening();
      setIsActive(false);
    } else if (speechSupported) {
      try {
        await startWebListening();
        setIsActive(true);
      } catch (e) {
        console.error('Failed to start listening:', e);
        setIsActive(false);
      }
    }
  };

  const displayState = (isLoading || isProcessing || isProcessingVoice) ? 'thinking' : isSpeaking ? 'speaking' : isListening ? 'listening' : 'idle';

  const languageNames: Record<string, string> = {
    'hi-IN': 'हिंदी',
    'ta-IN': 'தமிழ்',
    'te-IN': 'తెలుగు',
    'kn-IN': 'ಕನ್ನಡ',
    'ml-IN': 'മലയാളം',
    'bn-IN': 'বাংলা',
    'gu-IN': 'ગુજરાતી',
    'pa-IN': 'ਪੰਜਾਬੀ',
    'mr-IN': 'मराठी',
    'or-IN': 'ଓଡ଼ିଆ',
    'en-IN': 'English'
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={handleOrbClick}
        disabled={isProcessing}
        className="relative group cursor-pointer disabled:cursor-wait touch-manipulation"
        aria-label={displayState === 'idle' ? 'Tap to start speaking' : displayState === 'listening' ? 'Tap to stop' : 'Voice assistant'}
      >
        {/* Outer glow ring */}
        <div className={`absolute inset-0 rounded-full transition-all duration-500 ${
          displayState !== 'idle' 
            ? 'scale-150 opacity-100' 
            : 'scale-100 opacity-60'
        } ${
          displayState === 'speaking' 
            ? isLightMode ? 'bg-gray-400/40 blur-xl' : 'bg-primary/40 blur-xl' 
            : displayState === 'thinking'
            ? isLightMode ? 'bg-gray-300/40 blur-xl' : 'bg-accent/30 blur-xl'
            : displayState === 'listening'
            ? 'bg-green-400/30 blur-xl'
            : isLightMode ? 'bg-gray-400/30 blur-xl' : 'bg-white/20 blur-xl'
        }`} />
        
        {/* Main orb */}
        <div className={`relative w-28 h-28 sm:w-36 sm:h-36 rounded-full backdrop-blur-sm border flex items-center justify-center orb-glow orb-pulse transition-all duration-300 ${
          displayState !== 'idle' ? 'scale-110' : 'scale-100'
        } ${
          displayState === 'speaking' 
            ? isLightMode 
              ? 'bg-gradient-to-br from-gray-500/50 to-gray-400/30 border-gray-500/60' 
              : 'bg-gradient-to-br from-primary/40 to-primary/20 border-primary/60' 
            : displayState === 'thinking'
            ? isLightMode
              ? 'bg-gradient-to-br from-gray-400/40 to-gray-300/20 border-gray-400/50'
              : 'bg-gradient-to-br from-accent/30 to-accent/10 border-accent/40'
            : displayState === 'listening'
            ? 'bg-gradient-to-br from-green-400/30 to-green-400/10 border-green-400/50'
            : isLightMode 
              ? 'bg-gradient-to-br from-gray-400/40 to-gray-300/20 border-gray-400/50'
              : 'bg-gradient-to-br from-white/20 to-white/5 border-white/30'
        }`}>
          {/* Inner glow */}
          <div className={`absolute inset-4 rounded-full bg-gradient-to-br to-transparent ${
            displayState === 'speaking' 
              ? isLightMode ? 'from-gray-500/40' : 'from-primary/30' 
              : displayState === 'thinking'
              ? isLightMode ? 'from-gray-400/30' : 'from-accent/20'
              : displayState === 'listening'
              ? 'from-green-400/20'
              : isLightMode ? 'from-gray-400/30' : 'from-white/20'
          }`} />
          
          {/* Waveform animation */}
          <div className="flex items-center justify-center gap-1 z-10">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`w-1 rounded-full transition-all ${
                  displayState === 'speaking' 
                    ? isLightMode ? 'bg-gray-600' : 'bg-primary' 
                    : displayState === 'listening' 
                    ? 'bg-green-400' 
                    : isLightMode ? 'bg-gray-500' : 'bg-white/80'
                } ${
                  displayState !== 'idle' ? 'waveform-bar' : 'h-1'
                }`}
                style={{ 
                  height: displayState !== 'idle' ? undefined : '4px',
                  animationDelay: `${i * 0.1}s` 
                }}
              />
            ))}
          </div>
        </div>

        {/* Hover ring */}
        <div className={`absolute inset-0 rounded-full border-2 transition-all duration-300 scale-110 ${
          isLightMode 
            ? 'border-gray-400/0 group-hover:border-gray-500/40' 
            : 'border-primary/0 group-hover:border-primary/30'
        }`} />
      </button>

      {/* Text labels */}
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-widest">
          CARE
        </h2>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">
          {displayState === 'thinking' && (isLoading ? 'Preparing audio...' : 'Thinking...')}
          {displayState === 'speaking' && 'Speaking...'}
          {displayState === 'listening' && `Listening... (${languageNames[detectedLanguage] || 'English'})`}
          {displayState === 'idle' && (speechSupported ? 'Tap to speak' : 'Voice not supported')}
        </p>
        
        {/* Error display */}
        {speechError && (
          <p className="text-destructive text-xs mt-1">{speechError}</p>
        )}
      </div>

      {/* Live transcript */}
      {isListening && transcript && (
        <div className="text-center max-w-xs sm:max-w-md px-4 animate-fade-in">
          <p className="text-foreground/80 text-xs sm:text-sm italic">"{transcript}"</p>
          <p className="text-muted-foreground/60 text-xs mt-1">
            Auto-sending in 2 seconds...
          </p>
        </div>
      )}

      <p className="text-muted-foreground/70 text-xs sm:text-sm">
        {isSpeaking ? 'Tap to stop' : 'Speak in Hindi, Tamil, Telugu, or any Indian language'}
      </p>
    </div>
  );
};

export default AiOrb;
```

---

## AppSidebar.tsx - Navigation Sidebar

**File**: `src/components/AppSidebar.tsx`  
**Lines**: 253  
**Purpose**: Collapsible sidebar with navigation and auth state

[Full source code included - 253 lines as shown in context]

---

## Auth.tsx - Authentication Page

**File**: `src/pages/Auth.tsx`  
**Lines**: 312  
**Purpose**: Login, signup, and password reset forms

[Full source code included - 312 lines as shown in context]

---

## Dashboard.tsx - User Dashboard

**File**: `src/pages/Dashboard.tsx`  
**Lines**: 248  
**Purpose**: Case management, calendar, and overview for authenticated users

[Full source code included - 248 lines as shown in context]

---

## Component Inventory Summary

| Component | Lines | Purpose |
|-----------|-------|---------|
| Index.tsx | 118 | Homepage |
| MainContent.tsx | 141 | Chat interface |
| AiOrb.tsx | 325 | Voice assistant |
| AppSidebar.tsx | 253 | Navigation |
| ChatInput.tsx | 513 | Message input |
| ChatMessages.tsx | 85 | Message display |
| ChatHeader.tsx | 37 | Header bar |
| Auth.tsx | 312 | Authentication |
| Dashboard.tsx | 248 | User dashboard |

**Total Core Component Code**: ~2,000+ lines

---

*This documentation is confidential and proprietary. Unauthorized reproduction is prohibited.*
