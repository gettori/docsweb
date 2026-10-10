// The sidebar, in reading order. Pagination and the overview grid read it too,
// so a page is placed once, here.
export type NavLink = { label: string; href: string };
export type NavGroup = { label: string; items: NavLink[] };

const page = (label: string, slug: string): NavLink => ({ label, href: slug ? `/docs/${slug}/` : "/docs/" });

export const NAV: NavGroup[] = [
  {
    label: "Getting started",
    items: [page("Overview", ""), page("Install", "install"), page("First run", "first-run"), page("Updates and crash reports", "updates")],
  },
  {
    label: "Workspace",
    items: [
      page("Spaces, projects and branches", "workspace/spaces"),
      page("Topics", "workspace/topics"),
      page("Panes, tabs and layout", "workspace/panes-and-tabs"),
      page("Search and the omnibox", "workspace/search-and-shortcuts"),
      page("Keyboard shortcuts", "workspace/keyboard-shortcuts"),
    ],
  },
  {
    label: "Agents and chat",
    items: [
      page("Chat", "agents/chat"),
      page("Starting a chat", "agents/starting-a-chat"),
      page("The composer", "agents/composer"),
      page("Steering and the queue", "agents/steering-and-the-queue"),
      page("Models, effort and modes", "agents/models-and-modes"),
      page("Permissions and questions", "agents/permissions-and-questions"),
      page("Reading the transcript", "agents/transcript"),
      page("Subagents and background work", "agents/subagents"),
      page("Rewind and fork", "agents/rewind-and-fork"),
      page("Limits and spending", "agents/limits-and-spending"),
      page("Accounts and usage", "agents/accounts-and-usage"),
      page("Agents in Settings", "agents/agent-settings"),
      page("Supported agents and adapters", "agents/adapters"),
    ],
  },
  {
    label: "Git and review",
    items: [
      page("Worktrees and branches", "git/worktrees-and-branches"),
      page("Shared in worktrees", "git/shared-files"),
      page("The Changes panel", "git/changes-panel"),
      page("Diffs", "git/diffs"),
      page("Who wrote a hunk", "git/who-wrote-this"),
      page("Checkpoints", "git/checkpoints"),
      page("Merge conflicts", "git/merge-conflicts"),
      page("Pull requests and issues", "git/pull-requests-and-issues"),
    ],
  },
  {
    label: "Editor and tools",
    items: [
      page("Editor", "editor/editor"),
      page("Files and the explorer", "editor/files"),
      page("Language tooling", "editor/tooling"),
      page("Language servers", "editor/language-servers"),
      page("Linters", "editor/linters"),
      page("Formatters", "editor/formatters"),
      page("Debuggers", "editor/debuggers"),
      page("Terminal", "editor/terminal"),
      page("Themes and fonts", "editor/themes-and-fonts"),
    ],
  },
  {
    label: "Packs",
    items: [
      { label: "Browse the catalog", href: "/packs/" },
      page("Contributing a pack", "packs/contributing"),
      page("The bundled set", "packs/bundled"),
      page("Custom packs on your machine", "packs/custom"),
    ],
  },
  {
    label: "Automation",
    items: [page("Autopilot", "automation/autopilot"), page("Tori's own MCP server", "automation/mcp-server"), page("The tori CLI", "automation/cli")],
  },
  {
    label: "Phone app",
    items: [page("Pairing and remote access", "phone/pairing"), page("Using the phone app", "phone/using-the-phone-app")],
  },
  {
    label: "Reference",
    items: [
      page("Every setting", "reference/settings"),
      page("Security model", "reference/security"),
      page("Files on disk and privacy", "reference/files-and-privacy"),
    ],
  },
  { label: "Changelog", items: [{ label: "Changelog", href: "/changelog/" }] },
];

const FLAT = NAV.flatMap((g) => g.items.map((item) => ({ ...item, group: g.label })));

const same = (a: string, b: string) => a.replace(/\/?$/, "/") === b.replace(/\/?$/, "/");

export function groupOf(path: string): string | undefined {
  return FLAT.find((l) => same(l.href, path))?.group;
}

export function neighbours(path: string): { prev?: NavLink; next?: NavLink } {
  const at = FLAT.findIndex((l) => same(l.href, path));
  if (at < 0) return {};
  return { prev: FLAT[at - 1], next: FLAT[at + 1] };
}
