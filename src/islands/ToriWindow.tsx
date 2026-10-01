import { createEffect, createMemo, createSignal, For, Index, Match, onCleanup, onMount, Show, Switch, type JSX } from "solid-js";
import {
  Anchor,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Brain,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  Ellipsis,
  Eye,
  FileCode,
  Files,
  GitBranch,
  GitPullRequest,
  Globe,
  History,
  House,
  MessageSquare,
  PanelLeft,
  Paperclip,
  PenLine,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Smartphone,
  SquareTerminal,
  Tags,
  Undo2,
  Workflow,
} from "lucide";
import "../app/css/tokens.css";
import {
  AgentMark,
  BranchRow,
  Button,
  Icon,
  ModeTile,
  PrLine,
  ProjectRow,
  SpaceTile,
  StatusBubble,
  SyncPush,
  Tab,
  TabMark,
  type Agent,
  type Rollup,
  type TabStatus,
} from "../app/kit";
import { BranchMark, WorktreeMark } from "../app/gitMarks";
import { loadScene, sceneFor, Wheel } from "../app/autopilotParts";
import w from "../app/window.module.css";
import sidebar from "../app/css/LeftSidebar.module.css";
import rows from "../app/css/SidebarRows.module.css";
import toolbar from "../app/css/Toolbar.module.css";
import sw from "../app/css/AutopilotSwitch.module.css";
import review from "../app/css/ReviewPanel.module.css";
import cp from "../app/css/CheckpointTimeline.module.css";
import seg from "../app/css/SegmentedControl.module.css";
import av from "../app/css/AutopilotView.module.css";
import sp from "../app/css/ShellParts.module.css";
import dc from "../app/css/DecisionCard.module.css";
import hz from "../app/css/Horizon.module.css";

export type Mode = "loop" | "undo" | "review" | "cockpit";
type Session = "work" | "need" | "done";

const LOOP: Record<Mode, number> = { loop: 24, undo: 14, review: 14, cockpit: 16 };
const STILL: Record<Mode, number> = { loop: 16.4, undo: 9, review: 10.4, cockpit: 8 };
const AMBER = "217 164 104";
const EASE = "cubic-bezier(.2,.8,.2,1)";

function CockpitSwitch(props: { cockpit: boolean; state: "idle" | "working" | "needs"; count?: number }) {
  return (
    <div class={sw.pill} data-state={props.state} data-view={props.cockpit ? "autopilot" : "workspace"}>
      <Show
        when={props.cockpit}
        fallback={
          <span class={sw.segment}>
            <Wheel state={props.state} count={props.count} />
          </span>
        }
      >
        <span class={`${sw.segment} ${sw.active}`}>
          <Wheel state={props.state} count={props.count} active />
          <span class={sw.label} data-widest="Workspace">
            <span>Cockpit</span>
          </span>
        </span>
      </Show>
      <Show
        when={!props.cockpit}
        fallback={
          <span class={sw.segment}>
            <Icon icon={PanelLeft} class={sw.icon} />
          </span>
        }
      >
        <span class={`${sw.segment} ${sw.active}`}>
          <Icon icon={PanelLeft} class={sw.icon} />
          <span class={sw.label} data-widest="Workspace">
            <span>Workspace</span>
          </span>
        </span>
      </Show>
    </div>
  );
}

function Cursor(props: { x: number; y: number; down?: boolean }) {
  return (
    <svg
      class={w.cursor}
      width="18"
      height="22"
      viewBox="0 0 18 22"
      style={{ left: `${props.x}px`, top: `${props.y}px`, transform: props.down ? "scale(.82)" : "none" }}
    >
      <path d="M1 1l15 11-7 1-4 7z" fill="#fff" stroke="#15171c" stroke-width="1.2" stroke-linejoin="round" />
    </svg>
  );
}

function ToolRow(props: {
  name: string;
  arg: string;
  edit?: boolean;
  add?: number;
  del?: number;
  summary?: string;
  blocked?: boolean;
  class?: string;
  children?: JSX.Element;
}) {
  return (
    <div class={`${w.tool} ${props.class ?? ""}`} data-blocked={props.blocked ? "true" : "false"}>
      <div class={w.toolRow}>
        <span class={w.caret}>
          <Icon icon={ChevronRight} size={13} />
        </span>
        <span class={w.toolName} data-edit={props.edit ? "true" : "false"}>
          {props.name}
        </span>
        <span class={w.toolArg}>{props.arg}</span>
        <Show when={props.add != null}>
          <span class={w.add}>+{props.add}</span>
          <span class={w.del}>-{props.del}</span>
        </Show>
        <Show when={props.summary}>
          <span class={w.toolSummary}>{props.summary}</span>
        </Show>
      </div>
      {props.children}
    </div>
  );
}

function FileGlyph() {
  return <span class={w.fileGlyph}>TS</span>;
}

/* -------------------------------------------------------------------------- */

