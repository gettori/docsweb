import { createMemo, createSignal, For, onCleanup, Show } from "solid-js";
import { Ellipsis, GitBranch, GitPullRequest, Minus, Plus, RefreshCw, RotateCcw, Sparkles, Undo2 } from "lucide";
import { Icon } from "../../app/kit";
import w from "../../app/window.module.css";
import review from "../../app/css/ReviewPanel.module.css";
import btn from "../../app/css/Button.module.css";
import DemoWindow, { useToast } from "./DemoWindow";
import s from "./ChangesDemo.module.css";

type Line = [old: string, now: string, kind: " " | "+" | "-", text: string];
type Hunk = { id: string; head: string; lines: Line[]; staged: boolean };
type File = { name: string; dir: string; st: "M" | "A"; hunks: Hunk[] };

// The uncommitted work on hooli-search's fix/search-ranking worktree.
const START = (): File[] => [
  {
    name: "rank.test.ts",
    dir: "src",
    st: "M",
    hunks: [
      {
        id: "t1",
        head: "@@ -13,4 +13,10 @@",
        staged: true,
        lines: [
          ["13", "13", " ", '  it("drops a doc with no match", () => {'],
          ["14", "14", " ", '    expect(ids("compression")).toEqual(["1"]);'],
          ["15", "15", " ", "  });"],
          ["16", "16", " ", "});"],
          ["", "17", "+", ""],
          ["", "18", "+", 'describe("rank with weights", () => {'],
          ["", "19", "+", '  it("puts a title hit first", () => {'],
          ["", "20", "+", '    expect(ids("phone")[0]).toBe("2");'],
          ["", "21", "+", "  });"],
          ["", "22", "+", "});"],
        ],
      },
    ],
  },
  {
    name: "server.ts",
    dir: "src",
    st: "M",
    hunks: [
      {
        id: "s1",
        head: "@@ -8,4 +8,4 @@",
        staged: false,
        lines: [
          ["8", "8", " ", "const Query = z.object({"],
          ["9", "", "-", "  q: z.string().min(1),"],
          ["", "9", "+", "  q: z.string().trim().min(1),"],
          ["10", "10", " ", "  limit: z.coerce.number().max(50),"],
          ["11", "11", " ", "});"],
        ],
      },
      {
        id: "s2",
        head: "@@ -13,5 +13,8 @@",
        staged: false,
        lines: [
          ["13", "13", " ", 'app.get("/search", async (req) => {'],
          ["14", "14", " ", "  const { q, limit } = Query.parse(req.query);"],
          ["15", "15", " ", "  const hits = rank(index, q);"],
          ["16", "", "-", "  return { hits: hits.slice(0, limit) };"],
          ["", "16", "+", "  return {"],
          ["", "17", "+", "    total: hits.length,"],
          ["", "18", "+", "    hits: hits.slice(0, limit),"],
          ["", "19", "+", "  };"],
          ["17", "20", " ", "});"],
        ],
      },
    ],
  },
  {
    name: "README.md",
    dir: "",
    st: "M",
    hunks: [
      {
        id: "r1",
        head: "@@ -6,2 +6,7 @@",
        staged: false,
        lines: [
          ["6", "6", " ", "    pnpm install"],
          ["7", "7", " ", "    pnpm dev"],
          ["", "8", "+", ""],
          ["", "9", "+", "## Ranking"],
          ["", "10", "+", ""],
          ["", "11", "+", "Title matches count three times a"],
          ["", "12", "+", "body match. Clicks break ties."],
        ],
      },
    ],
  },
];

const DRAFT = "Weight title hits and report the total";

const KEYWORDS = /\b(const|return|await|async|import|export|from|function|describe|it|expect)\b/;
const TOKENS = /("[^"]*"|\b(?:const|return|await|async|import|export|from|function|describe|it|expect)\b)/g;

function Code(props: { text: string }) {
  return (
    <For each={props.text.split(TOKENS)}>
      {(part) => (part.startsWith('"') ? <span class={w.str}>{part}</span> : KEYWORDS.test(part) ? <span class={w.kw}>{part}</span> : part)}
    </For>
  );
}

