export type ModelType = 'gpt-4o-mini' | 'gpt-4o' | 'claude-3-sonnet';

export interface Character {
  id: string;
  name: string;
  role: string;
  avatar: string;
  baseModel: ModelType;
  prompt: string;
}

export interface ShowConfig {
  id: string;
  name: string;
  description: string;
  image?: string;
  characters: Character[];
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface GroupMessage extends Message {
  characterId?: string;
  showId?: string;
  timestamp?: Date;
}

export interface ContextMessage {
  type: 'option';
  optionNumber: number;
  svg: string;
} 