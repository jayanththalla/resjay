import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/index';
import { aiService } from '@/services/ai-service';
import { cn, generateId } from '@/lib/utils';
import { Send, Sparkles, User, Bot, Loader2, StopCircle, Copy, Check } from 'lucide-react';
import type { ChatMessage } from '@/services/storage-service';

interface ChatInterfaceProps {
  resumeLatex: string;
  jobDescription: string;
  knowledgeBase: string;
  onLatexUpdate: (latex: string) => void;
  messages: ChatMessage[];
  onMessagesChange: (messages: ChatMessage[]) => void;
}

export function ChatInterface({
  resumeLatex,
  jobDescription,
  knowledgeBase,
  onLatexUpdate,
  messages,
  onMessagesChange,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, scrollToBottom]);

  const suggestedPrompts = [
    'Tailor my resume for this job description',
    'What keywords am I missing?',
    'Improve my projects section',
    'Add more quantifiable metrics to my experience',
    'Make my skills section more ATS-friendly',
  ];

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;
    if (!aiService.isConfigured()) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMessage];
    onMessagesChange(newMessages);
    setInput('');
    setIsStreaming(true);
    setStreamingText('');

    try {
      const systemPrompt = aiService.buildChatSystemPrompt(
        resumeLatex,
        jobDescription,
        knowledgeBase
      );

      // Build Gemini chat history
      const history = newMessages.map((m) => ({
        role: m.role === 'user' ? ('user' as const) : ('model' as const),
        parts: [{ text: m.content }],
      }));

      await aiService.streamChat(history, systemPrompt, {
        onToken: (token) => {
          setStreamingText((prev) => prev + token);
        },
        onComplete: (fullText) => {
          const assistantMessage: ChatMessage = {
            id: generateId(),
            role: 'assistant',
            content: fullText,
            timestamp: Date.now(),
          };
          const updated = [...newMessages, assistantMessage];
          onMessagesChange(updated);
          setStreamingText('');
          setIsStreaming(false);

          // Check if response contains LaTeX code and update preview
          const latexMatch = fullText.match(/```latex\n([\s\S]*?)```/);
          if (latexMatch) {
            onLatexUpdate(latexMatch[1].trim());
          } else if (
            fullText.includes('\\documentclass') &&
            fullText.includes('\\begin{document}')
          ) {
            // Full LaTeX document in response
            const cleaned = fullText
              .replace(/```latex\n?/g, '')
              .replace(/```\n?/g, '')
              .trim();
            if (cleaned.includes('\\documentclass')) {
              onLatexUpdate(cleaned);
            }
          }
        },
        onError: (error) => {
          const errorMessage: ChatMessage = {
            id: generateId(),
            role: 'assistant',
            content: `❌ Error: ${error.message}. Please check your API key and try again.`,
            timestamp: Date.now(),
          };
          onMessagesChange([...newMessages, errorMessage]);
          setStreamingText('');
          setIsStreaming(false);
        },
      });
    } catch (error: any) {
      setIsStreaming(false);
      setStreamingText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {isEmpty && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="p-4 rounded-2xl bg-primary/10 text-primary mb-4">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold mb-2">Start Tailoring</h3>
            <p className="text-xs text-muted-foreground mb-6 max-w-xs">
              {!resumeLatex
                ? 'Upload your resume first, then ask me to tailor it for any job.'
                : !jobDescription
                ? 'Paste a job description, then ask me to tailor your resume.'
                : 'Ask me to tailor your resume, add keywords, or improve specific sections.'}
            </p>

            {resumeLatex && jobDescription && (
              <div className="w-full space-y-2">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => { setInput(prompt); textareaRef.current?.focus(); }}
                    className="w-full text-left text-xs px-3 py-2.5 rounded-lg border border-border hover:bg-accent hover:border-primary/20 transition-all duration-200"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isStreaming && streamingText && (
          <MessageBubble
            message={{
              id: 'streaming',
              role: 'assistant',
              content: streamingText,
              timestamp: Date.now(),
            }}
            isStreaming
          />
        )}

        {isStreaming && !streamingText && (
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="typing-indicator bg-muted rounded-2xl rounded-tl-sm">
              <span /><span /><span />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-border p-3">
        <div className="relative flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              !resumeLatex
                ? 'Upload your resume first...'
                : !jobDescription
                ? 'Paste a job description first...'
                : 'Ask me to tailor your resume...'
            }
            disabled={isStreaming || !resumeLatex}
            className="min-h-[44px] max-h-[120px] pr-12 text-sm resize-none"
            rows={1}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isStreaming || !resumeLatex}
            className="absolute right-1.5 bottom-1.5 h-8 w-8 rounded-lg"
          >
            {isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Message Bubble Component ────────────────────────────────
function MessageBubble({
  message,
  isStreaming = false,
}: {
  message: ChatMessage;
  isStreaming?: boolean;
}) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[v0] Failed to copy:', err);
    }
  };

  // Parse content for code blocks
  const renderContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, i) => {
      if (part.startsWith('```')) {
        const codeMatch = part.match(/```(\w+)?\n?([\s\S]*?)```/);
        if (codeMatch) {
          return (
            <pre
              key={i}
              className="my-2 p-3 rounded-lg bg-background/50 border border-border overflow-x-auto text-[11px] font-mono"
            >
              <code>{codeMatch[2].trim()}</code>
            </pre>
          );
        }
      }
      return (
        <span key={i} className="whitespace-pre-wrap">
          {part}
        </span>
      );
    });
  };

  return (
    <div
      className={cn(
        'flex items-start gap-2.5 message-enter group',
        isUser && 'flex-row-reverse'
      )}
    >
      <div
        className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      <div
        className={cn(
          'max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed relative',
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-sm'
            : 'bg-muted rounded-tl-sm'
        )}
      >
        {renderContent(message.content)}
        {isStreaming && (
          <span className="inline-block w-1.5 h-4 bg-primary/60 ml-0.5 animate-pulse rounded-sm" />
        )}
        
        {/* Copy button for assistant messages */}
        {!isUser && !isStreaming && (
          <button
            onClick={handleCopy}
            className="absolute -right-8 top-0.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
