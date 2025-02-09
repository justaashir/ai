import React from 'react';
import { motion } from 'framer-motion';
import { Download } from 'lucide-react';

interface OptionCardProps {
  svg: string;
  description: string;
  index: number;
  onSelect: () => void;
  onDownload: () => void;
  isSelected?: boolean;
  enableSelection?: boolean;
  isLoading?: boolean;
}

const SkeletonCard = () => (
  <div className="relative bg-white rounded-xl shadow-sm w-full animate-pulse">
    {/* Preview Area */}
    <div className="p-4">
      <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-gray-200" />
      </div>
    </div>

    {/* Info Area */}
    <div className="px-4 pb-4">
      <div className="flex items-center justify-between">
        <div className="h-6 w-24 bg-gray-200 rounded" />
        <div className="h-8 w-8 bg-gray-200 rounded-full" />
      </div>
      <div className="h-4 w-full bg-gray-200 rounded mt-3" />
      <div className="h-4 w-2/3 bg-gray-200 rounded mt-2" />
    </div>
  </div>
);

export const OptionCard: React.FC<OptionCardProps> = ({
  svg,
  description,
  index,
  onSelect,
  onDownload,
  isSelected = false,
  enableSelection = false,
  isLoading = false
}) => {
  if (isLoading) {
    return <SkeletonCard />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      onClick={enableSelection ? onSelect : undefined}
      className={`
        relative bg-white rounded-xl shadow-sm hover:shadow-md
        transition-all duration-200 overflow-hidden w-full
        ${enableSelection ? 'cursor-pointer' : ''}
        ${isSelected && enableSelection ? 'ring-2 ring-blue-500' : ''}
      `}
    >
      {/* Preview Area */}
      <div className="p-2 sm:p-4">
        <div className="w-full aspect-square bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden">
          <div className="w-4/5 h-4/5 relative">
            <div dangerouslySetInnerHTML={{ __html: svg }} className="w-full h-full" />
          </div>
        </div>
      </div>

      {/* Info Area */}
      <div className="px-2 pb-2 sm:px-4 sm:pb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold">Option {index + 1}</h3>
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
            className="p-1.5 sm:p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Download SVG"
          >
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </motion.button>
        </div>
        <p className="text-gray-600 text-xs sm:text-sm leading-tight sm:leading-relaxed line-clamp-2 h-8 sm:h-10 mt-1 sm:mt-1.5">
          {description}
        </p>
      </div>
    </motion.div>
  );
}; 