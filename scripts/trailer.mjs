// Renders /trailer to an mp4, frame by frame, in headless Chrome on a virtual clock.
// Needs `pnpm dev` running, Google Chrome and ffmpeg.
//
//   node scripts/trailer.mjs                  -> .scribe/trailer.mp4
//   node scripts/trailer.mjs --stills 3,10,18 -> .scribe/trailer-3.png, ...
//   node scripts/trailer.mjs --fps 30 --scale 2 --out ~/Desktop/tori.mp4

import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i < 0 ? fallback : process.argv[i + 1];
};
const url = arg("url", "http://localhost:4321/trailer?capture");
const fps = Number(arg("fps", 60));
const scale = Number(arg("scale", 1));
const out = resolve(arg("out", join(root, ".scribe/trailer.mp4")));
const stills = arg("stills", "")
  .split(",")
  .filter(Boolean)
  .map(Number);
const track = join(root, "src/assets/trailer/built-to-beat-34s.m4a");
const chromePath = arg("chrome", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");

const profile = mkdtempSync(join(tmpdir(), "trailer-"));
const chrome = spawn(chromePath, [
  "--headless=new",
  "--remote-debugging-port=0",
  `--user-data-dir=${profile}`,
  "--hide-scrollbars",
  "--no-first-run",
  "about:blank",
]);
const quit = (code) => {
  chrome.once("exit", () => {
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    process.exit(code);
  });
  chrome.kill();
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Port 0 and the profile's own DevToolsActivePort, so this can only ever attach to the Chrome started above.
const target = async () => {
  for (let i = 0; i < 50; i++) {
    try {
      const port = readFileSync(join(profile, "DevToolsActivePort"), "utf8").split("\n")[0];
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find((x) => x.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error("Chrome did not start");
};

const ws = new WebSocket(await target());
await new Promise((r) => ws.addEventListener("open", r));
let seq = 0;
const pending = new Map();
const waiters = new Map();
ws.addEventListener("message", (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id) {
    const p = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result);
  } else {
    waiters.get(msg.method)?.();
    waiters.delete(msg.method);
  }
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    pending.set(++seq, { resolve, reject });
    ws.send(JSON.stringify({ id: seq, method, params }));
  });
const once = (method) => new Promise((r) => waiters.set(method, r));
const evaluate = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
};

try {
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: scale, mobile: false });
  await send("Page.navigate", { url });
  for (let i = 0; !(await evaluate("!!window.__trailer")); i++) {
    if (i > 100) throw new Error(`${url} did not load the trailer. Is pnpm dev running?`);
    await sleep(200);
  }
  await evaluate("document.fonts.ready.then(() => true)");
  await sleep(1500);
  const end = await evaluate("window.__trailer.end");
  // Headless Chrome only draws when something changed. An endless animation keeps a frame in every step.
  await evaluate(
    `document.body.insertAdjacentHTML("beforeend", '<i style="position:fixed;left:0;top:0;width:1px;height:1px;opacity:.01;animation:v-spin 1s linear infinite"></i>')`,
  );

  await send("Emulation.setVirtualTimePolicy", { policy: "pause" });
  const advance = async (ms) => {
    const done = once("Emulation.virtualTimeBudgetExpired");
    await send("Emulation.setVirtualTimePolicy", { policy: "advance", budget: ms });
    await done;
  };
  const shot = async (format) => Buffer.from((await send("Page.captureScreenshot", { format, quality: 95 })).data, "base64");

  mkdirSync(dirname(out), { recursive: true });
  const total = Math.round(end * fps);
  const wanted = new Set(stills.map((x) => Math.round(x * fps)));
  const last = stills.length ? Math.max(...wanted) : total - 1;
  const ffmpeg = stills.length
    ? null
    : spawn(
        "ffmpeg",
        ["-v", "error", "-y", "-f", "image2pipe", "-framerate", String(fps), "-i", "-", "-i", track]
          .concat(["-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart", out]),
        { stdio: ["pipe", "inherit", "inherit"] },
      );

  // Every frame is stepped, stills included, so CSS transitions sit where they would in the full render.
  // A screenshot waits for the page's next frame, which never comes while the clock is paused,
  // so it is requested before the advance that delivers it. If that advance held no frame,
  // the clock is nudged until one lands, and the next step is shortened by the same amount.
  let spent = 0;
  for (let i = 0; i <= last; i++) {
    await evaluate(`window.__trailer.seek(${i / fps})`);
    const still = wanted.has(i);
    const image = ffmpeg || still ? shot(ffmpeg ? "jpeg" : "png") : null;
    const step = Math.max(1, ((i + 1) * 1000) / fps - spent);
    await advance(step);
    spent += step;
    while (image && !(await Promise.race([image, sleep(500)]))) {
      await advance(2);
      spent += 2;
    }
    if (ffmpeg) {
      if (!ffmpeg.stdin.write(await image)) await new Promise((r) => ffmpeg.stdin.once("drain", r));
      if (i % fps === 0) process.stdout.write(`\r${i / fps}s of ${end}s`);
    } else if (still) {
      const file = join(dirname(out), `trailer-${i / fps}.png`);
      writeFileSync(file, await image);
      console.log(file);
    }
  }
  if (ffmpeg) {
    ffmpeg.stdin.end();
    await new Promise((r) => ffmpeg.on("close", r));
    console.log(`\n${out}`);
  }
  quit(0);
} catch (err) {
  console.error(err.message);
  quit(1);
}
