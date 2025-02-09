import React, { useState, useEffect } from 'react';
import type { SVGInspectorProps, SVGElement } from '../../types/chat';
import { extractElements } from '../../utils/svg';

export const SVGInspector: React.FC<SVGInspectorProps> = ({ 
  svgCode, 
  onElementSelect 
}) => {
  const [elements, setElements] = useState<SVGElement[]>([]);
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);

  useEffect(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgCode, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    
    if (svg) {
      setElements(extractElements(svg));
    }
  }, [svgCode]);

  return (
    <div className="mt-2 p-2 bg-gray-50 rounded-lg">
      <div className="text-xs font-medium mb-2">SVG Elements:</div>
      <div className="space-y-1">
        {elements.map(element => (
          <button
            key={element.id}
            onClick={() => onElementSelect(element)}
            onMouseEnter={() => setHoveredElement(element.id)}
            onMouseLeave={() => setHoveredElement(null)}
            className={`
              w-full text-left px-2 py-1 text-xs rounded
              ${hoveredElement === element.id ? 'bg-blue-50' : 'hover:bg-gray-100'}
            `}
          >
            <span className="font-mono">{element.type}</span>
            {element.attributes.id && (
              <span className="ml-2 text-gray-500">#{element.attributes.id}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}; 