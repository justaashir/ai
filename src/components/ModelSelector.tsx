import React from 'react';
import type { ModelType, ModelOption } from '../types/chat';
import { motion } from 'framer-motion';

const models: ModelOption[] = [
  { 
    id: 'gpt-4o-mini', 
    name: 'GPT-4 Mini', 
    description: 'Faster, lighter model' 
  },
  { 
    id: 'gpt-4o', 
    name: 'GPT-4', 
    description: 'Most capable model' 
  },
  { 
    id: 'claude-3-sonnet', 
    name: 'Claude 3 Sonnet', 
    description: 'Anthropic\'s latest model' 
  }
];

interface ModelSelectorProps {
  currentModel: ModelType;
  onModelChange: (model: ModelType) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ 
  currentModel, 
  onModelChange 
}) => (
  <div className="flex items-center gap-3 w-full max-w-screen-lg mx-auto">
    {/* AI Model Avatar */}
    <motion.div 
      className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center text-white shadow-sm"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    </motion.div>

    {/* Model Info */}
    <div className="flex flex-col flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <select
          value={currentModel}
          onChange={(e) => onModelChange(e.target.value as ModelType)}
          className="text-[15px] font-medium bg-transparent border-none focus:outline-none cursor-pointer p-0 
            truncate max-w-[200px] md:max-w-none"
        >
          {models.map(model => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
        <span className="hidden md:inline text-xs px-2 py-0.5 bg-[#00a884]/10 text-[#00a884] rounded-full font-medium">
          AI
        </span>
      </div>
      <span className="text-xs text-[#667781] truncate">
        {models.find(m => m.id === currentModel)?.description}
      </span>
    </div>

    {/* Optional: Add menu button for mobile */}
    <motion.button
      className="p-2 hover:bg-black/5 rounded-full transition-colors md:hidden"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
          d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
      </svg>
    </motion.button>
  </div>
); 