# gettori.app

The website and documentation for [Tori](https://github.com/gettori/tori), a
cockpit for the coding agents you already run. Live at
[gettori.app](https://gettori.app).

An [Astro](https://astro.build) site: the landing page under `src/pages` and
`src/components/home`, the docs as Markdown and MDX under
`src/content/docs/docs`, search by Pagefind, code blocks by Expressive Code.

## Run it

```sh
pnpm install
pnpm dev
```

`pnpm build` writes the site to `dist/` and indexes it for search.
`pnpm check` typechecks the Astro files.

## Deploy

Cloudflare builds and publishes `main` on every push; there is nothing to run.

## Changes

This site is maintained alongside Tori and does not take outside pull
requests, the same policy as the app. A wrong or missing page is an issue on
[gettori/tori](https://github.com/gettori/tori/issues/new/choose).

## License

Apache License 2.0, see [LICENSE](LICENSE). Third-party material and its
licences are listed in [NOTICE](NOTICE). The Tori name and mark are not
covered by the licence.
