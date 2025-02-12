import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { getAllCharacters, shows } from '../../config';
import type { Character } from '../../types';

interface NewChatViewProps {
  onBack: () => void;
  onSelectCharacter: (character: Character) => void;
  onSelectGroup: (show: typeof shows[keyof typeof shows]) => void;
}

export function NewChatView({ onBack, onSelectCharacter, onSelectGroup }: NewChatViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      className="flex flex-col h-full"
    >
      {/* New Chat Header */}
      <div className="bg-[#008069] px-4 py-3 flex items-center gap-6 flex-shrink-0">
        <button
          onClick={onBack}
          className="p-1 hover:bg-white/10 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h2 className="text-white font-semibold">New Chat</h2>
      </div>

      {/* Available Characters - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="py-3 space-y-1">
          <div className="px-4 py-2 text-sm font-medium text-[#008069]">Individual Chats</div>
          {getAllCharacters().map((character) => (
            <div
              key={character.id}
              onClick={() => onSelectCharacter(character)}
              className="px-3 py-2 flex items-center gap-3 hover:bg-[#f0f2f5] cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-[#00a884] flex items-center justify-center flex-shrink-0">
                {typeof character.avatar === 'string' && character.avatar.startsWith('http') ? (
                  <img 
                    src={character.avatar} 
                    alt={character.name} 
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span className="text-white text-lg">{character.name.charAt(0)}</span>
                )}
              </div>
              <div>
                <div className="font-medium text-[#111b21]">{character.name}</div>
                <div className="text-sm text-[#667781]">{character.role}</div>
              </div>
            </div>
          ))}

          {/* Available Groups */}
          <div className="px-4 py-2 text-sm font-medium text-[#008069] mt-4">Group Chats</div>
          {Object.values(shows).map((show) => (
            <div
              key={show.id}
              onClick={() => onSelectGroup(show)}
              className="px-3 py-2 flex items-center gap-3 hover:bg-[#f0f2f5] cursor-pointer"
            >
              <div className="w-12 h-12 rounded-lg bg-[#00a884] flex items-center justify-center flex-shrink-0">
                {show.image ? (
                  <img src={show.image} alt={show.name} className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <span className="text-white text-lg">{show.name.charAt(0)}</span>
                )}
              </div>
              <div>
                <div className="font-medium text-[#111b21]">{show.name}</div>
                <div className="text-sm text-[#667781] flex items-center gap-1">
                  <span>{show.characters.length} participants</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
} 