import { useState } from 'react';
import { Plus, MoreVertical, Search, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAllCharacters, shows } from '../../config';
import type { Chat } from '../../types/chat';
import type { Character } from '../../types';
import { NewChatView } from './NewChatView';

interface ChatListProps {
  activeChats: Chat[];
  selectedChat: Chat | null;
  isMobile: boolean;
  isSaving: boolean;
  onChatSelect: (chat: Chat) => void;
  onNewChat: (character: Character) => void;
  onNewGroupChat: (show: typeof shows[keyof typeof shows]) => void;
  onClearAllChats: () => void;
}

export function ChatList({
  activeChats,
  selectedChat,
  isMobile,
  isSaving,
  onChatSelect,
  onNewChat,
  onNewGroupChat,
  onClearAllChats
}: ChatListProps) {
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  const handleClearAllChats = async () => {
    if (window.confirm('Are you sure you want to clear all chats? This cannot be undone.')) {
      setShowMenu(false);
      await onClearAllChats();
    }
  };

  const handleSelectCharacter = (character: Character) => {
    onNewChat(character);
    setShowNewChat(false);
  };

  const handleSelectGroup = (show: typeof shows[keyof typeof shows]) => {
    // Check if group already exists
    const existingGroup = activeChats.find(chat => 
      chat.type === 'group' && chat.id === show.id
    );

    if (existingGroup) {
      // If group exists, select it instead of creating new
      onChatSelect(existingGroup);
    } else {
      // If group doesn't exist, create new
      onNewGroupChat(show);
    }
    setShowNewChat(false);
  };

  return (
    <div className="w-full md:w-[380px] md:max-w-md bg-white border-r border-gray-200 flex flex-col min-w-[320px] fixed md:relative inset-0 z-50">
      {/* Header */}
      <div className="bg-[#f0f2f5] px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#dfe5e7] flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="23" fill="#008000" stroke="#003300" stroke-width="2"></circle>
              <path d="M2,24 H46" stroke="#003300" stroke-width="2"></path>
              <path d="M2,24 H22 M26,24 H46" fill="#FFFFFF"></path>
              <circle cx="24" cy="24" r="6" fill="#FFFFFF" stroke="#003300" stroke-width="2"></circle>
              <circle cx="24" cy="24" r="4" fill="#00FF00"></circle>
              <path d="M4,12 H44 M4,36 H44 M12,4 V44 M36,4 V44" stroke="#00FF00" stroke-width="1"></path>
              <circle cx="12" cy="12" r="2" fill="#00FF00"></circle>
              <circle cx="36" cy="36" r="2" fill="#00FF00"></circle>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#111b21]">Ash Chat</h1>
            {isSaving && (
              <span className="text-xs text-[#667781]">Saving...</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNewChat(true)}
            className="p-2 hover:bg-black/5 rounded-full transition-colors"
          >
            <Plus className="w-5 h-5 text-[#54656f]" />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-black/5 rounded-full transition-colors"
            >
              <MoreVertical className="w-5 h-5 text-[#54656f]" />
            </button>
            
            {/* Menu Dropdown */}
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <button
                  onClick={handleClearAllChats}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50"
                >
                  Clear All Chats
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="p-2 bg-white flex-shrink-0">
        <div className="relative">
          <input
            type="text"
            placeholder="Search or start new chat"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#f0f2f5] pl-12 pr-4 py-2 rounded-lg text-sm text-[#111b21] placeholder-[#667781] focus:outline-none"
          />
          <Search className="w-4 h-4 text-[#54656f] absolute left-4 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          {showNewChat ? (
            <NewChatView
              onBack={() => setShowNewChat(false)}
              onSelectCharacter={handleSelectCharacter}
              onSelectGroup={handleSelectGroup}
            />
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 overflow-y-auto py-2"
            >
              {activeChats.length > 0 ? (
                activeChats
                  .filter(chat => 
                    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((chat) => (
                    <div
                      key={chat.id}
                      onClick={() => onChatSelect(chat)}
                      className={`px-3 py-3 flex items-center gap-3 hover:bg-[#f0f2f5] cursor-pointer border-b border-[#e9edef] last:border-0 ${
                        selectedChat?.id === chat.id ? 'bg-[#f0f2f5]' : ''
                      }`}
                    >
                      <div className={`w-12 h-12 ${chat.type === 'group' ? 'rounded-lg' : 'rounded-full'} bg-[#00a884] flex items-center justify-center flex-shrink-0`}>
                        {typeof chat.avatar === 'string' && chat.avatar.startsWith('http') ? (
                          <img src={chat.avatar} alt={chat.name} className={`w-full h-full object-cover ${chat.type === 'group' ? 'rounded-lg' : 'rounded-full'}`} />
                        ) : (
                          <span className="text-white text-lg">{chat.avatar}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-[#111b21] truncate">{chat.name}</div>
                          {chat.timestamp && (
                            <div className="text-xs text-[#667781]">
                              {new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>
                        {chat.lastMessage && (
                          <div className="text-sm text-[#667781] truncate">{chat.lastMessage}</div>
                        )}
                      </div>
                      {chat.unreadCount && chat.unreadCount > 0 && (
                        <div className="w-5 h-5 rounded-full bg-[#25d366] text-white text-xs flex items-center justify-center">
                          {chat.unreadCount}
                        </div>
                      )}
                    </div>
                  ))
              ) : (
                <div className="px-4 py-8 text-center text-[#8696a0]">
                  <p className="text-sm">No chats yet</p>
                  <p className="text-xs mt-1">Start a new chat by clicking the + button</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
} 