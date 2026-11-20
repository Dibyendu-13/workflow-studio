import { Fragment, useId, useRef } from "react";
import { componentDetails } from "./architecture-details";

type Flow = {
  label: string;
  components: { name: string; detail?: string }[];
};

const opsFlows: Flow[] = [
  {
    label: "Capture and validate",
    components: [
      { name: "Notion Meetings", detail: "Source notes" },
      { name: "Managed workflow", detail: "Triggers and retries" },
      { name: "Model adapter", detail: "Extract commitments" },
      { name: "Proposal validator", detail: "Check dates and links" },
    ],
  },
  {
    label: "Review and track",
    components: [
      { name: "Notion approval", detail: "Confirm proposals" },
      { name: "Notion Tasks & Projects", detail: "Store work and goal links" },
      { name: "Scheduled risk check", detail: "Follow dependencies" },
      { name: "Slack & Notion", detail: "Notify owners and show risk" },
    ],
  },
  {
    label: "Audit branch",
    components: [
      { name: "Model adapter" },
      { name: "Run log", detail: "Record input, output, model and cost" },
    ],
  },
];

const publishingLabels = ["Schedule approved content", "Reconcile status and metrics", "Handle exceptions"];

function ComponentCard({ name, detail }: { name: string; detail?: string }) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function show() {
    clearTimeout(closeTimer.current);
    const card = trigger.current;
    const popover = panel.current;
    if (!card || !popover || popover.matches(":popover-open")) return;
    const rect = card.getBoundingClientRect();
    const width = Math.min(320, document.documentElement.clientWidth - 24);
    popover.style.left = `${Math.max(12, Math.min(rect.left, document.documentElement.clientWidth - width - 12))}px`;
    popover.style.top = `${rect.bottom + 8}px`;
    popover.showPopover();
    if (popover.getBoundingClientRect().bottom > window.innerHeight - 12) {
      popover.style.top = `${Math.max(12, rect.top - popover.offsetHeight - 8)}px`;
    }
  }

  function hideSoon() {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      if (panel.current?.matches(":popover-open")) panel.current.hidePopover();
    }, 160);
  }

  return <>
    <button ref={trigger} type="button" className="architecture-node"
      aria-describedby={id} onPointerEnter={(event) => { if (event.pointerType === "mouse") show(); }}
      onPointerLeave={(event) => { if (event.pointerType === "mouse") hideSoon(); }}
      onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) show(); }}
      onBlur={hideSoon}
      onClick={show}>
      <strong>{name}</strong>
      {detail && <span>{detail}</span>}
    </button>
    <div id={id} ref={panel} popover="auto" className="architecture-popover"
      onPointerEnter={() => clearTimeout(closeTimer.current)} onPointerLeave={hideSoon}>
      <strong>{name}</strong>
      <p>{componentDetails[name]}</p>
    </div>
  </>;
}

export function Architecture({ project, diagram }: { project: number; diagram: string }) {
  const flows = project === 1 ? opsFlows : diagram.trim().split("\n").map((line, index) => ({
    label: project === 2 ? publishingLabels[index] : index === 0 ? "Prepare content" : "Review and schedule",
    components: line.split("→").map((name) => ({ name: name.trim(), detail: undefined })),
  }));

  return <div className="architecture" aria-label="Architecture component flows">
    {flows.map(({ label, components }, flowIndex) => <Fragment key={label}>
      {project !== 2 && flowIndex === 1 && <span className="architecture-handoff" aria-hidden="true">↓</span>}
      <div className="architecture-flow">
        <h4>{label}</h4>
        <ol aria-label={label}>
          {components.map(({ name, detail }, index) => <li key={name}>
            <ComponentCard name={name} detail={detail} />
            {index < components.length - 1 && <span className="architecture-arrow" aria-hidden="true">→</span>}
          </li>)}
        </ol>
      </div>
    </Fragment>)}
  </div>;
}
