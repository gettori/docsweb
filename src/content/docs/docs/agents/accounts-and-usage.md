---
title: Accounts and usage
description: Signing in to more than one account per agent, and watching your quota.
---

## More than one account

An agent that supports it (Claude, Codex, Copilot, OpenCode) can have more
than one signed-in account, each with its own home directory so the two
logins never collide. Add one from that agent's detail page in Settings >
Agents: a name, an optional folder, and a real terminal tab running the
vendor's own sign-in. Removing an account you asked Tori to create deletes
its sessions along with it; removing one you pointed at a folder you already
had only forgets it, the folder and its login stay exactly as they were.

The account you never explicitly set up, your existing login from before
Tori, always stays available too; Tori never copies or stores its
credentials.

## Usage and quota windows

Where an agent can report it, a titlebar strip shows a live bar per account:
click it to pin open a card with every window that account can answer for,
its plan, and when it resets. Usage comes from up to three sources, each one
filling in what the last one could not answer: the agent's own session
events, a bounded read through its CLI, and, only if you opt in per account,
a read of its OAuth token from the system keychain. That third source is
never on by default, since it is the most invasive: a single explicit toggle
per account, not a background setting.

Per account, in Settings > Agents, you can choose which usage windows show
in the titlebar, set a warn threshold, and turn on a notification for when
that threshold is crossed and when a window is fully spent.

## What Tori does not do

There is no historical usage chart. A quota window belongs to the account,
not to Tori, so a chart built only from what Tori itself has observed since
you opened it would be mostly gaps. What you get instead is always the
number the agent, or its vendor, is willing to answer for right now.
