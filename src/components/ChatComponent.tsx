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
}

const SVGPreview: React.FC<SVGPreviewProps> = ({ 
  svgCode, 
  onDownload, 
  size = 'sm',
  showDownload = true 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        // Sanitize SVG code by creating a temporary element
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgCode, 'image/svg+xml');
        const svg = doc.querySelector('svg');
        
        if (svg) {
          // Add necessary attributes for scaling
          svg.setAttribute('width', '100%');
          svg.setAttribute('height', '100%');
          svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
          
          containerRef.current.innerHTML = svg.outerHTML;
          setError(null);
        } else {
          setError('Invalid SVG');
        }
      } catch (err) {
        setError('Failed to render SVG');
        console.error('SVG rendering error:', err);
      }
    }
  }, [svgCode]);

  if (error) {
    return (
      <div className="inline-flex items-center justify-center bg-red-50 rounded-lg p-2">
        <span className="text-xs text-red-500">{error}</span>
      </div>
    );
  }

  return (
    <div className={`
      inline-flex items-center gap-2 bg-white/50 rounded-lg p-2 
      hover:bg-white/80 transition-colors group
      ${size === 'lg' ? 'p-4' : 'p-2'}
    `}>
      <div 
        ref={containerRef} 
        className={`
          ${size === 'sm' ? 'w-12 h-12' : 'w-24 h-24'}
          flex items-center justify-center
        `}
        style={{ 
          filter: 'drop-shadow(0 1px 2px rgb(0 0 0 / 0.1))'
        }}
      />
      {showDownload && onDownload && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDownload();
          }}
          className="opacity-0 group-hover:opacity-100 text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-all"
        >
          Download
        </button>
      )}
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

const OptionSelector = ({ options, onSelect }: { 
  options: { svg: string; description: string }[], 
  onSelect: (option: number) => void 
}) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4">
    {[0, 1, 2].map(index => {
      const option = options[index];
      return option ? (
        <button
          key={index}
          onClick={() => onSelect(index + 1)}
          className="flex flex-col items-center p-4 bg-white/50 hover:bg-white/80 rounded-lg transition-all hover:scale-105 hover:shadow-lg"
        >
          <SVGPreview 
            svgCode={option.svg} 
            size="lg"
            showDownload={false}
          />
          <div className="mt-2 text-sm text-gray-600">
            <span className="font-medium">Option {index + 1}</span>
            <p className="mt-1 text-xs">{option.description}</p>
          </div>
        </button>
      ) : (
        <LoadingOption key={index} />
      );
    })}
  </div>
);

export default function ChatComponent() {
  const [selectedModel, setSelectedModel] = useState<ModelType>('gpt-4o-mini');
  const { messages, input, handleInputChange, handleSubmit, error, setInput } = useChat({
    api: `/api/chat?model=${selectedModel}`
  });

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

  const handleOptionSelect = (optionNumber: number) => {
    try {
      setInput(`I choose option ${optionNumber}`);
      handleSubmit(new Event('submit') as any);
    } catch (err) {
      console.error('Option selection error:', err);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <ModelSelector 
        currentModel={selectedModel} 
        onModelChange={setSelectedModel}
      />
      <div className="flex flex-col gap-2">
        {messages.map(message => {
          const svgCode = message.role === 'assistant' ? extractSVGCode(message.content) : null;
          const options = message.role === 'assistant' ? extractOptions(message.content) : null;
          
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
                  {options ? (
                    <>
                      <div className="text-sm mb-2">Select your preferred logo design:</div>
                      <OptionSelector options={options} onSelect={handleOptionSelect} />
                    </>
                  ) : svgCode ? (
                    <div className="space-y-2">
                      <div className="text-sm">{message.content.replace(svgCode, '')}</div>
                      <SVGPreview 
                        svgCode={svgCode} 
                        onDownload={() => downloadSVG(svgCode)} 
                      />
                    </div>
                  ) : (
                    <div className="text-sm">{message.content}</div>
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
        <input
          name="prompt"
          value={input}
          onChange={handleInputChange}
          placeholder="Describe the logo you want or ask for modifications..."
          className="flex-1 p-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button 
          type="submit" 
          className="px-3 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
} 