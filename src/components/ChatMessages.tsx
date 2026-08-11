import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { Message } from '@/hooks/useLegalChat';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
}

const ChatMessages = ({ messages, isLoading }: ChatMessagesProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="w-full mx-auto">
      <div className="space-y-4 py-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex",
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                "w-full font-sans text-base py-2",
                message.role === 'user'
                  ? 'text-right font-bold text-muted-foreground'
                  : 'text-left text-foreground'
              )}
            >
              {message.role === 'assistant' ? (
                <div className="max-w-none w-full">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => <h1 className="text-3xl font-extrabold text-foreground mt-2 mb-6 uppercase tracking-tight">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-xl font-bold text-foreground mt-8 mb-4">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-lg font-bold text-foreground mt-6 mb-3">{children}</h3>,
                      p: ({ children }) => <p className="mb-4 leading-relaxed text-foreground">{children}</p>,
                      hr: () => <hr className="border-t border-border my-6" />,
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-6">
                          <table className="w-full border-collapse border border-border text-left text-sm">{children}</table>
                        </div>
                      ),
                      thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
                      th: ({ children }) => <th className="border border-border px-4 py-3 font-bold text-foreground">{children}</th>,
                      td: ({ children }) => <td className="border border-border px-4 py-3 text-foreground">{children}</td>,
                      ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-2 text-foreground">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside mb-4 space-y-2 text-foreground">{children}</ol>,
                      li: ({ children }) => <li className="text-sm text-foreground">{children}</li>,
                      strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
                      code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-xs text-foreground">{children}</code>,
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>

                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-border/60">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                        Sources referenced
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {message.sources.map((s, i) => (
                          <span
                            key={i}
                            className="inline-flex items-start gap-1 rounded-md border border-border bg-muted/50 px-2 py-1 text-xs text-foreground max-w-full"
                            title={s.label}
                          >
                            <span className="font-semibold text-muted-foreground shrink-0">{s.type}:</span>
                            <span className="truncate">{s.label}</span>
                          </span>
                        ))}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-2">
                        Grounded in the above sources. Always verify against the official Gazette / India Code before acting.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="leading-relaxed inline-block">{message.content}</p>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted border border-border rounded-2xl px-4 py-3">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        
        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatMessages;
