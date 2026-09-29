import { createMemo, createSignal, For, Index, Show } from "solid-js";
import { Check, ChevronDown, ChevronRight, Cloud, Ellipsis, FolderX, GitBranch, GitCommitHorizontal, Mail, Plus, RefreshCw, Search } from "lucide";
import { Icon } from "../../app/kit";
import { WorktreeMark } from "../../app/gitMarks";
import w from "../../app/window.module.css";
import sidebar from "../../app/css/LeftSidebar.module.css";
import rows from "../../app/css/SidebarRows.module.css";
import btn from "../../app/css/Button.module.css";
import DemoWindow, { useToast } from "./DemoWindow";
import s from "./WorktreesDemo.module.css";

type Commit = { sha: string; subject: string; author: string; when: string; files: [status: "A" | "M" | "D", path: string][] };
type Unit = {
  name: string;
  folder: string;
  own: Commit[];
  hasRemote: boolean;
  unpushed: number;
  dirty: boolean;
  tabs: number;
  stale?: boolean;
  remoteFails?: string;
};

const c = (sha: string, subject: string, author: string, when: string, files: Commit["files"]): Commit => ({ sha, subject, author, when, files });
const MAIN_NEW = [
  c("9f3c2a1", "Log slow queries over 200ms", "Jared Dunn", "5 hours ago", [["M", "src/server.ts"], ["A", "src/slowlog.ts"]]),
  c("41be07d", "Cap page size at 50", "Monica Hall", "1 day ago", [["M", "src/server.ts"]]),
];
const TRUNK = [
  c("c07a9e4", "Bump hono to 4.6", "Gavin Belson", "2 days ago", [["M", "package.json"], ["M", "pnpm-lock.yaml"]]),
  c("5d21f88", "Add a /health endpoint", "Nelson Bighetti", "3 days ago", [["M", "src/server.ts"]]),
  c("e8a4b10", "Tokenize on unicode word breaks", "Bertram Gilfoyle", "4 days ago", [["M", "src/index/tokenize.ts"], ["M", "src/index/tokenize.test.ts"]]),
  c("0b6d3f2", "First BM25 index", "Dinesh Chugtai", "1 week ago", [["A", "src/index/bm25.ts"], ["A", "src/index/store.ts"], ["A", "src/rank.ts"]]),
];
const RANKING = [
  c("a71e5c9", "Weight title hits over body hits", "Richard Hendricks", "12 minutes ago", [["M", "src/rank.ts"]]),
  c("3d90b4e", "Trim the query before parsing", "Richard Hendricks", "1 hour ago", [["M", "src/server.ts"]]),
  c("f2c8a61", "Add rank tests for weights", "Richard Hendricks", "2 hours ago", [["M", "src/rank.test.ts"]]),
];
const TOKEN_CACHE = [
  c("6e1d0af", "Evict cached tokens after 10 minutes", "Dinesh Chugtai", "2 hours ago", [["M", "src/cache.ts"]]),
  c("b48f2d7", "Cache tokenized queries", "Dinesh Chugtai", "3 hours ago", [["A", "src/cache.ts"], ["M", "src/rank.ts"]]),
];
const REMOTE_ONLY: Record<string, Commit[]> = {
  "feat/autocomplete": [
    c("7c3e9b2", "Suggest completions from the index", "Jian Yang", "6 hours ago", [["A", "src/suggest.ts"], ["M", "src/server.ts"]]),
    c("d05a1e8", "Prefix trie over tokens", "Jian Yang", "8 hours ago", [["A", "src/index/trie.ts"]]),
  ],
  "fix/unicode-tokens": [c("2f8b6c4", "Keep emoji as their own tokens", "Bertram Gilfoyle", "1 day ago", [["M", "src/index/tokenize.ts"]])],
};
const CHORE = [c("8a2d4e0", "Bump vitest to 3.2", "Nelson Bighetti", "1 day ago", [["M", "package.json"]])];

