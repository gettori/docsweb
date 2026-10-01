// The sidebar, in reading order. Pagination and the overview grid read it too,
// so a page is placed once, here.
export type NavLink = { label: string; href: string };
export type NavGroup = { label: string; items: NavLink[] };

const page = (label: string, slug: string): NavLink => ({ label, href: slug ? `/docs/${slug}/` : "/docs/" });

export const NAV: NavGroup[] = [
  {
    label: "Getting started",
    items: [page("Overview", ""), page("Install", "install"), page("First run", "first-run")],
  },
  {
    label: "Workspace",
    items: [
      page("Spaces, projects and branches", "workspace/spaces"),
      page("Panes, tabs and layout", "workspace/panes-and-tabs"),
      page("Search, the omnibox and shortcuts", "workspace/search-and-shortcuts"),
    ],
  },
  {
    label: "Agents and chat",
    items: [
      page("Supported agents and adapters", "agents/adapters"),
      page("Chat", "agents/chat"),
      page("Accounts and usage", "agents/accounts-and-usage"),
    ],
  },
  {
    label: "Git and review",
    items: [
      page("Worktrees and branches", "git/worktrees-and-branches"),
      page("The Changes panel", "git/changes-panel"),
      page("Pull requests and issues", "git/pull-requests-and-issues"),
    ],
  },
  {
    label: "Editor and tools",
    items: [
      page("Editor", "editor/editor"),
      page("Language servers, debuggers and formatters", "editor/tooling"),
      page("Terminal", "editor/terminal"),
      page("Themes and fonts", "editor/themes-and-fonts"),
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
    items: [page("Every setting", "reference/settings"), page("Files on disk and privacy", "reference/files-and-privacy")],
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
