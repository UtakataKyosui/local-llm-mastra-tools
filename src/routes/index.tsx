import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { getFeedStats, runFeedCollection } from '#/lib/feeds.functions';

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

type FeedStats = Awaited<ReturnType<typeof getFeedStats>>;

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
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pending]);

  const resetThread = (nextAgentId = agentId) => {
    setAgentId(nextAgentId);
    setThreadId(crypto.randomUUID());
    setMessages([]);
  };

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const content = input.trim();
    if (!content || pending) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content }]);
    setPending(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content }],
          memory: { thread: threadId, resource: RESOURCE_ID },
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
            onChange={(e) => resetThread(e.target.value)}
            className="rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--sea-ink)]"
          >
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => resetThread()}
            className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)]"
          >
            New thread
          </button>
        </div>

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
              <p className="m-0 whitespace-pre-wrap break-words text-sm leading-7">{message.content}</p>
            </div>
          ))}
          {pending && <p className="text-sm text-[var(--sea-ink-soft)]">考え中…（ローカルモデルで調査しています）</p>}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={send} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="例: 最近話題の AI 関連リポジトリは？"
            className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2 text-sm text-[var(--sea-ink)]"
          />
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
