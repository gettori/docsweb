---
title: Security model
description: What Tori will and will not do on its own, and where each guard sits.
---

An app that runs coding agents sits between untrusted input (a cloned
repository, a web page an agent read, a pull request from a stranger) and
things that matter (your shell, your credentials, your git remote). This
page lists the guards Tori puts between the two, in one place.

The short version:

- A folder cannot run its own code until you trust it.
- Nothing is pushed, posted or merged by a background session without an
  approval you gave for that exact draft.
- Tori never presses Enter in your terminal.
- A destructive action either asks first or takes a snapshot first.
- A turn in which an agent read a secret file says so.
- An edit to a file the agent never looked at says so.
- A turn that changed code says whether a check ran after it, and how it
  ended.
- Nothing about you or your code is sent anywhere by Tori itself.

## Project trust

Opening a repository in most editors runs its code: a language server loads
the workspace's own compiler plugins, git runs the repository's hooks, an
agent reads the folder's own settings. In Tori none of that happens until
you trust the project.

| What | In an untrusted project |
| --- | --- |
| Language servers that load project code (TypeScript, rust-analyzer and others) | Do not start. JSON and YAML servers, which run nothing from the project, still work |
| Debuggers | Do not start, for every debugger, since the program being debugged is the project's own |
| Formatters | Do not run. The editor offers to trust once per session on save, and every time on a manual Format Document |
| Git | Does not run, since a repository's own config and hooks run with it. The refused folder offers the trust prompt |
| Claude | Starts without the folder's own settings, so its hooks cannot run on the first message |
| Editing, highlighting, saving | Work as usual |

The first refused start shows a prompt with **Trust**, and trusting replays
what was refused, so nothing has to be reopened. One answer covers every
worktree of the project.

Trust lives in `~/.config/tori/trusted.json`, outside any repository, so a
repository cannot mark itself trusted. Settings > Languages > Projects lists
trusted and untrusted projects with a search, **Revoke** and **Revoke all**.

Two related rules follow the same idea, that a repository never grants
itself anything:

- A project's `.tori/settings.json` can turn a language server or linter
  off for that project. It cannot turn one back on that you turned off.
