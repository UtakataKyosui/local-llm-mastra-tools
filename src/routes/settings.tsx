import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  checkMcpServer,
  getCustomAgents,
  getFeedSources,
  getMcpServers,
  removeCustomAgent,
  removeFeedSource,
  removeMcpServer,
  upsertCustomAgent,
  upsertFeedSource,
  upsertMcpServer,
} from '#/lib/settings.functions';
import { BUILTIN_TOOL_LABELS } from '#/mastra/agents/custom-agent-schema';
import type { BuiltinToolName } from '#/mastra/agents/custom-agent-schema';

export const Route = createFileRoute('/settings')({
  component: Settings,
});

type FeedSource = Awaited<ReturnType<typeof getFeedSources>>[number];
type McpServer = Awaited<ReturnType<typeof getMcpServers>>[number];
type CustomAgent = Awaited<ReturnType<typeof getCustomAgents>>[number];

const inputClass =
  'min-w-0 rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--sea-ink)]';
const buttonClass =
  'rounded-xl border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--sea-ink)] hover:bg-[var(--link-bg-hover)] disabled:opacity-50';
const primaryButtonClass =
  'rounded-xl bg-[var(--lagoon-deep)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';

const parseKeyValueLines = (text: string) =>
  Object.fromEntries(
    text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const index = line.indexOf('=');
        return index === -1 ? [line, ''] : [line.slice(0, index).trim(), line.slice(index + 1).trim()];
      }),
  );

const formatKeyValueLines = (record: Record<string, string>) =>
  Object.entries(record)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

function Settings() {
  return (
    <main className="page-wrap flex flex-col gap-6 px-4 py-8">
      <FeedSourcesSection />
      <McpServersSection />
      <CustomAgentsSection />
    </main>
  );
}

function Section({ kicker, description, children }: { kicker: string; description: string; children: ReactNode }) {
  return (
    <section className="island-shell flex flex-col gap-4 rounded-2xl p-4 sm:p-6">
      <div>
        <p className="island-kicker mb-1">{kicker}</p>
        <p className="m-0 text-sm text-[var(--sea-ink-soft)]">{description}</p>
      </div>
      {children}
    </section>
  );
}

const emptyFeedForm = {
  id: '',
  name: '',
  type: 'rss' as FeedSource['type'],
  url: '',
  language: '',
  since: 'daily' as 'daily' | 'weekly' | 'monthly',
  enabled: true,
};

