import { createEffect, createMemo, createSignal, For, Index, on, onCleanup, onMount, Show } from "solid-js";
import { Anchor, ArrowUp, ArrowUpRight, Bell, Eye, GitPullRequest, Lock, MessageCircleQuestion, PanelLeft, Sailboat, type IconNode } from "lucide";
import { AgentMark, Icon, Tab, type Agent } from "../../app/kit";
import { loadScene, sceneFor, Wheel } from "../../app/autopilotParts";
import w from "../../app/window.module.css";
import btn from "../../app/css/Button.module.css";
import sw from "../../app/css/AutopilotSwitch.module.css";
import av from "../../app/css/AutopilotView.module.css";
import sp from "../../app/css/ShellParts.module.css";
import dc from "../../app/css/DecisionCard.module.css";
import hz from "../../app/css/Horizon.module.css";
import lb from "../../app/css/LockedBar.module.css";
import mk from "../../app/css/SessionMarks.module.css";
import DemoWindow, { useToast } from "./DemoWindow";
import s from "./AutopilotDemo.module.css";

type CallKind = "pr" | "review" | "question";
type Call = { kind: CallKind; ask: string; summary: string; suggestion?: string };
type Step = { log: string; doing: string } | { call: Call };
type Item = { num: string; title: string; place: string[]; agent: Agent; steps: Step[]; done: string };
type Status = "working" | "needs" | "done" | "idle";
type Worker = { item: Item; at: number; status: Status; doing: string };
type Msg = { mine?: boolean; text: string };

const KINDS: Record<CallKind, { label: string; icon: IconNode }> = {
  pr: { label: "PR", icon: GitPullRequest },
  review: { label: "Review", icon: Eye },
  question: { label: "Question from worker", icon: MessageCircleQuestion },
};
const log = (line: string, doing: string): Step => ({ log: line, doing });

