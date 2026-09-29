import { createMemo, createSignal, For, Index, Match, onCleanup, onMount, Show, Switch } from "solid-js";
import { CircleCheck, CircleDashed, CircleX, GitMerge, MessageSquare, Plus, UserCheck } from "lucide";
import { Icon } from "../../app/kit";
import w from "../../app/window.module.css";
import btn from "../../app/css/Button.module.css";
import DemoWindow, { useToast } from "./DemoWindow";
import s from "./PullRequestDemo.module.css";

type Kind = " " | "+" | "-" | "@";
type Line = { old?: number; now?: number; kind: Kind; text: string };
type File = { path: string; status: "added" | "modified"; lines: Line[] };
type Comment = { id: number; path: string; line: number; body: string; who: string; state: "pending" | "posted"; resolved?: boolean };
type Verdict = "comment" | "approve" | "requestChanges";
type Check = { name: string; state: "success" | "pending" | "failure" };

function added(src: string[]): Line[] {
  return src.map((text, i) => ({ now: i + 1, kind: "+" as const, text }));
}
const FILES: File[] = [
  {
    path: "src/cache.ts",
    status: "added",
    lines: added([
      'import { tokenize } from "./index/tokenize";',
      "",
      "const TTL_MS = 10 * 60 * 1000;",
      "",
      "type Entry = { tokens: string[]; at: number };",
      "const cache = new Map<string, Entry>();",
      "",
      "export function cachedTokens(q: string, now = Date.now()): string[] {",
      "  const hit = cache.get(q);",
      "  if (hit && now - hit.at < TTL_MS) return hit.tokens;",
      "  const tokens = tokenize(q);",
      "  cache.set(q, { tokens, at: now });",
      "  return tokens;",
      "}",
      "",
      "export function sweep(now = Date.now()) {",
      "  for (const [q, e] of cache) if (now - e.at >= TTL_MS) cache.delete(q);",
      "}",
    ]),
  },
  {
    path: "src/rank.ts",
    status: "modified",
    lines: [
      { kind: "@", text: "@@ -1,4 +1,4 @@" },
      { old: 1, now: 1, kind: " ", text: 'import { bm25 } from "./index/bm25";' },
      { old: 2, kind: "-", text: 'import { tokenize } from "./index/tokenize";' },
      { now: 2, kind: "+", text: 'import { cachedTokens } from "./cache";' },
      { old: 3, now: 3, kind: " ", text: 'import type { Doc, Hit } from "./index/store";' },
      { old: 4, now: 4, kind: " ", text: 'import { corpus } from "./corpus";' },
      { kind: "@", text: "@@ -16,3 +16,3 @@ export function score(" },
      { old: 16, now: 16, kind: " ", text: "export function rank(docs: Doc[], q: string, w = DEFAULT_WEIGHTS): Hit[] {" },
      { old: 17, kind: "-", text: "  const terms = tokenize(q);" },
      { now: 17, kind: "+", text: "  const terms = cachedTokens(q);" },
      { old: 18, now: 18, kind: " ", text: "  const hits: Hit[] = [];" },
    ],
  },
  {
    path: "src/cache.test.ts",
    status: "added",
    lines: added([
      'import { describe, expect, it } from "vitest";',
      'import { cachedTokens } from "./cache";',
      "",
      'describe("cachedTokens", () => {',
      '  it("returns the same array inside the TTL", () => {',
      '    const a = cachedTokens("phone", 0);',
      '    expect(cachedTokens("phone", 1000)).toBe(a);',
      "  });",
      '  it("tokenizes again after ten minutes", () => {',
      '    const a = cachedTokens("phone", 0);',
      '    expect(cachedTokens("phone", 600_001)).not.toBe(a);',
      "  });",
      "});",
    ]),
  },
];
const counts = (f: File) => ({ add: f.lines.filter((l) => l.kind === "+").length, del: f.lines.filter((l) => l.kind === "-").length });
const base = (p: string) => p.slice(p.lastIndexOf("/") + 1);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const VERDICTS: { value: Verdict; label: string; description: string }[] = [
  { value: "comment", label: "Comment", description: "Feedback without an explicit approval" },
  { value: "approve", label: "Approve", description: "Sign off on these changes" },
  { value: "requestChanges", label: "Request changes", description: "Blocks the merge until you approve" },
];
const METHODS = [
  { value: "squash", label: "Squash and merge" },
  { value: "merge", label: "Merge commit" },
  { value: "rebase", label: "Rebase and merge" },
];

