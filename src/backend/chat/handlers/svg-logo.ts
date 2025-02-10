import { streamText } from 'ai';
import type { ChatHandler, HandlerContext } from '../types';
import { LOGO_SYSTEM_PROMPT, LOGO_ITERATION_PROMPT } from '../prompts/svg-logo';
import { getAIClient } from '../../ai/config';

export class SVGLogoHandler implements ChatHandler {
  canHandle(context: HandlerContext): boolean {
    const { messages } = context;
    return messages.some(m => 
      m.content.toLowerCase().includes('logo') || 
      m.content.toLowerCase().includes('svg')
    );
  }

  private isIterationRequest(messages: HandlerContext['messages']): boolean {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'user') return false;
    
    const content = lastMessage.content.toLowerCase();
    return content.includes('modify option') ||
           content.includes('change option') ||
           content.includes('update option') ||
           /\[option \d+\].*(?:modify|change|update|adjust)/i.test(content);
  }

  private processRequestedNumber(messages: HandlerContext['messages']): HandlerContext['messages'] {
    const lastMessage = messages[messages.length - 1]?.content.toLowerCase() || '';
    const numberMatch = lastMessage.match(/generate (\d+)|create (\d+)|make (\d+)/);
    const requestedNumber = numberMatch ? 
      parseInt(numberMatch[1] || numberMatch[2] || numberMatch[3]) : null;

    if (requestedNumber && requestedNumber < 3) {
      return [
        ...messages.slice(0, -1),
        {
          role: 'assistant',
          content: `I'll generate 3 options for the best results, as this allows for better comparison and selection. Here they are:`
        },
        {
          role: 'user',
          content: messages[messages.length - 1].content.replace(/\d+/, '3')
        }
      ];
    }

    return messages;
  }

  async handle(context: HandlerContext): Promise<Response> {
    const { messages, model } = context;
    const isIteration = this.isIterationRequest(messages);
    const processedMessages = this.processRequestedNumber(messages);

    const result = streamText({
      model: getAIClient(model as any), // TODO: Fix type
      messages: [
        { 
          role: 'system', 
          content: isIteration ? LOGO_ITERATION_PROMPT : LOGO_SYSTEM_PROMPT 
        },
        ...processedMessages
      ],
      temperature: 0.7,
      onError: (error) => {
        console.error('Error in SVG logo handler:', error);
      }
    });

    return result.toDataStreamResponse();
  }
} 