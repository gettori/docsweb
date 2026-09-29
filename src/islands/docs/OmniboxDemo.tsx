import { createEffect, createMemo, createSignal, For, Index, on, Show, type JSX } from "solid-js";
import { Binary, Blocks, Box, ChevronRight, SquareFunction, Variable, type IconNode } from "lucide";
import { Icon, Tab } from "../../app/kit";
import w from "../../app/window.module.css";
import DemoWindow, { useToast } from "./DemoWindow";
import s from "./OmniboxDemo.module.css";

const CMD = "\u2318";
const SHIFT = "\u21e7";
const OPT = "\u2325";
const CTRL = "\u2303";
const MINUS = "\u2212";

// hooli-search on fix/search-ranking, the same worktree the Changes page uses.
const FILES: Record<string, string[]> = {
  "src/rank.ts": [
    'import { bm25 } from "./index/bm25";',
    'import { tokenize } from "./index/tokenize";',
    'import type { Doc, Hit } from "./index/store";',
    'import { corpus } from "./corpus";',
    "",
    "export type Weights = { title: number; body: number };",
    "",
    "export const DEFAULT_WEIGHTS: Weights = { title: 2.5, body: 1 };",
    "",
    "export function score(doc: Doc, terms: string[], w: Weights): number {",
    "  const title = bm25(terms, tokenize(doc.title));",
    "  const body = bm25(terms, tokenize(doc.body));",
    "  return title * w.title + body * w.body;",
    "}",
    "",
    "export function rank(docs: Doc[], q: string, w = DEFAULT_WEIGHTS): Hit[] {",
    "  const terms = tokenize(q);",
    "  const hits: Hit[] = [];",
    "  for (const doc of docs) {",
    "    const s = score(doc, terms, w);",
    "    if (s > 0) hits.push({ id: doc.id, score: s });",
    "  }",
    "  return hits.sort((a, b) => b.score - a.score);",
    "}",
    "",
    "export function ids(q: string): string[] {",
    "  return rank(corpus(), q).map((h) => h.id);",
    "}",
  ],
  "src/rank.test.ts": [
    'import { describe, expect, it } from "vitest";',
    'import { ids } from "./rank";',
    "",
    'describe("rank", () => {',
    '  it("drops a doc with no match", () => {',
    '    expect(ids("compression")).toEqual(["1"]);',
    "  });",
    "});",
    "",
    'describe("rank with weights", () => {',
    '  it("puts a title hit first", () => {',
    '    expect(ids("phone")[0]).toBe("2");',
    "  });",
    "});",
  ],
  "src/server.ts": [
    'import { Hono, type Context } from "hono";',
    'import { z } from "zod";',
    'import { rank } from "./rank";',
    'import { store } from "./index/store";',
    "",
    "const app = new Hono();",
    "",
    "const Query = z.object({",
    "  q: z.string().trim().min(1),",
    "  limit: z.coerce.number().max(50),",
    "});",
    "",
    "export async function handleSearch(c: Context) {",
    "  const { q, limit } = Query.parse(c.req.query());",
    "  const hits = rank(await store.all(), q);",
    "  return c.json(hits.slice(0, limit));",
    "}",
    "",
    'app.get("/search", handleSearch);',
    "",
    "export default app;",
  ],
  "src/corpus.ts": [
    'import type { Doc } from "./index/store";',
    "",
    "export function corpus(): Doc[] {",
    "  return [",
    '    { id: "1", title: "Middle-out", body: "lossless compression at scale" },',
    '    { id: "2", title: "Nucleus phone", body: "search built into the phone" },',
    '    { id: "3", title: "Signature box", body: "a box for the data center" },',
    "  ];",
    "}",
  ],
  "src/index/bm25.ts": [
    "const K1 = 1.2;",
    "const B = 0.75;",
    "",
    "export function bm25(terms: string[], doc: string[], avg = 120): number {",
    "  let total = 0;",
    "  for (const t of terms) {",
    "    const f = doc.filter((w) => w === t).length;",
    "    total += (f * (K1 + 1)) / (f + K1 * (1 - B + (B * doc.length) / avg));",
    "  }",
    "  return total;",
    "}",
  ],
  "src/index/tokenize.ts": [
    'const STOP = new Set(["a", "an", "the", "of", "to"]);',
    "",
    "export function tokenize(text: string): string[] {",
    "  return text",
    "    .toLowerCase()",
    "    .split(/[^a-z0-9]+/)",
    "    .filter((w) => w && !STOP.has(w));",
    "}",
  ],
  "src/index/store.ts": [
    "export type Doc = { id: string; title: string; body: string };",
    "export type Hit = { id: string; score: number };",
    "",
    "export class Store {",
    "  private docs = new Map<string, Doc>();",
    "",
    "  put(doc: Doc) {",
    "    this.docs.set(doc.id, doc);",
    "  }",
    "",
    "  async all(): Promise<Doc[]> {",
    "    return [...this.docs.values()];",
    "  }",
    "}",
    "",
    "export const store = new Store();",
  ],
  "scripts/reindex.ts": [
    'import { store } from "../src/index/store";',
    'import { corpus } from "../src/corpus";',
    "",
    "export async function reindex() {",
    "  for (const doc of corpus()) store.put(doc);",
    "  console.log(`indexed ${corpus().length} docs`);",
    "}",
    "",
    "reindex();",
  ],
  "package.json": [
    "{",
    '  "name": "hooli-search",',
    '  "private": true,',
    '  "type": "module",',
    '  "scripts": {',
    '    "dev": "tsx watch src/server.ts",',
    '    "test": "vitest run",',
    '    "reindex": "tsx scripts/reindex.ts"',
    "  },",
    '  "dependencies": {',
    '    "hono": "^4.6.0",',
    '    "zod": "^3.23.8"',
    "  }",
    "}",
  ],
  "README.md": [
    "# hooli-search",
    "",
    "Search for everything Hooli ships, ranked with BM25.",
    "",
    "    pnpm dev    # http://localhost:3000/search?q=phone",
    "    pnpm test",
  ],
};
const PATHS = Object.keys(FILES);
const WORKED = ["src/rank.test.ts", "src/server.ts", "src/rank.ts"];

