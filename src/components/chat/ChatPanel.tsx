import { useState, useEffect } from 'react';
import { useChat } from 'ai/react';
import { motion } from 'framer-motion';
import type { Chat, GroupMessage, ContextMessage } from '../../types/chat';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { VisualInput } from '../VisualInput';
import { getCharacterById, getAllCharacters } from '../../config';
import { CHAT_CONSTANTS } from '../../backend/chat/types';
import { extractMentions } from '../../utils/chat';
import { useChatStore } from '../../stores/useChatStore';

interface ChatPanelProps {
  chat: Chat;
  isMobile: boolean;
  showChatList: boolean;
  onBackToList: () => void;
}

export function ChatPanel({
  chat,
  isMobile,
  showChatList,
  onBackToList,
}: ChatPanelProps) {
  const [contextMessage, setContextMessage] = useState<ContextMessage | null>(null);
  const [showCharacterSuggestions, setShowCharacterSuggestions] = useState(false);
  const [characterSuggestions, setCharacterSuggestions] = useState<ReturnType<typeof getCharacterById>[]>([]);
  const [cursorPosition, setCursorPosition] = useState<number>(0);

  const {
    isGeneratingResponse,
    lastMessageSender,
    setGeneratingResponse,
    setLastMessageSender,
    addMessage,
    updateChat
  } = useChatStore();

  const { messages: aiMessages, input, handleInputChange, handleSubmit: originalHandleSubmit, isLoading, append } = useChat({
    id: chat.id,
    api: `/api/chat?model=gpt-4o-mini${chat.type === 'group' ? '&show=' + chat.id : '&character=' + chat.id}`,
    onResponse: () => {
      setGeneratingResponse(true);
      // Update typing state based on the last message
      const lastMessage = chat.messages[chat.messages.length - 1];
      if (lastMessage && chat.type === 'group') {
        // For group chats, check @ mentions first
        const mentions = extractMentions(lastMessage.content);
        if (mentions.length > 0) {
          const lastMention = mentions[mentions.length - 1];
          const character = getCharacterById(lastMention);
          if (character) {
            setLastMessageSender(character.name);
          }
        } else {
          // If no mentions found in the message, use the character from the message
          const mentionedCharacter = lastMessage.characterId ? getCharacterById(lastMessage.characterId) : undefined;
          if (mentionedCharacter) {
            setLastMessageSender(mentionedCharacter.name);
          }
        }
      }
    },
    onFinish: async (message) => {
      setGeneratingResponse(false);
      setLastMessageSender(null);

      // Extract character name from response format [Character Name] Message
      const characterMatch = message.content.match(/^\[([\w\s-]+)\]/);
      const characterName = characterMatch ? characterMatch[1].trim() : null;
      const character = characterName ? getAllCharacters().find(char => char.name === characterName) : 
                     chat.type === 'individual' ? getCharacterById(chat.id) : null;
      const cleanContent = characterMatch 
        ? message.content.replace(/^\[[\w\s-]+\]\s*/, '')
        : message.content;

      const messageWithCharacter: GroupMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: cleanContent,
        characterId: character?.id || (chat.type === 'individual' ? chat.id : undefined),
        showId: chat.type === 'group' ? chat.id : undefined,
        timestamp: new Date()
      };

      // Add the message to the store
      addMessage(chat.id, messageWithCharacter);

      // Process @ mentions in group chats
      if (chat.type === 'group' && chat.chainLength < CHAT_CONSTANTS.MAX_CHAIN_LENGTH) {
        const mentions = extractMentions(cleanContent);
        if (mentions.length > 0) {
          const mentionedCharacterId = mentions[0];
          const mentionedCharacter = getCharacterById(mentionedCharacterId);
          
          if (mentionedCharacter && mentionedCharacter.id !== messageWithCharacter.characterId) {
            const newChainLength = chat.chainLength + 1;
            updateChat(chat.id, { chainLength: newChainLength });
            
            if (newChainLength < CHAT_CONSTANTS.MAX_CHAIN_LENGTH) {
              await new Promise(resolve => setTimeout(resolve, CHAT_CONSTANTS.MIN_ASSISTANT_DELAY_MS));
              setLastMessageSender(mentionedCharacter.name);
              
              const nextMessage = {
                id: Date.now().toString(),
                role: 'user' as const,
                content: `@${mentionedCharacterId} ${cleanContent}`,
                createdAt: new Date()
              };
              await append(nextMessage);
            }
          }
        }
      }
    }
  });

  // Handle input submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;

    const currentInput = input;
    handleInputChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>);

    let messageContent = currentInput;
    let targetCharacterId = undefined;

    if (chat.type === 'individual') {
      messageContent = currentInput;
      targetCharacterId = chat.id;
    } else if (chat.type === 'group') {
      // For group chats, check for @ mentions
      const mentions = extractMentions(currentInput);
      
      if (mentions.length > 0) {
        // Use explicitly mentioned character
        const mentionedCharacter = getCharacterById(mentions[0]);
        if (mentionedCharacter) {
          setLastMessageSender(mentionedCharacter.name);
          targetCharacterId = mentionedCharacter.id;
        }
      } else if (chat.lastSpeakingCharacter) {
        // If no mention but we have a last speaking character, use them
        const character = getCharacterById(chat.lastSpeakingCharacter);
        if (character) {
          messageContent = currentInput;
          setLastMessageSender(character.name);
          targetCharacterId = character.id;
        }
      } else if (chat.messages.filter(m => m.role === 'user').length === 0) {
        // If this is the first message, use the first character
        if (chat.members && chat.members.length > 0) {
          const firstCharacter = chat.members[0];
          messageContent = currentInput;
          setLastMessageSender(firstCharacter.name);
          targetCharacterId = firstCharacter.id;
        }
      }

      // Don't send if no target character was found
      if (!targetCharacterId) {
        setGeneratingResponse(false);
        return;
      }
    }

    // Create and add the user message
    const userMessage: GroupMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      characterId: targetCharacterId,
      showId: chat.type === 'group' ? chat.id : undefined,
      timestamp: new Date()
    };

    // Add message to the store first
    addMessage(chat.id, userMessage);

    try {
      setGeneratingResponse(true);
      
      // For the API, we need to add the @ mention even though we don't show it
      const apiMessageContent = chat.type === 'group' && targetCharacterId
        ? `@${targetCharacterId} ${messageContent}`
        : chat.type === 'individual'
          ? `@${chat.id} ${messageContent}`
          : messageContent;
      
      // Send to API
      await append({
        id: userMessage.id,
        role: 'user',
        content: apiMessageContent,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setGeneratingResponse(false);
    }
  };

  const handleInputWithMention = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setCursorPosition(cursorPos);
    handleInputChange(e);

    // Only show character suggestions in group chats
    if (chat?.type === 'group') {
      const beforeCursor = value.slice(0, cursorPos);
      const mentionMatch = beforeCursor.match(/@(\w*)$/);
      
      if (mentionMatch) {
        const searchTerm = mentionMatch[1].toLowerCase();
        const availableCharacters = chat.members || [];
        
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
    if (chat?.type !== 'group') return;

    const beforeMention = input.slice(0, cursorPosition).replace(/@\w*$/, '');
    const afterMention = input.slice(cursorPosition);
    const newValue = `${beforeMention}@${characterId}${afterMention}`;
    handleInputChange({ target: { value: newValue } } as React.ChangeEvent<HTMLInputElement>);
    setShowCharacterSuggestions(false);
  };

  if (!chat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f0f2f5]">
        <div className="text-center text-[#41525d] p-4 max-w-md">
          <div className="text-3xl mb-4">👋</div>
          <h3 className="text-xl font-light mb-3">Welcome to Ash Chat</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm mb-2">Start by selecting a chat or creating a new one:</p>
              <ul className="text-sm list-disc list-inside text-left space-y-1 bg-white/50 p-4 rounded-lg">
                <li>Choose <strong>Individual Chats</strong> for one-on-one conversations</li>
                <li>Select <strong>Group Chats</strong> to interact with multiple characters</li>
              </ul>
            </div>
            <div className="bg-[#dcf8c6] p-4 rounded-lg text-left">
              <p className="text-sm font-medium mb-2">💡 Group Chat Tips:</p>
              <ul className="text-sm list-disc list-inside space-y-1">
                <li>Type @ to mention specific characters</li>
                <li>Characters will respond when mentioned</li>
                <li>Watch characters interact with each other</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={isMobile ? { x: 320 } : false}
      animate={{ x: 0 }}
      exit={isMobile ? { x: 320 } : false}
      transition={{ type: 'tween', duration: 0.2 }}
      className="flex-1 flex flex-col bg-[#efeae2] relative h-full w-full"
    >
      <ChatHeader
        chat={chat}
        isMobile={isMobile}
        isLoading={isLoading}
        isGeneratingResponse={isGeneratingResponse}
        lastMessageSender={lastMessageSender}
        onBackToList={onBackToList}
      />

      <MessageList
        chat={chat}
        messages={chat.messages}
      />

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
                  <div className="w-8 h-8 rounded-full bg-[#00a884] flex items-center justify-center">
                    {char.avatar.startsWith('http') ? (
                      <img 
                        src={char.avatar} 
                        alt={char.name} 
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <span className="text-white text-sm">{char.name.charAt(0)}</span>
                    )}
                  </div>
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
    </motion.div>
  );
} 