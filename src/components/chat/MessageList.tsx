import { getCharacterById } from '../../config';
import { getMessageSender, formatTime } from '../../utils/chat';
import type { Chat, GroupMessage } from '../../types/chat';
import { useRef, useEffect } from 'react';

interface MessageListProps {
  chat: Chat;
  messages: GroupMessage[];
}

export function MessageList({ chat, messages }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 relative">
      {/* Chat background pattern */}
      <div 
        className="fixed inset-0 opacity-40" 
        style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23666666' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          backgroundAttachment: 'fixed',
          pointerEvents: 'none',
          zIndex: 0
        }} 
      />
      
      {/* Messages */}
      <div className="relative z-10 space-y-1">
        {messages.map((message, i) => {
          const showAvatar = message.role === 'assistant' && 
            chat.type === 'group' && (
              i === 0 || 
              messages[i - 1]?.characterId !== message.characterId ||
              messages[i - 1]?.role !== 'assistant'
            );
          const isConsecutive = i > 0 && 
            messages[i - 1]?.role === message.role &&
            messages[i - 1]?.characterId === message.characterId;
          
          return (
            <div
              key={message.id}
              className={`flex items-end ${message.role === 'user' ? 'justify-end' : 'justify-start'} 
                ${isConsecutive ? 'mt-0.5' : 'mt-2'}
                ${chat.type === 'group' ? 'gap-2' : 'gap-0'}`}
            >
              {/* Profile picture for assistant - only in group chats */}
              {message.role === 'assistant' && chat.type === 'group' && (
                <div className="w-8 h-8 rounded-full bg-[#00a884] flex-shrink-0 flex items-center justify-center shadow-sm">
                  {message.characterId && (() => {
                    const character = getCharacterById(message.characterId);
                    return character && character.avatar.startsWith('http') ? (
                      <img 
                        src={character.avatar} 
                        alt={character.name} 
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <span className="text-white text-sm">{character?.name.charAt(0)}</span>
                    );
                  })()}
                </div>
              )}
              
              <div
                className={`
                  group relative max-w-[65%]
                  ${message.role === 'user'
                    ? 'bg-[#d9fdd3] ml-auto'
                    : 'bg-white'
                  }
                  px-3 py-2 rounded-lg shadow-sm
                  ${isConsecutive ? 'rounded-t-md' : 'rounded-t-lg'}
                `}
              >
                {/* Message tail */}
                {!isConsecutive && (
                  <div
                    className={`absolute top-0 w-3 h-3 overflow-hidden
                      ${message.role === 'user' ? '-right-1.5' : '-left-1.5'}`}
                  >
                    <div className={`w-4 h-4 transform rotate-45 
                      ${message.role === 'user' ? 'bg-[#d9fdd3]' : 'bg-white'}
                      ${message.role === 'user' ? '-translate-x-1/2' : 'translate-x-1/2'}`}
                    />
                  </div>
                )}

                {/* Message content */}
                <div className="text-sm text-[#111b21] whitespace-pre-wrap">
                  {chat.type === 'group' && message.role === 'assistant' && (
                    <div className="text-xs font-medium mb-0.5 text-[#1f7aeb]">
                      {getMessageSender(message, chat.type)}
                    </div>
                  )}
                  {message.content}
                </div>

                {/* Message time */}
                <div className="text-[0.65rem] text-[#667781] text-right mt-1">
                  {formatTime(new Date(message.timestamp || Date.now()))}
                </div>
              </div>

              {/* Profile picture for user - only in group chats */}
              {message.role === 'user' && chat.type === 'group' && (
                <div className="w-8 h-8 rounded-full bg-[#dfe5e7] flex-shrink-0 flex items-center justify-center shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 text-[#8696a0]">
                    <path fill="currentColor" d="M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM6 8a6 6 0 1 1 12 0A6 6 0 0 1 6 8zm2 10a3 3 0 0 0-3 3 1 1 0 1 1-2 0 5 5 0 0 1 5-5h8a5 5 0 0 1 5 5 1 1 0 1 1-2 0 3 3 0 0 0-3-3H8z"/>
                  </svg>
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
} 