import { Show } from "solid-js";
import wheel from "./css/Wheel.module.css";

// The app's own hour ranges (Horizon.tsx pickScene).
export function sceneFor(hour: number) {
  if (hour >= 5 && hour < 8) return "dawn";
  if (hour >= 8 && hour < 11) return "morning";
  if (hour >= 11 && hour < 15) return "midday";
  if (hour >= 15 && hour < 18) return "golden";
  if (hour >= 18 && hour < 21) return "dusk";
  return "night";
}

const sceneCache = new Map<string, Promise<string>>();
export function loadScene(name: string) {
  if (!sceneCache.has(name)) sceneCache.set(name, fetch(`/scenes/${name}.svg`).then((r) => r.text()).catch(() => ""));
  return sceneCache.get(name)!;
}

function WheelGlyph() {
  return (
    <svg class={wheel.glyph} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round">
      <circle cx="12" cy="12" r="6.6" />
      <circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none" />
      <path d="M14.6 12H22.2M13.84 13.84L19.21 19.21M12 14.6V22.2M10.16 13.84L4.79 19.21M9.4 12H1.8M10.16 10.16L4.79 4.79M12 9.4V1.8M13.84 10.16L19.21 4.79" />
    </svg>
  );
}

export function Wheel(props: { state: "idle" | "working" | "needs"; active?: boolean; count?: number; size?: number }) {
  return (
    <span
      class={wheel.wheel}
      data-state={props.state}
      data-active={props.active ? "true" : "false"}
      style={{ "--wheel-size": `${props.size ?? 14}px` }}
      aria-hidden="true"
    >
      <WheelGlyph />
      <Show when={props.state === "working"}>
        <span class={wheel.stillDot} />
      </Show>
      <Show when={props.state === "needs"}>
        <span class={wheel.badge}>{props.count ?? 1}</span>
      </Show>
    </span>
  );
}
