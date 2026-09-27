// Presentational ports of the app's own components (tori/src), trimmed to what
// a picture needs: no menus, tooltips or stores, same DOM and class names, so the
// vendored CSS modules in ./css draw them exactly as the app does.
import { For, Show, type JSX } from "solid-js";
import { Dynamic } from "solid-js/web";
import {
  ArrowUpFromLine,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleDashed,
  GitPullRequest,
  MessageSquare,
  MessageSquareCheck,
  type IconNode,
} from "lucide";
import { AGENT_PATHS } from "./agentPaths";
import { CheckMark, QuestionMark, WorkingMark } from "./statusMarks";
import agentStyles from "./css/agentMarks.module.css";
import bubbleStyles from "./css/StatusBubble.module.css";
import prStyles from "./css/PrLine.module.css";
import rowStyles from "./css/SidebarRows.module.css";
import tileStyles from "./css/SpaceTile.module.css";
import tabStyles from "./css/Tab.module.css";
import markStyles from "./css/TabMark.module.css";
import syncStyles from "./css/SyncMarks.module.css";
import buttonStyles from "./css/Button.module.css";

// Drawn from lucide's plain node data rather than lucide-solid, whose compiled
// templates render empty on the server and break hydration.
export function Icon(props: { icon: IconNode; size?: number; class?: string; strokeWidth?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.size ?? 16}
      height={props.size ?? 16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width={props.strokeWidth ?? 1.75}
      stroke-linecap="round"
      stroke-linejoin="round"
      class={props.class}
      aria-hidden="true"
    >
      <For each={props.icon}>{([tag, attrs]) => <Dynamic component={tag} {...attrs} />}</For>
    </svg>
  );
}

export type Agent = "claude" | "codex" | "gemini" | "opencode" | "copilot" | "kimi" | "pi";

export function AgentMark(props: { agent: Agent; size?: number; breathe?: boolean; class?: string }) {
  return (
    <svg
      viewBox={props.agent === "codex" ? "3 3 18 18" : "0 0 24 24"}
      width={props.size ?? 16}
      height={props.size ?? 16}
      fill="currentColor"
      aria-hidden="true"
      class={`${props.class ?? ""} ${props.breathe ? agentStyles.thinking : ""}`}
    >
      <path d={AGENT_PATHS[props.agent]} />
    </svg>
  );
}

export interface Rollup {
  waiting?: number;
  executing?: number;
  idle?: number;
  running?: number;
}

export function StatusBubble(props: { rollup: Rollup; tile?: boolean }) {
  const counts = () => [props.rollup.waiting ?? 0, props.rollup.executing ?? 0, props.rollup.idle ?? 0, props.rollup.running ?? 0];
  const shown = (at: number) => counts()[at] > 0 && !(props.tile && counts().slice(0, at).some((n) => n > 0));
  return (
    <Show when={counts().some((n) => n > 0)}>
      <span class={bubbleStyles.statusBubble} classList={{ [bubbleStyles.spaceBubble]: !!props.tile }}>
        <Show when={shown(0)}>
          <span class={`${bubbleStyles.statusBubbleItem} ${bubbleStyles.waitingForApproval}`}>
            <QuestionMark animate />
            <Show when={counts()[0] > 1}>{counts()[0]}</Show>
          </span>
        </Show>
        <Show when={shown(1)}>
          <span class={`${bubbleStyles.statusBubbleItem} ${bubbleStyles.executing}`}>
            <WorkingMark animate />
            <Show when={counts()[1] > 1}>{counts()[1]}</Show>
          </span>
        </Show>
        <Show when={shown(2)}>
          <span class={`${bubbleStyles.statusBubbleItem} ${bubbleStyles.idle}`}>
            <CheckMark animate />
            <Show when={counts()[2] > 1}>{counts()[2]}</Show>
          </span>
        </Show>
        <Show when={shown(3)}>
          <span class={`${bubbleStyles.statusBubbleItem} ${bubbleStyles.running}`}>
            <Icon icon={CircleDashed} />
            <Show when={counts()[3] > 1}>{counts()[3]}</Show>
          </span>
        </Show>
      </span>
    </Show>
  );
}

export function PrLine(props: { number: number; age: string; checks: string; comments: number }) {
  return (
    <span class={prStyles.prLine}>
      <span class={`${prStyles.item} ${prStyles.pr_open}`}>
        <Icon icon={GitPullRequest} />
        {`#${props.number}`}
      </span>
      <span class={prStyles.item}>{props.age}</span>
      <span class={`${prStyles.item} ${prStyles.good}`}>
        <Icon icon={MessageSquareCheck} />
      </span>
      <span class={`${prStyles.item} ${prStyles.good}`}>
        <Icon icon={CircleCheck} />
        {props.checks}
      </span>
      <span class={prStyles.item}>
        <Icon icon={MessageSquare} />
        {props.comments}
      </span>
    </span>
  );
}

export function ProjectRow(props: { name: string; icon: IconNode; open?: boolean; end?: JSX.Element; children?: JSX.Element }) {
  return (
    <div class={`node ${rowStyles.projectCard}`}>
      <div class={`${rowStyles.row} ${rowStyles.project}`}>
        <span class={`${rowStyles.rowIcon} ${rowStyles.projectIcon}`}>
          <span class={rowStyles.projectIconArt}>
            <Icon icon={props.icon} />
          </span>
          <span class={rowStyles.iconChevron} aria-hidden="true">
            <Icon icon={props.open ? ChevronDown : ChevronRight} />
          </span>
        </span>
        <span class={rowStyles.label}>{props.name}</span>
        <span class={rowStyles.rowEnd}>{props.end}</span>
      </div>
      {props.children}
    </div>
  );
}

