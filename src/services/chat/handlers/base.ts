import { streamText } from 'ai';
import type { ChatHandler, HandlerContext } from '../types';
import { getAIClient } from '../../ai/config';

export class BaseChatHandler implements ChatHandler {
  canHandle(_context: HandlerContext): boolean {
    // Base handler always returns true as it's the fallback
    return true;
  }

  async handle(context: HandlerContext): Promise<Response> {
    const { messages, model } = context;

    const result = streamText({
      model: getAIClient(model as any), // TODO: Fix type
      messages,
      temperature: 0.5,
      onError: (error) => {
        console.error('Error in base chat handler:', error);
      }
    });

    return result.toDataStreamResponse();
  }
} 