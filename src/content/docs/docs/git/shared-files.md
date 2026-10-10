---
title: Shared in worktrees
description: Keep one .env (or any file git does not track) and have every worktree of a project use it.
---

A new worktree is a clean checkout, so it has everything git tracks and
nothing else: no `.env`, no `.env.local`, no local config, no downloaded
credentials. **Shared in worktrees** fixes that. You share a file once, and
every worktree of the project, including every one you make later, has it.

It works on worktree containers (a project whose branches are each a
worktree). A plain repo has one working folder and nothing to share between.

## Sharing a file

1. Open any worktree of the project and find the file in the file tree, at
   the top level of the worktree. Ignored files like `.env` are shown there,
   dimmed.
2. Right-click it and pick **Share with other worktrees...**.
3. Confirm. The dialog says exactly what will happen before it does.

What happens:

- The file moves into the project's shared folder, `<project>/.shared/`, and
  the worktree gets a symlink to it in the same place. Your app reads `.env`
  as before.
- Every other worktree that has nothing of that name gets the same link.
- Every worktree created from now on gets it too.
- If git was not already ignoring the name, Tori hides it from git for this
  project through the repository's own `info/exclude` file. Nothing is
  written to `.gitignore`, so nothing shows up in a diff.

Because every worktree links to one file, an edit in any of them is an edit
in all of them. That is the point for a `.env`; it is also why a file each
branch needs its own version of should not be shared.

Folders work the same way as files.

### What cannot be shared

- **A file git tracks.** Moving it out would read as a deletion on the
  branch. Only untracked or ignored files can be shared.
- **A name the shared folder already has.** Stop sharing or delete the
  existing one first.

A worktree that already has its own file of the same name keeps it. Tori
never replaces a real file with a link.

## The Worktrees section

Right-click the project in the sidebar, pick **Project settings**, then
**Worktrees**. Under the project's
[setup command](/docs/git/worktrees-and-branches/#a-setup-command-for-new-worktrees),
**Shared files** lists everything shared on the left, and for the one you
pick, every worktree with its state:

| State | Meaning |
|---|---|
| Linked | The worktree has the link. |
| Missing | Nothing of that name there. The file was put in `.shared/` by hand after the worktree was made, or the link was deleted. |
| Has its own | A real file of that name, which Tori leaves alone. |

From there you can:

- **Link into N worktrees**, or **Link** on one row, to fill in what is
  missing.
- **Unlink** one worktree, when that checkout should have its own copy or
  none.
- **Stop sharing...** to move the real file back into one worktree you
  choose. The other worktrees lose it, and it stops being hidden from git.
- **Delete entry...** to delete the file and every link to it. A worktree
  with its own copy keeps that copy.

When any worktree is missing a shared file, the project's row in the sidebar
shows a broken link icon with the count. Click it to open the section.

## Adding files by hand

`.shared/` is a plain folder. Anything you put directly inside it is linked
into worktrees created after that. Worktrees that already exist do not pick
it up on their own: open the page and use **Link into N worktrees**. A file
added this way is not hidden from git for you, so make sure it is ignored.

Only top level entries of `.shared/` are linked, each under its own name at
the top of the worktree. To share something nested, share the folder that
holds it.
