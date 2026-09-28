import { createEffect, createSignal, For, Index, Match, on, onCleanup, Show, Switch } from "solid-js";
import { ArrowUp, Check, ChevronDown, ChevronRight, Ellipsis, History, Paperclip, Pencil, PenLine, RefreshCw, Wrench } from "lucide";
import { AgentMark, Icon } from "../../app/kit";
import w from "../../app/window.module.css";
import btn from "../../app/css/Button.module.css";
import DemoWindow, { useToast } from "./DemoWindow";
import s from "./ChatDemo.module.css";

type Tool = { kind: "tool"; name: string; arg: string; edit?: boolean; add?: number; del?: number; summary?: string };
type Entry = { id: number; kind: "user"; text: string; steer?: boolean } | ({ id: number } & Tool) | { id: number; kind: "prose" | "note"; text: string };
type Answer = "once" | "session" | "project" | "deny" | { reason: string };

const MODELS = ["Opus", "Sonnet", "Haiku"];
const MODEL_ID: Record<string, string> = { Opus: "opus-5-5", Sonnet: "sonnet-5", Haiku: "haiku-4-5" };
const EFFORTS = ["Low", "Medium", "High"];
const MODES = ["Ask", "Accept edits", "Plan", "Auto"];
const FILES = ["pied_piper/middle_out.py", "pied_piper/compress.py", "pied_piper/weissman.py", "tests/test_middle_out.py", "tests/test_roundtrip.py", "README.md"];
const COMMANDS: [string, string][] = [
  ["/compact", "Summarise the conversation to free up context"],
  ["/review", "Review the changes on this branch"],
  ["/clear", "Start the conversation over"],
];
const SUGGESTIONS = ["Add a test for an empty input", "Benchmark middle-out against zlib", "@README.md document the new compressor"];

let nextId = 0;
const id = () => ++nextId;

const START = (): Entry[] => [
  { id: id(), kind: "user", text: "Sketch middle-out compression: split the input and compress from the centre outwards" },
  { id: id(), kind: "tool", name: "Read", arg: "pied_piper/compress.py" },
  { id: id(), kind: "tool", name: "Edit", arg: "pied_piper/middle_out.py", edit: true, add: 38, del: 0 },
  { id: id(), kind: "tool", name: "Bash", arg: "pytest -q", summary: "11 passed  0.7s" },
  { id: id(), kind: "prose", text: "middle_out.compress splits the input in two, reverses the left half, and compresses both from the centre out in 4 KB blocks. The round trip test passes." },
];

