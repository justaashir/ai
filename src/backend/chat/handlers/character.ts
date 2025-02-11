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

  private getRecentCharacters(messages: HandlerContext['messages']): Character[] {
    const characters: Character[] = [];
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

  private processMessages(messages: HandlerContext['messages'], currentCharacter: Character): { role: 'system' | 'user' | 'assistant'; content: string; }[] {
    const processedMessages: { role: 'system' | 'user' | 'assistant'; content: string; }[] = [];
    const recentCharacters = this.getRecentCharacters(messages);
    
    // Find the last few relevant messages for context
    const relevantMessages = messages.slice(-10); // Keep last 10 messages for context
    
    for (const msg of relevantMessages) {
      let content = msg.content;
      let role = msg.role as 'system' | 'user' | 'assistant';
      
      // Extract character name if present
      const nameMatch = content.match(/^\[([\w\s-]+)\]/);
      const characterName = nameMatch ? nameMatch[1] : null;
      const character = characterName ? this.findCharacterByName(characterName) : null;
      
      // Remove the character name prefix if present
      if (nameMatch) {
        content = content.replace(/^\[[\w\s-]+\]\s*/, '');
      }
      
      // Process the content to ensure proper @ mentions
      if (character || role === 'user') {
        // Replace character names with @ mentions
        for (const otherChar of recentCharacters) {
          const nameRegex = new RegExp(`\\b${otherChar.name}\\b`, 'gi');
          content = content.replace(nameRegex, `@${otherChar.id}`);
        }
      }
      
      // For user messages mentioning a character, format properly
      if (role === 'user') {
        const mentionMatch = content.match(/@([\w-]+)/);
        if (mentionMatch) {
          const mentionedChar = this.findCharacter(mentionMatch[1]);
          if (mentionedChar) {
            // Keep the @mention in the message for better context
            content = content.trim();
          }
        }
      }
      
      processedMessages.push({ role, content });
    }
    
    return processedMessages;
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

    const { messages, chainLength = 0, character } = context;
    
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

    const recentCharacters = this.getRecentCharacters(messages);
    const processedMessages = this.processMessages(messages, characterConfig);
    
    // Add consistent delay for better UX
    await new Promise(resolve => 
      setTimeout(resolve, CHAT_CONSTANTS.MIN_ASSISTANT_DELAY_MS)
    );

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

RESPONSE FORMAT:
[${characterConfig.name}] Your message here...

RULES:
- Never break character
- Never respond as "Assistant"
- Always include your name in brackets at the start
- Always use @mentions for other characters
- Keep responses natural and conversational
- Reference what others have said when appropriate
- Keep responses concise
- Continue conversations naturally`
        },
        ...processedMessages,
        // Add an explicit prompt to respond
        {
          role: 'system',
          content: `FINAL REMINDER:
- You are [${characterConfig.name}]
- Start your response with [${characterConfig.name}]
- Stay in character
- Use @mentions for: ${recentCharacters.map(char => `@${char.id}`).join(' ')}
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