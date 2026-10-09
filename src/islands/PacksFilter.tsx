import { createEffect, createSignal, For, onMount, Show, type JSX } from "solid-js";
import s from "./PacksFilter.module.css";

type Kind = "all" | "lsp" | "dap" | "formatters" | "themes" | "agents";

const TABS: { kind: Kind; label: string; noun: [string, string] }[] = [
  { kind: "all", label: "All", noun: ["pack", "packs"] },
  { kind: "lsp", label: "Languages", noun: ["language", "languages"] },
  { kind: "dap", label: "Debuggers", noun: ["debugger", "debuggers"] },
  { kind: "formatters", label: "Formatters", noun: ["formatter", "formatters"] },
  { kind: "themes", label: "Themes", noun: ["theme", "themes"] },
  { kind: "agents", label: "Agents", noun: ["agent", "agents"] },
];

// The cards are static HTML, so search engines and Pagefind see every one;
// this only shows and hides them.
export default function PacksFilter(props: { packs: { kind: string; name: string }[]; children?: JSX.Element }) {
  const [kind, setKind] = createSignal<Kind>("all");
  const [query, setQuery] = createSignal("");
  const tab = () => TABS.find((t) => t.kind === kind())!;
  const inTab = () => props.packs.filter((p) => kind() === "all" || p.kind === kind());
  const q = () => query().trim().toLowerCase();
  const shown = () => inTab().filter((p) => p.name.includes(q()));
  const noun = (n: number) => tab().noun[n === 1 ? 0 : 1];

  onMount(() => {
    const k = new URLSearchParams(location.search).get("kind");
    if (TABS.some((t) => t.kind === k)) setKind(k as Kind);
  });

  createEffect(() => {
    const k = kind();
    const needle = q();
    for (const card of document.querySelectorAll<HTMLElement>("[data-pack]")) {
      card.hidden = !((k === "all" || card.dataset.kind === k) && card.dataset.name!.includes(needle));
    }
  });

  const pick = (k: Kind) => {
    setKind(k);
    const url = new URL(location.href);
    if (k === "all") url.searchParams.delete("kind");
    else url.searchParams.set("kind", k);
    history.replaceState(null, "", url);
  };

  return (
    <>
      <div class={s.controls}>
        <div class={s.tabs} role="tablist" aria-label="Kind">
          <For each={TABS}>
            {(t) => (
              <button type="button" role="tab" class={s.tab} aria-selected={kind() === t.kind} onClick={() => pick(t.kind)}>
                {t.label}
              </button>
            )}
          </For>
        </div>
        <label class={s.filter}>
          <span class={s.glass} aria-hidden="true" />
          <input type="search" placeholder="Filter by name" aria-label="Filter by name" value={query()} onInput={(e) => setQuery(e.currentTarget.value)} />
          <Show when={query()}>
            <button type="button" class={s.clear} onClick={() => setQuery("")}>
              Clear
            </button>
          </Show>
        </label>
      </div>
      <p class={s.count} aria-live="polite">
        {q() ? `${shown().length} of ${inTab().length} ${noun(inTab().length)} match “${query().trim()}”` : `${inTab().length} ${noun(inTab().length)}`}
      </p>
      <div hidden={shown().length === 0}>{props.children}</div>
      <Show when={shown().length === 0}>
        <div class={s.empty}>
          <p class={s.headline}>No packs match “{query().trim()}”</p>
          <p class={s.hint}>
            {kind() === "all"
              ? "The filter matches pack names. Try a shorter name, or contribute the pack yourself."
              : `Nothing in ${tab().label} by that name. Try All, or contribute the pack yourself.`}
          </p>
          <div class={s.actions}>
            <button type="button" class={s.outline} onClick={() => setQuery("")}>
              Clear filter
            </button>
            <a href="/docs/packs/contributing/">Contribute a pack →</a>
          </div>
        </div>
      </Show>
    </>
  );
}
