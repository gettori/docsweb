---
title: Linters
description: ESLint, Biome, oxlint and Ruff, when each one runs, and how to set them up.
---

A linter runs beside the language's own server and adds its diagnostics and
quick fixes to the same file. TypeScript reports type errors and ESLint
reports its rules, both underlined in the one editor, both in the Problems
panel.

Settings > Linters has a card for each, with its status and an on or off
switch.

## The four linters

| Linter | Languages | Runs when the project has | Comes from |
|---|---|---|---|
| ESLint | TypeScript, JavaScript | `eslint.config.*` or `.eslintrc*` | Server bundled with Tori, rules from the project's `eslint` |
| Biome | TypeScript, JavaScript, JSON, CSS, GraphQL | `biome.json` or `biome.jsonc` | The project's own `biome` |
| oxlint | TypeScript, JavaScript | `.oxlintrc.json`, `.oxlintrc.jsonc` or `oxlint.config.ts` | The project's own `oxlint` |
| Ruff | Python | `ruff.toml`, `.ruff.toml`, or `[tool.ruff]` in `pyproject.toml` | The project's own `ruff`, else the one on your PATH |

A linter only starts where its config file sits between the file and the
project root, so a repo without one never runs it. Creating or deleting the
config while Tori is open switches the linter on or off for the open files
with no restart. Several can run on one file: a repo with both an ESLint and
a Biome config gets both.

## Setting one up

Install the linter in the project, the way the project already pins its
tools, and add its config file:

```sh
# ESLint
npm install --save-dev eslint
npm init @eslint/config@latest

# Biome
npm install --save-dev --save-exact @biomejs/biome
npx @biomejs/biome init

# oxlint
npm install --save-dev oxlint

# Ruff, in the project's virtualenv
pip install ruff
```

Use `pnpm add -D`, `yarn add -D`, `bun add -d` or `uv add --dev` if that is
what the project uses. Tori finds the binary in the nearest
`node_modules/.bin`, `.venv/bin` or `venv/bin`, so the version you see in the
editor is the one CI runs. Run your install before opening the file; a
linter whose config exists but whose binary does not shows as not found on
its card.

Every linter runs code from the project (plugins, configs written in
JavaScript), so it only starts in a
[trusted project](/docs/editor/tooling#trusted-projects).

## Fixing on save

**Fix all on save**, in Settings > Editor, applies every fix the linters offer before the file is
formatted and written. Individual fixes are on the lightbulb in the gutter,
or `Opt+Enter` on the diagnostic.

## Turning one off

Use the card's switch, or list it in `lsp.disabled`. A project can turn a
linter off for everyone who opens it, in `.tori/settings.json`:

```json
{ "lsp": { "disabled": ["oxlint"] } }
```

## Adding a linter

A linter is a language server with `role = "secondary"`, so any linter that
speaks LSP can be added as a TOML file in `~/.config/tori/lsp/`. This one is
the shape of the built in oxlint:

```toml
# ~/.config/tori/lsp/oxlint.toml
schema_version = 1
id = "oxlint"
label = "oxlint"
role = "secondary"
root_markers = [".git"]
activation_markers = [".oxlintrc.json", ".oxlintrc.jsonc"]

[languages]
ts = "typescript"
tsx = "typescriptreact"
js = "javascript"
jsx = "javascriptreact"

[launch]
kind = "project_bin"
program = "oxlint"
args = ["--lsp"]
```

`activation_markers` is what keeps it to projects that use it; leave it out
and it runs on every matching file. `project_bin` looks in the project's
`node_modules/.bin` and virtualenv first, then your PATH. Restart Tori after
adding the file. A linter with no LSP mode cannot be added this way yet.

## Missing a linter?

[Request a linter](https://github.com/gettori/releases/issues/new?labels=enhancement&title=Linter%20request%3A%20&body=Kind%3A%20linter%0ALanguage%3A%0ATool%2C%20with%20a%20link%3A%0AHow%20you%20install%20it%20today%3A%0AConfig%20file%20that%20marks%20a%20project%20as%20using%20it%20%28if%20any%29%3A%0A%0AIf%20you%20already%20wrote%20a%20TOML%20for%20it%2C%20paste%20it%20here%20and%20say%20where%20it%20fell%20short.). Say which tool, the config file that marks
a project as using it, and whether it has an LSP mode.
