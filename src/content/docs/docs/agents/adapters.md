---
title: Supported agents and adapters
description: The seven bundled agent CLIs, and how to add another.
---

Tori does not bundle an agent CLI. It drives whichever ones you already have
installed, described by an adapter: a TOML file saying how to launch the
agent, where its transcripts live, how to tell a live process apart from a
dead one, and, for the agents Tori can hold a real conversation with, how to
drive it as structured chat rather than a plain terminal.

## The seven bundled agents

Claude, Codex, Copilot, Gemini, Kimi, OpenCode and Pi ship as built-in
adapters. They are not equally deep integrations:

- **Claude** talks over its own `stream-json` protocol and is the only agent
  with live status from its own hooks (rather than Tori guessing from the
  transcript), mid-turn steering, and a fork based rewind.
- The other six run over the [Agent Client Protocol](https://agentclientprotocol.com),
  a shared, smaller floor: no mid-turn steering, no rewind, and cost ceilings
  do not apply, since ACP reports context occupancy rather than spend.
- **Codex** and **Pi** each bridge through a small wrapper process
  (`@agentclientprotocol/codex-acp`, `pi-acp`) rather than talking to their
  main binary directly.
- **Gemini** ships marked untested in Settings; nobody has measured its
  adapter against a real session the way the others are.
- **Copilot** cannot report whether you are signed in; its login flow exists,
  a signed-out state does not.
- **Kimi** has the least measured adapter: no accounts, no usage reporting,
  no verified version.

Settings > Agents shows a card per adapter: found or not, its version
against what Tori last measured, and an on or off switch for whether it is
offered when starting a new session. Click a card for its detail page:
install and sign-in steps that run the vendor's own commands in a real
terminal tab, its accounts, its model catalogue, its config files
(instructions, skills, commands, rules, depending on what the agent
supports), and exactly what it can and cannot do in Tori, each gap spelled
out in a full sentence rather than left implicit.

## Everything else

Any CLI agent that is not one of the seven still runs in Tori as a plain
terminal tab: a session row in the tree, a working or needs you dot, and
checkpoints, just without the chat surface, model picker or structured tool
cards. This is the universal fallback for an adapter that declines to
describe a chat transport.

## Adding an agent

Drop a TOML file into `~/.config/tori/agents/`. Tori reads it once at
startup, so a new or edited file needs a restart to take effect. For an
agent that already speaks ACP, the file is four lines: how to launch it, and
nothing else, since the protocol carries models, permission questions and
history itself. For one that does not, the file also says where its
transcripts live and how to recognize a live process.

An adapter file whose id matches a bundled one replaces it entirely, rather
than merging field by field; a broken file is rejected with a logged error
and the bundled or previous definition keeps working, so one bad file cannot
take an agent away.
