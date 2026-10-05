---
title: Terminal
description: Open shells and agent terminals, the dock for one-off commands, what Tori types into a terminal, and the environment every tab gets.
---

Every shell tab runs your actual login shell (`$SHELL`, or `/bin/zsh` if
unset) as a login, interactive shell, so it sources your own profile and rc
files and owns its own PATH. Tori adds nothing on top and strips nothing
out; a **command** tab, by contrast, runs one program directly, never a
login shell, so nothing in your rc files can swallow it.

## Open a terminal

- **Terminal** in the tab strip's launch menu (the caret beside **+**) opens
  a shell in the selected branch or worktree.
- **Open in Integrated Terminal** on a folder in the Files tree opens one in
  that folder.
- `Cmd+J` focuses the terminal you used last, and `Cmd+Opt+J` shows or hides
  the terminals.
- **Claude (terminal)** in the launch menu opens an agent in its own terminal
  interface. See [Starting a chat](/docs/agents/starting-a-chat/#the-launch-menu).

`Cmd+F` searches inside the focused terminal; this is separate from
`Cmd+Shift+F`, which searches the whole project. Dropping a sidebar row or a
file tree path onto a terminal types its path at the prompt as a mention.

## What a tab is

| Kind | What runs | When it ends |
| --- | --- | --- |
| Shell | Your login shell | When you close the tab |
| Agent | Your login shell, with the agent typed into it | Exiting the agent drops you to a live prompt in the same tab |
| Command | One program, run directly | The tab shows `exit N` and keeps its output |

Every tab carries a leading glyph for its kind.

A command tab is what Tori uses for its own jobs: a clone, a bootstrap, an
install, a sign-in. Its PATH comes from your login
shell, but nothing else your rc files export does. A failed command keeps
its output and exit code on screen, a program that is not on PATH shows
`exit 127` instead of a tab that runs forever, and `Ctrl+C` shows `exit 1`.

An agent tab types the agent in only once the shell actually holds the
terminal. If something else, tmux for example, still has it after five
seconds, nothing is typed and the tab shows a banner naming what took the
terminal. The shell stays running under it.

## What Tori types, and what it never does

When you send something to a terminal from elsewhere in Tori, a hunk
comment, an editor selection, a dragged path, Tori inserts the text at the
prompt and stops. It never presses Enter for you. The text goes in as a
bracketed paste, cleaned of anything that could end the paste early, so
what you see at the prompt is exactly what will run, and only once you run
it.

A program in a terminal can set the clipboard, which is how a copy over ssh
works. It cannot read the clipboard.

## Environment

Every tab's shell gets `TERM_PROGRAM=Tori` and `TERM_PROGRAM_VERSION`. A
shell Tori opened also has the [`tori` CLI](/docs/automation/cli/) on its
PATH and a token of its own, so `tori` commands run there know which tab,
project and folder they were called from.

Terminals keep rendering smoothly with many tabs open: at most eight hold a
GPU context at once, and the one you looked at least recently gives its up
first and takes it back when you return.

## tmux auto attach

If your shell's rc file auto attaches tmux, guard that block on
`[[ "$TERM_PROGRAM" != "Tori" ]]`, since Tori sets `TERM_PROGRAM=Tori`. Tori
does not work around this for you: doing so would fool any tmux-aware prompt
or plugin you actually want to keep working elsewhere.

## Git credentials in a terminal

git and ssh prompts for a password route through a native Tori dialog
instead of hanging a background `git fetch` for a TTY that is not there.
Separately, Tori can register itself as your git credential helper so a
signed-in host account from Settings > Integrations wins over a stale
keychain entry, either for what Tori itself runs, or for git anywhere on
your machine, depending on what you choose per host.

## The dock

The dock is a strip of terminal tabs along the bottom of the window, separate
from the panes, for things that are not part of any branch: clones, installs,
sign-ins, and shells at your home folder.

- `Cmd+Ctrl+J`, or the terminal button at the end of the sidebar's space strip,
  shows or hides it. While it is hidden, the button counts its tabs.
- The **+** in the dock's strip, **New shell at your home folder**, opens a
  plain shell.
- Drag the dock's top edge to resize it. Its height and whether it is open are
  remembered.

When Tori runs a command for you, a clone from **New in space**, an agent
install, a sign-in, it opens in the dock, in front, while the branch you were
on stays selected. The dock hides itself again when its last tab closes, so a
clean clone is: dock up, progress, dock gone. A command that fails keeps its tab
with `exit N` and its output, and the toast's **Show** brings it back in front.

With nothing in it the dock says **Nothing running. Clones, bootstraps,
installs and sign-ins show up here.** Shells in the dock are not restored after
a relaunch.

## Restored tabs

After a relaunch every terminal tab comes back in its place, but nothing is
started until you click it. A shell tab then gets a fresh prompt in the same
folder; an agent tab resumes its session. Scrollback is not restored.
