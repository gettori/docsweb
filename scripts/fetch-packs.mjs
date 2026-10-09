// Lays out .packs/: the signed index from gettori/packs' `published` branch
// byte for byte, every file a row names at the indexed commit checked against
// its sha256, the bundled set from tori's packs.lock and the newest release.
// Any failure exits before .packs/ changes, so Cloudflare keeps the last deploy.
//
//   node scripts/fetch-packs.mjs
//   PACKS_DIR=<dir>          a gettori/packs checkout after `tori packs-index`
//   TORI_PACKS_LOCK=<file>   tori's src-tauri/packs.lock, instead of main's

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, ".packs");
const PUBLISHED = "https://raw.githubusercontent.com/gettori/packs/published";
const TARBALL = "https://codeload.github.com/gettori/packs/tar.gz";
// main rather than the latest tag, like the CHANGELOG: the next release's set.
const LOCK = "https://raw.githubusercontent.com/gettori/tori/main/src-tauri/packs.lock";
// The feed, not the API: no rate limit, and it lists pre-releases.
const RELEASES = "https://github.com/gettori/tori/releases.atom";
// A row url names the file it serves, so it is also the path in the repo.
const FILE_URL = /^https:\/\/gettori\.app\/packs\/files\/(lsp|dap|formatters|themes|agents|icons)\/([a-z0-9][a-z0-9._-]*)\.(toml|json|svg)$/;

const fail = (message) => {
  console.error(`fetch-packs: ${message}`);
  process.exit(1);
};

async function get(url) {
  const res = await fetch(url).catch((e) => fail(`${url}: ${e.cause?.message ?? e.message}`));
  if (!res.ok) fail(`${url}: ${res.status} ${res.statusText}`);
  return Buffer.from(await res.arrayBuffer());
}

async function source() {
  if (process.env.PACKS_DIR) {
    const dir = resolve(process.env.PACKS_DIR);
    const sig = join(dir, "index.json.sig");
    return {
      index: readFileSync(join(dir, "index.json")),
      sig: existsSync(sig) ? readFileSync(sig) : null,
      repo: dir,
    };
  }
  const index = await get(`${PUBLISHED}/index.json`);
  const sig = await get(`${PUBLISHED}/index.json.sig`);
  const commit = JSON.parse(index.toString("utf8")).packs_commit;
  if (!/^[0-9a-f]{40}$/.test(commit ?? "")) fail(`index.json names no packs_commit: ${commit}`);
  const repo = mkdtempSync(join(tmpdir(), "packs-"));
  process.on("exit", () => rmSync(repo, { recursive: true, force: true }));
  execFileSync("tar", ["-xzf", "-", "-C", repo, "--strip-components=1"], { input: await get(`${TARBALL}/${commit}`) });
  return { index, sig, repo };
}

function file(repo, url, kind, id, sha256) {
  const m = url?.match(FILE_URL);
  if (!m || m[1] !== kind || m[2] !== id) fail(`${kind}/${id}: url ${url} does not name its own file`);
  const path = `${m[1]}/${m[2]}.${m[3]}`;
  const full = join(repo, path);
  if (!existsSync(full)) fail(`${path}: in the index but not at the indexed commit`);
  const bytes = readFileSync(full);
  if (createHash("sha256").update(bytes).digest("hex") !== sha256) fail(`${path}: does not match its sha256 in the index`);
  return { path, bytes };
}

async function bundled() {
  const lock = process.env.TORI_PACKS_LOCK ? readFileSync(process.env.TORI_PACKS_LOCK) : await get(LOCK);
  return lock
    .toString("utf8")
    .split("\n")
    .map((line) => line.match(/^[0-9a-f]{64}  (lsp|dap|formatters|themes|agents)\/(.+)\.(toml|json)$/))
    .filter(Boolean)
    .map((m) => `${m[1]}/${m[2]}`);
}

async function release() {
  const feed = (await get(RELEASES)).toString("utf8");
  return feed.match(/\/releases\/tag\/v([^"<]+)"/)?.[1] ?? fail(`${RELEASES} names no release`);
}

const { index, sig, repo } = await source();
const ids = await bundled();
const version = await release();
if (ids.length === 0) fail("packs.lock lists no packs");
const rows = JSON.parse(index.toString("utf8")).rows;
if (!Array.isArray(rows) || rows.length === 0) fail("index.json has no rows");

const files = [];
for (const row of rows) {
  files.push(file(repo, row.url, row.kind, row.id, row.sha256));
  if (row.icon_url) files.push(file(repo, row.icon_url, "icons", row.id, row.icon_sha256));
}

const next = `${OUT}.next`;
rmSync(next, { recursive: true, force: true });
for (const { path, bytes } of files) {
  mkdirSync(dirname(join(next, "files", path)), { recursive: true });
  writeFileSync(join(next, "files", path), bytes);
}
writeFileSync(join(next, "index.json"), index);
if (sig) writeFileSync(join(next, "index.json.sig"), sig);
writeFileSync(join(next, "bundled.json"), JSON.stringify(ids));
writeFileSync(join(next, "release.json"), JSON.stringify({ version }));
rmSync(OUT, { recursive: true, force: true });
renameSync(next, OUT);
console.log(`fetch-packs: ${rows.length} rows, ${files.length} files, ${ids.length} bundled, Tori ${version}, ${sig ? "signed" : "unsigned"}`);
