import { createEffect, createSignal, For, Index, onCleanup, onMount, Show, type Component } from "solid-js";
import { Dynamic } from "solid-js/web";
import ToriWindow, { type Mode } from "./ToriWindow";
import WorktreesDemo from "./docs/WorktreesDemo";
import PanesDemo from "./docs/PanesDemo";
import OmniboxDemo from "./docs/OmniboxDemo";
import ChangesDemo from "./docs/ChangesDemo";
import SpacesDemo from "./docs/SpacesDemo";
import PhoneAppDemo from "./docs/PhoneAppDemo";
import { AgentMark, type Agent } from "../app/kit";
import { SITE } from "../config";
import s from "./Trailer.module.css";

// The track is 120 BPM with the downbeat at 0: a beat every 0.5s, a bar every 2s.
// It ends at 33.8; the end card holds in silence until END.
const END = 36;
const W = 1920;
const H = 1080;

const TERM = { w: 560, h: 330 };
const WAITING = 4;
const STOPPED = 13.5;

type Worker = { agent: Agent; where: string; at: number; x: number; y: number; rot: number; lines: string[] };
const WORKERS: Worker[] = [
  { agent: "claude", where: "api", at: 0, x: 140, y: 110, rot: -3, lines: ["> fix the flaky webhook test", "* Read test/sign.test.ts", "* Edit src/webhooks/sign.ts", "  46 additions", "* Bash pnpm test webhooks", "  42 passed", "Done. The test raced the clock."] },
  { agent: "codex", where: "api/fix/rate-limit", at: 8, x: 1180, y: 90, rot: 2.5, lines: ["> cap the limiter at 100 a minute", "apply_patch src/limiter.ts", "  + if (bucket.count >= limit) {", "exec pnpm test limiter", "  18 passed", "thinking", "apply_patch src/limiter.test.ts", "exec pnpm test limiter"] },
  { agent: "gemini", where: "web/feat/search", at: 9, x: 660, y: 420, rot: -1.5, lines: ["> rank results by recency", "Searching for useQuery", "  14 matches", "WriteFile src/Results.tsx", "Shell pnpm typecheck", "  ok", "Edit src/api/search.ts", "  ok"] },
  { agent: "opencode", where: "web/dark-mode", at: 10, x: 250, y: 480, rot: 3, lines: ["> add dark mode tokens", "edit tokens.css", "edit theme.ts", "bash pnpm build", "  built in 3.2s", "edit Button.tsx", "edit Card.tsx", "read palette.json"] },
  { agent: "claude", where: "api/feat/webhooks", at: 11, x: 620, y: 150, rot: -2, lines: ["> sign outgoing webhook payloads", "* Edit test/sign.test.ts", "  52 additions", "", "Bash command", "  pnpm test webhooks", "Do you want to proceed?", "> 1. Yes", "  2. No"] },
  { agent: "copilot", where: "infra", at: 12, x: 1240, y: 450, rot: -2.5, lines: ["> bump the provider versions", "aws 5.62 -> 5.70", "Run terraform validate", "  Success!", "Run terraform plan", "  Refreshing state...", "  Plan: 0 to add, 1 to change"] },
  { agent: "claude", where: "web/feat/search", at: 12.5, x: 900, y: 250, rot: 2, lines: ["> cover search with tests", "* Read test/search.test.ts", "* Bash pnpm test search", "  31 passed", "* Edit test/search.test.ts", "  9 additions", "* Bash pnpm test search"] },
  { agent: "codex", where: "web/fix/cache", at: 13, x: 420, y: 300, rot: -4, lines: ["> fix the stale cache on logout", "read src/cache.ts", "apply_patch src/cache.ts", "exec pnpm test cache", "  11 passed", "thinking"] },
  { agent: "gemini", where: "docs", at: 13.5, x: 980, y: 530, rot: 1.5, lines: ["> document the webhook api", "ReadFile src/webhooks/sign.ts", "WriteFile docs/webhooks.md", "WriteFile docs/signing.md", "  ok"] },
];

const SLAMS: [number, string, string?][] = [
  [14, "WHICH"],
  [14.5, "ONE"],
  [15, "NEEDS"],
  [15.5, "YOU?", "#fb7185"],
];

