import {
  createMemo,
  createSignal,
  For,
  Match,
  onCleanup,
  onMount,
  Show,
  Switch,
  type JSX,
} from "solid-js";
import {
  ChevronLeft,
  ChevronRight,
  Keyboard,
  Link,
  QrCode,
  Search,
  Settings,
  Smartphone,
} from "lucide";
import { Icon } from "../../app/kit";
import { CheckMark, QuestionMark, WorkingMark } from "../../app/statusMarks";
import btn from "../../app/css/Button.module.css";
import DemoWindow, { useToast } from "./DemoWindow";
import PhoneFrame from "./PhoneFrame";
import s from "./PairingDemo.module.css";

type Iface = {
  address: string;
  label: string;
  kind: "lan" | "tailscale" | "loopback";
};
const IFACES: Iface[] = [
  { address: "100.84.12.7", label: "Tailscale", kind: "tailscale" },
  { address: "192.168.1.20", label: "en0", kind: "lan" },
  { address: "127.0.0.1", label: "this Mac only", kind: "loopback" },
];
const PORT = 47821;
const TTL = 5 * 60 * 1000;
const TRIES = 5;

type Offer = { code: string; url: string; expires: number; wrong: number };
type Ended = "used" | "burned" | "cancelled" | "expired";
const ENDED: Record<Ended, string> = {
  used: "Paired.",
  burned: "Too many wrong codes; the code no longer works.",
  cancelled: "Pairing cancelled.",
  expired: "The code expired.",
};
type Device = { name: string; url: string };
type Screen = "pair" | "home" | "project" | "chat";

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function newCode(seed: number) {
  let n = seed & 0x7fffffff;
  const pick = () =>
    ALPHA[
      ((n = (Math.imul(n, 1103515245) + 12345) & 0x7fffffff) >>> 16) %
        ALPHA.length
    ];
  return `${pick()}${pick()}${pick()}${pick()}-${pick()}${pick()}${pick()}${pick()}`;
}

