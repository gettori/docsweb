import { createMemo, createSignal, For, Index, Match, onCleanup, onMount, Show, Switch } from "solid-js";
import { Building2, Camera, ChevronDown, ChevronRight, House, Landmark, Mail, MessageCircle, Music, Sandwich, Search, Tags, type IconNode } from "lucide";
import { AgentMark, Icon, ModeTile, SpaceTile, StatusBubble, type Agent, type Rollup } from "../../app/kit";
import { BranchMark, WorktreeMark } from "../../app/gitMarks";
import { PIED_PIPER, PIPER_PP } from "../../app/brandIcons";
import w from "../../app/window.module.css";
import sidebar from "../../app/css/LeftSidebar.module.css";
import rows from "../../app/css/SidebarRows.module.css";
import btn from "../../app/css/Button.module.css";
import DemoWindow, { useToast } from "./DemoWindow";
import s from "./SpacesDemo.module.css";

type State = "work" | "need" | "done";
type Turn = { prompt: string; tools: [name: string, arg: string, edit?: boolean][]; ask?: string; reply: string };
type Session = { agent: Agent; turns: Turn[]; turn: number; state: State; step: number; asked: boolean; denied?: boolean };
type Branch = { name: string; worktree: boolean; session?: Session };
type Project = { name: string; icon: IconNode; open: boolean; branches: Branch[] };
type Space = { name: string; hue: string; glyph: IconNode; nameWidth: string; projects: Project[] };

const session = (agent: Agent, state: State, turns: Turn[]): Session => ({ agent, turns, turn: 0, state, step: state === "work" ? 1 : turns[0].tools.length, asked: state !== "work" });

// Every turn ends on the same follow-up, so "Start another turn" always has somewhere to go.
const TIDY: Turn = { prompt: "Tidy up anything you left behind", tools: [["Grep", "TODO"], ["Edit", "src/index.ts", true]], reply: "Removed two leftover TODOs. Nothing else to tidy." };

const START = (): Space[] => [
  {
    name: "hooli",
    hue: "96 165 250",
    glyph: Building2,
    nameWidth: "52px",
    projects: [
      {
        name: "hooli-search",
        icon: Search,
        open: true,
        branches: [
          {
            name: "fix/search-ranking",
            worktree: true,
            session: session("claude", "need", [
              {
                prompt: "Weight title matches above body matches, and add a test for it",
                tools: [["Read", "src/rank.ts"], ["Edit", "src/rank.ts", true], ["Edit", "src/rank.test.ts", true]],
                ask: "pnpm test rank",
                reply: "Title hits now outrank body hits, and clicks break ties. All 6 ranking tests pass.",
              },
              TIDY,
            ]),
          },
          { name: "main", worktree: true },
        ],
      },
      {
        name: "hooli-mail",
        icon: Mail,
        open: true,
        branches: [
          {
            name: "main",
            worktree: false,
            session: session("codex", "work", [
              {
                prompt: "Retry sends that fail with a 5xx, three times with backoff",
                tools: [["Read", "src/send.ts"], ["Edit", "src/send.ts", true], ["Edit", "src/send.test.ts", true]],
                ask: "pnpm test send",
                reply: "Sends now retry three times on a 5xx, waiting 1s, 2s and 4s. Tests pass.",
              },
              TIDY,
            ]),
          },
        ],
      },
      {
        name: "hooli-chat",
        icon: MessageCircle,
        open: false,
        branches: [
          {
            name: "main",
            worktree: false,
            session: session("gemini", "done", [
              { prompt: "Bump fastify to 5.2", tools: [["Edit", "package.json", true], ["Bash", "pnpm install"]], reply: "Bumped fastify to 5.2.1. The build is clean." },
              TIDY,
            ]),
          },
        ],
      },
      { name: "hooli-music", icon: Music, open: false, branches: [{ name: "main", worktree: false }] },
    ],
  },
  {
    name: "raviga",
    hue: "192 132 252",
    glyph: Landmark,
    nameWidth: "64px",
    projects: [
      {
        name: "pied-piper",
        icon: PIED_PIPER,
        open: true,
        branches: [
          {
            name: "feat/middle-out",
            worktree: true,
            session: session("claude", "work", [
              {
                prompt: "Compress from the centre outwards, and test the round trip",
                tools: [["Read", "pied_piper/compress.py"], ["Edit", "pied_piper/middle_out.py", true], ["Edit", "tests/test_middle_out.py", true]],
                ask: "pytest tests/test_middle_out.py",
                reply: "Middle-out compresses the sample 38% smaller than zlib, and the round trip holds.",
              },
              TIDY,
            ]),
          },
          {
            name: "fix/weissman",
            worktree: true,
            session: session("codex", "work", [
              { prompt: "Guard the Weissman score against a zero second run", tools: [["Read", "pied_piper/weissman.py"], ["Edit", "pied_piper/weissman.py", true]], reply: "A zero second run now raises instead of dividing by zero." },
              TIDY,
            ]),
          },
          { name: "main", worktree: true },
        ],
      },
      {
        name: "seefood",
        icon: Camera,
        open: false,
        branches: [
          {
            name: "main",
            worktree: false,
            session: session("copilot", "done", [
              { prompt: "Scaffold the classifier", tools: [["Edit", "app/classify.py", true]], reply: "Added a classify() stub with the two labels, hotdog and not hotdog." },
              TIDY,
            ]),
          },
        ],
      },
    ],
  },
  {
    name: "personal",
    hue: "111 197 154",
    glyph: House,
    nameWidth: "72px",
    projects: [
      {
        name: "piperchat",
        icon: MessageCircle,
        open: true,
        branches: [
          {
            name: "try/new-agent",
            worktree: true,
            session: session("opencode", "work", [
              {
                prompt: "Call the real agent endpoint and let the user cancel a reply",
                tools: [["Read", "src/agent.ts"], ["Edit", "src/agent.ts", true], ["Edit", "src/App.tsx", true]],
                ask: "pnpm build",
                reply: "Replies come from /api/agent now, and Escape cancels one mid-stream.",
              },
              TIDY,
            ]),
          },
          { name: "main", worktree: true },
        ],
      },
      { name: "not-hotdog-testing", icon: Sandwich, open: false, branches: [{ name: "main", worktree: false }] },
      {
        name: "pipernet",
        icon: PIPER_PP,
        open: false,
        branches: [
          {
            name: "main",
            worktree: false,
            session: session("pi", "done", [
              { prompt: "Tighten the whitepaper intro", tools: [["Edit", "docs/whitepaper.md", true]], reply: "Cut the intro from four paragraphs to two." },
              TIDY,
            ]),
          },
        ],
      },
    ],
  },
];