type Kind = "type" | "const" | "fn" | "var" | "class";
const KIND_ICON: Record<Kind, IconNode> = { type: Blocks, const: Binary, fn: SquareFunction, var: Variable, class: Box };
type Sym = { name: string; kind: Kind; path: string; find: string; container?: string };
const SYMBOLS: Sym[] = [
  { name: "Weights", kind: "type", path: "src/rank.ts", find: "type Weights" },
  { name: "DEFAULT_WEIGHTS", kind: "const", path: "src/rank.ts", find: "const DEFAULT_WEIGHTS" },
  { name: "score", kind: "fn", path: "src/rank.ts", find: "function score" },
  { name: "rank", kind: "fn", path: "src/rank.ts", find: "function rank" },
  { name: "terms", kind: "var", path: "src/rank.ts", find: "const terms", container: "rank" },
  { name: "hits", kind: "var", path: "src/rank.ts", find: "const hits", container: "rank" },
  { name: "ids", kind: "fn", path: "src/rank.ts", find: "function ids" },
  { name: "Query", kind: "const", path: "src/server.ts", find: "const Query" },
  { name: "handleSearch", kind: "fn", path: "src/server.ts", find: "function handleSearch" },
  { name: "corpus", kind: "fn", path: "src/corpus.ts", find: "function corpus" },
  { name: "bm25", kind: "fn", path: "src/index/bm25.ts", find: "function bm25" },
  { name: "tokenize", kind: "fn", path: "src/index/tokenize.ts", find: "function tokenize" },
  { name: "STOP", kind: "const", path: "src/index/tokenize.ts", find: "const STOP" },
  { name: "Doc", kind: "type", path: "src/index/store.ts", find: "type Doc" },
  { name: "Hit", kind: "type", path: "src/index/store.ts", find: "type Hit" },
  { name: "Store", kind: "class", path: "src/index/store.ts", find: "class Store" },
  { name: "reindex", kind: "fn", path: "scripts/reindex.ts", find: "function reindex" },
];
const lineOf = (sym: Sym) => FILES[sym.path]!.findIndex((l) => l.includes(sym.find)) + 1;