export function BranchRow(props: { label: string; icon: JSX.Element; selected?: boolean; end?: JSX.Element; meta?: JSX.Element }) {
  const glyph = () => <span class={rowStyles.rowIcon}>{props.icon}</span>;
  const name = () => <span class={rowStyles.label}>{props.label}</span>;
  const end = () => <span class={rowStyles.rowEnd}>{props.end}</span>;
  return (
    <div class={`node ${rowStyles.branchNode}`}>
      <div
        class={`${rowStyles.row} ${rowStyles.branch} ${rowStyles.sub1} ${props.selected ? rowStyles.sel : ""}`}
        data-two-line={props.meta != null ? "true" : undefined}
        aria-current={props.selected ? "true" : undefined}
      >
        <Show when={props.meta} fallback={<>{glyph()}{name()}{end()}</>}>
          <span class={rowStyles.rowStack}>
            <span class={rowStyles.rowTop}>
              {glyph()}
              {name()}
              {end()}
            </span>
            <span class={rowStyles.rowMeta}>{props.meta}</span>
          </span>
        </Show>
      </div>
    </div>
  );
}

export function SyncPush(props: { count: number }) {
  return (
    <span class={syncStyles.marks}>
      <span class={`${syncStyles.mark} ${syncStyles.muted}`}>
        <Icon icon={ArrowUpFromLine} />
        {props.count}
      </span>
    </span>
  );
}

export function SpaceTile(props: {
  name: string;
  hueRgb: string;
  glyph?: IconNode;
  nameWidth?: string;
  active?: boolean;
  rollup?: Rollup;
}) {
  return (
    <span class={tileStyles.spaceMenu}>
      <span
        class={tileStyles.space}
        classList={{ [tileStyles.active]: !!props.active, [tileStyles.titled]: !!props.active }}
        style={{ "--space-hue-rgb": props.hueRgb, "--name-w": props.nameWidth }}
      >
        <Show when={props.glyph} fallback={props.name.slice(0, 1).toUpperCase()}>
          {(g) => <Icon icon={g()} />}
        </Show>
        <span class={tileStyles.tileName}>
          <span class={tileStyles.tileNameText}>{props.name}</span>
        </span>
        <Show when={props.rollup}>{(r) => <StatusBubble rollup={r()} tile />}</Show>
      </span>
    </span>
  );
}

export function ModeTile(props: { label: string; glyph: IconNode }) {
  return (
    <span class={`${tileStyles.space} ${tileStyles.modeTile}`}>
      <Icon icon={props.glyph} />
      <span class={tileStyles.tileName}>
        <span class={tileStyles.tileNameText}>{props.label}</span>
      </span>
    </span>
  );
}

export type TabStatus = "working" | "needs" | "idle" | null;

export function TabMark(props: { agent: Agent; status: TabStatus }) {
  const working = () => props.status === "working";
  const needs = () => props.status === "needs";
  return (
    <span
      class={markStyles.mark}
      classList={{
        [markStyles.rest]: !working() && !needs(),
        [agentStyles.tint]: working(),
        [agentStyles.thinking]: working(),
        [markStyles.needsYou]: needs(),
      }}
      data-mark={props.agent}
    >
      <AgentMark agent={props.agent} size={13} />
      <Show when={needs()}>
        <span class={markStyles.badge} aria-hidden="true" />
      </Show>
    </span>
  );
}

export function Tab(props: { icon: JSX.Element; label: string; selected?: boolean; quiet?: boolean; close?: boolean; trailing?: JSX.Element }) {
  return (
    <span class={tabStyles.pill} data-tab-pill="" data-quiet={props.quiet ? "" : undefined}>
      <button type="button" class={tabStyles.tab} data-selected={props.selected ? "" : undefined} tabindex={-1}>
        {props.icon}
        <span class={tabStyles.label}>{props.label}</span>
        {props.trailing}
      </button>
      <Show when={props.close !== false}>
        <button type="button" class={tabStyles.close} tabindex={-1} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </Show>
    </span>
  );
}

export function Button(props: {
  variant?: "default" | "primary" | "ghost";
  size?: "xs" | "sm" | "md";
  class?: string;
  pressed?: boolean;
  icon?: JSX.Element;
  iconRight?: JSX.Element;
  children?: JSX.Element;
}) {
  return (
    <span
      class={[
        buttonStyles.btn,
        buttonStyles[props.variant ?? "default"],
        buttonStyles[props.size ?? "md"],
        props.children == null ? buttonStyles.iconOnly : "",
        props.pressed ? "pressed" : "",
        props.class ?? "",
      ].join(" ")}
    >
      {props.icon}
      <Show when={props.children != null}>
        <span class={buttonStyles.label}>{props.children}</span>
      </Show>
      {props.iconRight}
    </span>
  );
}

export function Kbd(props: { keys: string[] }) {
  return <For each={props.keys}>{(k) => <kbd>{k}</kbd>}</For>;
}