const RANKING: Item = {
  num: "#41",
  title: "Weight title hits in ranking",
  place: ["hooli", "hooli-search", "fix/search-ranking"],
  agent: "claude",
  steps: [
    log("> edit src/rank.ts", "Editing"),
    log("$ pnpm test rank", "Running tests"),
    log("  18 passed", "Tests pass"),
    {
      call: {
        kind: "pr",
        ask: "#41 passes all 18 ranking tests. Its PR goes to GitHub, so it needs your approval.",
        summary: "Open a draft PR from fix/search-ranking into main. 3 files, +46 -9, tests pass.",
      },
    },
    log("> gh pr create --draft", "Opening the PR"),
    log("  opened PR #53", "PR #53 opened"),
  ],
  done: "#41 shipped: PR #53 is open as a draft.",
};
const MIDDLE_OUT: Item = {
  num: "#7",
  title: "Middle-out for video chunks",
  place: ["raviga", "pied-piper", "feat/middle-out"],
  agent: "codex",
  steps: [
    log("> read src/codec/chunk.ts", "Reading code"),
    log("> edit src/codec/middleOut.ts", "Editing"),
    log("$ pnpm bench codec", "Benchmarking"),
    log("  weissman 4.9 (was 5.2)", "Benchmarking"),
    {
      call: {
        kind: "question",
        ask: "The worker on #7 has a question before it goes on.",
        summary: "The Weissman score drops from 5.2 to 4.9 on 4K clips. Keep the faster path, or hold the old score?",
        suggestion: "Keep both: the faster path behind a flag, the old score by default.",
      },
    },
    log("> edit src/codec/flags.ts", "Editing"),
    log("$ pnpm test codec", "Running tests"),
    log("  33 passed", "Tests pass"),
    {
      call: {
        kind: "pr",
        ask: "#7 passes all 33 codec tests. Opening its PR sends it to GitHub, so I need your approval.",
        summary: "Open a draft PR from feat/middle-out into main. 5 files, +212 -40, tests pass.",
      },
    },
    log("> gh pr create --draft", "Opening the PR"),
    log("  opened PR #8", "PR #8 opened"),
  ],
  done: "#7 shipped: PR #8 is open as a draft.",
};
const REVIEW: Item = {
  num: "PR #52",
  title: "Review: cache query tokens",
  place: ["hooli", "hooli-search", "feat/token-cache"],
  agent: "claude",
  steps: [
    log("> gh pr diff 52", "Reading the diff"),
    log("> read src/cache.ts", "Reading code"),
    log("$ pnpm test cache", "Running tests"),
    log("  9 passed", "Tests pass"),
    {
      call: {
        kind: "review",
        ask: "PR #52 reads well and its tests pass. Posting a review speaks for you on GitHub, so I need your approval.",
        summary: "Approve PR #52, with 2 comments on when the token cache is evicted.",
      },
    },
    log("> gh pr review 52 --approve", "Submitting the review"),
    log("  review posted", "Review posted"),
  ],
  done: "Reviewed PR #52: approved, with 2 comments.",
};
const HOTDOG: Item = {
  num: "#19",
  title: "Hot dog detection on video",
  place: ["raviga", "seefood", "feat/video"],
  agent: "claude",
  steps: [
    log("> read src/classify.ts", "Reading code"),
    log("> edit src/video.ts", "Editing"),
    log("$ pnpm test video", "Running tests"),
    log("  14 passed", "Tests pass"),
    {
      call: {
        kind: "pr",
        ask: "#19 passes all 14 video tests. Opening its PR sends it to GitHub, so I need your approval.",
        summary: "Open a draft PR from feat/video into main. 2 files, +88 -3, tests pass.",
      },
    },
    log("> gh pr create --draft", "Opening the PR"),
    log("  opened PR #20", "PR #20 opened"),
  ],
  done: "#19 shipped: PR #20 is open as a draft.",
};
function queued(n: string): Item {
  return {
    num: `#${n}`,
    title: `Issue #${n}`,
    place: ["hooli", "hooli-search", `fix/issue-${n}`],
    agent: "claude",
    steps: [
      log(`> gh issue view ${n}`, "Reading the issue"),
      log("> edit src/server.ts", "Editing"),
      log("$ pnpm test", "Running tests"),
      log("  27 passed", "Tests pass"),
      {
        call: {
          kind: "pr",
          ask: `#${n} passes all 27 tests. Opening its PR sends it to GitHub, so I need your approval.`,
          summary: `Open a draft PR from fix/issue-${n} into main. 1 file, +12 -2, tests pass.`,
        },
      },
      log("> gh pr create --draft", "Opening the PR"),
      log("  opened a draft PR", "PR opened"),
    ],
    done: `#${n} shipped as a draft PR.`,
  };
}

const CREW = 2;
const FIRST_CALL = (RANKING.steps[3] as { call: Call }).call;
const logs = (x: Worker) => x.item.steps.slice(0, x.at).flatMap((st) => ("log" in st ? [st.log] : []));
const callOf = (x: Worker) => {
  const st = x.item.steps[x.at];
  return st && "call" in st ? st.call : undefined;
};
const needsDoing = (c: Call) => (c.kind === "question" ? "Asking you a question" : "Needs your approval");
const placeText = (it: Item) => it.place.join(" -> ");

function Mark() {
  return (
    <span class={sp.replyMark}>
      <Wheel state="idle" size={14} />
    </span>
  );
}

