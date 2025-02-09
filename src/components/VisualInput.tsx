import React from 'react';
import type { VisualInputProps, ContextMessage } from '../types/chat';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X } from 'lucide-react';

const formatContextMessage = (contextJson: string): string => {
  try {
    const context: ContextMessage = JSON.parse(contextJson);
    switch (context.type) {
      case 'option':
        return `Selected Option ${context.optionNumber}`;
      case 'element':
        return `Modifying ${context.element}`;
      case 'action':
        return context.svg || '';
      default:
        return '';
    }
  } catch {
    return '';
  }
};

export const VisualInput: React.FC<VisualInputProps> = ({ 
  value, 
  onChange, 
  onSubmit, 
  contextMessage,
  onClearContext,
  isLoading = false
}) => {
  return (
    <div className="relative">
      <AnimatePresence>
        {contextMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute -top-10 left-0 right-0 flex items-center justify-between bg-[#8696a0]/10 backdrop-blur-sm px-4 py-1.5 rounded-t-lg"
          >
            <span className="text-sm text-[#667781] font-medium">
              {formatContextMessage(JSON.stringify(contextMessage))}
            </span>
            <motion.button
              type="button"
              onClick={onClearContext}
              className="text-[#667781] hover:text-[#8696a0] p-1 rounded-full hover:bg-black/5 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <X className="w-4 h-4" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={onSubmit} className="flex items-center gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={value}
            onChange={onChange}
            placeholder="Type a message"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-white rounded-lg focus:outline-none shadow-sm 
              placeholder:text-gray-500 text-base md:text-[15px] disabled:bg-gray-50"
          />
        </div>

        <motion.button
          type="submit"
          disabled={isLoading}
          className={`w-11 h-11 flex items-center justify-center text-white rounded-full shadow-sm
            ${isLoading 
              ? 'bg-[#8696a0]/20 cursor-not-allowed' 
              : 'bg-[#00a884] hover:bg-[#00916e] transition-colors'
            }`}
          whileHover={isLoading ? {} : { scale: 1.05 }}
          whileTap={isLoading ? {} : { scale: 0.95 }}
        >
          <Send 
            className="w-5 h-5" 
            strokeWidth={2.5}
            color={isLoading ? "#8696a0" : "currentColor"}
          />
        </motion.button>
      </form>
    </div>
  );
}; 