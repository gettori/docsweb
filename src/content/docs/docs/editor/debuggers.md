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
[trusted project](/docs/reference/security/#project-trust). F5 offers to trust
it if needed.

## Using the debugger

### Set breakpoints

Click in the gutter left of the line numbers, or press `F9` on a line. A dot
marks the breakpoint, and its tooltip says how far along it is:

| Dot | Means |
| --- | --- |
| Hollow, **pending** | The file has unsaved changes. Save it to arm the breakpoint |
| Hollow, **set** | Armed, but the debugger has not confirmed it yet |
| Filled, **bound** | The debugger will stop here |

Breakpoints follow their code as you edit, so adding lines above one does not
leave it on the wrong line. They are kept per workspace and survive a relaunch.

### Start and pick what to run

Press `F5`. The first time, **What to debug** asks, with choices for the
debugger behind the file in front of you:

| Debugger | Choices |
| --- | --- |
| js-debug | This file, a **Package script** from `package.json`, or attach to an **Inspector port** (`node --inspect`, 9229 by default) |
| debugpy | This file, a **Module** (`python -m app.main`), or pytest on this file |
| Delve | **This package**, which builds and runs it, or **Package tests** |
| lldb-dap | A **Cargo binary**, built with `cargo build` first, or any **Program** built with debug info |

After that, `F5` runs the same target again. **Debug this file**, **Debug a
package script...** and **Attach the debugger to a port...** in the palette
pick again.

### The Debug panel

The **Debug** panel in the right panel opens when a run starts. From the top:

- **Controls**: **Continue** (or **Pause** while running), **Step over**,
  **Step into**, **Step out**, **Restart** and **Stop**. `Shift+F5` stops too.
  Step controls are greyed out unless the program is paused.
- **Sessions**: what is running, as a tree. A test runner can be several levels
  deep, one per worker.
- **Call stack**, while paused: one heading per paused session, **paused on
  breakpoint** (or exception, step...), then its frames. Click a frame to see its
  source and variables. The selected frame has an **Ask** button.
- **Variables**: the scopes of the selected frame, such as Local and Closure.
  Expand a scope or an object to see what is inside. A scope the debugger marks
  as expensive says **slow**. A long list shows **Show N more**. Where the
  debugger allows it, click a value to change it, press `Enter` to set it or
  `Escape` to cancel.
- **Watch**: expressions you want answered at every stop. Type one in
  **Expression to watch** and press `Enter`. Each row shows its value, or the
  debugger's error if it cannot be read, and has move up, move down and
  remove buttons. Watches are kept per workspace, up to 50, and are there before
  a run starts.
- **Console**: everything the program and the debugger printed, from every
  session, in the order it happened, each line tagged with its session.
- **Evaluate an expression**: a console prompt under the console. Type an
  expression and press `Enter` to evaluate it in the paused frame. `ArrowUp`
  and `ArrowDown` walk earlier entries.

### Read values in the editor

While paused, hover a variable in the editor to see its value right there,
including expressions like `res.status`. Function calls are never evaluated on
hover, so hovering cannot change your program.

### Ask the agent about a frame

Paused on a bad value, click **Ask** on the selected frame, or beside
**Variables**. Tori writes a message for the session selected in the sidebar:
which session is paused and why, where (`@src/deliver.ts#L13`), the call stack,
and the variables you have expanded. It lands in that chat's composer for you to
add a question and send; it is never sent for you.

Long values and big scopes are cut down before they are written, and the
message says what was left out, so one question never fills the agent's
context.

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

[Request a debugger](https://github.com/gettori/tori/issues/new?template=feature_request.yml&title=Debugger%20request%3A%20&problem=Kind%3A%20debugger%0ALanguage%3A%0ATool%2C%20with%20a%20link%3A%0AHow%20you%20install%20it%20today%3A%0AConfig%20file%20that%20marks%20a%20project%20as%20using%20it%20%28if%20any%29%3A%0A%0AIf%20you%20already%20wrote%20a%20TOML%20for%20it%2C%20paste%20it%20here%20and%20say%20where%20it%20fell%20short.). Say which adapter, the language, and how
you start a debug session with it today (a VS Code `launch.json` is ideal).