function replyFor(prompt: string, file: string) {
  const p = prompt.toLowerCase();
  if (p.includes("test")) return `Added the test to tests/test_middle_out.py. An empty input now round trips to an empty output, and all 12 tests pass.`;
  if (p.includes("bench") || p.includes("fast")) return `Added a benchmark. On the 10 MB sample, middle-out is 38% smaller than zlib at level 9 and 1.4x slower. Weissman score 5.2.`;
  if (p.includes("doc") || p.includes("readme")) return `Documented middle-out in ${file}: what it does, how to call it, and the Weissman score it gets on the sample.`;
  return `Done. ${file} is updated and the 11 existing tests still pass.`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
class Cancelled extends Error {}

export default function ChatDemo() {
  const [entries, setEntries] = createSignal<Entry[]>(START());
  const [running, setRunning] = createSignal(false);
  const [asking, setAsking] = createSignal<{ cmd: string; reply: (a: Answer) => void } | null>(null);
  const [reasoning, setReasoning] = createSignal(false);
  const [reason, setReason] = createSignal("");
  const [model, setModel] = createSignal("Opus");
  const [nextModel, setNextModel] = createSignal("Opus");
  const [effort, setEffort] = createSignal("Medium");
  const [nextEffort, setNextEffort] = createSignal("Medium");
  const [mode, setMode] = createSignal("Accept edits");
  const [reach, setReach] = createSignal<"" | "session" | "project">("");
  const [todos, setTodos] = createSignal<[string, boolean][] | null>(null);
  const [files, setFiles] = createSignal(new Set(["pied_piper/middle_out.py"]));
  const [ctx, setCtx] = createSignal(18);
  const [started, setStarted] = createSignal(0);
  const [now, setNow] = createSignal(0);
  const clock = setInterval(() => running() && setNow(Date.now()), 1000);
  const [draft, setDraft] = createSignal("");
  const [menu, setMenu] = createSignal<{ kind: "@" | "/"; at: number; pick: number } | null>(null);
  const [pill, setPill] = createSignal<"model" | "effort" | "mode" | null>(null);
  const { toast, say } = useToast();
  const sent: string[] = [];
  let walk = -1;
  let turn = 0;
  let steers: string[] = [];
  let box!: HTMLTextAreaElement;
  let scroller!: HTMLDivElement;

  onCleanup(() => {
    turn++;
    clearInterval(clock);
  });
  createEffect(on([entries, asking, todos], () => queueMicrotask(() => scroller && (scroller.scrollTop = scroller.scrollHeight))));

  const push = (e: Omit<Entry, "id">) => {
    const x = { ...e, id: id() } as Entry;
    setEntries((all) => [...all, x]);
    return x.id;
  };
  const patch = (eid: number, part: Partial<Tool>) => setEntries((all) => all.map((e) => (e.id === eid ? ({ ...e, ...part } as Entry) : e)));
  const tick = (i: number) => setTodos((t) => t && t.map((x, j) => (j === i ? [x[0], true] : x)));

  async function runTurn(prompt: string) {
    const mine = ++turn;
    const step = async (ms: number) => {
      await sleep(ms);
      if (mine !== turn) throw new Cancelled();
    };
    setModel(nextModel());
    setEffort(nextEffort());
    setStarted(Date.now());
    setNow(Date.now());
    setRunning(true);
    const file = FILES.find((f) => prompt.includes(`@${f}`)) ?? "pied_piper/middle_out.py";
    try {
      await step(700);
      if (prompt.startsWith("/review")) {
        push({ kind: "tool", name: "Bash", arg: "git diff main...feat/middle-out", summary: "2 files" });
        await step(900);
        push({ kind: "prose", text: "Review: middle_out.py reads well, but decompress() trusts the 4 byte length prefix, so a truncated blob raises a bare IndexError. Worth a clear error and a test. Nothing else blocking." });
        return;
      }
      if (mode() === "Plan") {
        push({ kind: "tool", name: "Read", arg: file });
        await step(900);
        push({ kind: "prose", text: `Plan, nothing edited yet: 1. Read ${file} end to end. 2. Make the change behind the existing compress() signature. 3. Add a test, then run the suite. Switch to Accept edits when you want me to do it.` });
        return;
      }
      setTodos([
        ["Read the code", false],
        ["Make the change", false],
        ["Run the tests", false],
      ]);
      push({ kind: "tool", name: "Read", arg: file });
      await step(900);
      tick(0);
      push({ kind: "tool", name: "Edit", arg: file, edit: true, add: 12 + (prompt.length % 17), del: prompt.length % 5 });
      setFiles((f) => new Set([...f, file]));
      await step(900);
      tick(1);
      const bash = push({ kind: "tool", name: "Bash", arg: "pytest -q", summary: "Running" });
      if (mode() !== "Auto" && !reach()) {
        patch(bash, { summary: "Waiting for approval" });
        const answer = await new Promise<Answer>((reply) => setAsking({ cmd: "pytest -q", reply }));
        setAsking(null);
        if (mine !== turn) throw new Cancelled();
        if (answer === "session" || answer === "project") setReach(answer);
        if (answer === "deny" || typeof answer === "object") {
          patch(bash, { summary: "Denied" });
          await step(600);
          push({
            kind: "prose",
            text: typeof answer === "object" ? `Understood: "${answer.reason}". I left the tests alone; the edit to ${file} is in place.` : `Okay, I did not run the tests. The edit to ${file} is in place for you to check.`,
          });
          return;
        }
        patch(bash, { summary: "Running" });
      }
      await step(1100);
      patch(bash, { summary: "12 passed  0.8s" });
      tick(2);
      await step(500);
      const also = steers.length ? ` Also handled what you added mid-turn: "${steers.join('", "')}".` : "";
      push({ kind: "prose", text: replyFor(prompt, file) + also });
    } catch (e) {
      if (!(e instanceof Cancelled)) throw e;
    } finally {
      if (mine === turn) {
        setRunning(false);
        setCtx((c) => Math.min(92, c + 7));
        steers = [];
        setTimeout(() => mine === turn && setTodos(null), 1800);
      }
    }
  }

  const interrupt = () => {
    if (!running()) return;
    turn++;
    setAsking(null);
    setRunning(false);
    setTodos(null);
    steers = [];
    push({ kind: "note", text: "Interrupted" });
  };

  const send = (text = draft()) => {
    const t = text.trim();
    if (!t) return;
    sent.unshift(t);
    sent.length = Math.min(sent.length, 50);
    walk = -1;
    setDraft("");
    setMenu(null);
    if (t === "/clear") {
      turn++;
      setRunning(false);
      setTodos(null);
      setEntries([]);
      setCtx(4);
      return say("Conversation cleared.");
    }
    if (t === "/compact") {
      push({ kind: "note", text: `Conversation compacted. Context ${ctx()}% to 9%` });
      setCtx(9);
      return;
    }
    if (running()) {
      steers.push(t);
      push({ kind: "user", text: t, steer: true });
      return;
    }
    push({ kind: "user", text: t });
    void runTurn(t);
  };

  const rewind = (eid: number) => {
    const all = entries();
    const at = all.findIndex((e) => e.id === eid);
    const prompt = all[at] as Extract<Entry, { kind: "user" }>;
    setEntries(all.slice(0, at));
    setDraft(prompt.text);
    setCtx((c) => Math.max(6, c - 7 * (all.length - at > 3 ? 2 : 1)));
    say("Files reverted to before that turn, in a new session forked from here.");
  };

  const options = () => {
    const m = menu();
    if (!m) return [];
    const q = draft().slice(m.at + 1, box?.selectionStart ?? draft().length).toLowerCase();
    return m.kind === "@" ? FILES.filter((f) => f.toLowerCase().includes(q)).map((f) => [f, ""]) : COMMANDS.filter(([c]) => c.slice(1).startsWith(q));
  };
  const choose = (value: string) => {
    const m = menu()!;
    const end = box.selectionStart;
    const token = m.kind === "@" ? `@${value} ` : `${value} `;
    const next = draft().slice(0, m.at) + token + draft().slice(end);
    setDraft(next);
    setMenu(null);
    queueMicrotask(() => {
      box.focus();
      const c = m.at + token.length;
      box.setSelectionRange(c, c);
    });
  };

  const onInput = (e: InputEvent & { currentTarget: HTMLTextAreaElement }) => {
    const v = e.currentTarget.value;
    setDraft(v);
    const c = e.currentTarget.selectionStart;
    const before = v.slice(0, c);
    const at = Math.max(before.lastIndexOf("@"), before.startsWith("/") ? 0 : -1);
    const token = at >= 0 ? before.slice(at) : "";
    if (at >= 0 && !/\s/.test(token) && (at === 0 || /\s/.test(before[at - 1]))) setMenu({ kind: before[at] === "/" ? "/" : "@", at, pick: 0 });
    else setMenu(null);
  };

  const onKey = (e: KeyboardEvent & { currentTarget: HTMLTextAreaElement }) => {
    const m = menu();
    const list = options();
    if (m && list.length) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const d = e.key === "ArrowDown" ? 1 : -1;
        return setMenu({ ...m, pick: (m.pick + d + list.length) % list.length });
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        return choose(list[m.pick][0]);
      }
    }
    if (e.key === "Escape") {
      e.preventDefault();
      return m ? setMenu(null) : interrupt();
    }
    if (e.key === "Enter" && (!e.shiftKey || e.metaKey)) {
      e.preventDefault();
      return send();
    }
    const atStart = e.currentTarget.selectionStart === 0 && e.currentTarget.selectionEnd === 0;
    if ((e.key === "ArrowUp" && atStart) || (e.key === "ArrowDown" && walk >= 0)) {
      if (!sent.length) return;
      e.preventDefault();
      walk = e.key === "ArrowUp" ? Math.min(walk + 1, sent.length - 1) : walk - 1;
      setDraft(walk >= 0 ? sent[walk] : "");
    }
  };

  const Pill = (props: { name: "model" | "effort" | "mode"; value: string; options: string[]; pick: (v: string) => void; lead?: boolean }) => (
    <span class={s.pillWrap}>
      <button type="button" class={`${w.pillBtn} ${s.pill}`} aria-expanded={pill() === props.name} onClick={() => setPill(pill() === props.name ? null : props.name)}>
        <Show when={props.lead}>
          <AgentMark agent="claude" size={12} />
        </Show>
        {props.value}
        <Icon icon={ChevronDown} size={11} />
      </button>
      <Show when={pill() === props.name}>
        <div class={s.popover} role="menu">
          <For each={props.options}>
            {(o) => (
              <button
                type="button"
                role="menuitem"
                class={s.option}
                onClick={() => {
                  props.pick(o);
                  setPill(null);
                  box.focus();
                }}
              >
                <span class={s.tickSlot}>{o === props.value ? <Icon icon={Check} size={13} /> : null}</span>
                {o}
              </button>
            )}
          </For>
        </div>
      </Show>
    </span>
  );

  const state = () => (asking() ? "need" : running() ? "work" : "idle");
  const count = (what: "edit" | "turn" | "tool") =>
    entries().filter((e) => (what === "turn" ? e.kind === "user" && !e.steer : e.kind === "tool" && (what === "tool" || e.edit))).length;
  const elapsed = () => {
    const t = Math.max(0, Math.floor((now() - started()) / 1000));
    return t < 60 ? `${t}s` : `${Math.floor(t / 60)}m ${t % 60}s`;
  };
  const pending = () => {
    const parts = [nextModel() !== model() ? nextModel() : "", nextEffort() !== effort() ? `${nextEffort().toLowerCase()} effort` : ""].filter(Boolean);
    return parts.length ? `${parts.join(" and ")} from the next turn` : "";
  };

  return (
    <DemoWindow crumbs={["raviga", "pied-piper", "feat/middle-out"]} toast={toast()} minHeight={560}>
      <section class={`${w.card} ${s.pane}`} onClick={(e) => !(e.target as HTMLElement).closest(`.${s.pillWrap}`) && setPill(null)}>
        <div class={w.chat}>
          <div class={`${w.statusStrip} ${s.strip}`}>
            <span
              class={w.stateWord}
              style={{ color: state() === "work" ? "var(--status-progress)" : state() === "need" ? "var(--status-needs-you)" : "var(--status-idle)" }}
            >
              <span class={w.stateDot} />
              {state() === "work" ? "Working" : state() === "need" ? "Needs you" : "Idle"}
            </span>
            <Show when={running()}>
              <span class={s.dim}>{elapsed()}</span>
            </Show>
            <span class={s.rule} />
            <span class={s.dim}>
              {files().size} file{files().size === 1 ? "" : "s"}
            </span>
            <span class={s.rule} />
            <span class={s.stat}>
              <AgentMark agent="claude" size={13} />
              {MODEL_ID[model()]}
            </span>
            <span class={s.dot}>{"\u2022"}</span>
            <span class={s.stat} title="Edits">
              <Icon icon={Pencil} size={13} />
              {count("edit")}
            </span>
            <span class={s.dot}>{"\u2022"}</span>
            <span class={s.stat} title="Turns">
              <Icon icon={RefreshCw} size={13} />
              {count("turn")}
            </span>
            <span class={s.dot}>{"\u2022"}</span>
            <span class={s.stat} title="Tool calls">
              <Icon icon={Wrench} size={13} />
              {count("tool")}
            </span>
            <span class={s.dot}>{"\u2022"}</span>
            <span class={s.stat} title="Context">
              <span class={w.pie} style={{ "--p": ctx() }} />
              {(ctx() * 10).toFixed(1)}k/1.0M ({ctx()}%)
            </span>
            <span class={s.more}>
              <Icon icon={Ellipsis} size={15} />
            </span>
          </div>

          <div ref={scroller} class={`${w.transcript} ${s.transcript}`}>
            <Index each={entries()}>
              {(e) => (
                <Switch>
                  <Match when={e().kind === "user" && (e() as Extract<Entry, { kind: "user" }>)}>
                    {(u) => (
                      <div class={s.userRow}>
                        <Show when={!u().steer && !running()}>
                          <button type="button" class={s.rewind} onClick={() => rewind(u().id)}>
                            <Icon icon={History} size={13} />
                            Rewind to here
                          </button>
                        </Show>
                        <div class={`${w.user} ${w.in}`}>
                          <Show when={u().steer}>
                            <span class={s.steerTag}>Steer</span>
                          </Show>
                          {u().text}
                        </div>
                      </div>
                    )}
                  </Match>
                  <Match when={e().kind === "tool" && (e() as Tool & { id: number })}>
                    {(t) => (
                      <div class={`${w.tool} ${w.in}`} data-blocked={t().summary === "Waiting for approval" && asking() ? "true" : "false"}>
                        <div class={w.toolRow}>
                          <span class={w.caret}>
                            <Icon icon={ChevronRight} size={13} />
                          </span>
                          <span class={w.toolName} data-edit={t().edit ? "true" : "false"}>
                            {t().name}
                          </span>
                          <span class={w.toolArg}>{t().arg}</span>
                          <Show when={t().add != null}>
                            <span class={w.add}>+{t().add}</span>
                            <span class={w.del}>-{t().del}</span>
                          </Show>
                          <Show when={t().summary}>
                            <span class={w.toolSummary}>{t().summary}</span>
                          </Show>
                        </div>
                        <Show when={t().summary === "Waiting for approval" && asking()}>
                          {(a) => (
                            <div class={w.perm}>
                              <div class={w.permQ}>
                                Run <code>{a().cmd}</code> in this workspace?
                              </div>
                              <Show
                                when={reasoning()}
                                fallback={
                                  <div class={w.permBtns}>
                                    <button type="button" class={`${btn.btn} ${btn.primary} ${btn.sm}`} onClick={() => a().reply("once")}>
                                      <span class={btn.label}>Allow once</span>
                                    </button>
                                    <button type="button" class={`${btn.btn} ${btn.default} ${btn.sm}`} onClick={() => a().reply("session")}>
                                      <span class={btn.label}>Allow for this session</span>
                                    </button>
                                    <button type="button" class={`${btn.btn} ${btn.default} ${btn.sm}`} onClick={() => a().reply("project")}>
                                      <span class={btn.label}>Always in this project</span>
                                    </button>
                                    <button type="button" class={`${btn.btn} ${btn.default} ${btn.sm}`} onClick={() => a().reply("deny")}>
                                      <span class={btn.label}>Deny</span>
                                    </button>
                                    <button type="button" class={`${btn.btn} ${btn.ghost} ${btn.sm}`} onClick={() => setReasoning(true)}>
                                      <span class={btn.label}>Deny with feedback</span>
                                    </button>
                                  </div>
                                }
                              >
                                <form
                                  class={s.reason}
                                  onSubmit={(ev) => {
                                    ev.preventDefault();
                                    const r = reason().trim() || "not now";
                                    setReasoning(false);
                                    setReason("");
                                    a().reply({ reason: r });
                                  }}
                                >
                                  <input class={s.reasonInput} placeholder="Tell the agent why" value={reason()} onInput={(ev) => setReason(ev.currentTarget.value)} autofocus />
                                  <button type="submit" class={`${btn.btn} ${btn.primary} ${btn.sm}`}>
                                    <span class={btn.label}>Deny</span>
                                  </button>
                                </form>
                              </Show>
                            </div>
                          )}
                        </Show>
                      </div>
                    )}
                  </Match>
                  <Match when={e().kind === "prose" && e()}>{(p) => <div class={`${w.prose} ${w.in}`}>{(p() as { text: string }).text}</div>}</Match>
                  <Match when={e().kind === "note" && e()}>{(n) => <div class={s.note}>{(n() as { text: string }).text}</div>}</Match>
                </Switch>
              )}
            </Index>
            <Show when={running() && !asking()}>
              <div class={w.thinking}>Thinking</div>
            </Show>
          </div>

          <div class={w.composer}>
            <Show when={todos()}>
              {(t) => (
                <div class={s.todos}>
                  <Index each={t()}>
                    {(x) => (
                      <span class={s.todo} data-done={x()[1] ? "true" : "false"}>
                        <span class={s.box}>{x()[1] ? <Icon icon={Check} size={10} /> : null}</span>
                        {x()[0]}
                      </span>
                    )}
                  </Index>
                </div>
              )}
            </Show>
            <Show when={pending()}>
              <div class={s.pending}>{pending()}</div>
            </Show>
            <Show when={!running() && !draft() && entries().length < 12}>
              <div class={s.suggest}>
                <For each={SUGGESTIONS}>
                  {(x) => (
                    <button type="button" class={s.suggestion} onClick={() => send(x)}>
                      {x}
                    </button>
                  )}
                </For>
              </div>
            </Show>
            <div class={`${w.box} ${s.box2}`}>
              <Show when={menu() && options().length}>
                <div class={s.menu} role="listbox">
                  <For each={options()}>
                    {(o, i) => (
                      <button
                        type="button"
                        role="option"
                        aria-selected={i() === menu()!.pick}
                        class={s.menuItem}
                        onMouseDown={(ev) => {
                          ev.preventDefault();
                          choose(o[0]);
                        }}
                      >
                        <span class={s.menuMain}>{o[0]}</span>
                        <span class={s.menuSub}>{o[1]}</span>
                      </button>
                    )}
                  </For>
                </div>
              </Show>
              <textarea
                ref={box}
                class={s.input}
                rows={1}
                value={draft()}
                placeholder={running() ? "Steer this turn, Escape to interrupt" : "Ask Claude, @ to mention a file, / for commands"}
                onInput={onInput}
                onKeyDown={onKey}
              />
              <div class={w.boxBar}>
                <span class={`${w.sqBtn} ${s.attach}`}>
                  <Icon icon={Paperclip} size={13} />
                </span>
                <span class={`${w.sqBtn} ${s.attach}`}>
                  <Icon icon={PenLine} size={13} />
                </span>
                <Pill name="model" lead value={nextModel()} options={MODELS} pick={setNextModel} />
                <Pill name="effort" value={nextEffort()} options={EFFORTS} pick={setNextEffort} />
                <Pill name="mode" value={mode()} options={MODES} pick={setMode} />
                <button
                  type="button"
                  class={`${w.send} ${s.send}`}
                  aria-label={running() && !draft() ? "Interrupt" : "Send"}
                  onClick={() => (running() && !draft() ? interrupt() : send())}
                >
                  <Show when={running() && !draft()} fallback={<Icon icon={ArrowUp} size={14} />}>
                    <span class={w.stopSq} />
                  </Show>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </DemoWindow>
  );
}
