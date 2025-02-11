import { useState, useEffect } from 'react';
import { useChat } from 'ai/react';
import { Search, Plus, ArrowLeft, MoreVertical, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { shows, getAllCharacters, getCharacterById } from '../config';
import type { Character } from '../types';
import type { GroupMessage } from '../types/chat';
import { CHAT_CONSTANTS } from '../backend/chat/types';
import type { Message } from 'ai';
import { VisualInput } from './VisualInput';
import type { ContextMessage } from '../types/chat';
import localforage from 'localforage';

// Initialize localforage
localforage.config({
  name: 'whatsapp-clone',
  storeName: 'chats'
});

interface Chat {
  id: string;
  type: 'individual' | 'group';
  name: string;
  avatar: string;
  lastMessage?: string;
  timestamp?: Date;
  unreadCount?: number;
  members?: Character[];
  messages: GroupMessage[];
  chainId?: string;
  chainLength: number;
}

export default function WhatsAppHome() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [activeChats, setActiveChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [isTerminated, setIsTerminated] = useState(false);
  const [lastMessageSender, setLastMessageSender] = useState<string | null>(null);
  const [contextMessage, setContextMessage] = useState<ContextMessage | null>(null);
  const [showCharacterSuggestions, setShowCharacterSuggestions] = useState(false);
  const [characterSuggestions, setCharacterSuggestions] = useState<ReturnType<typeof getAllCharacters>>([]);
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  const [shouldRegenerate, setShouldRegenerate] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Load chats from storage on component mount
  useEffect(() => {
    const loadChats = async () => {
      try {
        const storedChats = await localforage.getItem<Chat[]>('chats');
        if (storedChats) {
          // Convert stored ISO date strings back to Date objects
          const processedChats = storedChats.map(chat => ({
            ...chat,
            timestamp: chat.timestamp ? new Date(chat.timestamp) : undefined,
            messages: chat.messages.map(msg => ({
              ...msg,
              timestamp: msg.timestamp ? new Date(msg.timestamp) : undefined
            }))
          }));
          setActiveChats(processedChats);
          
          // If there was a selected chat, restore it
          const lastSelectedChatId = await localforage.getItem<string>('selectedChatId');
          if (lastSelectedChatId) {
            const lastSelectedChat = processedChats.find(chat => chat.id === lastSelectedChatId);
            if (lastSelectedChat) {
              setSelectedChat(lastSelectedChat);
            }
          }
        }
      } catch (error) {
        console.error('Error loading chats:', error);
      }
    };
    
    loadChats();
  }, []);

  // Save chats whenever they change
  useEffect(() => {
    const saveChats = async () => {
      try {
        setIsSaving(true);
        await localforage.setItem('chats', activeChats);
        if (selectedChat) {
          await localforage.setItem('selectedChatId', selectedChat.id);
        } else {
          await localforage.removeItem('selectedChatId');
        }
      } catch (error) {
        console.error('Error saving chats:', error);
      } finally {
        setIsSaving(false);
      }
    };
    
    saveChats();
  }, [activeChats, selectedChat]);

  // Clear terminated chat data
  const clearTerminatedChat = async (chatId: string) => {
    try {
      setActiveChats(prev => prev.map(chat => 
        chat.id === chatId 
          ? { ...chat, chainLength: 0, chainId: undefined, messages: [] }
          : chat
      ));
      
      if (selectedChat?.id === chatId) {
        setSelectedChat(prev => prev ? { ...prev, chainLength: 0, chainId: undefined, messages: [] } : null);
      }
    } catch (error) {
      console.error('Error clearing terminated chat:', error);
    }
  };

  // Clear all chats
  const clearAllChats = async () => {
    try {
      await localforage.clear();
      setActiveChats([]);
      setSelectedChat(null);
    } catch (error) {
      console.error('Error clearing all chats:', error);
    }
  };

  const { messages: aiMessages, input, handleInputChange, handleSubmit: originalHandleSubmit, isLoading, append, reload, stop } = useChat({
    id: selectedChat?.id,
    api: `/api/chat?model=${selectedChat?.type === 'individual' ? getCharacterById(selectedChat.id)?.baseModel : 'gpt-4o-mini'}&character=${selectedChat?.type === 'individual' ? selectedChat.id : ''}`,
    onResponse: () => {
      if (selectedChat) {
        setActiveChats(prev => prev.map(chat => 
          chat.id === selectedChat.id 
            ? { ...chat, timestamp: new Date() }
            : chat
        ));
      }
    },
    onFinish: async (message) => {
      setIsGeneratingResponse(false);

      // If a regeneration was requested during the response, trigger it
      if (shouldRegenerate) {
        setShouldRegenerate(false);
        // Small delay to make it feel more natural
        setTimeout(() => {
          const lastUserMessage = selectedChat?.messages.findLast(m => m.role === 'user');
          if (lastUserMessage) {
            append({
              id: Date.now().toString(),
              role: 'user',
              content: lastUserMessage.content,
              createdAt: new Date()
            });
          }
        }, 500);
        return;
      }

      // Check for termination
      if (message.content.includes("Chat terminated")) {
        setIsTerminated(true);
        if (selectedChat) {
          setActiveChats(prev => prev.map(chat => 
            chat.id === selectedChat.id 
              ? { ...chat, chainLength: 0, chainId: undefined, messages: [] }
              : chat
          ));
        }
        return;
      }

      // Extract character name from response format [Character Name] Message
      const characterMatch = message.content.match(/^\[([\w\s-]+)\]/);
      const characterName = characterMatch ? characterMatch[1].trim() : null;
      const character = characterName ? getAllCharacters().find(char => char.name === characterName) : null;
      const cleanContent = characterMatch 
        ? message.content.replace(/^\[[\w\s-]+\]\s*/, '')
        : message.content;

      if (!selectedChat) return;

      const messageWithCharacter: GroupMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: cleanContent,
        characterId: character?.id || (selectedChat.type === 'individual' ? selectedChat.id : undefined),
        showId: selectedChat.type === 'group' ? selectedChat.id : undefined,
        timestamp: new Date(Date.now())
      };

      // Only add the message if it's complete (not interrupted)
      if (!shouldRegenerate) {
        // Update chat with new message
        setActiveChats(prev => {
          const updatedChats = prev.map(chat => 
            chat.id === selectedChat.id 
              ? {
                  ...chat,
                  lastMessage: cleanContent,
                  timestamp: new Date(),
                  messages: [...chat.messages, messageWithCharacter]
                }
              : chat
          );
          
          // If selectedChat exists in prev, find and update it
          const updatedSelectedChat = updatedChats.find(chat => chat.id === selectedChat.id);
          if (updatedSelectedChat) {
            setSelectedChat(updatedSelectedChat);
          }
          
          return updatedChats;
        });
      }

      // Only continue the chain for group chats and if not already at max length
      if (!shouldRegenerate && selectedChat.type === 'group' && selectedChat.chainLength < CHAT_CONSTANTS.MAX_CHAIN_LENGTH) {
        // Check for @ mentions in the assistant's response
        const mentions = Array.from(cleanContent.matchAll(/@([\w-]+)/g));
        if (mentions.length > 0) {
          // Get the last mentioned character
          const lastMention = mentions[mentions.length - 1][1];
          const mentionedCharacter = getCharacterById(lastMention);
          
          if (mentionedCharacter && mentionedCharacter.id !== character?.id) {
            // Increment chain length
            const newChainLength = selectedChat.chainLength + 1;
            setActiveChats(prev => {
              const updatedChats = prev.map(chat => 
                chat.id === selectedChat.id 
                  ? { ...chat, chainLength: newChainLength }
                  : chat
              );
              
              // Update selectedChat if it exists
              const updatedSelectedChat = updatedChats.find(chat => chat.id === selectedChat.id);
              if (updatedSelectedChat) {
                setSelectedChat(updatedSelectedChat);
              }
              
              return updatedChats;
            });
            
            if (newChainLength < CHAT_CONSTANTS.MAX_CHAIN_LENGTH) {
              // Add a delay before the next response
              await new Promise(resolve => setTimeout(resolve, CHAT_CONSTANTS.MIN_ASSISTANT_DELAY_MS));
              
              // Trigger a new message from the mentioned character
              const userMessage: Message = {
                id: Date.now().toString(),
                role: 'user',
                content: `@${lastMention} ${cleanContent}`,
                createdAt: new Date()
              };
              await append(userMessage);
            }
          }
        }
      } else {
        // Reset chain when no mentions or at max length or in individual chat
        setActiveChats(prev => {
          const updatedChats = prev.map(chat => 
            chat.id === selectedChat.id 
              ? { ...chat, chainLength: 0, chainId: undefined }
              : chat
          );
          
          // Update selectedChat if it exists
          const updatedSelectedChat = updatedChats.find(chat => chat.id === selectedChat.id);
          if (updatedSelectedChat) {
            setSelectedChat(updatedSelectedChat);
          }
          
          return updatedChats;
        });
      }
    }
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || !selectedChat) return;

    const currentInput = input;
    handleInputChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>);

    // If already generating a response, stop it and clear any partial messages
    if (isGeneratingResponse) {
      stop();  // Stop the current response generation
      setIsGeneratingResponse(false);
      setShouldRegenerate(false);
      
      // Remove any partial assistant messages from both UI and AI state
      const lastUserMessageIndex = aiMessages.findLastIndex(m => m.role === 'user');
      const cleanedAiMessages = aiMessages.slice(0, lastUserMessageIndex + 1);
      
      // Update UI messages
      setActiveChats(prev => {
        const updatedChats = prev.map(chat => 
          chat.id === selectedChat.id 
            ? {
                ...chat,
                messages: chat.messages.filter((m, i) => {
                  // Keep all messages up to and including the last user message
                  const lastUserIndex = chat.messages.findLastIndex(msg => msg.role === 'user');
                  return i <= lastUserIndex;
                })
              }
            : chat
        );
        
        // Update selectedChat if it exists
        const updatedSelectedChat = updatedChats.find(chat => chat.id === selectedChat.id);
        if (updatedSelectedChat) {
          setSelectedChat(updatedSelectedChat);
        }
        
        return updatedChats;
      });
    }

    // Reset termination state if previously terminated
    if (isTerminated) {
      setIsTerminated(false);
    }

    // Check for termination command
    if (currentInput.toLowerCase() === CHAT_CONSTANTS.TERMINATE_COMMAND) {
      setIsTerminated(true);
      await clearTerminatedChat(selectedChat.id);
      return;
    }

    // Start new chain for user message
    const newChainId = Date.now().toString();
    setActiveChats(prev => {
      const updatedChats = prev.map(chat => 
        chat.id === selectedChat.id 
          ? { ...chat, chainId: newChainId, chainLength: 0 }
          : chat
      );
      
      // Update selectedChat if it exists
      const updatedSelectedChat = updatedChats.find(chat => chat.id === selectedChat.id);
      if (updatedSelectedChat) {
        setSelectedChat(updatedSelectedChat);
      }
      
      return updatedChats;
    });

    // Create the message object
    const userMessage: GroupMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: currentInput,
      characterId: selectedChat.type === 'individual' ? selectedChat.id : undefined,
      showId: selectedChat.type === 'group' ? selectedChat.id : undefined,
      timestamp: new Date(Date.now())
    };

    // Update chat with new message immediately
    setActiveChats(prev => {
      const updatedChats = prev.map(chat => 
        chat.id === selectedChat.id 
          ? {
              ...chat,
              lastMessage: currentInput,
              timestamp: new Date(),
              messages: [...chat.messages, userMessage]
            }
          : chat
      );
      
      // Update selectedChat if it exists
      const updatedSelectedChat = updatedChats.find(chat => chat.id === selectedChat.id);
      if (updatedSelectedChat) {
        setSelectedChat(updatedSelectedChat);
      }
      
      return updatedChats;
    });

    try {
      // Send to API - using the same message object for consistency
      setIsGeneratingResponse(true);
      await append({
        id: userMessage.id,
        role: 'user',
        content: userMessage.content,
        createdAt: userMessage.timestamp
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setIsGeneratingResponse(false);
    }
  };

  const startNewChat = (character: Character) => {
    const newChat: Chat = {
      id: character.id,
      type: 'individual',
      name: character.name,
      avatar: character.avatar,
      timestamp: new Date(),
      messages: [] as GroupMessage[],
      chainLength: 0
    };
    setActiveChats(prev => [...prev, newChat]);
    setSelectedChat(newChat);
    setShowNewChat(false);
  };

  const startNewGroupChat = (show: typeof shows[keyof typeof shows]) => {
    const newChat: Chat = {
      id: show.id,
      type: 'group',
      name: show.name,
      avatar: show.image || show.name.charAt(0),
      members: show.characters,
      timestamp: new Date(),
      messages: [] as GroupMessage[],
      chainLength: 0
    };
    setActiveChats(prev => [...prev, newChat]);
    setSelectedChat(newChat);
    setShowNewChat(false);
  };

  const handleInputWithMention = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setCursorPosition(cursorPos);
    handleInputChange(e);

    // Only show character suggestions in group chats
    if (selectedChat?.type === 'group') {
      const beforeCursor = value.slice(0, cursorPos);
      const mentionMatch = beforeCursor.match(/@(\w*)$/);
      
      if (mentionMatch) {
        const searchTerm = mentionMatch[1].toLowerCase();
        const availableCharacters = selectedChat.members || [];
        
        const suggestions = availableCharacters.filter(char => 
          char.name.toLowerCase().includes(searchTerm) || 
          char.role.toLowerCase().includes(searchTerm)
        );
        setCharacterSuggestions(suggestions);
        setShowCharacterSuggestions(true);
      } else {
        setShowCharacterSuggestions(false);
      }
    }
  };

  const insertCharacterMention = (characterId: string) => {
    // Only allow character mentions in group chats
    if (selectedChat?.type !== 'group') return;

    const beforeMention = input.slice(0, cursorPosition).replace(/@\w*$/, '');
    const afterMention = input.slice(cursorPosition);
    const newValue = `${beforeMention}@${characterId}${afterMention}`;
    handleInputChange({ target: { value: newValue } } as React.ChangeEvent<HTMLInputElement>);
    setShowCharacterSuggestions(false);
  };

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] bg-[#f0f2f5]">
      {/* Chat List Panel */}
      <div className="w-full max-w-md bg-white border-r border-gray-200 flex flex-col min-w-[320px]">
        {/* Header */}
        <div className="bg-[#f0f2f5] px-4 py-2 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#dfe5e7] flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6 text-[#8696a0]">
                <path fill="currentColor" d="M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM6 8a6 6 0 1 1 12 0A6 6 0 0 1 6 8zm2 10a3 3 0 0 0-3 3 1 1 0 1 1-2 0 5 5 0 0 1 5-5h8a5 5 0 0 1 5 5 1 1 0 1 1-2 0 3 3 0 0 0-3-3H8z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-[#111b21]">WhatsApp</h1>
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
                    onClick={async () => {
                      if (window.confirm('Are you sure you want to clear all chats? This cannot be undone.')) {
                        await clearAllChats();
                        setShowMenu(false);
                      }
                    }}
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
              // New Chat View
              <motion.div
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                className="flex flex-col h-full"
              >
                {/* New Chat Header */}
                <div className="bg-[#008069] px-4 py-3 flex items-center gap-6 flex-shrink-0">
                  <button
                    onClick={() => setShowNewChat(false)}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-white" />
                  </button>
                  <h2 className="text-white font-semibold">New Chat</h2>
                </div>

                {/* Available Characters - Scrollable */}
                <div className="flex-1 overflow-y-auto">
                  <div className="py-3 space-y-1">
                    <div className="px-4 py-2 text-sm font-medium text-[#008069]">Individual Chats</div>
                    {getAllCharacters().map((character) => (
                      <div
                        key={character.id}
                        onClick={() => startNewChat(character)}
                        className="px-3 py-2 flex items-center gap-3 hover:bg-[#f0f2f5] cursor-pointer"
                      >
                        <div className="w-12 h-12 rounded-full bg-[#00a884] flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-lg">{character.avatar}</span>
                        </div>
                        <div>
                          <div className="font-medium text-[#111b21]">{character.name}</div>
                          <div className="text-sm text-[#667781]">{character.role}</div>
                        </div>
                      </div>
                    ))}

                    {/* Available Groups */}
                    <div className="px-4 py-2 text-sm font-medium text-[#008069] mt-4">Group Chats</div>
                    {Object.values(shows).map((show) => (
                      <div
                        key={show.id}
                        onClick={() => startNewGroupChat(show)}
                        className="px-3 py-2 flex items-center gap-3 hover:bg-[#f0f2f5] cursor-pointer"
                      >
                        <div className="w-12 h-12 rounded-lg bg-[#00a884] flex items-center justify-center flex-shrink-0">
                          {show.image ? (
                            <img src={show.image} alt={show.name} className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <span className="text-white text-lg">{show.name.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-[#111b21]">{show.name}</div>
                          <div className="text-sm text-[#667781] flex items-center gap-1">
                            <span>{show.characters.length} participants</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              // Active Chats View
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 overflow-y-auto py-2"
              >
                {activeChats.length > 0 ? (
                  activeChats.map((chat) => (
                    <div
                      key={chat.id}
                      onClick={() => setSelectedChat(chat)}
                      className={`px-3 py-3 flex items-center gap-3 hover:bg-[#f0f2f5] cursor-pointer border-b border-[#e9edef] last:border-0 ${
                        selectedChat?.id === chat.id ? 'bg-[#f0f2f5]' : ''
                      }`}
                    >
                      <div className={`w-12 h-12 ${chat.type === 'group' ? 'rounded-lg' : 'rounded-full'} bg-[#00a884] flex items-center justify-center flex-shrink-0`}>
                        {typeof chat.avatar === 'string' && chat.avatar.startsWith('http') ? (
                          <img src={chat.avatar} alt={chat.name} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <span className="text-white text-lg">{chat.avatar}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-[#111b21] truncate">{chat.name}</div>
                          {chat.timestamp && (
                            <div className="text-xs text-[#667781]">
                              {chat.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

      {/* Chat Panel */}
      {selectedChat ? (
        <div className="flex-1 flex flex-col bg-[#efeae2] relative">
          {/* Chat Header */}
          <div className="bg-[#f0f2f5] px-4 py-2 flex items-center gap-3 shadow-sm z-10">
            <div className={`w-10 h-10 ${selectedChat.type === 'group' ? 'rounded-lg' : 'rounded-full'} bg-[#00a884] flex items-center justify-center flex-shrink-0`}>
              {typeof selectedChat.avatar === 'string' && selectedChat.avatar.startsWith('http') ? (
                <img src={selectedChat.avatar} alt={selectedChat.name} className="w-full h-full object-cover rounded-lg" />
              ) : (
                <span className="text-white text-lg">{selectedChat.avatar}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-[#111b21] truncate">{selectedChat.name}</div>
              {isLoading ? (
                <div className="text-xs text-[#667781]">
                  {selectedChat.type === 'group' ? (
                    (() => {
                      const lastMessage = selectedChat.messages[selectedChat.messages.length - 1];
                      const mentionMatch = lastMessage?.content.match(/@([\w-]+)/);
                      const typingCharacterId = mentionMatch ? mentionMatch[1] : null;
                      const typingCharacter = typingCharacterId ? getCharacterById(typingCharacterId) : null;
                      return typingCharacter ? `${typingCharacter.name} is typing...` : 'typing...';
                    })()
                  ) : (
                    'typing...'
                  )}
                </div>
              ) : selectedChat.type === 'group' ? (
                <div className="text-xs text-[#667781]">
                  {selectedChat.members?.length} participants
                </div>
              ) : null}
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 relative">
            {/* Chat background pattern */}
            <div 
              className="fixed inset-0 opacity-40" 
              style={{ 
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23666666' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
                backgroundAttachment: 'fixed',
                pointerEvents: 'none',
                zIndex: 0
              }} 
            />
            
            {/* Messages */}
            <div className="relative z-10 space-y-1">
              {selectedChat.messages.map((message, i) => {
                const showAvatar = message.role === 'assistant' && 
                  selectedChat.type === 'group' && (
                    i === 0 || 
                    selectedChat.messages[i - 1]?.role !== 'assistant'
                  );
                const isConsecutive = i > 0 && selectedChat.messages[i - 1]?.role === message.role;
                
                return (
                  <div
                    key={i}
                    className={`flex items-end ${message.role === 'user' ? 'justify-end' : 'justify-start'} 
                      ${isConsecutive ? 'mt-0.5' : 'mt-2'}
                      ${selectedChat.type === 'group' ? 'gap-2' : 'gap-0'}`}
                  >
                    {/* Profile picture for assistant - only in group chats */}
                    {showAvatar && (
                      <div className="w-8 h-8 rounded-full bg-[#00a884] flex-shrink-0 flex items-center justify-center shadow-sm">
                        {message.characterId && (() => {
                          const character = getCharacterById(message.characterId);
                          return character ? (
                            <div className="text-white text-sm">{character.avatar}</div>
                          ) : null;
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
                      <div className="text-sm text-[#111b21] whitespace-pre-wrap">{message.content}</div>

                      {/* Message time */}
                      <div className="text-[0.65rem] text-[#667781] text-right mt-1">
                        {new Date(message.timestamp || Date.now()).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>

                    {/* Profile picture for user - only in group chats */}
                    {message.role === 'user' && !isConsecutive && selectedChat.type === 'group' && (
                      <div className="w-8 h-8 rounded-full bg-[#dfe5e7] flex-shrink-0 flex items-center justify-center shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 text-[#8696a0]">
                          <path fill="currentColor" d="M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM6 8a6 6 0 1 1 12 0A6 6 0 0 1 6 8zm2 10a3 3 0 0 0-3 3 1 1 0 1 1-2 0 5 5 0 0 1 5-5h8a5 5 0 0 1 5 5 1 1 0 1 1-2 0 3 3 0 0 0-3-3H8z"/>
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Message Input */}
          <div className="bg-[#f0f2f5] px-4 py-3 relative z-20 shadow-sm">
            <div className="relative">
              <VisualInput
                value={input}
                onChange={handleInputWithMention}
                onSubmit={handleSubmit}
                contextMessage={contextMessage}
                onClearContext={() => setContextMessage(null)}
              />
              
              {/* Character suggestions */}
              {showCharacterSuggestions && characterSuggestions.length > 0 && (
                <div className="absolute bottom-full left-0 mb-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  {characterSuggestions.map((char) => (
                    <div
                      key={char.id}
                      onClick={() => insertCharacterMention(char.id)}
                      className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-2"
                    >
                      <div className="text-lg">{char.avatar}</div>
                      <div>
                        <div className="text-sm font-medium">{char.name}</div>
                        <div className="text-xs text-gray-500">{char.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        // Empty state when no chat is selected
        <div className="flex-1 flex items-center justify-center bg-[#f0f2f5]">
          <div className="text-center text-[#41525d]">
            <div className="text-3xl mb-2">👋</div>
            <h3 className="text-xl font-light mb-1">Welcome to WhatsApp</h3>
            <p className="text-sm">Select a chat to start messaging</p>
          </div>
        </div>
      )}
    </div>
  );
} 