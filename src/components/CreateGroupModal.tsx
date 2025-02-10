'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Image as ImageIcon, Check } from 'lucide-react';
import type { ModelType } from '../types/chat';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (name: string, description: string, models: ModelType[], image?: File) => void;
}

const AVAILABLE_MODELS: { id: ModelType; name: string }[] = [
  { id: 'gpt-4o-mini', name: 'GPT-4 Optimized Mini' },
  { id: 'gpt-4o', name: 'GPT-4 Optimized' },
  { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet' },
];

export function CreateGroupModal({ isOpen, onClose, onCreateGroup }: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedModels, setSelectedModels] = useState<Set<ModelType>>(new Set(['gpt-4o-mini']));
  const [groupImage, setGroupImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setGroupImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleModel = (model: ModelType) => {
    const newModels = new Set(selectedModels);
    if (newModels.has(model)) {
      if (newModels.size > 1) { // Ensure at least one model is selected
        newModels.delete(model);
      }
    } else {
      newModels.add(model);
    }
    setSelectedModels(newModels);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (groupName.trim()) {
      onCreateGroup(groupName, description, Array.from(selectedModels), groupImage || undefined);
      setGroupName('');
      setDescription('');
      setSelectedModels(new Set(['gpt-4o-mini']));
      setGroupImage(null);
      setImagePreview(null);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">Create New Group</h2>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="flex items-center justify-center">
                <div className="relative">
                  <div className={`
                    w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200
                    flex items-center justify-center bg-gray-50
                    ${imagePreview ? 'hover:opacity-90' : 'hover:bg-gray-100'}
                    transition-all cursor-pointer
                  `}>
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Group"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                  <div className="absolute bottom-0 right-0">
                    <div className="bg-[#00a884] rounded-full p-1.5 border-2 border-white shadow-sm">
                      <Plus className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Group Name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00a884] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Group Description (optional)"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00a884] focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">AI Models</label>
                <div className="space-y-2">
                  {AVAILABLE_MODELS.map((model) => (
                    <div
                      key={model.id}
                      onClick={() => toggleModel(model.id)}
                      className={`
                        flex items-center justify-between p-2 rounded-lg cursor-pointer
                        ${selectedModels.has(model.id)
                          ? 'bg-[#e7f8f5] border-[#00a884] text-[#00a884]'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                        }
                        border transition-colors
                      `}
                    >
                      <span className="font-medium">{model.name}</span>
                      {selectedModels.has(model.id) && (
                        <Check className="w-5 h-5" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00a884] text-white rounded-lg hover:bg-[#008f6f] transition-colors focus:outline-none focus:ring-2 focus:ring-[#00a884] focus:ring-offset-2"
                >
                  Create Group
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 