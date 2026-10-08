---
title: Files on disk and privacy
description: Everything Tori writes, and what it sends over the network.
---

## Privacy

Tori sends no telemetry: no analytics, no crash reporting, no usage
tracking. Its own network requests are these six. The forge calls carry what
you send through them, such as a pull request you open or a review you submit;
nothing about your code or your sessions goes out in any of the others:

- **GitHub Releases**, at most once a day, to see whether a newer version of
  Tori exists. Anonymous. It never downloads or installs anything on its own.
- **`openrouter.ai/api/v1/models`**, at most once a day, for the published
  per-model context window sizes the context meter reads. Anonymous, and
  cached to disk.
- **SchemaStore's catalog** (`schemastore.org`), at most once a day and only
  when the JSON or YAML language server starts, so it knows which schema
  validates which file. Anonymous, and cached to disk.
- **Installs you accept**: a language server, debugger or agent that Tori
  offers to install. A downloaded release is checked against the sha256 pinned
  for it; a package install runs `npm` or `pip` the way you would.
- **GitHub or GitLab's API**, only when you sign in to that forge and from then
  on, for pull requests, issues, checks and reviews. It carries your own token.
- **`api.anthropic.com/api/oauth/usage`**, only if you light a model's own
  weekly chip on a Claude account, for that window's quota. It carries that
  account's token, read from your login Keychain for the one request.

The first three fail silently. Use the app offline to stop all six.

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
| `attachments/` | Files you pasted or dropped into a chat, handed to the agent by path |
| `chat-queues/` | Each chat's queued messages, one file per session, removed when the queue empties or the session is deleted |
| `stash.json` | Drafts stashed from the composer with `Cmd+S`, up to 20 |
| `crashes/` | A file per crash: version, thread, message and backtrace. Never sent anywhere |
| `topics.json` | Your [Topics](/docs/workspace/topics/) and their members |
| `forge_accounts.json` | Your GitHub and GitLab accounts and which repository uses which |
| `unit_issues.json` | Which branch was started from which issue |
| `autopilot/` | The [Autopilot's](/docs/automation/autopilot/) queue and log |
| `icons/` | Project icons you uploaded |
| `servers/` | Language servers Tori installed for you |
| `debuggers/` | The virtualenv Tori keeps for debugpy |
| `setup/` | Output of each worktree's [setup command](/docs/git/worktrees-and-branches/#a-setup-command-for-new-worktrees) |
| `claude-mcp.json` | The MCP configuration that gives Claude sessions [Tori's MCP server](/docs/automation/mcp-server/) |
| `gitconfig` | The git credential settings used when a host account serves git |
| `adopted.json` | Older sessions of a recreated folder you chose to adopt |
| `update-check.json` | When Tori last looked for an update |

Local file history lives inside each git repository's own object store, not
under `~/.config/tori`, so removing a repo removes its history with it.

Inside a project, Tori writes only these, and only when you use the feature
behind each:

| Path | What |
| --- | --- |
| `<project>/.tori/settings.json` | Editor and language tooling overrides for that project |
| `<repo>/.tori/worktrees/` | A [Topic's](/docs/workspace/topics/) worktrees, for a plain repo |
| `<project>/.shared/` | Files [shared across worktrees](/docs/git/shared-files) |
| `<repo>/.mcp.json` | Written only when you add an MCP server from a chat's Session menu |

Checkpoints and backstops are git objects in the repository's own object
store, with their bookkeeping under `~/.config/tori/`. They are never
commits on your branch and are never pushed.

Account homes that Tori creates for extra Claude accounts live under
`~/Library/Application Support/tori/profiles/`, each with a `claude-<name>`
command script in `~/.local/bin/`, and the latest usage readings
under `~/Library/Application Support/tori/usage/`. The published model list Tori uses for the context meter is cached under `~/Library/Caches/tori/`.

Deleting all of the above removes every trace of Tori. Your agent CLIs' own
session data (Claude Code's transcripts, for example) is never touched;
Tori only reads it.
