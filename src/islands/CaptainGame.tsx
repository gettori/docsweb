import { createSignal, Index, onCleanup, onMount, Show } from "solid-js";
import { AgentMark, type Agent } from "../app/kit";
import { CheckMark, QuestionMark, WorkingMark } from "../app/statusMarks";
import s from "./CaptainGame.module.css";

const QUESTIONS = [
  "Run pnpm test?",
  "Edit 3 files in src/?",
  "Approve the plan?",
  "Open PR #483?",
  "Install zod?",
  "Run terraform plan?",
  "Delete build/?",
  "Push to origin?",
];
const CREW: [Agent, string, string][] = [
  ["claude", "Sign webhooks", "api/feat/webhooks"],
  ["codex", "Rate limiter", "api/fix/rate-limit"],
  ["gemini", "Search page", "web/feat/search"],
  ["opencode", "Dark mode", "web/dark-mode"],
  ["copilot", "Provider bump", "infra/main"],
  ["kimi", "Retry queue", "api/feat/retry"],
  ["claude", "SDK types", "sdk/feat/topics"],
  ["pi", "Docs pass", "docs/main"],
];

type Card = { st: "work" | "need" | "done"; p: number; since: number; q: number };

export default function CaptainGame() {
  let root!: HTMLElement;
  const [cards, setCards] = createSignal<Card[]>(
    CREW.map((_, i) => ({ st: i === 2 ? "need" : i === 5 ? "done" : "work", p: (i * 0.13) % 0.8, since: Date.now(), q: i })),
  );
  const [unblocked, setUnblocked] = createSignal(0);
  const [longest, setLongest] = createSignal(0);
  const [now, setNow] = createSignal(Date.now());

  onMount(() => {
    let visible = false;
    const io = new IntersectionObserver((e) => (visible = e[0].isIntersecting));
    io.observe(root);
    const id = setInterval(() => {
      if (!visible || document.hidden) return;
      const t = Date.now();
      setNow(t);
      setCards((cs) => {
        let waiting = cs.filter((c) => c.st === "need").length;
        return cs.map((c0) => {
          const c = { ...c0 };
          if (c.st === "work") {
            c.p = Math.min(1, c.p + 0.03 + Math.random() * 0.05);
            if (c.p >= 1) {
              c.st = "done";
              c.since = t;
            } else if (waiting < 3 && Math.random() < 0.05) {
              c.st = "need";
              c.since = t;
              c.q = (c.q + 3) % QUESTIONS.length;
              waiting++;
            }
          } else if (c.st === "done" && t - c.since > 3200) {
            c.st = "work";
            c.p = 0;
          }
          return c;
        });
      });
    }, 700);
    onCleanup(() => {
      clearInterval(id);
      io.disconnect();
    });
  });

  const allow = (i: number) => {
    const c = cards()[i];
    if (c.st !== "need") return;
    setLongest((l) => Math.max(l, (Date.now() - c.since) / 1000));
    setUnblocked((n) => n + 1);
    setCards((cs) => cs.map((x, j) => (j === i ? { ...x, st: "work", since: Date.now() } : x)));
  };
  const waiting = () => cards().filter((c) => c.st === "need");
  const worst = () => Math.max(longest(), ...waiting().map((c) => (now() - c.since) / 1000), 0);

  return (
    <section ref={root} class={s.box} style={{ "--heat": (0.06 + waiting().length * 0.07).toFixed(2) }}>
      <div class={s.wash} />
      <div class={s.intro}>
        <div class={s.eyebrow}>
          <span />
          Try it
        </div>
        <h2>
          Answer them yourself, <span class={s.accent}>for a minute.</span>
        </h2>
        <p>Eight agents are working. When one needs you it turns rose. Click Allow and it goes back to work.</p>
        <div class={s.stats}>
          <div>
            <b style={{ color: "var(--done-hi)" }}>{unblocked()}</b>
            <span>unblocked</span>
          </div>
          <div>
            <b style={{ color: "var(--need-hi)" }}>{waiting().length}</b>
            <span>waiting now</span>
          </div>
          <div>
            <b>
              {worst().toFixed(1)}
              <small>s</small>
            </b>
            <span>longest wait</span>
          </div>
        </div>
      </div>
      <div class={s.cards}>
        <Index each={cards()}>
          {(c, i) => (
            <div class={s.card} data-st={c().st}>
              <div class={s.title} data-agent={CREW[i][0]}>
                <AgentMark agent={CREW[i][0]} size={14} breathe={c().st === "work"} />
                {CREW[i][1]}
              </div>
              <div class={s.path}>{CREW[i][2]}</div>
              <div class={s.foot}>
                <Show when={c().st === "work"}>
                  <div class={s.state} style={{ color: "var(--work-hi)" }}>
                    <WorkingMark animate size={15} />
                    working
                  </div>
                  <div class={s.bar}>
                    <div style={{ width: `${Math.round(c().p * 100)}%` }} />
                  </div>
                </Show>
                <Show when={c().st === "need"}>
                  <div class={s.q}>
                    <QuestionMark animate size={14} />
                    {QUESTIONS[c().q % QUESTIONS.length]}
                  </div>
                  <button type="button" class={s.allow} onClick={() => allow(i)}>
                    Allow
                  </button>
                </Show>
                <Show when={c().st === "done"}>
                  <div class={s.state} style={{ color: "var(--done-hi)" }}>
                    <CheckMark animate size={15} />
                    done
                  </div>
                </Show>
              </div>
            </div>
          )}
        </Index>
      </div>
    </section>
  );
}