const FULL = "0,0,1200,740";
const CARD = "280,44,920,696";
// A step pokes the mounted demo the way a visitor would, so the docs demos move without knowing about the trailer.
type Step = [number, (root: HTMLElement) => void];
const hide = (sel: string) => (root: HTMLElement) => root.querySelectorAll<HTMLElement>(sel).forEach((el) => el.style.setProperty("display", "none"));
const click = (sel: string, nth = 0) => (root: HTMLElement) => root.querySelectorAll<HTMLElement>(sel)[nth]?.click();
const press = (text: string) => (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>("button")].find((el) => el.textContent?.trim() === text)?.click();
const type = (sel: string, value: string) => (root: HTMLElement) => {
  const el = root.querySelector<HTMLInputElement | HTMLTextAreaElement>(sel);
  if (!el) return;
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, value);
  el.dispatchEvent(new InputEvent("input", { bubbles: true }));
};
const typing = (sel: string, text: string, from: number, to: number): Step[] =>
  [...text].map((_, i): Step => [from + ((to - from) * i) / text.length, type(sel, text.slice(0, i + 1))]);

type Cut = {
  at: number;
  dur: number;
  label: string;
  color: string;
  tilt: number;
  mode?: Mode;
  region?: string;
  from?: number;
  to?: number;
  demo?: Component;
  zoom?: number;
  steps?: Step[];
};
const SCREENS = 'nav[aria-label="Screens"]';
// Workspace on the left, autopilot on the right; each is its own copy of the docs phone.
const TwoPhones = () => (
  <div class={s.phones}>
    <div>
      <PhoneAppDemo />
    </div>
    <div>
      <PhoneAppDemo />
    </div>
  </div>
);
const BRANCH = '[aria-label="Filter branches, or type a new name"]';
const QUERY = '[aria-label="Search files, actions and symbols"]';
const CUTS: Cut[] = [
  { at: 16, dur: 2, label: "STATUS", color: "#fb7185", tilt: -5, mode: "loop", region: FULL, from: 9.6, to: 13.8 },
  { at: 18, dur: 2, label: "UNDO", color: "#f3d3a4", tilt: 4, mode: "undo", region: CARD, from: 4.6, to: 8.6 },
  { at: 20, dur: 2, label: "PULL REQUEST", color: "#c084fc", tilt: -4, mode: "pr", region: CARD, from: 0.6, to: 7 },
  { at: 22, dur: 2, label: "REVIEW", color: "#2dd4bf", tilt: 4, mode: "review", region: CARD, from: 4, to: 9.6 },
  {
    at: 24,
    dur: 1,
    label: "WORKTREES",
    color: "#f3d3a4",
    tilt: -4,
    demo: WorktreesDemo,
    steps: [[0.15, click('[aria-label="Add worktree"]')], ...typing(BRANCH, "feat/retry", 0.35, 0.85)],
  },
  {
    at: 25,
    dur: 1,
    label: "PANES",
    color: "#fb7185",
    tilt: 5,
    demo: PanesDemo,
    steps: [
      [0.2, click('[aria-label="New terminal"]')],
      [0.45, click('[aria-label="New chat"]')],
      [0.7, click('[aria-label="Open a file"]')],
    ],
  },
  { at: 26, dur: 1, label: "SEARCH", color: "#2dd4bf", tilt: -5, demo: OmniboxDemo, steps: typing(QUERY, "rank", 0.15, 0.6) },
  {
    at: 27,
    dur: 1,
    label: "CHANGES",
    color: "#c084fc",
    tilt: 4,
    demo: ChangesDemo,
    steps: [
      [0.15, click('[aria-label="Stage server.ts"]')],
      [0.3, press("AI Draft")],
    ],
  },
  {
    at: 28,
    dur: 1,
    label: "SPACES",
    color: "#f3d3a4",
    tilt: -4,
    demo: SpacesDemo,
    steps: [
      [0.3, click('[aria-label^="Switch to"]', 1)],
      [0.65, click('[aria-label^="Switch to"]', 2)],
    ],
  },
  { at: 29, dur: 1, label: "AUTOPILOT", color: "#c084fc", tilt: 5, mode: "cockpit", region: FULL, from: 9.5, to: 11.5 },
  {
    at: 30,
    dur: 2,
    label: "MOBILE APP",
    color: "#2dd4bf",
    tilt: -4,
    demo: TwoPhones,
    zoom: 1.32,
    steps: [
      [-0.5, hide(SCREENS)],
      [-0.4, click(`${SCREENS} button`, 8)],
      [0.5, click(`${SCREENS} button`, 1)],
      [1, press("Approve")],
    ],
  },
];

