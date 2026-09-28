---
title: Themes and fonts
description: Dark and light themes, custom palettes, and typography settings.
---

## Themes

Five bundled themes: Tori Dark (default), Tori Light, Catppuccin Mocha,
Tokyo Night, and Rose Pine Dawn. Ported themes keep the source palette's
hues but always use Tori's own status and agent colors, never repainted by
the port. Switch in Settings > Appearance, or with the toggle in the top bar,
which starts from your system's light or dark preference the first time you
open Tori.

Drop a JSON palette file into `~/.config/tori/themes/` for a custom theme;
it is live-watched, so it shows up in the picker without a restart. A theme
that fails a basic legibility check paints nothing rather than a broken
screen, Tori stays on whatever theme was active and tells you why with up to
a few toasts naming the problem.

## Fonts

Settings > Appearance > Typography sets UI, editor and terminal font family
and size independently, plus line height. The bundled terminal font is
JetBrains Mono Nerd Font, so prompt glyphs (powerline separators, devicons)
render correctly without you needing to install a patched font yourself.

Zoom (`Cmd+=` / `Cmd+-` / `Cmd+0`) scales everything, chrome, editor and
terminal together, on top of whatever font sizes you have set, and is kept
separate from your settings file so a quick zoom in and out never touches it.
