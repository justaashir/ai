'use client';

import { useChat } from 'ai/react';
import { useEffect, useRef, useState } from 'react';

type ModelType = 'gpt-4o-mini' | 'gpt-4o' | 'claude-3-sonnet';

interface ModelOption {
  id: ModelType;
  name: string;
  description: string;
}

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

const ModelSelector = ({ 
  currentModel, 
  onModelChange 
}: { 
  currentModel: ModelType;
  onModelChange: (model: ModelType) => void;
}) => (
  <div className="flex items-center gap-2 mb-4">
    <label className="text-sm text-gray-600">Model:</label>
    <select
      value={currentModel}
      onChange={(e) => onModelChange(e.target.value as ModelType)}
      className="text-sm border border-gray-300 rounded-md p-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {models.map(model => (
        <option key={model.id} value={model.id}>
          {model.name}
        </option>
      ))}
    </select>
    <span className="text-xs text-gray-500">
      {models.find(m => m.id === currentModel)?.description}
    </span>
  </div>
);

interface SVGPreviewProps {
  svgCode: string;
  onDownload?: () => void;
  size?: 'sm' | 'lg';
  showDownload?: boolean;
  onElementModify?: (prompt: string) => void;
  isInspecting?: boolean;
}

interface SVGElement {
  id: string;
  type: string;
  attributes: Record<string, string>;
}

const getAdaptiveActions = (svgCode: string) => {
  const actions: { icon: string; action: string; title: string; }[] = [];
  
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgCode, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    
    if (svg) {
      // Always include iterate as first action
      actions.push({ icon: '🔄', action: 'Iterate', title: 'Iterate Design' });

      // Check for paths (complex shapes)
      const paths = svg.querySelectorAll('path');
      if (paths.length > 0) {
        actions.push({ icon: '✨', action: 'Simplify design', title: 'Simplify Design' });
        actions.push({ icon: '✏️', action: 'Add more detail', title: 'Add More Detail' });
      }

      // Check for fills/colors
      const elements = svg.querySelectorAll('*');
      const hasColors = Array.from(elements).some(el => 
        el.getAttribute('fill') || el.getAttribute('stroke')
      );
      if (hasColors) {
        actions.push({ icon: '🎨', action: 'Change colors', title: 'Change Colors' });
      }

      // Check for transformable elements
      const transformable = svg.querySelectorAll('circle, rect, path, polygon');
      if (transformable.length > 0) {
        actions.push({ icon: '↔️', action: 'Make it bigger', title: 'Make it Bigger' });
        actions.push({ icon: '↕️', action: 'Make it smaller', title: 'Make it Smaller' });
        actions.push({ icon: '🔄', action: 'Rotate elements', title: 'Rotate Elements' });
      }

      // Check for multiple elements (spacing)
      if (transformable.length > 1) {
        actions.push({ icon: '↔️', action: 'Adjust spacing', title: 'Adjust Spacing' });
      }

      // Check for text elements
      const text = svg.querySelectorAll('text');
      if (text.length > 0) {
        actions.push({ icon: '✏️', action: 'Edit text', title: 'Edit Text' });
        actions.push({ icon: '🔤', action: 'Change font', title: 'Change Font' });
      }

      // Style changes always available
      actions.push({ icon: '🎯', action: 'Change style', title: 'Change Style' });
    }
  } catch (err) {
    console.error('Error analyzing SVG:', err);
  }

  // If no actions were added (error case), return default set
  if (actions.length === 0) {
    return [
      { icon: '🔄', action: 'Iterate', title: 'Iterate Design' },
      { icon: '↔️', action: 'Make it bigger', title: 'Make it Bigger' },
      { icon: '🎨', action: 'Change colors', title: 'Change Colors' },
      { icon: '✨', action: 'Simplify design', title: 'Simplify Design' }
    ];
  }

  return actions;
};

