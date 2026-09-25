import { Link, createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { ChatMarkdown } from '#/components/ChatMarkdown';
import { getAgentTools } from '#/lib/agent-tools.functions';
import {
  PRESET_PROMPTS,
  applySuggestion,
  filterSuggestions,
  findMentionedIds,
  findTrigger,
} from '#/lib/chat-suggestions';
import type { Suggestion } from '#/lib/chat-suggestions';
import { getFeedStats, runFeedCollection } from '#/lib/feeds.functions';
import { getMcpServers } from '#/lib/settings.functions';

export const Route = createFileRoute('/')({
  component: Agents,
});

interface AgentSummary {
  id: string;
  name: string;
  description?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'error';
  content: string;
  toolCalls?: string[];
}

interface GenerateResponse {
  text?: string;
  steps?: { toolCalls?: { toolName?: string; payload?: { toolName?: string } }[] }[];
}

const RESOURCE_ID = 'web-ui';
const MAX_SUGGESTIONS = 8;

type FeedStats = Awaited<ReturnType<typeof getFeedStats>>;
type McpServer = Awaited<ReturnType<typeof getMcpServers>>[number];

function Agents() {
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [agentId, setAgentId] = useState('feed-agent');
  const [threadId, setThreadId] = useState(() => crypto.randomUUID());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [feedStats, setFeedStats] = useState<FeedStats>([]);
  const [collecting, setCollecting] = useState(false);
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
  const [selectedMcpIds, setSelectedMcpIds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [caret, setCaret] = useState(0);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [agentTools, setAgentTools] = useState<Suggestion[]>([]);

  useEffect(() => {
    getMcpServers()
      .then((servers) => {
        const enabled = servers.filter((server) => server.enabled);
        setMcpServers(enabled);
        setSelectedMcpIds(enabled.map((server) => server.id));
      })
      .catch((error) => console.error(error));
  }, []);

  const toggleMcp = (id: string) =>
    setSelectedMcpIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  useEffect(() => {
    getFeedStats()
      .then(setFeedStats)
      .catch((error) => console.error(error));
  }, []);

  const collect = async () => {
    setCollecting(true);
    try {
      await runFeedCollection();
      setFeedStats(await getFeedStats());
    } catch (error) {
      console.error(error);
    } finally {
      setCollecting(false);
    }
  };

  useEffect(() => {
    fetch('/api/agents')
      .then((res) => res.json() as Promise<Record<string, AgentSummary>>)
      .then((data) => setAgents(Object.values(data)))
      .catch(() => setAgents([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    getAgentTools({ data: { agentId, mcpServerIds: agentId === 'local-agent' ? selectedMcpIds : undefined } })
      .then((tools) => {
        if (!cancelled) setAgentTools(tools.map((tool) => ({ value: tool.name, description: tool.description })));
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setAgentTools([]);
      });
    return () => {
      cancelled = true;
    };
  }, [agentId, selectedMcpIds]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pending]);

  const presetPrompts = PRESET_PROMPTS[agentId] ?? [];
  const trigger = findTrigger(input, caret, agentId === 'local-agent' ? ['@', '/'] : ['/']);
  const suggestions: Suggestion[] =
    dismissed || !focused
      ? []
      : trigger
        ? filterSuggestions(
            trigger.char === '@'
              ? mcpServers.map((server) => ({ value: server.id, description: server.transport }))
              : agentTools,
            trigger.query,
          ).slice(0, MAX_SUGGESTIONS)
        : input === ''
          ? presetPrompts.map((value) => ({ value }))
          : [];
  const highlighted = Math.min(activeIndex, suggestions.length - 1);

  const selectSuggestion = (suggestion: Suggestion) => {
    const next = trigger
      ? applySuggestion(input, trigger, suggestion.value)
      : { text: suggestion.value, caret: suggestion.value.length };
    setInput(next.text);
    setCaret(next.caret);
    setActiveIndex(0);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(next.caret, next.caret);
    });
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (suggestions.length === 0) {
      if (event.key === 'Tab' && input === '' && presetPrompts.length > 0) {
        event.preventDefault();
        selectSuggestion({ value: presetPrompts[0] });
      }
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((highlighted + step + suggestions.length) % suggestions.length);
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      selectSuggestion(suggestions[highlighted]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setDismissed(true);
    }
  };

  const switchAgent = (nextAgentId: string) => {
    setAgentId(nextAgentId);
    setThreadId(crypto.randomUUID());
    setMessages([]);
  };

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const content = input.trim();
    if (!content || pending) return;

    setInput('');
    setDismissed(true);
    setMessages((prev) => [...prev, { role: 'user', content }]);
    setPending(true);
    const mentionedMcpIds = findMentionedIds(
      content,
      mcpServers.map((server) => server.id),
    );
    try {
      const res = await fetch(`/api/agents/${agentId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content }],
          memory: { thread: threadId, resource: RESOURCE_ID },
          ...(agentId === 'local-agent' && {
            requestContext: { mcpServerIds: mentionedMcpIds.length > 0 ? mentionedMcpIds : selectedMcpIds },
          }),
        }),
      });
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      const data = (await res.json()) as GenerateResponse;
      const toolCalls = (data.steps ?? []).flatMap((step) =>
        (step.toolCalls ?? []).map((call) => call.payload?.toolName ?? call.toolName ?? 'tool'),
      );
      setMessages((prev) => [...prev, { role: 'assistant', content: data.text ?? '', toolCalls }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'error', content: String(error) }]);
    } finally {
      setPending(false);
    }
  };

  const current = agents.find((agent) => agent.id === agentId);

  return (
    <main className="page-wrap px-4 py-8">
      <section className="island-shell flex flex-col gap-4 rounded-2xl p-4 sm:p-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <p className="island-kicker mb-1">Mastra Agents</p>
            <p className="m-0 text-sm text-[var(--sea-ink-soft)]">
              {current?.description ?? 'Chat with agents running on local LLMs.'}
            </p>
          </div>
          <select
            value={agentId}
            onChange={(e) => switchAgent(e.target.value)}
            className="rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--sea-ink)]"
          >
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </div>

        {agentId === 'local-agent' && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--sea-ink-soft)]">
            <span>使用する MCP:</span>
            {mcpServers.length === 0 ? (
              <span>
                有効な MCP サーバーがありません（
                <Link to="/settings" className="underline">
                  Settings
                </Link>
                で追加できます）
              </span>
            ) : (
              mcpServers.map((server) => (
                <label
                  key={server.id}
                  className="flex cursor-pointer items-center gap-1 rounded-full border border-[var(--line)] px-2 py-0.5"
                >
                  <input
                    type="checkbox"
                    checked={selectedMcpIds.includes(server.id)}
                    onChange={() => toggleMcp(server.id)}
                  />
                  {server.id}
                </label>
              ))
            )}
          </div>
        )}

        {agentId === 'feed-agent' && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--sea-ink-soft)]">
            {feedStats.length === 0 ? (
              <span>まだフィードを収集していません。</span>
            ) : (
              feedStats.map((stat) => (
                <span key={stat.sourceId} className="rounded-full border border-[var(--line)] px-2 py-0.5">
                  {stat.source}: {stat.items}件
                </span>
              ))
            )}
            {feedStats.length > 0 && (
              <span>
                最終収集: {new Date(Math.max(...feedStats.map((s) => Date.parse(s.lastCollectedAt)))).toLocaleString()}
              </span>
            )}
            <button
              type="button"
              onClick={collect}
              disabled={collecting}
              className="ml-auto rounded-xl border border-[var(--line)] px-3 py-1 text-xs text-[var(--sea-ink)] hover:bg-[var(--link-bg-hover)] disabled:opacity-50"
            >
              {collecting ? '収集中…' : 'フィードを収集'}
            </button>
          </div>
        )}

        <div className="flex min-h-[50vh] flex-col gap-3 overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
          {messages.length === 0 && (
            <p className="m-auto text-sm text-[var(--sea-ink-soft)]">
              調べたいテーマや質問を入力してください。
            </p>
          )}
          {messages.map((message, i) => (
            <div
              key={i}
              className={
                message.role === 'user'
                  ? 'ml-auto max-w-[85%] rounded-2xl bg-[var(--lagoon)] px-4 py-2 text-white'
                  : message.role === 'error'
                    ? 'max-w-[85%] rounded-2xl border border-red-400 px-4 py-2 text-sm text-red-600'
                    : 'max-w-[85%] rounded-2xl bg-[var(--surface-strong)] px-4 py-2 text-[var(--sea-ink)]'
              }
            >
              {message.toolCalls && message.toolCalls.length > 0 && (
                <p className="mb-2 text-xs text-[var(--sea-ink-soft)]">
                  Tools: {message.toolCalls.join(' → ')}
                </p>
              )}
              {message.role === 'assistant' ? (
                <ChatMarkdown content={message.content} />
              ) : (
                <p className="m-0 whitespace-pre-wrap break-words text-sm leading-7">{message.content}</p>
              )}
            </div>
          ))}
          {pending && <p className="text-sm text-[var(--sea-ink-soft)]">考え中…（ローカルモデルで調査しています）</p>}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={send} className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setCaret(e.target.selectionStart ?? e.target.value.length);
                setDismissed(false);
                setActiveIndex(0);
              }}
              onSelect={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
              onFocus={() => {
                setFocused(true);
                setDismissed(false);
              }}
              onBlur={() => setFocused(false)}
              onKeyDown={handleInputKeyDown}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={suggestions.length > 0}
              aria-controls="chat-suggestions"
              aria-activedescendant={suggestions.length > 0 ? `chat-suggestion-${highlighted}` : undefined}
              placeholder={`${presetPrompts[0] ? `例: ${presetPrompts[0]}（Tab で入力）` : '質問を入力'}${
                agentId === 'local-agent' ? '　@ で MCP、/ でツールを指定' : '　/ でツールを指定'
              }`}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2 text-sm text-[var(--sea-ink)]"
            />
            {suggestions.length > 0 && (
              <ul
                id="chat-suggestions"
                role="listbox"
                className="absolute bottom-full left-0 z-10 mb-2 max-h-72 w-full overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] p-1 shadow-lg"
              >
                {suggestions.map((suggestion, i) => (
                  <li
                    key={suggestion.value}
                    id={`chat-suggestion-${i}`}
                    role="option"
                    aria-selected={i === highlighted}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => selectSuggestion(suggestion)}
                    className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm text-[var(--sea-ink)] ${
                      i === highlighted ? 'bg-[var(--link-bg-hover)]' : ''
                    }`}
                  >
                    <span className="font-medium">
                      {trigger ? `${trigger.char}${suggestion.value}` : suggestion.value}
                    </span>
                    {suggestion.description && (
                      <span className="ml-2 truncate text-xs text-[var(--sea-ink-soft)]">{suggestion.description}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="submit"
            disabled={pending || !input.trim()}
            className="rounded-xl bg-[var(--lagoon-deep)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </section>
    </main>
  );
}
