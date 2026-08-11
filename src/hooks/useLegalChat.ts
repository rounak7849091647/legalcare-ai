import { useState, useCallback, useRef } from 'react';
import { getChatUrl, invokeFunction } from '@/lib/api';

export interface LegalSource {
  type: string;   // e.g. "Act / Section", "Rule / Notification", "Supreme Court"
  label: string;  // e.g. "BHARATIYA NYAYA SANHITA, 2023 (BNS) — Section 103 Punishment for murder"
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  voiceContent?: string;
  timestamp: Date;
  language?: string;
  isDocumentSummary?: boolean;
  showFeedback?: boolean;
  sources?: LegalSource[];
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
        isDocumentSummary: true,
        showFeedback: true // Show feedback only here or at end of session
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

      const chatUrl = getChatUrl();

      // Use streaming for faster perceived response
      const resp = await fetch(chatUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          sessionId,
          detectedLanguage,
          documentContent: documentContextRef.current || undefined,
          conversationHistory,
          stream: true
        }),
      });

      if (!resp.ok) {
        const errorBody = await resp.text();
        throw new Error(`HTTP ${resp.status}: ${errorBody || resp.statusText}`);
      }

      let assistantSources: LegalSource[] = [];
      const appendToAssistant = (text: string) => {
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMsg = newMessages[newMessages.length - 1];
          if (lastMsg && lastMsg.id === assistantId) {
            lastMsg.content = text;
            lastMsg.voiceContent = text;
            if (assistantSources.length) lastMsg.sources = assistantSources;
          } else {
            newMessages.push({
              id: assistantId,
              role: 'assistant',
              content: text,
              voiceContent: text,
              timestamp: new Date(),
              language: detectedLanguage,
              sources: assistantSources.length ? assistantSources : undefined,
            });
          }
          return newMessages;
        });
      };

      const contentType = resp.headers.get('content-type') || '';

      if (contentType.includes('text/event-stream')) {
        // Real SSE stream — render tokens as they arrive
        if (!resp.body) throw new Error('No response body');
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let sepIndex;
          while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
            const event = buffer.slice(0, sepIndex);
            buffer = buffer.slice(sepIndex + 2);
            const dataLine = event.split('\n').find(l => l.startsWith('data:'));
            if (!dataLine) continue;
            const payload = dataLine.slice(5).trim();
            if (payload === '[DONE]') continue;
            try {
              const parsed = JSON.parse(payload);
              if (parsed.sources) {
                assistantSources = parsed.sources;
              } else if (parsed.delta) {
                fullResponse += parsed.delta;
                appendToAssistant(fullResponse);
              } else if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch {
              // Ignore malformed events
            }
          }
        }
      } else if (contentType.includes('application/json')) {
        const json = await resp.json();
        if (Array.isArray(json.sources)) assistantSources = json.sources;
        fullResponse = json.response || json.answer || json.message || 'No response received.';
        appendToAssistant(fullResponse);
      } else {
        if (!resp.body) throw new Error('No response body');
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          fullResponse = buffer;
          appendToAssistant(fullResponse);
        }
      }

      setLastVoiceResponse(fullResponse);
      setIsLoading(false);
      return;

    } catch (error) {
      console.error('Chat error:', error);
      let errorMsg = 'Sorry, there was an error. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorMsg = 'Network Error: Could not connect to server. Check your connection or CORS settings.';
        } else {
          errorMsg = `Error: ${error.message}`;
        }
      }

      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: errorMsg,
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
