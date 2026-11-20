"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { mountProjectDemos } from "../project_demos";
import { Architecture } from "./architecture";
import type { Task } from "../lib/workflows";

export type Project = { number: number; title: string; description: string; plan: string };

function BuildPlan({ project }: { project: Project }) {
  const blocks = project.plan.split("\n\n");
  return blocks.map((block, index) => {
    if (blocks[index - 1] === "## Architecture") {
      return <Architecture key={index} project={project.number} diagram={block} />;
    }
    if (block.startsWith("## ")) return <h3 key={index}>{block.slice(3)}</h3>;
    if (block.startsWith("```text\n")) {
      return <pre key={index}><code>{block.slice(8, -4)}</code></pre>;
    }
    const parts = block.split(/(\*\*[^*]+\*\*)/);
    return <p key={index}>{parts.map((part, partIndex) =>
      part.startsWith("**") ? <strong key={partIndex}>{part.slice(2, -2)}</strong> : part
    )}</p>;
  });
}

function OpsDemo() {
  const [goal, setGoal] = useState("");
  const [note, setNote] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const titles = new Map(tasks.map((task) => [task.task_id, task.title]));

  async function loadSample() {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/sample");
      if (!response.ok) throw new Error("Could not load the sample.");
      const sample = await response.json();
      setGoal(sample.goal);
      setNote(sample.note);
      setTasks([]);
      setMessage("Sample loaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load the sample.");
    } finally {
      setPending(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTasks([]);
    setPending(true);
    setMessage("Extracting proposals…");
    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, note }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Extraction failed.");
      setTasks(result.tasks);
      setMessage(`${result.tasks.length} task proposals`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Extraction failed.");
    } finally {
      setPending(false);
    }
  }

  return <>
    <form onSubmit={submit}>
      <label htmlFor="goal">Goal ID</label>
      <input id="goal" value={goal} onChange={(event) => setGoal(event.target.value)} required maxLength={120} placeholder="launch_storefront" />
      <label htmlFor="note">Meeting note</label>
      <textarea id="note" value={note} onChange={(event) => setNote(event.target.value)} required maxLength={20000} placeholder="Paste a meeting note or load the fictional sample." />
      <div className="actions">
        <button type="submit" disabled={pending}>Extract tasks</button>
        <button type="button" disabled={pending} onClick={loadSample}>Load sample</button>
      </div>
      <output role="status">{message}</output>
    </form>
    <div className="demo-results" aria-label="Task proposals">
      {tasks.map((task) => <article key={task.task_id}>
        <h3>{task.title}</h3>
        <p>Owner · {task.owner ?? "Unassigned"} <span className="divider">/</span> Due · {task.due_date ?? "Unconfirmed"}</p>
        <p>Goal · {task.goal_id}</p>
        <p>Depends on · {task.depends_on.map((id) => titles.get(id)).join(", ") || "None"}</p>
        {task.needs_review && <p className="review">Needs review · {task.review_notes.join(" ")}</p>}
        <blockquote>{task.source_excerpt}</blockquote>
      </article>)}
    </div>
  </>;
}

export default function Studio({ projects, templates }: { projects: Project[]; templates: string }) {
  const [active, setActive] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (root.current) mountProjectDemos(root.current, "/api");
  }, []);

  function pauseMedia(previous: number) {
    root.current?.querySelectorAll<HTMLMediaElement>(`#panel-${previous + 1} audio, #panel-${previous + 1} video`)
      .forEach((media) => media.pause());
  }

  function choose(index: number) {
    if (index !== active) pauseMedia(active);
    setActive(index);
  }

  function clickProject(index: number) {
    choose(index);
    if (menuOpen) {
      setMenuOpen(false);
      menuButton.current?.focus();
    }
  }

  function handleKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const count = projects.length;
    const positions: Record<string, number> = {
      ArrowDown: (index + 1) % count,
      ArrowUp: (index + count - 1) % count,
      Home: 0,
      End: count - 1,
    };
    const next = positions[event.key];
    if (next === undefined) return;
    event.preventDefault();
    choose(next);
    tabRefs.current[next]?.focus();
  }

  return <div className="studio" ref={root}>
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><h1>Workflow Studio</h1></div>
      <button
        type="button" ref={menuButton} className="menu-toggle" aria-expanded={menuOpen}
        aria-controls="project-navigation" onClick={() => setMenuOpen(!menuOpen)}
      >Projects <span aria-hidden="true">{menuOpen ? "−" : "+"}</span></button>
      <div className="sidebar-menu" data-open={menuOpen} id="project-navigation">
        <p className="sidebar-label">Projects</p>
        <div role="tablist" aria-label="Projects" aria-orientation="vertical" className="project-tabs">
          {projects.map((project, index) => <button key={project.number} type="button" role="tab"
            ref={(button) => { tabRefs.current[index] = button; }}
            id={`tab-${project.number}`} aria-controls={`panel-${project.number}`}
            aria-selected={active === index} tabIndex={active === index ? 0 : -1}
            onClick={() => clickProject(index)} onKeyDown={(event) => handleKey(event, index)}>
            <span className="project-number">{String(project.number).padStart(2, "0")}</span>
            <span>{project.title}</span>
          </button>)}
        </div>
      </div>
    </aside>
    <main className="workspace">
      {projects.map((project, index) => <section key={project.number} id={`panel-${project.number}`}
        role="tabpanel" aria-labelledby={`tab-${project.number}`} hidden={index !== active}>
        <header className="project-heading">
          <p className="project-id">PRD {String(project.number).padStart(2, "0")}</p>
          <h2>{project.title}</h2>
          <p>{project.description}</p>
          <a href={`#plan-${project.number}`} className="plan-link">View build plan <span aria-hidden="true">↓</span></a>
        </header>
        {index === 0 ? <OpsDemo /> : <div id={`demo-${project.number}`} />}
        <article className="plan" id={`plan-${project.number}`}>
          <h2>{index === 0 ? "Ops Brain v1 build plan" : "Build plan"}</h2>
          <BuildPlan project={project} />
        </article>
      </section>)}
    </main>
    <div hidden dangerouslySetInnerHTML={{ __html: templates }} />
  </div>;
}
