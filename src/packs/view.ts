import { readFileSync } from "node:fs";
import type { Pack } from "./catalog";

export const TABS = [
  { kind: "agents", label: "Agents" },
  { kind: "lsp", label: "Languages" },
  { kind: "dap", label: "Debuggers" },
  { kind: "formatters", label: "Formatters" },
  { kind: "themes", label: "Themes" },
] as const;

export const tabLabel = (kind: Pack["kind"]) => TABS.find((t) => t.kind === kind)!.label;

const linter = (p: Pack) => p.kind === "lsp" && p.role === "secondary";

export function kindName(p: Pack) {
  if (linter(p)) return "Linter";
  return { lsp: "Language", dap: "Debugger", formatters: "Formatter", themes: "Theme", agents: "Agent" }[p.kind];
}

export function settings(p: Pack) {
  if (linter(p)) return { pane: "Linters", button: "Add a linter" };
  return {
    lsp: { pane: "LSP", button: "Add a language" },
    dap: { pane: "Debuggers", button: "Add a debugger" },
    formatters: { pane: "Formatters", button: "Add a formatter" },
    themes: { pane: "Appearance", button: "Add a theme" },
    agents: { pane: "Agents", button: "Add an agent" },
  }[p.kind];
}

export const fileName = (p: Pack) => `${p.id}.${p.kind === "themes" ? "json" : "toml"}`;
export const filePath = (p: Pack) => new URL(p.url).pathname;
export const folder = (p: Pack) => `~/.config/tori/packs/${p.kind}/`;
export const iconPath = (p: Pack) => (p.icon_url ? new URL(p.icon_url).pathname : null);

const index = JSON.parse(readFileSync(".packs/index.json", "utf8"));
export const sourceUrl = (p: Pack) => `https://github.com/gettori/packs/blob/${index.packs_commit}/${p.kind}/${fileName(p)}`;

export const RELEASE: string = JSON.parse(readFileSync(".packs/release.json", "utf8")).version;
const numbers = (v: string) => v.split("-")[0].split(".").map(Number);
export const shortVersion = (v: string) => v.split("-")[0];

export function newerThanRelease(min: string) {
  const [a, b] = [numbers(min), numbers(RELEASE)];
  for (let i = 0; i < 3; i++) if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
  return false;
}

// Tori runs on macOS only, so that is the platform a visitor installs it on,
// whatever the browser says.
export const onMac = (p: Pack) => p.platforms.includes("macos");

export const PLATFORMS = [
  { key: "macos", name: "macOS" },
  { key: "linux", name: "Linux" },
  { key: "windows", name: "Windows" },
] as const;

// "@astrojs/language-server 2.17.2" -> the tool, which a card may cut short,
// and the version it was measured at, which it keeps. Anything after the first
// version ("with pi-acp 0.0.33") is left to the pack's page.
export function splitVerified(text: string) {
  const m = text.match(/^(.*?)\s*(\bv?\d[\w.+-]*)/);
  return m ? { tool: m[1], version: m[2] } : { tool: "", version: text };
}

const day = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en", { ...opts, timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
export const shortDay = (iso: string) => day(iso, { month: "short", day: "numeric" });
export const longDay = (iso: string) => day(iso, { month: "short", day: "numeric", year: "numeric" });

type Table = Record<string, any>;

export function install(p: Pack): { what: string; detail?: string; sentence: string } {
  const f = p.file as Table;
  const inst = f.install as Table | undefined;
  if (p.kind === "themes") return { what: "Nothing to install", sentence: "Themes have nothing else to install." };
  if (p.kind === "agents") {
    if (!inst?.program) return { what: "You install it yourself", sentence: `Tori starts **${p.label}** from your PATH.` };
    const cmd = [inst.program, ...(inst.args ?? [])].join(" ");
    return { what: `Tori installs it with ${inst.program}`, detail: cmd, sentence: `Installing it with **${inst.program}** is a separate click on its card.` };
  }
  switch (inst?.kind) {
    case "npm":
      return {
        what: "Tori installs it from npm",
        detail: `${inst.package}@${inst.version}`,
        sentence: `Installing **${inst.package}** from npm is a separate click on the same row.`,
      };
    case "pip":
      return { what: "Tori installs it from PyPI", detail: inst.package, sentence: `Installing **${inst.package}** from PyPI is a separate click on the same row.` };
    case "github_release":
      return {
        what: "Tori installs it from a GitHub release",
        detail: `${inst.repo} · checksum verified`,
        sentence: `Downloading the release from **${inst.repo}** is a separate click; Tori checks its checksum first.`,
      };
    case "hint":
      return { what: "Shows how to install it", detail: inst.text, sentence: "Tori then shows how to install the tool itself." };
  }
  switch ((f.launch as Table | undefined)?.kind) {
    case "bundled_node":
      return { what: "Ships with Tori", sentence: "The server itself already ships inside Tori." };
    case "project_bin":
      return { what: "Uses your project's copy", sentence: "Tori runs the copy your project already installs." };
  }
  return { what: "Uses the one on your PATH", sentence: "Tori runs the one already on your PATH." };
}