export default function PullRequestDemo() {
  const { toast, say } = useToast();
  const [file, setFile] = createSignal(FILES[0]!.path);
  const [viewed, setViewed] = createSignal<Set<string>>(new Set());
  const [comments, setComments] = createSignal<Comment[]>([
    { id: 1, path: "src/cache.ts", line: 3, body: "Ten minutes is a guess. Worth making it a setting?", who: "Bertram Gilfoyle", state: "posted" },
  ]);
  const [draftAt, setDraftAt] = createSignal<number | null>(null);
  const [checks, setChecks] = createSignal<Check[]>([
    { name: "build", state: "success" },
    { name: "typecheck", state: "success" },
    { name: "lint", state: "success" },
    { name: "test", state: "pending" },
  ]);
  const [tab, setTab] = createSignal<"checks" | "review" | "merge">("review");
  const [summary, setSummary] = createSignal("");
  const [verdict, setVerdict] = createSignal<Verdict>("comment");
  const [reviews, setReviews] = createSignal<{ approved: number; changesRequested: number }>({ approved: 0, changesRequested: 0 });
  const [method, setMethod] = createSignal("squash");
  const [merged, setMerged] = createSignal(false);
  let seq = 10;
  let root!: HTMLDivElement;

  onMount(() => {
    let visible = false;
    const io = new IntersectionObserver((e) => (visible = e[0]!.isIntersecting));
    io.observe(root);
    const t = window.setInterval(() => {
      if (!visible || checks().every((c) => c.state !== "pending")) return;
      setChecks((l) => l.map((c) => (c.state === "pending" ? { ...c, state: "success" } : c)));
    }, 5000);
    onCleanup(() => (io.disconnect(), clearInterval(t)));
  });

  const current = () => FILES.find((f) => f.path === file())!;
  const pending = () => comments().filter((c) => c.state === "pending");
  const unresolved = (path: string) => comments().filter((c) => c.path === path && c.state === "posted" && !c.resolved).length;
  const total = createMemo(() => FILES.reduce((a, f) => ({ add: a.add + counts(f).add, del: a.del + counts(f).del }), { add: 0, del: 0 }));

  const checkLine = () => {
    const c = checks();
    const failing = c.filter((x) => x.state === "failure").length;
    const running = c.filter((x) => x.state === "pending").length;
    if (failing) return { tone: "bad", icon: CircleX, text: `${failing} of ${plural(c.length, "check")} failing` };
    if (running) return { tone: "busy", icon: CircleDashed, text: `${running} of ${plural(c.length, "check")} running` };
    return { tone: "good", icon: CircleCheck, text: `${plural(c.length, "check")} passed` };
  };
  const reviewsLine = () => {
    const r = reviews();
    if (!r.approved && !r.changesRequested) return "No reviews yet.";
    return [r.approved && plural(r.approved, "approval"), r.changesRequested && plural(r.changesRequested, "change request")].filter(Boolean).join(", ");
  };
  // What GitHub would report: this repo requires every check and one approval.
  const gate = () => {
    if (checks().some((c) => c.state !== "success") || reviews().changesRequested || !reviews().approved)
      return { ready: false, summary: "A rule on the base branch is holding this merge." };
    return { ready: true, summary: "Ready to merge." };
  };
  const block = () => {
    if (verdict() !== "approve" && verdict() !== "requestChanges" && !summary().trim() && !pending().length) return "Write a summary or leave a line comment first.";
    if (verdict() === "requestChanges" && !summary().trim() && !pending().length) return "Say what to change: a summary or a line comment.";
    return null;
  };

  function addComment(line: number, body: string) {
    setComments((l) => [...l, { id: ++seq, path: file(), line, body, who: "You", state: "pending" }]);
    setDraftAt(null);
  }
  function submit() {
    if (block()) return;
    const n = pending().length;
    const v = verdict();
    setComments((l) => l.map((c) => (c.state === "pending" ? { ...c, state: "posted" } : c)));
    // Your latest verdict replaces your earlier one; a plain comment changes neither.
    if (v !== "comment") setReviews({ approved: v === "approve" ? 1 : 0, changesRequested: v === "requestChanges" ? 1 : 0 });
    setSummary("");
    const what = v === "approve" ? "an approval" : v === "requestChanges" ? "a change request" : "a comment";
    say(n ? `Posted ${plural(n, "line comment")} and ${what} in one review` : `Posted ${what}`);
    if (v !== "comment") setTab("merge");
  }
  function merge() {
    setMerged(true);
    say(`${METHODS.find((m) => m.value === method())!.label}: #52 is on main`);
  }

  const Diff = () => (
    <section class={`${w.card} ${s.diff}`}>
      <div class={s.diffHead}>
        <span class={s.diffPath}>{current().path}</span>
        <span class={s.counts}>
          <span class={s.added}>+{counts(current()).add}</span>
          <Show when={counts(current()).del}>
            <span class={s.removed}>-{counts(current()).del}</span>
          </Show>
        </span>
        <label class={s.viewedLabel}>
          <input
            type="checkbox"
            checked={viewed().has(file())}
            onChange={(e) =>
              setViewed((v) => {
                const n = new Set(v);
                e.currentTarget.checked ? n.add(file()) : n.delete(file());
                return n;
              })
            }
          />
          Viewed
        </label>
      </div>
      <div class={s.lines}>
        <For each={current().lines}>
          {(l) => (
            <>
              <div class={s.line} data-kind={l.kind}>
                <span class={s.ln}>{l.old ?? ""}</span>
                <span class={s.ln}>{l.now ?? ""}</span>
                <Show when={l.now && l.kind !== "@"} fallback={<span class={s.addSlot} />}>
                  <button type="button" class={s.add} aria-label={`Comment on line ${l.now}`} onClick={() => setDraftAt(l.now!)}>
                    <Icon icon={Plus} size={12} strokeWidth={2.5} />
                  </button>
                </Show>
                <span class={s.sign}>{l.kind === "@" ? "" : l.kind}</span>
                <span class={s.code}>{l.text}</span>
              </div>
              <For each={comments().filter((c) => c.path === file() && c.line === l.now && l.kind !== "@" && !c.resolved)}>
                {(c) => (
                  <div class={s.thread} data-state={c.state}>
                    <div class={s.threadHead}>
                      <b>{c.who}</b>
                      <Show when={c.state === "pending"} fallback={<span class={s.dim}>{c.who === "You" ? "just now" : "3 hours ago"}</span>}>
                        <span class={s.pendingTag}>Pending</span>
                      </Show>
                      <span class={s.spacer} />
                      <Show
                        when={c.state === "posted"}
                        fallback={
                          <button type="button" class={s.linkBtn} onClick={() => setComments((x) => x.filter((y) => y.id !== c.id))}>
                            Delete
                          </button>
                        }
                      >
                        <button type="button" class={s.linkBtn} onClick={() => setComments((x) => x.map((y) => (y.id === c.id ? { ...y, resolved: true } : y)))}>
                          Resolve
                        </button>
                      </Show>
                    </div>
                    <div class={s.threadBody}>{c.body}</div>
                  </div>
                )}
              </For>
              <Show when={draftAt() === l.now && l.kind !== "@" && l.now}>
                {(() => {
                  let area!: HTMLTextAreaElement;
                  return (
                    <div class={s.composer}>
                      <textarea
                        ref={(el) => {
                          area = el;
                          requestAnimationFrame(() => el.focus({ preventScroll: true }));
                        }}
                        class={s.commentInput}
                        rows={2}
                        placeholder="Leave a comment on this line"
                        onKeyDown={(e) => {
                          if (e.key === "Escape") setDraftAt(null);
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && area.value.trim()) addComment(l.now!, area.value.trim());
                        }}
                      />
                      <div class={s.composerBtns}>
                        <button type="button" class={`${btn.btn} ${btn.ghost} ${btn.xs}`} onClick={() => setDraftAt(null)}>
                          <span class={btn.label}>Cancel</span>
                        </button>
                        <button type="button" class={`${btn.btn} ${btn.primary} ${btn.xs}`} onClick={() => area.value.trim() && addComment(l.now!, area.value.trim())}>
                          <span class={btn.label}>Add to review</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </Show>
            </>
          )}
        </For>
      </div>
    </section>
  );

  const Panel = () => (
    <section class={`${w.card} ${s.panel}`}>
      <div class={s.head}>
        <span class={s.title}>Pull request</span>
      </div>
      <div class={s.scroll}>
        <div class={s.identity}>
          <div class={s.identityTop}>
            <span class={s.pill} data-pr-state={merged() ? "merged" : "open"}>
              {merged() ? "merged" : "open"}
            </span>
            <span class={s.subject}>Cache query tokens</span>
            <span class={s.number}>#52</span>
          </div>
          <div class={s.meta}>Dinesh Chugtai {"\u00b7"} opened 3 hours ago</div>
          <div class={s.branches}>
            <span class={s.headRef}>feat/token-cache</span>
            <span class={s.into}>{"\u2192"}</span>
            <span>main</span>
          </div>
        </div>
        <div class={s.rollup}>
          <button type="button" class={s.verdictRow} data-tone={checkLine().tone} onClick={() => setTab("checks")}>
            <Icon icon={checkLine().icon} size={14} />
            <span class={s.verdictText}>{checkLine().text}</span>
          </button>
          <button
            type="button"
            class={s.verdictRow}
            data-decision={reviews().changesRequested ? "changesRequested" : reviews().approved ? "approved" : "unread"}
            onClick={() => setTab("review")}
          >
            <Icon icon={UserCheck} size={14} />
            <span class={s.verdictText}>{reviewsLine()}</span>
          </button>
          <button type="button" class={s.verdictRow} data-tone={merged() ? "good" : gate().ready ? "good" : "blank"} onClick={() => setTab("merge")}>
            <Icon icon={GitMerge} size={14} />
            <span class={s.verdictText}>{merged() ? "Merged into main." : gate().summary}</span>
          </button>
        </div>
        <div class={s.filesHead}>
          <span class={s.filesTitle}>Files</span>
          <span class={s.fileCount}>{FILES.length}</span>
          <span class={s.spacer} />
          <span class={s.counts}>
            <span class={s.added}>+{total().add}</span>
            <span class={s.removed}>-{total().del}</span>
          </span>
        </div>
        <For each={FILES}>
          {(f) => (
            <div class={s.fileRow} data-open={file() === f.path ? "" : undefined}>
              <input
                type="checkbox"
                class={s.viewedBox}
                aria-label={`Viewed, ${f.path}`}
                checked={viewed().has(f.path)}
                onChange={(e) =>
                  setViewed((v) => {
                    const n = new Set(v);
                    e.currentTarget.checked ? n.add(f.path) : n.delete(f.path);
                    return n;
                  })
                }
              />
              <button type="button" class={s.rowOpen} onClick={() => setFile(f.path)}>
                <span class={s.name} data-viewed={viewed().has(f.path) ? "" : undefined}>
                  {base(f.path)}
                </span>
                <Show when={unresolved(f.path)}>
                  <span class={s.unresolved}>
                    <Icon icon={MessageSquare} size={12} />
                    {unresolved(f.path)}
                  </span>
                </Show>
                <span class={s.status} data-file-status={f.status}>
                  {f.status === "added" ? "A" : "M"}
                </span>
              </button>
            </div>
          )}
        </For>
        <Show when={pending().length}>
          <div class={s.footer}>
            <span class={s.pendingCount}>{plural(pending().length, "pending comment")}</span>
            <span class={s.spacer} />
            <button type="button" class={`${btn.btn} ${btn.primary} ${btn.xs}`} onClick={() => setTab("review")}>
              <span class={btn.label}>Finish review</span>
            </button>
          </div>
        </Show>
      </div>
      <div class={s.views}>
        <div class={s.tabStrip} role="tablist" aria-label="Pull request detail">
          <For each={[["checks", "Checks"], ["review", "Review"], ["merge", "Merge"]] as const}>
            {([id, label]) => (
              <button type="button" role="tab" class={s.tab} aria-selected={tab() === id} onClick={() => setTab(id)}>
                {label}
              </button>
            )}
          </For>
        </div>
        <div class={s.tabPanel}>
          <Switch>
            <Match when={tab() === "checks"}>
              <For each={(["failure", "pending", "success"] as const).filter((st) => checks().some((c) => c.state === st))}>
                {(st) => (
                  <>
                    <h3 class={s.checkHead} data-check-state={st}>
                      <Icon icon={st === "success" ? CircleCheck : st === "pending" ? CircleDashed : CircleX} size={13} />
                      {plural(checks().filter((c) => c.state === st).length, "check")} {st === "success" ? "passed" : st === "pending" ? "running" : "failing"}
                    </h3>
                    <ul class={s.contexts}>
                      <For each={checks().filter((c) => c.state === st)}>
                        {(c) => (
                          <li class={s.context}>
                            <span>{c.name}</span>
                            <span class={s.dim}>Details</span>
                          </li>
                        )}
                      </For>
                    </ul>
                  </>
                )}
              </For>
            </Match>
            <Match when={tab() === "review"}>
              <div class={s.review}>
                <Show when={pending().length} fallback={<p class={s.quiet}>No line comments yet. A summary on its own is a review too.</p>}>
                  <p class={s.reviewPending}>
                    {plural(pending().length, "pending comment")} in {plural(new Set(pending().map((c) => c.path)).size, "file")}
                  </p>
                  <Index each={pending()}>
                    {(c) => (
                      <button type="button" class={s.jump} onClick={() => setFile(c().path)}>
                        <span class={s.jumpAnchor}>
                          {base(c().path)}:{c().line}
                        </span>
                        <span class={s.jumpBody}>{c().body}</span>
                      </button>
                    )}
                  </Index>
                </Show>
                <textarea class={s.summary} rows={2} placeholder="Summary comment, optional" aria-label="Review summary" value={summary()} onInput={(e) => setSummary(e.currentTarget.value)} />
                <div class={s.radios} role="radiogroup" aria-label="Review verdict">
                  <For each={VERDICTS}>
                    {(v) => (
                      <label class={s.radio}>
                        <input type="radio" name="verdict" checked={verdict() === v.value} onChange={() => setVerdict(v.value)} />
                        <span>
                          <span class={s.radioLabel}>{v.label}</span>
                          <span class={s.radioDesc}>{v.description}</span>
                        </span>
                      </label>
                    )}
                  </For>
                </div>
                <div class={s.submit}>
                  <button type="button" class={`${btn.btn} ${btn.primary} ${btn.sm}`} disabled={!!block() || merged()} onClick={submit}>
                    <span class={btn.label}>Submit review</span>
                  </button>
                  <Show when={pending().length}>
                    <span class={s.hint}>Posts all {pending().length} at once</span>
                  </Show>
                </div>
                <Show when={block()}>
                  <div class={s.hint}>{block()}</div>
                </Show>
              </div>
            </Match>
            <Match when={tab() === "merge"}>
              <div class={s.mergeBar}>
                <Show
                  when={!merged()}
                  fallback={
                    <div class={s.mergeRow}>
                      <span class={s.dim}>Merged.</span>
                      <button type="button" class={`${btn.btn} ${btn.ghost} ${btn.sm}`} onClick={() => say("Deleted feat/token-cache here and on origin")}>
                        <span class={btn.label}>Delete branch...</span>
                      </button>
                    </div>
                  }
                >
                  <div class={s.mergeRow}>
                    <button type="button" class={`${btn.btn} ${gate().ready ? btn.success : btn.default} ${btn.sm} ${s.mergeBtn}`} disabled={!gate().ready} onClick={merge}>
                      <span class={btn.label}>{gate().ready ? METHODS.find((m) => m.value === method())!.label : "Merge"}</span>
                    </button>
                    <select class={s.select} value={method()} onChange={(e) => setMethod(e.currentTarget.value)} aria-label="How to merge">
                      <For each={METHODS}>{(m) => <option value={m.value}>{m.label}</option>}</For>
                    </select>
                  </div>
                </Show>
              </div>
              <Show when={!merged() && !gate().ready}>
                <p class={s.hint}>This repo requires every check to pass and one approval. Approve from the Review tab once the tests finish.</p>
              </Show>
            </Match>
          </Switch>
        </div>
      </div>
    </section>
  );

  return (
    <div ref={root}>
      <DemoWindow crumbs={["hooli", "hooli-search", "feat/token-cache"]} toast={toast()} minHeight={620}>
        <Diff />
        <Panel />
      </DemoWindow>
    </div>
  );
}
