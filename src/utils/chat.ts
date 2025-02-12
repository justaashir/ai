import { getCharacterById } from '../config';
import type { GroupMessage } from '../types/chat';

export const getMessageSender = (message: GroupMessage, chatType: 'individual' | 'group') => {
  if (message.role === 'user') return 'You';
  
  if (chatType === 'group') {
    const character = message.characterId ? getCharacterById(message.characterId) : undefined;
    if (!character) return 'Assistant';
    return `${character.name} (${character.role})`;
  }
  
  return ''; // Don't show name in individual chats
};

export const formatTime = (date: Date) => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const extractMentions = (content: string): string[] => {
  const mentions = Array.from(content.matchAll(/@([\w-]+)/g));
  return mentions.map(match => match[1]);
}; 