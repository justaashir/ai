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
  numExpectedOptions?: number;
}

export const OptionGrid: React.FC<OptionGridProps> = ({
  options,
  onSelect,
  onDownload,
  selectedIndex,
  numExpectedOptions = 3
}) => {
  // Create an array of expected option slots
  const optionSlots = Array.from({ length: numExpectedOptions }, (_, i) => {
    const option = options[i];
    const isLoading = i === options.length; // Only show loading for the next expected option

    if (!option && i > options.length) {
      return null; // Don't render slots beyond the next expected option
    }

    return (
      <OptionCard
        key={i}
        svg={option?.svg || ''}
        description={option?.description || ''}
        index={i}
        onSelect={() => onSelect(i)}
        onDownload={() => option && onDownload(option.svg)}
        isSelected={selectedIndex === i}
        isLoading={isLoading}
      />
    );
  }).filter(Boolean); // Remove null slots

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 px-2">
      {optionSlots}
    </div>
  );
}; 