import { createSignal, For, onCleanup, onMount, Show, type JSX } from "solid-js";
import { AppWindow, ArrowUpFromLine, Check, ChevronRight, GitBranch, Lock, Package, Server, Tags, type IconNode } from "lucide";
import "../app/css/tokens.css";
import { AgentMark, Icon } from "../app/kit";
import { WorktreeMark } from "../app/gitMarks";
import sp from "./Spaces.module.css";
import s from "./Topics.module.css";

type Kind = "worktree" | "reference";
type Member = { name: string; icon: IconNode; hue: string; behind: number };

const MEMBERS: Member[] = [
  { name: "api", icon: Server, hue: "96 165 250", behind: 0 },
  { name: "web", icon: AppWindow, hue: "192 132 252", behind: 0 },
  { name: "sdk", icon: Package, hue: "52 211 153", behind: 2 },
];

// The diagram is drawn at a fixed size and scaled to fit, so the rails and the
// cards they meet never drift apart. Narrow screens stack it instead, since the
// wide one would scale down past reading.
type Geo = { w: number; h: number; hub: { left: number; top: number }; card: (i: number) => { left: number; top: number }; rail: (i: number) => string };
const WIDE: Geo = {
  w: 640,
  h: 430,
  hub: { left: 24, top: 153 },
  card: (i) => ({ left: 352, top: [22, 160, 298][i] }),
  rail: (i) => {
    const y = [22, 160, 298][i] + 55;
    return `M214 215 C 288 215, 278 ${y}, 352 ${y}`;
  },
};
const TALL: Geo = {
  w: 330,
  h: 540,
  hub: { left: 0, top: 0 },
  card: (i) => ({ left: 62, top: 160 + i * 128 }),
  rail: (i) => {
    const y = 160 + i * 128 + 55;
    return `M30 124 L30 ${y - 22} Q30 ${y} 52 ${y} L62 ${y}`;
  },
};

const LOOP = 16;
const STILL = 11.5;

const PULSES: [number, number][] = [
  [1, 0],
  [2.2, 1],
  [3.6, 2],
  [7.6, 2],
  [9.8, 0],
  [9.8, 1],
  [9.8, 2],
];

