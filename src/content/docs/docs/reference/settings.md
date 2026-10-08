---
title: Every setting
description: Every setting Tori has, grouped by the panel it lives in.
---

Open Settings with the gear at the right end of the title bar. The
rail on the left lists the panes; the search box at the top finds a setting by
name and badges each pane with how many rows match. The keyboard button in the
header opens the [shortcut sheet](/docs/workspace/keyboard-shortcuts/).

Every row is also a **Preferences:** command in the palette (`Cmd+K`), which
opens Settings on that row, or flips it for an on and off setting.

Settings are saved in `~/.config/tori/settings.json`. You can edit the file by
hand; Tori applies a change from either side the moment the file changes.

Editor rows can be overridden for one branch or worktree: select it in the
sidebar, then **Set here** on the row. The override is written to that
workspace's `.tori/settings.json`, which Tori keeps out of git.

## Agents

Card per adapter, not fixed fields: found or not, version against what Tori
last measured, an on or off switch for whether it is offered, and per
account usage controls. See
[Supported agents and adapters](/docs/agents/adapters).

## Chat

**Sessions**

| Setting | Default | Effect |
| --- | --- | --- |
| Open sessions in | Chat | Which surface a sidebar session opens in by default |
| Stream responses | On | Listed, but has no effect yet |
| Transcript density | Comfortable | Listed, but has no effect yet |
| Tool output lines | 20 | Lines shown before a tool's output folds; 0 shows all |
| Show every hook event | Off | Off shows only failing hooks; on shows every execution |
| Collapse agent work | Off | Folds thinking, tool calls, hooks and answered questions between two replies into a one line card |
| Answer the agent's questions here | On | Structured questions render as an answerable form inline |
| Attach long pastes as files | On | A paste over 30 lines or 3000 characters becomes a file chip |
| Mark secret file reads | On | A turn that read a secret file, or ran a command naming one, says so in the chat, on its tab and in Checkpoints. See [Secret watch](/docs/reference/security/#secret-watch) |
| Resume at reset | Off | A Claude chat stopped by a usage limit gets one message from Tori to continue, shortly after the limit resets |

**Notifications**

| Setting | Default | Effect |
| --- | --- | --- |
| Notify when a session needs you | On | A notification when a session asks a question or wants a permission |
| Play a sound when a session needs you | Off | With a play button to hear it |
| Notify when a chat finishes its turn | Off | A notification at the end of every turn |
| Play a sound when a chat finishes its turn | Off | With a play button to hear it |

**Safety**

| Setting | Default | Effect |
| --- | --- | --- |
| Snapshot on each prompt | On | One checkpoint per prompt, for diff and revert |

**Spending**

| Setting | Default | Effect |
| --- | --- | --- |
| Warn above | 4 chats | Live chats at once before Tori warns; 0 turns it off |
| Stop this chat after | No limit | Dollar ceiling for one session |
| Stop this project after | No limit | Dollar ceiling summed across every chat in a project |
| Stop at context | No limit | Percentage of context window; recovers after compaction |
| Warn at | 80% | Fraction of a ceiling before Tori warns |

## Autopilot

| Setting | Default | Effect |
| --- | --- | --- |
| Enable autopilot | Off | Puts the Cockpit switch in the title bar |
| Autopilot model | Claude | Agent, account and model autopilot's own session runs on |
| Worker stalled after | 20 min | Silent mid-turn time before a worker is flagged stalled |
| Compact at context | Agent decides | Percentage past which Tori sends `/compact` between the autopilot's turns |
| Workers at once | 2 | How many workers run at a time, kept one under Warn above |

## Editor

**Behaviour** (all workspace overridable)

| Setting | Default | Effect |
| --- | --- | --- |
| Format on save | Off | Runs the file's formatter before writing |
| Organize imports on save | Off | Sorts and drops unused imports before formatting |
| Fix all on save | Off | Applies every available fix before organizing and formatting |
| Trim trailing whitespace on save | Off | Strips trailing whitespace first |
| Insert final newline on save | Off | Ensures exactly one trailing newline |
| Code lens | Off | Shows reference and implementation counts above lines |
| Vim keybindings | Off | Modal editing |

**Editing**

| Setting | Default | Effect |
| --- | --- | --- |
| Tab size | 2 | Indent width; `.editorconfig` outranks this |
| Indent with spaces | On | Off uses tab characters |
| Indentation guides | On | Vertical guides per indent level |
| Current line highlight | All | Where the caret's line is marked |
| Soft wrap long lines | Off | Default for every buffer |
| Show spaces and tabs | Off | Renders whitespace glyphs |
| Scroll past the last line | On | Lets the last line reach the viewport top |
| Colour brackets by depth | Off | Nesting colours for brackets |
| Bracket pair guide lines | Off | Vertical connectors between a pair |
| Minimap | Off | Document overview strip |
| Sticky scroll | Off | Pins enclosing scope headers over the viewport |
| Word completion without a language server | On | Buffer word completion where no server claims the file |
| Keep unsaved edits across a quit | On | Stashes and restores unsaved buffers instead of prompting |
| Compact single-child folders | On | Collapses single-child folder chains in the file tree |
| Open Markdown and SVG rendered | Off | Opens those files in the rendered view instead of the source |
| Git blame | Off | Per-line blame in the gutter; an uncommitted line names the agent turn that wrote it |
| Side by side diffs | Off | Two column vs inline diff rendering |
| TODO tags | TODO, FIXME, HACK, XXX | Tags the TODO panel searches for, workspace overridable |

## Panes

| Setting | Default | Effect |
| --- | --- | --- |
| Terminals open in | Leftmost | Which end of the split a new terminal, agent, command or task tab lands in |
| Chats open in | Leftmost | Same, for chat tabs |
| Files open in | Rightmost | Same, for opened files |

## LSP, Debuggers, Linters, Formatters, Projects

Card grids, not fixed fields, one card per server, debugger, linter or
formatter with an on or off switch and install controls where they apply.
Projects lists which folders you have marked trusted, required for a server
or debugger that runs project code. See
[Language tooling](/docs/editor/tooling).

## Appearance

| Setting | Default | Effect |
| --- | --- | --- |
| Theme | Tori Dark | 22 bundled, in Dark and Light tabs. See [Themes and fonts](/docs/editor/themes-and-fonts) |
| Zoom | 1x | Scales chrome, editor and terminal together |
| Space tiles | Bottom | Where the space strip sits: the bottom of the sidebar, or its left edge |
| UI font family / size | Inter, 15px | |
| Editor font family / size | SF Mono, 15px | |
| Terminal font family / size | JetBrains Mono Nerd Font, 15px | |
| Line height | 1.5 | |

## Integrations

**Git**

| Setting | Default | Effect |
| --- | --- | --- |
| Fetch every | 10 min | Background fetch cadence; 0 turns it off |
| Show Topic worktrees in Spaces | Off | Also lists a [Topic's](/docs/workspace/topics/) worktrees under their repository in Spaces |
| Remove worktrees after merge | Off | Removes a clean worktree once its pull request merged, active Space only. See [Remove worktrees automatically](/docs/git/worktrees-and-branches/#remove-worktrees-automatically) |
| Remove idle worktrees after | Off | Removes a clean, pushed worktree idle for 3, 7, 14 or 30 days. The branch is kept |

**Hosts**

Sign in to GitHub or GitLab accounts, per repo account picks, and whether a
host's account is also used for git push and fetch, for Tori only or for
git everywhere. See
[Pull requests and issues](/docs/git/pull-requests-and-issues).

| Setting | Default | Effect |
| --- | --- | --- |
| Show pull requests and checks | On | Off stops polling the host while keeping your sign-in |
| Let a chat watch a pull request | Off | Lets a chat be [woken with a pull request's news](/docs/git/pull-requests-and-issues/#let-a-chat-watch-a-pull-request); each wake is a paid turn |

## Remote

| Setting | Default | Effect |
| --- | --- | --- |
| Remote access | Off | Lets a paired phone reach Tori over Tailscale |
| Tailscale | | Shows whether Tailscale is installed and connected |
| Listen on | Not set | Your Tailscale address, or this Mac only |
| Port | 47821 | |

See [Pairing and remote access](/docs/phone/pairing).

## Advanced

**Base folder**: shown, and changeable, from here. Changing it does not move
anything on disk, Tori just starts listing whatever is under the new
folder. **Forget base folder** returns you to first run setup without
deleting anything.

**Crash logs**: if Tori ever closes on its own, it writes a file under
`~/.config/tori/crashes/` and says so on the next launch. This section lists
those files and the version you are running. **Report a bug** opens the bug
form in your browser, prefilled; nothing is sent anywhere without that
click.

## Settings that live elsewhere

Some settings belong to one project, account or Topic, and are set where
that thing is rather than in the Settings window.

| Setting | Where | Effect |
| --- | --- | --- |
| Setup command, and whether scripted sessions wait for it | Project menu > Worktree settings | [Runs in every new worktree](/docs/git/worktrees-and-branches/#a-setup-command-for-new-worktrees) |
| Shared files | Project menu > Worktree settings | [Links untracked files into every worktree](/docs/git/shared-files) |
| Agents allowed in a project | Project menu > Agents | [Limits agents and accounts](/docs/agents/accounts-and-usage/#limiting-agents-per-project) |
| Host account for a repository | Settings > Integrations > Hosts, per repo | Which login its pull requests and pushes use |
| When a chat needs a worktree | Topic menu | [Ask, create or refuse](/docs/workspace/topics/#chats-in-a-topic) |
| Autopilot contract | Per project | [How work ships and how far it goes](/docs/automation/autopilot/#per-project-contract) |
| Usage windows, warn threshold, notify | Settings > Agents, per account | Which quota bars show and when they warn |
| Trusted projects | Settings > Languages > Projects | [Which folders may run their own code](/docs/reference/security/#project-trust) |
| Commit box, history tabs | Changes panel `...` menu | Shown or hidden |
| Follow live edits | Composer bar | Not remembered across a launch |
| Editor behaviour for one project | `<project>/.tori/settings.json` | Overrides the workspace overridable rows above |
| More secret file patterns | `secretWatch.patterns` in `~/.config/tori/settings.json` | [Adds to what Secret watch marks](/docs/reference/security/#secret-watch) |

Every row of the Settings window is also a `Preferences:` command in the
palette, and the search box at the top of Settings badges each tab with how
many rows match as you type.
