---
title: Formatters
description: The bundled formatters, how Tori picks one for a file, how to install each, and how to add your own.
---

Format Document and **Format on save** (Settings > Editor) run a command
line formatter over the file. Tori does not ship any formatter: it runs the
one your project already uses, so what you see on save is what CI checks.
Settings > Formatters has a card for each with its version and an on or off
switch.

## Supported formatters

| Formatter | Languages | Picked up from | Install |
|---|---|---|---|
| Biome | JS, TS, JSON, CSS, GraphQL | `biome.json`, `biome.jsonc` | `npm install --save-dev --save-exact @biomejs/biome` |
| oxfmt | JS, TS and more | `.oxfmtrc.json`, `.oxfmtrc.jsonc`, `oxfmt.config.ts` | `npm install --save-dev oxfmt` |
| Prettier | Whatever its plugins cover | `.prettierrc*`, `prettier.config.*`, or `prettier` in `package.json` | `npm install --save-dev prettier` |
| Black | Python | `[tool.black]` in `pyproject.toml` | `pip install black` in the project's virtualenv |
| Ruff | Python | `ruff.toml`, `.ruff.toml`, or `[tool.ruff]` in `pyproject.toml` | `pip install ruff` in the project's virtualenv |
| StyLua | Lua, Luau | `stylua.toml`, `.stylua.toml` | `brew install stylua` |
| gofmt | Go | Only when you name it (below) | Ships with Go |
| shfmt | Shell | Only when you name it | `brew install shfmt` |
| Vite+ | JS, TS and more | Only when you name it | The project's own `vp` |

Biome, oxfmt, Prettier, Black, Ruff and Vite+ run the project's own copy,
from the nearest `node_modules/.bin`, `.venv/bin` or `venv/bin`, else your
PATH. StyLua, gofmt and shfmt come from your PATH. A formatter installed
after Tori started shows up once you reopen Tori.

Languages with a language server but none of these (Rust, C and C++, and
others) still get Format Document from the server, for example rustfmt
through rust-analyzer. Format on save only runs the formatters above.

## Which formatter a file gets

A project with no formatter config gets no formatter, unless you name one:
formatting with a tool's defaults puts a surprise diff in somebody's pull
request. Otherwise Tori asks, in order, and the first answer wins:

1. The project's own pick, `format.byExtension` in
   `<project>/.tori/settings.json`.
2. A formatter config file in a folder between the file and the project
   root, nearest folder first.
3. Your pick, `format.byExtension` in `~/.config/tori/settings.json`.
4. The language server's formatting (Format Document only).

```json
{ "format": { "byExtension": { "go": "gofmt", "sh": "shfmt", "py": "ruff" } } }
```

Keys are file extensions and values are formatter ids. gofmt, shfmt and Vite+
are only ever used this way, because no file in a repo says it formats with
them.

When one folder has configs for several formatters, the one that names the
file's language goes first. A `pyproject.toml` with both `[tool.black]` and
`[tool.ruff]` formats with Black, since a project set up that way usually
lints with Ruff. A formatter that says "not my kind of file" hands it to the
next one, so a `.rs` file in a repo with a `.prettierrc` still reaches
rust-analyzer. A real failure, like a syntax error, stops and is shown.

If the picked formatter is not installed, Tori says so instead of skipping
it, so a fresh clone before `npm install` does not look like a project that
does not format.

## Turning one off

The card's switch writes `format.disabled` in `~/.config/tori/settings.json`.
A disabled formatter is skipped and the file goes on to the next one.

```json
{ "format": { "disabled": ["biome"] } }
```

## Adding a formatter

Any formatter that reads the file on stdin and writes the result to stdout
can be added as a TOML file in `~/.config/tori/packs/formatters/`, or from the
[catalog](/packs/) with **Add a formatter**. This one adds `clang-format`:

```toml
# ~/.config/tori/packs/formatters/clang-format.toml
schema_version = 1
id = "clang-format"
label = "clang-format"
extensions = ["c", "h", "cc", "cpp", "hpp"]

[markers]
files = [".clang-format", "_clang-format"]

[launch]
kind = "path"
program = "clang-format"
args = ["--assume-filename={file}"]
```

`{file}` becomes the file's path, which is how a formatter picks its parser
and finds its settings. `[markers]` takes exact `files`, filename
`prefixes`, or `keys` inside a JSON or TOML file (`{ file = "pyproject.toml",
key = "tool.black" }`). Use `kind = "project_bin"` for a formatter the
project installs itself. Restart Tori after adding the file.

A file may not reuse a built in formatter's `id`. To keep Prettier to web
files, copy it under a new id, add an `extensions` list, and switch the built
in Prettier off on its card. A broken file is listed under **Needs fixing** in
Settings > Formatters, and the built in keeps running.

## Missing a formatter?

[Request a formatter](https://github.com/gettori/tori/issues/new?template=feature_request.yml&title=Formatter%20request%3A%20&problem=Kind%3A%20formatter%0ALanguage%3A%0ATool%2C%20with%20a%20link%3A%0AHow%20you%20install%20it%20today%3A%0AConfig%20file%20that%20marks%20a%20project%20as%20using%20it%20%28if%20any%29%3A%0A%0AIf%20you%20already%20wrote%20a%20TOML%20for%20it%2C%20paste%20it%20here%20and%20say%20where%20it%20fell%20short.). Say which tool, the config file that
marks a project as using it, and whether it can read from stdin.
