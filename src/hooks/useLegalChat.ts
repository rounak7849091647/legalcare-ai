import { useState, useCallback, useRef } from 'react';
import { getChatUrl, invokeFunction } from '@/lib/api';

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
    .slice(-6)
    .map(msg => ({ role: msg.role, content: msg.voiceContent || msg.content }));
};

const CHAT_URL = getChatUrl();

export const useLegalChat = (): LegalChatHook => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastLanguage, setLastLanguage] = useState('en-IN');
  const [lastVoiceResponse, setLastVoiceResponse] = useState('');
  const [documentContext, setDocumentContext] = useState<string | null>(null);
  const documentContextRef = useRef<string | null>(null);
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  const updateDocumentContext = useCallback((content: string | null) => {
    setDocumentContext(content);
    documentContextRef.current = content;
  }, []);

  const summarizeDocument = useCallback(async (documentContent: string, documentName: string, detectedLanguage: string = 'en-IN') => {
    if (!documentContent || isLoading) return;

    documentContextRef.current = documentContent;
    setDocumentContext(documentContent);

    const uploadMessage: Message = {
      id: `upload-${Date.now()}`,
      role: 'user',
      content: `📄 Uploaded document: **${documentName}**`,
      timestamp: new Date(),
      language: detectedLanguage
    };

    setMessages(prev => [...prev, uploadMessage]);
    setIsLoading(true);
    setLastLanguage(detectedLanguage);

    try {
      const { data, error } = await invokeFunction('legal-chat', {
        body: { sessionId, detectedLanguage, documentContent, action: 'summarize' }
      });

      if (error) throw error;

      const summaryContent = data.response || 'Could not generate summary.';

      const summaryMessage: Message = {
        id: `summary-${Date.now()}`,
        role: 'assistant',
        content: `📋 **Document Summary**\n\n${summaryContent}\n\n---\n*Ask me any questions about this document!*`,
        voiceContent: summaryContent,
        timestamp: new Date(),
        language: data.language || detectedLanguage,
        isDocumentSummary: true
      };

      setMessages(prev => [...prev, summaryMessage]);
      setLastLanguage(data.language || detectedLanguage);
      setLastVoiceResponse(summaryContent);
    } catch (error) {
      console.error('Summarization error:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'I could not summarize the document, but you can still ask questions about it.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, sessionId]);

  const sendMessage = useCallback(async (message: string, detectedLanguage: string = 'en-IN', documentContent?: string) => {
    if (!message.trim() || isLoading) return;

    if (documentContent && !documentContextRef.current) {
      documentContextRef.current = documentContent;
      setDocumentContext(documentContent);
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message.trim(),
      timestamp: new Date(),
      language: detectedLanguage
    };

    const currentMessages = [...messages];
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setLastLanguage(detectedLanguage);

    // Create placeholder for streaming response
    const assistantId = `assistant-${Date.now()}`;
    let fullResponse = '';

    try {
      const conversationHistory = formatMessagesForAI(currentMessages);

      // Use streaming for faster perceived response
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          message: message.trim(),
          sessionId,
          detectedLanguage,
          documentContent: documentContextRef.current || undefined,
          conversationHistory,
          stream: true
        }),
      });

      if (!resp.ok || !resp.body) {
        throw new Error('Failed to get response');
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let hasAddedMessage = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullResponse += content;

              // Update message in real-time
              if (!hasAddedMessage) {
                hasAddedMessage = true;
                setMessages(prev => [...prev, {
                  id: assistantId,
                  role: 'assistant',
                  content: fullResponse,
                  voiceContent: fullResponse,
                  timestamp: new Date(),
                  language: detectedLanguage
                }]);
              } else {
                setMessages(prev => prev.map(m => 
                  m.id === assistantId 
                    ? { ...m, content: fullResponse, voiceContent: fullResponse }
                    : m
                ));
              }
            }
          } catch {
            // Incomplete JSON, continue
          }
        }
      }

      // Final update
      if (fullResponse) {
        setMessages(prev => prev.map(m => 
          m.id === assistantId 
            ? { ...m, content: fullResponse, voiceContent: fullResponse }
            : m
        ));
        setLastVoiceResponse(fullResponse);
      }

      setLastLanguage(detectedLanguage);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, there was an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, sessionId, messages]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setDocumentContext(null);
    documentContextRef.current = null;
  }, []);

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
