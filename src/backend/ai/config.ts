import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import type { ModelType } from '../chat/types';

export const openai = createOpenAI({
  apiKey: import.meta.env.OPENAI_API_KEY,
});

export const anthropic = createAnthropic({
  apiKey: import.meta.env.ANTHROPIC_API_KEY,
});

export const getAIClient = (model: ModelType) => {
  switch (model) {
    case 'claude-3-sonnet':
      return anthropic('claude-3-5-sonnet-20240620');
    case 'gpt-4o':
    case 'gpt-4o-mini':
      return openai(model);
    default:
      return openai('gpt-4o-mini');
  }
}; 