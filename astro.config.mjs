import { defineConfig } from "astro/config";
import expressiveCode from "astro-expressive-code";
import mdx from "@astrojs/mdx";
import solid from "@astrojs/solid-js";
import servePacks from "./src/packs/serve.mjs";

export default defineConfig({
  site: "https://gettori.app",
  prefetch: { prefetchAll: true, defaultStrategy: "hover" },
  integrations: [
    // Before mdx, which it has to hand its code blocks to.
    // Configured in ec.config.mjs, the one place both the .md and .mdx pipelines read it from.
    expressiveCode(),
    mdx(),
    solid(),
    servePacks(),
  ],
});
