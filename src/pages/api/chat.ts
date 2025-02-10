import type { APIRoute } from 'astro';
import { SVGLogoHandler } from '../../services/chat/handlers/svg-logo';
import { BaseChatHandler } from '../../services/chat/handlers/base';
import type { ChatRequest } from '../../services/chat/types';

// Allow responses up to 5 minutes
export const maxDuration = 300;

// Initialize handlers in order of specificity
const handlers = [
  new SVGLogoHandler(),
  new BaseChatHandler(),
];

export const POST: APIRoute = async ({ request }) => {
  try {
    const { messages } = await request.json() as ChatRequest;
    const url = new URL(request.url);
    const model = url.searchParams.get('model') || 'gpt-4o-mini';

    const context = {
      request,
      messages,
      model,
    };

    // Find the first handler that can handle this request
    const handler = handlers.find(h => h.canHandle(context));
    if (!handler) {
      throw new Error('No handler found for request');
    }

    return await handler.handle(context);
  } catch (error) {
    console.error('Error processing chat request:', error);
    return new Response(JSON.stringify({ error: 'Failed to process chat request' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}; 