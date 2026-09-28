---
title: Files on disk and privacy
description: Everything Tori writes, and what it sends over the network.
---

## Privacy

Tori sends no telemetry: no analytics, no crash reporting, no usage
tracking. It makes exactly two network requests on its own behalf, both
anonymous, both at most once a day, both silent on failure: a check against
GitHub Releases for a newer version (never downloads or installs anything on
its own), and a read of a public, unauthenticated model list that feeds the
context meter.

Everything else is your agent's own traffic, going straight from your
machine to its vendor, exactly as it would from a plain terminal. Tori
starts the process, reads its output, and writes to its input; it adds no
endpoint of its own and proxies nothing. The same is true of MCP servers:
Tori reads and writes an agent's own config files, and the agent, not Tori,
connects to whatever they name. Git pushes and fetches go straight from your
system `git` to your remote.

## What is on disk

Everything Tori itself writes is a plain file, mostly under
`~/.config/tori/`:

| Path | What |
| --- | --- |
| `settings.json` | Every setting on the [Settings](/docs/reference/settings) page |
| `tori.toml` | Your spaces, projects and folders |
| `state.json` | First-run flag and a couple of one-time notice flags |
| `agents/*.toml` | Custom or overridden agent adapters |
| `lsp/*.toml`, `dap/*.toml`, `formatters/*.toml` | Custom language server, debugger and formatter overrides |
| `themes/*.json` | Custom theme palettes |
| `checkpoint-index/`, `checkpoint-touched/` | Per-turn checkpoint bookkeeping |
| `trusted.json` | Projects you have marked trusted to run project code |
| `hot-exit.json` | Unsaved editor buffers, stashed across a quit |
| `accounts.json` | Registered agent accounts |
| `devices.json` | Paired phones (never the plaintext credential) |
| `scratch/` | Untitled scratch buffers |

Local file history lives inside each git repository's own object store, not
under `~/.config/tori`, so removing a repo removes its history with it.

Two things live outside `~/.config/tori`: the published model list Tori
caches for the context meter, under `~/Library/Caches/tori/`, and per-account
agent logins and usage snapshots, under `~/Library/Application Support/tori/`.

Deleting all of the above removes every trace of Tori. Your agent CLIs' own
session data (Claude Code's transcripts, for example) is never touched;
Tori only reads it.
