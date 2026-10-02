---
title: Language servers
description: Every language server Tori knows, how to install each one, and how to add your own.
---

A language server gives the editor completion, hover, go to definition,
rename, code actions and the compiler's own diagnostics. Settings > LSP has
a card for every one Tori knows, split into three tabs:

- **Ready**: bundled with Tori, or found on your machine.
- **Installable**: Tori can fetch it for you.
- **Manual**: your own toolchain installs it; the card shows the command.

Each card has a status dot, a version, Install, Update or Remove where they
apply, and an on or off switch.

## Installing a server

Open a file in a language whose server Tori can install, and a banner over
the file offers it: **Install**, **Not now** (asked again next session), or
**Never for this language**. The card in Settings > LSP has the same Install
button.

Tori installs a pinned version, either from npm or from a GitHub release
whose checksum it checks before writing anything, into
`~/.config/tori/servers/<id>/`. A failed download leaves the previous install
in place. When a Tori release pins a newer version, the card offers Update.

For a **Manual** server, Install runs the command shown on the card in a
terminal inside Settings, using your login shell's PATH. Reopen Tori after
installing one by hand outside of Settings so it is picked up.

If you already have a server on your PATH, Tori uses yours, even for one it
could install itself.

## Every server

### Ready, no install

| Language | Server | Notes |
|---|---|---|
| TypeScript, JavaScript | `typescript-language-server` | Bundled. Needs `node` on your PATH. Uses the project's own TypeScript. |
| JSON | `vscode-json-languageserver` | Bundled. Validates against SchemaStore, so `package.json`, `tsconfig.json` and friends get checked. |
| YAML | `yaml-language-server` | Bundled. SchemaStore validation for GitHub workflows, compose files and the like. |
| CSS, SCSS, Less | `vscode-css-language-server` | Bundled. |
| HTML | `vscode-html-language-server` | Bundled. |
| Rust | `rust-analyzer` | Not bundled, so it always matches your toolchain: `rustup component add rust-analyzer`. |

ESLint, Biome, oxlint and Ruff also run as language servers; they are on
the [linters](/docs/editor/linters) page.

### Installable from Tori

| Language | Server | Source |
|---|---|---|
| Python | pyright | npm |
| Bash, sh | `bash-language-server` | npm |
| Svelte | `svelte-language-server` | npm |
| PHP | Intelephense | npm |
| Vim script | `vim-language-server` | npm |
| Elm | `elm-language-server` | npm (needs `elm` installed) |
| Prisma | `@prisma/language-server` | npm |
| Perl | Perl Navigator | npm |
| GraphQL | `graphql-language-service-cli` | npm |
| Fish | `fish-lsp` | npm (needs `fish` installed) |
| C, C++, Objective-C | clangd | GitHub release. Xcode's command line tools already ship one. |
| Lua | `lua-language-server` | GitHub release |
| Markdown | marksman | GitHub release |
| LaTeX | texlab | GitHub release |
| XML | LemMinX | GitHub release |
| Typst | tinymist | GitHub release |
| TOML | tombi | GitHub release |
| Clojure | `clojure-lsp` | GitHub release |

### Install it yourself

| Language | Server | Install |
|---|---|---|
| Go | gopls | `go install golang.org/x/tools/gopls@latest` |
| Ruby | ruby-lsp | `gem install ruby-lsp` |
| Java | jdtls | `brew install jdtls` |
| Kotlin | `kotlin-language-server` | `brew install kotlin-language-server` |
| Swift | sourcekit-lsp | Ships with Xcode and the Swift toolchain |
| C# | `csharp-ls` | `dotnet tool install --global csharp-ls` |
| Zig | zls | The release that matches your Zig |
| Haskell | `haskell-language-server` | `ghcup install hls` |
| OCaml | `ocaml-lsp-server` | `opam install ocaml-lsp-server` |
| Elixir | `elixir-ls` | `brew install elixir-ls`. Starts only under a `mix.exs`. |
| Dart, Flutter | `dart language-server` | Ships with the Dart and Flutter SDKs |
| Terraform | `terraform-ls` | `brew install hashicorp/tap/terraform-ls` |
| Scala | Metals | `cs install metals` |
| Nix | nil | `nix profile install nixpkgs#nil` |

## When a server does not start

- **The project is not trusted.** Most servers run project code, so they
  wait until you trust the project. Tori offers it the first time; see
  [trusted projects](/docs/editor/tooling#trusted-projects).
- **It is not on your PATH.** The card says not found. If you installed it
  somewhere your login shell does not look, point Tori at it with your own
  TOML (below).
- **It is switched off.** Check the card's switch, and the project's own
  `.tori/settings.json`.

A server starts per project root: the nearest folder above the file with a
`tsconfig.json`, `go.mod`, `Cargo.toml` or whatever that language uses. In a
monorepo, each package gets its own server.

## Adding or replacing a server

Each server is a TOML file. Drop one into `~/.config/tori/lsp/` and restart
Tori. This one adds Python through a pyright you installed yourself; its `id`
matches the built in `python`, so it replaces it whole:

```toml
# ~/.config/tori/lsp/python.toml
schema_version = 1
id = "python"
label = "Python (pyright)"
root_markers = ["pyproject.toml", "setup.py", "requirements.txt", ".git"]

[languages]
py = "python"
pyi = "python"

[launch]
kind = "path"
program = "pyright-langserver"
args = ["--stdio"]
```

Keep every top level key above the first `[table]`: in TOML a key written
after a table header belongs to that table. A replacement is whole, so list
every extension you still want served. A file that fails to load is logged
and the server it would have replaced keeps running.

## Missing a language?

[Request a language server](https://github.com/gettori/tori/issues/new?template=feature_request.yml&title=Language%20server%20request%3A%20&problem=Kind%3A%20language%20server%0ALanguage%3A%0ATool%2C%20with%20a%20link%3A%0AHow%20you%20install%20it%20today%3A%0AConfig%20file%20that%20marks%20a%20project%20as%20using%20it%20%28if%20any%29%3A%0A%0AIf%20you%20already%20wrote%20a%20TOML%20for%20it%2C%20paste%20it%20here%20and%20say%20where%20it%20fell%20short.). Say which server, how you install
it today, and paste your TOML if you already have one working.