const QuickActions = ({ onAction, onDownload, svgCode }: { 
  onAction: (action: string) => void, 
  onDownload: () => void,
  svgCode: string 
}) => {
  const actions = getAdaptiveActions(svgCode);

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      <button
        onClick={() => onDownload()}
        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
        title="Download SVG"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <path d="M7 10l5 5 5-5" />
          <path d="M12 15V3" />
        </svg>
      </button>
      {actions.map(({ icon, action, title }) => (
        <button
          key={action}
          onClick={() => {
            onAction(action);
            // Auto submit after selecting action
            const form = document.querySelector('form');
            if (form) form.requestSubmit();
          }}
          className="w-8 h-8 flex items-center justify-center text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
          title={title}
        >
          {icon}
        </button>
      ))}
    </div>
  );
};

const SVGInspector = ({ 
  svgCode, 
  onElementSelect 
}: { 
  svgCode: string;
  onElementSelect: (element: SVGElement) => void;
}) => {
  const [elements, setElements] = useState<SVGElement[]>([]);
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);

  useEffect(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgCode, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    
    if (svg) {
      const extractElements = (node: Element): SVGElement[] => {
        const elements: SVGElement[] = [];
        if (node.tagName !== 'svg') {
          const attrs: Record<string, string> = {};
          node.getAttributeNames().forEach(name => {
            attrs[name] = node.getAttribute(name) || '';
          });
          elements.push({
            id: node.id || `${node.tagName}-${Math.random().toString(36).substr(2, 9)}`,
            type: node.tagName,
            attributes: attrs
          });
        }
        node.children && Array.from(node.children).forEach(child => {
          elements.push(...extractElements(child));
        });
        return elements;
      };
      
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

interface InspectIconProps {
  isActive: boolean;
  onClick: () => void;
}

const InspectIcon: React.FC<InspectIconProps> = ({ isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`p-1.5 rounded-md transition-all ${
      isActive 
        ? 'bg-blue-500 text-white' 
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`}
    title={isActive ? 'Disable inspection' : 'Enable inspection'}
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
      <path d="M11 8v6" />
      <path d="M8 11h6" />
    </svg>
  </button>
);

const SVGPreview: React.FC<SVGPreviewProps> = ({ 
  svgCode, 
  onDownload, 
  size = 'sm',
  showDownload = true,
  onElementModify,
  isInspecting = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<SVGElement | null>(null);
  const [hoveredElement, setHoveredElement] = useState<Element | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgCode, 'image/svg+xml');
        const svg = doc.querySelector('svg');
        
        if (svg) {
          svg.setAttribute('width', '100%');
          svg.setAttribute('height', '100%');
          svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

          const style = document.createElement('style');
          style.textContent = `
            * {
              transition: all 0.2s;
            }
            circle, rect, path, polygon, ellipse, line, polyline, text {
              cursor: ${isInspecting ? 'pointer' : 'default'};
              pointer-events: ${isInspecting ? 'all' : 'none'};
            }
            circle:hover, rect:hover, path:hover, polygon:hover, 
            ellipse:hover, line:hover, polyline:hover, text:hover {
              stroke: #3B82F6 !important;
              stroke-width: 2px !important;
              filter: drop-shadow(0 0 2px #3B82F6);
            }
            .selected {
              stroke: #2563EB !important;
              stroke-width: 3px !important;
              filter: drop-shadow(0 0 3px #2563EB);
            }
          `;
          svg.appendChild(style);

          const makeInteractive = (element: Element) => {
            if (element.tagName !== 'svg') {
              element.addEventListener('mouseenter', () => {
                if (isInspecting) {
                  setHoveredElement(element);
                }
              });

              element.addEventListener('mouseleave', () => {
                setHoveredElement(null);
              });
              
              element.addEventListener('click', (e) => {
                if (!isInspecting) return;
                e.stopPropagation();

                // Get element properties
                const props: Record<string, string> = {};
                const computedStyle = window.getComputedStyle(element as Element);
                
                // Get SVG specific attributes
                ['fill', 'stroke', 'stroke-width', 'd', 'points', 'cx', 'cy', 'r', 'x', 'y', 'width', 'height', 'transform'].forEach(attr => {
                  const value = element.getAttribute(attr) || computedStyle.getPropertyValue(attr);
                  if (value && value !== 'none' && value !== '0') {
                    props[attr] = value;
                  }
                });

                // Update selection state
                svg.querySelectorAll('.selected').forEach(el => {
                  el.classList.remove('selected');
                });
                element.classList.add('selected');

                const elementType = element.tagName.toLowerCase();
                const elementId = element.id || '';

                setSelectedElement({
                  id: elementId || `${elementType}-${Math.random().toString(36).substr(2, 9)}`,
                  type: elementType,
                  attributes: props
                });

                // Create detailed context message
                const contextMessage = {
                  type: 'element_selection',
                  element: elementType,
                  id: elementId,
                  properties: props,
                  originalSvgCode: svgCode
                };
                
                onElementModify?.(JSON.stringify(contextMessage));
              });
            }
            Array.from(element.children).forEach(makeInteractive);
          };

          makeInteractive(svg);
          containerRef.current.innerHTML = svg.outerHTML;

          // Reattach listeners after innerHTML update
          const newSvg = containerRef.current.querySelector('svg');
          if (newSvg) makeInteractive(newSvg);

          setError(null);
        } else {
          setError('Invalid SVG');
        }
      } catch (err) {
        setError('Failed to render SVG');
        console.error('SVG rendering error:', err);
      }
    }
  }, [svgCode, isInspecting]);

  if (error) {
    return (
      <div className="inline-flex items-center justify-center bg-red-50 rounded-lg p-2">
        <span className="text-xs text-red-500">{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className={`
        inline-flex flex-col gap-2 bg-white/50 rounded-lg p-2 
        hover:bg-white/80 transition-colors group relative
        ${size === 'lg' ? 'p-4' : 'p-2'}
      `}>
        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {showDownload && onDownload && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDownload();
              }}
              className="p-1.5 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors"
              title="Download SVG"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <path d="M7 10l5 5 5-5" />
                <path d="M12 15V3" />
              </svg>
            </button>
          )}
        </div>
        <div 
          ref={containerRef} 
          className={`
            ${size === 'sm' ? 'w-12 h-12' : 'w-24 h-24'}
            flex items-center justify-center
            ${isInspecting ? 'cursor-crosshair' : ''}
          `}
          style={{ 
            filter: 'drop-shadow(0 1px 2px rgb(0 0 0 / 0.1))'
          }}
        />
        {(hoveredElement || selectedElement) && (
          <div className="text-xs text-gray-500">
            {hoveredElement && isInspecting && (
              <span>Hovering: {hoveredElement.tagName}</span>
            )}
            {selectedElement && (
              <span className="ml-2 text-blue-500">
                Selected: {selectedElement.type}
                {selectedElement.attributes.id && ` #${selectedElement.attributes.id}`}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const LoadingOption = () => (
  <div className="flex flex-col items-center p-4 bg-white/50 rounded-lg">
    <div className="w-24 h-24 bg-gray-200 rounded-lg animate-pulse flex items-center justify-center">
      <svg className="w-8 h-8 text-gray-300 animate-spin" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
      </svg>
    </div>
    <div className="mt-2 space-y-2 w-full">
      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
      <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3"></div>
    </div>
  </div>
);

const OptionSelector = ({ options, onSelect, onDownload }: { 
  options: { svg: string; description: string }[], 
  onSelect: (index: number) => void,
  onDownload: (svg: string) => void
}) => {
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  
  const actions = [
    { icon: '🔄', action: 'Iterate', title: 'Iterate Design', prompt: 'Let\'s refine this' },
    { icon: '↔️', action: 'Make it bigger', title: 'Make it Bigger', prompt: 'Make it bigger' },
    { icon: '↕️', action: 'Make it smaller', title: 'Make it Smaller', prompt: 'Make it smaller' },
    { icon: '🎨', action: 'Change colors', title: 'Change Colors', prompt: 'Change the colors' },
    { icon: '✨', action: 'Simplify design', title: 'Simplify Design', prompt: 'Simplify the design' },
    { icon: '✏️', action: 'Add more detail', title: 'Add More Detail', prompt: 'Add more detail' },
    { icon: '🔄', action: 'Rotate elements', title: 'Rotate Elements', prompt: 'Rotate the elements' },
    { icon: '↔️', action: 'Adjust spacing', title: 'Adjust Spacing', prompt: 'Adjust the spacing' },
    { icon: '🎯', action: 'Change style', title: 'Change Style', prompt: 'Change the style' }
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (openDropdown !== null && !target.closest('.dropdown-container')) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4">
      {[0, 1, 2].map(index => {
        const option = options[index];
        return option ? (
          <div
            key={index}
            className="flex flex-col items-center p-4 bg-white/50 rounded-lg text-center"
          >
            <SVGPreview 
              svgCode={option.svg} 
              size="lg"
              showDownload={false}
            />
            <div className="mt-2 text-sm text-gray-600 w-full flex flex-col items-center">
              <span className="font-medium">Option {index + 1}</span>
              <p className="mt-1 text-xs line-clamp-2 max-w-[200px]">{option.description}</p>
            </div>
            <div className="flex justify-center gap-2 mt-3">
              <button
                onClick={() => onDownload(option.svg)}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-600 transition-colors"
                title="Download SVG"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <path d="M7 10l5 5 5-5" />
                  <path d="M12 15V3" />
                </svg>
              </button>
              <div className="relative dropdown-container">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenDropdown(openDropdown === index ? null : index);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 rounded-md text-white transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 4V2" />
                    <path d="M15 22v-2" />
                    <path d="M4 15H2" />
                    <path d="M22 15h-2" />
                    <path d="M19.8 9l-1.6-1.6" />
                    <path d="M5.8 19.8L4.2 18.2" />
                    <path d="M19.8 19.8l-1.6-1.6" />
                    <path d="M5.8 9L4.2 7.4" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <span className="text-sm">Actions</span>
                  <svg className={`w-4 h-4 ml-1 transform transition-transform ${openDropdown === index ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {openDropdown === index && (
                  <div 
                    className="dropdown-menu absolute right-0 mt-1 py-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {actions.map(({ icon, action, title, prompt }) => (
                      <button
                        key={action}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdown(null);
                          onSelect(index + 1);
                          
                          // Set input to the action
                          const form = document.querySelector('form');
                          const input = form?.querySelector('input');
                          if (input) {
                            const event = new Event('input', { bubbles: true });
                            input.value = `${prompt} [Option ${index + 1}]`;
                            input.dispatchEvent(event);
                            form?.requestSubmit();
                          }
                        }}
                        className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <span>{icon}</span>
                        <span>{title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <LoadingOption key={index} />
        );
      })}
    </div>
  );
};

// Update the context message type at the top
interface ContextMessage {
  type: string;
  svg?: string;
  element?: string;
  optionNumber?: number;
}

// Add a function to format the context message
const formatContextMessage = (contextJson: string): string => {
  try {
    const context = JSON.parse(contextJson);
    if (context.type === 'option_selection') {
      return `Selected Option ${context.optionNumber}`;
    } else if (context.type === 'element_selection') {
      const elementDesc = context.id ? `${context.element}#${context.id}` : context.element;
      const propsString = Object.entries(context.properties)
        .map(([key, value]) => `${key}="${value}"`)
        .join(', ');
      return `Selected ${elementDesc} element. Properties: ${propsString}`;
    }
    return contextJson;
  } catch (err) {
    return contextJson;
  }
};

// Update the VisualInput component
const VisualInput = ({ 
  value, 
  onChange, 
  onSubmit, 
  contextMessage,
  onClearContext 
}: { 
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  contextMessage?: ContextMessage | null;
  onClearContext: () => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex-1 flex items-center p-2 bg-white border border-gray-300 rounded-md">
      {contextMessage?.type === 'option_selection' && (
        <div className="inline-flex items-center gap-1.5 px-1.5 py-0.5 mr-2 bg-blue-50 border border-blue-200 text-blue-700 rounded text-xs">
          <div className="w-3.5 h-3.5">
            <div dangerouslySetInnerHTML={{ __html: contextMessage.svg || '' }} />
          </div>
          <span className="font-medium">Option {value.match(/\d+/)?.[0] || ''}</span>
          <button
            onClick={(e) => {
              e.preventDefault();
              onClearContext();
            }}
            className="ml-1 hover:bg-blue-100 rounded-full p-0.5"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      <input
        ref={inputRef}
        value={value}
        onChange={onChange}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSubmit(e);
          }
        }}
        placeholder="Describe the logo you want or ask for modifications..."
        className="flex-1 bg-transparent border-none outline-none text-sm"
      />
    </div>
  );
};

export default function ChatComponent() {
  const [selectedModel, setSelectedModel] = useState<ModelType>('gpt-4o-mini');
  const [isInspecting, setIsInspecting] = useState(false);
  const { messages, input, handleInputChange, handleSubmit, error, setInput, isLoading, stop } = useChat({
    api: `/api/chat?model=${selectedModel}`
  });
  const [contextMessage, setContextMessage] = useState<ContextMessage | null>(null);
  const [lastSvgCode, setLastSvgCode] = useState<string | null>(null);

  // Add useEffect to handle SVG updates
  useEffect(() => {
    const lastAssistantMessage = messages.filter(m => m.role === 'assistant').pop();
    if (lastAssistantMessage) {
      const svgCode = extractSVGCode(lastAssistantMessage.content);
      if (svgCode) {
        setLastSvgCode(svgCode);
        setContextMessage(prev => prev ? {
          ...prev,
          svg: svgCode
        } : null);
      }
    }
  }, [messages]);

  const downloadSVG = (svgCode: string) => {
    try {
      const blob = new Blob([svgCode], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'logo.svg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const extractSVGCode = (content: string) => {
    try {
      // First check if it's a design rationale format
      if (content.startsWith('### Design Rationale')) {
        // Extract any SVG that appears after the rationale
        const svgMatch = content.match(/<svg[\s\S]*?<\/svg>/);
        return svgMatch ? svgMatch[0] : null;
      }
      
      // Otherwise try to find any SVG in the content
      const svgMatch = content.match(/<svg[\s\S]*?<\/svg>/);
      return svgMatch ? svgMatch[0] : null;
    } catch (err) {
      console.error('SVG extraction error:', err);
      return null;
    }
  };

  const extractOptions = (content: string) => {
    try {
      if (!content.includes('Option 1:')) return null;

      // First, extract all SVGs
      const svgMatches = content.match(/<svg[\s\S]*?<\/svg>/g) || [];
      
      // Then extract descriptions more carefully
      const optionMatches = content.match(/Option \d+:(.*?)(?=Option \d+:|$)/gs) || [];
      const descriptions = optionMatches.map(match => {
        // Remove SVG code from description if present
        const cleanText = match
          .replace(/Option \d+:/, '')
          .replace(/<svg[\s\S]*?<\/svg>/, '')
          .trim();
        return cleanText;
      });

      if (svgMatches.length > 0 && descriptions.length > 0) {
        // Match up available SVGs with descriptions
        return svgMatches.map((svg, i) => ({
          svg,
          description: descriptions[i] || `Option ${i + 1}`
        }));
      }
    } catch (err) {
      console.error('Options extraction error:', err);
    }
    return null;
  };

  const handleClearContext = () => {
    setContextMessage(null);
    setInput('');
  };

  // Update handleOptionSelect
  const handleOptionSelect = (optionNumber: number, options: { svg: string; description: string }[]) => {
    const option = options[optionNumber - 1];
    if (option) {
      setContextMessage({
        type: 'option_selection',
        svg: option.svg,
        optionNumber: optionNumber
      });
      setInput(`Let's refine this [Option ${optionNumber}]`);
    }
  };

  const formatMessageContent = (content: string, isIterationResponse: boolean) => {
    // For iteration responses, remove the SVG code
    if (isIterationResponse) {
      return content.replace(/<svg[\s\S]*?<\/svg>/, '').trim();
    }
    // For other messages, just clean up the option tag
    return content.replace(/\[Option \d+\]/, '').trim();
  };

  // Update handleQuickAction to handle option display better
  const handleQuickAction = (action: string) => {
    if (!contextMessage?.optionNumber) return;
    
    const newInput = action === 'Iterate' ? 
      `Let's refine this [Option ${contextMessage.optionNumber}]` : 
      `${action} [Option ${contextMessage.optionNumber}]`;
    
    // Update input through the proper handler
    handleInputChange({ target: { value: newInput } } as React.ChangeEvent<HTMLInputElement>);
    
    // Auto submit
    const form = document.querySelector('form');
    if (form) form.requestSubmit();
  };

  // Update handleElementModify
  const handleElementModify = (contextJson: string) => {
    try {
      const context = JSON.parse(contextJson);
      const { element, id, properties } = context;
      
      setContextMessage(prev => ({
        type: 'element_selection',
        element: id ? `${element}#${id}` : element,
        optionNumber: prev?.optionNumber
      }));

      const propsString = Object.entries(properties)
        .map(([key, value]) => `${key}="${value}"`)
        .join(', ');
      setInput(`Modify the ${element} element with properties: ${propsString} [Option ${contextMessage?.optionNumber}]`);
      setIsInspecting(false);
    } catch (err) {
      console.error('Error parsing context:', err);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <ModelSelector 
        currentModel={selectedModel} 
        onModelChange={setSelectedModel}
      />
      <div className="flex flex-col gap-2">
        {messages.map((message, index) => {
          const svgCode = message.role === 'assistant' ? extractSVGCode(message.content) : null;
          const options = message.role === 'assistant' ? extractOptions(message.content) : null;
          
          const optionMatch = message.content.match(/\[Option (\d+)\]/);
          const isOptionMessage = optionMatch && message.role === 'user';
          const isFirstPrompt = index <= 1 && message.role === 'assistant';
          const isIterationResponse = !isFirstPrompt && message.role === 'assistant';

          // Format the message content
          const displayContent = formatMessageContent(message.content, isIterationResponse);
          
          return (
            <div key={message.id}>
              <div 
                className={`p-3 rounded-lg ${
                  message.role === 'user' 
                    ? 'bg-blue-100 ml-auto' 
                    : 'bg-gray-100'
                }`}
              >
                <strong className="text-sm text-gray-600">{message.role === 'user' ? 'You: ' : 'AI: '}</strong>
                <div className="mt-1">
                  {isFirstPrompt && options ? (
                    <>
                      <div className="text-sm mb-2">Select your preferred logo design:</div>
                      <OptionSelector 
                        options={options} 
                        onSelect={(index) => handleOptionSelect(index, options)}
                        onDownload={downloadSVG}
                      />
                    </>
                  ) : isOptionMessage ? (
                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center gap-1.5 px-1.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded text-xs">
                        <div className="w-3.5 h-3.5">
                          {contextMessage?.svg && (
                            <div dangerouslySetInnerHTML={{ __html: contextMessage.svg }} />
                          )}
                        </div>
                        <span className="font-medium">Option {optionMatch[1]}</span>
                      </div>
                      <span className="text-sm">{displayContent}</span>
                    </div>
                  ) : isIterationResponse ? (
                    <div className="space-y-2">
                      <div className="text-sm whitespace-pre-wrap">{displayContent}</div>
                      {svgCode && (
                        <>
                          <SVGPreview 
                            svgCode={svgCode} 
                            onDownload={() => downloadSVG(svgCode)}
                            onElementModify={handleElementModify}
                            isInspecting={isInspecting}
                          />
                          <QuickActions 
                            onAction={handleQuickAction} 
                            onDownload={() => downloadSVG(svgCode)}
                            svgCode={svgCode}
                          />
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm whitespace-pre-wrap">{displayContent}</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {error && (
          <div className="p-2 text-sm text-red-500 bg-red-50 rounded-lg">
            Error: {error.message}
          </div>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1">
          <VisualInput
            value={input}
            onChange={handleInputChange}
            onSubmit={handleSubmit}
            contextMessage={contextMessage}
            onClearContext={handleClearContext}
          />
        </div>
        {isLoading ? (
          <button 
            type="button"
            onClick={stop}
            className="px-3 py-2 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
          >
            Cancel
          </button>
        ) : (
          <button 
            type="submit" 
            disabled={isLoading}
            className={`
              px-3 py-2 text-sm rounded-md transition-colors
              ${isLoading 
                ? 'bg-gray-300 cursor-not-allowed' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
              }
            `}
          >
            Send
          </button>
        )}
      </form>
    </div>
  );
} 