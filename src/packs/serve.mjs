import { cpSync, existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SITE = "https://gettori.app/";

// After the pages, so a page can never shadow a file the signed index points at.
export default function servePacks() {
  return {
    name: "serve-packs",
    hooks: {
      "astro:build:done": ({ dir }) => {
        const out = fileURLToPath(dir);
        for (const name of ["index.json", "index.json.sig", "files"]) {
          if (existsSync(`.packs/${name}`)) cpSync(`.packs/${name}`, `${out}packs/${name}`, { recursive: true });
        }
        const rows = JSON.parse(readFileSync(".packs/index.json", "utf8")).rows;
        const missing = rows
          .flatMap((row) => [row.url, row.icon_url])
          .filter((url) => url && !(url.startsWith(SITE) && existsSync(out + url.slice(SITE.length))));
        if (missing.length) throw new Error(`serve-packs: no file in dist for ${missing.join(", ")}`);
      },
    },
  };
}
