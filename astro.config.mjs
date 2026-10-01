import { defineConfig } from "astro/config";
import expressiveCode from "astro-expressive-code";
import mdx from "@astrojs/mdx";
import solid from "@astrojs/solid-js";

export default defineConfig({
  prefetch: { prefetchAll: true, defaultStrategy: "hover" },
  integrations: [
    // Before mdx, which it has to hand its code blocks to.
    // Configured in ec.config.mjs, the one place both the .md and .mdx pipelines read it from.
    expressiveCode(),
    mdx(),
    solid(),
  ],
});
