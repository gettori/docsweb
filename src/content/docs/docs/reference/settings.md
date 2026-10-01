---
title: Every setting
description: Every setting Tori has, grouped by the panel it lives in.
---

Settings live in `~/.config/tori/settings.json`, editable through the
Settings panel or by hand; Tori applies a change from either the moment the
file changes. Where a row says workspace overridable, a project can pin its
own value in `.tori/settings.json` without changing your global default.

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
| Stream responses | On | Token by token rendering vs one update per block |
| Transcript density | Comfortable | Row spacing in the transcript |
| Tool output lines | 20 | Lines shown before a tool's output folds; 0 shows all |
| Show every hook event | Off | Off shows only failing hooks; on shows every execution |
| Answer the agent's questions here | On | Structured questions render as an answerable form inline |
| Attach long pastes as files | On | A paste over 30 lines or 3000 characters becomes a file chip |

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
| Compact at context | Off | Percentage past which Tori compacts between turns |
| Workers at once | 2 | How many workers run concurrently |

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
| Git blame | Off | Per-line blame in the gutter |
| Side by side diffs | Off | Two column vs inline diff rendering |
| TODO tags | TODO, FIXME, HACK, XXX | Tags the TODO panel searches for, workspace overridable |

## Panes

| Setting | Default | Effect |
| --- | --- | --- |
| Terminals open in | Leftmost | Which end of the split a new terminal or chat tab lands in |
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
| Theme | Tori Dark | See [Themes and fonts](/docs/editor/themes-and-fonts) |
| Zoom | 1x | Scales chrome, editor and terminal together |
| UI font family / size | Inter, 15px | |
| Editor font family / size | SF Mono, 15px | |
| Terminal font family / size | JetBrains Mono Nerd Font, 15px | |
| Line height | 1.5 | |

## Integrations

**Git**

| Setting | Default | Effect |
| --- | --- | --- |
| Fetch every | 10 min | Background fetch cadence; 0 turns it off |

**Hosts**

Sign in to GitHub or GitLab accounts, per repo account picks, and a switch
to turn the whole integration off while keeping your credential. See
[Pull requests and issues](/docs/git/pull-requests-and-issues).

## Remote

| Setting | Default | Effect |
| --- | --- | --- |
| Remote access | Off | Lets a paired phone reach Tori over the network |
| Listen on | Not set | LAN, Tailscale, or this Mac only |
| Port | 47821 | |

See [Pairing and remote access](/docs/phone/pairing).

## Advanced

**Base folder**: shown, and changeable, from here. Changing it does not move
anything on disk, Tori just starts listing whatever is under the new
folder. **Forget base folder** returns you to first run setup without
deleting anything.
