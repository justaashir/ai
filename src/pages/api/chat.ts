import type { APIRoute } from 'astro';
import { SVGLogoHandler } from '../../backend/chat/handlers/svg-logo';
import { BaseChatHandler } from '../../backend/chat/handlers/base';
import { CharacterChatHandler } from '../../backend/chat/handlers/character';
import type { ChatRequest } from '../../backend/chat/types';
import { CHAT_CONSTANTS } from '../../backend/chat/types';
import { shows } from '../../config/shows';

// Allow responses up to 5 minutes
export const maxDuration = 300;

// Initialize handlers in order of specificity
const handlers = [
  new SVGLogoHandler(),
  new CharacterChatHandler(),
  new BaseChatHandler(),
];

export const POST: APIRoute = async ({ request }) => {
  try {
    const { messages, lastResponseTime } = await request.json() as ChatRequest;
    const url = new URL(request.url);
    const model = url.searchParams.get('model') || 'gpt-4';
    const character = url.searchParams.get('character');
    const showId = url.searchParams.get('show');

    // Check for termination command
    const lastMessage = messages[messages.length - 1];
    const isTerminate = lastMessage.content.toLowerCase() === CHAT_CONSTANTS.TERMINATE_COMMAND;

    // If this is a group chat (show parameter exists)
    if (showId) {
      const show = Object.values(shows).find(s => s.id === showId);
      if (!show) {
        throw new Error('Show not found');
      }

      // Extract mentioned character from the message
      const mentionMatch = lastMessage.content.match(/@([\w-]+)/);
      const mentionedCharId = mentionMatch ? mentionMatch[1] : null;
      
      // If no mention, use the first character
      const targetCharacter = mentionedCharId 
        ? show.characters.find(c => c.id === mentionedCharId)
        : show.characters[0];

      if (!targetCharacter) {
        throw new Error('Character not found');
      }

      const context = {
        request,
        messages,
        model,
        character: targetCharacter.id,
        showId,
        terminate: isTerminate,
        lastResponseTime,
        chainLength: messages.filter(m => m.chainId === messages[messages.length - 1].chainId).length
      };

      const handler = handlers.find(h => h.canHandle(context));
      if (!handler) {
        throw new Error('No handler found for request');
      }

      return await handler.handle(context);
    }

    // Individual chat
    const context = {
      request,
      messages,
      model,
      character,
      terminate: isTerminate,
      lastResponseTime,
      chainLength: messages.filter(m => m.chainId === messages[messages.length - 1].chainId).length
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