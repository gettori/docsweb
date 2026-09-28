---
title: Terminal
description: A real login shell per tab, and how Tori handles git credentials.
---

Every shell tab runs your actual login shell (`$SHELL`, or `/bin/zsh` if
unset) as a login, interactive shell, so it sources your own profile and rc
files and owns its own PATH. Tori adds nothing on top and strips nothing
out; a **command** tab, by contrast, runs one program directly, never a
login shell, so nothing in your rc files can swallow it.

`Cmd+F` searches inside the focused terminal; this is separate from
`Cmd+Shift+F`, which searches the whole project. Dropping a sidebar row or a
file tree path onto a terminal types its path at the prompt as a mention.

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

## Session history

Every workspace folder's terminal tab strip has a **Session history**
dropdown: open sessions first, then everything else bucketed by when it last
ran. Deleting a session from here removes its transcript for agents that
keep one; for agents that do not, it only forgets the entry in Tori, the
agent's own history is untouched.
