---
title: Tori's own MCP server
description: Give an agent session direct access to Tori itself.
---

`tori mcp` is a stdio MCP server that exposes Tori itself as a set of tools:
listing sessions, reading a transcript, starting a worktree, creating a
checkpoint diff, asking you a question and waiting for the answer, opening a
pull request. Every tool call becomes one call on the same protocol the
`tori` CLI and the phone app use, so there is one source of truth for what
Tori can do, not three.

## How a session gets it

A Claude session gets it automatically: Tori writes a small MCP config file
naming `tori mcp` as a server and passes it on launch. An ACP agent (Codex,
OpenCode today) gets it the same way, sent as part of its own session setup,
only for adapters measured actually calling a server they were handed. A
worker session autopilot spawned gets the same tools, with outward actions
(opening a pull request, submitting a review, merging) gated behind an
approval you gave beforehand rather than a permission prompt mid-task, since
nobody is watching a background worker's chat directly.

## What it will not do without you

Anything that leaves the machine, a pushed branch, a posted review, a merge,
needs an approval reserved for that exact action and exact draft content
ahead of time. A worker cannot invent its own approval, spend one meant for
something else, or reuse one twice.

## Reading a session's tools

Every tool an agent can see is scoped to what kind of caller it is; a
worker session, for instance, never sees the tools that would let it spawn
another session or start or stop autopilot itself. From inside Tori, a
session's overflow menu > Session shows the live MCP servers it has
connected, including this one, and how many tools each exposes.

## Every tool

Tool names are the method names with the dot as an underscore, so
`session.spawn` is the tool `session_spawn`, which Claude shows as
`mcp__tori__session_spawn`. The last column is who may call it: a **shell**
is a terminal tab or a script, a **chat** is a session you drive, a
**worker** is a session another session spawned, and the **phone** is a
paired device. **Everyone** means shell, chat and worker; the phone is named
wherever it is included.

| Tool | What it does | Who may call |
| --- | --- | --- |
| `sessions.list` | Sessions, newest first, with whether each is live and its state | Everyone, phone too |
| `session.tail` | The last events of a conversation, tool output capped | Everyone, phone too |
| `session.history` | A conversation a page at a time, by whole turns | Everyone, phone too |
| `session.wait` | Wait for a session to stop working; its state, pending question and last message | Shell, chat |
| `session.pending` | What a session is waiting on, each with its id | Shell, chat, phone |
| `session.answer` | Answer a question or permission prompt of a session you spawned | Chat, phone |
| `session.spawn` | Start a session, optionally in a new worktree, with a first message and files | Shell, chat, phone (a plain chat only) |
| `session.steer` | Send a message to a live chat, as a steer or as its next turn | Shell, chat, phone |
| `session.interrupt` | Stop a live chat's current turn | Shell, chat, phone |
| `session.info`, `session.model`, `session.mode` | Read or switch a live chat's model and permission mode | Outside shell, phone |
| `caller` | Who is calling: the session or tab, its agent, account and folder | Everyone, phone too |
| `projects.list` | The tree the sidebar draws, then Topics with their members | Everyone, phone too |
| `project.icon` | The image a project's row shows | Everyone, phone too |
| `worktree.new` | Create a worktree on a new branch, from an issue or a pull request if given | Everyone |
| `window.open` | Open a file in Tori's editor | Everyone |
| `budget` | Spend against your ceilings, and the agent's quota windows | Everyone |
| `checkpoints.list`, `checkpoint.diff`, `checkpoint.revert` | A session's per-turn checkpoints: list, diff, revert | Everyone |
| `ask.create` | Ask you a question in the calling chat and wait | Chat, worker |
| `ask.wait` | Wait for the answer to a question asked earlier | Everyone |
| `ask.answer` | Answer another session's question on your behalf | Shell, chat, phone |
| `issues.assigned` | Open issues assigned to you, then pull requests waiting on your review | Everyone |
| `issues.get` | One issue: title, body, url and a suggested branch name | Everyone |
| `issues.link_branch` | Make a branch on the host under an issue and fetch it | Shell, chat |
| `pr.get` | One pull request to review, with the lines a comment may anchor to | Shell, chat |
| `pr.create` | Push an exact commit, never forced, and open a pull request | Everyone; a background session needs an approval |
| `review.submit` | Submit a review: a verdict, a body and line comments | Everyone; a background session needs an approval |
| `pr.merge` | Merge a pull request at the head commit given | Everyone; a background session needs an approval |
| `pr.watch`, `pr.unwatch` | [Watch a pull request](/docs/git/pull-requests-and-issues/#let-a-chat-watch-a-pull-request) and be woken with its news | Chat, and only with the setting on |
| `topic.member.promote` | Give a [Topic](/docs/workspace/topics/#chats-in-a-topic) member a worktree so the chat can change it | Chat, worker |
| `autopilot.state` | The autopilot's queue | Everyone, phone too |
| `autopilot.item.update`, `autopilot.project.set`, `autopilot.hold.resolve` | Update a queue item, set a project's contract, withdraw a hold | Shell, chat |
| `autopilot.start`, `autopilot.stop` | Turn the autopilot on or off | Shell, phone. Never an agent session |

A few methods exist only for the phone's screens and are on no agent's tool
list: the git standing of each worktree, the pull request line of each
branch, and the autopilot's log. Pairing a device can only be done from the
Mac itself.

A tool a caller may not use is left off its list rather than listed and
refused. A worker that still reaches for one is told why: a worker never
spawns or steers, it finishes its turn and its spawner reads the result.

## The CLI

`tori mcp` is also a subcommand of the plain `tori` CLI, alongside commands
for listing sessions, tailing a transcript, creating a worktree, and the
rest of the same tool surface from a shell instead of an agent. Run `tori
mcp` yourself to start the server directly, useful for wiring a session up
by hand outside of Tori's own launch flow.
