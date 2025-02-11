'use client';

import { useChat } from 'ai/react';
import { useState, useEffect } from 'react';
import type { ModelType, ContextMessage, Group, GroupMessage } from '../types/chat';
import type { Character } from '../types';
import { ModelSelector } from './ModelSelector';
import { VisualInput } from './VisualInput';
import { extractOptions, downloadSVG } from '../utils/svg';
import { OptionGrid } from './logo/OptionGrid';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Users, ArrowLeft } from 'lucide-react';
import { CreateGroupModal } from './CreateGroupModal';
import { shows, getAllCharacters, getCharacterById, getShowById } from '../config';
import { CHAT_CONSTANTS } from '../backend/chat/types';

const AVAILABLE_MODELS: { id: ModelType; name: string }[] = [
  { id: 'gpt-4o-mini', name: 'GPT-4 Optimized Mini' },
  { id: 'gpt-4o', name: 'GPT-4 Optimized' },
  { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet' },
];

export default function ChatComponent() {
  const [activeShow, setActiveShow] = useState<string | null>(null);
  const [activeCharacters, setActiveCharacters] = useState<Set<string>>(new Set());
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [contextMessage, setContextMessage] = useState<ContextMessage | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isGeneratingLogos, setIsGeneratingLogos] = useState(false);
  const [numOptionsDetected, setNumOptionsDetected] = useState(0);
  const [isStreamingOptions, setIsStreamingOptions] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);
  const [mentionedCharacter, setMentionedCharacter] = useState<string | null>(null);
  const [showCharacterSuggestions, setShowCharacterSuggestions] = useState(false);
  const [characterSuggestions, setCharacterSuggestions] = useState<ReturnType<typeof getAllCharacters>>([]);
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  const [localMessages, setLocalMessages] = useState<GroupMessage[]>([]);
  const [isTerminated, setIsTerminated] = useState(false);
  const [lastResponseTime, setLastResponseTime] = useState<number | null>(null);
  const [chainLength, setChainLength] = useState(0);
  const [chainId, setChainId] = useState<string | null>(null);
  const [lastSpeakingCharacter, setLastSpeakingCharacter] = useState<string | null>(null);

  const currentShow = activeShow ? getShowById(activeShow) : null;
  const currentCharacter = mentionedCharacter ? getCharacterById(mentionedCharacter) : null;

  const { messages: aiMessages, input, handleInputChange, handleSubmit: originalHandleSubmit, isLoading, append } = useChat({
    api: `/api/chat?model=${currentCharacter?.baseModel || 'gpt-4o-mini'}`,
    onResponse: () => {
      setContextMessage(null);
      setIsGeneratingLogos(false);
      setIsStreamingOptions(false);
      setLastResponseTime(Date.now());
    },
    onFinish: async (message) => {
      // Check for termination
      if (message.content.includes("Chat terminated")) {
        setIsTerminated(true);
        setChainLength(0);
        setChainId(null);
        setLastResponseTime(null);
        setLocalMessages([]);
        return;
      }

      // Extract character name from response format [Character Name] Message
      const characterMatch = message.content.match(/^\[([\w\s-]+)\]/);
      const characterName = characterMatch ? characterMatch[1].trim() : null;
      const character = characterName ? getAllCharacters().find(c => c.name === characterName) : null;
      const cleanContent = characterMatch 
        ? message.content.replace(/^\[[\w\s-]+\]\s*/, '')
        : message.content;

      const messageWithCharacter = {
        ...message,
        content: cleanContent,
        characterId: character?.id || null,
        showId: activeShow,
        timestamp: Date.now(),
        chainId
      } as GroupMessage;
      setLocalMessages(prev => [...prev, messageWithCharacter]);

      // Check for @ mentions in the assistant's response
      const mentions = Array.from(cleanContent.matchAll(/@([\w-]+)/g));
      if (mentions.length > 0 && chainLength < CHAT_CONSTANTS.MAX_CHAIN_LENGTH) {
        // Get the last mentioned character
        const lastMention = mentions[mentions.length - 1][1];
        const mentionedCharacter = getCharacterById(lastMention);
        
        if (mentionedCharacter) {
          // Increment chain length
          const newChainLength = chainLength + 1;
          setChainLength(newChainLength);
          
          if (newChainLength < CHAT_CONSTANTS.MAX_CHAIN_LENGTH) {
            // Add a delay before the next response
            await new Promise(resolve => setTimeout(resolve, CHAT_CONSTANTS.MIN_ASSISTANT_DELAY_MS));
            
            // Trigger a new message from the mentioned character
            const userMessage = {
              role: 'user',
              content: `@${lastMention} ${cleanContent}`,
              timestamp: Date.now(),
              chainId: chainId || Date.now().toString()
            };
            await append(userMessage);
          }
        }
      } else {
        // Reset chain when no mentions
        setChainLength(0);
        setChainId(null);
      }

      // Update last speaking character
      if (character?.id) {
        setLastSpeakingCharacter(character.id);
      }
    }
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Reset termination state if previously terminated
    if (isTerminated) {
      setIsTerminated(false);
    }

    // Check for termination command
    if (input.toLowerCase() === CHAT_CONSTANTS.TERMINATE_COMMAND) {
      setIsTerminated(true);
      setChainLength(0);
      setChainId(null);
      setLastResponseTime(null);
      setLocalMessages([]);
      return;
    }

    // Start new chain for user message
    const newChainId = Date.now().toString();
    setChainId(newChainId);
    setChainLength(0);

    let messageContent = input;
    let targetCharacterId = mentionedCharacter;

    // Check for explicit @mentions
    const mentionMatch = input.match(/@([\w-]+)/);
    
    // If no explicit mention but we have a last speaking character, use them
    if (!mentionMatch && lastSpeakingCharacter) {
      messageContent = `@${lastSpeakingCharacter} ${input}`;
      targetCharacterId = lastSpeakingCharacter;
    }

    // Add user message to local messages first
    const userMessage: GroupMessage = {
      role: 'user',
      content: messageContent,
      characterId: targetCharacterId,
      showId: activeShow,
      timestamp: Date.now(),
      chainId: newChainId
    };
    setLocalMessages(prev => [...prev, userMessage]);
    
    // Update input field
    handleInputChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>);

    // Then send to API
    const apiMessage = {
      id: userMessage.id,
      role: 'user' as const,
      content: messageContent,
      createdAt: new Date()
    };
    
    await append(apiMessage);
  };

  const handleInputWithMention = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setCursorPosition(cursorPos);
    handleInputChange(e);

    // Check for @character mentions
    const beforeCursor = value.slice(0, cursorPos);
    const mentionMatch = beforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      const searchTerm = mentionMatch[1].toLowerCase();
      const availableCharacters = currentShow 
        ? currentShow.characters.map(char => ({
            ...char,
            showId: currentShow.id,
            showName: currentShow.name
          }))
        : getAllCharacters();
      
      const suggestions = availableCharacters.filter(char => 
        char.name.toLowerCase().includes(searchTerm) || 
        char.role.toLowerCase().includes(searchTerm)
      );
      setCharacterSuggestions(suggestions);
      setShowCharacterSuggestions(true);
    } else {
      setShowCharacterSuggestions(false);
    }

    // Check for complete mentions - updated to handle hyphenated IDs
    const completeMentionMatches = Array.from(value.matchAll(/@([\w-]+)/g));
    if (completeMentionMatches.length > 0) {
      const newActiveCharacters = new Set<string>();
      completeMentionMatches.forEach(match => {
        const character = getAllCharacters().find(char => char.id === match[1]);
        if (character?.id) {
          newActiveCharacters.add(character.id);
        }
      });
      setActiveCharacters(newActiveCharacters);
      // Set the last mentioned character as the primary one for the message
      const lastMention = completeMentionMatches[completeMentionMatches.length - 1];
      const lastCharacter = getAllCharacters().find(char => char.id === lastMention[1]);
      if (lastCharacter?.id) {
        setMentionedCharacter(lastCharacter.id);
      }
    }
  };

  const insertCharacterMention = (characterId: string) => {
    const beforeMention = input.slice(0, cursorPosition).replace(/@\w*$/, '');
    const afterMention = input.slice(cursorPosition);
    const newValue = `${beforeMention}@${characterId}${afterMention}`;
    handleInputChange({ target: { value: newValue } } as React.ChangeEvent<HTMLInputElement>);
    setShowCharacterSuggestions(false);
    setMentionedCharacter(characterId);
  };

  const formatMessageContent = (content: string, isIterationResponse: boolean) => {
    const options = extractOptions(content);
    if (options.length > 0) {
      return null; // Return null so we can handle logo grid separately
    }

    return (
      <div className="prose prose-sm max-w-none">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
      </div>
    );
  };

  // Update the message display to show character names
  const getMessageSender = (message: GroupMessage) => {
    if (message.role === 'user') return 'You';
    
    const character = message.characterId ? getCharacterById(message.characterId) : undefined;
    if (!character) return 'Assistant';
    
    return `${character.name} (${character.role})`;
  };

  // When a show is selected, keep its characters active
  useEffect(() => {
    if (activeShow) {
      const showCharacters = getShowById(activeShow)?.characters || [];
      setActiveCharacters(new Set(showCharacters.map((char: Character) => char.id)));
    } else {
      setActiveCharacters(new Set());
    }
  }, [activeShow]);

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] bg-[#efeae2]">
      {/* Sidebar */}
      <div className={`
        w-80 bg-white border-r border-gray-200 flex flex-col
        ${isSidebarOpen ? 'block' : 'hidden'}
      `}>
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">TV Show Chats</h1>
            <p className="text-sm text-gray-500">Chat with your favorite characters</p>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {Object.values(shows).map(show => (
            <div
              key={show.id}
              onClick={() => setActiveShow(show.id)}
              className={`
                p-3 rounded-lg cursor-pointer transition-colors
                ${activeShow === show.id ? 'bg-[#e7f8f5]' : 'hover:bg-gray-50'}
              `}
            >
              <div className="flex items-center gap-3">
                {show.image ? (
                  <img
                    src={show.image}
                    alt={show.name}
                    className="w-12 h-12 rounded-lg object-contain bg-white p-1"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-[#00a884] flex items-center justify-center">
                    <span className="text-white text-xl font-semibold">
                      {show.name.charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-gray-800">{show.name}</h3>
                  <p className="text-sm text-gray-500">{show.description}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {show.characters.map(char => (
                      <span
                        key={char.id}
                        className="text-xs px-1.5 py-0.5 bg-[#e7f8f5] text-[#00a884] rounded flex items-center gap-1"
                      >
                        <span>{char.avatar}</span>
                        <span>{char.name}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat header */}
        <div className="bg-[#f0f2f5] px-3 py-2 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-3">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 hover:bg-black/5 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-[#54656f]" />
              </button>
            )}
            {currentShow ? (
              <div className="flex items-center gap-3">
                {currentShow.image ? (
                  <img
                    src={currentShow.image}
                    alt={currentShow.name}
                    className="w-10 h-10 rounded-lg object-contain bg-white p-1"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-[#00a884] flex items-center justify-center">
                    <span className="text-white text-lg font-semibold">
                      {currentShow.name.charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  <h2 className="font-semibold text-[#111b21]">{currentShow.name}</h2>
                  {isLoading ? (
                    <div className="text-xs text-[#667781]">
                      {(() => {
                        const lastMessage = localMessages[localMessages.length - 1];
                        const mentionMatch = lastMessage?.content.match(/@([\w-]+)/);
                        const loadingCharacterId = mentionMatch ? mentionMatch[1] : null;
                        const loadingCharacter = loadingCharacterId ? getCharacterById(loadingCharacterId) : null;
                        return loadingCharacter ? `${loadingCharacter.name} is typing...` : '';
                      })()}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">
                      Use @ to mention a character
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-lg font-semibold text-gray-800">
                Select a TV Show to start chatting
              </div>
            )}
          </div>
        </div>
        
        {/* Group list or chat messages */}
        <div className="flex-1 overflow-y-auto space-y-1 p-2" style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23ffffff' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          backgroundAttachment: 'fixed'
        }}>
          {!currentShow ? (
            // Show group list
            <div className="grid grid-cols-1 gap-2">
              {Object.values(shows).map(show => (
                <motion.div
                  key={show.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-lg p-3 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setActiveShow(show.id)}
                >
                  <div className="flex items-center gap-3">
                    {show.image ? (
                      <img
                        src={show.image}
                        alt={show.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[#00a884] flex items-center justify-center">
                        <span className="text-white text-xl font-semibold">
                          {show.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-[#111b21]">{show.name}</h3>
                      {show.description && (
                        <p className="text-sm text-gray-500 line-clamp-1">{show.description}</p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1">
                        {show.characters.map(char => (
                          <span
                            key={char.id}
                            className="text-xs px-1.5 py-0.5 bg-[#e7f8f5] text-[#00a884] rounded"
                          >
                            {char.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            // Show chat messages
            <AnimatePresence mode="wait">
              {localMessages.map((message, i) => {
                const options = message.role === 'assistant' ? extractOptions(message.content) : [];
                const hasOptions = options.length > 0;
                const modelName = message.role === 'assistant' && message.characterId ? 
                  AVAILABLE_MODELS.find(m => m.id === message.characterId)?.name :
                  undefined;
                const groupMessage = message as GroupMessage;
                
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {/* Regular message */}
                    {(!hasOptions || message.role === 'user') && (
                      <div className={`flex items-end gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {/* Profile picture for assistant */}
                        {message.role === 'assistant' && (
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
                            group relative max-w-[90%] md:max-w-[75%] lg:max-w-[65%]
                            ${message.role === 'user'
                              ? 'bg-[#d9fdd3] ml-auto'
                              : 'bg-white'
                            }
                            px-3 py-2 rounded-lg shadow-sm
                          `}
                        >
                          {/* Message tail */}
                          <div
                            className={`absolute top-0 w-3 h-3 overflow-hidden
                              ${message.role === 'user' ? '-right-1.5' : '-left-1.5'}`}
                          >
                            <div className={`w-4 h-4 transform rotate-45 
                              ${message.role === 'user' ? 'bg-[#d9fdd3]' : 'bg-white'}
                              ${message.role === 'user' ? '-translate-x-1/2' : 'translate-x-1/2'}`}
                            />
                          </div>

                          {/* Sender name */}
                          <div className={`text-xs font-medium mb-0.5 ${
                            message.role === 'user' 
                              ? 'text-[#1fa855]' 
                              : 'text-[#53bdeb]'
                          }`}>
                            {getMessageSender(message)}
                          </div>

                          {/* Message content */}
                          {formatMessageContent(message.content, false)}

                          {/* Message actions and time */}
                          <div className="flex items-center justify-between mt-0.5">
                            {message.role === 'assistant' && (
                              <div className="relative group/tooltip">
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(message.content);
                                    setCopiedMessageId(i);
                                    setTimeout(() => setCopiedMessageId(null), 2000);
                                  }}
                                  className="p-0.5 hover:bg-black/5 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  {copiedMessageId === i ? (
                                    <Check className="w-3.5 h-3.5 text-[#8696a0]" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5 text-[#8696a0]" />
                                  )}
                                </button>
                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none">
                                  {copiedMessageId === i ? 'Copied!' : 'Copy message'}
                                </span>
                              </div>
                            )}

                            <div className={`text-[0.65rem] text-gray-500 ${message.role === 'user' ? 'text-[#667781]' : ''}`}>
                              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>

                        {/* Profile picture for user */}
                        {message.role === 'user' && (
                          <div className="w-8 h-8 rounded-full bg-[#dfe5e7] flex-shrink-0 flex items-center justify-center shadow-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 text-[#8696a0]">
                              <path fill="currentColor" d="M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM6 8a6 6 0 1 1 12 0A6 6 0 0 1 6 8zm2 10a3 3 0 0 0-3 3 1 1 0 1 1-2 0 5 5 0 0 1 5-5h8a5 5 0 0 1 5 5 1 1 0 1 1-2 0 3 3 0 0 0-3-3H8z"/>
                            </svg>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Logo options grid - outside message bubble */}
                    {hasOptions && message.role === 'assistant' && (
                      <div className="flex justify-start w-full">
                        <div className="w-[70%]">
                          <OptionGrid
                            options={options}
                            onSelect={(index) => {
                              setSelectedMessageId(i);
                              setSelectedOption(index);
                              setIsEditing(true);
                              setContextMessage({ 
                                type: 'option', 
                                optionNumber: index + 1, 
                                svg: options[index].svg 
                              });
                            }}
                            onDownload={downloadSVG}
                            enableSelection={false}
                            selectedIndex={selectedMessageId === i && selectedOption !== null ? selectedOption : undefined}
                          />
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
        
        {/* Input area */}
        <div className="bg-[#f0f2f5] px-3 py-2 shadow-sm z-10">
          <div className="relative">
            <VisualInput
              value={input}
              onChange={handleInputWithMention}
              onSubmit={handleSubmit}
              contextMessage={contextMessage}
              onClearContext={() => {
                setContextMessage(null);
                setSelectedOption(null);
                setIsEditing(false);
              }}
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
            
            {/* Show who will respond - either mentioned character or last speaking character */}
            {(mentionedCharacter || lastSpeakingCharacter) && (
              <div className="text-xs text-[#00a884] mt-1 ml-1">
                Talking to {getCharacterById(mentionedCharacter || lastSpeakingCharacter)?.name}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add terminated state indicator */}
      {isTerminated && (
        <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm">
          Chat Terminated
        </div>
      )}
    </div>
  );
} 