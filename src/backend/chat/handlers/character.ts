import { streamText } from 'ai';
import type { ChatHandler, HandlerContext } from '../types';
import { getAIClient } from '../../ai/config';
import { shows } from '../../../config/shows';
import type { Character } from '../../../types';

export class CharacterChatHandler implements ChatHandler {
  canHandle(context: HandlerContext): boolean {
    const { messages } = context;
    const lastMessage = messages[messages.length - 1];
    
    // Check if the last message mentions a character
    if (lastMessage?.role === 'user') {
      const mentionMatch = lastMessage.content.match(/@([\w-]+)/);
      if (mentionMatch) {
        const characterId = mentionMatch[1];
        return this.findCharacter(characterId) !== null;
      }
    }
    
    return false;
  }

  private findCharacter(characterId: string): Character | null {
    for (const show of Object.values(shows)) {
      const character = show.characters.find(char => char.id === characterId);
      if (character) {
        return character;
      }
    }
    return null;
  }

  async handle(context: HandlerContext): Promise<Response> {
    const { messages } = context;
    const lastMessage = messages[messages.length - 1];
    const mentionMatch = lastMessage.content.match(/@([\w-]+)/);
    const characterId = mentionMatch![1];
    const character = this.findCharacter(characterId)!;

    const result = streamText({
      model: getAIClient(character.baseModel as any), // TODO: Fix type
      messages: [
        { 
          role: 'system', 
          content: `${character.prompt}\n\nIMPORTANT: Always start your response with [${character.name}] followed by your message.`
        },
        ...messages.map(msg => ({
          ...msg,
          content: msg.content.replace(/@[\w-]+/g, '').trim() // Remove character mentions
        }))
      ],
      temperature: 0.7,
      onError: (error) => {
        console.error('Error in character chat handler:', error);
      }
    });

    return result.toDataStreamResponse();
  }
} 