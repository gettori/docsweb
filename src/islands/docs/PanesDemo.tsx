import { createMemo, createSignal, For, Match, onCleanup, Show, Switch, type JSX } from "solid-js";
import { Ellipsis, FilePlus, MessageSquarePlus, PanelBottom, Pin, Settings2, SquareTerminal, X } from "lucide";
import { AgentMark, Icon } from "../../app/kit";
import w from "../../app/window.module.css";
import tab from "../../app/css/Tab.module.css";
import DemoWindow, { useToast } from "./DemoWindow";
import s from "./PanesDemo.module.css";

type Kind = "terminal" | "chat" | "file";
type T = { id: string; kind: Kind; label: string };
type Pane = { id: string; tabs: T[]; active: string | null; pin?: Kind };
type Node = { pane: Pane } | { dir: "row" | "col"; a: Node; b: Node };
type Where = "left" | "right";
type Zone = "center" | "right" | "down";

const KIND_NAME: Record<Kind, string> = { terminal: "terminals", chat: "chats", file: "files" };
const MAX_PANES = 4;
const MAX_DEPTH = 2;

let seq = 0;
const id = (p: string) => `${p}${++seq}`;
const t = (kind: Kind, label: string): T => ({ id: id("t"), kind, label });

const START = (): Node => ({
  dir: "row",
  a: { pane: { id: id("p"), tabs: [t("chat", "Claude"), t("terminal", "zsh"), t("terminal", "pnpm dev")], active: null } },
  b: { pane: { id: id("p"), tabs: [t("file", "rank.ts"), t("file", "server.ts"), t("file", "rank.test.ts")], active: null } },
});
const FILES = ["corpus.ts", "tokenize.ts", "bm25.ts", "store.ts", "package.json", "README.md"];
const DOCK: T[] = [t("terminal", "pnpm install"), t("terminal", "gh auth login")];

const isPane = (n: Node): n is { pane: Pane } => "pane" in n;
function panesOf(n: Node): Pane[] {
  return isPane(n) ? [n.pane] : [...panesOf(n.a), ...panesOf(n.b)];
}
function depthOf(n: Node, pid: string, d = 0): number {
  if (isPane(n)) return n.pane.id === pid ? d : -1;
  return Math.max(depthOf(n.a, pid, d + 1), depthOf(n.b, pid, d + 1));
}
function mapPanes(n: Node, fn: (p: Pane) => Node): Node {
  return isPane(n) ? fn(n.pane) : { dir: n.dir, a: mapPanes(n.a, fn), b: mapPanes(n.b, fn) };
}
// A pane with no tabs left is dropped, and its sibling takes the parent's place.
function prune(n: Node): Node | null {
  if (isPane(n)) return n.pane.tabs.length ? n : null;
  const a = prune(n.a);
  const b = prune(n.b);
  return a && b ? { dir: n.dir, a, b } : (a ?? b);
}
const activeOf = (p: Pane) => p.tabs.find((x) => x.id === p.active) ?? p.tabs[0];
const widthOf = (x: T) => 46 + x.label.length * 7.2;

