import React from 'react';
import { motion } from 'framer-motion';

interface OptionCardProps {
  svg: string;
  description: string;
  index: number;
  onSelect: () => void;
  onDownload: () => void;
  isSelected?: boolean;
}

export const OptionCard: React.FC<OptionCardProps> = ({
  svg,
  description,
  index,
  onSelect,
  onDownload,
  isSelected = false
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`
        relative bg-white rounded-xl shadow-sm hover:shadow-md
        transition-all duration-200 overflow-hidden w-full
        ${isSelected ? 'ring-2 ring-blue-500' : ''}
      `}
    >
      {/* Preview Area */}
      <div className="p-4">
        <div className="w-full aspect-square bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden">
          <div className="w-4/5 h-4/5 relative group">
            <div dangerouslySetInnerHTML={{ __html: svg }} className="w-full h-full" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors rounded-lg" />
          </div>
        </div>
      </div>

      {/* Info Area */}
      <div className="px-4 pb-4">
        <h3 className="text-lg font-semibold mb-1.5">Option {index + 1}</h3>
        <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 h-10">
          {description}
        </p>
      </div>

      {/* Action Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent 
                    opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="px-4 py-3 flex justify-between items-center">
          <motion.button
            onClick={onDownload}
            className="p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Download SVG"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </motion.button>
          <motion.button
            onClick={onSelect}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full
                     transition-colors flex items-center gap-2 text-sm font-medium"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span>Select & Customize</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}; 