const AGENT_NAME: Record<Agent, string> = { claude: "Claude", codex: "Codex", gemini: "Gemini", opencode: "OpenCode", copilot: "Copilot", kimi: "Kimi", pi: "Pi" };

function rollup(branches: Branch[]): Rollup {
  const r = { waiting: 0, executing: 0, idle: 0 };
  for (const b of branches) {
    if (b.session?.state === "need") r.waiting++;
    else if (b.session?.state === "work") r.executing++;
    else if (b.session?.state === "done") r.idle++;
  }
  return r;
}
const one = (b: Branch): Rollup => rollup([b]);

export default function SpacesDemo() {
  const [spaces, setSpaces] = createSignal(START());
  const [active, setActive] = createSignal(0);
  const [sel, setSel] = createSignal<[space: number, project: number, branch: number]>([0, 0, 0]);
  const { toast, say } = useToast();
  let root!: HTMLDivElement;

  const space = () => spaces()[active()];
  const picked = createMemo(() => {
    const [si, pi, bi] = sel();
    const p = spaces()[si].projects[pi];
    return { space: spaces()[si], project: p, branch: p.branches[bi] };
  });

  const edit = (si: number, pi: number, bi: number, fn: (x: Session) => Session) =>
    setSpaces((all) =>
      all.map((sp, i) =>
        i !== si
          ? sp
          : {
              ...sp,
              projects: sp.projects.map((p, j) =>
                j !== pi ? p : { ...p, branches: p.branches.map((b, k) => (k !== bi || !b.session ? b : { ...b, session: fn(b.session) })) },
              ),
            },
      ),
    );

  // Working sessions reveal a tool call per tick, then either stop for an
  // approval (once per turn, when the turn has one) or finish.
  const tick = () =>
    setSpaces((all) =>
      all.map((sp) => ({
        ...sp,
        projects: sp.projects.map((p) => ({
          ...p,
          branches: p.branches.map((b) => {
            const x = b.session;
            if (!x || x.state !== "work" || Math.random() < 0.35) return b;
            const t = x.turns[x.turn];
            if (x.step < t.tools.length) return { ...b, session: { ...x, step: x.step + 1 } };
            if (t.ask && !x.asked) return { ...b, session: { ...x, state: "need" as State, asked: true } };
            return { ...b, session: { ...x, state: "done" as State } };
          }),
        })),
      })),
    );

  onMount(() => {
    let visible = false;
    const io = new IntersectionObserver((e) => (visible = e[0].isIntersecting));
    io.observe(root);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = setInterval(() => {
      if (visible && !document.hidden && !reduced) tick();
    }, 1500);
    onCleanup(() => {
      clearInterval(id);
      io.disconnect();
    });
  });

  // Switching space moves the focus with it, onto the first branch there that has a session.
  const switchTo = (si: number) => {
    setActive(si);
    if (sel()[0] === si) return;
    const ps = spaces()[si].projects;
    for (let pi = 0; pi < ps.length; pi++) {
      const bi = ps[pi].branches.findIndex((b) => b.session);
      if (ps[pi].open && bi >= 0) return setSel([si, pi, bi]);
    }
    setSel([si, 0, 0]);
  };

  const toggle = (pi: number) =>
    setSpaces((all) => all.map((sp, i) => (i !== active() ? sp : { ...sp, projects: sp.projects.map((p, j) => (j !== pi ? p : { ...p, open: !p.open })) })));

  const act = (kind: "allow" | "deny" | "again" | "start") => {
    const [si, pi, bi] = sel();
    const b = picked().branch;
    if (kind === "start") {
      setSpaces((all) =>
        all.map((sp, i) =>
          i !== si
            ? sp
            : {
                ...sp,
                projects: sp.projects.map((p, j) =>
                  j !== pi ? p : { ...p, branches: p.branches.map((x, k) => (k !== bi ? x : { ...x, session: session("claude", "work", [TIDY]) })) },
                ),
              },
        ),
      );
      return say(`New Claude session on ${b.name}.`);
    }
    edit(si, pi, bi, (x) => {
      if (kind === "allow") return { ...x, state: "work", step: x.turns[x.turn].tools.length };
      if (kind === "deny") return { ...x, state: "done", denied: true };
      const next = Math.min(x.turn + 1, x.turns.length - 1);
      return { ...x, turn: next, state: "work", step: 1, asked: false, denied: false };
    });
  };

  const BranchLine = (props: { b: Branch; pi: number; bi: number }) => {
    const isSel = () => sel()[0] === active() && sel()[1] === props.pi && sel()[2] === props.bi;
    return (
      <div class={`node ${rows.branchNode}`}>
        <div
          class={`${rows.row} ${rows.branch} ${rows.sub1} ${isSel() ? rows.sel : ""}`}
          role="button"
          tabindex="0"
          aria-current={isSel() ? "true" : undefined}
          onClick={() => setSel([active(), props.pi, props.bi])}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setSel([active(), props.pi, props.bi]))}
        >
          <span class={rows.rowIcon}>{props.b.worktree ? <WorktreeMark active={!!props.b.session} /> : <BranchMark active={false} current />}</span>
          <span class={rows.label}>{props.b.name}</span>
          <span class={rows.rowEnd}>
            <StatusBubble rollup={one(props.b)} />
          </span>
        </div>
      </div>
    );
  };

  const Pane = () => {
    const b = () => picked().branch;
    const x = () => b().session;
    const turn = () => x()!.turns[x()!.turn];
    return (
      <section class={`${w.card} ${s.pane}`}>
        <Show
          when={x()}
          fallback={
            <div class={s.empty}>
              <b>No session on {b().name}</b>
              <span>
                {picked().project.name} in {picked().space.name}
              </span>
              <button type="button" class={`${btn.btn} ${btn.primary} ${btn.sm}`} onClick={() => act("start")}>
                <span class={btn.label}>New session</span>
              </button>
            </div>
          }
        >
          <div class={`${w.chat} ${s.chat}`}>
            <div class={w.statusStrip}>
              <span
                class={w.stateWord}
                style={{ color: x()!.state === "work" ? "var(--status-progress)" : x()!.state === "need" ? "var(--status-needs-you)" : "var(--status-idle)" }}
              >
                <span class={w.stateDot} />
                {x()!.state === "work" ? "Working" : x()!.state === "need" ? "Needs you" : "Done"}
              </span>
              <span class={w.sep}>{"\u00b7"}</span>
              <span class={s.who}>
                <AgentMark agent={x()!.agent} size={12} breathe={x()!.state === "work"} />
                {AGENT_NAME[x()!.agent]}
              </span>
              <span class={w.sep}>{"\u00b7"}</span>
              <span class={s.where}>
                {picked().project.name} / {b().name}
              </span>
            </div>
            <div class={w.transcript}>
              <div class={w.user}>{turn().prompt}</div>
              <For each={turn().tools.slice(0, x()!.step)}>
                {(t) => (
                  <div class={`${w.tool} ${w.in}`}>
                    <div class={w.toolRow}>
                      <span class={w.caret}>
                        <Icon icon={ChevronRight} size={13} />
                      </span>
                      <span class={w.toolName} data-edit={t[2] ? "true" : "false"}>
                        {t[0]}
                      </span>
                      <span class={w.toolArg}>{t[1]}</span>
                    </div>
                  </div>
                )}
              </For>
              <Switch>
                <Match when={x()!.state === "need"}>
                  <div class={`${w.tool} ${w.in}`} data-blocked="true">
                    <div class={w.toolRow}>
                      <span class={w.caret}>
                        <Icon icon={ChevronDown} size={13} />
                      </span>
                      <span class={w.toolName}>Bash</span>
                      <span class={w.toolArg}>{turn().ask}</span>
                    </div>
                    <div class={w.perm}>
                      <div class={w.permQ}>
                        Run <code>{turn().ask}</code> in this workspace?
                      </div>
                      <div class={w.permBtns}>
                        <button type="button" class={`${btn.btn} ${btn.primary} ${btn.sm}`} onClick={() => act("allow")}>
                          <span class={btn.label}>Allow once</span>
                        </button>
                        <button type="button" class={`${btn.btn} ${btn.default} ${btn.sm}`} onClick={() => act("deny")}>
                          <span class={btn.label}>Deny</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </Match>
                <Match when={x()!.state === "work"}>
                  <div class={w.thinking}>Thinking</div>
                </Match>
                <Match when={x()!.state === "done"}>
                  <div class={`${w.prose} ${w.in}`}>{x()!.denied ? "Stopped. You denied the command, so nothing ran." : turn().reply}</div>
                  <button type="button" class={`${btn.btn} ${btn.default} ${btn.sm} ${s.again}`} onClick={() => act("again")}>
                    <span class={btn.label}>Start another turn</span>
                  </button>
                </Match>
              </Switch>
            </div>
          </div>
        </Show>
      </section>
    );
  };

  return (
    <div ref={root}>
      <DemoWindow crumbs={[picked().space.name, picked().project.name, picked().branch.name]} toast={toast()} minHeight={480}>
        <div class={`${s.tree} ${sidebar.tree} ${rows.rowScope}`}>
          <div class={sidebar.treeHead}>
            <span class={sidebar.headStrut} />
            <div class={sidebar.spaceHeader}>
              <span class={sidebar.spaceHeaderName}>{space().name}</span>
              <span class={sidebar.spaceHeaderKind}>{"\u00b7 Spaces"}</span>
            </div>
          </div>
          <div class={`${sidebar.treeScroll} ${s.treeScroll}`}>
            <Index each={space().projects}>
              {(p, pi) => (
                <div class={`node ${rows.projectCard}`}>
                  <div
                    class={`${rows.row} ${rows.project}`}
                    role="button"
                    tabindex="0"
                    aria-expanded={p().open}
                    onClick={() => toggle(pi)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), toggle(pi))}
                  >
                    <span class={`${rows.rowIcon} ${rows.projectIcon}`}>
                      <span class={rows.projectIconArt}>
                        <Icon icon={p().icon} />
                      </span>
                      <span class={rows.iconChevron} aria-hidden="true">
                        <Icon icon={p().open ? ChevronDown : ChevronRight} />
                      </span>
                    </span>
                    <span class={rows.label}>{p().name}</span>
                    <span class={rows.rowEnd}>
                      <Show when={!p().open}>
                        <StatusBubble rollup={rollup(p().branches)} />
                      </Show>
                    </span>
                  </div>
                  <Show when={p().open}>
                    <Index each={p().branches}>{(b, bi) => <BranchLine b={b()} pi={pi} bi={bi} />}</Index>
                  </Show>
                </div>
              )}
            </Index>
          </div>
          <div class={sidebar.spaceBar}>
            <div class={sidebar.stripNav}>
              <div class={sidebar.spaceScroll}>
                <Index each={spaces()}>
                  {(x, i) => (
                    <button
                      type="button"
                      class={s.tileBtn}
                      aria-label={`Switch to ${x().name}`}
                      aria-pressed={i === active()}
                      onClick={() => switchTo(i)}
                    >
                      <SpaceTile
                        name={x().name}
                        hueRgb={x().hue}
                        glyph={x().glyph}
                        nameWidth={x().nameWidth}
                        active={i === active()}
                        rollup={i === active() ? undefined : rollup(x().projects.flatMap((p) => p.branches))}
                      />
                    </button>
                  )}
                </Index>
              </div>
              <div class={sidebar.spaceDivider} />
              <ModeTile label="Topics" glyph={Tags} />
            </div>
          </div>
        </div>
        <Pane />
      </DemoWindow>
    </div>
  );
}
