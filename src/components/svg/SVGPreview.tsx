import React, { useRef, useEffect } from 'react';
import type { SVGPreviewProps, SVGElement } from '../../types/chat';
import { QuickActions } from './QuickActions';
import { SVGInspector } from './SVGInspector';

export const SVGPreview: React.FC<SVGPreviewProps> = ({ 
  svgCode, 
  onDownload, 
  size = 'sm',
  showDownload = true,
  onElementModify,
  isInspecting = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.innerHTML = svgCode;
      
      if (isInspecting) {
        const makeInteractive = (element: Element) => {
          if (element.tagName !== 'svg') {
            element.setAttribute('style', 'cursor: pointer; transition: all 0.2s;');
            element.addEventListener('mouseover', () => {
              const originalFill = element.getAttribute('fill');
              const originalStroke = element.getAttribute('stroke');
              element.setAttribute('data-original-fill', originalFill || '');
              element.setAttribute('data-original-stroke', originalStroke || '');
              element.setAttribute('fill', '#4299e1');
              element.setAttribute('stroke', '#2b6cb0');
            });
            
            element.addEventListener('mouseout', () => {
              const originalFill = element.getAttribute('data-original-fill');
              const originalStroke = element.getAttribute('data-original-stroke');
              if (originalFill) element.setAttribute('fill', originalFill);
              if (originalStroke) element.setAttribute('stroke', originalStroke);
            });
            
            element.addEventListener('click', () => {
              const attrs = Array.from(element.attributes)
                .map(attr => `${attr.name}="${attr.value}"`)
                .join(' ');
              onElementModify?.(`Modify the ${element.tagName} element with attributes: ${attrs}`);
            });
          }
          Array.from(element.children).forEach(makeInteractive);
        };
        
        const svg = containerRef.current.querySelector('svg');
        if (svg) {
          makeInteractive(svg);
          // Ensure SVG fills the container while maintaining aspect ratio
          svg.setAttribute('width', '100%');
          svg.setAttribute('height', '100%');
          svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        }
      }
    }
  }, [svgCode, isInspecting, onElementModify]);

  return (
    <div className="relative">
      <div 
        ref={containerRef}
        className={`
          bg-white rounded-lg p-4 border border-gray-200
          ${size === 'sm' ? 'w-32 h-32' : 'w-48 h-48'}
          flex items-center justify-center
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
      {isInspecting && (
        <SVGInspector
          svgCode={svgCode}
          onElementSelect={(element: SVGElement) => {
            const attrs = Object.entries(element.attributes)
              .map(([key, value]) => `${key}="${value}"`)
              .join(' ');
            onElementModify?.(`Modify the ${element.type} element with attributes: ${attrs}`);
          }}
        />
      )}
    </div>
  );
}; 