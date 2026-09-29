import { createMemo, createSignal, For, onMount, type JSX } from "solid-js";
import { FileJson, Minus, Moon, Plus, Sun } from "lucide";
import { Icon, StatusBubble, Tab } from "../../app/kit";
import { buildRoles } from "../../app/theme/roles";
import { admit } from "../../app/theme/admit";
import type { Palette } from "../../app/theme/schema";
import toriDark from "../../app/theme/palettes/tori-dark.json";
import toriLight from "../../app/theme/palettes/tori-light.json";
import mocha from "../../app/theme/palettes/catppuccin-mocha.json";
import tokyo from "../../app/theme/palettes/tokyo-night.json";
import dawn from "../../app/theme/palettes/rose-pine-dawn.json";
import w from "../../app/window.module.css";
import DemoWindow, { useToast } from "./DemoWindow";
import s from "./ThemesDemo.module.css";

const BUNDLED = [toriDark, toriLight, mocha, tokyo, dawn] as Palette[];

// Two files a reader can drop into ~/.config/tori/themes/. The first passes the
// app's own legibility gate; the second is a pale-on-pale palette it refuses.
const DROPS: { file: string; palette: Palette }[] = [
  {
    file: "hooli.json",
    palette: {
      ...(toriDark as Palette),
      id: "hooli",
      label: "Hooli",
      colors: {
        ...(toriDark as Palette).colors,
        canvas: "#070f1c",
        card: "#0a1526",
        head: "#0d1a2e",
        input: "#0d1a2e",
        hover: "#12223a",
        borderTint: "#b8d4ff",
        lineTint: "#b8d4ff",
        rail: "#27456e",
        text: "#e6f0ff",
        textMuted: "#a9c1e3",
        textSubtle: "#7d97bd",
        accent: "#4aa8ff",
        accentSubtle: "#16365e",
        brand: "#5ccf8f",
        brandStrong: "#8be3b2",
        brandTint: "#43b97a",
        brandOn: "#08301b",
      },
    },
  },
  {
    file: "gavin.json",
    palette: {
      ...(toriLight as Palette),
      id: "gavin-belson-signature",
      label: "Gavin Belson Signature",
      colors: {
        ...(toriLight as Palette).colors,
        canvas: "#f6f1e3",
        card: "#fbf7ec",
        text: "#b9a77a",
        textMuted: "#cdbf98",
        textSubtle: "#d8cfb4",
      },
    },
  },
];

const MONO = [
  { label: "SF Mono", css: '"SF Mono", ui-monospace, Menlo, monospace' },
  { label: "Menlo", css: "Menlo, ui-monospace, monospace" },
  { label: "Monaco", css: "Monaco, ui-monospace, monospace" },
  { label: "Courier New", css: '"Courier New", monospace' },
];
const UI = [
  { label: "Inter", css: '"Inter Variable", "Inter", system-ui, sans-serif' },
  { label: "System", css: "-apple-system, system-ui, sans-serif" },
  { label: "Georgia", css: "Georgia, serif" },
];

const CODE = [
  ["k", "export function "],
  ["f", "rank"],
  ["p", "(docs: "],
  ["t", "Doc"],
  ["p", "[], q: "],
  ["t", "string"],
  ["p", "): "],
  ["t", "Hit"],
  ["p", "[] {"],
  ["n", ""],
  ["c", "  // title hits count more than body hits"],
  ["n", ""],
  ["p", "  "],
  ["k", "const "],
  ["v", "terms"],
  ["p", " = "],
  ["f", "tokenize"],
  ["p", "(q);"],
  ["n", ""],
  ["p", "  "],
  ["k", "const "],
  ["v", "weight"],
  ["p", " = { title: "],
  ["m", "2.5"],
  ["p", ", body: "],
  ["m", "1"],
  ["p", " };"],
  ["n", ""],
  ["p", "  "],
  ["k", "return "],
  ["v", "docs"],
  ["p", "."],
  ["f", "map"],
  ["p", "((d) => "],
  ["f", "score"],
  ["p", "(d, terms, weight))"],
  ["n", ""],
  ["p", "    ."],
  ["f", "filter"],
  ["p", "((h) => h.score > "],
  ["m", "0"],
  ["p", ")"],
  ["n", ""],
  ["p", "    ."],
  ["f", "sort"],
  ["p", "(("],
  ["v", "a"],
  ["p", ", "],
  ["v", "b"],
  ["p", ") => b.score - a.score);"],
  ["n", ""],
  ["p", "}"],
  ["n", ""],
] as const;
const SYNTAX: Record<string, string> = {
  k: "var(--syntax-keyword)",
  f: "var(--syntax-function)",
  t: "var(--syntax-type)",
  v: "var(--syntax-variable)",
  m: "var(--syntax-number)",
  c: "var(--syntax-comment)",
  p: "var(--fg-default)",
};
const codeLines = () => {
  const out: [string, string][][] = [[]];
  for (const [k, text] of CODE) {
    if (k === "n") out.push([]);
    else out[out.length - 1]!.push([k, text]);
  }
  return out.filter((l) => l.length);
};

