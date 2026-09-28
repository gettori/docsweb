import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import solid from "@astrojs/solid-js";

export default defineConfig({
  integrations: [
    starlight({
      title: "Tori",
      logo: { src: "./src/assets/app-icon.png" },
      favicon: "/favicon.png",
      customCss: ["@fontsource-variable/geist", "@fontsource-variable/geist-mono", "./src/styles/starlight.css"],
      social: [{ icon: "github", label: "GitHub", href: "https://github.com/gettori/releases" }],
      sidebar: [
        {
          label: "Getting started",
          items: [
            { label: "Overview", slug: "docs" },
            { label: "Install", slug: "docs/install" },
            { label: "First run", slug: "docs/first-run" },
          ],
        },
        {
          label: "Workspace",
          items: [
            { label: "Spaces, projects and branches", slug: "docs/workspace/spaces" },
            { label: "Panes, tabs and layout", slug: "docs/workspace/panes-and-tabs" },
            { label: "Search, the omnibox and shortcuts", slug: "docs/workspace/search-and-shortcuts" },
          ],
        },
        {
          label: "Agents and chat",
          items: [
            { label: "Supported agents and adapters", slug: "docs/agents/adapters" },
            { label: "Chat", slug: "docs/agents/chat" },
            { label: "Accounts and usage", slug: "docs/agents/accounts-and-usage" },
          ],
        },
        {
          label: "Git and review",
          items: [
            { label: "Worktrees and branches", slug: "docs/git/worktrees-and-branches" },
            { label: "The Changes panel", slug: "docs/git/changes-panel" },
            { label: "Pull requests and issues", slug: "docs/git/pull-requests-and-issues" },
          ],
        },
        {
          label: "Editor and tools",
          items: [
            { label: "Editor", slug: "docs/editor/editor" },
            { label: "Language servers, debuggers and formatters", slug: "docs/editor/tooling" },
            { label: "Terminal", slug: "docs/editor/terminal" },
            { label: "Themes and fonts", slug: "docs/editor/themes-and-fonts" },
          ],
        },
        {
          label: "Automation",
          items: [
            { label: "Autopilot", slug: "docs/automation/autopilot" },
            { label: "Tori's own MCP server", slug: "docs/automation/mcp-server" },
            { label: "The tori CLI", slug: "docs/automation/cli" },
          ],
        },
        {
          label: "Phone app",
          items: [
            { label: "Pairing and remote access", slug: "docs/phone/pairing" },
            { label: "Using the phone app", slug: "docs/phone/using-the-phone-app" },
          ],
        },
        {
          label: "Reference",
          items: [
            { label: "Every setting", slug: "docs/reference/settings" },
            { label: "Files on disk and privacy", slug: "docs/reference/files-and-privacy" },
          ],
        },
        { label: "Changelog", link: "/changelog" },
      ],
    }),
    solid(),
  ],
});
