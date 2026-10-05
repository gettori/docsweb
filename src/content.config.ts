import { defineCollection, z } from "astro:content";
import { glob, type Loader } from "astro/loaders";
import { SITE } from "./config";

// main rather than the latest tag, so a section can show before its release is published.
const CHANGELOG = "https://raw.githubusercontent.com/gettori/tori/main/CHANGELOG.md";

function changelog(): Loader {
  return {
    name: "tori-changelog",
    load: async ({ store, parseData, renderMarkdown }) => {
      const res = await fetch(CHANGELOG);
      if (!res.ok) throw new Error(`Could not fetch ${CHANGELOG}: ${res.status} ${res.statusText}`);
      const text = await res.text();

      store.clear();
      for (const section of text.split(/^## /m).slice(1)) {
        const [head, ...rest] = section.split("\n");
        const version = head.trim();
        // YY.MDD.patch: the middle field is month * 100 + day. Unreleased has no version.
        const m = version.match(/^(\d+)\.(\d+)\.(\d+)/);
        if (!m) continue;
        const [yy, mdd, patch] = m.slice(1).map(Number);
        const date = new Date(Date.UTC(2000 + yy, Math.floor(mdd / 100) - 1, mdd % 100));

        const id = `v${version}`;
        // Its links are relative to the tori repo.
        const body = rest.join("\n").replace(/\]\((?!https?:|mailto:|#)([^)\s]+)\)/g, `](${SITE.github}/blob/main/$1)`);
        const rendered = await renderMarkdown(body);
        // Every release has its own Fixes and Elsewhere, so prefix the ids to keep them unique on one page.
        rendered.html = rendered.html.replace(/<h([2-6]) id="/g, `<h$1 id="${id}-`);
        for (const h of rendered.metadata?.headings ?? []) h.slug = `${id}-${h.slug}`;

        store.set({ id, data: await parseData({ id, data: { version, date, patch } }), body, rendered });
      }
    },
  };
}

export const collections = {
  docs: defineCollection({
    loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/docs/docs" }),
    schema: z.object({ title: z.string(), description: z.string().optional() }),
  }),
  changelog: defineCollection({
    loader: changelog(),
    schema: z.object({ version: z.string(), date: z.date(), patch: z.number() }),
  }),
};
