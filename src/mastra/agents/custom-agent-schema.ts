import { z } from 'zod';

// Keys are the tool names the model sees, matching the built-in agents.
export const BUILTIN_TOOL_LABELS = {
  webSearchTool: 'Web 検索',
  fetchPageTool: 'Web ページ取得',
  searchFeedsTool: 'フィード検索',
  listFeedSourcesTool: 'フィードソース一覧',
  collectFeedsTool: 'フィード収集',
  appleFmTool: 'Apple Intelligence',
  ollamaTool: 'Ollama 生成',
} as const;

export type BuiltinToolName = keyof typeof BUILTIN_TOOL_LABELS;

const builtinToolNames = Object.keys(BUILTIN_TOOL_LABELS) as [BuiltinToolName, ...BuiltinToolName[]];

export const customAgentSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'id は英小文字・数字・ハイフンのみ（先頭は英小文字か数字）'),
  name: z.string().trim().min(1, '名前を入力してください'),
  description: z.string().default(''),
  instructions: z.string().trim().min(1, '指示文を入力してください'),
  model: z.string().trim().default(''),
  mcpServerIds: z.array(z.string()).default([]),
  builtinTools: z.array(z.enum(builtinToolNames)).default([]),
  maxSteps: z.number().int().min(1).max(50).nullable().default(null),
});

export type CustomAgentConfig = z.infer<typeof customAgentSchema>;
