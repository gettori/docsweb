import { createSignal, For, onCleanup, Show, type JSX } from "solid-js";
import { ChevronRight } from "lucide";
import "@fontsource-variable/inter";
import "../../app/css/tokens.css";
import { Icon } from "../../app/kit";
import w from "../../app/window.module.css";
import toolbar from "../../app/css/Toolbar.module.css";
import btn from "../../app/css/Button.module.css";
import s from "./DemoWindow.module.css";

export type Toast = { text: string; undo?: () => void };

// A toast that clears itself; a new one replaces the old one and restarts the clock.
export function useToast() {
  const [toast, setToast] = createSignal<Toast | null>(null);
  let timer: number | undefined;
  onCleanup(() => clearTimeout(timer));
  const say = (text: string, undo?: () => void) => {
    clearTimeout(timer);
    setToast({ text, undo });
    timer = window.setTimeout(() => setToast(null), 4200);
  };
  return { toast, say, clear: () => setToast(null) };
}

// The cropped Tori window every docs mockup sits in: traffic lights, a
// breadcrumb, then whatever the demo draws.
export default function DemoWindow(props: { crumbs: string[]; toast?: Toast | null; minHeight?: number; children: JSX.Element }) {
  return (
    <div class={s.win} style={{ "--tint": "217 164 104", "min-height": `${props.minHeight ?? 460}px` }}>
      <div class={w.wash} />
      <header class={`${w.topbar} ${s.topbar}`}>
        <div class={w.lights}>
          <span style={{ background: "#ff5f57" }} />
          <span style={{ background: "#febc2e" }} />
          <span style={{ background: "#28c840" }} />
        </div>
        <nav class={`${toolbar.tbCrumb} ${s.crumbs}`}>
          <For each={props.crumbs}>
            {(c, i) => (
              <>
                <Show when={i() > 0}>
                  <Icon icon={ChevronRight} class={`${toolbar.crumbSep ?? ""} dim`} size={12} />
                </Show>
                <span class={`${toolbar.crumb ?? ""} ${i() === props.crumbs.length - 1 ? (toolbar.leaf ?? "") : "dim"}`}>{c}</span>
              </>
            )}
          </For>
        </nav>
      </header>
      <div class={s.body}>{props.children}</div>
      <Show when={props.toast}>
        {(t) => (
          <div class={s.toast} role="status">
            <span>{t().text}</span>
            <Show when={t().undo}>
              <button type="button" class={`${btn.btn} ${btn.default} ${btn.xs}`} onClick={() => t().undo?.()}>
                <span class={btn.label}>Undo</span>
              </button>
            </Show>
          </div>
        )}
      </Show>
    </div>
  );
}
