import { useState, useEffect, useCallback } from 'react';
import localforage from 'localforage';
import type { Chat } from '../types/chat';
import type { Character } from '../types';
import { shows } from '../config';

// Initialize localforage
localforage.config({
  name: 'ash-chat',
  storeName: 'chats'
});

export function useChats() {
  const [activeChats, setActiveChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
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

  // Keep selectedChat in sync with activeChats
  useEffect(() => {
    if (selectedChat) {
      const updatedChat = activeChats.find(chat => chat.id === selectedChat.id);
      if (updatedChat && JSON.stringify(updatedChat) !== JSON.stringify(selectedChat)) {
        setSelectedChat(updatedChat);
      }
    }
  }, [activeChats, selectedChat]);

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
    
    const timeoutId = setTimeout(saveChats, 500); // Debounce saves
    return () => clearTimeout(timeoutId);
  }, [activeChats, selectedChat]);

  const selectChat = useCallback((chatId: string) => {
    const chat = activeChats.find(c => c.id === chatId);
    if (chat) {
      // Create a deep copy of the chat to ensure all updates are caught
      const chatCopy = {
        ...chat,
        messages: chat.messages.map(msg => ({...msg}))
      };
      setSelectedChat(chatCopy);
    }
  }, [activeChats]);

  const createNewChat = useCallback((character: Character) => {
    const newChat: Chat = {
      id: character.id,
      type: 'individual',
      name: character.name,
      avatar: character.avatar,
      timestamp: new Date(),
      messages: [],
      chainLength: 0
    };
    
    setActiveChats(prev => [...prev, newChat]);
    setSelectedChat({...newChat}); // Create new reference
    return newChat;
  }, []);

  const createNewGroupChat = useCallback((show: typeof shows[keyof typeof shows]) => {
    const newChat: Chat = {
      id: show.id,
      type: 'group',
      name: show.name,
      avatar: show.image || show.name.charAt(0),
      members: show.characters,
      timestamp: new Date(),
      messages: [{
        id: Date.now().toString(),
        role: 'assistant',
        content: `Welcome to ${show.name} group chat! 👋\n\nTo interact with characters, use @mentions in your messages. For example:\n• Type @ to see available characters\n• Use @charactername to address specific characters\n\nCharacters will respond when mentioned and may also interact with each other naturally in the conversation.`,
        timestamp: new Date(),
        showId: show.id
      }],
      chainLength: 0
    };
    
    setActiveChats(prev => [...prev, newChat]);
    setSelectedChat({...newChat}); // Create new reference
    return newChat;
  }, []);

  const clearTerminatedChat = useCallback(async (chatId: string) => {
    setActiveChats(prev => prev.map(chat => 
      chat.id === chatId 
        ? { ...chat, chainLength: 0, chainId: undefined, messages: [] }
        : chat
    ));
    
    if (selectedChat?.id === chatId) {
      setSelectedChat(prev => prev ? { 
        ...prev, 
        chainLength: 0, 
        chainId: undefined, 
        messages: [] 
      } : null);
    }
  }, [selectedChat]);

  const clearAllChats = useCallback(async () => {
    setActiveChats([]);
    setSelectedChat(null);
    await localforage.clear();
  }, []);

  const updateChat = useCallback((chatId: string, updates: Partial<Chat>) => {
    setActiveChats(prev => {
      const newChats = prev.map(chat => {
        if (chat.id === chatId) {
          const updatedChat = { ...chat, ...updates };
          // If this is the selected chat, update it immediately
          if (selectedChat?.id === chatId) {
            // Update selected chat synchronously
            setSelectedChat(updatedChat);
          }
          return updatedChat;
        }
        return chat;
      });
      return newChats;
    });
  }, [selectedChat]);

  return {
    activeChats,
    selectedChat,
    isSaving,
    selectChat,
    createNewChat,
    createNewGroupChat,
    clearTerminatedChat,
    clearAllChats,
    updateChat
  };
} 