const START = (): Unit[] => [
  { name: "main", folder: "main", own: [], hasRemote: true, unpushed: 0, dirty: false, tabs: 1 },
  { name: "fix/search-ranking", folder: "search-ranking", own: RANKING, hasRemote: true, unpushed: 1, dirty: true, tabs: 2 },
  { name: "feat/token-cache", folder: "token-cache", own: TOKEN_CACHE, hasRemote: true, unpushed: 0, dirty: false, tabs: 0, remoteFails: "the branch is protected on origin" },
  { name: "spike/old-index", folder: "old-index", own: [], hasRemote: false, unpushed: 0, dirty: false, tabs: 0, stale: true },
];
const ROOT = "~/Projects/hooli-search";
const UP = "↑";
const DOWN = "↓";
const quote = (t: string) => `“${t}”`;

function folderFor(branch: string, taken: string[]) {
  const last = branch.split("/").filter(Boolean).pop() ?? branch;
  return taken.includes(last) ? branch.replace(/\//g, "-") : last;
}

const LW = 14;
const RH = 24;
const ORANGE = "var(--scale-orange)";
const BLUE = "var(--scale-blue)";
type Pill = { label: string; kind: "head" | "base" | "remote" };
type GRow = { c: Commit; lane: number; hue: string; hollow: boolean; head: boolean; paths: { d: string; stroke: string }[]; pills: Pill[] };

// The shape every branch here has: its own commits in one lane, main's newer
// commits beside it, both meeting at the commit the branch started from.
function graph(u: Unit): { width: number; rows: GRow[] } {
  const two = u.own.length > 0;
  const seq = two
    ? [...u.own.map((x) => ({ c: x, lane: 0, hue: BLUE })), ...MAIN_NEW.map((x) => ({ c: x, lane: 1, hue: ORANGE })), ...TRUNK.map((x) => ({ c: x, lane: 0, hue: ORANGE }))]
    : [...MAIN_NEW, ...TRUNK].map((x) => ({ c: x, lane: 0, hue: ORANGE }));
  const m0 = u.own.length;
  const fork = u.own.length + MAIN_NEW.length;
  const x = (l: number) => l * LW + LW / 2;
  const out = seq.map((r, i): GRow => {
    const paths = [{ d: `M ${x(0)} ${i === 0 ? RH / 2 : 0} L ${x(0)} ${RH}`, stroke: r.lane === 0 ? r.hue : two && i < fork ? BLUE : ORANGE }];
    if (two && i >= m0 && i < fork) {
      const top = i === m0 ? RH / 2 : 0;
      paths.push({
        d: i === fork - 1 ? `M ${x(1)} ${top} C ${x(1)} ${RH * 0.8}, ${x(0)} ${RH * 0.7}, ${x(0)} ${RH}` : `M ${x(1)} ${top} L ${x(1)} ${RH}`,
        stroke: ORANGE,
      });
    }
    const head = i === 0;
    const pills: Pill[] = [];
    if (head) pills.push({ label: u.name, kind: "head" });
    if (head && u.hasRemote && u.unpushed === 0) pills.push({ label: `origin/${u.name}`, kind: "remote" });
    if (i === (two ? m0 : 0) && u.name !== "main") pills.push({ label: "main", kind: "base" });
    return { ...r, head, hollow: head || (two && i < u.unpushed), paths, pills };
  });
  return { width: two ? 2 : 1, rows: out };
}
const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);

type Menu = { x: number; y: number; unit?: string };

