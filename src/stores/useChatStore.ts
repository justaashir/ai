import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Chat, GroupMessage } from '../types/chat';
import type { Character } from '../types';
import { shows } from '../config';

interface ChatState {
  activeChats: Chat[];
  selectedChat: Chat | null;
  isSaving: boolean;
  isGeneratingResponse: boolean;
  lastMessageSender: string | null;
  
  // Actions
  selectChat: (chatId: string) => void;
  createNewChat: (character: Character) => Chat;
  createNewGroupChat: (show: typeof shows[keyof typeof shows]) => Chat;
  clearTerminatedChat: (chatId: string) => void;
  clearAllChats: () => void;
  updateChat: (chatId: string, updates: Partial<Chat>) => void;
  setGeneratingResponse: (isGenerating: boolean) => void;
  setLastMessageSender: (sender: string | null) => void;
  addMessage: (chatId: string, message: GroupMessage) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      activeChats: [],
      selectedChat: null,
      isSaving: false,
      isGeneratingResponse: false,
      lastMessageSender: null,

      selectChat: (chatId) => {
        const chat = get().activeChats.find(c => c.id === chatId);
        if (chat) {
          set({ selectedChat: { ...chat, messages: [...chat.messages] } });
        }
      },

      createNewChat: (character) => {
        const newChat: Chat = {
          id: character.id,
          type: 'individual',
          name: character.name,
          avatar: character.avatar,
          timestamp: new Date(),
          messages: [],
          chainLength: 0
        };
        
        set(state => ({
          activeChats: [...state.activeChats, newChat],
          selectedChat: { ...newChat }
        }));
        
        return newChat;
      },

      createNewGroupChat: (show) => {
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
        
        set(state => ({
          activeChats: [...state.activeChats, newChat],
          selectedChat: { ...newChat }
        }));
        
        return newChat;
      },

      clearTerminatedChat: (chatId) => {
        set(state => ({
          activeChats: state.activeChats.map(chat => 
            chat.id === chatId 
              ? { ...chat, chainLength: 0, chainId: undefined, messages: [] }
              : chat
          ),
          selectedChat: state.selectedChat?.id === chatId 
            ? { ...state.selectedChat, chainLength: 0, chainId: undefined, messages: [] }
            : state.selectedChat
        }));
      },

      clearAllChats: () => {
        set({ activeChats: [], selectedChat: null });
      },

      updateChat: (chatId, updates) => {
        set(state => {
          const newChats = state.activeChats.map(chat => 
            chat.id === chatId 
              ? { ...chat, ...updates }
              : chat
          );

          return {
            activeChats: newChats,
            selectedChat: state.selectedChat?.id === chatId 
              ? { ...state.selectedChat, ...updates }
              : state.selectedChat
          };
        });
      },

      setGeneratingResponse: (isGenerating) => {
        set({ isGeneratingResponse: isGenerating });
      },

      setLastMessageSender: (sender) => {
        set({ lastMessageSender: sender });
      },

      addMessage: (chatId, message) => {
        set(state => {
          const chat = state.activeChats.find(c => c.id === chatId);
          if (!chat) return state;

          const updatedChat = {
            ...chat,
            messages: [...chat.messages, message],
            lastMessage: message.content,
            timestamp: new Date(),
            lastSpeakingCharacter: message.characterId
          };

          return {
            activeChats: state.activeChats.map(c => 
              c.id === chatId ? updatedChat : c
            ),
            selectedChat: state.selectedChat?.id === chatId 
              ? updatedChat 
              : state.selectedChat
          };
        });
      }
    }),
    {
      name: 'chat-storage',
      partialize: (state) => ({
        activeChats: state.activeChats,
        selectedChat: state.selectedChat
      })
    }
  )
); 