'use client';

import { useChat } from 'ai/react';
import { useState } from 'react';
import type { ModelType, ContextMessage } from '../types/chat';
import { ModelSelector } from './ModelSelector';
import { VisualInput } from './VisualInput';
import { extractOptions, downloadSVG } from '../utils/svg';
import { OptionGrid } from './logo/OptionGrid';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check } from 'lucide-react';

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

  const { messages, input, handleInputChange, handleSubmit, isLoading, append } = useChat({
    api: `/api/chat?model=${currentModel}`,
    onResponse: (response) => {
      setContextMessage(null);
      setIsGeneratingLogos(false);
      setIsStreamingOptions(false);
      if (isGeneratingLogos) {
        // Count number of options detected
        const optionMatches = response.match(/Option \d+:/g);
        const newNumOptions = optionMatches ? optionMatches.length : 0;
        
        if (newNumOptions > numOptionsDetected) {
          setNumOptionsDetected(newNumOptions);
          
          // If this is the first option detected, start streaming
          if (numOptionsDetected === 0 && newNumOptions === 1) {
            setIsStreamingOptions(true);
          }
          
          // If we've found all options (usually 3), stop streaming
          if (newNumOptions >= 3) {
            setIsStreamingOptions(false);
          }
        }
      }
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    const inputValue = input.toLowerCase();
    setIsGeneratingLogos(inputValue.includes('logo') || inputValue.includes('design'));
    setNumOptionsDetected(0);
    setIsStreamingOptions(false);
    handleSubmit(e);
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
      <div className="bg-[#f0f2f5] px-3 py-2 flex items-center shadow-sm z-10">
        <ModelSelector currentModel={currentModel} onModelChange={setCurrentModel} />
      </div>
      
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto space-y-1 p-2" style={{ 
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23ffffff' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
        backgroundAttachment: 'fixed'
      }}>
        <AnimatePresence mode="wait">
          {messages.map((message, i) => {
            const options = message.role === 'assistant' ? extractOptions(message.content) : [];
            const hasOptions = options.length > 0;
            
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
              >
                {/* Regular message */}
                {(!hasOptions || message.role === 'user') && (
                  <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`
                        group relative max-w-[90%] md:max-w-[75%] lg:max-w-[65%]
                        ${message.role === 'user'
                          ? 'bg-[#d9fdd3] ml-auto mr-1'
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
                      
                      {formatMessageContent(message.content, false)}
                      
                      {/* Message actions */}
                      <div className="flex items-center justify-between mt-0.5">
                        {/* Copy button with tooltip - only show for AI messages */}
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

                        {/* Timestamp */}
                        <div className={`text-[0.65rem] text-gray-500 ${message.role === 'user' ? 'text-[#667781]' : ''}`}>
                          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
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

        <AnimatePresence>
          {/* Loading dots for both regular messages and logo generation */}
          {isLoading && !messages.some(m => m.role === 'assistant' && m.content) && (
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
          <VisualInput
            value={input}
            onChange={handleInputChange}
            onSubmit={onSubmit}
            contextMessage={contextMessage}
            isLoading={isLoading}
            onClearContext={() => {
              setContextMessage(null);
              setSelectedOption(null);
              setIsEditing(false);
            }}
          />
      </div>
    </div>
  );
} 