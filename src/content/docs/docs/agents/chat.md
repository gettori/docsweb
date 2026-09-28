---
title: Chat
description: The composer, models and modes, questions, and rewinding a turn.
---

A chat tab starts as a draft, just the composer, and becomes a live session
on the first message.

## Composer

`Enter` sends, `Shift+Enter` inserts a newline, and `Cmd+Enter` always sends
even mid code fence. `Escape` closes an open completion menu, or interrupts
the running turn if none is open. `ArrowUp`/`ArrowDown` at the start of the
box walks your last 50 sent messages, shell style.

Type `@` to mention a project file (the agent reads it off disk, this is
never an upload), or `/` for one of the agent's own slash commands. Drop or
paste a file to attach it; a long paste (over 30 lines or 3000 characters)
becomes a file chip instead of inline text unless you turn that off in
Settings > Chat.

**Open in editor** lifts the draft into a real scratch file for full editing;
saving there mirrors back into the composer.

If the agent supports it (Claude only, today), sending mid-turn steers the
running turn instead of queuing; otherwise your message waits and sends once
the current turn ends, with an option to send it now or discard it if the
turn was cancelled.

## Model, effort and mode

One pill shows the current model; clicking it opens a two-pane picker,
agents on the left and that agent's models on the right, one filter over
both. A second pill appears for effort level when the model has one. Neither
takes effect until the next turn; a shared notice above the composer says
what is pending.

The mode pill (Ask, Accept edits, Plan, Auto, and so on) is read entirely
from what the agent itself declares, never hardcoded, so a mode the agent
stops offering still shows rather than silently disappearing.

Anything else the agent publishes that is not model, mode or effort, a fast
mode toggle, a collaboration mode select, shows below the composer, mirroring
whatever control the agent itself sent.

## Permission prompts and questions

When an agent asks for permission, the question reads as a sentence, with
the raw arguments one click away, and five answers: allow once, allow for
this session, always in this project, deny, or deny with a reason that
reaches the agent as the tool result. Tori keeps no rule store of its own;
the reach you pick travels back to the agent in its own format.

A structured question (`AskUserQuestion`) renders as an answerable form
inline, unless you turn **Answer the agent's questions here** off in
Settings > Chat, which reverts to a plain allow or deny card. The agent's own
todo list, when it publishes one, pins above the composer rather than
repeating in the transcript every time it changes.

## Rewind

**Rewind to here**, on a past prompt, reverts the working tree to that turn
and opens a new session forked from that point in the conversation. It only
appears for agents that support it (Claude today) and only outside a running
turn. The one thing it cannot undo is the forked session's own memory: it
still remembers the turns you just reverted the files for, even though the
files themselves are back to how they were.

## Watching what happened

The status strip above the transcript shows what a session is doing, the
number of files it has touched, and an overflow menu with:

- **Session stats**: model, prompt and turn counts, and a context gauge when
  a source is available to compute one.
- **Show changes as a diff**: one diff per file across the whole session,
  instead of the turn by turn transcript.
- **Usage**: last turn and session total tokens and cost.
- **Session**: the account this chat is running under, what it published it
  can and cannot do, live MCP servers and their tool counts, and the
  project's configured MCP servers from disk, with an inline form to add
  one.

A subagent a session spawned gets its own lane above the composer; switching
lanes only changes what you are reading, what you type always goes to the
main agent.

## Keeping the cost down

Settings > Chat has a **Warn above** setting for how many chats running at
once is worth a warning, and three optional spending ceilings: stop this
chat after a dollar amount, stop this project after a dollar amount summed
across every chat in it, and stop at a percentage of context (the only one
of the three that recovers on its own, once the conversation compacts). All
three only take effect at the next turn boundary; a turn already running is
always allowed to finish, and nothing is ever injected into the agent's
context to announce that a limit was hit.