export default function Topics() {
  let root!: HTMLDivElement;
  let fit!: HTMLDivElement;
  const [t, setT] = createSignal(0);
  const [cw, setCw] = createSignal(WIDE.w);
  const geo = () => (cw() < 520 ? TALL : WIDE);
  const scale = () => Math.min(1.2, cw() / geo().w);
  const [manual, setManual] = createSignal<Partial<Record<number, Kind>>>({});
  const [held, setHeld] = createSignal(false);

  onMount(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) setT(STILL);
    let visible = false;
    const io = new IntersectionObserver((e) => (visible = e[0].isIntersecting));
    io.observe(root);
    const ro = new ResizeObserver((e) => setCw(e[0].contentRect.width || WIDE.w));
    ro.observe(fit);
    const id = setInterval(() => {
      if (reduced || held() || !visible || document.hidden) return;
      setT((x) => (x + 0.1 >= LOOP ? 0 : x + 0.1));
    }, 100);
    onCleanup(() => {
      clearInterval(id);
      io.disconnect();
      ro.disconnect();
    });
  });

  const at = (a: number, b = Infinity) => t() >= a && t() < b;
  const promoted = () => t() >= 6.6;
  const committed = () => t() >= 10.4;
  const kind = (i: number): Kind => manual()[i] ?? (i === 2 && !promoted() ? "reference" : "worktree");
  const setKind = (i: number, k: Kind) => {
    setHeld(true);
    setManual((m) => ({ ...m, [i]: k }));
  };
  const touched = (i: number) => PULSES.some(([at0, m]) => m === i && t() >= at0 && t() < at0 + 1.4);
  const diff = (i: number) => {
    if (committed()) return null;
    const edits: [number, string][] = [
      [1, "+46"],
      [2.2, "+18 -2"],
      [7.6, "+12 -3"],
    ];
    return t() >= edits[i][0] ? edits[i][1] : null;
  };

  const Chip = (p: { i: number }) => (
    <span class={s.chip} style={{ "--m": MEMBERS[p.i].hue }}>
      <Icon icon={MEMBERS[p.i].icon} size={11} strokeWidth={2} />
    </span>
  );

  const Tool = (p: { i: number; verb: string; path: string; add?: string; class?: string }) => (
    <div class={`${s.tool} ${p.class ?? ""}`}>
      <Chip i={p.i} />
      <span class={s.verb} data-edit={p.verb === "Edit" ? "true" : "false"}>
        {p.verb}
      </span>
      <span class={s.path}>
        <i>{MEMBERS[p.i].name}/</i>
        {p.path}
      </span>
      <Show when={p.add}>
        <span class={s.add}>{p.add}</span>
      </Show>
    </div>
  );

  const Card = (p: { i: number }) => {
    const m = MEMBERS[p.i];
    const ref = () => kind(p.i) === "reference";
    return (
      <div
        class={s.card}
        data-kind={kind(p.i)}
        data-hot={touched(p.i) ? "true" : "false"}
        style={{ "--m": m.hue, left: `${geo().card(p.i).left}px`, top: `${geo().card(p.i).top}px` }}
      >
        <div class={s.cardTop}>
          <span class={s.glyph}>
            <Icon icon={m.icon} size={15} />
          </span>
          <b>{m.name}</b>
          <span class={s.state}>
            <Show when={ref()} fallback={<WorktreeMark active={touched(p.i)} />}>
              <Icon icon={Lock} size={12} />
            </Show>
          </span>
        </div>
        <div class={s.toggle} role="group" aria-label={`${m.name} joins as`}>
          <button type="button" aria-pressed={ref()} onClick={() => setKind(p.i, "reference")}>
            Reference
          </button>
          <button type="button" aria-pressed={!ref()} onClick={() => setKind(p.i, "worktree")}>
            Worktree
          </button>
        </div>
        <div class={s.meta}>
          <Show
            when={!ref()}
            fallback={
              <>
                <span>main</span>
                <span class={s.dot} />
                <span>{m.behind ? `${m.behind} behind` : "up to date"}</span>
                <span class={s.dot} />
                <span>read only</span>
              </>
            }
          >
            <Icon icon={GitBranch} size={11} />
            <span>webhooks</span>
            <span class={s.grow} />
            <Show when={committed()} fallback={<span class={s.add}>{diff(p.i) ?? "clean"}</span>}>
              <span class={s.ahead}>
                <Icon icon={ArrowUpFromLine} size={10} />1
              </span>
            </Show>
          </Show>
        </div>
      </div>
    );
  };

  const Note = (p: { children: JSX.Element; class?: string }) => (
    <div class={`${s.note} ${p.class ?? ""}`}>
      <img src="/app-icon.png" alt="" />
      <span>{p.children}</span>
    </div>
  );

  return (
    <div ref={root} class={sp.wrap} style={{ "--hue": "217 164 104" }}>
      <div class={sp.head}>
        <h2 class={sp.h2}>
          One branch.
          <br />
          <span class={sp.accent}>Every repo.</span>
        </h2>
        <div class={sp.headRight}>
          <p>
            A change that spans an API, its app and its SDK is one Topic: one branch name across the repos you pick, opened as one workspace with one search and one chat that sees
            all of them.
          </p>
        </div>
      </div>

      <div class={s.stage}>
        <div class={`${sp.panel} ${s.mapPanel}`}>
          <div class={s.crumbs}>
            <Icon icon={Tags} size={13} />
            Topics
            <Icon icon={ChevronRight} size={12} />
            <b>webhooks</b>
          </div>
          <div ref={fit} class={s.fit} style={{ height: `${Math.round(geo().h * scale())}px` }}>
            <div class={s.map} style={{ width: `${geo().w}px`, height: `${geo().h}px`, transform: `scale(${scale()})` }}>
              <svg class={s.rails} viewBox={`0 0 ${geo().w} ${geo().h}`} fill="none" aria-hidden="true">
                <For each={MEMBERS}>
                  {(_, i) => (
                    <>
                      <path d={geo().rail(i())} class={s.railBase} data-kind={kind(i())} />
                      <Show when={kind(i()) === "worktree"}>
                        <path d={geo().rail(i())} class={s.railLive} style={{ "--m": MEMBERS[i()].hue }} />
                      </Show>
                    </>
                  )}
                </For>
              </svg>
              <For each={PULSES}>
                {([at0, i]) => (
                  <Show when={at(at0, at0 + 1)}>
                    <span
                      class={s.pulse}
                      data-read={kind(i) === "reference" ? "true" : "false"}
                      style={{ "--m": MEMBERS[i].hue, "offset-path": `path("${geo().rail(i)}")` }}
                    />
                  </Show>
                )}
              </For>

              <div class={s.hub} style={{ left: `${geo().hub.left}px`, top: `${geo().hub.top}px` }}>
                <div class={s.hubTop}>
                  <span class={s.hubIcon}>
                    <Icon icon={Tags} size={16} />
                  </span>
                  <div>
                    <b>webhooks</b>
                    <small>Topic {"\u00b7"} 3 repos</small>
                  </div>
                </div>
                <div class={s.hubChips}>
                  <For each={MEMBERS}>{(_, i) => <Chip i={i()} />}</For>
                  <span class={s.hubStatus} data-tone={at(5, 6.6) ? "need" : at(0.6, 9.4) ? "work" : "idle"} />
                </div>
              </div>

              <For each={MEMBERS}>{(_, i) => <Card i={i()} />}</For>
            </div>
          </div>
          <div class={s.legend}>
            <span>
              <i data-kind="worktree" />
              Worktree: its own branch, writable
            </span>
            <span>
              <i data-kind="reference" />
              Reference: read only, no branch made
            </span>
          </div>
        </div>

        <div class={`${sp.panel} ${s.chatPanel}`}>
          <div class={s.chat}>
            <div class={s.chatHead}>
              <AgentMark agent="claude" size={14} breathe={at(0.6, 9.4) && !at(5, 6.6)} class={s.claude} />
              <span class={s.chatTitle}>Sign and verify payloads</span>
              <span class={s.grow} />
              <For each={MEMBERS}>{(_, i) => <Chip i={i()} />}</For>
            </div>
            <div class={s.transcript}>
              <Note>Topic webhooks: api and web are worktrees, sdk is a reference.</Note>
              <div class={s.user}>Sign outgoing webhook payloads, and verify them in the SDK.</div>
              <Show when={t() >= 1}>
                <Tool class={s.in} i={0} verb="Edit" path="src/webhooks/sign.ts" add="+46" />
              </Show>
              <Show when={t() >= 2.2}>
                <Tool class={s.in} i={1} verb="Edit" path="src/settings/Webhooks.tsx" add="+18 -2" />
              </Show>
              <Show when={t() >= 3.6}>
                <Tool class={s.in} i={2} verb="Read" path="src/verify.ts" />
              </Show>
              <Show when={at(5, 6.9)}>
                <div class={`${s.ask} ${s.in}`}>
                  <div>
                    <b>Claude needs to change sdk.</b> It is a reference, so nothing there can be written. Create a worktree on webhooks?
                  </div>
                  <div class={s.btns}>
                    <span class={s.btn}>Not now</span>
                    <span class={s.btnPrimary} data-down={at(6.4, 6.7) ? "true" : "false"}>
                      Create it
                    </span>
                  </div>
                </div>
              </Show>
              <Show when={t() >= 6.9}>
                <Note class={s.in}>sdk is a worktree now, on webhooks.</Note>
              </Show>
              <Show when={t() >= 7.6}>
                <Tool class={s.in} i={2} verb="Edit" path="src/verify.ts" add="+12 -3" />
              </Show>
              <Show when={t() >= 8.6}>
                <div class={`${s.commit} ${s.in}`}>
                  <div class={s.commitMsg}>Sign and verify webhook payloads</div>
                  <div class={s.commitRow}>
                    <For each={MEMBERS}>
                      {(m) => (
                        <span class={s.commitChip} style={{ "--m": m.hue }}>
                          <Icon icon={Check} size={11} strokeWidth={2.4} />
                          {m.name}
                        </span>
                      )}
                    </For>
                    <span class={s.grow} />
                    <span class={s.commitBtn} data-done={committed() ? "true" : "false"} data-down={at(10, 10.4) ? "true" : "false"}>
                      {committed() ? "Committed to 3 repos" : "Commit"}
                    </span>
                  </div>
                </div>
              </Show>
              <Show when={t() >= 11}>
                <Note class={s.in}>One checkpoint covers api, web and sdk. Rewind checks all three before it writes.</Note>
              </Show>
            </div>
          </div>
        </div>
      </div>

      <div class={sp.beats}>
        <div>
          <b>Reference or worktree</b>
          <p>A repo you only read joins as a reference: no branch, nothing checked out, never staged or pushed. Promote it when the work reaches it.</p>
        </div>
        <div>
          <b>One workspace</b>
          <p>Search covers every member at once. Changes and Pull requests switch between them, and one commit message can go out to all of them.</p>
        </div>
        <div>
          <b>One snapshot across repos</b>
          <p>A checkpoint from a Topic chat covers every worktree, and a rewind checks them all before it changes any of them.</p>
        </div>
      </div>
      <a class={sp.more} href="/docs/workspace/topics/">
        How Topics work {"->"}
      </a>
    </div>
  );
}
