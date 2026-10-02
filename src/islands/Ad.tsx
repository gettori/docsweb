import { createSignal, For, Index, onCleanup, onMount, Show } from "solid-js";
import ToriWindow from "./ToriWindow";
import { AgentMark, type Agent } from "../app/kit";
import { SITE } from "../config";
import s from "./Trailer.module.css";

const W = 1920;
const H = 1080;
const ASK = 2.6;
const APP = 4.6;
const OUTRO = 10.8;
const END = 13.5;
const WAITING = 4;

type Worker = { agent: Agent; where: string; x: number; y: number; rot: number; lines: string[] };
const WORKERS: Worker[] = [
  { agent: "claude", where: "api", x: 140, y: 110, rot: -3, lines: ["> fix the flaky webhook test", "* Read test/sign.test.ts", "* Edit src/webhooks/sign.ts", "  46 additions", "* Bash pnpm test webhooks", "  42 passed"] },
  { agent: "opencode", where: "api/fix/rate-limit", x: 1180, y: 90, rot: 2.5, lines: ["> cap the limiter at 100 a minute", "edit src/limiter.ts", "bash pnpm test limiter", "  18 passed", "edit src/limiter.test.ts"] },
  { agent: "gemini", where: "web/feat/search", x: 660, y: 420, rot: -1.5, lines: ["> rank results by recency", "Searching for useQuery", "  14 matches", "WriteFile src/Results.tsx", "Shell pnpm typecheck", "  ok"] },
  { agent: "opencode", where: "web/dark-mode", x: 250, y: 480, rot: 3, lines: ["> add dark mode tokens", "edit tokens.css", "edit theme.ts", "bash pnpm build", "  built in 3.2s", "edit Button.tsx"] },
  { agent: "claude", where: "api/feat/webhooks", x: 620, y: 150, rot: -2, lines: ["> sign outgoing webhook payloads", "* Edit test/sign.test.ts", "  52 additions", "", "Bash command", "  pnpm test webhooks", "Do you want to proceed?", "> 1. Yes", "  2. No"] },
  { agent: "gemini", where: "infra", x: 1240, y: 450, rot: -2.5, lines: ["> bump the provider versions", "aws 5.62 -> 5.70", "Shell terraform validate", "  Success!", "Shell terraform plan", "  Plan: 0 to add, 1 to change"] },
  { agent: "claude", where: "web/feat/search", x: 900, y: 250, rot: 2, lines: ["> cover search with tests", "* Read test/search.test.ts", "* Bash pnpm test search", "  31 passed", "* Edit test/search.test.ts", "  9 additions"] },
  { agent: "opencode", where: "web/fix/cache", x: 420, y: 300, rot: -4, lines: ["> fix the stale cache on logout", "read src/cache.ts", "edit src/cache.ts", "bash pnpm test cache", "  11 passed"] },
  { agent: "claude", where: "docs", x: 980, y: 530, rot: 1.5, lines: ["> document the webhook api", "* Read src/webhooks/sign.ts", "* Write docs/webhooks.md", "* Write docs/signing.md"] },
];
const bornAt = (i: number) => (i === WAITING ? 0.15 : 0.15 + (i < WAITING ? i + 1 : i) * 0.26);

const CAPTIONS: [number, string, string, string][] = [
  [0, "Nine agents ", "running.", "var(--strong)"],
  [ASK, "Which one ", "needs you?", "#fb7185"],
  [APP, "Tori ", "knows.", "var(--accent-text)"],
  [7.7, "Jump in. Approve. ", "Move on.", "#2dd4bf"],
];

const AURORA: [string, number, number, number][] = [
  ["217,164,104", 0.3, 0.35, 0.9],
  ["192,132,252", 0.7, 0.3, 1.1],
  ["251,113,133", 0.55, 0.62, 0.7],
  ["45,212,191", 0.2, 0.7, 0.8],
  ["192,132,252", 0.85, 0.75, 0.6],
];

const clamp = (x: number) => Math.min(1, Math.max(0, x));
const ease = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
const back = (x: number) => {
  const c = clamp(x) - 1;
  return 1 + 2.7 * c * c * c + 1.7 * c * c;
};
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const pulse = (now: number) => Math.exp(-(now % 0.5) * 6);
const kindOf = (line: string) =>
  /^[>$]/.test(line) ? "cmd" : /passed|ok$|Success|built/.test(line) ? "good" : /proceed|Bash command/.test(line) ? "ask" : "";

