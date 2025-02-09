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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="23" fill="#008000" stroke="#003300" strokeWidth="2"></circle>
        <path d="M2,24 H46" stroke="#003300" strokeWidth="2"></path>
        <path d="M2,24 H22 M26,24 H46" fill="#FFFFFF"></path>
        <circle cx="24" cy="24" r="6" fill="#FFFFFF" stroke="#003300" strokeWidth="2"></circle>
        <circle cx="24" cy="24" r="4" fill="#00FF00"></circle>
        <path d="M4,12 H44 M4,36 H44 M12,4 V44 M36,4 V44" stroke="#00FF00" strokeWidth="1"></path>
        <circle cx="12" cy="12" r="2" fill="#00FF00"></circle>
        <circle cx="36" cy="36" r="2" fill="#00FF00"></circle>
      </svg>
    </motion.div>

    {/* Model Info */}
    <motion.div 
      className="flex flex-col flex-1 min-w-0"
      initial={false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center gap-2">
        <div className="relative group">
          <select
            value={currentModel}
            onChange={(e) => onModelChange(e.target.value as ModelType)}
            className="text-[15px] font-medium bg-transparent border-none focus:outline-none cursor-pointer p-0 
              truncate max-w-[200px] md:max-w-none hover:text-[#00a884] transition-colors
              appearance-none pr-6 [&::-webkit-calendar-picker-indicator]:hidden"
          >
            {models.map(model => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
      <motion.span 
        key={currentModel}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xs text-[#667781] truncate"
      >
        {models.find(m => m.id === currentModel)?.description}
      </motion.span>
    </motion.div>
  </div>
); 