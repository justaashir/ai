import type { Character } from './index';
import type { Message } from 'ai';

export type ModelType = 
  | 'gpt-4o-mini' 
  | 'gpt-4o' 
  | 'claude-3-sonnet'
  | 'gpt-4o-mini-michael'
  | 'gpt-4o-mini-richard'
  | 'gpt-4o-mini-tyrion';

export interface ModelOption {
  id: ModelType;
  name: string;
  description: string;
}

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

export interface SVGPreviewProps {
  svgCode: string;
  onDownload?: () => void;
  size?: 'sm' | 'lg';
  showDownload?: boolean;
  onElementModify?: (prompt: string) => void;
  isInspecting?: boolean;
}

export interface SVGElement {
  id: string;
  type: string;
  attributes: Record<string, string>;
}

export interface InspectIconProps {
  isActive: boolean;
  onClick: () => void;
}

export interface ContextMessage {
  type: 'image' | 'text';
  content: string;
}

export interface QuickActionProps {
  onAction: (action: string) => void;
  onDownload: () => void;
  svgCode: string;
}

export interface OptionSelectorProps {
  options: { svg: string; description: string }[];
  onSelect: (index: number) => void;
  onDownload: (svg: string) => void;
}

export interface VisualInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  contextMessage?: ContextMessage | null;
  onClearContext: () => void;
} 