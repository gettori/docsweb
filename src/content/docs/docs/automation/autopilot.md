---
title: Autopilot
description: Hand a queue of work to Tori and it starts, watches and reports on workers.
---

Autopilot runs as an ordinary Tori chat session that reads a queue of work,
issues to ship, pull requests to review, and starts a worker session per
item. It never edits code itself, and nothing it does leaves your machine
without you approving it first: opening a pull request, submitting a review,
and merging are each their own approval, spent once, tied to the exact draft
shown to you.

:::note[Off by default]
Turn it on with **Enable autopilot** in Settings > Autopilot, which puts a
Cockpit switch in the title bar (`Cmd+Shift+J` toggles between it and your
normal workspace).
:::

## Per-project contract

Each project autopilot works in has a contract: how work ships (a pull
request, or just a local branch), how far it goes before asking you
(asking before every step, or going ahead alone on anything that stays on
the machine), and whether it queues new work on its own or proposes it and
waits. A project with no contract set runs on the cautious defaults: pull
request, ask before everything.

## The queue

Work items are either **ship** (take an issue to a pull request or a local
branch) or **review** (review someone else's pull request). Autopilot can
pick these up on its own from your assigned issues and review requests, or
you can hand it one directly. Every item you see in the Cockpit, in flight,
waiting, done, or failed, is one of these.

## The Cockpit

The full view shows crew on deck (workers currently running, each with a
Watch button to open its session), what is waiting at the dock, a Ship's
log of recent activity, and decision cards for anything that needs your
call: approve, edit, reply, or dismiss. A compact popup version is reachable
from anywhere with `Cmd+L`, without leaving your current workspace.

A session autopilot is actively driving cannot be typed into directly, its
composer is replaced with a bar naming what autopilot is doing and a button
to take it back.

## Settings

Settings > Autopilot: which agent, account and model the autopilot's own
session runs on; how many minutes a worker can sit silent mid-turn before
it is flagged stalled; how many workers run at once (capped one under your
chat concurrency warning); and an optional context percentage past which
Tori compacts between the autopilot's own turns.
