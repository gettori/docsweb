import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { Building2, Camera, House, Landmark, Mail, MessageCircle, Music, Sandwich, Search, Tags, type IconNode } from "lucide";
import "../app/css/tokens.css";
import { AgentMark, BranchRow, Icon, ModeTile, ProjectRow, SpaceTile, StatusBubble, type Agent, type Rollup } from "../app/kit";
import { BranchMark, WorktreeMark } from "../app/gitMarks";
import sidebar from "../app/css/LeftSidebar.module.css";
import rows from "../app/css/SidebarRows.module.css";
import { PIED_PIPER, PIPER_PP } from "../app/brandIcons";
import s from "./Spaces.module.css";


// Every agent and account pair the dialog would offer on this machine. Gemini
// has no named accounts, so its row carries no account, as in the app.
const PAIRS: { agent: Agent; name: string; account: string }[] = [
  { agent: "claude", name: "Claude", account: "hooli" },
  { agent: "claude", name: "Claude", account: "raviga" },
  { agent: "claude", name: "Claude", account: "me" },
  { agent: "codex", name: "Codex", account: "me" },
  { agent: "copilot", name: "Copilot", account: "raviga" },
  { agent: "gemini", name: "Gemini", account: "" },
];

// Only a project with a branch is drawn open.
type Project = { name: string; icon: IconNode; branch?: string; worktree?: boolean; rollup?: Rollup };

type Space = {
  name: string;
  hue: string;
  glyph: IconNode;
  nameWidth: string;
  projects: Project[];
  // Indexes into PAIRS, or null for a project with no rule.
  allowed: number[] | null;
  refused: number | null;
  host: string;
  rollup: Rollup;
};

const SPACES: Space[] = [
  {
    name: "hooli",
    hue: "96 165 250",
    glyph: Building2,
    nameWidth: "52px",
    projects: [
      { name: "hooli-search", icon: Search, branch: "fix/search-ranking", worktree: true, rollup: { waiting: 1 } },
      { name: "hooli-mail", icon: Mail, rollup: { executing: 1 } },
      { name: "hooli-chat", icon: MessageCircle, rollup: { idle: 1 } },
      { name: "hooli-music", icon: Music },
    ],
    allowed: [0],
    refused: 2,
    host: "GitHub / hooli-dev",
    rollup: { waiting: 1 },
  },
  {
    name: "raviga",
    hue: "192 132 252",
    glyph: Landmark,
    nameWidth: "64px",
    projects: [
      { name: "pied-piper", icon: PIED_PIPER, branch: "feat/middle-out", worktree: true, rollup: { executing: 2 } },
      { name: "seefood", icon: Camera, rollup: { idle: 1 } },
    ],
    allowed: [1, 4],
    refused: 0,
    host: "GitLab / raviga-dev",
    rollup: { executing: 2 },
  },
  {
    name: "personal",
    hue: "111 197 154",
    glyph: House,
    nameWidth: "72px",
    projects: [
      { name: "piperchat", icon: MessageCircle, branch: "try/new-agent", worktree: true, rollup: { executing: 1 } },
      { name: "not-hotdog-testing", icon: Sandwich },
      { name: "pipernet", icon: PIPER_PP, rollup: { idle: 1 } },
    ],
    allowed: null,
    refused: null,
    host: "GitHub / you",
    rollup: { executing: 1 },
  },
];

const label = (p: (typeof PAIRS)[number]) => (p.account ? `${p.name} / ${p.account}` : p.name);