export default function ToriWindow(props: {
  mode?: Mode;
  region?: string;
  skipChaos?: boolean;
  maxScale?: number;
  still?: boolean;
  onStormHover?: boolean;
}) {
  const mode = (): Mode => props.mode ?? "loop";
  const startT = () => (mode() === "loop" && props.skipChaos ? 5.4 : 0);
  let root!: HTMLDivElement;
  const [cw, setCw] = createSignal(1200);
  const [t, setT] = createSignal(0);
  const [reduced, setReduced] = createSignal(false);
  const [approvedAt, setApprovedAt] = createSignal<number | null>(null);
  const [hoverStorm, setHoverStorm] = createSignal(false);
  const [scenes, setScenes] = createSignal<Record<string, string>>({});
  const [scene, setScene] = createSignal("night");
  const frozen = () => reduced() || !!props.still;
  let visible = true;

  createEffect(() => {
    mode();
    setApprovedAt(null);
    setT(frozen() ? STILL[mode()] : startT());
  });

  onMount(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setScene(sceneFor(new Date().getHours()));
    const ro = new ResizeObserver((e) => setCw(e[0].contentRect.width || 1200));
    ro.observe(root);
    const io = new IntersectionObserver((e) => (visible = e[0].isIntersecting));
    io.observe(root);
    const id = setInterval(() => {
      if (!visible || frozen() || document.hidden) return;
      const next = t() + 0.1;
      if (next >= LOOP[mode()]) {
        setApprovedAt(null);
        setT(startT());
      } else setT(next);
    }, 100);
    for (const s of [scene(), "storm"]) loadScene(s).then((txt) => setScenes((m) => ({ ...m, [s]: txt })));
    onCleanup(() => {
      clearInterval(id);
      ro.disconnect();
      io.disconnect();
    });
  });

  const region = createMemo(() => String(props.region ?? "0,0,1200,740").split(",").map(Number));
  const scale = () => Math.min(props.maxScale ?? 1.6, cw() / region()[2]);
  const isLoop = () => mode() === "loop";
  const isUndo = () => mode() === "undo";
  const isReview = () => mode() === "review";
  const isCockpit = () => mode() === "cockpit";
  const at = (a: number, b = Infinity) => t() >= a && t() < b;

  /* ---- loop state ---- */
  const web = (dt = 0): Session => {
    if (!isLoop()) return "done";
    const x = t() - dt;
    if (x < 6.5) return "work";
    if (x < 13.2) return "need";
    if (x < 19.8) return "work";
    return "done";
  };
  const onWebhooks = () => !isLoop() || t() >= 11.3;
  const chaos = () => isLoop() && !props.skipChaos && t() < 5.2;
  const fold = () => t() >= 4;

  const webRollup = (): Rollup =>
    web() === "need" ? { waiting: 1 } : web() === "work" ? { executing: 1 } : { idle: 1 };

  /* ---- sidebar ---- */
  const Sidebar = () => (
    <div class={`${sidebar.tree} ${rows.rowScope}`}>
      <div class={sidebar.treeHead}>
        <span class={sidebar.headStrut} />
        <div class={sidebar.spaceHeader}>
          <span class={sidebar.spaceHeaderName}>work</span>
          <span class={sidebar.spaceHeaderKind}>{"\u00b7 Spaces"}</span>
        </div>
        <Button class={sidebar.searchToggle} variant="ghost" size="md" icon={<Icon icon={Search} />} />
      </div>
      <div class={sidebar.treeScroll} style={{ overflow: "hidden" }}>
        <ProjectRow name="api" icon={Globe} open>
          <BranchRow label="main" icon={<BranchMark active={false} current={false} />} />
          <BranchRow
            label="feat/webhooks"
            icon={<WorktreeMark active={web() === "work"} />}
            selected={onWebhooks()}
            meta={<PrLine number={482} age="2h" checks="4/4" comments={3} />}
            end={<StatusBubble rollup={webRollup()} />}
          />
          <BranchRow
            label="fix/rate-limit"
            icon={<WorktreeMark active />}
            selected={!onWebhooks()}
            end={
              <>
                <SyncPush count={2} />
                <StatusBubble rollup={{ executing: 1 }} />
              </>
            }
          />
        </ProjectRow>
        <ProjectRow name="web" icon={Workflow} end={<StatusBubble rollup={{ executing: 2, idle: 1 }} />} />
        <ProjectRow name="infra" icon={House} open>
          <BranchRow label="main" icon={<BranchMark active={false} current />} end={<StatusBubble rollup={{ idle: 1 }} />} />
        </ProjectRow>
      </div>
      <div class={sidebar.spaceBar}>
        <div class={sidebar.stripNav}>
          <div class={sidebar.spaceScroll}>
            <SpaceTile name="work" hueRgb={AMBER} active />
            <SpaceTile name="personal" hueRgb="111 197 154" glyph={House} rollup={{ waiting: 1 }} />
          </div>
          <div class={sidebar.spaceDivider} />
          <ModeTile label="Topics" glyph={Tags} />
        </div>
        <span class={`${sidebar.stripBtn} ${sidebar.dockBtn}`}>
          <Icon icon={SquareTerminal} />
        </span>
      </div>
    </div>
  );

  /* ---- tab strip ---- */
  const tabs = createMemo(() => {
    type T = { key: string; label: string; agent?: Agent; status?: TabStatus; file?: string; diff?: boolean; selected: boolean };
    if (isReview()) {
      const onChat = at(5.2, 9.2);
      return [
        { key: "d", label: "verify.ts (Working tree)", diff: true, selected: !onChat },
        { key: "c", label: "Sign webhook payloads", agent: "claude", status: at(6.2, 8.8) ? "working" : "idle", selected: onChat },
        { key: "f", label: "sign.ts", file: "ts", selected: false },
      ] as T[];
    }
    if (!onWebhooks()) {
      return [
        { key: "c", label: "Cap the rate limiter", agent: "codex", status: "working", selected: true },
        { key: "f", label: "limiter.ts", file: "ts", selected: false },
      ] as T[];
    }
    const s = web();
    return [
      {
        key: "c",
        label: "Sign webhook payloads",
        agent: "claude",
        status: s === "need" ? "needs" : s === "work" ? "working" : "idle",
        selected: true,
      },
      { key: "z", label: "zsh", file: "sh", selected: false },
      { key: "f", label: "sign.ts", file: "ts", selected: false },
    ] as T[];
  });

  const TabStrip = () => (
    <div class={w.strip}>
      <Index each={tabs()}>
        {(tb) => (
          <Tab
            label={tb().label}
            selected={tb().selected}
            icon={
              tb().agent ? (
                <TabMark agent={tb().agent!} status={tb().status ?? null} />
              ) : tb().diff ? (
                <Icon icon={GitBranch} size={13} />
              ) : tb().file === "sh" ? (
                <Icon icon={SquareTerminal} size={13} />
              ) : (
                <Icon icon={FileCode} size={13} />
              )
            }
          />
        )}
      </Index>
      <span class={w.stripEnd}>
        <span class={w.split}>
          <span>
            <Icon icon={Plus} size={14} />
          </span>
          <span>
            <Icon icon={ChevronDown} size={12} />
          </span>
        </span>
        <span class={w.railBtn}>
          <Icon icon={History} size={15} />
        </span>
      </span>
    </div>
  );

  /* ---- chat: status strip ---- */
  const StatusLine = (p: { state: "working" | "needs" | "idle"; secs?: number; files: number; ctx: string; pct: number }) => (
    <div class={w.statusStrip}>
      <span
        class={w.stateWord}
        style={{
          color: p.state === "working" ? "var(--status-progress)" : p.state === "needs" ? "var(--status-needs-you)" : "var(--status-idle)",
        }}
      >
        <span class={w.stateDot} />
        {p.state === "working" ? `Working ${p.secs ?? 12}s` : p.state === "needs" ? "Waiting for approval" : "Idle"}
      </span>
      <span class={w.sep}>{"\u00b7"}</span>
      <span>{p.files} files</span>
      <span class={w.sep}>{"\u00b7"}</span>
      <span>opus-4</span>
      <span class={w.meter}>
        <span class={w.pie} style={{ "--p": p.pct }} />
        {p.ctx}
      </span>
      <Icon icon={Ellipsis} size={15} />
    </div>
  );

  const Composer = (p: { placeholder: string; running: boolean; agent: Agent; lanes?: JSX.Element; text?: JSX.Element; chips?: JSX.Element; modeLabel?: string }) => (
    <div class={w.composer}>
      <Show when={p.lanes}>
        <div class={w.lanes}>{p.lanes}</div>
      </Show>
      <div class={w.box}>
        <Show when={p.chips}>
          <div class={w.chips}>{p.chips}</div>
        </Show>
        <div class={w.boxText}>
          <Show when={p.text} fallback={<span class={w.placeholder}>{p.placeholder}</span>}>
            {p.text}
          </Show>
        </div>
        <div class={w.boxBar}>
          <span class={w.sqBtn}>
            <Icon icon={Paperclip} size={13} />
          </span>
          <span class={w.sqBtn}>
            <Icon icon={PenLine} size={13} />
          </span>
          <span class={w.pillBtn}>
            <AgentMark agent={p.agent} size={12} />
            {p.agent === "claude" ? "Opus" : "gpt-5-codex"}
            <Icon icon={ChevronDown} size={11} />
          </span>
          <span class={w.pillBtn}>
            {p.modeLabel ?? "Accept edits"}
            <Icon icon={ChevronDown} size={11} />
          </span>
          <span class={w.send}>
            <Show when={p.running} fallback={<Icon icon={ArrowUpRight} size={14} />}>
              <span class={w.stopSq} />
            </Show>
          </span>
        </div>
      </div>
    </div>
  );

  /* ---- loop: codex chat before the switch ---- */
  const CodexChat = () => (
    <div class={w.chat}>
      <StatusLine state="working" secs={Math.round(40 + t() * 1.3)} files={2} ctx="148k/400k (37%)" pct={37} />
      <div class={w.transcript}>
        <div class={w.user}>Cap the limiter at 100 a minute per key and send Retry-After</div>
        <div class={w.model}>gpt-5-codex</div>
        <ToolRow name="Edit" edit arg="src/limiter.ts" add={14} del={3} />
        <ToolRow name="Bash" arg="pnpm test limiter" summary="18 lines" />
        <div class={w.prose}>
          Each key now gets 100 requests a minute, and a 429 carries <span class={w.code}>Retry-After</span> from the
          bucket's reset time. Limiter tests pass, running the full suite.
        </div>
        <ToolRow name="Bash" arg="pnpm test" summary="Running" />
      </div>
      <Composer placeholder="Type to queue for the next turn" running agent="codex" modeLabel="Auto" />
    </div>
  );

  /* ---- loop: claude chat after the switch ---- */
  const allowPressed = () => at(12.9, 13.3);
  const WebhooksChat = () => (
    <div class={w.chat}>
      <StatusLine
        state={web() === "need" ? "needs" : web() === "work" ? "working" : "idle"}
        secs={Math.max(1, Math.round((t() - 13.2) * 1.4))}
        files={t() >= 17.2 ? 4 : t() >= 16 ? 3 : 2}
        ctx={t() >= 18.6 ? "318k/1.0M (32%)" : "312k/1.0M (31%)"}
        pct={31}
      />
      <div class={w.transcript}>
        <div class={w.user}>Sign outgoing webhook payloads with HMAC-SHA256 and add a test for it.</div>
        <div class={w.model}>Opus</div>
        <ToolRow name="Edit" edit arg="src/webhooks/sign.ts" add={46} del={3} />
        <ToolRow name="Edit" edit arg="src/webhooks/deliver.ts" add={18} del={6} />
        <div class={w.prose}>
          Payloads are signed with the endpoint secret, and the signature goes out in an{" "}
          <span class={w.code}>X-Tori-Signature</span> header. Running the webhook tests next.
        </div>
        <ToolRow
          name="Bash"
          arg="pnpm test webhooks"
          blocked={web() === "need"}
          summary={web() === "need" ? "Waiting for approval" : t() < 17.6 ? "Running" : "38 lines  3.1s"}
        >
          <Show when={web() === "need"}>
            <div class={w.perm}>
              <div class={w.permQ}>
                Run <code>pnpm test webhooks</code> in this workspace?
              </div>
              <span class={w.permArgs}>Show the full arguments</span>
              <div class={w.permBtns} style={{ position: "relative" }}>
                <Button size="sm" variant="primary">
                  Allow once
                </Button>
                <Button size="sm" pressed={allowPressed()} class={allowPressed() ? "is-pressed" : ""}>
                  Allow for this session
                </Button>
                <Button size="sm">Always in this project</Button>
                <Button size="sm">Deny</Button>
                <Button size="sm" variant="ghost">
                  Deny with feedback
                </Button>
                <Show when={at(11.6, 13.3)}>
                  <Cursor x={t() >= 12 ? 150 : 260} y={t() >= 12 ? 12 : 60} down={allowPressed()} />
                </Show>
              </div>
            </div>
          </Show>
        </ToolRow>
        <Show when={at(13.3, 14.3)}>
          <div class={`${w.thinking} ${w.in}`}>
            <Icon icon={Brain} size={14} />
            Thinking
          </div>
        </Show>
        <Show when={t() >= 14.3}>
          <ToolRow class={w.in} name="Task" arg="Write a tampered payload test" summary={t() < 17 ? "Running" : undefined} />
        </Show>
        <Show when={t() >= 18.6}>
          <div class={`${w.prose} ${w.in}`}>All 42 webhook tests pass, including a new one for a tampered payload.</div>
        </Show>
      </div>
      <Composer
        placeholder={web() === "done" ? "Reply, or @ a file \u00b7 / for commands" : "Steer this turn, picked up in 1.5-5.4s"}
        running={web() !== "done"}
        agent="claude"
        lanes={
          <Show when={t() >= 14.3}>
            <span class={w.lane} data-on="true">
              <AgentMark agent="claude" size={12} breathe={web() === "work"} class={web() === "work" ? "tint-claude" : ""} />
              main <kbd>{"\u23251"}</kbd>
            </span>
            <span class={`${w.lane} ${w.in}`}>
              <span class={w.laneDot} data-done={t() >= 17 ? "true" : "false"} />
              Write a tampered payload test
              <span class={w.laneFig}>{t() >= 17 ? "18.4k" : `${Math.max(1, Math.round(t() - 14.3))}s`}</span>
              <kbd>{"\u23252"}</kbd>
            </span>
          </Show>
        }
      />
    </div>
  );

  /* ---- right panel: Changes ---- */
  type F = { name: string; dir: string; st: "A" | "M"; from?: number; turn?: number };
  const changeFiles = createMemo<F[]>(() => {
    if (isLoop() && !onWebhooks()) return [{ name: "limiter.ts", dir: "src", st: "M" }, { name: "limiter.test.ts", dir: "test", st: "M" }];
    const all: F[] = [
      { name: "sign.ts", dir: "src/webhooks", st: "A", turn: 3 },
      { name: "deliver.ts", dir: "src/webhooks", st: "M", turn: 4 },
      { name: "sign.test.ts", dir: "test", st: "A", from: 16, turn: 5 },
      { name: "types.ts", dir: "src/webhooks", st: "M", from: 17.2, turn: 6 },
    ];
    if (isReview()) return [{ name: "verify.ts", dir: "src/webhooks", st: "M" }, ...all];
    return all.filter((f) => !isLoop() || f.from == null || t() >= f.from);
  });

  const reverted = () => isUndo() && at(7.5, 12.8);
  const RightPanel = () => (
    <div class={w.right}>
      <div class={w.modeStrip}>
        <span class={w.modeBtn}>
          <Icon icon={Files} size={16} />
        </span>
        <span class={w.modeBtn}>
          <Icon icon={Search} size={16} />
        </span>
        <span class={w.modeBtn} data-on="true">
          <Icon icon={GitBranch} size={16} />
          <span class={w.modeCount}>{changeFiles().length}</span>
        </span>
        <span class={w.modeBtn}>
          <Icon icon={GitPullRequest} size={16} />
        </span>
      </div>
      <div class={`${review.reviewPanel} ${w.reviewWrap}`}>
        <div class={review.topBar}>
          <span class={review.title}>Source Control</span>
          <span class={review.spacer} />
          <Button size="sm" variant="ghost" icon={<Icon icon={RefreshCw} />} />
          <Button size="sm" variant="ghost" icon={<Icon icon={Ellipsis} />} />
        </div>
        <div class={review.branchBar}>
          <Icon icon={GitBranch} />
          <span class={review.branchName}>{onWebhooks() ? "feat/webhooks" : "fix/rate-limit"}</span>
          <span class={review.spacer} />
          <span class={review.aheadPill}>{"\u2191"}2</span>
          <Button size="sm" variant="ghost" icon={<Icon icon={GitPullRequest} />} />
        </div>
        <Show when={isReview()}>
          <div class={review.commitCard}>
            <div class={review.commitInput} style={{ "min-height": "20px" }}>
              <Show when={commitMsg()} fallback={<span class={w.placeholder}>Message</span>}>
                {commitMsg()}
                <Show when={commitTyping()}>
                  <span class={w.caretBlink} />
                </Show>
              </Show>
            </div>
            <div class={review.commitFooter}>
              <span class={review.commitStats}>5 files</span>
              <div class={review.commitActions}>
                <Button size="sm" variant="ghost" pressed={at(9.6, 9.9)}>
                  AI Draft
                </Button>
                <span class={review.splitButton}>
                  <Button size="sm" variant="primary" class={review.commitButton}>
                    Commit
                  </Button>
                </span>
              </div>
            </div>
          </div>
        </Show>
        <div class={review.changesBody} style={{ flex: "1", "min-height": "0", display: "flex", "flex-direction": "column" }}>
          <div style={{ flex: isUndo() ? "0 0 auto" : "1", "min-height": "0", overflow: "hidden" }}>
            <Show when={isReview()}>
              <div class={review.groupHeader}>Changes</div>
            </Show>
            <Index each={changeFiles()}>
              {(f) => (
                <div
                  class={`${review.reviewRow} ${isLoop() && f().from != null && t() < f().from! + 1.6 ? w.fileRowPulse : ""}`}
                  style={{ opacity: reverted() && (f().turn ?? 0) > 3 ? 0.25 : 1, transition: "opacity .42s" }}
                >
                  <FileGlyph />
                  <span class={review.reviewName}>{f().name}</span>
                  <span class={review.reviewDir}>{f().dir}</span>
                  <span class={`${review.reviewStatus} ${f().st === "A" ? review.added ?? "" : review.modified ?? ""}`}>{f().st}</span>
                </div>
              )}
            </Index>
          </div>
          <HistorySection />
        </div>
      </div>
    </div>
  );

  /* ---- Changes bottom section: Graph | Stashes | Checkpoints ---- */
  type Turn = [time: string, title: string, files: number];
  const TURNS_LOOP: Turn[] = [
    ["10:28", "Log each delivery attempt", 2],
    ["10:22", "Retry failed deliveries with backoff", 3],
    ["10:16", "Add a webhook delivery queue", 1],
  ];
  const TURNS_UNDO: Turn[] = [
    ["10:52", "rename the header to X-Tori-Signature", 1],
    ["10:46", "add a test for a tampered payload", 1],
    ["10:40", "send the signature in a header", 1],
    ["10:34", "sign outgoing webhook payloads with HMAC", 1],
    ["10:28", "Log each delivery attempt", 2],
    ["10:22", "Retry failed deliveries with backoff", 3],
  ];
  const PICK = 3;
  type CpFile = [st: "A" | "M", name: string, dir: string, add: number, del: number];
  const SINCE_FILES: CpFile[] = [
    ["A", "sign.ts", "src/webhooks/", 46, 0],
    ["M", "deliver.ts", "src/webhooks/", 18, 6],
    ["A", "sign.test.ts", "test/", 52, 0],
    ["M", "types.ts", "src/webhooks/", 12, 5],
  ];
  const SIGN_DIFF = ["@@ -0,0 +1,46 @@", "+import { createHmac } from 'node:crypto'", "+", "+export function sign(body, secret) {", "+  return createHmac('sha256', secret).update(body).digest('hex')"];
  const detailOpen = () => isUndo() && at(1.4, 7.5);
  const sinceHere = () => t() >= 4;
  const diffOpen = () => at(2.4, 4);
  const cpFiles = () => (sinceHere() ? SINCE_FILES : SINCE_FILES.slice(0, 1));

  const TurnRow = (props: { turn: Turn; active?: boolean; hover?: boolean; dim?: boolean; class?: string }) => (
    <div
      class={`${cp.row} ${props.active ? cp.active : ""} ${props.class ?? ""}`}
      style={{ opacity: props.dim ? 0.4 : 1, background: props.hover ? "var(--tree-row-hover)" : undefined, transition: "opacity .42s" }}
    >
      <span class={cp.rowTime}>{props.turn[0]}</span>
      <span class={cp.rowTitle}>{props.turn[1]}</span>
      <span class={cp.rowCount}>{props.turn[2]}</span>
      <Icon icon={ChevronRight} class={cp.rowChevron} />
    </div>
  );

  const CheckpointList = () => (
    <div class={cp.scroll}>
      <div class={cp.groupHeader}>
        <span class={cp.groupKind}>Chat</span>
        <span class={cp.groupName}>Sign webhook payloads</span>
      </div>
      <Show when={isLoop() && t() >= 19.2}>
        <TurnRow class={w.in} turn={["10:34", "Sign outgoing webhook payloads with HMAC-SHA256 and add a test for it.", 4]} />
      </Show>
      <For each={isUndo() ? TURNS_UNDO : TURNS_LOOP}>
        {(turn, i) => <TurnRow turn={turn} active={reverted() && i() === PICK} hover={isUndo() && at(0.8, 1.4) && i() === PICK} dim={reverted() && i() < PICK} />}
      </For>
      <Show when={reverted()}>
        <div class={`${cp.groupHeader} ${w.in}`}>
          <span class={cp.groupKind}>Backstops</span>
        </div>
        <div class={`${cp.row} ${cp.backstop} ${w.in}`}>
          <span class={cp.rowTime}>10:53</span>
          <span class={cp.rowTitle}>Before revert to 10:34</span>
          <span class={cp.ownerTag}>session</span>
        </div>
      </Show>
    </div>
  );

  const CheckpointDetail = () => (
    <>
      <div class={cp.back}>
        <Icon icon={ChevronLeft} />
        Checkpoints
      </div>
      <div class={cp.scroll}>
        <div class={cp.detailHead}>
          <div class={cp.detailTitle}>{TURNS_UNDO[PICK][1]}</div>
          <div class={cp.detailMeta}>10:34 {"·"} Chat {"·"} Sign webhook payloads</div>
        </div>
        <div class={`${seg.group} ${seg.sm} ${cp.range}`}>
          <span class={seg.segment} style={{ flex: "1" }} data-pressed={sinceHere() ? undefined : ""}>
            This turn {"·"} 1
          </span>
          <span class={seg.segment} style={{ flex: "1" }} data-pressed={sinceHere() ? "" : undefined}>
            Since here {"·"} 4
          </span>
        </div>
        <For each={cpFiles()}>
          {(f) => (
            <div class={cp.fileRow}>
              <span class={cp.fileStatus} style={{ color: f[0] === "A" ? "var(--diff-added)" : undefined }}>{f[0]}</span>
              <span class={cp.fileMain}>
                <span class={cp.fileName}>{f[1]}</span>
                <span class={cp.fileDir}>{f[2]}</span>
              </span>
              <span class={cp.added}>+{f[3]}</span>
              <span class={cp.removed}>-{f[4]}</span>
            </div>
          )}
        </For>
        <Show when={diffOpen()}>
          <div class={`${cp.fileDiff} ${w.in}`}>
            <For each={SIGN_DIFF}>
              {(line) => (
                <div
                  style={{
                    padding: "0 12px",
                    "white-space": "pre",
                    color: line.startsWith("@@") ? "var(--accent-fg)" : "var(--diff-added)",
                  }}
                >
                  {line}
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
      <div class={cp.footer}>
        <Button variant="primary" pressed={at(7.2, 7.5)} class={`${cp.action} ${at(6.2, 7.6) ? "is-hover" : ""}`}>
          {at(7.2, 7.5) ? "Reverting..." : "Revert tree to 10:34"}
        </Button>
        <Button class={cp.action}>Rewind chat to here</Button>
        <div class={cp.footNote}>Current state is saved as a backstop first.</div>
      </div>
    </>
  );

  const HistorySection = () => (
    <section class={`${review.history} ${review.historyOpen}`} style={{ flex: isUndo() ? "1 1 auto" : "0 0 auto", "min-height": "0", display: "flex", "flex-direction": "column" }}>
      <div class={review.tabStrip} style={{ display: "flex", "align-items": "center", gap: "2px", padding: "0 6px" }}>
        <Tab quiet close={false} label="Graph" icon={null} />
        <Tab quiet close={false} label="Stashes" icon={null} />
        <Tab
          quiet
          close={false}
          selected
          label="Checkpoints"
          icon={null}
          trailing={<span class={review.tabCount}>{isUndo() ? 6 : isLoop() && t() >= 19.2 ? 4 : 3}</span>}
        />
        <span style={{ "margin-left": "auto", color: "var(--fg-subtle)", display: "inline-flex" }}>
          <Icon icon={ChevronUp} size={15} />
        </span>
      </div>
      <div class={w.historyBody} style={{ display: "flex", "flex-direction": "column" }}>
        <div class={cp.panel} style={{ "padding-bottom": detailOpen() ? undefined : "6px" }}>
          <Show when={detailOpen()} fallback={<CheckpointList />}>
            <CheckpointDetail />
          </Show>
        </div>
      </div>
    </section>
  );

  /* ---- undo: chat of turns ---- */
  const TURNS: [number, string, string, string, number, number][] = [
    [3, "10:34", "sign outgoing webhook payloads with HMAC", "src/webhooks/sign.ts", 46, 0],
    [4, "10:40", "send the signature in a header", "src/webhooks/deliver.ts", 18, 6],
    [5, "10:46", "add a test for a tampered payload", "test/sign.test.ts", 52, 0],
    [6, "10:52", "rename the header to X-Tori-Signature", "src/webhooks/types.ts", 12, 5],
  ];
  const UndoChat = () => (
    <div class={w.chat}>
      <StatusLine state="idle" files={4} ctx="318k/1.0M (32%)" pct={32} />
      <div class={w.transcript}>
        <For each={TURNS}>
          {(x) => (
            <>
              <div class={`${w.user} ${reverted() && x[0] > 3 ? w.dimmed : ""}`}>{x[2]}</div>
              <ToolRow class={reverted() && x[0] > 3 ? w.dimmed : ""} name="Edit" edit arg={x[3]} add={x[4]} del={x[5]} />
            </>
          )}
        </For>
      </div>
      <Composer placeholder={"Reply, or @ a file \u00b7 / for commands"} running={false} agent="claude" />
    </div>
  );

  /* ---- review: diff tab and the chat it feeds ---- */
  const CM = "Use a constant-time compare in verify";
  const commitMsg = () => {
    if (!isReview() || t() < 10) return "";
    return CM.slice(0, Math.floor(Math.min(1, (t() - 10) / 1.6) * CM.length));
  };
  const commitTyping = () => isReview() && t() >= 10 && commitMsg().length < CM.length;
  const COMMENT = "Use a constant-time compare here.";
  const typed = () => COMMENT.slice(0, Math.floor(Math.min(1, Math.max(0, (t() - 1) / 2.8)) * COMMENT.length));
  const fixed = () => isReview() && t() >= 8.8;

  const isFixed = createMemo(() => fixed());
  const DiffTab = () => {
    const lines = createMemo(() => {
      const fixed = isFixed;
      const head: [string, string, string, JSX.Element][] = [
        ["12", "12", " ", <><span class={w.kw}>export function</span> <span class={w.fn}>verify</span>(body, sig, secret) {"{"}</>],
        ["13", "13", " ", <>{"  "}<span class={w.kw}>const</span> <span class={w.var}>expected</span> = <span class={w.fn}>sign</span>(body, secret)</>],
      ];
      const mid: [string, string, string, JSX.Element][] = fixed()
        ? [
            ["14", "", "-", <>{"  "}<span class={w.kw}>return</span> sig === expected</>],
            ["", "14", "+", <>{"  "}<span class={w.kw}>const</span> a = Buffer.<span class={w.fn}>from</span>(sig)</>],
            ["", "15", "+", <>{"  "}<span class={w.kw}>const</span> b = Buffer.<span class={w.fn}>from</span>(expected)</>],
            ["", "16", "+", <>{"  "}<span class={w.kw}>return</span> a.length === b.length && <span class={w.fn}>timingSafeEqual</span>(a, b)</>],
          ]
        : [["14", "14", " ", <>{"  "}<span class={w.kw}>return</span> sig === expected</>]];
      const tail: [string, string, string, JSX.Element][] = [
        [fixed() ? "15" : "15", fixed() ? "17" : "15", " ", <>{"}"}</>],
        ["16", fixed() ? "18" : "16", " ", <></>],
        ["17", fixed() ? "19" : "17", " ", <><span class={w.kw}>export const</span> TOLERANCE_S = <span class={w.str}>300</span></>],
      ];
      return [...head, ...mid, ...tail];
    });
    return (
      <div class={w.diff}>
        <div class={w.fileBar}>
          <span style={{ color: "var(--attention-fg)", "font-weight": 700 }}>M</span>
          <span style={{ "font-weight": 600 }}>verify.ts</span>
          <span class="dim">src/webhooks</span>
          <span class={w.tag}>WORKING TREE</span>
          <span class={w.fileBarIcons}>
            <Icon icon={Plus} size={14} />
            <Icon icon={Undo2} size={14} />
            <Icon icon={Copy} size={14} />
            <Icon icon={Eye} size={14} />
          </span>
        </div>
        <div class={w.fold}>{"\u22ef"} 11 unchanged lines</div>
        <div class={w.hunk}>
          <span class={w.hunkHead}>{fixed() ? "@@ -12,6 +12,9 @@" : "@@ -12,6 +12,6 @@"}</span>
          <span class={w.hunkBtn}>
            <Icon icon={Plus} size={14} />
          </span>
          <span class={w.hunkBtn}>
            <Icon icon={Undo2} size={14} />
          </span>
          <span class={w.hunkBtn} data-on={at(0.6, 4.9) ? "true" : "false"}>
            <Icon icon={MessageSquare} size={14} />
          </span>
          <Show when={at(0.6, 4.9)}>
            <span class={`${w.hunkInput} ${w.in}`}>
              <Show when={typed()} fallback={<span class={w.placeholder}>Comment on this hunk</span>}>
                {typed()}
                <span class={w.caretBlink} />
              </Show>
            </span>
            <Button size="xs" variant={at(4.4, 4.9) ? "primary" : "default"}>
              Send
            </Button>
          </Show>
        </div>
        <For each={lines()}>
          {(l) => (
            <div class={`${w.diffLine} ${l[2] === "+" ? w.in : ""}`} data-k={l[2]}>
              <span class={w.ln}>{l[0]}</span>
              <span class={w.ln}>{l[1]}</span>
              <span class={w.sign}>{l[2] === " " ? "" : l[2]}</span>
              <span>{l[3]}</span>
            </div>
          )}
        </For>
        <div class={w.fold}>{"\u22ef"} 38 unchanged lines</div>
      </div>
    );
  };

  const ReviewChat = () => (
    <div class={w.chat}>
      <StatusLine state={at(6.2, 8.8) ? "working" : "idle"} secs={Math.max(1, Math.round((t() - 6.2) * 1.5))} files={5} ctx="324k/1.0M (32%)" pct={32} />
      <div class={w.transcript}>
        <div class={w.prose}>All 42 webhook tests pass, including a new one for a tampered payload.</div>
        <Show when={t() >= 6.2}>
          <div class={`${w.user} ${w.in}`}>
            <span class={w.userRef}>@src/webhooks/verify.ts</span>
            {COMMENT}
          </div>
        </Show>
        <Show when={at(6.6, 7.4)}>
          <div class={`${w.thinking} ${w.in}`}>
            <Icon icon={Brain} size={14} />
            Thinking
          </div>
        </Show>
        <Show when={t() >= 7.4}>
          <div class={`${w.prose} ${w.in}`}>
            Right, a plain <span class={w.code}>===</span> leaks timing. Switching to{" "}
            <span class={w.code}>timingSafeEqual</span>.
          </div>
        </Show>
        <Show when={t() >= 8.2}>
          <ToolRow class={w.in} name="Edit" edit arg="src/webhooks/verify.ts" add={3} del={1} />
        </Show>
      </div>
      <Composer
        placeholder={"Reply, or @ a file \u00b7 / for commands"}
        running={at(6.2, 8.8)}
        agent="claude"
        chips={
          <Show when={at(5.2, 6.2)}>
            <span class={`${w.chip} ${w.in}`}>
              <FileGlyph />
              verify.ts 12-17
            </span>
          </Show>
        }
        text={
          at(5.2, 6.2) ? (
            <>
              {COMMENT}
              <span class={w.caretBlink} />
            </>
          ) : undefined
        }
      />
    </div>
  );

  /* ---- cockpit ---- */
  const approved = () => isCockpit() && (approvedAt() !== null || t() >= 11);
  const showCall = () => isCockpit() && t() >= 6 && !approved();
  const storm = () => hoverStorm();
  const hero = () => {
    if (storm())
      return {
        eyebrow: "Rough seas",
        title: "The crew is stretched thin.",
        body: "Three workers on deck. That is past your limit of 2 running chats, so expect a slower voyage.",
      };
    if (showCall())
      return { eyebrow: "Holding course", title: "One call for the captain.", body: "The ship holds its heading while you decide. Both workers wait below." };
    return { eyebrow: "Cruising", title: "Smooth sailing.", body: "Two workers on deck. Kick back, the autopilot rings when it needs you." };
  };
  const heroState = () => (storm() ? "working" : showCall() ? "needs" : "working");
  const crew = () => {
    const needs = isCockpit() && t() >= 5.5 && !approved();
    const p2 = (t() % 16) / 16;
    return [
      {
        num: "#482",
        title: "Sign webhook payloads",
        place: "work -> api -> feat/webhooks",
        status: approved() ? "done" : needs ? "needs" : "working",
        progress: needs || approved() ? null : 0.6 + t() / 14,
        log: t() >= 5.5
          ? ["$ pnpm test webhooks", "  42 passed", approved() ? "> PR #483 opened" : "> waiting on your PR approval"]
          : ["> edit test/sign.test.ts", "$ pnpm test webhooks", "  running"],
        doing: approved() ? "PR opened" : needs ? "Needs your approval" : "Running tests",
      },
      {
        num: "#214",
        title: "Retry failed webhooks",
        place: "work -> web -> feat/retry",
        status: "working",
        progress: 0.15 + p2 * 0.7,
        log: ["> edit src/webhooks/retry.ts", "$ pnpm test webhooks", "  12 passed, 1 running"],
        doing: "Running tests",
      },
    ];
  };
  const shipLog = () => {
    const all: [number, string, string, boolean][] = [
      [0, "10:41", "#482 running: Sign webhook payloads", false],
      [0, "10:44", "#214 running: Retry failed webhooks", false],
      [4, "10:52", "#482 running: 42 webhook tests pass", false],
      [5.5, "10:52", "#482 waiting on you", true],
      [11, "10:53", "#482 running: opened PR #483", false],
    ];
    return all.filter((x) => t() >= x[0] && (x[0] !== 11 || approved()));
  };

  const Cockpit = () => (
    <div class={w.cockpit}>
      <div class={av.view}>
        <aside class={av.workers}>
          <div class={sp.sectionHead}>
            <span class={sp.sectionLabel}>Crew on deck</span>
            <span
              class={sp.sectionCount}
              onMouseEnter={() => props.onStormHover !== false && setHoverStorm(true)}
              onMouseLeave={() => setHoverStorm(false)}
              style={{ cursor: "default" }}
            >
              2
            </span>
          </div>
          <Index each={crew()}>
            {(c) => (
              <article class={av.card} data-status={c().status}>
                <div class={av.cardHead}>
                  <span class={av.ring} data-status={c().status} style={c().progress != null ? { "--p": `${Math.min(1, c().progress!) * 100}%` } : undefined}>
                    <span>{c().num}</span>
                  </span>
                  <div class={av.cardName}>
                    <span class={av.cardTitle}>{c().title}</span>
                    <span class={av.cardBranch}>{c().place}</span>
                  </div>
                </div>
                <div class={av.log}>
                  <For each={c().log}>{(l) => <div class={av.logLine}>{l}</div>}</For>
                </div>
                <div class={av.cardFoot}>
                  <span class={av.doing} data-status={c().status}>
                    <span class={sp.dot} data-status={c().status} />
                    {c().doing}
                  </span>
                  <Button size="xs" variant="ghost" iconRight={<Icon icon={ArrowUpRight} class={av.watchIcon} />}>
                    Watch
                  </Button>
                </div>
              </article>
            )}
          </Index>
          <div class={sp.sectionHead}>
            <span class={sp.sectionLabel}>Waiting at the dock</span>
            <span class={sp.sectionCount}>1</span>
          </div>
          <div class={av.queued}>
            <span class={av.cardRef}>#215 (work -&gt; web)</span>
            <span class={av.queuedTitle}>Document webhook retries</span>
            <span class={av.queuedAfter}>after #214</span>
          </div>
        </aside>
        <section class={av.center}>
          <header class={av.hero} data-state={heroState()}>
            <div class={hz.horizon}>
              <div class={hz.scene} innerHTML={scenes()[storm() ? "storm" : scene()] ?? ""} />
            </div>
            <div class={av.heroRow}>
              <div class={av.heroText}>
                <span class={av.eyebrow}>
                  <span class={av.eyebrowDot} />
                  {hero().eyebrow}
                </span>
                <h1 class={av.heroTitle}>{hero().title}</h1>
                <p class={av.heroBody}>{hero().body}</p>
              </div>
              <span class={av.anchor}>
                <Icon icon={Anchor} class={av.helmIcon} />
                Drop anchor
              </span>
            </div>
          </header>
          <div class={av.column} data-live="false">
            <div class={av.scroll}>
              <div class={sp.thread}>
                <div class={sp.mine}>work on #482 and #214, then #215</div>
                <div class={sp.theirs}>
                  <span class={sp.replyMark}>
                    <svg class={sp.replyGlyph} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round">
                      <circle cx="12" cy="12" r="6.6" />
                      <circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none" />
                      <path d="M14.6 12H22.2M13.84 13.84L19.21 19.21M12 14.6V22.2M10.16 13.84L4.79 19.21M9.4 12H1.8M10.16 10.16L4.79 4.79M12 9.4V1.8M13.84 10.16L19.21 4.79" />
                    </svg>
                  </span>
                  <span>Started two workers: #482 in api and #214 in web. #215 waits for #214, since it documents that change.</span>
                </div>
                <Show when={t() >= 5.5}>
                  <div class={`${sp.theirs} ${w.in}`}>
                    <span class={sp.replyMark}>
                      <Wheel state="idle" size={14} />
                    </span>
                    <span>#482 is done and all 42 webhook tests pass. Opening its PR sends it to GitHub, so I need your approval.</span>
                  </div>
                </Show>
                <Show when={showCall()}>
                  <div class={`${sp.call} ${w.in}`}>
                    <Icon icon={Bell} class={sp.callIcon} />
                    Captain's call
                    <span class={sp.callCount}>1</span>
                  </div>
                  <article class={`${dc.card} ${w.in}`} data-focused="true" style={{ position: "relative" }}>
                    <header class={dc.head}>
                      <span class={dc.kind}>
                        <Icon icon={GitPullRequest} class={dc.kindIcon} />
                        PR
                      </span>
                      <span class={dc.ref}>#482 (work -&gt; api -&gt; feat/webhooks)</span>
                      <span class={dc.title}>Sign webhook payloads</span>
                      <span class={dc.age}>now</span>
                    </header>
                    <p class={dc.summary}>Open a draft PR from feat/webhooks into main. 4 files, +128 -14, tests pass.</p>
                    <div class={dc.actions}>
                      <Button size="sm" variant="primary" pressed={at(10.5, 10.9)}>
                        Approve <kbd class={dc.hint}>A</kbd>
                      </Button>
                      <Button size="sm">Edit</Button>
                      <Button size="sm">
                        Reply <kbd class={dc.hint}>R</kbd>
                      </Button>
                      <Button size="sm" variant="ghost">
                        Dismiss
                      </Button>
                    </div>
                    <Show when={at(9.2, 11)}>
                      <Cursor x={t() >= 9.6 ? 40 : 200} y={t() >= 9.6 ? 92 : 150} down={at(10.5, 10.9)} />
                    </Show>
                  </article>
                </Show>
                <Show when={approved()}>
                  <div class={`${sp.theirs} ${w.in}`}>
                    <span class={sp.replyMark}>
                      <Wheel state="idle" size={14} />
                    </span>
                    <span>Approved once, for that exact draft. Opened PR #483 from feat/webhooks.</span>
                  </div>
                </Show>
              </div>
            </div>
            <div class={sp.composer}>
              <div class={sp.composerField}>
                <span class={sp.placeholder}>Tell the autopilot...</span>
                <span class={sp.composerHints}>
                  <span class={sp.keyHints}>
                    <span class={sp.keyHint}>
                      <kbd class={sp.kbd}>{"\u2318\u21e7J"}</kbd>workspace
                    </span>
                    <Show when={showCall()}>
                      <span class={sp.keyHint}>
                        <kbd class={sp.kbd}>A</kbd>approve
                      </span>
                      <span class={sp.keyHint}>
                        <kbd class={sp.kbd}>R</kbd>reply
                      </span>
                    </Show>
                  </span>
                </span>
              </div>
              <span class={sp.send}>
                <Icon icon={ArrowUpRight} class={sp.sendIcon} />
              </span>
            </div>
          </div>
        </section>
        <aside class={av.activity}>
          <div class={sp.sectionHead}>
            <span class={sp.sectionLabel}>Ship's log</span>
          </div>
          <div class={av.activityList}>
            <Index each={shipLog()}>
              {(a) => (
                <div class={`${av.activityRow} ${w.in}`} data-needs-you={a()[3] ? "true" : "false"}>
                  <span class={av.activityTime}>{a()[1]}</span>
                  <span class={av.activityText}>{a()[2]}</span>
                </div>
              )}
            </Index>
          </div>
          <div class={av.harbor}>
            <span class={av.harborLabel}>
              <Icon icon={Anchor} class={av.harborIcon} />
              Harbor
            </span>
            Nothing leaves this machine until you approve it.
          </div>
        </aside>
      </div>
    </div>
  );

  /* ---- chaos opening ---- */
  const TL: [string, string[]][] = [
    ["claude \u00b7 api", ["\u23fa Reading src/webhooks/deliver.ts", "\u23fa Update(src/webhooks/sign.ts)", "  \u23bf Updated with 46 additions", "\u23fa Bash(pnpm lint)", "  \u23bf 0 problems", "\u273b Pondering\u2026", "\u23fa Update(src/webhooks/deliver.ts)", "  \u23bf Updated with 18 additions", "\u23fa Reading types.ts", "\u273b Thinking\u2026"]],
    ["codex \u00b7 api/fix/rate-limit", ["> apply_patch src/limiter.ts", "  +  if (bucket.count >= limit) {", "  +    res.setHeader('Retry-After', s)", "exec pnpm test limiter", "  18 passed", "thinking", "> read src/limiter.test.ts", "> apply_patch src/limiter.test.ts", "exec pnpm test limiter", "  19 passed"]],
    ["zsh \u00b7 web", ["$ pnpm dev", "  VITE v7 ready in 412 ms", "  Local: http://localhost:5173/", "  hmr update /src/Search.tsx", "  hmr update /src/Results.tsx", "  hmr update /src/Search.tsx", "  page reload src/main.tsx", "  hmr update /src/Results.tsx"]],
    ["gemini \u00b7 web/feat/search", ["\u2726 Searching for \"useQuery\"", "  Found 14 matches", "\u2726 WriteFile src/Results.tsx", "\u2726 Shell pnpm typecheck", "  ok", "\u2726 ReadFile src/api/search.ts", "\u2726 Edit src/api/search.ts", "  ok"]],
    ["claude \u00b7 api/feat/webhooks", ["\u23fa Update(test/sign.test.ts)", "  \u23bf Updated with 52 additions", "", "  Bash command", "    pnpm test webhooks", "  Do you want to proceed?", "  \u276f 1. Yes", "    2. Yes, and don't ask again", "    3. No, and tell Claude", ""]],
    ["opencode \u00b7 web/dark-mode", ["\u2022 edit tokens.css", "\u2022 edit theme.ts", "\u2022 bash pnpm build", "  built in 3.2s", "\u2022 edit Button.tsx", "\u2022 edit Card.tsx", "\u2022 read palette.json", "\u2022 edit tokens.css"]],
    ["zsh \u00b7 infra", ["$ terraform plan", "  Refreshing state...", "  ~ aws_lambda_function.hooks", "  Plan: 0 to add, 1 to change", "$ git status", "  On branch main", "  nothing to commit"]],
    ["claude \u00b7 web/feat/search", ["\u23fa Reading test/search.test.ts", "\u23fa Bash(pnpm test search)", "  \u23bf 31 passed", "\u273b Musing\u2026", "\u23fa Update(test/search.test.ts)", "  \u23bf Updated with 9 additions", "\u23fa Bash(pnpm test search)", "  \u23bf 33 passed"]],
    ["copilot \u00b7 infra", ["\u25cf Bump provider versions", "  aws 5.62 -> 5.70", "\u25cf Run terraform validate", "  Success!", "\u25cf Done"]],
  ];

  const Chaos = () => (
    <div class={w.chaos} style={{ background: fold() ? "rgba(21,23,28,0)" : "var(--canvas-default)" }}>
      <For each={TL}>
        {([title, lines], i) => {
          const left = 12 + (i() % 3) * 396;
          const top = 12 + Math.floor(i() / 3) * 228;
          const still = i() === 4 || i() === 6 || i() === 8;
          return (
            <div
              class={w.tile}
              style={{
                left: `${left}px`,
                top: `${top}px`,
                transform: fold() ? `translate(${24 - left}px, ${56 + i() * 30 - top}px) scale(.06)` : "none",
                opacity: fold() ? 0 : 1,
                transition: `transform .7s ${EASE} ${i() * 40}ms, opacity .6s ease ${i() * 40}ms`,
              }}
            >
              <div class={w.tileBar}>
                <i />
                <i />
                <i />
                <span style={{ "margin-left": "6px" }}>{title}</span>
              </div>
              <div class={w.tileBody}>
                <div class={still ? "" : w.scroll} style={{ "animation-duration": `${5 + ((i() * 1.7) % 5)}s` }}>
                  <For each={still ? lines : lines.concat(lines)}>{(ln) => <div>{ln}</div>}</For>
                </div>
              </div>
            </div>
          );
        }}
      </For>
    </div>
  );

  /* ---- assembly ---- */
  const workState = () => (isCockpit() ? (showCall() ? "needs" : "working") : "working");
  const notifIn = () => isLoop() && at(8, 11.3);
  const clickNotif = () => at(10.6, 10.85);

  return (
    <div ref={root} class={w.outer} style={{ height: `${Math.round(region()[3] * scale())}px` }}>
      <div class={w.stage} style={{ transform: `translate(${-region()[0] * scale()}px, ${-region()[1] * scale()}px) scale(${scale()})` }}>
        <div class={w.win} style={{ "--tint": AMBER }}>
          <div class={w.wash} />
          <header class={w.topbar}>
            <div class={w.lights}>
              <span style={{ background: "#ff5f57" }} />
              <span style={{ background: "#febc2e" }} />
              <span style={{ background: "#28c840" }} />
            </div>
            <div class={`${w.rail} ${w.hideInCockpit}`} data-cockpit={isCockpit() ? "true" : "false"}>
              <span class={w.railBtn}>
                <Icon icon={PanelLeft} size={16} />
              </span>
              <span class={w.railEnd}>
                <span class={w.railBtn}>
                  <Icon icon={ArrowLeft} size={15} />
                </span>
                <span class={w.railBtn}>
                  <Icon icon={ArrowRight} size={15} />
                </span>
              </span>
            </div>
            <div class={`${w.crumbs} ${w.hideInCockpit}`} data-cockpit={isCockpit() ? "true" : "false"}>
              <nav class={toolbar.tbCrumb}>
                <span class={`${toolbar.crumb ?? ""} dim`}>work</span>
                <Icon icon={ChevronRight} class={`${toolbar.crumbSep ?? ""} dim`} size={12} />
                <span class={`${toolbar.crumb ?? ""} dim`}>api</span>
                <Icon icon={ChevronRight} class={`${toolbar.crumbSep ?? ""} dim`} size={12} />
                <span class={`${toolbar.crumb ?? ""} ${toolbar.leaf ?? ""}`}>{onWebhooks() ? "feat/webhooks" : "fix/rate-limit"}</span>
              </nav>
            </div>
            <div class={w.topRight}>
              <div class={w.switchSlot}>
                <CockpitSwitch cockpit={isCockpit()} state={workState()} count={1} />
              </div>
              <span class={w.topIcon} data-lit="true">
                <Icon icon={Smartphone} />
              </span>
              <span class={w.usage}>
                <AgentMark agent="claude" size={14} />
                <span>
                  5H <b>38%</b>
                </span>
                <span>
                  W <b>12%</b>
                </span>
              </span>
              <span class={w.topIcon}>
                <Icon icon={Settings} />
              </span>
            </div>
          </header>

          <Switch>
            <Match when={isCockpit()}>
              <Cockpit />
            </Match>
            <Match when={true}>
              <div class={w.body}>
                <aside class={w.sidebar} style={{ opacity: chaos() && t() < 4.4 ? 0 : 1 }}>
                  <Sidebar />
                </aside>
                <div class={w.workspace}>
                  <div class={w.card}>
                    <div class={w.pane}>
                      <TabStrip />
                      <Switch>
                        <Match when={isLoop() && !onWebhooks()}>
                          <CodexChat />
                        </Match>
                        <Match when={isLoop()}>
                          <WebhooksChat />
                        </Match>
                        <Match when={isUndo()}>
                          <UndoChat />
                        </Match>
                        <Match when={isReview() && at(5.2, 9.2)}>
                          <ReviewChat />
                        </Match>
                        <Match when={isReview()}>
                          <DiffTab />
                        </Match>
                      </Switch>
                    </div>
                    <RightPanel />
                  </div>
                </div>
              </div>
            </Match>
          </Switch>

          <Show when={isLoop()}>
            <div class={w.notif} style={{ transform: notifIn() ? "translateX(0)" : "translateX(400px)" }}>
              <img src="/app-icon.png" alt="" />
              <div style={{ "min-width": "0", flex: "1" }}>
                <div class={w.notifTitle}>
                  Sign webhook payloads<span>now</span>
                </div>
                <div class={w.notifBody}>api needs you</div>
              </div>
              <Show when={at(8.9, 11.3)}>
                <Cursor x={t() >= 9.9 ? 150 : 250} y={t() >= 9.9 ? 30 : 140} down={clickNotif()} />
              </Show>
            </div>
          </Show>

          <Show when={chaos()}>
            <Chaos />
          </Show>
        </div>
      </div>
    </div>
  );
}
