---
title: The tori CLI
description: Scripting Tori from a shell.
---

The `tori` binary doubles as a CLI: run from any shell, including a terminal
tab Tori itself spawned, it talks to the running app over the same protocol
its MCP server and phone app use. Tori has to be running. Every shell Tori
opens has `tori` on its PATH already.

```sh
tori sessions [--live] [--cwd <path>] [--limit <n>] [--json]
tori projects [--json]
tori session tail <id> [--lines <n>] [--agent <id>] [--json]
tori session wait <id> [--timeout <secs>] [--json]
tori session pending <id> [--json]
tori session answer <session> <id> <text>...
tori session answer <session> <id> --each <text>...
tori events [--topic <topic>]...
tori whoami [--json]
tori steer <id> <text>...
tori interrupt <id>
tori worktree new <branch> [--project <path>] [--from <ref>]
tori checkpoints <id> [--json]
tori checkpoint diff <id> <n> [<m>]
tori checkpoint revert <id> <n> [--force]
tori spawn [--agent <id>] [--account <id>] [--model <id>] [--mode <id>] [--effort <level>]
           [--folder <path> | --new-worktree <branch> [--project <path>] [--from <ref>]]
           [--prompt <text>] [--attach <path>]... [--background] [--json]
tori open <path> [--line <n>]
tori budget [<id>] [--folder <path>] [--json]
tori ask <question>... [--option <text>]... [--timeout <secs>] [--approval <json> [--project <path>]]
tori ask --wait <id> [--timeout <secs>]
tori ask --answer <id> <text>...
tori pr create --head <branch> --head-sha <sha> --base <branch> --title <text>
               [--body <text>] [--draft] [--project <path>] [--approval <id>] [--json]
tori pr review <number> --event approve|comment|request-changes --head-sha <sha>
               [--body <text>] [--comments <json>] [--project <path>] [--approval <id>]
tori pr merge <number> --method merge|squash|rebase --head-sha <sha>
               [--project <path>] [--approval <id>]
tori autopilot state [--json]
tori autopilot start|stop [--json]
tori autopilot item [<id>] [--kind ship|review --issue <key> | --pr <number> --repo <owner/name>]
                    [--project <path>] [--state <state>] [--worktree <path>] [--session <id>]
                    [--pr-url <url>] [--note <text>] [--title <text>] [--contract <text>] [--json]
tori autopilot project [--project <path>] [--ships pr|local]
                       [--autonomy ask-everything|auto-until-outward] [--pickup ask|auto]
                       [--agent <id>] [--account <id>] [--model <id>] [--json]
tori autopilot hold resolve <id> [--json]
tori mcp
```

`--json` is available on read commands for scripting. Exit codes: `0` on
success, `2` for `tori ask` specifically when it returns a question's id
with no answer yet, distinct from a real failure so a script can tell the
two apart, and `1` for everything else that went wrong.

## Who is calling

Every terminal tab and every chat Tori starts gets a token of its own, so
the app knows which session a command came from and fills in its project,
folder, agent and account. That is why `tori worktree new fix/retry` needs
no `--project` when you run it inside a project's tab. `tori whoami` prints
what Tori thinks you are.

A command run from a terminal outside Tori is an outside caller: it works,
with no defaults, so pass `--project` or `--folder`.

## Looking

```sh
$ tori sessions --live
ID                                    AGENT   ACCOUNT  STATE      BRANCH          FOLDER                 TITLE
7c1e9a2f-4b0d-4e2a-9f61-3d8c2b7a5e14  claude  work     needs you  feat/webhooks   ~/work/api-webhooks    Sign webhook payloads
d4b80c13-9e7f-4a55-8c02-61f0e3a9b7d2  codex   default  working    fix/rate-limit  ~/work/api-rate-limit  Cap the rate limiter
```

- `tori sessions` lists sessions, newest first. `--live` keeps only the
  running ones and `--cwd` only those in a folder.
- `tori projects` prints the tree the sidebar draws: spaces, projects and
  branch rows, then Topics with their members.
- `tori session tail <id>` prints the last events of a conversation, with
  tool output capped.
- `tori session wait <id>` blocks until a session stops working, then
  prints its state, the question it is waiting on if any, and its last
  message.
- `tori session pending <id>` lists what a session is waiting on: questions
  and permission prompts, each with the id `session answer` takes.
- `tori events` streams what happens in the app as lines of JSON, until you
  stop it. `--topic` narrows it, and can be repeated.
- `tori budget` prints spend for a session and its project against your
  [ceilings](/docs/agents/limits-and-spending/), and the agent's
  quota windows.
- `tori checkpoints <id>` lists a session's checkpoints, numbered by turn.
  `tori checkpoint diff <id> <n>` prints what turn `n` changed, and
  `<n> <m>` spans a run of turns.

## Acting

- `tori spawn` starts a session and prints its id. `--new-worktree` makes
  the worktree first (and waits for the project's
  [setup command](/docs/git/worktrees-and-branches/#a-setup-command-for-new-worktrees)
  when that is turned on). `--prompt` is its first message and `--attach`
  adds files to it.
- `tori steer <id> <text>` sends a message to a live chat: a steer if a turn
  is running, its next turn if not.
- `tori interrupt <id>` stops a chat's current turn.
- `tori session answer` answers a question or a permission prompt by id.
  `--each` answers a question that has several parts, one answer per part.
- `tori worktree new <branch>` creates a worktree and prints its path.
- `tori checkpoint revert <id> <n>` puts the session's folder back to turn
  `n`. A backstop is taken first.
- `tori open <path> --line <n>` opens a file in Tori's editor.

```sh
$ tori spawn --agent codex --new-worktree fix/retry --prompt "retry 5xx deliveries"
0f3b7d5e-8c2a-4b1e-9d6f-2a7c4e1b9f30
$ tori steer 0f3b7d5e-8c2a-4b1e-9d6f-2a7c4e1b9f30 "also cover 429s"
```

## Asking you

`tori ask` puts a question card in the chat that called it, raises the
needs you dot and a notification, and waits. It prints only the answer, so
a script can branch on it:

```sh
if [ "$(tori ask "Deploy to staging?" --option yes --option no)" = "yes" ]; then
  ./deploy.sh staging
fi
```

If the wait runs out it prints the question's id and exits `2`.
`tori ask --wait <id>` collects the answer later, and
`tori ask --answer <id> <text>` answers one on your behalf from another
shell.

## Pull requests

`tori pr create`, `tori pr review` and `tori pr merge` each take the exact
commit they act on as `--head-sha`. `pr create` pushes that commit to the
head branch, never forced, and then opens the pull request; it is refused
if the local branch has moved past that commit. A review or a merge is
refused the same way if the pull request's head is no longer the one named.

From a background session these three need `--approval <id>`: the id of an
approval you gave for exactly this draft. See
[Autopilot](/docs/automation/autopilot/).

## Autopilot

`tori autopilot state` prints the queue. `start` and `stop` turn the
autopilot on and off. `item` adds or updates a queue item, `project` sets a
project's contract, and `hold resolve` withdraws a pending approval card (it
never approves one; only you do, on the card).

## What a caller may do

Not every caller gets every command. A session another session spawned (a
worker) can ask you questions but cannot spawn or steer. No agent session,
worker or not, can turn the autopilot on or off: that takes a person at a
shell or on a paired phone. A paired phone can read, steer, interrupt,
answer and approve, and start a plain chat in a folder, but cannot pair
another device. The full table is on the
[MCP server](/docs/automation/mcp-server/#every-tool) page, since both
fronts share it.
