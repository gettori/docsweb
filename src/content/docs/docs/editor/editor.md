---
title: Editor
description: The code editor, previews, search, and local history.
---

## Editing

A CodeMirror based editor: syntax highlighting, a minimap, sticky scroll,
bracket guides, soft wrap, all switchable in Settings > Editor. Files over 4
MB open in a reduced mode with the heavier features off; files over 32 MB
are refused outright, with the size and the limit named.

Key bindings in the editor: `Cmd+S` save, `Cmd+Shift+M` send the current
selection to the active session as a mention, `Opt+Enter` code actions,
`F2` rename symbol, and `Opt+F12` / `Cmd+F12` / `Cmd+Shift+F12` to peek a
definition, implementation, or type definition.

Breadcrumbs above the editor show the file's folder path and, where a
language server has symbols for it, its symbol trail down to wherever the
caret is; click either to jump to a sibling.

## Format, organize, and fix on save

Four independent switches in Settings > Editor, each overridable per
workspace: format on save, organize imports on save, fix all on save, and
trim trailing whitespace or insert a final newline on save. Where more than
one is on, fixes and import sorting run first, then trimming, then the
formatter, then the final newline.

## Reviewing what changed

Any file with uncommitted changes gets diff markers in its gutter; click one
for an inline peek, or switch the right panel to Changes for the full
picture (see [The Changes panel](/docs/git/changes-panel)). A **Session**
mode in the right panel shows the same thing scoped to one agent session's
own touched files, including a badge when another live session touched the
same file.

## Previews

Markdown and SVG files get a source and preview toggle; the preview renders
the buffer you are editing, not what is saved on disk, so unsaved edits show
immediately, including live Mermaid diagrams in code fences. Images and PDFs
open read only, the PDF viewer with its own zoom, page jump, and fit-width
controls.

## Local history

Independent of git, every save of a file keeps a version, up to 50 per file
or 14 days, whichever comes first, diffable and restorable from the tab's
context menu. Restoring only writes the file back to disk; it never touches
git.

## Search

`Cmd+Shift+F` opens project-wide search: match case, whole word, and regular
expression toggles, include and exclude globs, and find and replace across
one match, one file, or everything at once. Results can be viewed as a list
or a tree, and a query can be saved. Inside a Topic, every member repo
searches together, one section per repo.

## Problems and TODOs

The Problems panel mirrors every open file's diagnostics, worst file first;
each entry can be sent straight to the active session. The TODOs panel finds
every `TODO`, `FIXME`, `HACK` and `XXX` across the project in one pass; the
tag list is configurable per workspace in Settings > Editor.

## Debugging

`F5` starts a debug session (replaying the last target for the active
file's language, or opening a picker), `Shift+F5` stops, `F9` toggles a
breakpoint. The debug panel shows an interleaved console, watch list,
variables, stack, and the usual step controls. See
[Language servers, debuggers and formatters](/docs/editor/tooling) for which
languages are supported.
