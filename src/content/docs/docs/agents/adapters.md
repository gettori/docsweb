---
title: Supported agents and adapters
description: The five bundled agent CLIs, and how to add another.
---

Tori does not bundle an agent CLI. It drives whichever ones you already have
installed, described by an adapter: a TOML file saying how to launch the
agent, where its transcripts live, how to tell a live process apart from a
dead one, and, for the agents Tori can hold a real conversation with, how to
drive it as structured chat rather than a plain terminal. An adapter is a
[pack](/packs/?kind=agents), so new ones arrive through the catalog.

## The five bundled agents

Claude, Codex, Copilot, OpenCode and Pi ship as built-in adapters. They are
not equally deep integrations:

- **Claude** talks over its own `stream-json` protocol and is the only agent
  with live status from its own hooks (rather than Tori guessing from the
  transcript), mid-turn steering, and a fork based rewind.
- The other four run over the [Agent Client Protocol](https://agentclientprotocol.com),
  a shared, smaller floor: no mid-turn steering, no rewind, and cost ceilings
  do not apply, since ACP reports context occupancy rather than spend.
- **Codex** and **Pi** each bridge through a small wrapper process
  (`@agentclientprotocol/codex-acp`, `pi-acp`) rather than talking to their
  main binary directly.
- Every bundled adapter was run and captured against a named version of its
  CLI, shown on its [catalog page](/packs/?kind=agents). Copilot's was
  measured as far as the handshake.
- **Copilot** cannot report whether you are signed in; its login flow exists,
  a signed-out state does not.
- **Pi** has the thinnest adapter: no sign-in check, no usage reporting, no
  install from Settings.
- Only **Claude** can be signed in with several accounts at once. The others
  keep one login each.

| | Claude | Codex | OpenCode | Copilot | Pi |
| --- | --- | --- | --- | --- | --- |
| Chat | Yes | Yes, needs `npx` | Yes | Yes | Yes, needs `npx` |
| Terminal tab | Yes | Yes | Yes | Yes | Yes |
| Status from the agent's own hooks | Yes | No | No | No | No |
| Steer a running turn | Yes | No | No | No | No |
| Rewind a chat | Yes | No | No | No | No |
| [Ask why](/docs/git/who-wrote-this/#ask-why) on a hunk | Yes | If it says it can fork | Yes | If it says it can fork | If it says it can fork |
| Dollar spending ceilings | Yes | No | No | No | No |
| Several accounts at once | Yes | No | No | No | No |
| Quota bars | Yes | Yes | No | No | No |
| Tori's MCP server handed to it | Yes | Yes | Yes | No | No |
| Install and update from Settings | Yes | Yes | Yes | Yes | No |
| Its config files listed in Settings | Yes | No | No | No | No |

The card in Settings is the source of truth for your installed version;
this table is the shape of it. Where an agent's chat goes through `npx`
(Codex and Pi), the card reads **Chat needs npx** when `npx` is missing, and
the terminal tab, which needs only the agent's own binary, still works.

An agent counts as ready when any one of its accounts is signed in. A
version older than the one Tori measured reads **Outdated**, with the
vendor's update command; a newer one says nothing, since being ahead of the
measurement is normal.

Installing, signing in, updating, turning an agent on or off, and its
models, files and plugins are all on its page in Settings. See
[Agents in Settings](/docs/agents/agent-settings/).

## Everything else

Any CLI agent that is not one of the five still runs in Tori as a plain
terminal tab: a session row in the tree, a working or needs you dot, and
checkpoints, just without the chat surface, model picker or structured tool
cards. This is the universal fallback for an adapter that declines to
describe a chat transport.

## Adding an agent

In Settings > Agents, **Add an agent** lists the agents in the
[catalog](/packs/?kind=agents); **Install** next to one writes its file and
it appears at once. For one the catalog does not have, drop a TOML file into
`~/.config/tori/packs/agents/`. Tori reads that folder once at startup, so a
new or edited file needs a restart to take effect. For an
agent that already speaks ACP, the file is about a dozen lines: how to
launch it, and nothing else, since the protocol carries models, permission
questions and history itself. For one that does not, the file also says where its
transcripts live and how to recognize a live process.

### An agent that speaks ACP

This is the whole file. Save it as `~/.config/tori/packs/agents/acme-acp.toml`,
restart Tori, and **Acme** appears in the launch menu and in Settings >
Agents:

```toml
schema_version = 2
id = "acme-acp"
label = "Acme"

[launch]
program = "acme"
base_args = []
yolo_args = []
resume_args = []

[chat]
transport = "acp"
base_args = ["acp"]
```

`[launch]` is how the terminal tab starts the agent. `[chat]` says the chat
surface talks ACP, and which arguments put the CLI into ACP mode (`acme acp`
here). Everything the chat shows, the model list, the permission questions,
whether a closed chat can be reopened, comes from the agent's own handshake,
so there is nothing in the file to keep in step with it. The bundled
OpenCode and Copilot adapters are this plus comments.

### An agent that does not

Without a `[chat]` table the agent runs as a terminal tab, and the file
says where its transcripts live and how to spot a live process, so the tree
can list its sessions and show a status dot:

```toml
schema_version = 1
id = "acme"
label = "Acme"

[launch]
program = "acme"
base_args = []
yolo_args = ["--yolo"]
resume_args = ["--resume", "{id}"]

[discovery]
dir = "~/.acme/sessions"
filename_pattern = '^(?P<id>.+)\.jsonl$'

[parser]
kind = "claude_jsonl"

[running]
pattern = 'acme --resume {id}'

[capabilities]
pty_quiet_ms = 2000
```

| Table | What it says |
| --- | --- |
| `[launch]` | The program, its base arguments, the arguments that skip permission prompts, and how to resume a session by id |
| `[discovery]` | Where session files live, and the pattern that pulls a session id out of a file name |
| `[parser]` | Which transcript shape to read. The set is closed; `claude_jsonl` is Claude's |
| `[running]` | The process pattern that means this session is live |
| `[capabilities]` | Measured behaviour, such as how long a quiet terminal means the agent is waiting |
| `[chat]` | The chat transport, for an agent Tori can hold a structured conversation with |
| `[accounts]`, `[usage]`, `[config]`, `[install]` | Optional: sign-in, quota, config files and install commands |

The full schema, field by field, is in
[ADAPTERS.md](https://github.com/gettori/tori/blob/main/docs/ADAPTERS.md) in
the repository.

### Rules for a file

- Files are read once at startup. Restart Tori after editing one.
- The file is named after its `id`: `acme-acp.toml` holds `id = "acme-acp"`.
- A file may not reuse a bundled adapter's `id`; it is refused, naming the
  fix: copy it under your own id and switch the bundled one off. A copy
  under a new id is a new agent, with its own accounts and sessions. Files
  that already carried a bundled id when Tori moved them into
  `~/.config/tori/packs/agents/` kept it, as recorded overrides.
- A broken file is listed under **Needs fixing** in Settings > Agents,
  naming what is wrong, and the bundled or previous definition keeps
  working, so one bad file cannot take an agent away.
- An unknown top level field is a warning. A missing required field, an
  unsupported `schema_version`, or a `parser.kind` outside the set is a
  rejection.

### What a TOML cannot add

Two things need code in Tori itself: a new chat **transport**, for a
protocol that is neither ACP nor Claude's, and a new **parser**, for an
agent whose transcript files are shaped unlike Claude's. Such an agent still
runs as a terminal tab in the meantime.
[Open a pack request](https://github.com/gettori/tori/issues/new?template=pack_request.yml)
if yours needs one.

An adapter that works and that others would use belongs in the catalog:
[Contributing a pack](/docs/packs/contributing/) says how.
