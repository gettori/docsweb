---
title: Search, the omnibox and shortcuts
description: Finding files, running commands, and every default keyboard shortcut.
---

## The omnibox

One dialog, opened with `Cmd+P` (starts empty) or `Cmd+K` (starts in command
mode), that switches what it searches by a prefix you type into the same
box:

| Prefix | Searches |
| --- | --- |
| *(none)* | Files in the project |
| `>` | Commands |
| `@` | Symbols in the open file |
| `#` | Symbols across the project |
| `:` | A line number to jump to |
| `?` | What the other prefixes do |

File mode leads with recently visited files, then recent files, ranked by
how often and how recently you open them, before the rest of the project.
Inside a Topic, every member repo is searched at once, each result labeled
with which repo it came from.

Commands you cannot run right now, for example **Push to origin** with
nothing to push, show up disabled with the reason underneath, rather than
being hidden.

## Project-wide search

`Cmd+Shift+F` opens the Search panel: match case, whole word, and regular
expression toggles, include and exclude glob fields, search only in open
editors, and find and replace, one match, one file, or every match at once.
Results can be viewed as a list or a tree, and a query can be saved for
later. In a Topic, every member is searched together, one section per repo.

## Shortcut sheet

`Cmd+/` opens a sheet listing every shortcut below, grouped by what it does.
There is currently no way to remap a shortcut; the sheet is the complete
answer to what a key does, not a starting point for customizing it.

## Every default shortcut

| Keys | Action |
| --- | --- |
| `Cmd+P` | Go to a file, action, symbol or line |
| `Cmd+K` | Run a command |
| `Ctrl+-` | Jump back to where you were |
| `Ctrl+Shift+-` | Jump forward again |
| `Cmd+Shift+T` | Reopen the tab you just closed |
| `Cmd+Shift+R` | Go to the pull request review form |
| `Cmd+Shift+E` | Filter the sidebar |
| `Cmd+/` | Show the shortcut sheet |
| `Cmd+Shift+J` | Switch between Autopilot and Workspace |
| `Cmd+L` | Show or hide the Autopilot overlay above Workspace |
| `Cmd+=` / `Cmd+Shift+=` | Zoom in |
| `Cmd+-` | Zoom out |
| `Cmd+0` | Reset zoom |
| `Cmd+R` | Reload the app |
| `Cmd+B` | Show or hide the sidebar |
| `Cmd+Opt+J` | Show or hide the terminal |
| `Cmd+Ctrl+J` | Show or hide the dock |
| `Cmd+Opt+E` | Show or hide the editor |
| `Cmd+Opt+B` | Show or hide the file tree |
| `Cmd+Opt+T` | Focus notifications; Tab cycles them, Escape dismisses the focused one |
| `Cmd+Shift+F` | Search across the project |
| `Cmd+F` | Search in the focused terminal |
| `Cmd+J` | Focus the terminal |
| `Cmd+Shift+B` | Run the last task again |
| `Cmd+1` through `Cmd+9` | Jump to tab 1 through 9 in the focused pane |
| `Ctrl+Tab` | Cycle the focused pane's tabs |
| `Cmd+W` | Close the focused tab |
| `Cmd+Shift+A` | Jump to the next session waiting for approval |
| `Cmd+.` | Stop the running turn |
| `Cmd+N` | New scratch buffer |
| `Cmd+Opt+D` | Go to definition |
| `Cmd+Opt+R` | Find references |
| `Cmd+Opt+N` | Rename symbol |
| `Cmd+Opt+A` | Show code actions |
| `Shift+Opt+F` | Format document |
| `Cmd+Opt+P` | Peek definition |
| `F5` | Start debugging |
| `Shift+F5` | Stop debugging |
| `F9` | Toggle a breakpoint |

A number of other actions, save, close tab, go to line, the git commands,
and every Settings entry, are reachable from the command palette without a
default key.
