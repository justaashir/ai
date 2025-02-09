import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SVGElement } from '../../types/chat';

interface LogoEditorProps {
  svg: string;
  onModify: (action: string) => void;
  onClose: () => void;
}

interface ActionGroup {
  title: string;
  actions: {
    icon: string;
    label: string;
    action: string;
  }[];
}

const actionGroups: ActionGroup[] = [
  {
    title: 'Style',
    actions: [
      { icon: '🎨', label: 'Colors', action: 'Change colors' },
      { icon: '✨', label: 'Effects', action: 'Add effects' },
      { icon: '🖌️', label: 'Stroke', action: 'Modify stroke' }
    ]
  },
  {
    title: 'Transform',
    actions: [
      { icon: '↔️', label: 'Scale', action: 'Resize' },
      { icon: '🔄', label: 'Rotate', action: 'Rotate' },
      { icon: '↕️', label: 'Position', action: 'Reposition' }
    ]
  },
  {
    title: 'Elements',
    actions: [
      { icon: '➕', label: 'Add', action: 'Add element' },
      { icon: '✂️', label: 'Remove', action: 'Remove element' },
      { icon: '🔍', label: 'Arrange', action: 'Rearrange elements' }
    ]
  }
];

export const LogoEditor: React.FC<LogoEditorProps> = ({
  svg,
  onModify,
  onClose
}) => {
  const [selectedElement, setSelectedElement] = useState<SVGElement | null>(null);
  const [history, setHistory] = useState<string[]>([svg]);
  const [activeTab, setActiveTab] = useState<'edit' | 'history'>('edit');

  const handleAction = (action: string) => {
    onModify(action);
    // Add to history after modification
    setHistory(prev => [...prev, svg]);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50"
    >
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          className="bg-white rounded-xl shadow-xl w-full max-w-6xl h-[80vh] flex overflow-hidden"
        >
          {/* Main Editor Area */}
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold">Logo Editor</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 p-8 flex items-center justify-center bg-gray-50">
              <div className="w-96 h-96 bg-white rounded-lg shadow-sm flex items-center justify-center">
                <div className="w-4/5 h-4/5" dangerouslySetInnerHTML={{ __html: svg }} />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 border-l flex flex-col">
            {/* Tabs */}
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab('edit')}
                className={`flex-1 px-4 py-3 text-sm font-medium ${
                  activeTab === 'edit' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600'
                }`}
              >
                Edit
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 px-4 py-3 text-sm font-medium ${
                  activeTab === 'history' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600'
                }`}
              >
                History
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                {activeTab === 'edit' ? (
                  <motion.div
                    key="edit"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="p-4 space-y-6"
                  >
                    {actionGroups.map((group, i) => (
                      <div key={i} className="space-y-3">
                        <h3 className="text-sm font-medium text-gray-900">{group.title}</h3>
                        <div className="grid grid-cols-3 gap-2">
                          {group.actions.map((action, j) => (
                            <button
                              key={j}
                              onClick={() => handleAction(action.action)}
                              className="flex flex-col items-center p-3 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <span className="text-2xl mb-1">{action.icon}</span>
                              <span className="text-xs text-gray-600">{action.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    key="history"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="p-4"
                  >
                    <div className="space-y-4">
                      {history.map((version, i) => (
                        <div key={i} className="p-4 bg-gray-50 rounded-lg">
                          <div className="w-full aspect-square bg-white rounded border flex items-center justify-center">
                            <div className="w-2/3 h-2/3" dangerouslySetInnerHTML={{ __html: version }} />
                          </div>
                          <div className="mt-2 text-center text-sm text-gray-600">
                            Version {i + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}; 