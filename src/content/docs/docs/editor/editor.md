---
title: Editor
description: Edit code with find and replace, multiple cursors, Vim keys and code navigation, preview Markdown, SVG, images and PDFs, and get any earlier version of a file back.
---

Tori's editor opens files in tabs beside your chats and terminals. It is
built on CodeMirror, highlights about 140 languages with no setup, and gets
completions, errors and navigation from
[language servers](/docs/editor/language-servers/).

## Open a file

- Click it in the [Files](/docs/editor/files/) tree. A single click opens a
  **preview** tab that the next click replaces; a double-click or your first
  edit keeps it.
- `Cmd+P` and type part of its name.
- Click a path in a chat, a search result, a diff or a terminal.
- Drag it from the Files tree onto a pane, or from Finder onto a tab strip.

`Cmd+N` opens a scratch buffer, `Untitled-1`, kept under
`~/.config/tori/scratch/` until you save it somewhere with **Save as a new
file** in the command palette.

## Save

`Cmd+S` saves. If a save fails, Tori
says which file and why, and the buffer stays unsaved so nothing is lost.

When a file changes on disk while you have unsaved edits in it, for example
an agent edited it, Tori asks whether to keep yours or take the disk's,
instead of silently overwriting either.

### What happens on save

Five switches in Settings > Editor, all off by default except where noted:

| Setting | On save |
| --- | --- |
| **Fix all on save** | Applies every language server's fix-all (ESLint, Biome and oxlint autofixes among them) |
| **Organize imports on save** | Sorts imports and drops unused ones |
| **Trim trailing whitespace on save** | Drops spaces and tabs at the end of lines |
| **Format on save** | Runs the file's [formatter](/docs/editor/formatters/) |
| **Insert final newline on save** | Ends the file with exactly one line break |

