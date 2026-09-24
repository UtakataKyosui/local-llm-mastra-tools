import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

export const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'gemma4:e4b';

const ollama = createOpenAICompatible({
  name: 'ollama',
  baseURL: `${OLLAMA_BASE_URL}/v1`,
});

export const ollamaModel = (modelId = OLLAMA_MODEL) => ollama.chatModel(modelId);
