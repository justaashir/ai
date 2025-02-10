import type { APIRoute } from 'astro';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
}

export interface HandlerContext {
  request: Request;
  messages: ChatMessage[];
  model: string;
}

export interface ChatHandler {
  canHandle: (context: HandlerContext) => boolean;
  handle: (context: HandlerContext) => Promise<Response>;
}

export type ModelType = 'gpt-4o-mini' | 'gpt-4o' | 'claude-3-sonnet';

export interface AIConfig {
  temperature?: number;
  systemPrompt?: string;
} 