type Mode = "file" | "command" | "doc" | "workspace" | "line" | "help";
const MODES: { mode: Mode; prefix: string; label: string; placeholder: string }[] = [
  { mode: "file", prefix: "", label: "Files", placeholder: "Go to file" },
  { mode: "command", prefix: ">", label: "Commands", placeholder: "Run an action" },
  { mode: "doc", prefix: "@", label: "Symbols in this file", placeholder: "Go to a symbol in this file" },
  { mode: "workspace", prefix: "#", label: "Symbols in the project", placeholder: "Search project symbols" },
  { mode: "line", prefix: ":", label: "Go to line", placeholder: "Go to line" },
  { mode: "help", prefix: "?", label: "What the prefixes do", placeholder: "The prefixes" },
];
function parse(raw: string) {
  const spec = MODES.find((m) => m.prefix && raw.startsWith(m.prefix)) ?? MODES[0]!;
  return { spec, term: raw.slice(spec.prefix.length).trim() };
}

function fuzzy(q: string, text: string): number | null {
  const t = text.toLowerCase();
  let score = 0;
  let from = 0;
  let prev = -2;
  for (const ch of q.toLowerCase().replace(/\s+/g, "")) {
    const at = t.indexOf(ch, from);
    if (at < 0) return null;
    score += at === prev + 1 ? 3 : 1;
    if (at === 0 || "/._ :".includes(t[at - 1]!)) score += 2;
    prev = at;
    from = at + 1;
  }
  return score - t.length / 100;
}
function best<T>(list: T[], q: string, text: (x: T) => string): T[] {
  if (!q) return list;
  return list
    .map((x) => ({ x, n: fuzzy(q, text(x)) }))
    .filter((r) => r.n !== null)
    .sort((a, b) => b.n! - a.n!)
    .map((r) => r.x);
}

const base = (p: string) => p.slice(p.lastIndexOf("/") + 1);
const GLYPH: Record<string, [string, string]> = {
  ts: ["TS", "#519aba"],
  json: ["{}", "#cbcb41"],
  md: ["MD", "#6d8086"],
};
function Glyph(props: { path: string }) {
  const g = () => GLYPH[props.path.split(".").pop()!] ?? GLYPH.md!;
  return (
    <span class={s.glyph} style={{ color: g()[1] }}>
      {g()[0]}
    </span>
  );
}