export default function ThemesDemo() {
  const { toast, say } = useToast();
  const [themes, setThemes] = createSignal<Palette[]>(BUNDLED);
  const [theme, setTheme] = createSignal("tori-dark");
  const [dropped, setDropped] = createSignal<Set<string>>(new Set());
  const [uiFont, setUiFont] = createSignal(UI[0]!.css);
  const [uiSize, setUiSize] = createSignal(13);
  const [mono, setMono] = createSignal(MONO[0]!.css);
  const [edSize, setEdSize] = createSignal(12.5);
  const [termSize, setTermSize] = createSignal(12);
  const [lineH, setLineH] = createSignal(1.6);
  const [zoom, setZoom] = createSignal(1);

  onMount(() =>
    setTheme(
      document.documentElement.dataset.theme === "light"
        ? "tori-light"
        : "tori-dark",
    ),
  );

  const palette = () => themes().find((t) => t.id === theme()) ?? BUNDLED[0]!;
  const vars = createMemo(() => ({
    ...buildRoles(palette()),
    "color-scheme": palette().appearance,
    "--tori-font-ui": uiFont(),
  }));

  function drop(d: (typeof DROPS)[number]) {
    const got = admit(d.palette, d.file);
    if (!got.ok) {
      const more = got.problems.length - 1;
      say(
        `${d.file} was not applied: ${got.problems[0]!.replace(`${d.file}: ${d.palette.id}: `, "")}${more ? ` (and ${more} more)` : ""}`,
      );
      return;
    }
    if (!dropped().has(d.file)) {
      setThemes((l) => [...l, got.palette]);
      setDropped((x) => new Set(x).add(d.file));
    }
    setTheme(got.palette.id);
    say(`${got.palette.label} is in the picker`);
  }
  function stepZoom(by: number) {
    setZoom((z) =>
      by === 0
        ? 1
        : Math.min(1.4, Math.max(0.7, Math.round((z + by) * 10) / 10)),
    );
  }
  function onKey(e: KeyboardEvent) {
    if (!(e.metaKey || e.ctrlKey)) return;
    if (e.key === "=" || e.key === "+") (e.preventDefault(), stepZoom(0.1));
    else if (e.key === "-") (e.preventDefault(), stepZoom(-0.1));
    else if (e.key === "0") (e.preventDefault(), stepZoom(0));
  }

  const Swatch = (props: { p: Palette }) => (
    <button
      type="button"
      class={s.swatch}
      aria-pressed={theme() === props.p.id}
      onClick={() => setTheme(props.p.id)}
    >
      <span
        class={s.chip}
        style={{
          background: props.p.colors.canvas,
          "border-color": props.p.colors.rail,
        }}
      >
        <span class={s.chipCard} style={{ background: props.p.colors.card }}>
          <span style={{ background: props.p.colors.text }} />
          <span
            style={{ background: props.p.colors.textMuted, width: "60%" }}
          />
        </span>
        <span class={s.chipDots}>
          <i style={{ background: props.p.colors.accent }} />
          <i style={{ background: props.p.colors.brand }} />
        </span>
      </span>
      <span class={s.swatchLabel}>{props.p.label}</span>
    </button>
  );

  const Field = (props: { label: string; children: JSX.Element }) => (
    <label class={s.field}>
      <span>{props.label}</span>
      {props.children}
    </label>
  );

  return (
    <div class={s.root} style={vars()} onKeyDown={onKey}>
      <DemoWindow
        crumbs={["hooli", "hooli-search", "fix/search-ranking"]}
        toast={toast()}
        minHeight={560}
        end={
          <button
            type="button"
            class={s.toggle}
            aria-label="Switch light and dark"
            onClick={() =>
              setTheme(
                palette().appearance === "dark" ? "tori-light" : "tori-dark",
              )
            }
          >
            <Icon
              icon={palette().appearance === "dark" ? Sun : Moon}
              size={15}
            />
          </button>
        }
      >
        <div class={s.layout}>
          <div
            class={s.preview}
            style={{ zoom: zoom(), "font-size": `${uiSize()}px` }}
          >
            <section class={`${w.card} ${s.editor}`}>
              <div class={w.strip}>
                <Tab
                  label="rank.ts"
                  selected
                  icon={<span class={s.glyph}>TS</span>}
                />
                <Tab label="server.ts" icon={<span class={s.glyph}>TS</span>} />
              </div>
              <div
                class={s.code}
                style={{
                  "font-family": mono(),
                  "font-size": `${edSize()}px`,
                  "line-height": lineH(),
                }}
              >
                <For each={codeLines()}>
                  {(line, i) => (
                    <div
                      class={s.line}
                      data-cursor={i() === 3 ? "" : undefined}
                    >
                      <span class={s.ln}>{i() + 16}</span>
                      <span>
                        <For each={line}>
                          {([k, text]) => (
                            <span
                              style={{
                                color: SYNTAX[k],
                                "font-style": k === "c" ? "italic" : undefined,
                              }}
                            >
                              {text}
                            </span>
                          )}
                        </For>
                      </span>
                    </div>
                  )}
                </For>
              </div>
            </section>
            <section
              class={`${w.card} ${s.term}`}
              style={{
                "font-family": mono(),
                "font-size": `${termSize()}px`,
                "line-height": lineH(),
              }}
            >
              <div>
                <span style={{ color: "var(--ansi-blue)" }}>
                  ~/Projects/hooli-search
                </span>{" "}
                <span style={{ color: "var(--ansi-magenta)" }}>
                  fix/search-ranking
                </span>
              </div>
              <div>
                <span style={{ color: "var(--ansi-green)" }}>$</span> pnpm test
              </div>
              <div>
                <span style={{ color: "var(--ansi-green)" }}>{" \u2713 "}</span>
                src/rank.test.ts{" "}
                <span style={{ color: "var(--ansi-bright-black)" }}>(18)</span>
              </div>
              <div>
                <span style={{ color: "var(--ansi-yellow)" }}>{" ! "}</span>
                src/cache.ts{" "}
                <span style={{ color: "var(--ansi-bright-black)" }}>
                  slow: 212ms
                </span>
              </div>
              <div>
                <span style={{ color: "var(--ansi-red)" }}>{" \u2717 "}</span>
                src/server.test.ts{" "}
                <span style={{ color: "var(--ansi-bright-black)" }}>
                  (1 failed)
                </span>
              </div>
            </section>
            <div class={`${w.statusStrip} ${s.status}`}>
              <span>Sessions</span>
              <StatusBubble rollup={{ waiting: 1, executing: 2, idle: 1 }} />
              <span class={s.statusNote}>
                status colors stay Tori's in every theme
              </span>
            </div>
          </div>

          <aside class={`${w.card} ${s.settings}`}>
            <div class={s.settingsHead}>Settings {"\u203a"} Appearance</div>
            <div class={s.group}>Theme</div>
            <div class={s.swatches}>
              <For each={themes()}>{(p) => <Swatch p={p} />}</For>
            </div>
            <div class={s.drops}>
              <span class={s.dropsLabel}>Drop into ~/.config/tori/themes/</span>
              <For each={DROPS}>
                {(d) => (
                  <button
                    type="button"
                    class={s.drop}
                    data-added={dropped().has(d.file) ? "" : undefined}
                    onClick={() => drop(d)}
                  >
                    <Icon icon={FileJson} size={13} />
                    {d.file}
                  </button>
                )}
              </For>
            </div>
            <div class={s.group}>Typography</div>
            <div class={s.fields}>
              <Field label="UI font">
                <select
                  value={uiFont()}
                  onChange={(e) => setUiFont(e.currentTarget.value)}
                >
                  <For each={UI}>
                    {(f) => <option value={f.css}>{f.label}</option>}
                  </For>
                </select>
              </Field>
              <Field label={`UI size ${uiSize()}`}>
                <input
                  type="range"
                  min="11"
                  max="16"
                  step="0.5"
                  value={uiSize()}
                  onInput={(e) => setUiSize(Number(e.currentTarget.value))}
                />
              </Field>
              <Field label="Editor font">
                <select
                  value={mono()}
                  onChange={(e) => setMono(e.currentTarget.value)}
                >
                  <For each={MONO}>
                    {(f) => <option value={f.css}>{f.label}</option>}
                  </For>
                </select>
              </Field>
              <Field label={`Editor size ${edSize()}`}>
                <input
                  type="range"
                  min="10"
                  max="16"
                  step="0.5"
                  value={edSize()}
                  onInput={(e) => setEdSize(Number(e.currentTarget.value))}
                />
              </Field>
              <Field label={`Terminal size ${termSize()}`}>
                <input
                  type="range"
                  min="10"
                  max="16"
                  step="0.5"
                  value={termSize()}
                  onInput={(e) => setTermSize(Number(e.currentTarget.value))}
                />
              </Field>
              <Field label={`Line height ${lineH().toFixed(1)}`}>
                <input
                  type="range"
                  min="1.2"
                  max="2"
                  step="0.1"
                  value={lineH()}
                  onInput={(e) => setLineH(Number(e.currentTarget.value))}
                />
              </Field>
            </div>
            <div class={s.zoomRow}>
              <span>Zoom</span>
              <span class={s.zoom}>
                <button
                  type="button"
                  aria-label="Zoom out"
                  onClick={() => stepZoom(-0.1)}
                >
                  <Icon icon={Minus} size={13} />
                </button>
                <button
                  type="button"
                  class={s.zoomValue}
                  aria-label="Reset zoom"
                  onClick={() => stepZoom(0)}
                >
                  {Math.round(zoom() * 100)}%
                </button>
                <button
                  type="button"
                  aria-label="Zoom in"
                  onClick={() => stepZoom(0.1)}
                >
                  <Icon icon={Plus} size={13} />
                </button>
              </span>
            </div>
          </aside>
        </div>
      </DemoWindow>
    </div>
  );
}
