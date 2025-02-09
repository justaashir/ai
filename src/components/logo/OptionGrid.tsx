import React from 'react';
import { motion } from 'framer-motion';
import { OptionCard } from './OptionCard';

interface OptionGridProps {
  options: {
    svg: string;
    description: string;
  }[];
  onSelect: (index: number) => void;
  onDownload: (svg: string) => void;
  selectedIndex?: number;
}

export const OptionGrid: React.FC<OptionGridProps> = ({
  options,
  onSelect,
  onDownload,
  selectedIndex
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 px-2">
      {options.map((option, index) => (
        <OptionCard
          key={index}
          svg={option.svg}
          description={option.description}
          index={index}
          onSelect={() => onSelect(index)}
          onDownload={() => onDownload(option.svg)}
          isSelected={selectedIndex === index}
        />
      ))}
    </div>
  );
}; 