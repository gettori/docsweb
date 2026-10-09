import { readFileSync } from "node:fs";
import type { Loader } from "astro/loaders";
import { z } from "astro/zod";
import { parse as parseToml } from "smol-toml";

export const KINDS = ["lsp", "dap", "formatters", "themes", "agents"] as const;

export const pack = z.object({
  kind: z.enum(KINDS),
  id: z.string(),
  role: z.string().nullable(),
  schema_version: z.number(),
  sha256: z.string(),
  label: z.string(),
  description: z.string(),
  contributor: z.object({ name: z.string(), github: z.string() }),
  license: z.string(),
  verified_against: z.string().nullable(),
  verified_on: z.string().nullable(),
  platforms: z.array(z.string()),
  url: z.url(),
  min_tori: z.string(),
  icon_url: z.url().nullable(),
  bundled: z.boolean(),
  text: z.string(),
  file: z.record(z.string(), z.unknown()),
  runs_project_code: z.boolean(),
  chat: z.string().nullable(),
  appearance: z.enum(["dark", "light"]).nullable(),
  colors: z.record(z.string(), z.string()).nullable(),
});

export type Pack = z.infer<typeof pack>;

export function packs(): Loader {
  return {
    name: "tori-packs",
    load: async ({ store, parseData }) => {
      const read = (path: string) => readFileSync(`.packs/${path}`, "utf8");
      const index = JSON.parse(read("index.json"));
      const bundled = new Set<string>(JSON.parse(read("bundled.json")));

      store.clear();
      for (const row of index.rows) {
        const path = new URL(row.url).pathname.replace(/^\/packs\//, "");
        const text = read(path);
        const file = (row.kind === "themes" ? JSON.parse(text) : parseToml(text)) as Record<string, any>;
        const id = `${row.kind}/${row.id}`;
        const data = {
          ...row,
          role: row.role ?? null,
          verified_against: row.verified_against ?? null,
          verified_on: row.verified_on ?? null,
          icon_url: row.icon_url ?? null,
          bundled: bundled.has(id),
          text,
          file,
          runs_project_code: file.runs_project_code === true,
          chat: row.kind === "agents" ? (file.chat?.transport ?? null) : null,
          appearance: row.kind === "themes" ? file.appearance : null,
          colors: row.kind === "themes" ? file.colors : null,
        };
        store.set({ id, data: await parseData({ id, data }) });
      }
    },
  };
}