export default function PanesDemo() {
  const { toast, say } = useToast();
  const [tree, setTree] = createSignal<Node>(START());
  const [focused, setFocused] = createSignal(panesOf(tree())[0]!.id);
  const [widths, setWidths] = createSignal<Record<string, number>>({});
  const [menu, setMenu] = createSignal<{ x: number; y: number; items: [string, (() => void) | null][] } | null>(null);
  const [drag, setDrag] = createSignal<string | null>(null);
  const [drop, setDrop] = createSignal<{ pane: string; zone: Zone } | null>(null);
  const [dock, setDock] = createSignal(true);
  const [dockActive, setDockActive] = createSignal(DOCK[0]!.id);
  const [settings, setSettings] = createSignal(false);
  const [rule, setRule] = createSignal<Record<Kind, Where>>({ terminal: "left", chat: "left", file: "right" });
  let root!: HTMLDivElement;

  const panes = createMemo(() => panesOf(tree()));
  const indexOf = (pid: string) => panes().findIndex((p) => p.id === pid);
  const paneOfTab = (tid: string) => panes().find((p) => p.tabs.some((x) => x.id === tid));

  function commit(next: Node | null) {
    if (!next) return;
    setTree(next);
    if (!panesOf(next).some((p) => p.id === focused())) setFocused(panesOf(next)[0]!.id);
  }
  function select(pid: string, tid: string) {
    setFocused(pid);
    setTree((n) => mapPanes(n, (p) => ({ pane: p.id === pid ? { ...p, active: tid } : p })));
  }
  function closeTab(tid: string) {
    const p = paneOfTab(tid)!;
    if (panes().length === 1 && p.tabs.length === 1) return say("The last pane keeps its last tab");
    commit(prune(mapPanes(tree(), (x) => ({ pane: { ...x, tabs: x.tabs.filter((y) => y.id !== tid), active: x.active === tid ? null : x.active } }))));
  }
  function refuse(pane: Pane, x: T) {
    if (pane.pin && pane.pin !== x.kind) {
      say(`That pane only takes ${KIND_NAME[pane.pin]}`);
      return true;
    }
    return false;
  }
  function move(tid: string, to: string) {
    const from = paneOfTab(tid)!;
    const target = panes().find((p) => p.id === to)!;
    const x = from.tabs.find((y) => y.id === tid)!;
    if (from.id === to || refuse(target, x)) return;
    commit(
      prune(
        mapPanes(tree(), (p) => ({
          pane:
            p.id === from.id
              ? { ...p, tabs: p.tabs.filter((y) => y.id !== tid), active: p.active === tid ? null : p.active }
              : p.id === to
                ? { ...p, tabs: [...p.tabs, x], active: tid }
                : p,
        })),
      ),
    );
    setFocused(to);
  }
  function split(tid: string, dir: "row" | "col", at?: string) {
    const from = paneOfTab(tid)!;
    const host = at ?? from.id;
    if (panes().length >= MAX_PANES) return say("Four panes is the most one workspace holds");
    if (depthOf(tree(), host) >= MAX_DEPTH) return say("That pane is already two splits deep");
    if (host === from.id && from.tabs.length === 1) return say("A pane needs a second tab to split one off");
    const x = from.tabs.find((y) => y.id === tid)!;
    const fresh: Pane = { id: id("p"), tabs: [x], active: tid };
    const without = mapPanes(tree(), (p) => ({ pane: p.id === from.id ? { ...p, tabs: p.tabs.filter((y) => y.id !== tid), active: p.active === tid ? null : p.active } : p }));
    const next = mapPanes(without, (p) => (p.id === host ? { dir, a: { pane: p }, b: { pane: fresh } } : { pane: p }));
    commit(prune(next));
    setFocused(fresh.id);
  }
  function closePane(pid: string) {
    if (panes().length === 1) return say("The last pane cannot be closed");
    const i = indexOf(pid);
    const list = panes();
    const into = list[i + 1] ?? list[i - 1]!;
    const gone = list[i]!;
    commit(
      prune(
        mapPanes(tree(), (p) => ({
          pane: p.id === pid ? { ...p, tabs: [] } : p.id === into.id ? { ...p, tabs: [...p.tabs, ...gone.tabs] } : p,
        })),
      ),
    );
    setFocused(into.id);
    say(`Closed the pane. Its ${gone.tabs.length} tab${gone.tabs.length === 1 ? "" : "s"} moved to the next one over.`);
  }
  function pin(pid: string, kind: Kind | undefined) {
    setTree((n) => mapPanes(n, (p) => ({ pane: p.id === pid ? { ...p, pin: kind } : p })));
    say(kind ? `Pane ${indexOf(pid) + 1} now only takes ${KIND_NAME[kind]}` : `Pane ${indexOf(pid) + 1} takes anything again`);
  }
  function open(kind: Kind) {
    const label = kind === "terminal" ? "zsh" : kind === "chat" ? "Codex" : FILES[seq % FILES.length]!;
    const x = t(kind, label);
    const ordered = rule()[kind] === "left" ? panes() : [...panes()].reverse();
    const target = ordered.find((p) => !p.pin || p.pin === kind);
    if (!target) return say(`Every pane is pinned to something other than ${KIND_NAME[kind]}`);
    setTree((n) => mapPanes(n, (p) => ({ pane: p.id === target.id ? { ...p, tabs: [...p.tabs, x], active: x.id } : p })));
    setFocused(target.id);
  }

  function showMenu(e: MouseEvent, items: [string, (() => void) | null][]) {
    e.preventDefault();
    e.stopPropagation();
    const r = root.getBoundingClientRect();
    setMenu({ x: Math.min(e.clientX - r.left, r.width - 220), y: e.clientY - r.top, items });
  }
  function tabMenu(e: MouseEvent, pane: Pane, x: T) {
    const others = panes().filter((p) => p.id !== pane.id);
    const i = pane.tabs.findIndex((y) => y.id === x.id);
    showMenu(e, [
      ...others.map((p): [string, () => void] => [`Move to pane ${indexOf(p.id) + 1}`, () => move(x.id, p.id)]),
      ["Split the pane to the right", () => split(x.id, "row")],
      ["Split the pane below", () => split(x.id, "col")],
      [pane.pin ? "Unpin this pane" : `Pin this pane to ${KIND_NAME[x.kind]}`, () => pin(pane.id, pane.pin ? undefined : x.kind)],
      ["Close others", pane.tabs.length > 1 ? () => pane.tabs.filter((y) => y.id !== x.id).forEach((y) => closeTab(y.id)) : null],
      ["Close to the right", i < pane.tabs.length - 1 ? () => pane.tabs.slice(i + 1).forEach((y) => closeTab(y.id)) : null],
      ...(x.kind === "file"
        ? ([
            ["Reveal in Finder", () => say(`Revealed ${x.label} in Finder`)],
            ["Open file history", () => say(`Opened the history of ${x.label}`)],
          ] as [string, () => void][])
        : []),
    ]);
  }

  function onKey(e: KeyboardEvent) {
    const p = panes().find((x) => x.id === focused());
    if (e.key === "Escape") return setMenu(null), setSettings(false);
    if (e.ctrlKey && e.metaKey && e.key.toLowerCase() === "j") {
      e.preventDefault();
      return setDock((d) => !d);
    }
    if (!p) return;
    if (e.ctrlKey && e.key === "Tab") {
      e.preventDefault();
      const i = p.tabs.indexOf(activeOf(p)!);
      const n = p.tabs.length;
      return select(p.id, p.tabs[(i + (e.shiftKey ? n - 1 : 1)) % n]!.id);
    }
    if ((e.metaKey || e.altKey) && /^[1-9]$/.test(e.key)) {
      const x = p.tabs[Number(e.key) - 1];
      if (!x) return;
      e.preventDefault();
      select(p.id, x.id);
    }
  }

  const TabPill = (props: { pane: Pane; x: T; selected: boolean }) => (
    <span class={`${tab.pill} ${s.pill}`} data-tab-pill="" data-dragging={drag() === props.x.id ? "" : undefined}>
      <button
        type="button"
        class={tab.tab}
        data-selected={props.selected ? "" : undefined}
        draggable={true}
        onDragStart={(e) => {
          e.dataTransfer?.setData("text/plain", props.x.id);
          setDrag(props.x.id);
        }}
        onDragEnd={() => (setDrag(null), setDrop(null))}
        onClick={() => select(props.pane.id, props.x.id)}
        onContextMenu={(e) => tabMenu(e, props.pane, props.x)}
      >
        <Icon16 kind={props.x.kind} label={props.x.label} />
        <span class={tab.label}>{props.x.label}</span>
      </button>
      <button type="button" class={tab.close} aria-label={`Close ${props.x.label}`} onClick={() => closeTab(props.x.id)}>
        <Icon icon={X} />
      </button>
    </span>
  );

  const PaneView = (props: { pane: Pane }) => {
    const [more, setMore] = createSignal(false);
    const shown = createMemo(() => {
      const p = props.pane;
      const room = (widths()[p.id] ?? 400) - 64;
      const out: T[] = [];
      let used = 0;
      for (const x of p.tabs) {
        const need = widthOf(x);
        if (used + need > room - (out.length < p.tabs.length - 1 ? 40 : 0)) break;
        out.push(x);
        used += need;
      }
      const act = activeOf(p);
      if (act && !out.includes(act)) out.splice(Math.max(0, out.length - 1), 1, act);
      return out.length ? out : act ? [act] : [];
    });
    const hidden = () => props.pane.tabs.filter((x) => !shown().includes(x));
    const act = () => activeOf(props.pane);
    let stripEl!: HTMLDivElement;
    let ro: ResizeObserver | undefined;
    onCleanup(() => ro?.disconnect());
    const zoneAt = (e: DragEvent): Zone => {
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const fx = (e.clientX - r.left) / r.width;
      const fy = (e.clientY - r.top) / r.height;
      return fx > 0.7 && fx - 0.7 > fy - 0.7 ? "right" : fy > 0.7 ? "down" : "center";
    };
    return (
      <section class={`${w.card} ${s.pane}`} data-focused={focused() === props.pane.id ? "" : undefined} onMouseDown={() => setFocused(props.pane.id)}>
        <div
          ref={(el) => {
            stripEl = el;
            ro = new ResizeObserver(() => setWidths((m) => ({ ...m, [props.pane.id]: stripEl.clientWidth })));
            ro.observe(el);
          }}
          class={`${w.strip} ${s.strip}`}
          onDragOver={(e) => {
            if (!drag()) return;
            e.preventDefault();
            setDrop({ pane: props.pane.id, zone: "center" });
          }}
          onDrop={(e) => {
            e.preventDefault();
            const tid = drag();
            setDrag(null);
            setDrop(null);
            if (tid) move(tid, props.pane.id);
          }}
        >
          <For each={shown()}>{(x) => <TabPill pane={props.pane} x={x} selected={x.id === act()?.id} />}</For>
          <Show when={hidden().length}>
            <span class={s.moreWrap}>
              <button type="button" class={s.plusN} aria-expanded={more()} onClick={(e) => (e.stopPropagation(), setMore(!more()))}>
                +{hidden().length}
              </button>
              <Show when={more()}>
                <div class={s.dropdown} onClick={(e) => e.stopPropagation()}>
                  <For each={hidden()}>
                    {(x) => (
                      <button type="button" class={s.option} onClick={() => (select(props.pane.id, x.id), setMore(false))}>
                        <Icon16 kind={x.kind} label={x.label} />
                        {x.label}
                      </button>
                    )}
                  </For>
                </div>
              </Show>
            </span>
          </Show>
          <span class={s.stripEnd}>
            <Show when={props.pane.pin}>
              <span class={s.pinned} title={`Only takes ${KIND_NAME[props.pane.pin!]}`}>
                <Icon icon={Pin} size={12} />
                {KIND_NAME[props.pane.pin!]}
              </span>
            </Show>
            <button
              type="button"
              class={s.iconBtn}
              aria-label={`Pane ${indexOf(props.pane.id) + 1} actions`}
              onClick={(e) =>
                showMenu(e, [
                  ["Close pane", panes().length > 1 ? () => closePane(props.pane.id) : null],
                  ...(props.pane.pin
                    ? ([["Unpin this pane", () => pin(props.pane.id, undefined)]] as [string, () => void][])
                    : (["terminal", "chat", "file"] as Kind[]).map((k): [string, () => void] => [`Pin to ${KIND_NAME[k]}`, () => pin(props.pane.id, k)])),
                ])
              }
            >
              <Icon icon={Ellipsis} size={14} />
            </button>
          </span>
        </div>
        <div
          class={s.body}
          onDragOver={(e) => {
            if (!drag()) return;
            e.preventDefault();
            setDrop({ pane: props.pane.id, zone: zoneAt(e) });
          }}
          onDragLeave={(e) => !(e.currentTarget as HTMLElement).contains(e.relatedTarget as globalThis.Node) && setDrop(null)}
          onDrop={(e) => {
            e.preventDefault();
            const tid = drag();
            const z = drop()?.zone ?? "center";
            setDrag(null);
            setDrop(null);
            if (!tid) return;
            if (z === "center") move(tid, props.pane.id);
            else split(tid, z === "right" ? "row" : "col", props.pane.id);
          }}
        >
          <Show when={act()}>{(x) => <Content x={x()} />}</Show>
          <Show when={drop()?.pane === props.pane.id}>
            <div class={s.drop} data-zone={drop()!.zone} />
          </Show>
        </div>
      </section>
    );
  };

  const NodeView = (props: { n: Node }): JSX.Element => (
    <Show when={!isPane(props.n) && props.n} fallback={<PaneView pane={(props.n as { pane: Pane }).pane} />}>
      {(sp) => (
        <div class={s.split} data-dir={sp().dir}>
          <NodeView n={sp().a} />
          <NodeView n={sp().b} />
        </div>
      )}
    </Show>
  );

  const dockTab = () => DOCK.find((x) => x.id === dockActive())!;

  return (
    <div
      ref={root}
      class={s.root}
      onKeyDown={onKey}
      onClick={() => {
        setMenu(null);
        setSettings(false);
      }}
    >
      <DemoWindow
        crumbs={["hooli", "hooli-search", "fix/search-ranking"]}
        toast={toast()}
        minHeight={520}
        end={
          <span class={s.tools}>
            <button type="button" class={s.iconBtn} title="New terminal" aria-label="New terminal" onClick={() => open("terminal")}>
              <Icon icon={SquareTerminal} size={15} />
            </button>
            <button type="button" class={s.iconBtn} title="New chat" aria-label="New chat" onClick={() => open("chat")}>
              <Icon icon={MessageSquarePlus} size={15} />
            </button>
            <button type="button" class={s.iconBtn} title="Open a file" aria-label="Open a file" onClick={() => open("file")}>
              <Icon icon={FilePlus} size={15} />
            </button>
            <button type="button" class={s.iconBtn} title="Show or hide the dock" aria-pressed={dock()} aria-label="Show or hide the dock" onClick={() => setDock((d) => !d)}>
              <Icon icon={PanelBottom} size={15} />
            </button>
            <span class={s.settingsWrap}>
              <button type="button" class={s.iconBtn} title="Settings > Panes" aria-label="Pane settings" aria-expanded={settings()} onClick={(e) => (e.stopPropagation(), setSettings(!settings()))}>
                <Icon icon={Settings2} size={15} />
              </button>
              <Show when={settings()}>
                <div class={s.settings} onClick={(e) => e.stopPropagation()}>
                  <div class={s.settingsHead}>Settings {"\u203a"} Panes</div>
                  <For each={["terminal", "chat", "file"] as Kind[]}>
                    {(k) => (
                      <div class={s.setting}>
                        <span>{k === "terminal" ? "Terminals" : k === "chat" ? "Chats" : "Files"} open in</span>
                        <span class={s.seg}>
                          <For each={["left", "right"] as Where[]}>
                            {(wh) => (
                              <button type="button" class={s.segBtn} aria-pressed={rule()[k] === wh} onClick={() => setRule((r) => ({ ...r, [k]: wh }))}>
                                {wh === "left" ? "Leftmost" : "Rightmost"}
                              </button>
                            )}
                          </For>
                        </span>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </span>
          </span>
        }
      >
        <div class={s.stack}>
          <div class={s.tree}>
            <NodeView n={tree()} />
          </div>
          <Show when={dock()}>
            <section class={`${w.card} ${s.dock}`}>
              <div class={`${w.strip} ${s.strip} ${s.dockStrip}`}>
                <span class={s.dockLabel}>Dock</span>
                <For each={DOCK}>
                  {(x) => (
                    <span class={`${tab.pill} ${s.pill}`} data-tab-pill="">
                      <button type="button" class={tab.tab} data-selected={dockActive() === x.id ? "" : undefined} onClick={() => setDockActive(x.id)}>
                        <Icon icon={SquareTerminal} />
                        <span class={tab.label}>{x.label}</span>
                      </button>
                    </span>
                  )}
                </For>
              </div>
              <div class={s.dockBody}>
                <Show
                  when={dockTab().label === "pnpm install"}
                  fallback={
                    <>
                      <div>$ gh auth login</div>
                      <div class={s.out}>{"! First copy your one-time code: 4F2A-9C1E"}</div>
                    </>
                  }
                >
                  <div>$ pnpm install</div>
                  <div class={s.out}>Done in 2.1s using pnpm v10</div>
                </Show>
              </div>
            </section>
          </Show>
        </div>
      </DemoWindow>
      <Show when={menu()}>
        {(m) => (
          <div class={s.menu} style={{ left: `${m().x}px`, top: `${m().y}px` }} role="menu" onClick={(e) => e.stopPropagation()}>
            <For each={m().items}>
              {([label, run]) => (
                <button type="button" role="menuitem" class={s.option} disabled={!run} onClick={() => (setMenu(null), run?.())}>
                  {label}
                </button>
              )}
            </For>
          </div>
        )}
      </Show>
    </div>
  );
}

function Icon16(props: { kind: Kind; label: string }) {
  return (
    <Switch>
      <Match when={props.kind === "chat"}>
        <AgentMark agent={props.label === "Codex" ? "codex" : "claude"} size={14} />
      </Match>
      <Match when={props.kind === "terminal"}>
        <Icon icon={SquareTerminal} />
      </Match>
      <Match when={props.kind === "file"}>
        <span class={s.glyph} data-ext={props.label.split(".").pop()}>
          {props.label.endsWith(".json") ? "{}" : props.label.endsWith(".md") ? "MD" : "TS"}
        </span>
      </Match>
    </Switch>
  );
}

function Content(props: { x: T }) {
  return (
    <Switch>
      <Match when={props.x.kind === "terminal"}>
        <div class={s.term}>
          <Show
            when={props.x.label === "pnpm dev"}
            fallback={
              <>
                <div>
                  <span class={s.prompt}>search-ranking $</span> git status --short
                </div>
                <div class={s.out}> M src/rank.ts</div>
                <div class={s.out}> M src/server.ts</div>
                <div>
                  <span class={s.prompt}>search-ranking $</span> <span class={s.cursor} />
                </div>
              </>
            }
          >
            <div>
              <span class={s.prompt}>search-ranking $</span> pnpm dev
            </div>
            <div class={s.out}>listening on http://localhost:3000</div>
            <div class={s.out}>GET /search?q=phone 200 4ms</div>
          </Show>
        </div>
      </Match>
      <Match when={props.x.kind === "chat"}>
        <div class={s.chat}>
          <div class={w.user}>Weight title hits over body hits in rank.ts</div>
          <div class={w.prose}>Title hits now count 2.5 times a body hit. The 18 rank tests pass.</div>
        </div>
      </Match>
      <Match when={props.x.kind === "file"}>
        <div class={s.code}>
          <For each={[`// ${props.x.label}`, "export function rank(docs, q) {", "  const terms = tokenize(q);", "  return score(docs, terms);", "}"]}>
            {(l, i) => (
              <div class={s.line}>
                <span class={s.ln}>{i() + 1}</span>
                <span class={i() === 0 ? s.cm : ""}>{l}</span>
              </div>
            )}
          </For>
        </div>
      </Match>
    </Switch>
  );
}
