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

## The CLI

`tori mcp` is also a subcommand of the plain `tori` CLI, alongside commands
for listing sessions, tailing a transcript, creating a worktree, and the
rest of the same tool surface from a shell instead of an agent. Run `tori
mcp` yourself to start the server directly, useful for wiring a session up
by hand outside of Tori's own launch flow.
