import { ArrowLeft } from 'lucide-react';
import type { Chat } from '../../types/chat';

interface ChatHeaderProps {
  chat: Chat;
  isMobile: boolean;
  isLoading: boolean;
  isGeneratingResponse: boolean;
  lastMessageSender: string | null;
  onBackToList: () => void;
}

export function ChatHeader({
  chat,
  isMobile,
  isLoading,
  isGeneratingResponse,
  lastMessageSender,
  onBackToList
}: ChatHeaderProps) {
  return (
    <div className="bg-[#f0f2f5] px-4 py-2 flex items-center gap-3 shadow-sm z-10">
      {isMobile && (
        <button
          onClick={onBackToList}
          className="p-1 -ml-2 hover:bg-black/5 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[#54656f]" />
        </button>
      )}
      <div className={`w-10 h-10 ${chat.type === 'group' ? 'rounded-lg' : 'rounded-full'} bg-[#00a884] flex items-center justify-center flex-shrink-0`}>
        {typeof chat.avatar === 'string' && chat.avatar.startsWith('http') ? (
          <img src={chat.avatar} alt={chat.name} className="w-full h-full object-cover rounded-lg" />
        ) : (
          <span className="text-white text-lg">{chat.avatar}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-[#111b21] truncate">{chat.name}</div>
        {isLoading || isGeneratingResponse ? (
          <div className="text-xs text-[#667781]">
            {chat.type === 'group' && lastMessageSender ? 
              `${lastMessageSender} is typing...` : 
              'typing...'}
          </div>
        ) : chat.type === 'group' ? (
          <div className="text-xs text-[#667781]">
            {chat.members?.length} participants
          </div>
        ) : null}
      </div>
    </div>
  );
} 