import { createMemo, createSignal, For, Index, Match, onMount, Show, Switch, type JSX } from "solid-js";
import { ArrowUp, ChevronLeft, ChevronRight, Plus, Search, Settings, Tag } from "lucide";
import { AgentMark, Icon, PrLine, StatusBubble, SyncPush, type Agent, type Rollup } from "../../app/kit";
import { CheckMark, QuestionMark, WorkingMark } from "../../app/statusMarks";
import { WorktreeMark } from "../../app/gitMarks";
import { loadScene, sceneFor, Wheel } from "../../app/autopilotParts";
import w from "../../app/window.module.css";
import sh from "../../app/css/phone/shell.module.css";
import mb from "../../app/css/phone/mobile.module.css";
import PhoneFrame from "./PhoneFrame";
import s from "./PhoneAppDemo.module.css";

const DOT = "\u00b7";
const NEXT = "\u203a";
const MINUS = "\u2212";

type Phase = "needs" | "working" | "idle";
type Msg = { mine?: boolean; text: string };
type Session = { id: string; title: string; agent: Agent; phase: Phase; unit: string; msgs: Msg[]; ask?: string; live: boolean; when: string };
type Unit = { id: string; branch: string; issue?: string; ahead?: number; pr?: number; added: number; deleted: number };
type Project = { name: string; units: Unit[] };
type SpaceT = { name: string; initial: string; projects: Project[] };

const SPACES: SpaceT[] = [
  {
    name: "hooli",
    initial: "H",
    projects: [
      {
        name: "hooli-search",
        units: [
          { id: "hs-rank", branch: "fix/search-ranking", issue: "#41", ahead: 1, pr: 53, added: 46, deleted: 9 },
          { id: "hs-cache", branch: "feat/token-cache", added: 30, deleted: 4 },
          { id: "hs-main", branch: "main", added: 0, deleted: 0 },
        ],
      },
      { name: "hooli-mail", units: [{ id: "hm-main", branch: "main", added: 3, deleted: 1 }] },
      {
        name: "hooli-chat",
        units: [
          { id: "hc-main", branch: "main", added: 0, deleted: 0 },
          { id: "hc-threads", branch: "feat/threads", added: 0, deleted: 0 },
        ],
      },
    ],
  },
  {
    name: "raviga",
    initial: "R",
    projects: [
      {
        name: "pied-piper",
        units: [
          { id: "pp-mo", branch: "feat/middle-out", issue: "#7", added: 212, deleted: 40 },
          { id: "pp-w", branch: "fix/weissman", added: 0, deleted: 0 },
        ],
      },
      { name: "seefood", units: [{ id: "sf-main", branch: "main", added: 0, deleted: 0 }] },
    ],
  },
  { name: "personal", initial: "P", projects: [{ name: "blog", units: [{ id: "bl-main", branch: "main", added: 0, deleted: 0 }] }] },
];
const TOPICS = [{ name: "search-v2", branch: "feat/search-v2", members: ["hooli-search", "hooli-mail"] }];

const START = (): Session[] => [
  {
    id: "s1",
    title: "Weight title hits",
    agent: "claude",
    phase: "needs",
    unit: "hs-rank",
    live: true,
    when: "now",
    ask: "pnpm test rank",
    msgs: [
      { mine: true, text: "make title hits count more than body hits" },
      { text: "Title hits now weigh 2.5 times a body hit in rank.ts. I want to run the rank tests to check." },
    ],
  },
  {
    id: "s2",
    title: "Evict cached tokens",
    agent: "claude",
    phase: "working",
    unit: "hs-cache",
    live: true,
    when: "2 minutes ago",
    msgs: [
      { mine: true, text: "evict cached tokens after ten minutes" },
      { text: "Adding a timestamp to each cache entry and a sweep on read." },
    ],
  },
  {
    id: "s3",
    title: "Fix the unsubscribe link",
    agent: "codex",
    phase: "working",
    unit: "hm-main",
    live: true,
    when: "5 minutes ago",
    msgs: [
      { mine: true, text: "the unsubscribe link 404s in digest emails" },
      { text: "The digest template builds the link without the list id. Patching the template." },
    ],
  },
  {
    id: "s4",
    title: "Middle-out for video chunks",
    agent: "codex",
    phase: "working",
    unit: "pp-mo",
    live: true,
    when: "1 minute ago",
    msgs: [
      { mine: true, text: "use middle-out on video chunks" },
      { text: "Benchmarking the codec. The Weissman score holds at 5.2 on 1080p." },
    ],
  },
  { id: "h1", title: "Trim the query before parsing", agent: "claude", phase: "idle", unit: "hs-rank", live: false, when: "1 hour ago", msgs: [{ mine: true, text: "trim the query before parsing" }, { text: "Done. Query.parse now trims first." }] },
  { id: "h2", title: "Add rank tests for weights", agent: "claude", phase: "idle", unit: "hs-rank", live: false, when: "yesterday", msgs: [{ mine: true, text: "add tests for rank weights" }, { text: "Added two tests; both pass." }] },
];

