export interface Suggestion {
  value: string;
  description?: string;
}

export type TriggerChar = '@' | '/';

export interface Trigger {
  char: TriggerChar;
  query: string;
  start: number;
  end: number;
}

export const PRESET_PROMPTS: Record<string, string[]> = {
  'feed-agent': [
    '最近話題の AI 関連リポジトリは？',
    '今日のテック系ニュースを要約して',
    'フィードを収集してから、新着の記事を教えて',
  ],
  'research-agent': [
    'この技術の最新動向を調べてレポートにまとめて: ',
    '次の 2 つを比較して、違いと使い分けをまとめて: ',
  ],
  'local-agent': [
    'Apple Intelligence で次の文章を要約して: ',
    '使えるツールの一覧と、それぞれでできることを教えて',
  ],
};

// A trigger starts at the beginning of the input or after whitespace, so "a/b" or "foo@bar" do not open suggestions.
export const findTrigger = (text: string, caret: number, chars: TriggerChar[]): Trigger | undefined => {
  const match = /(?:^|\s)([@/])([^\s@/]*)$/.exec(text.slice(0, caret));
  if (!match) return undefined;
  const char = match[1] as TriggerChar;
  if (!chars.includes(char)) return undefined;
  return { char, query: match[2], start: caret - match[2].length - 1, end: caret };
};

export const filterSuggestions = (suggestions: Suggestion[], query: string) => {
  const q = query.toLowerCase();
  return suggestions.filter((s) => s.value.toLowerCase().includes(q));
};

export const applySuggestion = (text: string, trigger: Trigger, value: string) => {
  const inserted = `${trigger.char}${value} `;
  return {
    text: text.slice(0, trigger.start) + inserted + text.slice(trigger.end),
    caret: trigger.start + inserted.length,
  };
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const findMentionedIds = (text: string, ids: string[]) =>
  ids.filter((id) => new RegExp(`(?:^|\\s)@${escapeRegExp(id)}(?=\\s|$)`).test(text));
