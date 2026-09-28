---
title: The tori CLI
description: Scripting Tori from a shell.
---

The `tori` binary doubles as a CLI: run from any shell, including a terminal
tab Tori itself spawned, it talks to the running app over the same protocol
its MCP server and phone app use.

```sh
tori sessions [--live] [--cwd <path>] [--limit <n>] [--json]
tori session tail <id> [--lines <n>] [--json]
tori session wait <id> [--timeout <secs>] [--json]
tori session answer <session> <id> <text>...
tori steer <id> <text>...
tori interrupt <id>
tori worktree new <branch> [--project <path>] [--from <ref>]
tori checkpoints <id> [--json]
tori checkpoint diff <id> <n> [<m>]
tori checkpoint revert <id> <n> [--force]
tori spawn [--agent <id>] [--folder <path> | --new-worktree <branch>] [--prompt <text>] [--json]
tori open <path> [--line <n>]
tori budget [<id>] [--json]
tori ask <question>... [--option <text>]... [--wait <id>] [--answer <id> <text>...]
tori pr create --head <branch> --head-sha <sha> --base <branch> --title <text> [--json]
tori pr review <number> --event approve|comment|request-changes --head-sha <sha>
tori pr merge <number> --method merge|squash|rebase --head-sha <sha>
tori autopilot state|start|stop [--json]
tori autopilot item [<id>] [--kind ship|review ...] [--state <state>]
tori autopilot project [--project <path>] [--ships pr|local] [--autonomy ask-everything|auto-until-outward]
tori autopilot hold resolve <id>
tori mcp
```

`--json` is available on read commands for scripting. Exit codes: `0` on
success, `2` for `tori ask` specifically when it returns a question's id
with no answer yet, distinct from a real failure so a script can tell the
two apart, and `1` for everything else that went wrong.

`tori ask --wait <id>` polls for an answer to a question raised earlier;
`tori ask --answer <id> <text>` answers one on behalf of the user.
