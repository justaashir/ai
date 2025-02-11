import type { APIRoute } from 'astro';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: number;
  chainId?: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  terminate?: boolean;
  lastResponseTime?: number;
}

export interface HandlerContext {
  request: Request;
  messages: ChatMessage[];
  model: string;
  terminate?: boolean;
  lastResponseTime?: number;
  chainLength?: number;
}

export interface ChatHandler {
  canHandle: (context: HandlerContext) => boolean;
  handle: (context: HandlerContext) => Promise<Response>;
}

export interface ChatResponse {
  content: string;
  terminated?: boolean;
  chainId?: string;
  timestamp: number;
}

// Constants for chat control
export const CHAT_CONSTANTS = {
  MIN_ASSISTANT_DELAY_MS: 2000,
  MAX_ASSISTANT_DELAY_MS: 2500,
  MAX_CHAIN_LENGTH: 20,
  TERMINATE_COMMAND: 'terminate'
} as const;

export type ModelType = 'gpt-4o-mini' | 'gpt-4o' | 'claude-3-sonnet';

export interface AIConfig {
  temperature?: number;
  systemPrompt?: string;
} 