They run in that order. Formatting only runs in a
[trusted project](/docs/reference/security/#project-trust); the first time in a
session, Tori offers to trust it.

### Settings for one workspace

Every editor setting can be overridden for one branch or worktree. Select it
in the sidebar, open Settings > Editor, and click **Set here** on a row; that
row then applies only there, and **Clear** removes the override. Overrides are
written to `.tori/settings.json` in the workspace, which Tori adds to the
repository's own ignore list so it never reaches a commit or a teammate.

## Find and replace

`Cmd+F` opens find over the editor's top right corner; `Cmd+Opt+F` opens it
with replace. `Enter` and `Shift+Enter` go to the next and previous match,
`Escape` closes it. The toggles are **Match Case**, **Match Whole Word** and
**Use Regular Expression**. In the replace field, `Enter` replaces the current
match and `Cmd+Enter` replaces all.

For the whole project, see [Search and the omnibox](/docs/workspace/search-and-shortcuts/).

## Edit faster

| Keys | Action |
| --- | --- |
| `Cmd+I`, `Cmd+Shift+I` | Expand and shrink the selection to the next syntax node |
| `Cmd+Opt+L` | Split the selection into lines, one cursor per line |
| `Ctrl+J` | Join lines |

Completions come from the language server. Where no server claims the file,
**Word completion without a language server** (on by default) suggests words
already in the buffer.

**Tab size** (2) and **Indent with spaces** (on) set indentation. A file's
`.editorconfig` outranks both, and the language server is asked to format at
the same width.

### Vim keybindings

Turn on **Vim keybindings** in Settings > Editor for modal editing in every
buffer, diff views and Search Editors included. A status line shows the mode
and pending keys. Tori's own shortcuts keep working: `Cmd+S` saves, and the
language commands fire from normal mode.

## Move around code

| Action | Keys |
| --- | --- |
| Go to definition | `Cmd+click`, `Cmd+Opt+D` or `F12` |
| Peek definition, without leaving the file | `Cmd+Opt+P` or `Opt+F12` |
| Find references | `Cmd+Opt+R` or `Shift+F12` |
| Go to implementation, type definition | `Cmd+F12`, `Cmd+Shift+F12` |
| Rename symbol | `F2` or `Cmd+Opt+N` |
| Code actions and quick fixes | `Opt+Enter` or `Cmd+Opt+A` |
| Go back, go forward | `Ctrl+-`, `Ctrl+Shift+-`, or the arrows on the tab bar |
| Go to line | `Cmd+P`, then `:42` |
| Symbol in this file, in the project | `Cmd+P`, then `@` or `#` |

Holding `Cmd` underlines what a click would jump to. A lightbulb in the gutter
marks a line with code actions; lint and errors are drawn inline. **Code
lens**, off by default, shows reference and implementation counts above
declarations.

The **Calls** panel in the right panel is a call hierarchy for the symbol under
the caret: who calls it, and what it calls, one level at a time.

### Breadcrumbs

The bar above the text shows the file's folders and, where the language server
knows them, the symbols down to the caret. Click a part to jump to a sibling
folder, file or symbol. The same bar says when a language server is busy, for
example indexing.

## What the editor shows

All in Settings > Editor:

| Setting | Default | Shows |
| --- | --- | --- |
| **Indentation guides** | On | Vertical lines at each indent level |
| **Current line highlight** | Both | Where the caret line is marked: nowhere, the gutter, the line, or both |
| **Soft wrap long lines** | Off | Wraps long lines. **Toggle soft wrap** in the palette changes one tab |
| **Show spaces and tabs** | Off | Draws whitespace characters |
| **Scroll past the last line** | On | Lets the last line scroll to the top |
| **Colour brackets by depth** | Off | Rainbow brackets |
| **Bracket pair guide lines** | Off | Lines joining matching brackets |
| **Minimap** | Off | A code overview down the right edge |
| **Sticky scroll** | Off | Pins the enclosing class and function headers at the top as you scroll |

Fonts and sizes are under Settings > Appearance, see
[Themes and fonts](/docs/editor/themes-and-fonts/).

## Git in the editor

### Change marks

Lines added, changed or removed since the last commit are marked in the
gutter. Click a mark, or the line number beside it, to see the lines that used
to be there.

### Git blame

Turn on **Git blame** in Settings > Editor, or click the blame button on the
editor's bar. The gutter then shows who last changed each line and when,
shaded by age. Hover a line for the commit. A line not yet committed names the
agent turn that wrote it, from the [checkpoints](/docs/git/checkpoints/), and
agrees with [Who wrote a hunk](/docs/git/who-wrote-this/).

### Merge conflicts

A conflicted file shows **Accept Current**, **Accept Incoming**, **Accept Both**
and **Compare** over each conflict. See [Merge conflicts](/docs/git/merge-conflicts/).

## File and local history

Right-click a tab or a file in the tree:

- **File history** lists the commits that touched the file, following
  renames. Open one to see that commit's change to the file.
- **Local history** lists every version of the file you saved in Tori,
  whether or not it was ever committed: up to 50 per file, kept 14 days.
  Select a version to diff it against the file now (**Identical to the file as
  it is now.** when nothing differs), and **Write this version back to the
  file** to restore it. Restoring writes the file only; git is not touched.

Local history is how you get back the edit you saved and replaced ten minutes
later without ever staging it.

## Previews

- **Markdown and SVG** have a preview button on the tab bar. The preview shows
  the buffer you are editing, unsaved changes included, and draws Mermaid
  diagrams. Links are opened by Tori rather than followed, and raw HTML is
  cleaned. **Open Markdown and SVG rendered** makes the preview the default.
- **Images** open as images.
- **PDFs** open as pages you can scroll. The bar has zoom out, an editable
  percentage, zoom in, fit (**Page**, **Width** or **100%**) and a page field.
  Select text and **Quote** sends it, with its page, to the selected session.

## Files Tori will not open as text

- A file that is not UTF-8 shows a banner instead of a buffer, so saving cannot
  replace it with an empty or mangled one.
- Over 4 MB, a file opens without folding, guides, the minimap or a language
  server, to stay fast.
- Over 32 MB, a file shows a banner instead of opening.

## Unsaved edits across a quit

With **Keep unsaved edits across a quit** on (the default), quitting Tori with
unsaved buffers does not ask you to save or discard: they are stashed, undo
history included, and come back on the next launch. Closing a tab with unsaved
changes still asks, **Discard unsaved changes to sign.ts?**

A tab you close keeps its undo history and folds; `Cmd+Shift+T` reopens it
where you were.

## When something goes wrong

Each editor pane is isolated. If one fails to draw, it shows a **Reopen**
button and the rest of the window carries on.