// A made up code with the three finder squares, seeded by the pairing code so a
// new offer draws a new picture. Nothing scans it.
const QR = 25;
function qrPath(code: string) {
  const finder = (x: number, y: number) => {
    for (const [ox, oy] of [
      [0, 0],
      [QR - 7, 0],
      [0, QR - 7],
    ] as const) {
      const dx = x - ox;
      const dy = y - oy;
      if (dx >= 0 && dx < 7 && dy >= 0 && dy < 7)
        return dx === 0 ||
          dx === 6 ||
          dy === 0 ||
          dy === 6 ||
          (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4)
          ? 1
          : 0;
      if (dx >= -1 && dx <= 7 && dy >= -1 && dy <= 7) return 0;
    }
    return -1;
  };
  let seed =
    [...code].reduce((a, ch) => (Math.imul(a, 31) + ch.charCodeAt(0)) | 0, 7) &
    0x7fffffff;
  let d = "";
  for (let y = 0; y < QR; y++)
    for (let x = 0; x < QR; x++) {
      seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff;
      const f = finder(x, y);
      if (f === 1 || (f === -1 && (seed >>> 16) % 100 < 47))
        d += `M${x} ${y}h1v1h-1z`;
    }
  return d;
}
const clock = (ms: number) => {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
};
const today = () =>
  new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export default function PairingDemo() {
  const { toast, say } = useToast();
  const [on, setOn] = createSignal(true);
  const [address, setAddress] = createSignal(IFACES[0]!.address);
  const [offer, setOffer] = createSignal<Offer | null>(null);
  const [ended, setEnded] = createSignal<Ended | null>(null);
  const [devices, setDevices] = createSignal<Device[]>([]);
  const [now, setNow] = createSignal(Date.now());
  const [pop, setPop] = createSignal(false);

  const [screen, setScreen] = createSignal<Screen>("pair");
  const [notice, setNotice] = createSignal<string | null>(null);
  const [typed, setTyped] = createSignal(false);
  const [url, setUrl] = createSignal("");
  const [code, setCode] = createSignal("");
  const [name, setName] = createSignal("Richard's Pixel");
  const [mine, setMine] = createSignal<string | null>(null);
  const [answered, setAnswered] = createSignal<"allow" | "deny" | null>(null);

  const listening = () => on() && address() !== "";
  const wsUrl = () => `ws://${address()}:${PORT}`;
  // The phone reaches the Mac only at the address it paired with.
  const live = (d: Device) => d.name === mine() && on() && d.url === wsUrl();
  const connected = () => devices().filter(live).length;
  const phoneOnline = () => devices().some(live);

  onMount(() => {
    const t = window.setInterval(() => {
      setNow(Date.now());
      const o = offer();
      if (o && Date.now() >= o.expires) end("expired");
    }, 1000);
    onCleanup(() => clearInterval(t));
  });

  function end(why: Ended) {
    setOffer(null);
    setEnded(why);
  }
  function startPairing() {
    setEnded(null);
    setOffer({
      code: newCode(Date.now()),
      url: wsUrl(),
      expires: Date.now() + TTL,
      wrong: 0,
    });
    setNow(Date.now());
  }
  function toggleRemote(v: boolean) {
    setOn(v);
    if (!v && offer()) end("cancelled");
  }
  function revoke(n: string) {
    setDevices((l) => l.filter((d) => d.name !== n));
    if (mine() === n) {
      setMine(null);
      setScreen("pair");
      setAnswered(null);
      setNotice(
        "This phone was removed from Tori. Pair it again to reconnect.",
      );
    }
    say(`Revoked ${n}. Its connection closed.`);
  }

  function pair(withUrl: string, withCode: string) {
    const o = offer();
    setNotice(null);
    if (!on() || withUrl !== wsUrl() || address() === "127.0.0.1")
      return setNotice(`Could not reach Tori at ${withUrl || "that address"}.`);
    if (!o)
      return setNotice(
        "No pairing code is open on the Mac. Press Pair a device there first.",
      );
    if (withCode.trim().toUpperCase() !== o.code) {
      const wrong = o.wrong + 1;
      if (wrong >= TRIES) {
        end("burned");
        return setNotice("Too many wrong codes. Start a new one on the Mac.");
      }
      setOffer({ ...o, wrong });
      return setNotice(
        `That code is not right. ${TRIES - wrong} ${TRIES - wrong === 1 ? "try" : "tries"} left.`,
      );
    }
    const n = name().trim() || "Phone";
    const replaced = devices().some((d) => d.name === n);
    setDevices((l) => [
      ...l.filter((d) => d.name !== n),
      { name: n, url: withUrl },
    ]);
    setMine(n);
    end("used");
    setScreen("home");
    setTyped(false);
    say(
      replaced ? `${n} paired again, replacing its old entry` : `${n} paired`,
    );
  }
  function scan() {
    const o = offer();
    if (!o)
      return setNotice("Nothing to scan yet. On the Mac, press Pair a device.");
    pair(o.url, o.code);
  }
  function answer(a: "allow" | "deny") {
    setAnswered(a);
    say(
      a === "allow"
        ? `${mine()} allowed Bash in fix/search-ranking`
        : `${mine()} denied Bash in fix/search-ranking`,
    );
  }

  const qr = createMemo(() => (offer() ? qrPath(offer()!.code) : ""));

  const Toggle = (props: {
    checked: boolean;
    onChange: (v: boolean) => void;
    label: string;
  }) => (
    <button
      type="button"
      role="switch"
      class={s.switch}
      aria-checked={props.checked}
      aria-label={props.label}
      onClick={() => props.onChange(!props.checked)}
    >
      <span class={s.thumb} />
    </button>
  );

  const Indicator = () => (
    <span class={s.indWrap}>
      <button
        type="button"
        class={s.ind}
        data-lit={connected() > 0 ? "" : undefined}
        aria-label="Phones"
        aria-expanded={pop()}
        title={
          connected()
            ? `${connected()} connected`
            : devices().length
              ? "No phone connected"
              : "Remote access is on. No phone paired yet"
        }
        onClick={(e) => (e.stopPropagation(), setPop(!pop()))}
      >
        <Icon icon={Smartphone} size={15} />
      </button>
      <Show when={pop()}>
        <div class={s.popover} onClick={(e) => e.stopPropagation()}>
          <Show when={!devices().length}>
            <div class={s.popEmpty}>No phone paired yet.</div>
          </Show>
          <For each={devices()}>
            {(d) => (
              <div class={s.device}>
                <span class={s.dot} data-on={live(d) ? "" : undefined} />
                <span class={s.devName}>{d.name}</span>
                <span class={s.devState}>
                  {live(d) ? "Connected" : "Offline"}
                </span>
                <button
                  type="button"
                  class={`${btn.btn} ${btn.danger} ${btn.xs}`}
                  onClick={() => revoke(d.name)}
                >
                  <span class={btn.label}>Revoke</span>
                </button>
              </div>
            )}
          </For>
          <label class={s.popRemote}>
            <Toggle
              checked={on()}
              onChange={toggleRemote}
              label="Remote access"
            />
            Remote access
          </label>
        </div>
      </Show>
    </span>
  );

  const Row = (props: {
    label: string;
    children: JSX.Element;
    hint?: string;
  }) => (
    <div class={s.row}>
      <span class={s.label}>{props.label}</span>
      <div class={s.control}>{props.children}</div>
      <Show when={props.hint}>
        <div class={s.hint}>{props.hint}</div>
      </Show>
    </div>
  );

  return (
    <div class={s.outer}>
      <div class={s.root} onClick={() => setPop(false)}>
        <div class={s.mac}>
          <DemoWindow
            crumbs={["Settings", "Remote"]}
            end={<Indicator />}
            toast={toast()}
            minHeight={470}
          >
            <section class={s.pane}>
              <div class={s.group}>Remote access</div>
              <Row
                label="Remote access"
                hint={
                  on()
                    ? "Keeps this Mac from idle sleeping while it is on."
                    : undefined
                }
              >
                <Toggle
                  checked={on()}
                  onChange={toggleRemote}
                  label="Remote access"
                />
              </Row>
              <Row label="Tailscale">
                <span class={s.value}>Connected as 100.84.12.7</span>
              </Row>
              <Row label="Listen on">
                <select
                  class={s.select}
                  value={address()}
                  onChange={(e) => {
                    setAddress(e.currentTarget.value);
                    if (offer()) end("cancelled");
                  }}
                  aria-label="Listen on"
                >
                  <For each={IFACES}>
                    {(i) => (
                      <option
                        value={i.address}
                      >{`${i.address} (${i.label})`}</option>
                    )}
                  </For>
                </select>
              </Row>
              <Row label="Status">
                <span class={s.value} role="status">
                  {listening() ? `Listening on ${wsUrl()}` : "Off"}
                </span>
              </Row>
              <Row label="Pair a device">
                <Show
                  when={offer()}
                  fallback={
                    <button
                      type="button"
                      class={`${btn.btn} ${btn.default} ${btn.sm}`}
                      disabled={!listening()}
                      onClick={startPairing}
                    >
                      <span class={btn.label}>Pair a device</span>
                    </button>
                  }
                >
                  <button
                    type="button"
                    class={`${btn.btn} ${btn.default} ${btn.sm}`}
                    onClick={() => end("cancelled")}
                  >
                    <span class={btn.label}>Cancel</span>
                  </button>
                </Show>
              </Row>
              <Show when={offer()}>
                {(o) => (
                  <div class={s.pairing}>
                    <svg
                      class={s.qr}
                      viewBox={`-2 -2 ${QR + 4} ${QR + 4}`}
                      role="img"
                      aria-label="Pairing QR code"
                    >
                      <rect
                        x="-2"
                        y="-2"
                        width={QR + 4}
                        height={QR + 4}
                        fill="#fff"
                      />
                      <path d={qr()} fill="#111" />
                    </svg>
                    <div class={s.pairText}>
                      <span class={s.pairCode}>{o().code}</span>
                      <span>{o().url}</span>
                      <span>Expires in {clock(o().expires - now())}</span>
                      <Show when={o().wrong}>
                        <span class={s.warn}>
                          {o().wrong} wrong {o().wrong === 1 ? "try" : "tries"},{" "}
                          {TRIES - o().wrong} left
                        </span>
                      </Show>
                    </div>
                  </div>
                )}
              </Show>
              <Show when={ended()}>
                {(why) => <div class={s.note}>{ENDED[why()]}</div>}
              </Show>
              <Row label="Paired devices">
                <span class={s.value}>
                  {devices().length === 0 ? "None" : devices().length}
                </span>
              </Row>
              <For each={devices()}>
                {(d) => (
                  <div class={s.row}>
                    <span class={s.label}>
                      <span class={s.dot} data-on={live(d) ? "" : undefined} />{" "}
                      {d.name}
                    </span>
                    <div class={s.control}>
                      <button
                        type="button"
                        class={`${btn.btn} ${btn.danger} ${btn.sm}`}
                        aria-label={`Revoke ${d.name}`}
                        onClick={() => revoke(d.name)}
                      >
                        <span class={btn.label}>Revoke</span>
                      </button>
                    </div>
                    <div class={s.hint}>
                      Paired {today()} {"\u00b7"}{" "}
                      {live(d) ? "connected" : "offline"}
                    </div>
                  </div>
                )}
              </For>
            </section>
          </DemoWindow>
        </div>

        <PhoneFrame>
          <Switch>
            <Match when={screen() === "pair"}>
              <form
                class={s.pair}
                onSubmit={(e) => {
                  e.preventDefault();
                  pair(url().trim(), code());
                }}
              >
                <header class={s.pairHead}>
                  <img class={s.pairLogo} src="/app-icon.png" alt="" />
                  <h1 class={s.pairTitle}>Pair with Tori</h1>
                  <p class={s.pairLead}>
                    Connect this phone to Tori on your Mac.
                  </p>
                </header>
                <Show when={notice()}>
                  <p class={s.notice}>{notice()}</p>
                </Show>
                <button type="button" class={s.pairCard} onClick={scan}>
                  <span class={s.pairCardIcon}>
                    <Icon icon={QrCode} size={20} strokeWidth={1.9} />
                  </span>
                  <span class={s.pairCardText}>
                    <strong>Scan the code on the Mac</strong>
                    <span>
                      In Tori on the Mac, open Settings, Remote, Pair a device,
                      and scan the code with this phone's camera.
                    </span>
                  </span>
                </button>
                <div class={s.typed} data-open={typed() ? "" : undefined}>
                  <button
                    type="button"
                    class={s.summary}
                    aria-expanded={typed()}
                    onClick={() => setTyped(!typed())}
                  >
                    <Icon icon={Keyboard} size={17} strokeWidth={1.9} />
                    <span>Type the address and code</span>
                    <Icon
                      icon={ChevronRight}
                      size={16}
                      strokeWidth={2}
                      class={s.typedChevron}
                    />
                  </button>
                  <Show when={typed()}>
                    <div class={s.typedBody}>
                      <label class={s.field}>
                        Address
                        <input
                          class={s.mono}
                          value={url()}
                          placeholder="ws://192.168.1.10:7878"
                          onInput={(e) => setUrl(e.currentTarget.value)}
                          spellcheck={false}
                        />
                      </label>
                      <label class={s.field}>
                        Code
                        <input
                          class={s.mono}
                          value={code()}
                          placeholder="XXXX-XXXX"
                          onInput={(e) => setCode(e.currentTarget.value)}
                          spellcheck={false}
                        />
                      </label>
                      <label class={s.field}>
                        This phone's name
                        <input
                          value={name()}
                          onInput={(e) => setName(e.currentTarget.value)}
                        />
                      </label>
                      <button
                        class={s.pairButton}
                        type="submit"
                        disabled={!url() || !code()}
                      >
                        <Icon icon={Link} size={15} strokeWidth={2.4} />
                        Pair
                      </button>
                    </div>
                  </Show>
                </div>
              </form>
            </Match>
            <Match when={screen() === "home"}>
              <div class={s.glow}>
                <header class={s.top}>
                  <span class={s.titles}>
                    <span class={s.bigTitle}>hooli</span>
                    <span class={s.rootLabel}>{"\u00b7"} Spaces</span>
                  </span>
                  <span class={s.circle}>
                    <Icon icon={Search} size={18} strokeWidth={2} />
                  </span>
                  <span class={s.circle}>
                    <Icon icon={Settings} size={19} strokeWidth={1.9} />
                  </span>
                </header>
                <Show when={!phoneOnline()}>
                  <p class={s.banner}>Offline, reconnecting</p>
                </Show>
                <h2 class={s.listLabel}>Projects</h2>
                <ul class={s.list}>
                  <li>
                    <button
                      type="button"
                      class={s.item}
                      onClick={() => setScreen("project")}
                    >
                      <span class={s.tile}>H</span>
                      <span class={s.text}>
                        <span class={s.name}>hooli-search</span>
                        <span class={s.meta}>
                          3 worktrees {"\u00b7"} 1 session
                        </span>
                      </span>
                      <span class={s.mark}>
                        {answered() ? (
                          <CheckMark size={15} animate />
                        ) : (
                          <QuestionMark size={15} animate />
                        )}
                      </span>
                      <Icon
                        icon={ChevronRight}
                        size={16}
                        strokeWidth={2}
                        class={s.chevron}
                      />
                    </button>
                  </li>
                  <li>
                    <button type="button" class={s.item}>
                      <span class={s.tile}>H</span>
                      <span class={s.text}>
                        <span class={s.name}>hooli-mail</span>
                        <span class={s.meta}>
                          1 worktree {"\u00b7"} 1 session
                        </span>
                      </span>
                      <span class={s.mark}>
                        <WorkingMark size={15} animate />
                      </span>
                      <Icon
                        icon={ChevronRight}
                        size={16}
                        strokeWidth={2}
                        class={s.chevron}
                      />
                    </button>
                  </li>
                  <li>
                    <button type="button" class={s.item}>
                      <span class={s.tile}>H</span>
                      <span class={s.text}>
                        <span class={s.name}>hooli-chat</span>
                        <span class={s.meta}>2 worktrees</span>
                      </span>
                      <Icon
                        icon={ChevronRight}
                        size={16}
                        strokeWidth={2}
                        class={s.chevron}
                      />
                    </button>
                  </li>
                </ul>
              </div>
            </Match>
            <Match when={screen() === "project" || screen() === "chat"}>
              <div class={s.chat}>
                <header class={s.chatTop}>
                  <button
                    type="button"
                    class={s.circle}
                    aria-label="Back"
                    onClick={() =>
                      setScreen(screen() === "chat" ? "project" : "home")
                    }
                  >
                    <Icon icon={ChevronLeft} size={20} strokeWidth={2} />
                  </button>
                  <span class={s.chatTitles}>
                    <span class={s.chatTitle}>
                      {screen() === "chat"
                        ? "Weight title hits"
                        : "hooli-search"}
                    </span>
                    <span class={s.stateLine}>
                      {screen() === "chat"
                        ? `${answered() ? "Working" : "Needs you"} \u00b7 hooli-search \u203a fix/search-ranking`
                        : "3 worktrees"}
                    </span>
                  </span>
                </header>
                <Show when={!phoneOnline()}>
                  <p class={s.banner}>Offline, reconnecting</p>
                </Show>
                <Show
                  when={screen() === "chat"}
                  fallback={
                    <div class={s.cards}>
                      <h2 class={s.listLabel}>Now</h2>
                      <button
                        type="button"
                        class={s.nowCard}
                        data-phase={answered() ? "working" : "needs"}
                        onClick={() => setScreen("chat")}
                      >
                        <span class={s.cardTitle}>Weight title hits</span>
                        <span class={s.stateRow}>
                          {answered() ? (
                            <WorkingMark size={15} animate />
                          ) : (
                            <QuestionMark size={15} animate />
                          )}
                          <span>{answered() ? "Working" : "Needs you"}</span>
                          <span class={s.time}>
                            fix/search-ranking {"\u00b7"} now
                          </span>
                        </span>
                      </button>
                    </div>
                  }
                >
                  <div class={s.transcript}>
                    <div class={s.user}>
                      make title hits count more than body hits
                    </div>
                    <div class={s.prose}>
                      Title hits now weigh 2.5 times a body hit in rank.ts. I
                      want to run the rank tests to check.
                    </div>
                    <Show when={answered()}>
                      <div class={s.prose}>
                        {answered() === "allow"
                          ? "Ran pnpm test rank: 18 passed."
                          : "You denied it, so the tests did not run."}
                      </div>
                    </Show>
                  </div>
                  <Show when={!answered()}>
                    <div class={s.pending}>
                      <div class={s.card}>
                        <strong>Allow Bash?</strong>
                        <pre class={s.detail}>pnpm test rank</pre>
                        <div class={s.cardActions}>
                          <button
                            type="button"
                            class={s.secondary}
                            disabled={!phoneOnline()}
                            onClick={() => answer("deny")}
                          >
                            Deny
                          </button>
                          <button
                            type="button"
                            class={s.primarySmall}
                            disabled={!phoneOnline()}
                            onClick={() => answer("allow")}
                          >
                            Allow once
                          </button>
                        </div>
                      </div>
                    </div>
                  </Show>
                  <div class={s.composer}>Message</div>
                </Show>
              </div>
            </Match>
          </Switch>
        </PhoneFrame>
      </div>
    </div>
  );
}