export default function ChangesDemo() {
  const [files, setFiles] = createSignal<File[]>(START());
  const [sel, setSel] = createSignal<{ name: string; staged: boolean }>({ name: "server.ts", staged: false });
  const [msg, setMsg] = createSignal("");
  const [ahead, setAhead] = createSignal(1);
  const { toast, say, clear } = useToast();
  let drafting: number | undefined;
  onCleanup(() => clearInterval(drafting));

  const side = (staged: boolean) => files().filter((f) => f.hunks.some((h) => h.staged === staged));
  const stagedCount = () => side(true).length;
  const current = createMemo(() => {
    const f = files().find((x) => x.name === sel().name);
    const hunks = f?.hunks.filter((h) => h.staged === sel().staged) ?? [];
    return f && hunks.length ? { file: f, hunks } : null;
  });

  // After a move, keep showing the same file if it still has hunks on the side
  // being shown, else follow it to the other side, else fall back to anything left.
  const follow = (name: string, staged: boolean) => {
    const f = files().find((x) => x.name === name);
    if (f?.hunks.some((h) => h.staged === staged)) return setSel({ name, staged });
    if (f?.hunks.length) return setSel({ name, staged: !staged });
    const any = files()[0];
    if (any) setSel({ name: any.name, staged: !any.hunks.some((h) => !h.staged) });
  };

  const setHunks = (name: string, fn: (h: Hunk) => Hunk | null) =>
    setFiles((fs) =>
      fs
        .map((f) => (f.name === name ? { ...f, hunks: f.hunks.map(fn).filter((h): h is Hunk => h !== null) } : f))
        .filter((f) => f.hunks.length > 0),
    );

  const moveFile = (name: string, staged: boolean) => {
    setHunks(name, (h) => ({ ...h, staged }));
    follow(name, sel().staged);
  };
  const moveHunk = (name: string, id: string, staged: boolean) => {
    setHunks(name, (h) => (h.id === id ? { ...h, staged } : h));
    follow(name, sel().staged);
  };
  const discard = (name: string, id: string) => {
    const before = files();
    const was = sel();
    setHunks(name, (h) => (h.id === id ? null : h));
    follow(name, false);
    say("Hunk discarded. Tori snapshots first, so it can come back.", () => {
      setFiles(before);
      setSel(was);
      clear();
    });
  };

  const draft = () => {
    clearInterval(drafting);
    setMsg("");
    let i = 0;
    drafting = window.setInterval(() => {
      i += 1;
      setMsg(DRAFT.slice(0, i));
      if (i >= DRAFT.length) clearInterval(drafting);
    }, 28);
  };

  const canCommit = () => stagedCount() > 0 && msg().trim().length > 0;
  const commit = () => {
    if (!canCommit()) return;
    const n = stagedCount();
    setFiles((fs) => fs.map((f) => ({ ...f, hunks: f.hunks.filter((h) => !h.staged) })).filter((f) => f.hunks.length > 0));
    setAhead((a) => a + 1);
    say(`Committed ${n} file${n === 1 ? "" : "s"} to fix/search-ranking.`);
    setMsg("");
    const left = files()[0];
    if (left) setSel({ name: left.name, staged: false });
  };

  const reset = () => {
    clearInterval(drafting);
    setFiles(START());
    setSel({ name: "server.ts", staged: false });
    setMsg("");
    setAhead(1);
    clear();
  };

  const Row = (props: { f: File; staged: boolean }) => (
    <div
      class={`${review.reviewRow} ${sel().name === props.f.name && sel().staged === props.staged ? review.active : ""}`}
      onClick={() => setSel({ name: props.f.name, staged: props.staged })}
    >
      <span class={w.fileGlyph}>{props.f.name.endsWith(".md") ? "M↓" : "TS"}</span>
      <span class={review.reviewName}>{props.f.name}</span>
      <span class={review.reviewDir}>{props.f.dir}</span>
      <span class={review.rowEnd}>
        <button
          type="button"
          class={`${btn.btn} ${btn.ghost} ${btn.xs} ${btn.iconOnly}`}
          aria-label={props.staged ? `Unstage ${props.f.name}` : `Stage ${props.f.name}`}
          onClick={(e) => {
            e.stopPropagation();
            moveFile(props.f.name, !props.staged);
          }}
        >
          <Icon icon={props.staged ? Minus : Plus} size={14} />
        </button>
      </span>
      <span class={`${review.reviewStatus} ${review.modified}`}>{props.f.st}</span>
    </div>
  );

  return (
    <DemoWindow crumbs={["hooli", "hooli-search", "fix/search-ranking"]} toast={toast()}>
        <section class={`${w.card} ${s.diffCard}`}>
          <Show
            when={current()}
            fallback={
              <div class={s.empty}>
                <b>Working tree clean</b>
                <span>Everything on fix/search-ranking is committed.</span>
                <button type="button" class={`${btn.btn} ${btn.default} ${btn.sm}`} onClick={reset}>
                  <Icon icon={RotateCcw} size={14} />
                  <span class={btn.label}>Start over</span>
                </button>
              </div>
            }
          >
            {(c) => (
              <div class={`${w.diff} ${s.diff}`}>
                <div class={w.fileBar}>
                  <span style={{ color: "var(--attention-fg)", "font-weight": 700 }}>{c().file.st}</span>
                  <span style={{ "font-weight": 600 }}>{c().file.name}</span>
                  <span class="dim">{c().file.dir}</span>
                  <span class={w.tag}>{sel().staged ? "STAGED" : "WORKING TREE"}</span>
                </div>
                <div class={s.scroll}>
                  <For each={c().hunks}>
                    {(h) => (
                      <>
                        <div class={w.hunk}>
                          <span class={w.hunkHead}>{h.head}</span>
                          <span class={s.hunkEnd}>
                            <button
                              type="button"
                              class={`${w.hunkBtn} ${s.hunkBtn}`}
                              title={h.staged ? "Unstage hunk" : "Stage hunk"}
                              aria-label={h.staged ? "Unstage hunk" : "Stage hunk"}
                              onClick={() => moveHunk(c().file.name, h.id, !h.staged)}
                            >
                              <Icon icon={h.staged ? Minus : Plus} size={14} />
                            </button>
                            <Show when={!h.staged}>
                              <button
                                type="button"
                                class={`${w.hunkBtn} ${s.hunkBtn}`}
                                title="Discard hunk"
                                aria-label="Discard hunk"
                                onClick={() => discard(c().file.name, h.id)}
                              >
                                <Icon icon={Undo2} size={14} />
                              </button>
                            </Show>
                          </span>
                        </div>
                        <For each={h.lines}>
                          {(l) => (
                            <div class={w.diffLine} data-k={l[2]}>
                              <span class={w.ln}>{l[0]}</span>
                              <span class={w.ln}>{l[1]}</span>
                              <span class={w.sign}>{l[2] === " " ? "" : l[2]}</span>
                              <span>
                                <Code text={l[3]} />
                              </span>
                            </div>
                          )}
                        </For>
                      </>
                    )}
                  </For>
                </div>
              </div>
            )}
          </Show>
        </section>

        <aside class={`${review.reviewPanel} ${s.panel}`}>
          <div class={review.topBar}>
            <span class={review.title}>Source Control</span>
            <span class={review.spacer} />
            <span class={`${btn.btn} ${btn.ghost} ${btn.sm} ${btn.iconOnly}`}>
              <Icon icon={RefreshCw} size={14} />
            </span>
            <span class={`${btn.btn} ${btn.ghost} ${btn.sm} ${btn.iconOnly}`}>
              <Icon icon={Ellipsis} size={14} />
            </span>
          </div>
          <div class={review.branchBar}>
            <Icon icon={GitBranch} size={14} />
            <span class={review.branchName}>fix/search-ranking</span>
            <span class={review.spacer} />
            <span class={review.aheadPill}>
              {"↑"}
              {ahead()}
            </span>
            <span class={`${btn.btn} ${btn.ghost} ${btn.sm} ${btn.iconOnly}`}>
              <Icon icon={GitPullRequest} size={14} />
            </span>
          </div>
          <div class={review.commitCard}>
            <textarea
              class={`${review.commitInput} ${s.input}`}
              rows={2}
              placeholder="Message"
              value={msg()}
              onInput={(e) => {
                clearInterval(drafting);
                setMsg(e.currentTarget.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  commit();
                }
              }}
            />
            <div class={review.commitFooter}>
              <span class={review.commitStats}>{stagedCount() ? `${stagedCount()} staged` : "Nothing staged"}</span>
              <div class={review.commitActions}>
                <button type="button" class={`${btn.btn} ${btn.ghost} ${btn.sm}`} onClick={draft} disabled={!stagedCount()}>
                  <Icon icon={Sparkles} size={14} />
                  <span class={btn.label}>AI Draft</span>
                </button>
                <button type="button" class={`${btn.btn} ${btn.primary} ${btn.sm}`} onClick={commit} disabled={!canCommit()}>
                  <span class={btn.label}>Commit</span>
                </button>
              </div>
            </div>
          </div>
          <div class={`${review.changesBody} ${s.lists}`}>
            <Show when={side(true).length}>
              <div class={review.groupHeader}>Staged</div>
              <For each={side(true)}>{(f) => <Row f={f} staged />}</For>
            </Show>
            <Show when={side(false).length}>
              <div class={review.groupHeader}>Changes</div>
              <For each={side(false)}>{(f) => <Row f={f} staged={false} />}</For>
            </Show>
          </div>
        </aside>
    </DemoWindow>
  );
}
