import { streamText } from 'ai';
import type { ChatHandler, HandlerContext, ChatResponse } from '../types';
import { getAIClient } from '../../ai/config';
import { shows } from '../../../config/shows';
import type { Character } from '../../../types';
import { CHAT_CONSTANTS } from '../types';

export class CharacterChatHandler implements ChatHandler {
  canHandle(context: HandlerContext): boolean {
    // Check if we have a character in context or if it's a termination command
    if (this.shouldTerminate(context)) {
      return true;
    }
    
    return !!context.character && this.findCharacter(context.character) !== null;
  }

  private shouldTerminate(context: HandlerContext): boolean {
    const { messages, terminate } = context;
    if (terminate) return true;
    
    const lastMessage = messages[messages.length - 1];
    return lastMessage.content.toLowerCase() === CHAT_CONSTANTS.TERMINATE_COMMAND;
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

  private findCharacterByName(name: string): Character | null {
    for (const show of Object.values(shows)) {
      const character = show.characters.find(char => 
        char.name.toLowerCase() === name.toLowerCase() ||
        char.name.toLowerCase().includes(name.toLowerCase())
      );
      if (character) {
        return character;
      }
    }
    return null;
  }

  private getRecentCharacters(messages: HandlerContext['messages'], showId?: string): Character[] {
    const characters: Character[] = [];
    
    // If showId is provided, get all characters from that show first
    if (showId) {
      const show = Object.values(shows).find(s => s.id === showId);
      if (show) {
        characters.push(...show.characters);
      }
    }
    
    // Then add any characters mentioned in messages
    for (const msg of messages) {
      // Check for character name in brackets
      const nameMatch = msg.content.match(/^\[([\w\s-]+)\]/);
      if (nameMatch) {
        const character = this.findCharacterByName(nameMatch[1]);
        if (character && !characters.find(c => c.id === character.id)) {
          characters.push(character);
        }
      }
      
      // Check for @ mentions
      const mentions = Array.from(msg.content.matchAll(/@([\w-]+)/g));
      for (const mention of mentions) {
        const character = this.findCharacter(mention[1]);
        if (character && !characters.find(c => c.id === character.id)) {
          characters.push(character);
        }
      }
    }
    return characters;
  }

  async handle(context: HandlerContext): Promise<Response> {
    // Check for termination
    if (this.shouldTerminate(context)) {
      const response: ChatResponse = {
        content: "Chat terminated. Starting fresh conversation.",
        terminated: true,
        timestamp: Date.now()
      };
      return new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { messages, chainLength = 0, character, showId } = context;
    
    if (!character) {
      return new Response(JSON.stringify({
        content: "No character specified.",
        timestamp: Date.now()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const characterConfig = this.findCharacter(character);
    
    if (!characterConfig) {
      return new Response(JSON.stringify({
        content: "Character not found.",
        timestamp: Date.now()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check chain length after character identification
    if (chainLength >= CHAT_CONSTANTS.MAX_CHAIN_LENGTH) {
      return new Response(JSON.stringify({
        content: `[${characterConfig.name}] I need to pause for a moment. Let's continue our conversation after a brief break.`,
        timestamp: Date.now()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get recent messages and characters involved in the conversation
    const recentCharacters = this.getRecentCharacters(messages, showId);
    
    // Add consistent delay for better UX
    await new Promise(resolve => 
      setTimeout(resolve, CHAT_CONSTANTS.MIN_ASSISTANT_DELAY_MS)
    );

    // Get the last few messages for context
    const lastMessages = messages.slice(-5); // Get last 5 messages for immediate context
    const mentionedCharacters = new Set<string>();
    
    // Extract all mentioned characters from recent messages
    lastMessages.forEach(msg => {
      const mentions = Array.from(msg.content.matchAll(/@([\w-]+)/g));
      mentions.forEach(mention => {
        mentionedCharacters.add(mention[1]);
      });
    });

    const result = streamText({
      model: getAIClient(characterConfig.baseModel as any),
      messages: [
        { 
          role: 'system', 
          content: `${characterConfig.prompt}\n\nCRITICAL INSTRUCTIONS - YOU MUST FOLLOW THESE EXACTLY:

1. You are ${characterConfig.name}. You must ALWAYS stay in character.
2. You MUST start EVERY response with [${characterConfig.name}]
3. When mentioning other characters, you MUST use their @mention:
${recentCharacters.map(char => `   - Use @${char.id} when referring to ${char.name}`).join('\n')}

CONVERSATION CONTEXT:
- You are responding to the most recent message
- Only reference characters who were actually mentioned or involved in the recent conversation
- Stay focused on the current topic and context of the conversation

RESPONSE FORMAT:
[${characterConfig.name}] Your message here...

RULES:
- Never break character
- Never respond as "Assistant"
- Always include your name in brackets at the start
- Use @mentions only for characters actually involved in the conversation
- Keep responses natural and conversational
- Reference what others have actually said in the conversation
- Keep responses concise
- Stay relevant to the current context`
        },
        ...messages,
        {
          role: 'system',
          content: `FINAL REMINDER:
- You are [${characterConfig.name}]
- Start your response with [${characterConfig.name}]
- Stay in character
- Only mention characters who are actually part of this conversation
- Never respond as "Assistant"`
        }
      ],
      temperature: 0.7,
      onError: (error) => {
        console.error('Error in character chat handler:', error);
      }
    });

    return result.toDataStreamResponse();
  }
} 