type View = { screen: "root" } | { screen: "project"; project: string } | { screen: "topic"; topic: string } | { screen: "unit"; unit: string } | { screen: "chat"; session: string } | { screen: "autopilot" };
type Guide = "root" | "unit" | "chat" | "autopilot" | "settings";
const GUIDE: { id: Guide; label: string; blurb: string }[] = [
  { id: "root", label: "Projects and Topics", blurb: "A space switcher along the bottom, search, and a status rollup per project." },
  { id: "unit", label: "A worktree", blurb: "Branch, diff counts, sync, a New button, and the sessions running now and before." },
  { id: "chat", label: "Chat", blurb: "The transcript, model and mode, a composer to steer, and whatever the session waits on." },
  { id: "autopilot", label: "Autopilot", blurb: "The Cockpit's time of day, an on and off switch, your calls, the crew and the log." },
  { id: "settings", label: "Settings", blurb: "Your connection, the theme, and whether the autopilot button shows at all." },
];

const unitById = (id: string) => {
  for (const sp of SPACES) for (const p of sp.projects) for (const u of p.units) if (u.id === id) return { space: sp, project: p, unit: u };
  return null;
};
const rollupOf = (rows: Session[]): Rollup => ({
  waiting: rows.filter((r) => r.live && r.phase === "needs").length,
  executing: rows.filter((r) => r.live && r.phase === "working").length,
});

function PhaseMark(props: { phase: Phase }) {
  return (
    <span class={sh.phaseMark} data-phase={props.phase}>
      <Switch>
        <Match when={props.phase === "needs"}>
          <QuestionMark animate size={15} />
        </Match>
        <Match when={props.phase === "working"}>
          <WorkingMark animate size={15} />
        </Match>
        <Match when={props.phase === "idle"}>
          <CheckMark animate size={15} />
        </Match>
      </Switch>
    </span>
  );
}
const PHASE: Record<Phase, string> = { needs: "Needs you", working: "Working", idle: "Done" };

