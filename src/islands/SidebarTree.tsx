import { Globe, House, Workflow } from "lucide";
import "../app/css/tokens.css";
import { BranchRow, PrLine, ProjectRow, StatusBubble, SyncPush } from "../app/kit";
import { BranchMark, WorktreeMark } from "../app/gitMarks";
import sidebar from "../app/css/LeftSidebar.module.css";
import rows from "../app/css/SidebarRows.module.css";

// The tree the eleven terminals fold into: the same rows the app draws, rendered
// once on the server. Sessions are not rows in the app, so a branch rolls up
// every session in it into one bubble.
export default function SidebarTree() {
  return (
    <div class={`${sidebar.tree} ${rows.rowScope}`} style={{ "--ui-scale": "1.08" }}>
      <div class={sidebar.treeHead}>
        <span class={sidebar.headStrut} />
        <div class={sidebar.spaceHeader}>
          <span class={sidebar.spaceHeaderName}>work</span>
          <span class={sidebar.spaceHeaderKind}>{"\u00b7 Spaces"}</span>
        </div>
      </div>
      <div class={sidebar.treeScroll} style={{ overflow: "hidden" }}>
        <ProjectRow name="api" icon={Globe} open>
          <BranchRow
            label="feat/webhooks"
            icon={<WorktreeMark active={false} />}
            selected
            meta={<PrLine number={482} age="2h" checks="4/4" comments={3} />}
            end={<StatusBubble rollup={{ waiting: 1 }} />}
          />
          <BranchRow
            label="fix/rate-limit"
            icon={<WorktreeMark active />}
            end={
              <>
                <SyncPush count={2} />
                <StatusBubble rollup={{ executing: 1 }} />
              </>
            }
          />
          <BranchRow label="main" icon={<BranchMark active={false} current />} end={<StatusBubble rollup={{ idle: 1 }} />} />
        </ProjectRow>
        <ProjectRow name="web" icon={Workflow} open>
          <BranchRow label="feat/search" icon={<WorktreeMark active />} end={<StatusBubble rollup={{ executing: 1, idle: 1 }} />} />
          <BranchRow label="dark-mode" icon={<WorktreeMark active />} end={<StatusBubble rollup={{ executing: 2 }} />} />
        </ProjectRow>
        <ProjectRow name="infra" icon={House} open>
          <BranchRow label="main" icon={<BranchMark active={false} current />} end={<StatusBubble rollup={{ idle: 2 }} />} />
        </ProjectRow>
      </div>
    </div>
  );
}
