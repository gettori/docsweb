---
title: Language tooling
description: What Tori runs for each language, how each tool gets installed, and how to ask for one that is missing.
---

The editor gets its language smarts from four kinds of tool, each with its
own page and its own pane under Settings > Languages:

- [Language servers](/docs/editor/language-servers): completion, hover,
  go to definition, rename and the compiler's diagnostics. Settings > LSP.
- [Linters](/docs/editor/linters): extra diagnostics and quick fixes from
  ESLint, Biome, oxlint or Ruff, beside the language server. Settings >
  Linters.
- [Formatters](/docs/editor/formatters): Format Document and format on save.
  Settings > Formatters.
- [Debuggers](/docs/editor/debuggers): breakpoints, stepping and variables on
  `F5`. Settings > Debuggers.

A language with none of these still opens, highlights, edits and saves. It
just gets no language intelligence.

## By language

| Language | Language server | Linters | Formatters | Debugger |
|---|---|---|---|---|
| TypeScript, JavaScript | `typescript` (bundled) | ESLint, Biome, oxlint | Biome, oxfmt, Prettier, Vite+ | js-debug (bundled) |
| Python | pyright (Tori installs it) | Ruff | Black, Ruff | debugpy (Tori installs it) |
| Rust | rust-analyzer (via rustup) | | rust-analyzer's own | lldb-dap (Xcode tools) |
| Go | gopls (you install it) | | gofmt | Delve (you install it) |
| C, C++, Objective-C | clangd (Tori installs it) | | clangd's own | lldb-dap (Xcode tools) |
| JSON | `json` (bundled) | Biome | Biome, Prettier | |
| CSS | `css` (bundled) | Biome | Biome, Prettier | |
| Lua | lua-language-server (Tori installs it) | | StyLua | |
| Shell | bash-language-server (Tori installs it) | | shfmt | |

Around 30 more languages have a language server and nothing else yet (Ruby,
Java, PHP, Swift, Kotlin, Elixir, Zig, Markdown, TOML and others). The
[language servers](/docs/editor/language-servers) page lists every one with
its install step.

## How a tool gets onto your machine

Every tool comes one of four ways, and its card in Settings says which:

- **Bundled.** Ships inside Tori and works with no install step. Needs `node`
  on your PATH for the ones written in JavaScript.
- **Installed by Tori.** Install on the card (or on the banner over a file
  that wants it) fetches a pinned version from npm, a GitHub release or PyPI,
  checks it, and keeps it under `~/.config/tori/`. Update and Remove sit on
  the same card.
- **Your toolchain.** Tools that a language's own toolchain manages (gopls,
  rust-analyzer, Delve). The card shows the command, and Install runs it for
  you in a terminal inside Settings.
- **Your project.** Linters and most formatters run the copy in the
  project's `node_modules/.bin`, `.venv` or `venv`, so they match the version
  CI uses. Add them to the project's dev dependencies as usual.

Tools are looked up on your login shell's PATH, not the stripped down one a
Finder launched app gets, so anything installed through Homebrew, mise, asdf,
nvm or rustup is found. A copy of your own always wins over one Tori
installed.

## Trusted projects

Most of these tools run code from the project: TypeScript loads the
workspace's own compiler and plugins, rust-analyzer runs build scripts, and
a debugger runs your program. They only start in a project you have trusted.
The first time one is held back, Tori offers to trust the project; Settings >
Projects lists trusted projects, each with Revoke. The list lives in
`~/.config/tori/trusted.json`, outside any repo, so a repo cannot trust
itself. An untrusted project still edits normally, with the JSON and YAML
servers (which run nothing from the project) still working.

## Turning one off

Every card has a switch, which writes to `~/.config/tori/settings.json`.
Language servers and linters can also be turned off for one project, in
`<project>/.tori/settings.json`. That list only adds to yours, so a repo can
never switch back on something you turned off.

```json
{ "lsp": { "disabled": ["eslint"] } }
```

## Adding your own

Every server, linter, formatter and debugger is a TOML file, not code. Drop
one into `~/.config/tori/lsp/`, `~/.config/tori/formatters/` or
`~/.config/tori/dap/` and restart Tori. A file whose `id` matches a built in
one replaces it whole; a broken one is logged and the built in keeps
running. Each page below has a complete example you can copy.

## Asking for a tool

If a language, linter, formatter or debugger you use is missing, open a
request on GitHub. Each link opens an issue with the questions already in
it:

- [Request a language server](https://github.com/gettori/releases/issues/new?labels=enhancement&title=Language%20server%20request%3A%20&body=Kind%3A%20language%20server%0ALanguage%3A%0ATool%2C%20with%20a%20link%3A%0AHow%20you%20install%20it%20today%3A%0AConfig%20file%20that%20marks%20a%20project%20as%20using%20it%20%28if%20any%29%3A%0A%0AIf%20you%20already%20wrote%20a%20TOML%20for%20it%2C%20paste%20it%20here%20and%20say%20where%20it%20fell%20short.)
- [Request a linter](https://github.com/gettori/releases/issues/new?labels=enhancement&title=Linter%20request%3A%20&body=Kind%3A%20linter%0ALanguage%3A%0ATool%2C%20with%20a%20link%3A%0AHow%20you%20install%20it%20today%3A%0AConfig%20file%20that%20marks%20a%20project%20as%20using%20it%20%28if%20any%29%3A%0A%0AIf%20you%20already%20wrote%20a%20TOML%20for%20it%2C%20paste%20it%20here%20and%20say%20where%20it%20fell%20short.)
- [Request a formatter](https://github.com/gettori/releases/issues/new?labels=enhancement&title=Formatter%20request%3A%20&body=Kind%3A%20formatter%0ALanguage%3A%0ATool%2C%20with%20a%20link%3A%0AHow%20you%20install%20it%20today%3A%0AConfig%20file%20that%20marks%20a%20project%20as%20using%20it%20%28if%20any%29%3A%0A%0AIf%20you%20already%20wrote%20a%20TOML%20for%20it%2C%20paste%20it%20here%20and%20say%20where%20it%20fell%20short.)
- [Request a debugger](https://github.com/gettori/releases/issues/new?labels=enhancement&title=Debugger%20request%3A%20&body=Kind%3A%20debugger%0ALanguage%3A%0ATool%2C%20with%20a%20link%3A%0AHow%20you%20install%20it%20today%3A%0AConfig%20file%20that%20marks%20a%20project%20as%20using%20it%20%28if%20any%29%3A%0A%0AIf%20you%20already%20wrote%20a%20TOML%20for%20it%2C%20paste%20it%20here%20and%20say%20where%20it%20fell%20short.)

The most useful things to include are a link to the tool, how you install it
today, and the config file that marks a project as using it. If you already
wrote a TOML that works, paste it: a working file is the fastest way to get a
tool bundled for everyone.