export function chat(p: Pack) {
  if (p.chat === "acp")
    return { pill: "Chat over ACP", value: "Chat over ACP", text: `Tori opens a chat pane next to the terminal and talks to ${p.label} through the Agent Client Protocol.` };
  if (p.chat) return { pill: "Chat", value: "Chat", text: `Tori opens a chat pane next to the terminal and talks to ${p.label} through its own protocol.` };
  return { pill: "Terminal only", value: "Terminal only", text: `${p.label} runs in its terminal tab. Tori reads its status from the terminal, and there is no chat pane.` };
}

export function accounts(p: Pack) {
  const f = p.file as Table;
  return f.accounts?.supports_isolation === true
    ? { value: "More than one", text: "Sign in to more than one account and choose which one each session uses." }
    : { value: "One account", text: "Tori uses whichever account the agent is signed in to." };
}

export function usage(p: Pack) {
  const f = p.file as Table;
  return (f.usage?.sources ?? []).length > 0
    ? { value: "Shown", text: "Tori shows remaining usage for each account in the sidebar." }
    : { value: "Not available", text: "The agent does not report usage, so Tori shows none." };
}

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// The sentences above mark names with **, escaped here since they come from pack files.
export const strong = (s: string) => escape(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

// Hint text is Markdown in the pack; only its inline code needs drawing.
export const inlineCode = (s: string) => escape(s).replace(/`([^`]+)`/g, "<code>$1</code>");

export const SLOTS = [
  ["Background", "canvas"],
  ["Surface", "card"],
  ["Text", "text"],
  ["Comment", "synComment"],
  ["Accent", "accent"],
  ["String", "synString"],
  ["Keyword", "synKeyword"],
  ["Function", "synFunction"],
] as const;

// Theme colours land in style attributes, so only a plain hex gets through.
export const color = (p: Pack, key: string) => {
  const c = p.colors?.[key];
  return c && /^#[0-9a-fA-F]{3,8}$/.test(c) ? c : "transparent";
};

export const palette = (p: Pack) => SLOTS.map(([name, key]) => ({ name, hex: color(p, key) }));


// Enough of TOML and JSON to colour what packs use: keys, strings, arrays,
// section headers, comments and bare values.
export function highlight(text: string, json: boolean): string[] {
  const token = /("(?:[^"\\]|\\.)*"|'[^']*'|#.*$|\[\[?[^\]"]*\]\]?(?=\s*(?:#.*)?$)|[\[\]{}]|[=:,]|[^\s=:,"'\[\]{}#]+)/g;
  return text.split("\n").map((line) => {
    let out = "";
    let last = 0;
    let keyDone = false;
    for (const m of line.matchAll(token)) {
      out += escape(line.slice(last, m.index));
      const t = m[0];
      const next = line.slice(m.index! + t.length).trimStart();
      let cls: string;
      if (!json && t.startsWith("#")) cls = "c";
      else if (!json && t.startsWith("[") && t.length > 1 && !keyDone && m.index === line.search(/\S/)) cls = "s";
      else if ((json && t.startsWith('"') && next.startsWith(":")) || (!json && !keyDone && next.startsWith("="))) cls = "k";
      else if (t.startsWith('"') || t.startsWith("'") || t === "[" || t === "]") cls = "q";
      else if (t === "=" || t === ":") cls = "c";
      else if (/^[{},]$/.test(t)) cls = "p";
      else cls = "v";
      if (t === "=" || t === ":") keyDone = true;
      out += `<span class="${cls}">${escape(t)}</span>`;
      last = m.index! + t.length;
    }
    return out + escape(line.slice(last));
  });
}