export default function WorktreesDemo() {
  const { toast, say } = useToast();
  const [units, setUnits] = createSignal<Unit[]>(START());
  const [sel, setSel] = createSignal("fix/search-ranking");
  const [open, setOpen] = createSignal<Set<string>>(new Set());
  const [menu, setMenu] = createSignal<Menu | null>(null);
  const [adding, setAdding] = createSignal(false);
  const [removing, setRemoving] = createSignal<string | null>(null);
  const [freeLocals, setFreeLocals] = createSignal<Record<string, Commit[]>>({ "chore/deps": CHORE });
  let root!: HTMLDivElement;

  const unit = () => units().find((u) => u.name === sel()) ?? units()[0]!;
  const g = createMemo(() => graph(unit()));

  function showMenu(e: MouseEvent, name?: string) {
    e.preventDefault();
    e.stopPropagation();
    const r = root.getBoundingClientRect();
    setMenu({ x: Math.min(e.clientX - r.left, r.width - 200), y: e.clientY - r.top, unit: name });
  }
  function prune() {
    const stale = units().filter((u) => u.stale);
    setMenu(null);
    if (!stale.length) return say("Nothing to prune: every worktree folder is where git expects it");
    setUnits((list) => list.filter((u) => !u.stale));
    if (stale.some((u) => u.name === sel())) setSel("main");
    say(`Pruned ${stale.length} worktree whose folder was deleted: ${stale.map((u) => u.folder).join(", ")}`);
  }

  const Row = (props: { u: Unit }) => {
    const isSel = () => sel() === props.u.name;
    return (
      <div class={`node ${rows.branchNode}`}>
        <div
          class={`${rows.row} ${rows.branch} ${rows.sub1} ${isSel() ? rows.sel : ""} ${s.unit}`}
          role="button"
          tabindex="0"
          data-stale={props.u.stale ? "true" : undefined}
          data-two-line="true"
          aria-current={isSel() ? "true" : undefined}
          onClick={() => setSel(props.u.name)}
          onContextMenu={(e) => showMenu(e, props.u.name)}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setSel(props.u.name))}
        >
          <span class={rows.rowStack}>
            <span class={rows.rowTop}>
              <span class={rows.rowIcon}>{props.u.stale ? <Icon icon={FolderX} /> : <WorktreeMark active={false} current={props.u.name === "main"} />}</span>
              <span class={rows.label}>{props.u.name}</span>
              <span class={rows.rowEnd}>
                <button type="button" class={s.more} aria-label={`Actions for ${props.u.name}`} onClick={(e) => showMenu(e, props.u.name)}>
                  <Icon icon={Ellipsis} />
                </button>
              </span>
            </span>
            <span class={rows.rowMeta}>{props.u.stale ? "folder missing" : `${props.u.folder}/`}</span>
          </span>
        </div>
      </div>
    );
  };

  const Graph = () => (
    <section class={`${w.card} ${s.graph}`}>
      <Show
        when={!unit().stale}
        fallback={
          <div class={s.empty}>
            <Icon icon={FolderX} size={22} />
            <b>{unit().folder}/ is gone</b>
            <span>It was deleted outside Tori, so git still lists a worktree with no folder. Prune worktrees drops it.</span>
            <button type="button" class={`${btn.btn} ${btn.default} ${btn.sm}`} onClick={prune}>
              <span class={btn.label}>Prune worktrees</span>
            </button>
          </div>
        }
      >
        <div class={s.topBar}>
          <span class={s.title}>Graph</span>
          <span class={s.branch}>
            <Icon icon={GitBranch} size={14} />
            <span>{unit().name}</span>
          </span>
          <span class={s.ab}>{unit().hasRemote ? `${UP}${unit().unpushed} ${DOWN}0` : "Unpushed branch"}</span>
          <span class={s.spacer} />
          <span class={s.count}>{g().rows.length} loaded</span>
          <button type="button" class={s.iconBtn} aria-label="Refresh" onClick={() => say("Re-read the graph")}>
            <Icon icon={RefreshCw} size={14} />
          </button>
        </div>
        <div class={s.rows}>
          <For each={g().rows}>
            {(r) => {
              const isOpen = () => open().has(r.c.sha);
              const flip = () =>
                setOpen((o) => {
                  const n = new Set(o);
                  n.has(r.c.sha) ? n.delete(r.c.sha) : n.add(r.c.sha);
                  return n;
                });
              return (
                <div>
                  <div class={s.row} onClick={flip}>
                    <button type="button" class={s.twist} aria-expanded={isOpen()} aria-label={isOpen() ? "Hide files" : "Show files"}>
                      <Icon icon={isOpen() ? ChevronDown : ChevronRight} size={14} />
                    </button>
                    <svg class={s.lanes} width={g().width * LW} height={RH} viewBox={`0 0 ${g().width * LW} ${RH}`} aria-hidden="true">
                      <For each={r.paths}>{(p) => <path d={p.d} fill="none" stroke={p.stroke} stroke-width="1.5" />}</For>
                      <circle cx={r.lane * LW + LW / 2} cy={RH / 2} r={r.head ? 5.5 : 4} fill={r.hollow ? "var(--canvas-default)" : r.hue} stroke={r.hue} stroke-width="2" />
                    </svg>
                    <span class={s.subject}>{r.c.subject}</span>
                    <For each={r.pills}>{(p) => <span class={`${s.ref} ${s[p.kind]}`}>{p.label}</span>}</For>
                    <span class={s.who} title={r.c.author}>
                      {initials(r.c.author)}
                    </span>
                    <span class={s.when}>{r.c.when.replace(" ago", "")}</span>
                    <span class={s.sha}>{r.c.sha}</span>
                  </div>
                  <Show when={isOpen()}>
                    <div class={s.files}>
                      <For each={r.c.files}>
                        {([st, path]) => (
                          <div class={s.fileRow}>
                            <span class={s.fileStatus} data-status={st}>
                              {st}
                            </span>
                            <span class={s.filePath}>{path}</span>
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>
                </div>
              );
            }}
          </For>
        </div>
      </Show>
    </section>
  );

  const AddDialog = () => {
    const [query, setQuery] = createSignal("");
    const [picked, setPicked] = createSignal<string | null>(null);
    const [base, setBase] = createSignal("main");
    const taken = () => units().map((u) => u.name);
    const entries = createMemo(() => [
      ...[...taken(), ...Object.keys(freeLocals())].map((name) => ({ name, kind: "local" as const })),
      ...Object.keys(REMOTE_ONLY)
        .filter((n) => !taken().includes(n))
        .map((name) => ({ name, kind: "remote" as const })),
    ]);
    const matches = () => {
      const q = query().trim().toLowerCase();
      return q ? entries().filter((e) => e.name.toLowerCase().includes(q)) : entries();
    };
    const fresh = () => {
      const q = query().trim();
      return q && !entries().some((e) => e.name === q) ? q : null;
    };
    const choice = () => picked() ?? fresh();
    const folder = () => (choice() ? folderFor(choice()!, units().map((u) => u.folder)) : "");
    const locals = () => entries().filter((e) => e.kind === "local").length;
    function confirm() {
      const name = choice();
      if (!name) return;
      const remote = REMOTE_ONLY[name];
      const free = freeLocals()[name];
      const from = units().find((u) => u.name === base());
      const own = remote ?? free ?? from?.own ?? [];
      const dir = folder();
      const u: Unit = { name, folder: dir, own, hasRemote: !!remote, unpushed: 0, dirty: false, tabs: 0 };
      setUnits((l) => [...l, u]);
      if (free) setFreeLocals(({ [name]: _, ...rest }) => rest);
      setSel(name);
      setAdding(false);
      say(
        remote
          ? `Added ${dir}/, tracking origin/${name}`
          : free
            ? `Added ${dir}/ on the existing branch ${name}`
            : `Added ${dir}/ with a new branch from ${base()}`,
      );
    }
    return (
      <div class={s.panel} role="dialog" aria-label="Add worktree">
        <div class={s.dTitle}>Add worktree in {quote("hooli-search")}</div>
        <div class={s.control}>
          <input
            ref={(el) => requestAnimationFrame(() => el.focus({ preventScroll: true }))}
            class={s.input}
            value={query()}
            onInput={(e) => {
              setQuery(e.currentTarget.value);
              setPicked(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), confirm())}
            placeholder="Filter branches, or type a new name"
            aria-label="Filter branches, or type a new name"
            spellcheck={false}
          />
        </div>
        <Show when={!picked() && fresh()}>
          <div class={s.createRow}>
            <Icon icon={Plus} size={14} />
            <span class={s.createLead}>Create branch</span>
            <span class={s.createName}>{fresh()}</span>
            <span class={s.createFrom}>from</span>
            <select class={s.baseSelect} value={base()} onChange={(e) => setBase(e.currentTarget.value)} aria-label="Start from">
              <For each={units().filter((u) => !u.stale)}>{(u) => <option value={u.name}>{u.name}</option>}</For>
            </select>
          </div>
        </Show>
        <div class={s.listHead}>{query().trim() ? `${matches().length} matching` : `${locals()} local, ${entries().length - locals()} remote`}</div>
        <div class={s.list}>
          <For each={matches()} fallback={<div class={s.none}>No branch matches</div>}>
            {(e) => {
              const isTaken = () => taken().includes(e.name);
              return (
                <button
                  type="button"
                  class={s.item}
                  disabled={isTaken()}
                  data-picked={picked() === e.name ? "" : undefined}
                  onClick={() => (picked() === e.name ? confirm() : setPicked(e.name))}
                >
                  <Icon icon={picked() === e.name ? Check : e.kind === "remote" ? Cloud : GitCommitHorizontal} size={14} class={s.glyph} />
                  <span class={s.branchName}>{e.name}</span>
                  <Show when={isTaken()}>
                    <span class={s.branchTag}>in a worktree</span>
                  </Show>
                </button>
              );
            }}
          </For>
        </div>
        <div class={s.actions}>
          <span class={s.pathHint}>{choice() ? `${ROOT}/${folder()}` : ""}</span>
          <button type="button" class={`${btn.btn} ${btn.default} ${btn.sm}`} onClick={() => setAdding(false)}>
            <span class={btn.label}>Cancel</span>
          </button>
          <button type="button" class={`${btn.btn} ${btn.primary} ${btn.sm}`} disabled={!choice()} onClick={confirm}>
            <span class={btn.label}>Add worktree</span>
          </button>
        </div>
      </div>
    );
  };

  const RemoveDialog = (props: { u: Unit }) => {
    const [local, setLocal] = createSignal(true);
    const [remote, setRemote] = createSignal(false);
    function confirm() {
      const u = props.u;
      setUnits((l) => l.filter((x) => x.name !== u.name));
      if (!local()) setFreeLocals((f) => ({ ...f, [u.name]: u.own }));
      if (sel() === u.name) setSel("main");
      setRemoving(null);
      const closed = u.tabs ? `, closed ${u.tabs} terminal tab${u.tabs > 1 ? "s" : ""}` : "";
      const gone = local() ? " and its branch" : "";
      const failed = remote() && u.remoteFails;
      say(failed ? `Removed ${u.folder}/${gone}${closed}. Could not delete origin/${u.name}: ${u.remoteFails}` : `Removed ${u.folder}/${gone}${closed}${remote() ? `, deleted origin/${u.name}` : ""}`);
    }
    return (
      <div class={s.panel} role="dialog" aria-label={`Remove worktree ${props.u.folder}`} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), confirm())}>
        <div class={s.dTitle}>Remove worktree {quote(props.u.folder)}?</div>
        <div class={s.detail}>
          <div class={s.detailRow}>
            <span class={s.key}>Branch</span>
            <span class={s.val}>{props.u.name}</span>
          </div>
          <div class={s.detailRow}>
            <span class={s.key}>Folder</span>
            <span class={s.val}>
              {ROOT}/{props.u.folder}
            </span>
          </div>
          <div class={s.detailRow}>
            <span class={s.key}>Status</span>
            <span class={s.tags}>
              <Show when={props.u.dirty}>
                <span class={s.tag} data-warn="">
                  uncommitted changes
                </span>
              </Show>
              <Show when={props.u.unpushed}>
                <span class={s.tag} data-warn="">
                  unpushed commits
                </span>
              </Show>
              <Show when={!props.u.dirty && !props.u.unpushed}>
                <span class={s.tag}>clean</span>
              </Show>
            </span>
          </div>
          <Show when={props.u.tabs}>
            <div class={s.detailRow}>
              <span class={s.key}>Running</span>
              <span class={s.val}>
                {props.u.tabs} terminal tab{props.u.tabs === 1 ? "" : "s"} (their processes will be stopped)
              </span>
            </div>
          </Show>
        </div>
        <Show when={props.u.dirty || props.u.unpushed}>
          <div class={s.warning}>This deletes work that is not saved anywhere else. It cannot be undone.</div>
        </Show>
        <label class={s.check}>
          <input type="checkbox" checked={local()} onChange={(e) => setLocal(e.currentTarget.checked)} />
          Delete local branch (git branch -D)
        </label>
        <Show when={props.u.hasRemote}>
          <label class={s.check}>
            <input type="checkbox" checked={remote()} onChange={(e) => setRemote(e.currentTarget.checked)} />
            Delete remote branch (git push --delete)
          </label>
        </Show>
        <div class={s.actions}>
          <button type="button" class={`${btn.btn} ${btn.default} ${btn.sm}`} onClick={() => setRemoving(null)}>
            <span class={btn.label}>Cancel</span>
          </button>
          <button ref={(el) => requestAnimationFrame(() => el.focus({ preventScroll: true }))} type="button" class={`${btn.btn} ${btn.warn} ${btn.sm}`} onClick={confirm}>
            <span class={btn.label}>Remove worktree</span>
          </button>
        </div>
      </div>
    );
  };

  const menuUnit = () => units().find((u) => u.name === menu()?.unit);

  return (
    <div
      ref={root}
      class={s.root}
      onClick={() => setMenu(null)}
      onKeyDown={(e) => {
        if (e.key !== "Escape") return;
        setMenu(null);
        setAdding(false);
        setRemoving(null);
      }}
    >
      <DemoWindow crumbs={["hooli", "hooli-search", unit().name]} toast={toast()} minHeight={480}>
        <div class={`${s.tree} ${sidebar.tree} ${rows.rowScope}`}>
          <div class={sidebar.treeHead}>
            <span class={sidebar.headStrut} />
            <div class={sidebar.spaceHeader}>
              <span class={sidebar.spaceHeaderName}>hooli</span>
              <span class={sidebar.spaceHeaderKind}>{"· Spaces"}</span>
            </div>
          </div>
          <div class={`${sidebar.treeScroll} ${s.treeScroll}`}>
            <div class={`node ${rows.projectCard}`}>
              <div class={`${rows.row} ${rows.project} ${s.unit}`} onContextMenu={(e) => showMenu(e)}>
                <span class={`${rows.rowIcon} ${rows.projectIcon}`}>
                  <span class={rows.projectIconArt}>
                    <Icon icon={Search} />
                  </span>
                  <span class={rows.iconChevron} aria-hidden="true">
                    <Icon icon={ChevronDown} />
                  </span>
                </span>
                <span class={rows.label}>hooli-search</span>
                <span class={rows.rowEnd}>
                  <button type="button" class={s.more} aria-label="Add worktree" onClick={(e) => (e.stopPropagation(), setMenu(null), setAdding(true))}>
                    <Icon icon={Plus} />
                  </button>
                  <button type="button" class={s.more} aria-label="Actions for hooli-search" onClick={(e) => showMenu(e)}>
                    <Icon icon={Ellipsis} />
                  </button>
                </span>
              </div>
              <Index each={units()}>{(u) => <Row u={u()} />}</Index>
            </div>
            <div class={`node ${rows.projectCard}`}>
              <div class={`${rows.row} ${rows.project}`}>
                <span class={`${rows.rowIcon} ${rows.projectIcon}`}>
                  <span class={rows.projectIconArt}>
                    <Icon icon={Mail} />
                  </span>
                  <span class={rows.iconChevron} aria-hidden="true">
                    <Icon icon={ChevronRight} />
                  </span>
                </span>
                <span class={rows.label}>hooli-mail</span>
              </div>
            </div>
          </div>
        </div>
        <Graph />
        <Show when={adding() || removing()}>
          <div class={s.scrim} onClick={() => (setAdding(false), setRemoving(null))} />
          <Show when={adding()} fallback={<Show when={units().find((u) => u.name === removing())}>{(u) => <RemoveDialog u={u()} />}</Show>}>
            <AddDialog />
          </Show>
        </Show>
      </DemoWindow>
      <Show when={menu()}>
        {(m) => (
          <div class={s.menu} style={{ left: `${m().x}px`, top: `${m().y}px` }} role="menu" onClick={(e) => e.stopPropagation()}>
            <Show
              when={menuUnit()}
              fallback={
                <>
                  <button type="button" role="menuitem" class={s.option} onClick={() => (setMenu(null), setAdding(true))}>
                    Add worktree
                  </button>
                  <button type="button" role="menuitem" class={s.option} onClick={prune}>
                    Prune worktrees
                  </button>
                </>
              }
            >
              {(u) => (
                <>
                  <button type="button" role="menuitem" class={s.option} disabled={u().stale} onClick={() => (setSel(u().name), setMenu(null))}>
                    Graph
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    class={s.option}
                    disabled={u().name === "main"}
                    title={u().name === "main" ? "The main checkout is the repository itself" : undefined}
                    onClick={() => (setMenu(null), u().stale ? prune() : setRemoving(u().name))}
                  >
                    {u().stale ? "Prune worktrees" : "Remove worktree"}
                  </button>
                </>
              )}
            </Show>
          </div>
        )}
      </Show>
    </div>
  );
}