export default function PhoneAppDemo() {
  const [sessions, setSessions] = createSignal<Session[]>(START());
  const [stack, setStack] = createSignal<View[]>([{ screen: "root" }]);
  const [space, setSpace] = createSignal("hooli");
  const [tab, setTab] = createSignal<"projects" | "topics">("projects");
  const [searching, setSearching] = createSignal(false);
  const [query, setQuery] = createSignal("");
  const [sheet, setSheet] = createSignal(false);
  const [wheel, setWheel] = createSignal(true);
  const [apOn, setApOn] = createSignal(true);
  const [calls, setCalls] = createSignal(1);
  const [apLog, setApLog] = createSignal([
    { time: "10:41", text: "#41 running: Weight title hits in ranking" },
    { time: "10:44", text: "#7 running: Middle-out for video chunks" },
    { time: "10:52", text: "#41 waiting on you", needs: true },
  ]);
  const [scene, setScene] = createSignal("");
  const [connected, setConnected] = createSignal(true);
  const [dark, setDark] = createSignal(true);
  let seq = 0;

  onMount(() => {
    loadScene(sceneFor(new Date().getHours())).then(setScene);
    setDark(document.documentElement.dataset.theme !== "light");
  });

  const view = () => stack()[stack().length - 1]!;
  const push = (v: View) => setStack((st) => [...st, v]);
  const back = () => setStack((st) => (st.length > 1 ? st.slice(0, -1) : st));
  const home = (v?: View) => setStack(v ? [{ screen: "root" }, v] : [{ screen: "root" }]);
  const sp = () => SPACES.find((x) => x.name === space())!;
  const live = () => sessions().filter((x) => x.live);
  const inProject = (p: Project) => live().filter((x) => p.units.some((u) => u.id === x.unit));
  const guide = (): Guide => (sheet() ? "settings" : ({ root: "root", project: "root", topic: "root", unit: "unit", chat: "chat", autopilot: "autopilot" } as const)[view().screen]);

  function go(g: Guide) {
    setSheet(false);
    if (g === "root") home();
    if (g === "unit") home({ screen: "unit", unit: "hs-rank" });
    if (g === "chat") setStack([{ screen: "root" }, { screen: "unit", unit: "hs-rank" }, { screen: "chat", session: "s1" }]);
    if (g === "autopilot") home({ screen: "autopilot" });
    if (g === "settings") (home(), setSheet(true));
  }
  function patch(id: string, fn: (x: Session) => Session) {
    setSessions((l) => l.map((x) => (x.id === id ? fn(x) : x)));
  }
  function answer(id: string, a: "allow" | "deny") {
    patch(id, (x) => ({
      ...x,
      ask: undefined,
      phase: a === "allow" ? "working" : "idle",
      msgs: [...x.msgs, { text: a === "allow" ? "Running pnpm test rank." : "You denied it, so the tests did not run." }],
    }));
    if (a === "allow")
      setTimeout(
        () => patch(id, (x) => ({ ...x, phase: "idle", msgs: [...x.msgs, { text: "18 passed. Title hits now rank first for a title match." }] })),
        1600,
      );
  }
  function steer(id: string, text: string) {
    patch(id, (x) => ({ ...x, phase: "working", msgs: [...x.msgs, { mine: true, text }] }));
    setTimeout(() => patch(id, (x) => ({ ...x, phase: "idle", msgs: [...x.msgs, { text: "Got it. Folded that in; nothing else changed." }] })), 1500);
  }
  function startNew(unit: string) {
    const id = `n${++seq}`;
    setSessions((l) => [{ id, title: "New chat", agent: "claude", phase: "idle", unit, live: true, when: "now", msgs: [] }, ...l]);
    push({ screen: "chat", session: id });
  }
  function setTheme(d: boolean) {
    setDark(d);
    const t = d ? "dark" : "light";
    document.documentElement.dataset.theme = t;
    localStorage.setItem("starlight-theme", t);
  }

  const Chevron = () => <Icon icon={ChevronRight} size={16} strokeWidth={2} class={sh.chevron} />;
  const Top = (props: { back: string; space?: boolean; end?: JSX.Element }) => (
    <header class={sh.pushTop}>
      <button class={sh.circle} aria-label="Back" onClick={back}>
        <Icon icon={ChevronLeft} size={20} strokeWidth={2} />
      </button>
      <span class={sh.backLabel} data-space={props.space || undefined}>
        {props.back}
      </span>
      {props.end}
    </header>
  );
  const Offline = () => (
    <Show when={!connected()}>
      <p class={sh.banner}>Offline, reconnecting</p>
    </Show>
  );

  const ProjectItem = (props: { p: Project }) => (
    <li>
      <button class={sh.item} onClick={() => push({ screen: "project", project: props.p.name })}>
        <span class={sh.tile}>{props.p.name[0]!.toUpperCase()}</span>
        <span class={sh.text}>
          <span class={sh.name}>{props.p.name}</span>
          <span class={sh.meta}>
            {props.p.units.length} worktree{props.p.units.length === 1 ? "" : "s"}
            {inProject(props.p).length ? ` ${DOT} ${inProject(props.p).length} session${inProject(props.p).length === 1 ? "" : "s"}` : ""}
          </span>
        </span>
        <span class={sh.marks}>
          <StatusBubble rollup={rollupOf(inProject(props.p))} />
        </span>
        <Chevron />
      </button>
    </li>
  );

  const Root = () => {
    const q = () => query().trim().toLowerCase();
    const all = () => SPACES.flatMap((x) => x.projects);
    const units = () => all().flatMap((p) => p.units.map((u) => ({ p, u }))).filter(({ u }) => u.branch.toLowerCase().includes(q()));
    const found = () => all().filter((p) => p.name.toLowerCase().includes(q()));
    const hits = () => live().filter((x) => x.title.toLowerCase().includes(q()));
    return (
      <div class={sh.glow}>
        <header class={sh.top}>
          <span class={sh.titles}>
            <Show when={tab() === "projects"} fallback={<span class={sh.bigTitle}>Topics</span>}>
              <span class={sh.bigTitle}>{space()}</span>
              <span class={sh.rootLabel}>{DOT} Spaces</span>
            </Show>
          </span>
          <button class={sh.circle} aria-label="Search" aria-pressed={searching()} onClick={() => (setSearching(!searching()), setQuery(""))}>
            <Icon icon={Search} size={18} strokeWidth={2} />
          </button>
          <button class={sh.circle} aria-label="Settings" onClick={() => setSheet(true)}>
            <Icon icon={Settings} size={19} strokeWidth={1.9} />
          </button>
        </header>
        <Show when={searching()}>
          <label class={sh.search}>
            <input
              ref={(el) => requestAnimationFrame(() => el.focus({ preventScroll: true }))}
              type="search"
              placeholder="Projects, worktrees, sessions"
              value={query()}
              onInput={(e) => setQuery(e.currentTarget.value)}
            />
          </label>
        </Show>
        <Offline />
        <div class={sh.scroll}>
          <Switch>
            <Match when={searching() && q()}>
              <Show when={found().length}>
                <h2 class={sh.label}>Projects</h2>
                <ul class={sh.group}>
                  <For each={found()}>{(p) => <ProjectItem p={p} />}</For>
                </ul>
              </Show>
              <Show when={units().length}>
                <h2 class={sh.label}>Worktrees</h2>
                <ul class={sh.group}>
                  <For each={units()}>
                    {({ p, u }) => (
                      <li>
                        <button class={sh.item} onClick={() => push({ screen: "unit", unit: u.id })}>
                          <span class={sh.text}>
                            <span class={sh.name}>{u.branch}</span>
                            <span class={sh.meta}>{p.name}</span>
                          </span>
                          <Chevron />
                        </button>
                      </li>
                    )}
                  </For>
                </ul>
              </Show>
              <Show when={hits().length}>
                <h2 class={sh.label}>Sessions</h2>
                <ul class={sh.group}>
                  <For each={hits()}>
                    {(x) => (
                      <li>
                        <button class={sh.item} onClick={() => push({ screen: "chat", session: x.id })}>
                          <span class={sh.text}>
                            <span class={sh.name}>{x.title}</span>
                            <span class={sh.meta}>{unitById(x.unit)?.unit.branch}</span>
                          </span>
                          <PhaseMark phase={x.phase} />
                          <Chevron />
                        </button>
                      </li>
                    )}
                  </For>
                </ul>
              </Show>
              <Show when={!found().length && !units().length && !hits().length}>
                <p class={sh.empty}>Nothing loaded matches "{query()}"</p>
              </Show>
            </Match>
            <Match when={tab() === "topics"}>
              <ul class={sh.group}>
                <For each={TOPICS}>
                  {(t) => (
                    <li>
                      <button class={sh.item} onClick={() => push({ screen: "topic", topic: t.name })}>
                        <span class={`${sh.tile} ${sh.tagTile}`}>
                          <Icon icon={Tag} size={18} strokeWidth={2} />
                        </span>
                        <span class={sh.text}>
                          <span class={sh.name}>{t.name}</span>
                          <span class={sh.meta}>
                            {t.members.length} members {DOT} {t.branch}
                          </span>
                        </span>
                        <Chevron />
                      </button>
                    </li>
                  )}
                </For>
              </ul>
            </Match>
            <Match when={true}>
              <ul class={sh.group}>
                <For each={sp().projects}>{(p) => <ProjectItem p={p} />}</For>
              </ul>
            </Match>
          </Switch>
        </div>
        <div class={sh.fade} />
        <nav class={sh.bar}>
          <div class={sh.spaces}>
            <For each={SPACES}>
              {(x) => {
                const current = () => tab() === "projects" && x.name === space();
                const rows = () => x.projects.flatMap(inProject);
                return (
                  <button class={sh.barItem} aria-current={current()} aria-label={x.name} onClick={() => (setSpace(x.name), setTab("projects"), setSearching(false))}>
                    <span class={sh.initial}>{x.initial}</span>
                    <Show when={current()} fallback={<StatusBubble rollup={rollupOf(rows())} tile />}>
                      <span class={sh.spaceName}>{x.name}</span>
                    </Show>
                  </button>
                );
              }}
            </For>
          </div>
          <span class={sh.divider} />
          <button class={sh.barItem} aria-current={tab() === "topics"} aria-label="Topics" onClick={() => (setTab("topics"), setSearching(false))}>
            <Icon icon={Tag} size={19} strokeWidth={1.9} />
            <Show when={tab() === "topics"}>
              <span class={sh.spaceName}>Topics</span>
            </Show>
          </button>
          <span class={sh.spacer} />
          <Show when={wheel()}>
            <button class={`${sh.wheel} ${s.wheel}`} data-on={apOn()} aria-label="Autopilot" onClick={() => push({ screen: "autopilot" })}>
              <Wheel state={apOn() ? (calls() ? "needs" : "working") : "idle"} size={24} />
              <Show when={apOn() && calls() > 0}>
                <span class={sh.wheelBadge}>{calls()}</span>
              </Show>
            </button>
          </Show>
        </nav>
      </div>
    );
  };

  const ProjectScreen = (props: { name: string }) => {
    const p = () => SPACES.flatMap((x) => x.projects).find((x) => x.name === props.name)!;
    return (
      <div class={sh.glow}>
        <Top back={space()} space />
        <Offline />
        <div class={sh.scroll}>
          <div class={sh.projectHead}>
            <span class={`${sh.tile} ${s.bigTile}`}>{p().name[0]!.toUpperCase()}</span>
            <span class={sh.text}>
              <span class={sh.headTitle}>{p().name}</span>
              <span class={sh.headMeta}>
                {p().units.length} worktrees{inProject(p()).length ? ` ${DOT} ${inProject(p()).length} live` : ""}
              </span>
            </span>
          </div>
          <h2 class={sh.label}>Worktrees</h2>
          <ul class={sh.cards}>
            <For each={p().units}>
              {(u) => {
                const rows = () => live().filter((x) => x.unit === u.id);
                return (
                  <li>
                    <button class={sh.card} onClick={() => push({ screen: "unit", unit: u.id })}>
                      <span class={sh.cardHead}>
                        <WorktreeMark active={rows().some((x) => x.phase === "working")} current={u.branch === "main"} />
                        <span class={sh.name}>{u.branch}</span>
                        <Show when={u.issue}>
                          <span class={sh.issueKey}>{u.issue}</span>
                        </Show>
                        <Show when={u.ahead}>
                          <SyncPush count={u.ahead!} />
                        </Show>
                        <span class={sh.marks}>
                          <StatusBubble rollup={rollupOf(rows())} />
                        </span>
                        <Chevron />
                      </span>
                      <span class={sh.cardMeta}>
                        <Show when={u.pr} fallback={<span>{rows().length ? `${rows().length} live ${DOT} ${rows()[0]!.when}` : "Worktree"}</span>}>
                          <PrLine number={u.pr!} age="2h" checks="4/4" comments={1} />
                        </Show>
                        <span class={sh.diff}>
                          <Show when={u.added}>
                            <span class={sh.added}>+{u.added}</span>
                          </Show>
                          <Show when={u.deleted}>
                            <span class={sh.deleted}>
                              {MINUS}
                              {u.deleted}
                            </span>
                          </Show>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              }}
            </For>
          </ul>
        </div>
      </div>
    );
  };

  const SessionCards = (props: { rows: Session[]; where?: boolean }) => (
    <>
      <Show when={props.rows.filter((x) => x.live).length}>
        <h2 class={sh.label}>Now</h2>
        <ul class={sh.cards}>
          <For each={props.rows.filter((x) => x.live)}>
            {(x) => (
              <li>
                <button class={sh.card} data-phase={x.phase} onClick={() => push({ screen: "chat", session: x.id })}>
                  <span class={sh.cardHead}>
                    <span class={sh.agentTile}>
                      <AgentMark agent={x.agent} size={15} />
                    </span>
                    <span class={sh.cardTitle}>{x.title}</span>
                  </span>
                  <span class={sh.stateRow}>
                    <PhaseMark phase={x.phase} />
                    <span class={sh.stateLabel} data-phase={x.phase}>
                      {PHASE[x.phase]}
                    </span>
                    <span class={sh.time}>
                      {props.where ? `${unitById(x.unit)?.project.name} ${DOT} ` : ""}
                      {x.when}
                    </span>
                  </span>
                </button>
              </li>
            )}
          </For>
        </ul>
      </Show>
      <Show when={props.rows.filter((x) => !x.live).length}>
        <h2 class={sh.label}>Earlier</h2>
        <ul class={sh.group}>
          <For each={props.rows.filter((x) => !x.live)}>
            {(x) => (
              <li>
                <button class={`${sh.item} ${sh.historyItem}`} onClick={() => push({ screen: "chat", session: x.id })}>
                  <span class={sh.historyMark}>
                    <AgentMark agent={x.agent} size={14} />
                  </span>
                  <span class={sh.historyTitle}>{x.title}</span>
                  <span class={sh.time}>{x.when}</span>
                </button>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </>
  );

  const UnitScreen = (props: { id: string }) => {
    const found = () => unitById(props.id)!;
    const u = () => found().unit;
    return (
      <div class={sh.glow}>
        <Top
          back={found().project.name}
          end={
            <button class={sh.newPill} onClick={() => startNew(props.id)}>
              <Icon icon={Plus} size={13} strokeWidth={2.6} />
              New
            </button>
          }
        />
        <Offline />
        <div class={sh.scroll}>
          <div class={sh.unitHead}>
            <span class={sh.headTitle}>{u().branch}</span>
            <span class={sh.diff}>
              <Show when={u().added}>
                <span class={sh.added}>+{u().added}</span>
              </Show>
              <Show when={u().deleted}>
                <span class={sh.deleted}>
                  {MINUS}
                  {u().deleted}
                </span>
              </Show>
            </span>
            <Show when={u().ahead}>
              <SyncPush count={u().ahead!} />
            </Show>
          </div>
          <Show when={sessions().some((x) => x.unit === props.id)} fallback={<p class={sh.empty}>No sessions here yet</p>}>
            <SessionCards rows={sessions().filter((x) => x.unit === props.id)} />
          </Show>
        </div>
      </div>
    );
  };

  const TopicScreen = (props: { name: string }) => {
    const t = () => TOPICS.find((x) => x.name === props.name)!;
    return (
      <div class={sh.glow}>
        <Top back="Topics" />
        <div class={sh.scroll}>
          <h1 class={sh.screenTitle}>{t().name}</h1>
          <h2 class={sh.label}>
            Members {DOT} {t().members.length}
          </h2>
          <ul class={sh.group}>
            <For each={t().members}>
              {(m) => (
                <li>
                  <button class={sh.item}>
                    <WorktreeMark active={false} />
                    <span class={sh.text}>
                      <span class={sh.name}>{m}</span>
                      <span class={sh.meta}>{t().branch}</span>
                    </span>
                    <Chevron />
                  </button>
                </li>
              )}
            </For>
          </ul>
        </div>
      </div>
    );
  };

  const ChatScreen = (props: { id: string }) => {
    const x = () => sessions().find((y) => y.id === props.id)!;
    const where = () => unitById(x().unit);
    const [draft, setDraft] = createSignal("");
    const [model, setModel] = createSignal("Opus 5.5");
    const [mode, setMode] = createSignal("Ask before edits");
    let tr!: HTMLDivElement;
    const send = () => {
      const t = draft().trim();
      if (!t) return;
      setDraft("");
      steer(props.id, t);
      queueMicrotask(() => (tr.scrollTop = tr.scrollHeight));
    };
    return (
      <div class={sh.chat}>
        <header class={sh.chatTop}>
          <button class={sh.circle} aria-label="Back" onClick={back}>
            <Icon icon={ChevronLeft} size={20} strokeWidth={2} />
          </button>
          <span class={sh.chatTitles}>
            <span class={sh.chatTitle}>{x().title}</span>
            <span class={sh.stateLine}>
              <PhaseMark phase={x().phase} />
              {PHASE[x().phase]} {DOT} {where()?.project.name} {NEXT} {where()?.unit.branch}
            </span>
          </span>
        </header>
        <Offline />
        <div ref={tr} class={`${mb.transcript} ${s.transcript}`}>
          <Show when={x().msgs.length} fallback={<p class={sh.empty}>A fresh chat in {where()?.unit.branch}. Say what you want done.</p>}>
            <Index each={x().msgs}>{(m) => (m().mine ? <div class={`${w.user} ${s.user}`}>{m().text}</div> : <div class={`${w.prose} ${s.prose}`}>{m().text}</div>)}</Index>
            <Show when={x().phase === "working"}>
              <div class={w.thinking}>Working</div>
            </Show>
          </Show>
        </div>
        <Show when={x().ask}>
          <div class={mb.pending}>
            <div class={mb.card}>
              <strong>Allow Bash?</strong>
              <pre class={mb.detail}>{x().ask}</pre>
              <div class={mb.cardActions}>
                <button class={mb.secondary} disabled={!connected()} onClick={() => answer(props.id, "deny")}>
                  Deny
                </button>
                <button class={mb.primarySmall} disabled={!connected()} onClick={() => answer(props.id, "allow")}>
                  Allow once
                </button>
              </div>
            </div>
          </div>
        </Show>
        <Show when={x().live}>
          <form
            class={sh.composer}
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <textarea
              class={sh.composerInput}
              rows={1}
              placeholder={x().phase === "working" ? "Steer the running turn" : "Message"}
              value={draft()}
              onInput={(e) => setDraft(e.currentTarget.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
            />
            <span class={sh.composerRow}>
              <Show when={props.id !== "autopilot"}>
                <label class={sh.chip}>
                  <AgentMark agent={x().agent} size={12} />
                  {x().agent === "codex" ? "gpt-5.5-codex" : model()}
                  <select value={model()} onChange={(e) => setModel(e.currentTarget.value)} disabled={x().agent === "codex"}>
                    <option>Opus 5.5</option>
                    <option>Sonnet 5</option>
                    <option>Haiku 4.5</option>
                  </select>
                </label>
                <label class={sh.chip} data-permissive={mode() === "Bypass permissions"}>
                  {mode()}
                  <select value={mode()} onChange={(e) => setMode(e.currentTarget.value)}>
                    <option>Ask before edits</option>
                    <option>Accept edits</option>
                    <option>Plan mode</option>
                    <option>Bypass permissions</option>
                  </select>
                </label>
              </Show>
              <button type="submit" class={sh.send} aria-label="Send" disabled={!draft().trim()}>
                <Icon icon={ArrowUp} size={17} strokeWidth={2.6} />
              </button>
            </span>
          </form>
        </Show>
      </div>
    );
  };

  const AutopilotScreen = () => {
    const [draft, setDraft] = createSignal("");
    const hero = () =>
      !apOn()
        ? { eyebrow: "Docked", title: "At anchor.", body: "Nothing runs until you set sail." }
        : calls()
          ? { eyebrow: "Holding course", title: "One call for the captain.", body: "The ship holds its heading while you decide." }
          : { eyebrow: "Cruising", title: "Smooth sailing.", body: "Two workers on deck. It rings when it needs you." };
    const decide = (yes: boolean) => {
      setCalls(0);
      setApLog((l) => [...l, { time: "10:53", text: yes ? "#41 running: opened PR #53" : "#41 dismissed, stays on its branch" }]);
    };
    const send = () => {
      const t = draft().trim();
      if (!t) return;
      setDraft("");
      setApLog((l) => [...l, { time: "10:54", text: `You: ${t}` }]);
    };
    return (
      <div class={sh.autopilot}>
        <div class={`${sh.horizon} ${s.horizon}`} data-off={!apOn()}>
          <div class={sh.horizonScene} innerHTML={scene()} />
          <div class={sh.horizonShade} />
          <div class={sh.horizonTop}>
            <button class={sh.glass} aria-label="Back" onClick={back}>
              <Icon icon={ChevronLeft} size={20} strokeWidth={2} />
            </button>
            <button class={`${sh.glass} ${sh.glassPill}`} role="switch" aria-checked={apOn()} aria-label="Autopilot" onClick={() => setApOn(!apOn())}>
              {apOn() ? "On" : "Off"}
              <span class={sh.apToggle} data-on={apOn()} />
            </button>
          </div>
          <div class={sh.horizonText}>
            <span class={sh.eyebrow} data-spin={apOn()}>
              <Wheel state="idle" size={13} />
              Autopilot {DOT} {hero().eyebrow}
            </span>
            <span class={sh.headline}>{hero().title}</span>
            <span class={sh.subline}>{hero().body}</span>
          </div>
        </div>
        <div class={sh.apScroll}>
          <Show
            when={apOn()}
            fallback={
              <div class={sh.docked}>
                <div class={sh.infoCard}>
                  <span>The autopilot picks up issues, runs workers in your worktrees and asks you before anything leaves the machine.</span>
                </div>
                <button class={sh.setSail} onClick={() => setApOn(true)}>
                  <Wheel state="idle" size={18} />
                  Set sail
                </button>
              </div>
            }
          >
            <Show when={calls()}>
              <h2 class={`${sh.label} ${sh.callLabel}`}>Your call {DOT} 1</h2>
              <div class={sh.calls}>
                <div class={sh.callCard}>
                  <span class={sh.callText}>
                    <span class={sh.callRef}>#41 {DOT} hooli-search</span>
                    <span class={sh.callTitle}>Open a draft PR for Weight title hits in ranking</span>
                    <span class={sh.callBody}>fix/search-ranking into main. 3 files, +46 {MINUS}9, tests pass.</span>
                  </span>
                  <span class={sh.callActions}>
                    <button class={sh.callYes} onClick={() => decide(true)}>
                      Approve
                    </button>
                    <button class={sh.callNo} onClick={() => decide(false)}>
                      Dismiss
                    </button>
                  </span>
                </div>
              </div>
            </Show>
            <h2 class={sh.label}>Crew</h2>
            <div class={sh.crew}>
              <For each={[
                { phase: (calls() ? "needs" : "working") as Phase, ref: "#41", name: "Weight title hits in ranking", doing: calls() ? "Needs your approval" : "Opening the PR", session: "s1" },
                { phase: "working" as Phase, ref: "#7", name: "Middle-out for video chunks", doing: "Benchmarking", session: "s4" },
              ]}>
                {(k) => (
                  <button class={sh.worker} onClick={() => push({ screen: "chat", session: k.session })}>
                    <span class={sh.workerHead}>
                      <PhaseMark phase={k.phase} />
                      <span class={sh.time}>{k.ref}</span>
                    </span>
                    <span class={sh.workerName}>{k.name}</span>
                    <span class={sh.workerTask}>{k.doing}</span>
                  </button>
                )}
              </For>
            </div>
            <h2 class={sh.label}>Log</h2>
            <div class={sh.log}>
              <For each={[...apLog()].reverse()}>
                {(e) => (
                  <div class={sh.logRow}>
                    <span class={sh.logTime}>{e.time}</span>
                    <span class={sh.logText} data-needs={e.needs === true && calls() > 0}>
                      {e.text}
                    </span>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>
        <form
          class={sh.apComposer}
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <input placeholder={apOn() ? "Message the autopilot" : "Set sail to message the autopilot"} disabled={!apOn()} value={draft()} onInput={(e) => setDraft(e.currentTarget.value)} />
          <button type="submit" class={sh.apSend} aria-label="Send" disabled={!apOn() || !draft().trim()}>
            <Icon icon={ArrowUp} size={16} strokeWidth={2.6} />
          </button>
        </form>
      </div>
    );
  };

  const Sheet = () => (
    <>
      <div class={sh.dim} onClick={() => setSheet(false)} />
      <section class={sh.sheet} role="dialog" aria-label="Settings">
        <span class={sh.grabber} />
        <header class={sh.sheetHead}>
          <span class={sh.sheetTitle}>Settings</span>
          <button class={sh.done} onClick={() => setSheet(false)}>
            Done
          </button>
        </header>
        <div class={sh.sheetBody}>
          <h2 class={sh.label}>Connection</h2>
          <ul class={sh.group}>
            <li>
              <div class={`${sh.item} ${sh.setting}`}>
                <span class={sh.text}>Tori</span>
                <span class={sh.value}>ws://100.84.12.7:47821</span>
              </div>
            </li>
            <li>
              <div class={`${sh.item} ${sh.setting}`}>
                <span class={sh.text}>This phone</span>
                <span class={sh.value}>Richard's Pixel</span>
              </div>
            </li>
            <li>
              <div class={`${sh.item} ${sh.setting}`}>
                <span class={sh.text}>Status</span>
                <span class={sh.value}>{connected() ? "open" : "offline"}</span>
              </div>
            </li>
            <li>
              <button class={`${sh.item} ${sh.setting} ${sh.disconnect}`} onClick={() => (setConnected(!connected()), setSheet(false))}>
                {connected() ? "Disconnect" : "Reconnect"}
              </button>
            </li>
          </ul>
          <p class={sh.footnote}>Disconnect forgets this Tori on the phone. Remove the phone under Settings, Remote on the Mac too.</p>
          <h2 class={sh.label}>Appearance</h2>
          <ul class={sh.group}>
            <li>
              <div class={`${sh.item} ${sh.setting}`}>
                <span class={sh.text}>Theme</span>
                <span class={sh.segments}>
                  <button aria-pressed={dark()} onClick={() => setTheme(true)}>
                    Dark
                  </button>
                  <button aria-pressed={!dark()} onClick={() => setTheme(false)}>
                    Light
                  </button>
                </span>
              </div>
            </li>
          </ul>
          <p class={sh.footnote}>Tori Dark or Tori Light, kept on this phone.</p>
          <h2 class={sh.label}>Autopilot</h2>
          <ul class={sh.group}>
            <li>
              <button class={sh.item} onClick={() => setWheel(!wheel())}>
                <span class={sh.wheelTile}>
                  <Wheel state="idle" size={17} />
                </span>
                <span class={sh.text}>Autopilot button</span>
                <span class={sh.toggle} role="switch" aria-checked={wheel()} />
              </button>
            </li>
          </ul>
          <p class={sh.footnote}>Shows the wheel in the bottom bar. Tap it to open the autopilot chat and turn it on or off.</p>
        </div>
      </section>
    </>
  );

  const current = createMemo(() => view());

  return (
    <div class={s.outer}>
      <div class={s.root}>
        <PhoneFrame width={280}>
          <div class={sh.shell}>
            <Switch>
              <Match when={current().screen === "root"}>
                <Root />
              </Match>
              <Match when={current().screen === "project" && (current() as { project: string }).project}>{(n) => <ProjectScreen name={n()} />}</Match>
              <Match when={current().screen === "topic" && (current() as { topic: string }).topic}>{(n) => <TopicScreen name={n()} />}</Match>
              <Match when={current().screen === "unit" && (current() as { unit: string }).unit}>{(n) => <UnitScreen id={n()} />}</Match>
              <Match when={current().screen === "chat" && (current() as { session: string }).session}>{(n) => <ChatScreen id={n()} />}</Match>
              <Match when={current().screen === "autopilot"}>
                <AutopilotScreen />
              </Match>
            </Switch>
            <Show when={sheet()}>
              <Sheet />
            </Show>
          </div>
        </PhoneFrame>
        <nav class={s.guide} aria-label="Screens">
          <For each={GUIDE}>
            {(g) => (
              <button type="button" class={s.step} aria-current={guide() === g.id} onClick={() => go(g.id)}>
                <span class={s.stepLabel}>{g.label}</span>
                <span class={s.stepBlurb}>{g.blurb}</span>
              </button>
            )}
          </For>
        </nav>
      </div>
    </div>
  );
}
