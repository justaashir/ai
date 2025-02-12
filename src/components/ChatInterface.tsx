import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useChatStore } from '../stores/useChatStore';
import { ChatList } from './chat/ChatList';
import { ChatPanel } from './chat/ChatPanel';

export default function ChatInterface() {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [showChatList, setShowChatList] = useState(true);

  const {
    activeChats,
    selectedChat,
    isSaving,
    selectChat,
    createNewChat,
    createNewGroupChat,
    clearAllChats
  } = useChatStore();

  // Update showChatList when chat is selected on mobile
  useEffect(() => {
    if (isMobile && selectedChat) {
      setShowChatList(false);
    }
  }, [selectedChat, isMobile]);

  // Handle back button on mobile
  const handleBackToList = () => {
    setShowChatList(true);
  };

  const handleClearAllChats = async () => {
    await clearAllChats();
    if (isMobile) {
      setShowChatList(true);
    }
  };

  const handleChatSelect = (chat: Chat) => {
    selectChat(chat.id);
    if (isMobile) {
      setShowChatList(false);
    }
  };

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] bg-[#f0f2f5]">
      {/* Chat List Panel */}
      <AnimatePresence mode="wait">
        {(!isMobile || (isMobile && showChatList)) && (
          <ChatList
            activeChats={activeChats}
            selectedChat={selectedChat}
            isMobile={isMobile}
            isSaving={isSaving}
            onChatSelect={handleChatSelect}
            onNewChat={createNewChat}
            onNewGroupChat={createNewGroupChat}
            onClearAllChats={handleClearAllChats}
          />
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence mode="wait">
        {(!isMobile || (isMobile && !showChatList)) && selectedChat && (
          <ChatPanel
            chat={selectedChat}
            isMobile={isMobile}
            showChatList={showChatList}
            onBackToList={handleBackToList}
          />
        )}
      </AnimatePresence>
    </div>
  );
} 