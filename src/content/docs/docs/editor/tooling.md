---
title: Language servers, debuggers and formatters
description: What runs for which language, and how to turn a server on or off.
---

Which server, debugger, or formatter runs for a language is data, the same
shape as an agent adapter: a bundled or user supplied TOML file, not
hardcoded per language. A user file whose id matches a bundled one replaces
it whole; a broken one is rejected and the previous definition keeps
running.

## Language servers

Eight ship ready to use with no install step: TypeScript, JSON, YAML,
ESLint, Rust, Biome, Oxlint and Ruff (Rust's `rust-analyzer` expects rustup
to already manage it; the rest are bundled or run from your project's own
install). Around 30 more are either installable from inside Tori (Python,
CSS, HTML, Bash, PHP, and others, fetched from npm or a GitHub release and
checksummed before anything is written) or expected from your own toolchain
(Go, Ruby, Java, Rust's ecosystem tools, and so on).

Settings > LSP lists every server in three tabs, Ready, Installable, and
Manual, each with a status dot, an install or update button where one
applies, and a switch. Opening a file whose installable server is not yet
installed offers to install it inline, or to never ask again for that
language.

A server that can run project code (most of them) only starts inside a
project you have marked trusted, from Settings > Projects.

## Debuggers

Four adapters: `js-debug` for JavaScript and TypeScript, `debugpy` for
Python (Tori manages its own virtual environment for this one), Delve for
Go, and `lldb-dap` for Rust, C, C++ and Objective-C. Each remembers your last
target per workspace, so `F5` replays it without asking again.

## Formatters

Biome, oxfmt, Prettier, Black, Ruff, StyLua, gofmt, shfmt and vite-plus.
Resolution checks your workspace override first, then the project's own
config file (closest directory wins, most specific extension wins ties),
then your global default, then the language server's own formatting, in
that order. A formatter that declines a file (no config found for it) hands
off to the next one in the chain rather than failing.

Every server, debugger and formatter can be switched off individually from
its card in Settings.
