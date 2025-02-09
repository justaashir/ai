import React, { useRef, useEffect } from 'react';
import type { SVGPreviewProps } from '../../types/chat';
import { QuickActions } from './QuickActions';

export const SVGPreview: React.FC<SVGPreviewProps> = ({ 
  svgCode, 
  onDownload, 
  size = 'sm',
  showDownload = true,
  onElementModify
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.innerHTML = svgCode;
      const svg = containerRef.current.querySelector('svg');
      if (svg) {
        // Ensure SVG fills the container while maintaining aspect ratio
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      }
    }
  }, [svgCode]);

  return (
    <div className="relative">
      <div 
        ref={containerRef}
        className={`
          bg-white rounded-lg p-4 border border-gray-200
          ${size === 'sm' ? 'w-32 h-32' : 'w-48 h-48'}
          flex items-center justify-center
          pointer-events-none
        `}
        style={{ 
          filter: 'drop-shadow(0 1px 2px rgb(0 0 0 / 0.1))'
        }}
      />
      {showDownload && onDownload && (
        <QuickActions
          onAction={(action) => onElementModify?.(action)}
          onDownload={onDownload}
          svgCode={svgCode}
        />
      )}
    </div>
  );
}; 