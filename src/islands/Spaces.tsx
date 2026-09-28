import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { Building2, Camera, House, Landmark, Mail, MessageCircle, Music, Sandwich, Search, Tags, type IconNode } from "lucide";
import "../app/css/tokens.css";
import { AgentMark, BranchRow, Icon, ModeTile, ProjectRow, SpaceTile, StatusBubble, type Agent, type Rollup } from "../app/kit";
import { BranchMark, WorktreeMark } from "../app/gitMarks";
import sidebar from "../app/css/LeftSidebar.module.css";
import rows from "../app/css/SidebarRows.module.css";
import s from "./Spaces.module.css";

// Brand marks drawn in lucide's 24x24 box so Icon can take them. Each is 512
// units tall in its own box, and the width is centred.
const brand = (width: number, d: string): IconNode => [
  ["path", { d, fill: "currentColor", stroke: "none", transform: `translate(${(24 - (width * 24) / 512) / 2} 0) scale(${24 / 512})` }],
];

// Font Awesome Free 6.7.2 (fontawesome.com), CC BY 4.0.
const PIED_PIPER = brand(480, "M455.93,23.2C429.23,30,387.79,51.69,341.35,90.66A206,206,0,0,0,240,64C125.13,64,32,157.12,32,272s93.13,208,208,208,208-93.13,208-208a207.25,207.25,0,0,0-58.75-144.81,155.35,155.35,0,0,0-17,27.4A176.16,176.16,0,0,1,417.1,272c0,97.66-79.44,177.11-177.09,177.11a175.81,175.81,0,0,1-87.63-23.4c82.94-107.33,150.79-37.77,184.31-226.65,5.79-32.62,28-94.26,126.23-160.18C471,33.45,465.35,20.8,455.93,23.2ZM125,406.4A176.66,176.66,0,0,1,62.9,272C62.9,174.34,142.35,94.9,240,94.9a174,174,0,0,1,76.63,17.75C250.64,174.76,189.77,265.52,125,406.4Z");
const PIPER_PP = brand(448, "M205.3 174.6c0 21.1-14.2 38.1-31.7 38.1-7.1 0-12.8-1.2-17.2-3.7v-68c4.4-2.7 10.1-4.2 17.2-4.2 17.5 0 31.7 16.9 31.7 37.8zm52.6 67c-7.1 0-12.8 1.5-17.2 4.2v68c4.4 2.5 10.1 3.7 17.2 3.7 17.4 0 31.7-16.9 31.7-37.8 0-21.1-14.3-38.1-31.7-38.1zM448 80v352c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V80c0-26.5 21.5-48 48-48h352c26.5 0 48 21.5 48 48zM185 255.1c41 0 74.2-35.6 74.2-79.6 0-44-33.2-79.6-74.2-79.6-12 0-24.1 3.2-34.6 8.8h-45.7V311l51.8-10.1v-50.6c8.6 3.1 18.1 4.8 28.5 4.8zm158.4 25.3c0-44-33.2-79.6-73.9-79.6-3.2 0-6.4.2-9.6.7-3.7 12.5-10.1 23.8-19.2 33.4-13.8 15-32.2 23.8-51.8 24.8V416l51.8-10.1v-50.6c8.6 3.2 18.2 4.7 28.7 4.7 40.8 0 74-35.6 74-79.6z");

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