function FeedSourcesSection() {
  const [sources, setSources] = useState<FeedSource[]>([]);
  const [form, setForm] = useState(emptyFeedForm);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');

  const reload = () =>
    getFeedSources()
      .then(setSources)
      .catch((e) => setError(errorMessage(e)));

  useEffect(() => {
    reload();
  }, []);

  const toPayload = (f: typeof form): FeedSource =>
    f.type === 'rss'
      ? { id: f.id, name: f.name, enabled: f.enabled, type: 'rss', url: f.url }
      : {
          id: f.id,
          name: f.name,
          enabled: f.enabled,
          type: 'github-trending',
          language: f.language || undefined,
          since: f.since,
        };

  const save = async (source: FeedSource) => {
    setError('');
    try {
      await upsertFeedSource({ data: source });
      await reload();
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (await save(toPayload(form))) {
      setForm(emptyFeedForm);
      setEditing(false);
    }
  };

  const edit = (source: FeedSource) => {
    setEditing(true);
    setForm({
      ...emptyFeedForm,
      ...source,
      url: source.type === 'rss' ? source.url : '',
      language: source.type === 'github-trending' ? (source.language ?? '') : '',
      since: source.type === 'github-trending' ? source.since : 'daily',
    });
  };

  const remove = async (id: string) => {
    setError('');
    try {
      await removeFeedSource({ data: { id } });
      await reload();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <Section
      kicker="Feed Sources"
      description="収集対象の RSS / Atom フィードと GitHub Trending。収集済みの記事は削除しても残ります。"
    >
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {sources.map((source) => (
          <li
            key={source.id}
            className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
          >
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={source.enabled}
                onChange={(e) => save({ ...source, enabled: e.target.checked })}
              />
              <span className="font-semibold text-[var(--sea-ink)]">{source.name}</span>
            </label>
            <span className="min-w-0 flex-1 truncate text-xs text-[var(--sea-ink-soft)]">
              {source.type === 'rss'
                ? source.url
                : `GitHub Trending ${source.language ?? 'all languages'} / ${source.since}`}
            </span>
            <button type="button" className={buttonClass} onClick={() => edit(source)}>
              編集
            </button>
            <button type="button" className={buttonClass} onClick={() => remove(source.id)}>
              削除
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={submit} className="grid gap-2 sm:grid-cols-2">
        <input
          className={inputClass}
          placeholder="id (例: google-news-ai)"
          value={form.id}
          disabled={editing}
          onChange={(e) => setForm({ ...form, id: e.target.value })}
          required
        />
        <input
          className={inputClass}
          placeholder="表示名"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <select
          className={inputClass}
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value as FeedSource['type'] })}
        >
          <option value="rss">RSS / Atom</option>
          <option value="github-trending">GitHub Trending</option>
        </select>
        {form.type === 'rss' ? (
          <input
            className={inputClass}
            placeholder="https://news.google.com/rss/search?q=AI&hl=ja&gl=JP&ceid=JP:ja"
            type="url"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            required
          />
        ) : (
          <div className="flex gap-2">
            <input
              className={`${inputClass} flex-1`}
              placeholder="言語 (例: typescript, 空欄で全言語)"
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
            />
            <select
              className={inputClass}
              value={form.since}
              onChange={(e) => setForm({ ...form, since: e.target.value as typeof form.since })}
            >
              <option value="daily">daily</option>
              <option value="weekly">weekly</option>
              <option value="monthly">monthly</option>
            </select>
          </div>
        )}
        <div className="flex gap-2 sm:col-span-2">
          <button type="submit" className={primaryButtonClass}>
            {editing ? '更新' : '追加'}
          </button>
          {editing && (
            <button
              type="button"
              className={buttonClass}
              onClick={() => {
                setEditing(false);
                setForm(emptyFeedForm);
              }}
            >
              キャンセル
            </button>
          )}
        </div>
      </form>
      {error && <p className="m-0 whitespace-pre-wrap text-sm text-red-600">{error}</p>}
    </Section>
  );
}

const emptyMcpForm = {
  id: '',
  transport: 'stdio' as McpServer['transport'],
  command: '',
  args: '',
  env: '',
  url: '',
  headers: '',
  enabled: true,
};

function McpServersSection() {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [form, setForm] = useState(emptyMcpForm);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [testResult, setTestResult] = useState('');
  const [testing, setTesting] = useState(false);

  const reload = () =>
    getMcpServers()
      .then(setServers)
      .catch((e) => setError(errorMessage(e)));

  useEffect(() => {
    reload();
  }, []);

  const toPayload = (f: typeof form): McpServer =>
    f.transport === 'stdio'
      ? {
          id: f.id,
          enabled: f.enabled,
          transport: 'stdio',
          command: f.command,
          args: f.args.split('\n').map((a) => a.trim()).filter(Boolean),
          env: parseKeyValueLines(f.env),
        }
      : { id: f.id, enabled: f.enabled, transport: 'http', url: f.url, headers: parseKeyValueLines(f.headers) };

  const save = async (server: McpServer) => {
    setError('');
    try {
      await upsertMcpServer({ data: server });
      await reload();
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (await save(toPayload(form))) {
      setForm(emptyMcpForm);
      setEditing(false);
      setTestResult('');
    }
  };

  const test = async () => {
    setTesting(true);
    setTestResult('');
    try {
      const result = await checkMcpServer({ data: toPayload(form) });
      setTestResult(
        result.ok ? `接続成功: ${result.tools.length} 個のツール (${result.tools.join(', ')})` : `接続失敗: ${result.error}`,
      );
    } catch (e) {
      setTestResult(`接続失敗: ${errorMessage(e)}`);
    } finally {
      setTesting(false);
    }
  };

  const edit = (server: McpServer) => {
    setEditing(true);
    setTestResult('');
    setForm(
      server.transport === 'stdio'
        ? {
            ...emptyMcpForm,
            id: server.id,
            enabled: server.enabled,
            transport: 'stdio',
            command: server.command,
            args: server.args.join('\n'),
            env: formatKeyValueLines(server.env),
          }
        : {
            ...emptyMcpForm,
            id: server.id,
            enabled: server.enabled,
            transport: 'http',
            url: server.url,
            headers: formatKeyValueLines(server.headers),
          },
    );
  };

  const remove = async (id: string) => {
    setError('');
    try {
      await removeMcpServer({ data: { id } });
      await reload();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <Section
      kicker="MCP Servers"
      description="Local Agent が使う外部 MCP サーバー。有効なサーバーのツールが次のチャットから使えます。"
    >
      {servers.length === 0 && <p className="m-0 text-sm text-[var(--sea-ink-soft)]">まだ登録されていません。</p>}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {servers.map((server) => (
          <li
            key={server.id}
            className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
          >
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={server.enabled}
                onChange={(e) => save({ ...server, enabled: e.target.checked })}
              />
              <span className="font-semibold text-[var(--sea-ink)]">{server.id}</span>
            </label>
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-[var(--sea-ink-soft)]">
              {server.transport === 'stdio' ? [server.command, ...server.args].join(' ') : server.url}
            </span>
            <button type="button" className={buttonClass} onClick={() => edit(server)}>
              編集
            </button>
            <button type="button" className={buttonClass} onClick={() => remove(server.id)}>
              削除
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={submit} className="grid gap-2 sm:grid-cols-2">
        <input
          className={inputClass}
          placeholder="id (例: filesystem)"
          value={form.id}
          disabled={editing}
          onChange={(e) => setForm({ ...form, id: e.target.value })}
          required
        />
        <select
          className={inputClass}
          value={form.transport}
          onChange={(e) => setForm({ ...form, transport: e.target.value as McpServer['transport'] })}
        >
          <option value="stdio">stdio (コマンド起動)</option>
          <option value="http">HTTP (Streamable HTTP / SSE)</option>
        </select>
        {form.transport === 'stdio' ? (
          <>
            <input
              className={`${inputClass} sm:col-span-2`}
              placeholder="コマンド (例: npx)"
              value={form.command}
              onChange={(e) => setForm({ ...form, command: e.target.value })}
              required
            />
            <textarea
              className={`${inputClass} font-mono`}
              rows={3}
              placeholder={'引数 (1 行に 1 つ)\n-y\n@modelcontextprotocol/server-filesystem'}
              value={form.args}
              onChange={(e) => setForm({ ...form, args: e.target.value })}
            />
            <textarea
              className={`${inputClass} font-mono`}
              rows={3}
              placeholder={'環境変数 (KEY=VALUE を 1 行ずつ)'}
              value={form.env}
              onChange={(e) => setForm({ ...form, env: e.target.value })}
            />
          </>
        ) : (
          <>
            <input
              className={`${inputClass} sm:col-span-2`}
              placeholder="https://example.com/mcp"
              type="url"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              required
            />
            <textarea
              className={`${inputClass} font-mono sm:col-span-2`}
              rows={2}
              placeholder={'HTTP ヘッダー (Name=Value を 1 行ずつ)\nAuthorization=Bearer ...'}
              value={form.headers}
              onChange={(e) => setForm({ ...form, headers: e.target.value })}
            />
          </>
        )}
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button type="submit" className={primaryButtonClass}>
            {editing ? '更新' : '追加'}
          </button>
          <button type="button" className={buttonClass} onClick={test} disabled={testing}>
            {testing ? '接続確認中…' : '接続テスト'}
          </button>
          {editing && (
            <button
              type="button"
              className={buttonClass}
              onClick={() => {
                setEditing(false);
                setForm(emptyMcpForm);
                setTestResult('');
              }}
            >
              キャンセル
            </button>
          )}
        </div>
      </form>
      {testResult && <p className="m-0 whitespace-pre-wrap text-sm text-[var(--sea-ink-soft)]">{testResult}</p>}
      {error && <p className="m-0 whitespace-pre-wrap text-sm text-red-600">{error}</p>}
    </Section>
  );
}

const emptyAgentForm = {
  id: '',
  name: '',
  description: '',
  instructions: '',
  model: '',
  mcpServerIds: [] as string[],
  builtinTools: [] as BuiltinToolName[],
  maxSteps: '',
};

const builtinToolNames = Object.keys(BUILTIN_TOOL_LABELS) as BuiltinToolName[];

const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);

function CustomAgentsSection() {
  const [agents, setAgents] = useState<CustomAgent[]>([]);
  const [servers, setServers] = useState<McpServer[]>([]);
  const [form, setForm] = useState(emptyAgentForm);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');

  const reload = () =>
    getCustomAgents()
      .then(setAgents)
      .catch((e) => setError(errorMessage(e)));

  useEffect(() => {
    reload();
    getMcpServers()
      .then(setServers)
      .catch((e) => setError(errorMessage(e)));
  }, []);

  const reset = () => {
    setForm(emptyAgentForm);
    setEditing(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await upsertCustomAgent({
        data: { ...form, maxSteps: form.maxSteps === '' ? null : Number(form.maxSteps) },
      });
      await reload();
      reset();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const edit = (agent: CustomAgent) => {
    setEditing(true);
    setForm({ ...agent, maxSteps: agent.maxSteps === null ? '' : String(agent.maxSteps) });
  };

  const remove = async (id: string) => {
    setError('');
    try {
      await removeCustomAgent({ data: { id } });
      await reload();
      if (form.id === id) reset();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <Section
      kicker="Custom Agents"
      description="指示文と使う MCP サーバー・ツールを選んで独自の Agent を作れます。保存するとチャットの Agent 一覧に表示されます。"
    >
      {agents.length === 0 && <p className="m-0 text-sm text-[var(--sea-ink-soft)]">まだ作成されていません。</p>}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {agents.map((agent) => (
          <li
            key={agent.id}
            className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
          >
            <span className="font-semibold text-[var(--sea-ink)]">{agent.name}</span>
            <span className="font-mono text-xs text-[var(--sea-ink-soft)]">{agent.id}</span>
            <span className="min-w-0 flex-1 truncate text-xs text-[var(--sea-ink-soft)]">
              {[
                ...agent.mcpServerIds.map((id) => `MCP: ${id}`),
                ...agent.builtinTools.map((name) => BUILTIN_TOOL_LABELS[name]),
              ].join(' / ') || 'ツールなし'}
            </span>
            <button type="button" className={buttonClass} onClick={() => edit(agent)}>
              編集
            </button>
            <button type="button" className={buttonClass} onClick={() => remove(agent.id)}>
              削除
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={submit} className="grid gap-2 sm:grid-cols-2">
        <input
          className={inputClass}
          placeholder="id (例: translator)"
          value={form.id}
          disabled={editing}
          onChange={(e) => setForm({ ...form, id: e.target.value })}
          required
        />
        <input
          className={inputClass}
          placeholder="名前 (例: 翻訳アシスタント)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          className={`${inputClass} sm:col-span-2`}
          placeholder="説明 (チャット画面に表示されます)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <textarea
          className={`${inputClass} sm:col-span-2`}
          rows={5}
          placeholder="指示文 (例: あなたは翻訳アシスタントです。入力された日本語を自然な英語に訳してください。)"
          value={form.instructions}
          onChange={(e) => setForm({ ...form, instructions: e.target.value })}
          required
        />
        <input
          className={inputClass}
          placeholder="Ollama モデル (空なら既定のモデル)"
          value={form.model}
          onChange={(e) => setForm({ ...form, model: e.target.value })}
        />
        <input
          className={inputClass}
          type="number"
          min={1}
          max={50}
          placeholder="最大ステップ数 (空なら既定)"
          value={form.maxSteps}
          onChange={(e) => setForm({ ...form, maxSteps: e.target.value })}
        />
        <fieldset className="m-0 flex flex-wrap items-center gap-2 border-0 p-0 text-xs text-[var(--sea-ink-soft)] sm:col-span-2">
          <legend className="mb-1 p-0">MCP サーバー</legend>
          {servers.length === 0 && <span>登録された MCP サーバーがありません。</span>}
          {servers.map((server) => (
            <label
              key={server.id}
              className="flex cursor-pointer items-center gap-1 rounded-full border border-[var(--line)] px-2 py-0.5"
            >
              <input
                type="checkbox"
                checked={form.mcpServerIds.includes(server.id)}
                onChange={() => setForm({ ...form, mcpServerIds: toggle(form.mcpServerIds, server.id) })}
              />
              {server.id}
              {!server.enabled && '（無効）'}
            </label>
          ))}
        </fieldset>
        <fieldset className="m-0 flex flex-wrap items-center gap-2 border-0 p-0 text-xs text-[var(--sea-ink-soft)] sm:col-span-2">
          <legend className="mb-1 p-0">組み込みツール</legend>
          {builtinToolNames.map((name) => (
            <label
              key={name}
              className="flex cursor-pointer items-center gap-1 rounded-full border border-[var(--line)] px-2 py-0.5"
            >
              <input
                type="checkbox"
                checked={form.builtinTools.includes(name)}
                onChange={() => setForm({ ...form, builtinTools: toggle(form.builtinTools, name) })}
              />
              {BUILTIN_TOOL_LABELS[name]}
            </label>
          ))}
        </fieldset>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button type="submit" className={primaryButtonClass}>
            {editing ? '更新' : '作成'}
          </button>
          {editing && (
            <button type="button" className={buttonClass} onClick={reset}>
              キャンセル
            </button>
          )}
        </div>
      </form>
      {error && <p className="m-0 whitespace-pre-wrap text-sm text-red-600">{error}</p>}
    </Section>
  );
}
