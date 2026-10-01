import { createSignal, For, onCleanup, onMount } from "solid-js";
import ToriWindow, { type Mode } from "./ToriWindow";
import s from "./Story.module.css";

type Step = {
  bar: string;
  color: string;
  glow: string;
  soft: string;
  title: string;
  body: string;
  facts: string[];
  mode: Mode;
  region: string;
};

// Undo and Review crop to the work card: the sidebar has nothing to add there.
const CARD = "280,44,920,696";
const STEPS: Step[] = [
  {
    bar: "Status",
    color: "var(--need)",
    glow: "rgba(251,113,133,.55)",
    soft: "rgba(251,113,133,.16)",
    title: "Know the moment one is waiting.",
    body: "A permission prompt turns the branch rose, rolls up to its project, and fires one notification. Click it, allow, and it is back to work.",
    facts: ["One notification", "\u2318\u21e7A jumps there", "Menu bar and Dock agree"],
    mode: "loop",
    region: "0,0,1200,740",
  },
  {
    bar: "Undo",
    color: "var(--link)",
    glow: "rgba(217,164,104,.55)",
    soft: "rgba(217,164,104,.14)",
    title: "Undo any turn.",
    body: "Every prompt snapshots the whole tree, without making a commit. Find a turn by its prompt, see what it changed, put the tree back. The revert saves a backup first.",
    facts: ["No commits made", "Rewind forks the chat", "Fan out N attempts"],
    mode: "undo",
    region: CARD,
  },
  {
    bar: "Review",
    color: "var(--done-hi)",
    glow: "rgba(45,212,191,.5)",
    soft: "rgba(45,212,191,.14)",
    title: "Comment on a hunk. Watch it get fixed.",
    body: "A real editor and a Changes panel that stages, commits and opens the PR. A hunk comment lands in the session's composer with the lines attached.",
    facts: ["Stage by hunk or line", "GitHub and GitLab review", "Three pane merge"],
    mode: "review",
    region: CARD,
  },
  {
    bar: "Autopilot",
    color: "var(--work-hi)",
    glow: "rgba(192,132,252,.55)",
    soft: "rgba(192,132,252,.16)",
    title: "Hand the queue to Autopilot.",
    body: "Point it at an issue. It makes the worktree, starts a worker, and brings you a pull request to approve.",
    facts: ["Nothing leaves without approval", "Zero tokens while waiting", "Off by default"],
    mode: "cockpit",
    region: "0,0,1200,740",
  },
];

export default function Story() {
  let stage!: HTMLDivElement;
  const [step, setStep] = createSignal(0);
  const [sp, setSp] = createSignal(0);
  const [vw, setVw] = createSignal(1400);
  const [vh, setVh] = createSignal(900);

  onMount(() => {
    const update = () => {
      const r = stage.closest("[data-story]")!.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, -r.top / Math.max(1, r.height - innerHeight)));
      setSp(p * 4);
      setStep(Math.min(3, Math.floor(p * 4)));
      setVw(innerWidth);
      setVh(innerHeight);
    };
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    update();
    onCleanup(() => {
      removeEventListener("scroll", update);
      removeEventListener("resize", update);
    });
  });

  const desk = () => vw() >= 1000;
  const cur = () => STEPS[step()];
  const winW = () => {
    const [, , rw, rh] = cur().region.split(",").map(Number);
    const avail = desk() ? Math.min(vw() - 380 - 56 - 80, 1200) : vw() - 32;
    const byH = desk() ? vh() - 110 : vh() * 0.46;
    return Math.max(280, Math.floor(Math.min(avail, (byH * rw) / rh)));
  };

  return (
    <div ref={stage} class={s.stage} data-desk={desk() ? "true" : "false"}>
        <div class={s.glow} style={{ background: `radial-gradient(45% 45% at 62% 50%, ${cur().soft}, transparent 70%)` }} />
        <div class={s.row}>
          <div class={s.captions}>
            <div class={s.bars}>
              <For each={STEPS}>
                {(st, i) => (
                  <div class={s.barCol}>
                    <div class={s.track}>
                      <div style={{ width: `${Math.round(Math.max(0, Math.min(1, sp() - i())) * 100)}%`, background: st.color }} />
                    </div>
                    <span style={{ color: i() === step() ? st.color : "var(--faint)" }}>{st.bar.toUpperCase()}</span>
                  </div>
                )}
              </For>
            </div>
            <div class={s.caps}>
              <For each={STEPS}>
                {(st, i) => (
                  <div class={s.cap} data-at={i() === step() ? "now" : i() < step() ? "past" : "next"} aria-hidden={i() !== step()}>
                    <div class={s.num} style={{ "-webkit-text-stroke": `1px ${st.glow}` }}>
                      0{i() + 1}
                    </div>
                    <h2>{st.title}</h2>
                    <p>{st.body}</p>
                    <div class={s.facts}>
                      <For each={st.facts}>{(f) => <span>{f}</span>}</For>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </div>
          <div
            class={s.frame}
            style={{
              width: `${winW()}px`,
              background: `linear-gradient(140deg, ${cur().glow}, var(--glass-hi) 40%, var(--glass))`,
              "box-shadow": `0 50px 140px light-dark(rgba(40,36,70,.22), rgba(0,0,0,.65)), 0 0 100px ${cur().soft}`,
            }}
          >
            <div class={s.clip}>
              <ToriWindow mode={cur().mode} region={cur().region} skipChaos maxScale={1.5} />
            </div>
          </div>
        </div>
      </div>
  );
}