- A project's
  [setup command](/docs/git/worktrees-and-branches/#a-setup-command-for-new-worktrees)
  is stored in your own settings, not in the repository, and never runs for
  a worktree made from a fork's pull request.

## What leaves the machine

A chat you are driving asks you before it acts, through the agent's own
permission prompts. A session nobody is watching, an autopilot worker or
anything started with `tori spawn --background`, cannot be trusted to a
prompt nobody will see, so it works under a stricter rule: an outward
action needs an approval reserved for it ahead of time.

- Opening a pull request, submitting a review and merging are each their
  own approval.
- An approval names the exact draft: the title, body and branches, or the
  verdict and every line comment, or the merge method, and the exact commit.
  It is spent once. A worker cannot invent one, spend one meant for
  something else, or reuse one.
- Opening a pull request pushes exactly the approved commit, never with
  force. If the branch has moved past it, the push is refused.
- A review is pinned to the head commit that was read. If the pull request
  moved, the review is refused rather than posted against code nobody
  reviewed.
- Tori pre-allows only its own tools for a session. Everything else an
  agent wants still goes through the agent's permission prompt, and the
  autopilot does not answer a worker's permission prompts: they wait for
  you.

See [Autopilot](/docs/automation/autopilot/#approvals).

## Secret watch

When an agent opens a file that looks like it holds a secret, Tori marks the
turn. It is a record, not a gate: nothing is blocked and nothing asks you, it
tells you afterwards what happened. It is on by default; **Settings > Chat >
Mark secret file reads** turns it off, and every mark goes with it.

The mark makes one of two claims, depending on how much Tori actually knows:

- **Read a secret file**: a read or search tool opened the path.
- **A command named a secret file**: a shell command had the path as one of
  its words, as in `cat .env`, `docker run --env-file=.env` or
  `cp ~/.aws/credentials /tmp`. Tori cannot tell whether the command read the
  file, so it says less.

| Where | What you see |
| --- | --- |
| Chat transcript | A line at the head of the turn, with the paths in its tooltip, and a key on every tool card that touched one. Live and in a reopened chat, for Claude and ACP agents |
| Tab | A key on the corner of the session's mark while the session is live, for a chat and for a terminal tab running Claude |
| History dropdown | The same key on a live session's row |
| Changes panel, Checkpoints | A key on the row of the turn that did it, for Claude sessions |

The files it watches:

- `.env` and `.env.*`, except names ending in `.example`, `.sample` or
  `.template`
- `*.pem` and `*.key`
- `id_rsa`, `id_ed25519`, `id_ecdsa` and `id_dsa`, never a `.pub` file
- `credentials` and `credentials.json`
- `.netrc`
- Everything under `~/.aws/` and `~/.config/gh/`
- Files with no extension under `~/.ssh/`, except `config`, `known_hosts` and
  `authorized_keys`

To watch more, add patterns to `~/.config/tori/settings.json`:

```json
{
  "secretWatch": {
    "patterns": ["*.secret", "~/vault/"]
  }
}
```

A pattern with a `/` in it is a folder, and everything under it counts. Any
other pattern is matched against the file name, with `*` and `?`. The list
only adds to the defaults; none of them can be switched off. A change takes
effect without a restart, and a reopened chat is checked against the list as
it is now. A project's own `.tori/settings.json` cannot change this list, so
a repository cannot narrow what Tori watches. A value that is not a list of
strings is ignored, and the rest of your settings are kept.

## Blind edits

An agent that changes a file it never opened in the session is guessing at
what is in it, and the diff does not show that. Tori marks such an edit
**Edited without reading**. Like secret watch it is a record, not a gate. It is
on by default; **Settings > Chat > Mark edits made without reading** turns it
off, and every mark goes with it.

It covers ACP agents only. Claude's own Edit and Write tools already refuse a
file the agent has not read, so a Claude chat never gets the mark.

A file counts as seen, and an edit to it is not marked, when earlier in the
same session:

- a read or search tool opened it,
- a search printed a match from it (a `path:line` result from `rg` or `grep`),
- a shell command had its path as one of its words, as in `cat src/a.rs` or
  `cd src && sed -n 1,80p a.rs`,
- the agent created it, or already edited it,
- or it was moved from a path that counted as seen.

A folder never counts for the files in it, so `ls src` or `find .` does not
make every file under it seen. A read after the edit does not clear the mark,
a failed or refused edit is never marked, and deleting a file is not an edit.
Only the first blind edit of a file is marked, since the agent has seen it
from then on.

| Where | What you see |
| --- | --- |
| Chat transcript | A line at the head of the turn, with the paths in its tooltip, and an eye with a slash on the tool card that made the edit. Live, in a reopened chat and after a reload |

Tori keeps track while the setting is off, so switching it back on shows the
marks again. An edit made while it was off gets its mark the next time the
chat is opened.

## Verification

A turn that changed code gets a badge saying whether the agent checked its
work afterwards: a test run, a type check, a lint or a build. Like the marks
above it is a record, not a gate. Tori never runs a check for the agent and
never holds a turn back. It is on by default; **Settings > Chat > Mark
unverified turns** turns it off, and every badge goes with it.

The badge reads the last check the turn ran after its last edit:

- **Verified**: it passed.
- **Checks failed**: it failed.
- **Unverified**: the turn changed code and ran no check after its last edit,
  or the check ran but Tori could not see its exit.

A check before a later edit does not count, since the code it passed is not
the code the turn left behind. A turn that only ran a check, or changed
nothing, gets no badge. Code changed means an edit, write, delete or move by
the agent's file tools, a subagent's included. A file written by a shell
command (`sed -i`, `echo > file`) does not count, so a turn that only did
that gets no badge.

Tori only trusts an exit that belongs to the check. These count as **ran,
exit not seen**, and a turn resting on one reads unverified:

- a check piped into another command, as in `cargo test | tail`,
- a check followed by `;` or `||`, as in `pnpm test || true`,
- a check run in the background,
- a check that timed out or that you interrupted.

`cd app && cargo test` and `cargo fmt && cargo test` are trusted: the exit is
the last command's, and the ones before it had to succeed for it to run. A
call you rejected never ran, so it checked nothing. When a chain of checks
fails, the badge says which chain, not which check in it. When the chain also
holds a command that is not a check, like `pnpm install && pnpm test`, Tori
cannot tell which one failed and calls it exit not seen; `cd` and `export`
are assumed not to be what failed.

| Where | What you see |
| --- | --- |
| Chat transcript | A badge at the head of the turn. Its tooltip says what decided it and lists every check, as in `cargo test: passed in 14.2s`, `pnpm test: failed, exit 1 after 3.1s` or `cargo test: ran, exit not seen`. Live and in a reopened chat, for Claude and ACP agents |
| Tab | A tick, a cross or a dashed circle on the corner of the session's mark for its latest turn that changed code, while the session is live, for a chat and for a terminal tab running Claude. A later passing turn clears an earlier failure. A screen reader hears failed and unverified, not verified |
| History dropdown | The same mark on a live session's row |
| Changes panel, Checkpoints | The badge on each turn's row, for Claude sessions |

The time shows for a check Tori watched run. A Claude chat reopened from its
transcript shows the result without it.

### What counts as a check

A command counts when its words start with one of the list's entries, with
anything after them: `cargo test --workspace` matches `cargo test`, and a
script with a suffix like `pnpm test:unit` matches `pnpm test`, but
`pnpm testing` does not. Tori looks through `cd`, `export`, environment
assignments like `CI=1`, and wrappers such as `npx`, `bunx`, `pnpm exec`,
`pnpm dlx`, `uv run`, `poetry run`, `python -m`, `timeout`, `time`, `nice`
and `env`, so `uv run pytest -q` and `timeout 600 cargo test` both count. A
command inside `bash -c "..."` is read the same way.

The built-in list:

- `cargo test`, `cargo check`, `cargo clippy`, `cargo build`,
  `cargo nextest`
- `npm test`, `npm run test`, `npm run lint`, `npm run build`,
  `npm run typecheck`, `npm run check`
- `pnpm`, `yarn` and `bun` with `test`, `lint`, `build`, `typecheck` and
  `check` (`bun run` for all but `bun test`)
- `tsc`, `vitest`, `jest`, `eslint`
- `pytest`, `mypy`, `ruff`
- `go test`, `go vet`
- `make test`, `make check`
- `gradle test`, `./gradlew test`, `swift test`

To set a project's own list, right-click the project and choose
**Verification commands**. The dialog opens on the list in force, one
command per line. **Save** replaces the built-in list for that project, it
does not add to it, so keep the defaults you still want. **Reset to
defaults** goes back to the built-in list. The list applies to every
worktree and folder inside the project, a nested project's own list wins
over its parent's, and a change applies from the agent's next turn without a
restart. A reopened chat is checked against the list as it is now.

The list lives in your own `~/.config/tori/settings.json`, under
`verification.commands`, keyed by the project's path. Tori never reads one
from the repository, so a project cannot claim its own work is verified.

## Your terminal

- **Tori inserts, you run.** Text Tori sends to a terminal, a hunk comment,
  a selection, a dragged path, is placed at the prompt as a bracketed paste
  and left there. Tori never presses Enter. The text is cleaned of anything
  that could end the paste early and smuggle a command in after it.
- **A program cannot read your clipboard.** It can set it, which is how a
  copy over ssh works.
- **Tori's own commands run directly**, not typed into a login shell, so
  nothing in an rc file can swallow or rewrite them.

## Rendered content

Agents and repositories both produce text that gets rendered: chat replies,
Markdown previews, pull request bodies.

- Rendered HTML is sanitized. Chat shows raw HTML as text.
- A remote image in chat becomes a link rather than a request your machine
  makes on sight.
- Links in a Markdown preview are routed through Tori rather than followed
  inside the app.
- The app runs under a content security policy, on the desktop and on the
  phone, and can read files only under your home folder, external volumes
  and the temp folder.

## Credentials

| Credential | Where it lives | What Tori does with it |
| --- | --- | --- |
| Your agent's existing login | Wherever the agent keeps it | Never copied or stored. The agent process reads it itself |
| An extra agent account you add | Its own home folder, readable only by you | Kept separate, so two logins never collide |
| An agent's usage token | The system keychain | Read only if you opt in per account, and then held in memory, never written out |
| GitHub and GitLab sign-in | The system keychain | Used by the app's own requests; it is never handed to the window that draws the interface |
| Git passwords and passphrases | Nowhere in Tori | A prompt opens a native dialog, and the answer goes straight to git. If the dialog cannot be shown, the prompt fails rather than hanging or guessing |
| A paired phone's credential | The phone | Shown once at pairing. `devices.json` never holds the plain credential, and it is kept out of Android backups and device transfers |

## The socket, the CLI and the MCP server

The [`tori` CLI](/docs/automation/cli/), the
[MCP server](/docs/automation/mcp-server/) and the phone app all speak one
protocol. On the Mac it is a local socket; the phone reaches it only through
[remote access](#remote-access).

- Every terminal tab and chat gets a token of its own, so a call is
  attributed to the session that made it.
- What a caller may do depends on what it is. A worker cannot spawn or
  steer. No agent session can turn the autopilot on or off. Pairing a
  device can only be done at the Mac. The
  [table](/docs/automation/mcp-server/#every-tool) lists every method.
- A tool a caller may not use is left off its tool list entirely.
- A phone connects with its own device credential, which is not accepted
  on the local socket, and the local token is not accepted from the
  network.

## Remote access

Off by default. When on, Tori listens on your Tailscale address or on this
Mac only, never on the local network, and a local network address saved by
an older build is refused. Pairing uses a code that lives five minutes,
works once, and burns after five wrong tries. **Revoke** closes a device's
connection immediately. See [Pairing](/docs/phone/pairing/).

## Destructive actions

| Action | Guard |
| --- | --- |
| Deleting a file in the tree | Goes to the Trash |
| Discard all changes | A snapshot is taken first, restorable from Backstops |
| Reverting to a checkpoint | The current state is saved as a backstop first, so the revert can be undone |
| Whole tree actions while another session is working in the folder | Blocked, or flagged |
| Removing a worktree or branch | Shows whether it is dirty, has unpushed commits, and how many tabs are open in it, before you confirm |
| Amending a commit that looks pushed | Asks first |
| Replace across files | Each file is checked and skipped whole on any doubt |
| Promoting a fan out attempt | Cannot be undone, and says so |
| Dropping a stash | Cannot be undone, and says so |

## Which agents may run where

A project can be limited to the agents and accounts you pick, so a client's
repository only ever runs on that client's login. Anything else is refused
before a session starts or resumes. See
[Limiting agents per project](/docs/agents/accounts-and-usage/#limiting-agents-per-project).

Tori keeps no permission rules of its own. When you answer an agent's
prompt with "always in this project", that choice travels back to the agent
in its own format and lives in the agent's own files.

## What Tori installs

Language servers and debuggers Tori installs for you come from a pinned
catalog: an exact npm version, or a GitHub release checked against its
sha256 before anything is written. They are kept under `~/.config/tori/`,
and a copy of your own on the PATH always wins.

## Network

Tori sends no telemetry. See
[Files on disk and privacy](/docs/reference/files-and-privacy/) for the two
requests it makes on its own behalf.

## Reporting a problem

If you find a way for a folder, a transcript or a document to run code it
should not, report it privately as described in
[SECURITY.md](https://github.com/gettori/tori/blob/main/SECURITY.md).
