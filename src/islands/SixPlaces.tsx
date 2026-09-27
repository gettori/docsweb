import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { ChevronRight, Globe, Workflow } from "lucide";
import "../app/css/tokens.css";
import { Icon, ProjectRow, StatusBubble, Tab, TabMark, type Rollup } from "../app/kit";
import sidebar from "../app/css/LeftSidebar.module.css";
import rows from "../app/css/SidebarRows.module.css";
import { ChromeIcon, FinderIcon, SlackIcon } from "./DockIcons";
import s from "./SixPlaces.module.css";

const STATES = [
  { label: "Working", c: "var(--work)", hi: "var(--work-hi)", wash: "rgba(192,132,252,.16)" },
  { label: "Needs you", c: "var(--need)", hi: "var(--need-hi)", wash: "rgba(251,113,133,.18)" },
  { label: "Done", c: "var(--done)", hi: "var(--done-hi)", wash: "rgba(45,212,191,.14)" },
];

export default function SixPlaces() {
  const [tick, setTick] = createSignal(0);
  const [pin, setPin] = createSignal<number | null>(null);
  const si = () => pin() ?? tick() % 3;
  const need = () => si() === 1;
  const rollup = (): Rollup => (si() === 0 ? { executing: 2 } : si() === 1 ? { waiting: 1, executing: 1 } : { executing: 1, idle: 1 });
  let root!: HTMLDivElement;

  onMount(() => {
    let visible = false;
    const io = new IntersectionObserver((e) => (visible = e[0].isIntersecting));
    io.observe(root);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = setInterval(() => {
      if (visible && !document.hidden && !reduced) setTick((n) => n + 1);
    }, 2600);
    onCleanup(() => {
      clearInterval(id);
      io.disconnect();
    });
  });

  const tile = (label: string, body: () => any) => (
    <div class={s.tile} style={{ "--wash": STATES[si()].wash }}>
      <div class={s.tileBody}>{body()}</div>
      <div class={s.tileLabel}>{label}</div>
    </div>
  );

  return (
    <div ref={root} class={s.wrap} style={{ "--state": STATES[si()].hi }}>
      <div class={s.head}>
        <h2 class={s.h2}>
          One status. <span class={s.accent}>Six places.</span>
        </h2>
        <div class={s.headRight}>
          <p>Sidebar, tabs, menu bar, Dock, notifications and your phone read the same status, composed once by the app. Flip it and watch them agree.</p>
          <div class={s.segs} role="group" aria-label="Session state">
            <For each={STATES}>
              {(st, i) => (
                <button
                  type="button"
                  class={s.seg}
                  aria-pressed={i() === si()}
                  style={i() === si() ? { background: st.wash, color: st.hi } : undefined}
                  onClick={() => setPin(pin() === i() ? null : i())}
                >
                  <span class={s.segDot} style={{ background: st.c }} />
                  {st.label}
                </button>
              )}
            </For>
          </div>
        </div>
      </div>

      <div class={s.grid}>
        {tile("Menu bar", () => (
          <div class={s.menubar}>
            <div class={s.bar}>
              <svg width="13" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9-.1 0-2.7-1-2.7-4.1zM13.9 5c.7-.9 1.2-2 1-3.2-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.5z" />
              </svg>
              <b>Tori</b>
              <span>File</span>
              <span>Edit</span>
              <span class={s.tray} aria-label="Tori menu bar icon" />
              <span class={s.clock}>10:52</span>
            </div>
            <div class={s.menu}>
              <Show when={need()}>
                <div class={s.menuItem}>{"\u26a0"} Sign webhook payloads (api)</div>
              </Show>
              <Show when={!need()}>
                <div class={s.menuItem}>Sign webhook payloads (api)</div>
              </Show>
              <div class={s.menuItem}>Cap the rate limiter (api)</div>
              <div class={s.menuSep} />
              <div class={s.menuMuted}>{need() ? "Tori - 2 running, 1 need you" : si() === 2 ? "Tori - 1 running" : "Tori - 2 running"}</div>
            </div>
          </div>
        ))}

        {tile("Dock", () => (
          <div class={s.dock}>
            <span class={s.app}>
              <FinderIcon size={50} />
            </span>
            <span class={s.app}>
              <ChromeIcon size={50} />
            </span>
            <span class={s.toriApp} classList={{ [s.bounce]: need() }}>
              <img src="/app-icon.png" alt="" />
              <Show when={need()}>
                <span class={s.badge}>1</span>
              </Show>
              <i class={s.running} />
            </span>
            <span class={s.app}>
              <SlackIcon size={50} />
            </span>
          </div>
        ))}

        {tile("Sidebar, rolled up", () => (
          <div class={`${s.tree} ${sidebar.tree} ${rows.rowScope}`}>
            <ProjectRow name="api" icon={Globe} end={<StatusBubble rollup={rollup()} />} />
            <ProjectRow name="web" icon={Workflow} end={<StatusBubble rollup={{ executing: 1, idle: 2 }} />} />
          </div>
        ))}

        {tile("Tabs", () => (
          <div class={s.strip}>
            <Tab
              selected
              label="Sign webhook payloads"
              icon={<TabMark agent="claude" status={si() === 0 ? "working" : si() === 1 ? "needs" : "idle"} />}
            />
            <Tab label="Cap the rate limiter" icon={<TabMark agent="codex" status="working" />} />
          </div>
        ))}

        {tile("Notifications, only when needed", () => (
          <div class={s.notifSlot}>
            <div class={s.noNotif} style={{ opacity: need() ? 0 : 1 }}>
              No notification. Nothing needs you.
            </div>
            <div class={s.notif} classList={{ [s.notifOn]: need() }}>
              <img src="/app-icon.png" alt="" />
              <div class={s.notifText}>
                <b>Sign webhook payloads</b>
                <span>api needs you</span>
              </div>
              <span class={s.now}>now</span>
            </div>
          </div>
        ))}

        {tile("Phone", () => (
          <div class={s.phone}>
            <div class={s.island} />
            <div class={s.phoneHead}>
              Work <span>{"\u00b7 Spaces"}</span>
            </div>
            <div class={s.phoneRow} classList={{ [s.phoneRowNeed]: need() }}>
              <span class={s.phoneMark}>
                <Icon icon={Globe} size={13} />
              </span>
              <span class={s.phoneName}>
                api<small>2 worktrees {"\u00b7"} 2 sessions</small>
              </span>
              <StatusBubble rollup={rollup()} />
              <Icon icon={ChevronRight} size={13} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
