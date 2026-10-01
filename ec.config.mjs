import { defineEcConfig } from "astro-expressive-code";

export default defineEcConfig({
  themes: ["night-owl", "night-owl-light"],
  themeCssSelector: (theme) => `[data-theme="${theme.type}"]`,
  useDarkModeMediaQuery: false,
});
