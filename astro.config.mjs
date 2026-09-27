import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import solid from "@astrojs/solid-js";

export default defineConfig({
  integrations: [
    starlight({
      title: "Tori",
      logo: { src: "./src/assets/app-icon.png" },
      favicon: "/favicon.png",
      customCss: ["@fontsource-variable/geist", "@fontsource-variable/geist-mono", "./src/styles/starlight.css"],
      social: [{ icon: "github", label: "GitHub", href: "https://github.com/gettori/releases" }],
      sidebar: [
        {
          label: "Getting started",
          items: [
            { label: "Overview", slug: "docs" },
            { label: "Install", slug: "docs/install" },
            { label: "First run", slug: "docs/first-run" },
          ],
        },
        { label: "Changelog", link: "/changelog" },
      ],
    }),
    solid(),
  ],
});
