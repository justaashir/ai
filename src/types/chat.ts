import type { Character } from './index';
import type { Message } from 'ai';

export type ModelType = 
  | 'gpt-4o-mini' 
  | 'gpt-4o' 
  | 'claude-3-sonnet'
  | 'gpt-4o-mini-michael'
  | 'gpt-4o-mini-richard'
  | 'gpt-4o-mini-tyrion';

export interface Group {
  id: string;
  name: string;
  description?: string;
  image?: string;
  models: ModelType[];
  createdAt: Date;
}

export interface Chat {
  id: string;
  type: 'individual' | 'group';
  name: string;
  avatar: string;
  lastMessage?: string;
  timestamp?: Date;
  unreadCount?: number;
  members?: Character[];
  messages: GroupMessage[];
  chainId?: string;
  chainLength: number;
  lastSpeakingCharacter?: string;
}

export interface GroupMessage extends Message {
  characterId?: string;
  showId?: string;
  timestamp?: Date;
}

export interface ContextMessage {
  type: 'image' | 'text';
  content: string;
}
export interface VisualInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  contextMessage?: ContextMessage | null;
  onClearContext: () => void;
} 