const TOKENS =
  /(\/\/.*$|#.*$)|("[^"]*"|'[^']*'|`[^`]*`)|\b(import|export|from|type|const|let|function|return|for|of|if|new|await|async|default|class|private)\b|\b(\d+(?:\.\d+)?)\b|([A-Za-z_$][\w$]*)(?=\()|\b([A-Z][\w]*)\b/g;
function paint(line: string): JSX.Element[] {
  const out: JSX.Element[] = [];
  let last = 0;
  for (const m of line.matchAll(TOKENS)) {
    if (m.index > last) out.push(line.slice(last, m.index));
    const cls = m[1] ? s.cm : m[2] ? w.str : m[3] ? w.kw : m[4] ? s.num : m[5] ? w.fn : s.ty;
    out.push(<span class={cls}>{m[0]}</span>);
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

type Row = {
  id: string;
  label: string;
  section?: string;
  sub?: string;
  meta?: string;
  keys?: string[];
  path?: string;
  kind?: Kind;
  disabled?: string;
  run?: () => void;
  enters?: string;
};

export default function OmniboxDemo() {
  const { toast, say } = useToast();
  const [open, setOpen] = createSignal(true);
  const [query, setQuery] = createSignal("");
  const [active, setActive] = createSignal(0);
  const [tabs, setTabs] = createSignal(["src/server.ts", "src/rank.ts"]);
  const [path, setPath] = createSignal("src/rank.ts");
  const [line, setLine] = createSignal(16);
  const [trail, setTrail] = createSignal([{ path: "src/index/bm25.ts", line: 4 }, { path: "src/server.ts", line: 15 }]);
  const [staged, setStaged] = createSignal(false);
  const [ahead, setAhead] = createSignal(0);
  let input!: HTMLInputElement;
  let list!: HTMLDivElement;
  let code!: HTMLDivElement;

  const parsed = createMemo(() => parse(query()));
  const mode = () => parsed().spec.mode;

  function go(to: string, at = 1) {
    if (to !== path() || at !== line()) setTrail((t) => [...t, { path: path(), line: line() }].slice(-8));
    setTabs((t) => (t.includes(to) ? t : [...t, to].slice(-4)));
    setPath(to);
    setLine(Math.min(Math.max(at, 1), FILES[to]!.length));
  }
  createEffect(
    on([path, line], () => {
      const lh = 20;
      code.scrollTop = Math.max(0, (line() - 1) * lh - code.clientHeight / 3);
    }),
  );

  const fileRows = createMemo((): Row[] => {
    const q = parsed().term;
    const row = (p: string, section?: string): Row => ({ id: `file:${p}`, label: p, section, path: p, run: () => go(p) });
    if (q) return best(PATHS, q, (p) => p).map((p) => row(p));
    const seen = new Set<string>();
    const jumps: Row[] = [];
    for (const j of [...trail()].reverse()) {
      if (j.path === path() || seen.has(j.path)) continue;
      seen.add(j.path);
      jumps.push({ id: `jump:${j.path}`, label: `${j.path}:${j.line}`, section: "Recently visited", path: j.path, run: () => go(j.path, j.line) });
    }
    const worked = WORKED.filter((p) => p !== path() && !seen.has(p)).map((p) => (seen.add(p), row(p, "Recent files")));
    const rest = PATHS.filter((p) => !seen.has(p))
      .slice(0, 4)
      .map((p) => row(p, "Project"));
    return [...jumps.slice(0, 2), ...worked, ...rest];
  });

  const commandRows = createMemo((): Row[] => {
    const cmd = (label: string, done: string, keys?: string[], sub?: string): Row => ({ id: `cmd:${label}`, label, keys, sub, run: () => say(done) });
    const rows: Row[] = [
      cmd("New Claude session", "Started a Claude session on hooli-search", undefined, "hooli-search"),
      cmd("New Codex session", "Started a Codex session on hooli-search", undefined, "hooli-search"),
      {
        id: "back",
        label: "Go back to where you were",
        keys: [CTRL, MINUS],
        run: () => {
          const t = trail();
          const to = t[t.length - 1];
          if (!to) return say("Nothing to go back to");
          setTrail(t.slice(0, -1));
          setTabs((x) => (x.includes(to.path) ? x : [...x, to.path].slice(-4)));
          setPath(to.path);
          setLine(to.line);
        },
      },
      cmd("Search across the project", "Opened the Search panel", [CMD, SHIFT, "F"]),
      cmd("Show or hide the sidebar", "Toggled the sidebar", [CMD, "B"]),
      cmd("Show or hide the terminal", "Toggled the terminal", [CMD, OPT, "J"]),
      cmd("Show this shortcut sheet", "Opened the shortcut sheet", [CMD, "/"]),
      {
        id: "stage",
        label: "Stage this file",
        run: () => {
          setStaged(true);
          say(`Staged ${base(path())}`);
        },
      },
      {
        id: "commit",
        label: "Commit staged changes",
        disabled: staged() ? undefined : "Nothing staged",
        run: () => {
          setStaged(false);
          setAhead((n) => n + 1);
          say("Committed to fix/search-ranking");
        },
      },
      {
        id: "push",
        label: "Push to origin",
        disabled: ahead() ? undefined : "Nothing to push",
        run: () => {
          say(`Pushed ${ahead()} commit${ahead() > 1 ? "s" : ""} to origin`);
          setAhead(0);
        },
      },
      cmd("Run task: test", "Running test: vitest run", undefined, "vitest run"),
      cmd("Run task: dev", "Running dev: tsx watch src/server.ts", undefined, "tsx watch src/server.ts"),
      cmd("Switch between Autopilot and Workspace", "Switched to Autopilot", [CMD, SHIFT, "J"]),
      cmd("Open Settings", "Opened Settings"),
    ];
    for (const r of rows) if (r.disabled) r.sub = r.disabled;
    return best(rows, parsed().term, (r) => r.label);
  });

  const symRow = (x: Sym, where: boolean): Row => ({
    id: `sym:${x.path}:${x.name}`,
    label: x.name,
    kind: x.kind,
    meta: where ? x.path : x.container,
    run: () => go(x.path, lineOf(x)),
  });

  const results = createMemo((): Row[] => {
    const q = parsed().term;
    switch (mode()) {
      case "command":
        return commandRows();
      case "doc":
        return best(
          SYMBOLS.filter((x) => x.path === path()),
          q,
          (x) => x.name,
        ).map((x) => symRow(x, false));
      case "workspace":
        return q ? best(SYMBOLS, q, (x) => x.name).map((x) => symRow(x, true)) : [];
      case "line": {
        if (!/^\d+$/.test(q) || !Number(q)) return [];
        const n = Number(q);
        return [{ id: `line:${n}`, label: `Go to line ${n}`, sub: base(path()), run: () => go(path(), n) }];
      }
      case "help":
        return MODES.filter((m) => m.mode !== "help").map((m) => ({
          id: `help:${m.mode}`,
          label: m.prefix ? `${m.prefix}  ${m.label}` : `(no prefix)  ${m.label}`,
          sub: m.placeholder,
          enters: m.prefix,
        }));
      default:
        return fileRows();
    }
  });

  const empty = () => {
    switch (mode()) {
      case "doc":
        return SYMBOLS.some((x) => x.path === path()) ? "No matching symbols" : "No symbols in the open file";
      case "workspace":
        return parsed().term ? "No matching symbols" : "Type to search project symbols";
      case "line":
        return "Type a line number";
      case "file":
        return "No matching files";
      default:
        return "No matches";
    }
  };

  const enabled = () => results().flatMap((r, i) => (r.disabled ? [] : [i]));
  createEffect(on(results, () => setActive(enabled()[0] ?? -1)));
  createEffect(
    on(active, (i) => {
      const el = list?.querySelector<HTMLElement>(`[data-i="${i}"]`);
      if (!el) return;
      if (el.offsetTop < list.scrollTop) list.scrollTop = el.offsetTop - 28;
      else if (el.offsetTop + el.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = el.offsetTop + el.offsetHeight - list.clientHeight;
    }),
  );

  function show(q: string) {
    setQuery(q);
    setOpen(true);
    queueMicrotask(() => input.focus({ preventScroll: true }));
  }
  function close() {
    setOpen(false);
    code.focus({ preventScroll: true });
  }
  function pick(r: Row | undefined) {
    if (!r || r.disabled) return;
    if (r.enters !== undefined) {
      setQuery(r.enters);
      input.focus();
      return;
    }
    close();
    r.run?.();
  }

  function onKey(e: KeyboardEvent) {
    const usable = enabled();
    const at = usable.indexOf(active());
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!usable.length) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive(usable[(at + step + usable.length) % usable.length]!);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(results()[active()]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  }
  function onShortcut(e: KeyboardEvent) {
    if (!(e.metaKey || e.ctrlKey)) return;
    const k = e.key.toLowerCase();
    if (k !== "p" && k !== "k") return;
    e.preventDefault();
    show(k === "k" ? ">" : "");
  }

  return (
    <div onKeyDown={onShortcut}>
      <DemoWindow crumbs={["hooli", "hooli-search", "fix/search-ranking"]} toast={toast()} minHeight={500}>
        <section class={`${w.card} ${s.editor}`}>
          <div class={w.strip}>
            <Index each={tabs()}>{(p) => <Tab label={base(p())} selected={p() === path()} icon={<Glyph path={p()} />} />}</Index>
          </div>
          <div class={`${w.fileBar} ${s.bar}`}>
            <For each={path().split("/")}>
              {(part, i) => (
                <>
                  <Show when={i() > 0}>
                    <Icon icon={ChevronRight} size={12} class="dim" />
                  </Show>
                  <span class={i() === path().split("/").length - 1 ? "" : "dim"}>{part}</span>
                </>
              )}
            </For>
            <span class={s.hint}>
              <button type="button" class={s.hintBtn} onClick={() => show("")}>
                <kbd class={s.key}>{CMD}</kbd>
                <kbd class={s.key}>P</kbd>
                <span>Files</span>
              </button>
              <button type="button" class={s.hintBtn} onClick={() => show(">")}>
                <kbd class={s.key}>{CMD}</kbd>
                <kbd class={s.key}>K</kbd>
                <span>Commands</span>
              </button>
            </span>
            <span class={`${s.pos} dim`}>Ln {line()}</span>
          </div>
          <div ref={code} class={s.code} tabindex={0} aria-label={`${path()} in the editor`}>
            <For each={FILES[path()]}>
              {(text, i) => (
                <div class={s.line} data-cursor={i() + 1 === line() ? "" : undefined}>
                  <span class={s.ln}>{i() + 1}</span>
                  <span class={s.text}>{paint(text)}</span>
                </div>
              )}
            </For>
          </div>
        </section>

        <Show when={open()}>
          <div class={s.scrim} onClick={close} />
          <div class={s.panel} role="dialog" aria-label="Command palette">
            <div class={s.title}>{parsed().spec.label}</div>
            <div class={s.control}>
              <input
                ref={input}
                class={s.input}
                value={query()}
                onInput={(e) => setQuery(e.currentTarget.value)}
                onKeyDown={onKey}
                placeholder={`${parsed().spec.placeholder}   (? for prefixes)`}
                aria-label="Search files, actions and symbols"
                spellcheck={false}
                autocomplete="off"
              />
            </div>
            <div ref={list} class={s.list} role="listbox" aria-label="Results">
              <For each={results()} fallback={<div class={s.empty}>{empty()}</div>}>
                {(r, i) => (
                  <>
                    <Show when={r.section && r.section !== results()[i() - 1]?.section}>
                      <div class={s.section}>{r.section}</div>
                    </Show>
                    <div
                      class={s.item}
                      role="option"
                      data-i={i()}
                      data-highlighted={active() === i() ? "" : undefined}
                      data-disabled={r.disabled ? "" : undefined}
                      aria-disabled={!!r.disabled}
                      onMouseMove={() => !r.disabled && setActive(i())}
                      onClick={() => pick(r)}
                    >
                      <Show when={r.path}>
                        <span class={s.itemIcon}>
                          <Glyph path={r.path!} />
                        </span>
                      </Show>
                      <Show when={r.kind}>
                        <span class={s.itemIcon}>
                          <Icon icon={KIND_ICON[r.kind!]} size={14} />
                        </span>
                      </Show>
                      <span class={s.itemLabel}>{r.label}</span>
                      <Show when={r.sub}>
                        <span class={s.itemSub}>{r.sub}</span>
                      </Show>
                      <Show when={r.meta}>
                        <span class={s.itemMeta}>{r.meta}</span>
                      </Show>
                      <Show when={r.keys}>
                        <span class={s.itemKeys}>
                          <For each={r.keys}>{(k) => <kbd class={s.key}>{k}</kbd>}</For>
                        </span>
                      </Show>
                    </div>
                  </>
                )}
              </For>
            </div>
          </div>
        </Show>
      </DemoWindow>
    </div>
  );
}
