import { createMemo, createSignal, For, Index, onCleanup, onMount, Show } from "solid-js";
import { Clock, Plus, RefreshCw } from "lucide";
import { AgentMark, Icon } from "../../app/kit";
import w from "../../app/window.module.css";
import btn from "../../app/css/Button.module.css";
import us from "../../app/css/UsageStrip.module.css";
import uc from "../../app/css/UsageCard.module.css";
import DemoWindow, { useToast } from "./DemoWindow";
import s from "./AccountsDemo.module.css";

type AgentId = "claude" | "codex";
type Kind = "five_hour" | "seven_day";
type Win = { kind: Kind; util: number; resetsAt: number };
type Account = {
  key: string;
  agent: AgentId;
  label: string;
  email: string;
  plan: string;
  folder: string;
  origin: "existing" | "created" | "pointed";
  sessions: number;
  windows: Win[];
  show: Kind[];
  warnAt: number;
  notify: boolean;
  keychain: boolean;
  warned: Kind[];
};
type Project = { name: string; space: string; only: string[] | null };

const DOT = " \u00b7 ";
const AGENT_NAME: Record<AgentId, string> = { claude: "Claude", codex: "Codex" };
const NAMES: Record<Kind, { label: string; short: string; inline: string; secs: number }> = {
  five_hour: { label: `Session${DOT}5h rolling`, short: "5H", inline: "rolling 5-hour", secs: 5 * 3600 },
  seven_day: { label: `Week${DOT}all models`, short: "W", inline: "weekly all-model", secs: 7 * 86400 },
};
const WARM_AT = 0.6;
const HOT_AT = 0.8;
const MIN = 60_000;

const START = (now: number): Account[] => [
  {
    key: "claude:default",
    agent: "claude",
    label: "Personal",
    email: "richard@piedpiper.com",
    plan: "Max 5x",
    folder: "~/.claude",
    origin: "existing",
    sessions: 31,
    windows: [
      { kind: "five_hour", util: 0.34, resetsAt: now + 134 * MIN },
      { kind: "seven_day", util: 0.41, resetsAt: now + 3 * 86400_000 + 200 * MIN },
    ],
    show: ["five_hour", "seven_day"],
    warnAt: 0.8,
    notify: true,
    keychain: false,
    warned: [],
  },
  {
    key: "claude:raviga",
    agent: "claude",
    label: "Raviga",
    email: "richard@raviga.vc",
    plan: "Team",
    folder: "~/.config/tori/accounts/claude-raviga",
    origin: "created",
    sessions: 12,
    windows: [
      { kind: "five_hour", util: 0.74, resetsAt: now + 90 * MIN },
      { kind: "seven_day", util: 0.66, resetsAt: now + 2 * 86400_000 + 90 * MIN },
    ],
    show: ["five_hour", "seven_day"],
    warnAt: 0.8,
    notify: true,
    keychain: false,
    warned: [],
  },
  {
    key: "codex:default",
    agent: "codex",
    label: "Codex",
    email: "richard@hooli.xyz",
    plan: "Plus",
    folder: "~/.codex",
    origin: "existing",
    sessions: 9,
    windows: [
      { kind: "five_hour", util: 0.12, resetsAt: now + 212 * MIN },
      { kind: "seven_day", util: 0.29, resetsAt: now + 4 * 86400_000 },
    ],
    show: ["five_hour"],
    warnAt: 0.8,
    notify: false,
    keychain: false,
    warned: [],
  },
];
const PROJECTS: Project[] = [
  { name: "pied-piper", space: "raviga", only: ["claude:raviga"] },
  { name: "hooli-search", space: "hooli", only: ["codex:default", "claude:default"] },
  { name: "blog", space: "personal", only: null },
];

const band = (x: Win) => (x.util >= 1 ? "hot" : x.util >= HOT_AT ? "hot" : x.util >= WARM_AT ? "warm" : "clear");
const clock = (at: number) =>
  new Date(at)
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    .toLowerCase()
    .replace(" ", "");
function whenLine(at: number, now: number) {
  const left = at - now;
  if (left <= 0) return "resetting";
  if (left < 86400_000) {
    const h = Math.floor(left / 3600_000);
    const m = Math.floor((left % 3600_000) / MIN);
    return `${h > 0 ? `${h}h ${m}m` : `${m}m`}${DOT}${clock(at)}`;
  }
  return `${new Date(at).toLocaleDateString("en-US", { weekday: "short" })} ${clock(at)}`;
}
function paceOut(x: Win, now: number) {
  const started = x.resetsAt - NAMES[x.kind].secs * 1000;
  const elapsed = now - started;
  if (x.util <= 0 || x.util >= 1 || elapsed <= 0) return null;
  const out = started + elapsed / x.util;
  return out < x.resetsAt ? out : null;
}

