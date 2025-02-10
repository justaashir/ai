'use client';

import { useChat } from 'ai/react';
import { useState, useEffect } from 'react';
import type { ModelType, ContextMessage, Group, GroupMessage } from '../types/chat';
import { ModelSelector } from './ModelSelector';
import { VisualInput } from './VisualInput';
import { extractOptions, downloadSVG } from '../utils/svg';
import { OptionGrid } from './logo/OptionGrid';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Users, ArrowLeft } from 'lucide-react';
import { CreateGroupModal } from './CreateGroupModal';

const AVAILABLE_MODELS: { id: ModelType; name: string }[] = [
  { id: 'gpt-4o-mini', name: 'GPT-4 Optimized Mini' },
  { id: 'gpt-4o', name: 'GPT-4 Optimized' },
  { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet' },
];

export default function ChatComponent() {
  const [currentModel, setCurrentModel] = useState<ModelType>('gpt-4o-mini');
  const [contextMessage, setContextMessage] = useState<ContextMessage | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isGeneratingLogos, setIsGeneratingLogos] = useState(false);
  const [numOptionsDetected, setNumOptionsDetected] = useState(0);
  const [isStreamingOptions, setIsStreamingOptions] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  
  // New state for group chat
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [mentionedModel, setMentionedModel] = useState<ModelType | null>(null);
  const [showModelSuggestions, setShowModelSuggestions] = useState(false);
  const [modelSuggestions, setModelSuggestions] = useState<typeof AVAILABLE_MODELS>([]);
  const [cursorPosition, setCursorPosition] = useState<number>(0);

  const [localMessages, setLocalMessages] = useState<GroupMessage[]>([]);

  const { messages: aiMessages, input, handleInputChange, handleSubmit, isLoading, append } = useChat({
    api: `/api/chat?model=${mentionedModel || currentModel}${activeGroup ? `&groupId=${activeGroup.id}` : ''}`,
    onResponse: (response) => {
      setContextMessage(null);
      setIsGeneratingLogos(false);
      setIsStreamingOptions(false);
      setMentionedModel(null);
      if (isGeneratingLogos) {
        const optionMatches = response.toString().match(/Option \d+:/g);
        const newNumOptions = optionMatches ? optionMatches.length : 0;
        
        if (newNumOptions > numOptionsDetected) {
          setNumOptionsDetected(newNumOptions);
          if (numOptionsDetected === 0 && newNumOptions === 1) {
            setIsStreamingOptions(true);
          }
          if (newNumOptions >= 3) {
            setIsStreamingOptions(false);
          }
        }
      }
    },
    onFinish: (message) => {
      const messageWithModel = {
        ...message,
        modelId: mentionedModel || currentModel
      } as GroupMessage;
      setLocalMessages(prev => [...prev, messageWithModel]);
    }
  });

  const handleCreateGroup = (name: string, description: string, model: ModelType, image?: File) => {
    // Create a new group
    const newGroup: Group = {
      id: Date.now().toString(), // In real app, this would come from the backend
      name,
      description,
      image: image ? URL.createObjectURL(image) : undefined,
      models: [model],
      createdAt: new Date()
    };
    
    setGroups(prev => [...prev, newGroup]);
    setActiveGroup(newGroup);
  };

  const handleInputWithMention = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setCursorPosition(cursorPos);
    handleInputChange(e);

    // Check for @model mentions
    const beforeCursor = value.slice(0, cursorPos);
    const mentionMatch = beforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      const searchTerm = mentionMatch[1].toLowerCase();
      const suggestions = AVAILABLE_MODELS.filter(model => 
        model.id.toLowerCase().includes(searchTerm) || 
        model.name.toLowerCase().includes(searchTerm)
      );
      setModelSuggestions(suggestions);
      setShowModelSuggestions(true);
    } else {
      setShowModelSuggestions(false);
    }

    // Check for complete mentions
    const completeMentionMatches = Array.from(value.matchAll(/@(gpt-4o-mini|gpt-4o|claude-3-sonnet)/g));
    if (completeMentionMatches.length > 0) {
      // Use the last mentioned model as the primary one
      const lastMention = completeMentionMatches[completeMentionMatches.length - 1];
      setMentionedModel(lastMention[1] as ModelType);
    } else {
      setMentionedModel(null);
    }
  };

  const insertModelMention = (model: ModelType) => {
    const beforeMention = input.slice(0, cursorPosition).replace(/@\w*$/, '');
    const afterMention = input.slice(cursorPosition);
    const newValue = `${beforeMention}@${model}${afterMention}`;
    handleInputChange({ target: { value: newValue } } as React.ChangeEvent<HTMLInputElement>);
    setShowModelSuggestions(false);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const inputValue = input.toLowerCase();
    setIsGeneratingLogos(inputValue.includes('logo') || inputValue.includes('design'));
    setNumOptionsDetected(0);
    setIsStreamingOptions(false);
    
    // Extract all model mentions
    const modelMentions = Array.from(input.matchAll(/@(gpt-4o-mini|gpt-4o|claude-3-sonnet)/g))
      .map(match => match[1] as ModelType);
    
    // If there are multiple models mentioned, create separate messages for each
    if (modelMentions.length > 1) {
      // Create user message for each model
      modelMentions.forEach(modelId => {
        append({
          role: 'user',
          content: input,
        }, {
          options: {
            body: {
              model: modelId
            }
          }
        });
      });
      
      // Clear input after sending
      handleInputChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>);
    } else {
      // Regular submission for single model
      handleSubmit(e);
    }
  };

  const handleOptionSelect = (messageId: number, index: number, options: { svg: string; description: string }[]) => {
    setSelectedMessageId(messageId);
    setSelectedOption(index);
    setIsEditing(true);
    setContextMessage({ 
      type: 'option', 
      optionNumber: index + 1, 
      svg: options[index].svg 
    });
  };

  const handleModification = (action: string) => {
    append({
      role: 'user',
      content: `${action} [Option ${selectedOption! + 1}]`
    });
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

  return (
    <div className="flex flex-col h-[100dvh] max-h-[100dvh] bg-[#efeae2]">
      {/* Chat header */}
      <div className="bg-[#f0f2f5] px-3 py-2 flex items-center justify-between shadow-sm z-10">
        {activeGroup ? (
          <>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveGroup(null)}
                className="p-1.5 hover:bg-black/5 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-[#54656f]" />
              </button>
              <div className="flex items-center gap-3">
                {activeGroup.image ? (
                  <img
                    src={activeGroup.image}
                    alt={activeGroup.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center">
                    <span className="text-white text-lg font-semibold">
                      {activeGroup.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <h2 className="font-semibold text-[#111b21]">{activeGroup.name}</h2>
                  <div className="flex items-center gap-1.5">
                    {activeGroup.models.map((model, i) => (
                      <span
                        key={model}
                        className="text-xs px-1.5 py-0.5 bg-[#e7f8f5] text-[#00a884] rounded"
                      >
                        {model}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <ModelSelector currentModel={currentModel} onModelChange={setCurrentModel} />
            <button
              onClick={() => setIsCreateGroupModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#00a884] text-white rounded-lg hover:bg-[#008f6f] transition-colors focus:outline-none focus:ring-2 focus:ring-[#00a884] focus:ring-offset-2"
            >
              <Users className="w-4 h-4" />
              <span>New Group</span>
            </button>
          </>
        )}
      </div>
      
      {/* Group list or chat messages */}
      <div className="flex-1 overflow-y-auto space-y-1 p-2" style={{ 
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23ffffff' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
        backgroundAttachment: 'fixed'
      }}>
        {!activeGroup ? (
          // Show group list
          <div className="grid grid-cols-1 gap-2">
            {groups.map(group => (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg p-3 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setActiveGroup(group)}
              >
                <div className="flex items-center gap-3">
                  {group.image ? (
                    <img
                      src={group.image}
                      alt={group.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#00a884] flex items-center justify-center">
                      <span className="text-white text-xl font-semibold">
                        {group.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-[#111b21]">{group.name}</h3>
                    {group.description && (
                      <p className="text-sm text-gray-500 line-clamp-1">{group.description}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1">
                      {group.models.map(model => (
                        <span
                          key={model}
                          className="text-xs px-1.5 py-0.5 bg-[#e7f8f5] text-[#00a884] rounded"
                        >
                          {model}
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
                const modelName = message.role === 'assistant' && message.modelId ? 
                  AVAILABLE_MODELS.find(m => m.id === message.modelId)?.name :
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
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                              <circle cx="24" cy="24" r="20" fill="#FFFFFF" />
                              <path d="M2,24 H46" stroke="#00a884" strokeWidth="2" />
                              <path d="M2,24 H22 M26,24 H46" fill="#FFFFFF" />
                              <circle cx="24" cy="24" r="6" fill="#00a884" />
                              <circle cx="24" cy="24" r="4" fill="#FFFFFF" />
                            </svg>
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
                            {message.role === 'user' ? 'You' : (
                              message.modelId 
                                ? AVAILABLE_MODELS.find(m => m.id === message.modelId)?.name 
                                : 'Assistant'
                            )}
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
                            onSelect={(index) => handleOptionSelect(i, index, options)}
                            onDownload={downloadSVG}
                            enableSelection={false}
                            selectedIndex={selectedMessageId === i ? selectedOption : undefined}
                          />
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
        )}

        <AnimatePresence>
          {/* Loading dots for both regular messages and logo generation */}
          {isLoading && !localMessages.some(m => m.role === 'assistant' && m.content) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex justify-start"
              >
                <div className="bg-white px-3 py-2 rounded-lg shadow-sm relative">
                  <div className="flex items-center gap-1 h-5">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse" />
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse delay-75" />
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse delay-150" />
                  </div>
                {/* Message tail */}
                  <div className="absolute top-0 -left-1.5">
                    <div className="w-4 h-4 transform rotate-45 bg-white translate-x-1/2" />
                  </div>
                </div>
              </motion.div>
            )}
        </AnimatePresence>
      </div>
      
      {/* Input area */}
      <div className="bg-[#f0f2f5] px-3 py-2 shadow-sm z-10">
        <div className="relative">
          <VisualInput
            value={input}
            onChange={handleInputWithMention}
            onSubmit={onSubmit}
            contextMessage={contextMessage}
            onClearContext={() => {
              setContextMessage(null);
              setSelectedOption(null);
              setIsEditing(false);
            }}
          />
          
          {/* Model suggestions */}
          {showModelSuggestions && modelSuggestions.length > 0 && (
            <div className="absolute bottom-full left-0 mb-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              {modelSuggestions.map((model) => (
                <div
                  key={model.id}
                  onClick={() => insertModelMention(model.id)}
                  className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-2"
                >
                  <div className="w-2 h-2 rounded-full bg-[#00a884]" />
                  <div>
                    <div className="text-sm font-medium">{model.name}</div>
                    <div className="text-xs text-gray-500">{model.id}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {mentionedModel && (
            <div className="text-xs text-[#00a884] mt-1 ml-1">
              Using {AVAILABLE_MODELS.find(m => m.id === mentionedModel)?.name} for this message
            </div>
          )}
        </div>
      </div>

      <CreateGroupModal
        isOpen={isCreateGroupModalOpen}
        onClose={() => setIsCreateGroupModalOpen(false)}
        onCreateGroup={(name, description, models, image) => {
          handleCreateGroup(name, description, models[0], image);
          // Update group's available models
          if (activeGroup) {
            setActiveGroup({
              ...activeGroup,
              models: models
            });
          }
        }}
      />
    </div>
  );
} 