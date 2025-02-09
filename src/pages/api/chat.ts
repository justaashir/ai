import type { APIRoute } from 'astro';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';

const openai = createOpenAI({
  apiKey: import.meta.env.OPENAI_API_KEY,
});
const anthropic = createAnthropic({
  apiKey: import.meta.env.ANTHROPIC_API_KEY,
});

// Allow responses up to 5 minutes
export const maxDuration = 300;

const LOGO_SYSTEM_PROMPT = `You are a master SVG logo designer specializing in creating iconic, themed logos. For each request, generate 3 distinct design options.

IMPORTANT: For each option, you MUST provide both the description AND the SVG code immediately after each option description.

Format your response exactly like this:

Option 1: [Brief description]
[SVG code for option 1]

Option 2: [Brief description]
[SVG code for option 2]

Option 3: [Brief description]
[SVG code for option 3]

Which option would you like me to implement?

Technical Requirements for each SVG:
- Use viewBox="0 0 48 48"
- Include xmlns="http://www.w3.org/2000/svg"
- Use semantic elements (circle, rect, path)
- Keep designs static (no animations)
- Use hex colors (e.g., #FF4554, #3B4CCA)
- Ensure all paths are properly closed
- Center all elements in viewport

Design Guidelines:
- Keep designs minimal and professional
- Use maximum 3 colors per design
- Implement smooth curves
- Create clear silhouettes
- Ensure scalability
- Use meaningful negative space

After user selects an option, provide:
1. Design Rationale
2. Color Symbolism
3. Element Breakdown
4. Usage Suggestions

Remember: Each design should tell a unique story while maintaining professional polish.`;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { messages } = await request.json();
    const url = new URL(request.url);
    const model = url.searchParams.get('model') || 'gpt-4o-mini';
    
    // Check if this is a logo-related request
    const isLogoRequest = messages.some((m: { content: string }) => 
      m.content.toLowerCase().includes('logo') || 
      m.content.toLowerCase().includes('svg')
    );

    // Check if this is an iteration request (has [Option X] in the last message)
    const isIteration = messages.length > 0 && 
      messages[messages.length - 1].role === 'user' && 
      messages[messages.length - 1].content.includes('[Option');

    // If it's an iteration, modify the system prompt to request only SVG
    const systemPrompt = isIteration 
      ? `You are a logo design AI. For iteration requests, respond ONLY with the modified SVG code based on the user's request. Do not include any explanations or rationale.`
      : LOGO_SYSTEM_PROMPT;

    const result = streamText({
      model: model === 'claude-3-sonnet' 
        ? anthropic('claude-3-5-sonnet-20240620')
        : openai(model as 'gpt-4o-mini' | 'gpt-4o'),
      messages: isLogoRequest ? [
        { role: 'system', content: systemPrompt },
        ...messages
      ] : messages,
      temperature: isLogoRequest ? 0.7 : 0.5,
      onError: (error) => {
        console.error('Error in chat:', error);
      }
    });

    return result.toDataStreamResponse();
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to process chat request' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}; 