export default function AutopilotDemo() {
  const { toast, say } = useToast();
  const [view, setView] = createSignal<"cockpit" | "workspace">("cockpit");
  const [sailing, setSailing] = createSignal(true);
  const [crew, setCrew] = createSignal<Worker[]>([
    { item: RANKING, at: 3, status: "needs", doing: needsDoing(FIRST_CALL) },
    { item: MIDDLE_OUT, at: 1, status: "working", doing: "Reading code" },
  ]);
  const [dock, setDock] = createSignal<Item[]>([REVIEW, HOTDOG]);
  const [thread, setThread] = createSignal<Msg[]>([
    { mine: true, text: "ship #41 and #7, then PR #52 and #19" },
    { text: "Two workers on deck: #41 and #7. PR #52 and #19 wait at the dock." },
    { text: FIRST_CALL.ask },
  ]);
  const [edits, setEdits] = createSignal<Record<string, string>>({});
  const [editing, setEditing] = createSignal<string | null>(null);
  const [replyTo, setReplyTo] = createSignal<string | null>(null);
  const [draft, setDraft] = createSignal("");
  const [watched, setWatched] = createSignal(MIDDLE_OUT.num);
  const [yours, setYours] = createSignal<string[]>([]);
  const [scene, setScene] = createSignal("");
  let composer!: HTMLInputElement;
  let scroller!: HTMLDivElement;
  let root!: HTMLDivElement;

  const post = (text: string, mine = false) => setThread((t) => [...t, { text, mine }]);
  const calls = createMemo(() => crew().flatMap((x) => (x.status === "needs" ? [{ x, call: callOf(x)! }] : [])));
  const summaryOf = (x: Worker) => edits()[`${x.item.num}:${x.at}`] ?? callOf(x)!.summary;

  function patch(num: string, fn: (x: Worker) => Worker) {
    setCrew((list) => list.map((x) => (x.item.num === num ? fn(x) : x)));
  }
  function advance(x: Worker): Worker {
    const st = x.item.steps[x.at];
    if (!st) {
      post(x.item.done);
      return { ...x, status: "done", doing: "Done" };
    }
    if ("call" in st) {
      post(st.call.ask);
      return { ...x, status: "needs", doing: needsDoing(st.call) };
    }
    return { ...x, at: x.at + 1, doing: st.doing };
  }
  function tick() {
    if (!sailing()) return;
    const next = crew()
      .filter((x) => x.status === "working" || x.status === "needs")
      .map((x) => (x.status === "working" ? advance(x) : x));
    const waiting = [...dock()];
    while (next.length < CREW && waiting.length) {
      const it = waiting.shift()!;
      next.push({ item: it, at: 0, status: "working", doing: "Starting" });
      post(`A worker is free, so ${it.num} leaves the dock: ${it.title}.`);
    }
    setDock(waiting);
    setCrew(next);
  }

  onMount(() => {
    loadScene(sceneFor(new Date().getHours())).then(setScene);
    let visible = false;
    const io = new IntersectionObserver((e) => (visible = e[0]!.isIntersecting));
    io.observe(root);
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setInterval(() => visible && !still && tick(), 1700);
    onCleanup(() => {
      io.disconnect();
      clearInterval(timer);
    });
  });
  createEffect(
    on(
      () => thread().length + calls().length,
      () => queueMicrotask(() => scroller && (scroller.scrollTop = scroller.scrollHeight)),
    ),
  );

  function approve(x: Worker) {
    const c = callOf(x)!;
    setEditing(null);
    if (c.kind === "question") post(`Told the worker on ${x.item.num}: ${c.suggestion}`);
    else if (c.kind === "review") post(`Approved once, for that exact review. Posting it on ${x.item.num}.`);
    else post(`Approved once, for that exact draft. Opening the PR for ${x.item.num}.`);
    patch(x.item.num, (y) => ({ ...y, at: y.at + 1, status: "working", doing: c.kind === "question" ? "Back to work" : "Approved" }));
  }
  function dismiss(x: Worker) {
    const c = callOf(x)!;
    setEditing(null);
    if (c.kind === "question") {
      post(`Dismissed. The worker on ${x.item.num} keeps the path it is on.`);
      patch(x.item.num, (y) => ({ ...y, at: y.at + 1, status: "working", doing: "Back to work" }));
      return;
    }
    post(c.kind === "review" ? `Dismissed. No review goes up on ${x.item.num}.` : `Dismissed. ${x.item.num} stays on ${x.item.place[2]}, no PR opened.`);
    patch(x.item.num, (y) => ({ ...y, status: "idle", doing: "Parked on its branch" }));
  }
  function reply(x: Worker) {
    setReplyTo(x.item.num);
    composer.focus({ preventScroll: true });
  }
  function saveEdit(x: Worker, text: string) {
    setEdits((e) => ({ ...e, [`${x.item.num}:${x.at}`]: text }));
    setEditing(null);
    post(`Updated the draft for ${x.item.num}. Approve sends exactly this.`);
  }

  function send() {
    const text = draft().trim();
    if (!text) return;
    setDraft("");
    post(text, true);
    const to = replyTo();
    setReplyTo(null);
    const target = to && crew().find((x) => x.item.num === to && x.status === "needs");
    if (target) {
      if (callOf(target)!.kind === "question") {
        post(`Passed your answer to the worker on ${to}.`);
        patch(to, (y) => ({ ...y, at: y.at + 1, status: "working", doing: "Back to work" }));
      } else {
        post(`Passed that to the worker on ${to}. It will come back with a new draft.`);
        patch(to, (y) => ({ ...y, at: Math.max(0, y.at - 2), status: "working", doing: "Reworking" }));
      }
      return;
    }
    const n = /#(\d+)/.exec(text)?.[1];
    if (n && ![...crew().map((x) => x.item.num), ...dock().map((d) => d.num)].includes(`#${n}`)) {
      setDock((d) => [...d, queued(n)]);
      post(`Queued #${n} in hooli-search. It leaves the dock when a worker is free.`);
      return;
    }
    if (/\b(stop|pause|anchor|hold)\b/i.test(text)) return anchor(true);
    post("Noted. I will steer the crew with that.");
  }

  function anchor(drop: boolean) {
    setSailing(!drop);
    post(drop ? "Anchor down. Every worker holds where it stands until you set sail." : "Under way again. The crew picks up where it stopped.");
  }
  function watch(num: string) {
    setWatched(num);
    setView("workspace");
  }
  function stopToType() {
    const num = watched();
    setSailing(false);
    setYours((y) => [...y, num]);
    post(`You took over the session on ${num}, so the autopilot is at anchor.`);
    say("Autopilot stopped. This session is yours now.");
  }

  function onKey(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "j") {
      e.preventDefault();
      setView((v) => (v === "cockpit" ? "workspace" : "cockpit"));
      return;
    }
    const tag = (e.target as HTMLElement).tagName;
    if (view() !== "cockpit" || tag === "INPUT" || tag === "TEXTAREA" || e.metaKey || e.ctrlKey || e.altKey) return;
    const first = calls()[0];
    if (!first) return;
    if (e.key === "a" || e.key === "A") {
      e.preventDefault();
      approve(first.x);
    } else if (e.key === "r" || e.key === "R") {
      e.preventDefault();
      reply(first.x);
    }
  }

  const state = () => (calls().length ? "needs" : sailing() && crew().length ? "working" : "idle");
  const hero = () => {
    const n = crew().length;
    if (!sailing()) return { eyebrow: "At anchor", title: "Anchored.", body: "Every worker holds where it stands. Set sail to pick up again." };
    if (calls().length) {
      const k = calls().length;
      return { eyebrow: "Holding course", title: `${["One call", "Two calls", "Three calls"][k - 1] ?? `${k} calls`} for the captain.`, body: "The ship holds its heading while you decide." };
    }
    if (n) return { eyebrow: "Cruising", title: "Smooth sailing.", body: `${n === 1 ? "One worker" : "Two workers"} on deck. The autopilot rings when it needs you.` };
    return { eyebrow: "Calm waters", title: "Nothing on deck.", body: "The queue is empty. Hand it an issue below." };
  };

  const focusedWorker = () => crew().find((x) => x.item.num === watched());
  const watchedItem = () => focusedWorker()?.item ?? [RANKING, MIDDLE_OUT, REVIEW, HOTDOG].find((i) => i.num === watched()) ?? MIDDLE_OUT;
  const driving = () => {
    const x = focusedWorker();
    return !!x && sailing() && !yours().includes(x.item.num) && (x.status === "working" || x.status === "needs");
  };

  const Switch = () => (
    <div class={sw.pill} data-state={state()} data-view={view() === "cockpit" ? "autopilot" : "workspace"}>
      <button type="button" class={`${sw.segment} ${view() === "cockpit" ? sw.active : ""}`} onClick={() => setView("cockpit")} aria-pressed={view() === "cockpit"}>
        <Wheel state={state()} count={calls().length} active={view() === "cockpit"} />
        <Show when={view() === "cockpit"}>
          <span class={sw.label} data-widest="Workspace">
            <span>Cockpit</span>
          </span>
        </Show>
      </button>
      <button type="button" class={`${sw.segment} ${view() === "workspace" ? sw.active : ""}`} onClick={() => setView("workspace")} aria-pressed={view() === "workspace"}>
        <Icon icon={PanelLeft} class={sw.icon} />
        <Show when={view() === "workspace"}>
          <span class={sw.label} data-widest="Workspace">
            <span>Workspace</span>
          </span>
        </Show>
      </button>
    </div>
  );

  const Card = (props: { x: Worker }) => {
    const c = () => callOf(props.x)!;
    let area!: HTMLTextAreaElement;
    return (
      <article class={`${dc.card} ${s.call}`} data-focused={calls()[0]?.x.item.num === props.x.item.num ? "true" : "false"}>
        <header class={dc.head}>
          <span class={dc.kind}>
            <Icon icon={KINDS[c().kind].icon} class={dc.kindIcon} />
            {KINDS[c().kind].label}
          </span>
          <span class={dc.ref} title={placeText(props.x.item)}>
            {props.x.item.num}
          </span>
          <span class={dc.title}>{props.x.item.title}</span>
          <span class={dc.age}>now</span>
        </header>
        <Show
          when={c().kind === "question"}
          fallback={
            <Show when={editing() === props.x.item.num} fallback={<p class={dc.summary}>{summaryOf(props.x)}</p>}>
              <textarea ref={area} class={s.edit} value={summaryOf(props.x)} aria-label="Edit the draft" />
            </Show>
          }
        >
          <div class={dc.quote}>
            <div class={dc.asker}>
              <span class={dc.dot} />
              Worker
              <span class={dc.worker}>{props.x.item.num}</span>
            </div>
            <p class={dc.question}>{c().summary}</p>
          </div>
          <p class={dc.suggestion}>Suggested reply: {c().suggestion}</p>
        </Show>
        <div class={dc.actions}>
          <Show
            when={editing() === props.x.item.num}
            fallback={
              <>
                <button type="button" class={`${btn.btn} ${btn.primary} ${btn.sm}`} onClick={() => approve(props.x)}>
                  <span class={btn.label}>Approve</span>
                  <kbd class={dc.hint}>A</kbd>
                </button>
                <Show when={c().kind !== "question"}>
                  <button type="button" class={`${btn.btn} ${btn.default} ${btn.sm}`} onClick={() => setEditing(props.x.item.num)}>
                    <span class={btn.label}>Edit</span>
                  </button>
                </Show>
                <button type="button" class={`${btn.btn} ${btn.default} ${btn.sm}`} onClick={() => reply(props.x)}>
                  <span class={btn.label}>Reply</span>
                  <kbd class={dc.hint}>R</kbd>
                </button>
                <button type="button" class={`${btn.btn} ${btn.ghost} ${btn.sm}`} onClick={() => dismiss(props.x)}>
                  <span class={btn.label}>Dismiss</span>
                </button>
                <Show when={c().kind === "question"}>
                  <button type="button" class={`${btn.btn} ${btn.ghost} ${btn.sm} ${dc.openWorker}`} onClick={() => watch(props.x.item.num)}>
                    <span class={btn.label}>Open worker</span>
                    <Icon icon={ArrowUpRight} class={dc.kindIcon} />
                  </button>
                </Show>
              </>
            }
          >
            <button type="button" class={`${btn.btn} ${btn.primary} ${btn.sm}`} onClick={() => saveEdit(props.x, area.value.trim() || summaryOf(props.x))}>
              <span class={btn.label}>Save draft</span>
            </button>
            <button type="button" class={`${btn.btn} ${btn.ghost} ${btn.sm}`} onClick={() => setEditing(null)}>
              <span class={btn.label}>Cancel</span>
            </button>
          </Show>
        </div>
      </article>
    );
  };

  const Cockpit = () => (
    <div class={`${av.view} ${s.view}`}>
      <aside class={`${av.workers} ${s.workers}`}>
        <div class={sp.sectionHead}>
          <span class={sp.sectionLabel}>Crew on deck</span>
          <span class={sp.sectionCount}>{crew().length}</span>
        </div>
        <Index each={crew()} fallback={<div class={s.none}>No one on deck.</div>}>
          {(x) => (
            <article class={av.card} data-status={x().status}>
              <div class={av.cardHead}>
                <span class={av.ring} data-status={x().status} style={{ "--p": `${Math.round((x().at / x().item.steps.length) * 100)}%` }}>
                  <span>{x().item.num.replace("PR ", "")}</span>
                </span>
                <div class={av.cardName}>
                  <span class={av.cardTitle}>{x().item.title}</span>
                  <span class={av.cardBranch}>{x().item.place.slice(1).join(" -> ")}</span>
                </div>
              </div>
              <div class={`${av.log} ${s.log}`}>
                <For each={logs(x()).slice(-2)}>{(l) => <div class={av.logLine}>{l}</div>}</For>
              </div>
              <div class={av.cardFoot}>
                <span class={av.doing} data-status={x().status}>
                  <span class={sp.dot} data-status={x().status} />
                  {x().doing}
                </span>
                <button type="button" class={`${btn.btn} ${btn.ghost} ${btn.xs}`} onClick={() => watch(x().item.num)}>
                  <span class={btn.label}>Watch</span>
                  <Icon icon={ArrowUpRight} class={av.watchIcon} />
                </button>
              </div>
            </article>
          )}
        </Index>
        <div class={sp.sectionHead}>
          <span class={sp.sectionLabel}>Waiting at the dock</span>
          <span class={sp.sectionCount}>{dock().length}</span>
        </div>
        <Index each={dock()} fallback={<div class={s.none}>Nothing waiting.</div>}>
          {(d) => (
            <div class={av.queued}>
              <span class={av.cardRef}>{d().num}</span>
              <span class={av.queuedTitle}>{d().title}</span>
            </div>
          )}
        </Index>
      </aside>
      <section class={`${av.center} ${s.center}`}>
        <header class={`${av.hero} ${s.hero}`} data-state={sailing() ? state() : "idle"}>
          <div class={hz.horizon}>
            <div class={hz.scene} innerHTML={scene()} />
          </div>
          <div class={`${av.heroRow} ${s.heroRow}`}>
            <div class={av.heroText}>
              <span class={av.eyebrow}>
                <span class={av.eyebrowDot} />
                {hero().eyebrow}
              </span>
              <h1 class={`${av.heroTitle} ${s.heroTitle}`}>{hero().title}</h1>
              <p class={`${av.heroBody} ${s.heroBody}`}>{hero().body}</p>
            </div>
            <Show
              when={sailing()}
              fallback={
                <button type="button" class={av.sail} onClick={() => anchor(false)}>
                  <Icon icon={Sailboat} class={av.helmIcon} />
                  <span class={s.helmLabel}>Set sail</span>
                </button>
              }
            >
              <button type="button" class={av.anchor} onClick={() => anchor(true)}>
                <Icon icon={Anchor} class={av.helmIcon} />
                <span class={s.helmLabel}>Drop anchor</span>
              </button>
            </Show>
          </div>
        </header>
        <div class={`${av.column} ${s.column}`} data-live="false">
          <div
            ref={(el) => {
              scroller = el;
              requestAnimationFrame(() => (el.scrollTop = el.scrollHeight));
            }}
            class={`${av.scroll} ${s.scroll}`}
          >
            <div class={`${sp.thread} ${s.thread}`}>
              <Index each={thread()}>
                {(m) => (
                  <Show
                    when={m().mine}
                    fallback={
                      <div class={`${sp.theirs} ${s.in}`}>
                        <Mark />
                        <span>{m().text}</span>
                      </div>
                    }
                  >
                    <div class={`${sp.mine} ${s.in}`}>{m().text}</div>
                  </Show>
                )}
              </Index>
              <Show when={calls().length}>
                <div class={sp.call}>
                  <Icon icon={Bell} class={sp.callIcon} />
                  Captain's call
                  <span class={sp.callCount}>{calls().length}</span>
                </div>
                <For each={calls()}>{(c) => <Card x={c.x} />}</For>
              </Show>
            </div>
          </div>
          <div class={`${sp.composer} ${s.composer}`}>
            <div class={sp.composerField}>
              <input
                ref={composer}
                class={`${sp.input} ${s.input}`}
                value={draft()}
                onInput={(e) => setDraft(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    send();
                  } else if (e.key === "Escape") setReplyTo(null);
                }}
                placeholder={replyTo() ? `Reply to ${replyTo()}...` : "Tell the autopilot... (try: work on #60)"}
                aria-label="Tell the autopilot"
              />
              <span class={sp.composerHints}>
                <span class={sp.keyHints}>
                  <span class={sp.keyHint}>
                    <kbd class={sp.kbd}>{"⌘⇧J"}</kbd>workspace
                  </span>
                  <Show when={calls().length}>
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
            <button type="button" class={`${sp.send} ${s.send}`} onClick={send} disabled={!draft().trim()} aria-label="Send">
              <Icon icon={ArrowUp} class={sp.sendIcon} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );

  const Workspace = () => {
    const it = watchedItem;
    const x = focusedWorker;
    return (
      <section class={`${w.card} ${s.session}`} data-driving={driving() ? "true" : "false"}>
        <div class={w.strip}>
          <Tab icon={<AgentMark agent={it().agent} size={14} />} label={`${it().num} ${it().title}`} selected close={false} />
          <span class={w.stripEnd}>
            <Show when={driving()}>
              <span class={mk.tag}>
                <Wheel state="working" size={12} />
                Autopilot driving
              </span>
            </Show>
          </span>
        </div>
        <Show when={driving()}>
          <span class={mk.hairline} aria-hidden="true" />
        </Show>
        <div class={s.transcript}>
          <div class={`${sp.mine} ${s.bubble}`}>
            Work on {it().num}: {it().title}. Autopilot contract: draft PR, ask before anything leaves the machine.
          </div>
          <div class={s.tools}>
            <For each={x() ? logs(x()!) : []}>{(l) => <div class={l.startsWith("  ") ? s.out : s.cmd}>{l.trim()}</div>}</For>
          </div>
          <Show when={x()?.status === "needs"}>
            <div class={s.waiting}>Waiting on the captain in the Cockpit.</div>
          </Show>
        </div>
        <Show
          when={driving()}
          fallback={
            <div class={`${sp.composer} ${s.composer}`} data-dense="true">
              <div class={sp.composerField}>
                <input class={`${sp.input} ${s.input}`} placeholder={`Message ${it().agent === "codex" ? "Codex" : "Claude"}...`} aria-label="Message the worker" />
              </div>
            </div>
          }
        >
          <div class={`${lb.bar} ${s.locked}`} role="status">
            <Icon icon={Lock} class={lb.lock} />
            <div class={lb.text}>
              <span class={lb.title}>The autopilot has this session</span>
              <span class={lb.now}>Now: {x()!.doing.toLowerCase()}</span>
            </div>
            <button type="button" class={`${btn.btn} ${btn.ghost} ${btn.sm} ${s.back}`} onClick={() => setView("cockpit")}>
              <span class={btn.label}>Back to autopilot</span>
            </button>
            <button type="button" class={`${btn.btn} ${btn.default} ${btn.sm}`} onClick={stopToType}>
              <span class={lb.stopGlyph} />
              <span class={btn.label}>Stop to type</span>
            </button>
            <span class={lb.progress} data-waiting={x()!.status === "needs" ? "true" : "false"} style={{ "--locked-fill": String(x()!.status === "needs" ? 1 : x()!.at / x()!.item.steps.length) }} />
          </div>
        </Show>
      </section>
    );
  };

  return (
    <div ref={root} onKeyDown={onKey}>
      <DemoWindow crumbs={view() === "cockpit" ? [] : watchedItem().place} end={<Switch />} toast={toast()} minHeight={640}>
        <Show when={view() === "cockpit"} fallback={<Workspace />}>
          <Cockpit />
        </Show>
      </DemoWindow>
    </div>
  );
}
