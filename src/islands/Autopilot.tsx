import ToriWindow from "./ToriWindow";
import sp from "./Spaces.module.css";
import s from "./Autopilot.module.css";

export default function Autopilot() {
  return (
    <div class={sp.wrap} style={{ "--hue": "192 132 252" }}>
      <div class={sp.head}>
        <h2 class={sp.h2}>
          Hand the queue <span class={sp.accent}>to Autopilot.</span>
        </h2>
        <div class={sp.headRight}>
          <p>Point it at an issue. It makes the worktree, starts a worker, and brings you a pull request to approve.</p>
        </div>
      </div>

      <div class={s.frame}>
        <div class={s.clip}>
          <ToriWindow mode="cockpit" maxScale={1.1} />
        </div>
      </div>

      <div class={sp.beats}>
        <div>
          <b>Nothing leaves without approval</b>
          <p>Opening a pull request, submitting a review and merging are each their own approval, spent once, tied to the exact draft shown to you.</p>
        </div>
        <div>
          <b>A contract per project</b>
          <p>Each project sets how work ships, how far it goes before asking, and whether it queues new work on its own. With none set, it asks before everything.</p>
        </div>
        <div>
          <b>Off by default</b>
          <p>Turn it on in Settings and a Cockpit switch joins the title bar. {"\u2318\u21e7J"} flips between it and your workspace.</p>
        </div>
      </div>
      <a class={sp.more} href="/docs/automation/autopilot/">
        How Autopilot works {"->"}
      </a>
    </div>
  );
}
