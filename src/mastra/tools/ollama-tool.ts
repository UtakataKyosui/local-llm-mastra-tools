import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { OLLAMA_BASE_URL, OLLAMA_MODEL } from '../models/ollama';

interface OllamaChatResponse {
  message: { content: string };
}

export const ollamaTool = createTool({
  id: 'ollama-generate',
  description: 'Generate text with a local LLM served by Ollama.',
  inputSchema: z.object({
    prompt: z.string().describe('Prompt to send to the model'),
    system: z.string().optional().describe('System prompt'),
    model: z.string().optional().describe('Ollama model name (defaults to OLLAMA_MODEL)'),
  }),
  outputSchema: z.object({
    text: z.string(),
  }),
  execute: async ({ prompt, system, model }) => {
    const messages = [
      ...(system ? [{ role: 'system', content: system }] : []),
      { role: 'user', content: prompt },
    ];
    const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: model ?? OLLAMA_MODEL, messages, stream: false }),
    });
    if (!res.ok) {
      throw new Error(`Ollama request failed: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as OllamaChatResponse;
    return { text: data.message.content };
  },
});