export default function Ad() {
  const query = new URLSearchParams(location.search);
  const capture = query.has("capture");
  const [now, setNow] = createSignal(Number(query.get("t")) || 0);
  const [fit, setFit] = createSignal(1);
  let raf = 0;

  onMount(() => {
    const resize = () => setFit(Math.min(innerWidth / W, innerHeight / H));
    resize();
    addEventListener("resize", resize);
    if (capture) (window as unknown as { __trailer: object }).__trailer = { seek: setNow, end: END };
    else {
      const start = performance.now() - now() * 1000;
      const frame = () => {
        setNow(((performance.now() - start) / 1000) % END);
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    }
    onCleanup(() => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", resize);
    });
  });

  const caption = () => CAPTIONS.findLast(([at]) => now() >= at)!;
  const soft = () => {
    const t = now();
    if (t >= OUTRO) return "rgba(217,164,104,.2)";
    if (t >= APP) return "transparent";
    if (t >= ASK) return `rgba(251,113,133,${0.1 + 0.2 * clamp((t - ASK) / 1.5)})`;
    return "rgba(217,164,104,.18)";
  };

  const Card = (props: { i: number }) => {
    const wk = WORKERS[props.i]!;
    const i = props.i;
    const at = bornAt(i);
    const box = () => {
      const t = now();
      const shake = t >= ASK && t < APP ? 9 * clamp((t - ASK) / 2) ** 2 : 0;
      const gone = ease((t - APP) / 0.25);
      const dim = i !== WAITING && t >= ASK ? lerp(1, 0.42, clamp((t - ASK) / 0.4)) : 1;
      return {
        left: `${lerp(wk.x + shake * Math.sin(t * 47 + i * 2.1), 680, gone)}px`,
        top: `${lerp(wk.y + shake * Math.cos(t * 53 + i * 1.3), 375, gone)}px`,
        opacity: ease((t - at) / 0.2) * (1 - gone),
        filter: dim < 1 ? `brightness(${dim})` : "none",
        transform: `rotate(${wk.rot}deg) scale(${lerp(0.8, 1, back((t - at) / 0.3)) * lerp(1, 0.2, gone)})`,
        "z-index": i === WAITING && t >= ASK ? 20 : i,
      };
    };
    return (
      <div class={s.card} data-alarm={i === WAITING && now() >= ASK ? "true" : "false"} style={box()}>
        <div class={s.bar}>
          <i />
          <i />
          <i />
          <AgentMark agent={wk.agent} size={15} />
          <span>
            {wk.agent} {"·"} {wk.where}
          </span>
        </div>
        <div class={s.body}>
          <Index each={wk.lines.slice(0, Math.floor((now() - at) * 5) + 1)}>{(line) => <div data-kind={kindOf(line())}>{line() || " "}</div>}</Index>
        </div>
        <Show when={i === WAITING && now() >= ASK}>
          <span class={s.badge} style={{ scale: back((now() - ASK) / 0.3) + 0.12 * pulse(now()) }}>
            waiting 47m
          </span>
        </Show>
      </div>
    );
  };

  return (
    <div class={s.screen}>
      <div class={s.stage} style={{ transform: `translate(-50%, -50%) scale(${fit()})` }}>
        <Show when={now() >= APP}>
          <div class={s.aurora} style={{ opacity: 0.9 * ease((now() - APP) / 0.35) }}>
            <For each={AURORA}>
              {([color, bx, by, speed], i) => {
                const t = () => (now() - APP) * 3;
                const rad = () => W * (0.28 + 0.05 * Math.sin(t() * 0.2 + i()));
                return (
                  <i
                    style={{
                      left: `${(bx + Math.sin(t() * 0.13 * speed + i() * 1.7) * 0.12) * W - rad()}px`,
                      top: `${(by + Math.cos(t() * 0.11 * speed + i()) * 0.1) * H * 0.8 - rad()}px`,
                      width: `${rad() * 2}px`,
                      height: `${rad() * 2}px`,
                      background: `radial-gradient(closest-side, rgba(${color},.34), rgba(${color},0))`,
                    }}
                  />
                );
              }}
            </For>
          </div>
          <div class={s.grain} />
        </Show>
        <div class={s.glow} style={{ "--soft": soft() }} />
        <div class={s.dots} />

        <Show when={now() < APP + 0.3}>
          <div class={s.day} style={{ left: "134px", top: "176px", right: "auto", bottom: "auto", width: `${W}px`, height: `${H}px`, "transform-origin": "0 0", transform: "scale(.86)" }}>
            <For each={WORKERS}>
              {(_, i) => (
                <Show when={now() >= bornAt(i())}>
                  <Card i={i()} />
                </Show>
              )}
            </For>
          </div>
        </Show>

        <div class={s.cut} style={{ visibility: now() >= APP && now() < OUTRO ? "visible" : "hidden" }}>
          <div class={s.app} style={{ top: "206px", transform: `scale(${lerp(0.92, 1, back((now() - APP) / 0.25))})` }}>
            <div style={{ width: "1200px", zoom: 1.12 }}>
              <ToriWindow mode="loop" maxScale={1} onStormHover={false} time={Math.round(lerp(7.4, 14, clamp((now() - APP) / (OUTRO - APP))) * 20) / 20} />
            </div>
          </div>
        </div>

        <Show when={now() < OUTRO}>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "44px",
              "text-align": "center",
              "font-size": "108px",
              "line-height": 1.1,
              "font-weight": 800,
              "letter-spacing": "-0.05em",
              "white-space": "nowrap",
              color: "var(--strong)",
              "text-shadow": "0 0 60px var(--page), 0 0 24px var(--page)",
              opacity: ease((now() - caption()[0]) / 0.16),
              scale: lerp(1.25, 1, ease((now() - caption()[0]) / 0.16)),
            }}
          >
            {caption()[1]}
            <span style={{ color: caption()[3] }}>{caption()[2]}</span>
          </div>
        </Show>

        <Show when={now() >= OUTRO}>
          <div class={s.end} style={{ scale: lerp(1.25, 1, back((now() - OUTRO) / 0.4)) }}>
            <div class={s.brand}>
              <img src="/app-icon.png" alt="" />
              <span>Tori</span>
            </div>
            <p class={s.tagline} style={{ opacity: ease((now() - OUTRO - 0.4) / 0.2) }}>
              A cockpit for the coding agents you <span class="accent-word">already run.</span>
            </p>
            <code class={s.brew} style={{ opacity: ease((now() - OUTRO - 0.8) / 0.2) }}>
              <i>$</i>
              {SITE.brew}
            </code>
          </div>
        </Show>

        <For each={[APP, OUTRO]}>
          {(at) => (
            <Show when={now() >= at && now() < at + 0.5}>
              <div class={s.flash} style={{ opacity: (1 - ease((now() - at) / 0.5)) * 0.45 }} />
            </Show>
          )}
        </For>
      </div>
    </div>
  );
}
