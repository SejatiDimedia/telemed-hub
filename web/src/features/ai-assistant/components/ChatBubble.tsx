import React from 'react';
import { Avatar } from '@/components/ui/Avatar';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: React.ReactNode;
  timestamp?: string;
}

export function ChatBubble({ role, content, timestamp }: ChatBubbleProps) {
  const isUser = role === 'user';

  return (
    <div
      className={`flex w-full items-end gap-3 ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      <div className="shrink-0 mb-1">
        <Avatar 
          name={isUser ? "User" : "AI"} 
          size="md" 
          className={isUser ? 'bg-primary-container text-on-primary-container border-none shadow-sm' : 'bg-surface-container-high text-on-surface border-none shadow-sm'} 
        />
      </div>

      <div
        className={`flex max-w-[85%] flex-col gap-1.5 ${
          isUser ? 'items-end' : 'items-start'
        }`}
      >
        <div
          className={`px-5 py-3.5 text-body-md shadow-level-1 transition-all duration-300 ${
            isUser
              ? 'bg-primary text-on-primary rounded-3xl rounded-br-sm'
              : 'bg-surface-container-lowest text-on-surface rounded-3xl rounded-bl-sm border border-outline-variant/30'
          }`}
        >
          {typeof content === 'string' ? (
            <div className="whitespace-pre-wrap leading-relaxed font-body">
              {content}
            </div>
          ) : (
            content
          )}
        </div>
        {timestamp && (
          <span className="text-label-sm text-on-surface-variant/70 px-2 font-medium">
            {new Date(timestamp).toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )}
      </div>
    </div>
  );
}