// Trailer seconds to minutes of the day.
const CLOCK: [number, number][] = [
  [0, 540],
  [8, 560],
  [12, 750],
  [STOPPED, 860],
  [16, 907],
];

const clamp = (x: number) => Math.min(1, Math.max(0, x));
const ease = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
const back = (x: number) => {
  const c = clamp(x) - 1;
  return 1 + 2.7 * c * c * c + 1.7 * c * c;
};
const inOut = (x: number) => {
  const c = clamp(x);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
};
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const along = (keys: [number, number][], now: number) => {
  if (now <= keys[0]![0]) return keys[0]![1];
  for (let i = 1; i < keys.length; i++) {
    const [a, va] = keys[i - 1]!;
    const [b, vb] = keys[i]!;
    if (now < b) return lerp(va, vb, (now - a) / (b - a));
  }
  return keys[keys.length - 1]![1];
};
const pulse = (now: number, every = 0.5, sharp = 6) => Math.exp(-(now % every) * sharp);
const slam = (now: number, at: number, from = 1.7) => {
  const p = ease((now - at) / 0.16);
  return { opacity: p, scale: lerp(from, 1, p) };
};
const linesOf = (i: number, now: number) => {
  const wk = WORKERS[i]!;
  if (i > 0) return wk.lines.slice(0, Math.floor((now - wk.at) * 2.5) + 1);
  const typed = wk.lines[0]!.slice(0, 2 + Math.max(0, Math.floor((now - 0.5) * 16)));
  return [typed, ...wk.lines.slice(1, now < 2.5 ? 1 : 2 + Math.floor((now - 2.5) * 2))];
};
const kindOf = (line: string) =>
  /^[>$]/.test(line) ? "cmd" : /passed|ok$|Success|built/.test(line) ? "good" : /proceed|Bash command/.test(line) ? "ask" : "";

function DemoShot(props: { cut: Cut; now: number }) {
  let root!: HTMLDivElement;
  const fired = new Set<number>();
  createEffect(() => {
    const t = props.now - props.cut.at;
    props.cut.steps?.forEach(([at, run], i) => {
      if (t < at || fired.has(i)) return;
      fired.add(i);
      run(root);
    });
  });
  return (
    <div ref={root} class={s.demo} style={props.cut.zoom ? { zoom: props.cut.zoom, "max-height": "none", width: "960px", "box-shadow": "none" } : undefined}>
      <Dynamic component={props.cut.demo} />
    </div>
  );
}