export default function Spaces() {
  const [tick, setTick] = createSignal(0);
  const [pin, setPin] = createSignal<number | null>(null);
  const si = () => pin() ?? tick() % SPACES.length;
  const sp = () => SPACES[si()];
  const only = () => sp().allowed !== null;
  const isOn = (i: number) => !!sp().allowed?.includes(i);
  let root!: HTMLDivElement;

  onMount(() => {
    let visible = false;
    const io = new IntersectionObserver((e) => (visible = e[0].isIntersecting));
    io.observe(root);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = setInterval(() => {
      if (visible && !document.hidden && !reduced) setTick((n) => n + 1);
    }, 3400);
    onCleanup(() => {
      clearInterval(id);
      io.disconnect();
    });
  });

  return (
    <div ref={root} class={s.wrap} style={{ "--hue": sp().hue }}>
      <div class={s.head}>
        <h2 class={s.h2}>
          A space per client. <span class={s.accent}>One for you.</span>
        </h2>
        <div class={s.headRight}>
          <p>
            Work for a company, or three? Give each its own space, pin its repos to that company's agent login and git account, and keep a space of your own where any agent goes.
          </p>
          <div class={s.segs} role="group" aria-label="Space">
            <For each={SPACES}>
              {(x, i) => (
                <button
                  type="button"
                  class={s.seg}
                  aria-pressed={i() === si()}
                  style={i() === si() ? { background: `rgb(${x.hue} / 0.16)`, color: `rgb(${x.hue})` } : undefined}
                  onClick={() => setPin(pin() === i() ? null : i())}
                >
                  <Icon icon={x.glyph} size={14} />
                  {x.name}
                </button>
              )}
            </For>
          </div>
        </div>
      </div>

      <div class={s.stage}>
        <div class={s.panel}>
          <div class={`${s.tree} ${sidebar.tree} ${rows.rowScope}`}>
            <div class={sidebar.treeHead}>
              <span class={sidebar.headStrut} />
              <div class={sidebar.spaceHeader}>
                <span class={sidebar.spaceHeaderName}>{sp().name}</span>
                <span class={sidebar.spaceHeaderKind}>{"\u00b7 Spaces"}</span>
              </div>
            </div>
            <div class={sidebar.treeScroll}>
              <For each={sp().projects}>
                {(p) => (
                  <Show
                    when={p.branch}
                    fallback={<ProjectRow name={p.name} icon={p.icon} end={p.rollup && <StatusBubble rollup={p.rollup} />} />}
                  >
                    {(branch) => (
                      <ProjectRow name={p.name} icon={p.icon} open>
                        <BranchRow
                          label={branch()}
                          icon={p.worktree ? <WorktreeMark active /> : <BranchMark active={false} current />}
                          end={p.rollup && <StatusBubble rollup={p.rollup} />}
                        />
                      </ProjectRow>
                    )}
                  </Show>
                )}
              </For>
            </div>
            <div class={sidebar.spaceBar}>
              <div class={sidebar.stripNav}>
                <div class={sidebar.spaceScroll}>
                  <For each={SPACES}>
                    {(x, i) => (
                      <SpaceTile
                        name={x.name}
                        hueRgb={x.hue}
                        glyph={x.glyph}
                        nameWidth={x.nameWidth}
                        active={i() === si()}
                        rollup={i() === si() ? undefined : x.rollup}
                      />
                    )}
                  </For>
                </div>
                <div class={sidebar.spaceDivider} />
                <ModeTile label="Topics" glyph={Tags} />
              </div>
            </div>
          </div>
        </div>

        <div class={s.panel}>
          <div class={s.dialog}>
            <div class={s.title}>Agents for {"\u201c"}{sp().projects[0].name}{"\u201d"}</div>
            <div class={s.mode}>
              <span classList={{ [s.modeOn]: !only() }}>Every agent</span>
              <span classList={{ [s.modeOn]: only() }}>Only selected</span>
            </div>
            <div class={s.list} classList={{ [s.idle]: !only() }}>
              <For each={PAIRS}>
                {(p, i) => (
                  <div class={s.row} classList={{ [s.rowOn]: only() && isOn(i()) }}>
                    <span class={s.box}>{only() && isOn(i()) ? "\u2713" : ""}</span>
                    <AgentMark agent={p.agent} size={14} />
                    <span class={s.name}>{p.name}</span>
                    <span class={s.account}>{p.account}</span>
                  </div>
                )}
              </For>
            </div>
            <div class={s.foot}>{only() ? `${sp().allowed!.length} of ${PAIRS.length} agents allowed` : `All ${PAIRS.length} agents allowed`}</div>
          </div>
          <Show
            when={sp().refused !== null}
            fallback={<div class={`${s.verdict} ${s.open}`}>Any agent you have configured can start a session here.</div>}
          >
            <div class={`${s.verdict} ${s.refused}`}>{label(PAIRS[sp().refused!])} is not allowed in this project</div>
          </Show>
          <div class={s.host}>
            <span>Git account</span>
            {sp().host}
          </div>
        </div>
      </div>

      <div class={s.beats}>
        <div>
          <b>One space per company</b>
          <p>Switch spaces and the other company's repos drop out of the tree, leaving one status dot on its tile.</p>
        </div>
        <div>
          <b>Accounts pinned per repo</b>
          <p>Allow only the client's own login and any other agent or account is refused before a session starts. Every worktree under the repo inherits the rule.</p>
        </div>
        <div>
          <b>Git as the right person</b>
          <p>Each repo picks the GitHub or GitLab account its pull requests and issues go through, and can push with it too.</p>
        </div>
      </div>
      <a class={s.more} href="/docs/agents/accounts-and-usage/#limiting-agents-per-project">
        How project rules work {"->"}
      </a>
    </div>
  );
}
