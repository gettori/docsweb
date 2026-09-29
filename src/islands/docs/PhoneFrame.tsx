import type { JSX } from "solid-js";
import "@fontsource-variable/inter";
import "../../app/css/tokens.css";
import s from "./PhoneFrame.module.css";

// The phone app at its own size, zoomed down to fit, as the first-run art draws
// it. `width` is the frame's width on the page; the screen inside is laid out at
// a real phone's 381px and scaled to match.
export default function PhoneFrame(props: { width?: number; children: JSX.Element }) {
  const width = () => props.width ?? 216;
  const zoom = () => (width() - 10) / 381;
  return (
    <div class={s.phone} style={{ width: `${width()}px`, height: `${Math.round(width() * 2.18)}px` }}>
      <div class={s.screen} style={{ zoom: zoom(), height: `${(Math.round(width() * 2.18) - 10) / zoom()}px` }}>
        <div class={s.statusBar}>
          <span>9:41</span>
          <span class={s.island} />
        </div>
        <div class={s.app}>{props.children}</div>
      </div>
    </div>
  );
}