export default function Trailer() {
  const query = new URLSearchParams(location.search);
  const capture = query.has("capture");
  const [now, setNow] = createSignal(Number(query.get("t")) || 0);
  const [playing, setPlaying] = createSignal(false);
  const [fit, setFit] = createSignal(1);
  const audio = new Audio();
  let raf = 0;
  let anchorAt = 0;
  let anchorNow = 0;

  const anchor = (x: number) => {
    anchorNow = x;
    anchorAt = performance.now();
  };
  const frame = () => {
    let x = anchorNow + (performance.now() - anchorAt) / 1000;
    if (!audio.paused && !audio.ended && Math.abs(audio.currentTime - x) > 0.06) {
      x = audio.currentTime;
      anchor(x);
    }
    if (x >= END) {
      setNow(END);
      setPlaying(false);
      return;
    }
    setNow(x);
    raf = requestAnimationFrame(frame);
  };
  const play = () => {
    const x = now() >= END ? 0 : now();
    audio.currentTime = Math.min(x, audio.duration || 0);
    if (x < (audio.duration || 0)) void audio.play();
    anchor(x);
    setPlaying(true);
    raf = requestAnimationFrame(frame);
  };
  const pause = () => {
    cancelAnimationFrame(raf);
    audio.pause();
    setPlaying(false);
  };
  const seek = (x: number) => {
    const was = playing();
    pause();
    setNow(Math.max(0, Math.min(END, x)));
    if (was) play();
  };

  onMount(() => {
    const resize = () => setFit(Math.min(innerWidth / W, innerHeight / H));
    const key = (e: KeyboardEvent) => {
      if (e.code === "Space") playing() ? pause() : play();
      else if (e.key === "r") seek(0);
      else if (e.key === "ArrowRight") seek(Math.floor(now() / 2) * 2 + 2);
      else if (e.key === "ArrowLeft") seek(Math.ceil(now() / 2) * 2 - 2);
      else return;
      e.preventDefault();
    };
    resize();
    addEventListener("resize", resize);
    if (capture) (window as unknown as { __trailer: object }).__trailer = { seek: setNow, end: END };
    else {
      addEventListener("keydown", key);
      // Dev only, so a production build never bundles the track.
      if (import.meta.env.DEV) void import("../assets/trailer/built-to-beat-34s.m4a?url").then((m) => (audio.src = m.default));
    }
    onCleanup(() => {
      pause();
      removeEventListener("resize", resize);
      removeEventListener("keydown", key);
    });
  });

  const count = () => WORKERS.filter((wk) => now() >= wk.at).length;
  const clock = () => {
    const m = Math.floor(along(CLOCK, now()));
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  };
  const waited = () => Math.max(1, Math.floor(along(CLOCK, now()) - 860));
  const cutNow = () => CUTS.find((c) => now() >= c.at && now() < c.at + c.dur);
  const camera = () => {
    const t = now();
    const riser = t >= 14 && t < 16 ? ((t - 14) / 2) ** 2 : 0;
    const cut = cutNow();
    const punch = cut ? Math.exp(-(t - cut.at) * 9) + (t - cut.at >= 1 ? 0.5 * Math.exp(-((t - cut.at) % 1) * 9) : 0) : 0;
    const amp = riser * 16 + (t >= 16 && t < 16.5 ? 22 * Math.exp(-(t - 16) * 9) : 0);
    return `translate(${amp * Math.sin(t * 61)}px, ${amp * Math.cos(t * 53)}px) scale(${1 + riser * 0.14 + punch * 0.03})`;
  };
  const soft = () => {
    const t = now();
    const beat = 0.05 * pulse(t);
    if (t >= 32) return `rgba(217,164,104,${0.2 + beat})`;
    if (t >= 16) return `${cutNow()!.color}30`;
    if (t >= 14) return `rgba(251,113,133,${0.1 + 0.25 * clamp((t - 14) / 2)})`;
    return `rgba(217,164,104,${0.08 + beat})`;
  };

  const Card = (props: { i: number }) => {
    const wk = WORKERS[props.i]!;
    const i = props.i;
    const box = () => {
      const t = now();
      const born = ease((t - wk.at) / 0.3);
      const settle = i === 0 ? back((t - 8) / 0.28) : 1;
      const shake = t < 16 ? 14 * clamp((t - 14) / 2) ** 2 : 0;
      const gone = ease((t - 16) / 0.25);
      const px = lerp(680, wk.x, settle) + shake * Math.sin(t * 47 + i * 2.1);
      const py = lerp(300, wk.y, settle) + shake * Math.cos(t * 53 + i * 1.3);
      const dim = i !== WAITING && t >= 14 ? lerp(1, 0.45, clamp((t - 14) / 0.5)) : 1;
      const thump = t >= 8 && t < 14 ? 0.02 * pulse(t) : 0;
      return {
        left: `${lerp(px, 680, gone)}px`,
        top: `${lerp(py, 375, gone)}px`,
        opacity: born * (1 - gone),
        filter: dim < 1 ? `brightness(${dim})` : "none",
        transform: `rotate(${wk.rot * settle}deg) scale(${(lerp(1.6, 1, settle) * lerp(0.8, 1, back((t - wk.at) / 0.3)) + thump) * lerp(1, 0.2, gone)})`,
        "z-index": i,
      };
    };
    return (
      <div class={s.card} data-alarm={i === WAITING && now() >= 14 ? "true" : "false"} style={box()}>
        <div class={s.bar}>
          <i />
          <i />
          <i />
          <AgentMark agent={wk.agent} size={15} />
          <span>
            {wk.agent} {"\u00b7"} {wk.where}
          </span>
        </div>
        <div class={s.body}>
          <Index each={linesOf(i, now()).slice(-9)}>{(line) => <div data-kind={kindOf(line())}>{line() || "\u00a0"}</div>}</Index>
        </div>
        <Show when={i === WAITING && now() >= 14}>
          <span class={s.badge} style={{ scale: back((now() - 14) / 0.3) + 0.12 * pulse(now()) }}>
            waiting {waited()}m
          </span>
        </Show>
      </div>
    );
  };

  return (
    <div class={s.screen} data-playing={playing() ? "true" : "false"}>
      <div class={s.stage} style={{ transform: `translate(-50%, -50%) scale(${fit()})` }}>
        <div class={s.glow} style={{ "--soft": soft() }} />
        <div class={s.dots} style={{ opacity: 0.6 + 0.4 * pulse(now()) }} />

        <div class={s.cam} style={{ transform: camera() }}>
          <Show when={now() < 16.3}>
            <div class={s.day}>
              <div class={s.top} style={{ opacity: 1 - clamp((now() - 15.8) / 0.2) }}>
                <span>{clock()}</span>
                <span>
                  {count()} {count() === 1 ? "agent" : "agents"}
                </span>
              </div>
              <For each={WORKERS}>
                {(wk, i) => (
                  <Show when={now() >= wk.at}>
                    <Card i={i()} />
                  </Show>
                )}
              </For>
              <For each={SLAMS}>
                {([at, text, color]) => (
                  <Show when={now() >= at && now() < at + 0.5}>
                    <span class={s.word} style={{ color, ...slam(now(), at) }}>
                      {text}
                    </span>
                  </Show>
                )}
              </For>
            </div>
          </Show>

          <For each={CUTS}>
            {(cut) => {
              const on = () => now() >= cut.at && now() < cut.at + cut.dur;
              const p = () => (now() - cut.at) / cut.dur;
              const [, , rw, rh] = (cut.region ?? FULL).split(",").map(Number);
              return (
                <div class={s.cut} style={{ visibility: on() ? "visible" : "hidden" }}>
                  <div class={s.app} data-demo={cut.demo ? "true" : "false"} style={{ transform: `scale(${lerp(0.92, 1, back((now() - cut.at) / 0.25))})` }}>
                    <Show
                      when={cut.demo}
                      fallback={
                        <div style={{ width: `${rw}px`, zoom: 940 / rh! }}>
                          <ToriWindow
                            mode={cut.mode}
                            region={cut.region}
                            maxScale={1}
                            onStormHover={false}
                            time={on() ? Math.round(lerp(cut.from!, cut.to!, p()) * 20) / 20 : cut.from}
                          />
                        </div>
                      }
                    >
                      <Show when={now() >= cut.at - 0.5 && now() < cut.at + cut.dur}>
                        <DemoShot cut={cut} now={now()} />
                      </Show>
                    </Show>
                  </div>
                  <span
                    class={s.sticker}
                    data-side={cut.tilt < 0 ? "left" : "right"}
                    style={{ background: cut.color, rotate: `${cut.tilt}deg`, scale: back((now() - cut.at - 0.08) / 0.22) }}
                  >
                    {cut.label}
                  </span>
                </div>
              );
            }}
          </For>

          <Show when={now() >= 32}>
            <div class={s.end} style={{ scale: lerp(1.25, 1, back((now() - 32) / 0.4)) }}>
              <div class={s.brand}>
                <img src="/app-icon.png" alt="" />
                <span>Tori</span>
              </div>
              <p class={s.tagline} style={slam(now(), 32.5, 1.2)}>
                A cockpit for the coding agents you <span class="accent-word">already run.</span>
              </p>
              <code class={s.brew} style={slam(now(), 33, 1.2)}>
                <i>$</i>
                {SITE.brew}
              </code>
            </div>
          </Show>
        </div>

        <For each={[...CUTS.map((c) => c.at), 32]}>
          {(at) => (
            <Show when={now() >= at && now() < at + 0.5}>
              <div class={s.flash} style={{ opacity: (1 - ease((now() - at) / 0.5)) * (at === 16 || at === 32 ? 0.55 : 0.16) }} />
            </Show>
          )}
        </For>
      </div>

      <Show when={!capture && !playing()}>
        <div class={s.hud}>
          <b>{now().toFixed(1)}s</b>
          Space to play, R to restart, arrows to move a bar
        </div>
      </Show>
    </div>
  );
}
