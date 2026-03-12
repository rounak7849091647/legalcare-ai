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

  // Handle inactivity prompts - AI SPEAKS directly to user (not as a message)
  const handleInactivityPrompt = useCallback((promptMessage: string) => {
    // AI speaks the prompt directly using TTS - NOT added to chat
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
          {/* Scrollable messages area */}
          <div className="flex-1 overflow-y-auto min-h-0 pb-4">
            <div className="max-w-3xl mx-auto w-full px-4 pt-4">
              <ChatMessages messages={messages} isLoading={isLoading} />
            </div>
          </div>
          
          {/* Fixed input at bottom */}
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