export default function AccountsDemo() {
  const { toast, say } = useToast();
  const [now, setNow] = createSignal(Date.now());
  const [accounts, setAccounts] = createSignal<Account[]>(START(Date.now()));
  const [card, setCard] = createSignal<{ agent: AgentId; key: string } | null>(null);
  const [agent, setAgent] = createSignal<AgentId>("claude");
  const [editing, setEditing] = createSignal("claude:raviga");
  const [adding, setAdding] = createSignal<null | { name: string; folder: string; step: number }>(null);
  const [removing, setRemoving] = createSignal<string | null>(null);
  const [projects, setProjects] = createSignal<Project[]>(PROJECTS);
  const [project, setProject] = createSignal("pied-piper");
  const [runAs, setRunAs] = createSignal("claude:default");
  const [ruleOpen, setRuleOpen] = createSignal(false);
  const [note, setNote] = createSignal<{ bad: boolean; text: string } | null>(null);
  const [narrow, setNarrow] = createSignal(false);
  let root!: HTMLDivElement;
  let seq = 0;

  onMount(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    const ro = new ResizeObserver(() => setNarrow(root.clientWidth < 600));
    ro.observe(root);
    onCleanup(() => (clearInterval(t), ro.disconnect()));
  });

  const byKey = (k: string) => accounts().find((a) => a.key === k);
  const acct = () => byKey(editing()) ?? accounts().find((a) => a.agent === agent())!;
  const proj = () => projects().find((p) => p.name === project())!;
  const patch = (k: string, fn: (a: Account) => Account) => setAccounts((l) => l.map((a) => (a.key === k ? fn(a) : a)));
  const rowLabel = (a: Account) => (a.agent === "codex" ? "Codex" : `Claude (${a.label})`);

  // The strip: one cluster per account with anything to show, the tightest
  // window alone once the title bar runs short, as the app collapses it.
  const clusters = createMemo(() =>
    accounts()
      .map((a) => {
        const lit = a.windows.filter((x) => a.show.includes(x.kind));
        const tight = [...lit].sort((p, q) => q.util - p.util)[0];
        return { a, windows: narrow() ? (tight ? [tight] : []) : lit };
      })
      .filter((c) => c.windows.length),
  );

  function spend(k: string, five: number, week: number) {
    const a = byKey(k)!;
    const next = a.windows.map((x) => ({ ...x, util: Math.min(1, x.util + (x.kind === "five_hour" ? five : week)) }));
    const warned = [...a.warned];
    for (const x of next) {
      const before = a.windows.find((y) => y.kind === x.kind)!.util;
      const inline = NAMES[x.kind].inline;
      if (!a.notify) continue;
      if (x.util >= 1 && before < 1) say(`${rowLabel(a)} has used all of its ${inline} limit. Resets ${whenLine(x.resetsAt, now())}.`);
      else if (x.util >= a.warnAt && before < a.warnAt && !warned.includes(x.kind)) {
        warned.push(x.kind);
        say(`${rowLabel(a)} passed ${Math.round(a.warnAt * 100)}% of its ${inline} limit.`);
      }
    }
    patch(k, (y) => ({ ...y, windows: next, warned, sessions: y.sessions + 1 }));
  }

  function start() {
    const p = proj();
    const a = byKey(runAs())!;
    if (p.only && !p.only.includes(a.key)) {
      setNote({ bad: true, text: `${rowLabel(a)} is not allowed in this project` });
      return;
    }
    if (a.windows.some((x) => x.util >= 1)) {
      setNote({ bad: true, text: `${rowLabel(a)} has hit a usage limit. Pick another account.` });
      return;
    }
    setNote({ bad: false, text: `Started ${rowLabel(a)} in ${p.name}. The turn spent some of its quota.` });
    spend(a.key, 0.09, 0.035);
  }

  function addAccount() {
    const f = adding();
    if (!f || !f.name.trim()) return;
    let step = 0;
    const tick = () => {
      step++;
      setAdding((x) => (x ? { ...x, step } : x));
      if (step < 3) return void setTimeout(tick, 700);
      const key = `${agent()}:${f.name.trim().toLowerCase().replace(/\W+/g, "-")}-${++seq}`;
      const pointed = f.folder.trim() !== "";
      setAccounts((l) => [
        ...l,
        {
          key,
          agent: agent(),
          label: f.name.trim(),
          email: `richard@${f.name.trim().toLowerCase().replace(/\W+/g, "")}.com`,
          plan: "Pro",
          folder: pointed ? f.folder.trim() : `~/.config/tori/accounts/${agent()}-${f.name.trim().toLowerCase().replace(/\W+/g, "-")}`,
          origin: pointed ? "pointed" : "created",
          sessions: 0,
          windows: [
            { kind: "five_hour", util: 0.02, resetsAt: now() + 290 * MIN },
            { kind: "seven_day", util: 0.01, resetsAt: now() + 6 * 86400_000 },
          ],
          show: ["five_hour"],
          warnAt: 0.8,
          notify: true,
          keychain: false,
          warned: [],
        },
      ]);
      setEditing(key);
      setAdding(null);
      say(`${AGENT_NAME[agent()]} (${f.name.trim()}) is signed in`);
    };
    setTimeout(tick, 500);
  }

  function remove(k: string) {
    const a = byKey(k)!;
    setAccounts((l) => l.filter((x) => x.key !== k));
    setProjects((l) => l.map((p) => (p.only ? { ...p, only: p.only.filter((x) => x !== k) } : p)));
    if (runAs() === k) setRunAs("claude:default");
    setEditing(accounts().find((x) => x.agent === a.agent)?.key ?? "claude:default");
    setRemoving(null);
    if (card()?.key === k) setCard(null);
    say(a.origin === "created" ? `Removed ${rowLabel(a)} and its ${a.sessions} sessions` : `Forgot ${rowLabel(a)}. ${a.folder} is untouched.`);
  }

  const Card = () => {
    const c = () => card()!;
    const mine = () => accounts().filter((a) => a.agent === c().agent);
    const shown = () => byKey(c().key) ?? mine()[0]!;
    const pace = () => {
      const a = shown();
      const hit = a.windows.find((x) => x.util >= 1);
      const soon = a.windows
        .map((x) => ({ x, out: paceOut(x, now()) }))
        .filter((p): p is { x: Win; out: number } => p.out !== null)
        .sort((p, q) => p.out - q.out)[0];
      const first = hit
        ? `Your ${NAMES[hit.kind].inline} limit has been reached. Resets ${whenLine(hit.resetsAt, now())}.`
        : soon
          ? `At this pace your ${NAMES[soon.x.kind].inline} limit runs out around ${clock(soon.out)}.`
          : "Comfortable all week at this pace.";
      let worst: { a: Account; x: Win } | null = null;
      for (const o of mine())
        if (o.key !== a.key)
          for (const x of o.windows) if (x.util >= o.warnAt && (!worst || x.util > worst.x.util)) worst = { a: o, x };
      const second = worst
        ? `${worst.a.label} is the one to watch, ${(worst.x.util * 100).toFixed(1)}% used on its ${NAMES[worst.x.kind].inline} limit.`
        : "";
      return [first, second].filter(Boolean).join(" ");
    };
    return (
      <div class={`${uc.card} ${s.card}`} role="dialog" aria-label={`${AGENT_NAME[c().agent]} usage detail`} onClick={(e) => e.stopPropagation()}>
        <header class={uc.head}>
          <AgentMark agent={c().agent} size={22} />
          <span class={uc.who}>{AGENT_NAME[c().agent]}</span>
          <span class={uc.ago}>
            12s ago
            <button type="button" class={s.iconBtn} aria-label="Read again" onClick={() => say("Read again from the CLI")}>
              <Icon icon={RefreshCw} size={13} />
            </button>
          </span>
        </header>
        <div class={uc.accounts}>
          <Show when={mine().length > 1} fallback={<span class={uc.email}>{shown().email}</span>}>
            <For each={mine()}>
              {(a) => (
                <button type="button" class={`${uc.tab} ${a.key === shown().key ? uc.tabOn : ""}`} aria-pressed={a.key === shown().key} onClick={() => setCard({ agent: a.agent, key: a.key })}>
                  {a.label}
                </button>
              )}
            </For>
          </Show>
          <span class={uc.rule} />
          <span class={uc.plan}>{shown().plan}</span>
        </div>
        <ul class={uc.windows}>
          <For each={shown().windows}>
            {(x) => (
              <li class={uc.window} data-band={band(x)}>
                <span class={uc.kind}>{NAMES[x.kind].label}</span>
                <span class={uc.level}>{(x.util * 100).toFixed(1)}%</span>
                <span class={uc.when}>{whenLine(x.resetsAt, now())}</span>
                <span class={uc.track}>
                  <span class={uc.fill} style={{ width: `${Math.min(100, x.util * 100)}%` }} />
                </span>
              </li>
            )}
          </For>
        </ul>
        <p class={uc.pace}>
          <Icon icon={Clock} size={14} />
          <span>{pace()}</span>
        </p>
      </div>
    );
  };

  const Strip = () => (
    <div class={`${us.strip} ${s.strip}`}>
      <For each={clusters()}>
        {(c, i) => (
          <>
            <Show when={i() > 0}>
              <span class={`${us.divider} ${clusters()[i() - 1]!.a.agent !== c.a.agent ? us.agentDivider : ""}`} />
            </Show>
            <button
              type="button"
              class={`${us.cluster} ${narrow() ? us.tight : ""}`}
              aria-label={`${rowLabel(c.a)} usage`}
              aria-expanded={card()?.key === c.a.key}
              onClick={(e) => (e.stopPropagation(), setCard(card()?.key === c.a.key ? null : { agent: c.a.agent, key: c.a.key }))}
            >
              <Show when={clusters()[i() - 1]?.a.agent !== c.a.agent} fallback={<span class={us.name}>{c.a.label}</span>}>
                <AgentMark agent={c.a.agent} size={13} />
                <Show when={accounts().filter((a) => a.agent === c.a.agent).length > 1}>
                  <span class={us.name}>{c.a.label}</span>
                </Show>
              </Show>
              <For each={c.windows}>
                {(x) => (
                  <span class={`${us.bar} ${band(x) === "warm" ? us.warm : band(x) === "hot" ? us.hot : ""}`}>
                    <Show when={!narrow()}>
                      <span class={us.kind}>{NAMES[x.kind].short}</span>
                    </Show>
                    <span class={us.figure}>{Math.round(x.util * 100)}%</span>
                  </span>
                )}
              </For>
            </button>
          </>
        )}
      </For>
    </div>
  );

  return (
    <div ref={root} class={s.root} onClick={() => (setCard(null), setRuleOpen(false))}>
      <DemoWindow crumbs={["Settings", "Agents"]} end={<Strip />} toast={toast()} minHeight={560}>
        <div class={s.layout}>
          <section class={`${w.card} ${s.pane}`}>
            <div class={s.paneHead}>
              <span class={s.crumb}>Settings {"\u203a"} Agents</span>
              <span class={s.seg}>
                <For each={["claude", "codex"] as AgentId[]}>
                  {(id) => (
                    <button
                      type="button"
                      aria-pressed={agent() === id}
                      onClick={() => {
                        setAgent(id);
                        setEditing(accounts().find((a) => a.agent === id)!.key);
                        setAdding(null);
                        setRemoving(null);
                      }}
                    >
                      <AgentMark agent={id} size={12} />
                      {AGENT_NAME[id]}
                    </button>
                  )}
                </For>
              </span>
            </div>
            <div class={s.group}>Accounts</div>
            <div class={s.accounts}>
              <For each={accounts().filter((a) => a.agent === agent())}>
                {(a) => (
                  <div class={s.account} data-on={editing() === a.key ? "" : undefined} onClick={() => setEditing(a.key)}>
                    <span class={s.acctText}>
                      <span class={s.acctName}>
                        {a.label}
                        <Show when={a.origin === "existing"}>
                          <span class={s.tag}>your existing login</span>
                        </Show>
                      </span>
                      <span class={s.acctMeta}>
                        {a.email}
                        {DOT}
                        {a.folder}
                      </span>
                    </span>
                    <Show when={a.origin !== "existing"}>
                      <button type="button" class={s.linkBtn} onClick={(e) => (e.stopPropagation(), setRemoving(a.key))}>
                        Remove
                      </button>
                    </Show>
                  </div>
                )}
              </For>
              <Show when={byKey(removing() ?? "")}>
                {(a) => (
                  <div class={s.confirm} data-danger={a().origin === "created" ? "" : undefined}>
                    <span>
                      {a().origin === "created"
                        ? `Tori created this account, so removing it deletes its ${a().sessions} sessions too.`
                        : `This only forgets it. ${a().folder} and its login stay exactly as they are.`}
                    </span>
                    <span class={s.confirmBtns}>
                      <button type="button" class={`${btn.btn} ${btn.ghost} ${btn.xs}`} onClick={() => setRemoving(null)}>
                        <span class={btn.label}>Cancel</span>
                      </button>
                      <button type="button" class={`${btn.btn} ${a().origin === "created" ? btn.danger : btn.default} ${btn.xs}`} onClick={() => remove(a().key)}>
                        <span class={btn.label}>{a().origin === "created" ? "Remove and delete" : "Forget"}</span>
                      </button>
                    </span>
                  </div>
                )}
              </Show>
              <Show
                when={adding()}
                fallback={
                  <Show when={agent() === "claude"}>
                    <button type="button" class={s.add} onClick={() => setAdding({ name: "", folder: "", step: 0 })}>
                      <Icon icon={Plus} size={13} />
                      Add account
                    </button>
                  </Show>
                }
              >
                {(f) => (
                  <div class={s.addForm}>
                    <Show
                      when={f().step === 0}
                      fallback={
                        <div class={s.signin}>
                          <div>$ claude /login</div>
                          <Show when={f().step >= 1}>
                            <div class={s.dim}>Opening the browser to sign in...</div>
                          </Show>
                          <Show when={f().step >= 2}>
                            <div class={s.ok}>Signed in. Credentials saved.</div>
                          </Show>
                        </div>
                      }
                    >
                      <input placeholder="Name, e.g. Hooli" value={f().name} onInput={(e) => setAdding({ ...f(), name: e.currentTarget.value })} />
                      <input placeholder="Folder (optional), e.g. ~/work/claude" value={f().folder} onInput={(e) => setAdding({ ...f(), folder: e.currentTarget.value })} />
                      <span class={s.confirmBtns}>
                        <button type="button" class={`${btn.btn} ${btn.ghost} ${btn.xs}`} onClick={() => setAdding(null)}>
                          <span class={btn.label}>Cancel</span>
                        </button>
                        <button type="button" class={`${btn.btn} ${btn.primary} ${btn.xs}`} disabled={!f().name.trim()} onClick={addAccount}>
                          <span class={btn.label}>Sign in</span>
                        </button>
                      </span>
                    </Show>
                  </div>
                )}
              </Show>
            </div>
            <div class={s.group}>Usage for {acct().label}</div>
            <div class={s.rows}>
              <div class={s.row}>
                <span>In the title bar</span>
                <span class={s.chips}>
                  <For each={["five_hour", "seven_day"] as Kind[]}>
                    {(k) => (
                      <button
                        type="button"
                        class={s.chip}
                        aria-pressed={acct().show.includes(k)}
                        onClick={() => patch(acct().key, (a) => ({ ...a, show: a.show.includes(k) ? a.show.filter((x) => x !== k) : [...a.show, k] }))}
                      >
                        {k === "five_hour" ? "5H" : "Week"}
                      </button>
                    )}
                  </For>
                </span>
              </div>
              <div class={s.row}>
                <span>Warn at {Math.round(acct().warnAt * 100)}%</span>
                <input type="range" min="50" max="95" step="5" value={acct().warnAt * 100} onInput={(e) => patch(acct().key, (a) => ({ ...a, warnAt: Number(e.currentTarget.value) / 100, warned: [] }))} />
              </div>
              <label class={s.row}>
                <span>Notify at the threshold and when spent</span>
                <input type="checkbox" class={s.toggle} checked={acct().notify} onChange={(e) => patch(acct().key, (a) => ({ ...a, notify: e.currentTarget.checked }))} />
              </label>
              <label class={s.row}>
                <span>
                  Read usage from the keychain
                  <span class={s.hint}>Reads this account's OAuth token. Off unless you turn it on.</span>
                </span>
                <input
                  type="checkbox"
                  class={s.toggle}
                  checked={acct().keychain}
                  onChange={(e) => {
                    const on = e.currentTarget.checked;
                    patch(acct().key, (a) => ({ ...a, keychain: on }));
                    if (on) say(`${rowLabel(acct())} can now fill gaps from its keychain token`);
                  }}
                />
              </label>
            </div>
          </section>

          <section class={`${w.card} ${s.pane}`}>
            <div class={s.paneHead}>
              <span class={s.crumb}>Start a session</span>
            </div>
            <div class={s.rows}>
              <label class={s.row}>
                <span>Project</span>
                <select value={project()} onChange={(e) => (setProject(e.currentTarget.value), setNote(null))}>
                  <For each={projects()}>{(p) => <option value={p.name}>{`${p.name} (${p.space})`}</option>}</For>
                </select>
              </label>
              <div class={s.row}>
                <span>
                  Agents
                  <span class={s.hint}>{proj().only ? `Only ${proj().only!.map((k) => byKey(k) && rowLabel(byKey(k)!)).filter(Boolean).join(", ") || "nothing"}` : "Every agent"}</span>
                </span>
                <span class={s.ruleWrap}>
                  <button type="button" class={`${btn.btn} ${btn.default} ${btn.xs}`} onClick={(e) => (e.stopPropagation(), setRuleOpen(!ruleOpen()))}>
                    <span class={btn.label}>Agents...</span>
                  </button>
                  <Show when={ruleOpen()}>
                    <div class={s.rule} onClick={(e) => e.stopPropagation()}>
                      <div class={s.ruleTitle}>Agents for {`\u201c${proj().name}\u201d`}</div>
                      <span class={s.seg}>
                        <button type="button" aria-pressed={!proj().only} onClick={() => setProjects((l) => l.map((p) => (p.name === project() ? { ...p, only: null } : p)))}>
                          Every agent
                        </button>
                        <button type="button" aria-pressed={!!proj().only} onClick={() => setProjects((l) => l.map((p) => (p.name === project() ? { ...p, only: p.only ?? [] } : p)))}>
                          Only selected
                        </button>
                      </span>
                      <div class={s.hint}>
                        {proj().only ? "Only the agents you tick can start or resume a session in this project." : "Any agent you have configured can start a session here. Nothing to pick."}
                      </div>
                      <div class={s.ruleList} data-idle={proj().only ? undefined : ""}>
                        <For each={accounts()}>
                          {(a) => (
                            <label class={s.ruleRow}>
                              <input
                                type="checkbox"
                                disabled={!proj().only}
                                checked={!!proj().only?.includes(a.key)}
                                onChange={(e) =>
                                  setProjects((l) =>
                                    l.map((p) =>
                                      p.name === project()
                                        ? { ...p, only: e.currentTarget.checked ? [...(p.only ?? []), a.key] : (p.only ?? []).filter((k) => k !== a.key) }
                                        : p,
                                    ),
                                  )
                                }
                              />
                              <AgentMark agent={a.agent} size={12} />
                              {AGENT_NAME[a.agent]}
                              <span class={s.dim}>{a.email}</span>
                            </label>
                          )}
                        </For>
                      </div>
                    </div>
                  </Show>
                </span>
              </div>
              <label class={s.row}>
                <span>Run as</span>
                <select value={runAs()} onChange={(e) => (setRunAs(e.currentTarget.value), setNote(null))}>
                  <For each={accounts()}>{(a) => <option value={a.key}>{rowLabel(a)}</option>}</For>
                </select>
              </label>
              <div class={s.startRow}>
                <button type="button" class={`${btn.btn} ${btn.primary} ${btn.sm}`} onClick={start}>
                  <span class={btn.label}>New session</span>
                </button>
                <span class={s.hint}>Each turn spends from that account's windows.</span>
              </div>
              <Show when={note()}>
                <div class={s.note} data-bad={note()!.bad ? "" : undefined}>
                  {note()!.text}
                </div>
              </Show>
            </div>
            <div class={s.group}>Right now</div>
            <div class={s.meters}>
              <Index each={accounts()}>
                {(a) => (
                  <button type="button" class={s.meter} onClick={(e) => (e.stopPropagation(), setCard({ agent: a().agent, key: a().key }))}>
                    <span class={s.meterName}>
                      <AgentMark agent={a().agent} size={12} />
                      {rowLabel(a())}
                    </span>
                    <For each={a().windows}>
                      {(x) => (
                        <span class={s.meterBar} data-band={band(x)} title={`${NAMES[x.kind].label}: ${Math.round(x.util * 100)}%`}>
                          <i style={{ width: `${Math.min(100, x.util * 100)}%` }} />
                        </span>
                      )}
                    </For>
                  </button>
                )}
              </Index>
            </div>
          </section>
        </div>
        <Show when={card()}>
          <Card />
        </Show>
      </DemoWindow>
    </div>
  );
}
