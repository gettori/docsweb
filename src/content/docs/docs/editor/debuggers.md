---
title: Debuggers
description: The four debug adapters, how to install each, what F5 runs, and how to add your own.
---

`F5` runs the program in front of you under a debugger: breakpoints,
stepping, the call stack, variables, watch expressions and a debug console.
`Shift+F5` stops it. Settings > Debuggers has a card for each adapter with
its status, Install, Update or Remove where they apply, and an on or off
switch.

## Supported debuggers

| Debugger | Languages | Install | What F5 can run |
|---|---|---|---|
| js-debug | JavaScript, TypeScript | Bundled. Needs `node` on your PATH. | This file, a package script, or attach to a port |
| debugpy | Python | Tori installs it, from the card or the first time you press F5 | This file, a module, or pytest on this file |
| Delve | Go | `go install github.com/go-delve/delve/cmd/dlv@latest` | This file's package, or its tests |
| lldb-dap | Rust, C, C++, Objective-C | `xcode-select --install` (Apple's Command Line Tools) or Xcode | A Cargo binary, or any binary you pick |

If the debugger for a file is missing, F5 says so with an Install button.
For debugpy that is Tori's own install; for the others it runs the command
above in a terminal. Press F5 again once it finishes.

### Notes per debugger

- **js-debug** attaches to a process started with `node --inspect` (port
  9229 by default). A package script runs through the package manager your
  lockfile names, so `pnpm run dev`, not `npm run dev`.
- **debugpy** lives in a virtualenv Tori makes for it, under
  `~/.config/tori/debuggers/`. Your program still runs on the project's own
  Python: the nearest `.venv` or `venv`, else `python3` on your PATH. The
  project does not need debugpy installed.
- **Delve** installs into `$(go env GOPATH)/bin`. If that is not on your
  PATH, add it, or point Tori at it with your own TOML (below).
- **lldb-dap** is found through `xcrun`. Homebrew's `llvm` works too once its
  `bin` is on your PATH. A Rust target is built with `cargo build` first, with
  the build output in the debug console, and gets Rust's own pretty printers
  so a `String` reads as text. Build C and C++ programs with `-g` yourself.

## Starting a run

The file in front of you picks the debugger. The first F5 asks what to run;
after that F5 replays the last target for that debugger in this workspace. A
workspace with a Go service and a TypeScript frontend remembers one of each.
The command palette has "Debug this file", "Debug a package script" and
"Attach the debugger to a port" for picking again.

Debugging runs the project's code, so it only starts in a
[trusted project](/docs/editor/tooling#trusted-projects). F5 offers to trust
it if needed.

## Turning one off

The card's switch writes `dap.disabled` in `~/.config/tori/settings.json`:

```json
{ "dap": { "disabled": ["delve"] } }
```

## Changing how a debugger starts

Each debugger is a TOML file. One in `~/.config/tori/dap/` with the same `id`
replaces the built in whole. This one runs Delve from `~/go/bin` when that
is not on your PATH:

```toml
# ~/.config/tori/dap/delve.toml
schema_version = 1
id = "delve"
label = "Go (Delve, from ~/go/bin)"
root_markers = ["go.mod"]

[languages]
go = "go"

[launch]
kind = "tcp"
program = "~/go/bin/dlv"
args = ["dap", "--listen=127.0.0.1:{port}"]
```

Restart Tori after adding it. A broken file is logged and the built in keeps
running.

A debugger for a new language is different from the other tools: the file
gets a card, but what F5 offers to run is built into Tori per debugger. So a
new debugger needs a request rather than only a TOML.

## Missing a debugger?

[Request a debugger](https://github.com/gettori/releases/issues/new?labels=enhancement&title=Debugger%20request%3A%20&body=Kind%3A%20debugger%0ALanguage%3A%0ATool%2C%20with%20a%20link%3A%0AHow%20you%20install%20it%20today%3A%0AConfig%20file%20that%20marks%20a%20project%20as%20using%20it%20%28if%20any%29%3A%0A%0AIf%20you%20already%20wrote%20a%20TOML%20for%20it%2C%20paste%20it%20here%20and%20say%20where%20it%20fell%20short.). Say which adapter, the language, and how
you start a debug session with it today (a VS Code `launch.json` is ideal).
