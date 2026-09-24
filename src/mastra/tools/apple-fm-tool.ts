import { spawn } from 'node:child_process';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const FM_BIN = process.env.FM_BIN ?? '/usr/bin/fm';

const runFm = (args: string[], input: string) =>
  new Promise<string>((resolve, reject) => {
    const child = spawn(FM_BIN, args, { env: { ...process.env, NO_COLOR: '1' } });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0 ? resolve(stdout.trim()) : reject(new Error(`fm exited with ${code}: ${stderr.trim()}`)),
    );
    // Pass the prompt via stdin so that prompts starting with "-" are not parsed as options.
    child.stdin.end(input);
  });

export const appleFmTool = createTool({
  id: 'apple-fm-generate',
  description:
    'Generate text with the on-device Apple Foundation Model (Apple Intelligence on macOS) via the fm CLI.',
  inputSchema: z.object({
    prompt: z.string().describe('Prompt to send to the model'),
    instructions: z.string().optional().describe('Instructions for the model to follow'),
  }),
  outputSchema: z.object({
    text: z.string(),
  }),
  execute: async ({ prompt, instructions }) => {
    const args = ['respond', '--no-stream', ...(instructions ? ['--instructions', instructions] : [])];
    return { text: await runFm(args, prompt) };
  },
});
