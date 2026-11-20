import { projectFile } from "./project-files";

export type Task = {
  task_id: string;
  title: string;
  owner: string | null;
  due_date: string | null;
  goal_id: string;
  depends_on: string[];
  source_excerpt: string;
  review_notes: string[];
  needs_review: boolean;
};

export class WorkflowError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
  }
}

async function openai(path: string, payload: object) {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new WorkflowError("Set OPENAI_API_KEY in the project .env file.", 503);
  let response: Response;
  try {
    response = await fetch(`https://api.openai.com/v1/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    throw new WorkflowError("Could not reach OpenAI. Check connectivity and retry.", 502);
  }
  if (response.status === 401) {
    throw new WorkflowError("OpenAI rejected the configured API key.", 502);
  }
  if (!response.ok) {
    throw new WorkflowError(`OpenAI request failed (HTTP ${response.status}). Check access and billing.`, 502);
  }
  return response;
}

async function structured(input: string, name: string, instructions: string, schema: object) {
  const response = await openai("responses", {
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    instructions, input, store: false, max_output_tokens: 6000,
    text: { format: { type: "json_schema", name, strict: true, schema } },
  });
  const value = await response.json();
  if (value.status !== "completed") throw new WorkflowError("The model did not finish. Try shorter input.", 502);
  const output: string = value.output
    .filter((item: { type: string }) => item.type === "message")
    .flatMap((item: { content: { type: string; text: string }[] }) => item.content)
    .filter((part: { type: string }) => part.type === "output_text")
    .map((part: { text: string }) => part.text).join("");
  if (!output) throw new WorkflowError("The model returned no structured result.", 502);
  return JSON.parse(output) as unknown;
}

function object(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new WorkflowError("Expected a structured object.");
  }
  return value as Record<string, unknown>;
}

function nonempty(value: unknown): value is string {
  return typeof value === "string" && Boolean(value.trim());
}

function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(nonempty);
}

export function validateTasks(result: unknown, note: string, goal: string): Task[] {
  const { tasks } = object(result);
  if (!Array.isArray(tasks) || !tasks.length) throw new WorkflowError("No task proposals were found.");
  const proposals = tasks.map((value: unknown): Task => {
    const { task_id, title, owner, due_date, depends_on, source_excerpt, review_notes } = object(value);
    if (!nonempty(task_id) || !nonempty(title) || !nonempty(source_excerpt) ||
        !(owner === null || nonempty(owner)) || !(due_date === null || nonempty(due_date)) ||
        !strings(depends_on) || !strings(review_notes)) {
      throw new WorkflowError("A task proposal had invalid fields.");
    }
    if (!note.includes(source_excerpt.trim())) {
      throw new WorkflowError(`Task ${task_id} has an excerpt absent from the meeting note.`);
    }
    if (due_date !== null) {
      const date = new Date(due_date);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(due_date) || !Number.isFinite(date.getTime()) ||
          date.toISOString().slice(0, 10) !== due_date) {
        throw new WorkflowError(`Task ${task_id} has an invalid due date.`);
      }
    }
    const notes = [...review_notes];
    if (owner === null) notes.push("Owner needs confirmation.");
    if (due_date === null) notes.push("Due date needs confirmation.");
    return {
      task_id, title, owner, due_date, goal_id: goal, depends_on,
      source_excerpt: source_excerpt.trim(), review_notes: [...new Set(notes)], needs_review: notes.length > 0,
    };
  });

  const graph = new Map(proposals.map((task) => [task.task_id, task.depends_on]));
  if (graph.size !== proposals.length) throw new WorkflowError("Task IDs must be unique.");
  const pending = new Set<string>();
  const complete = new Set<string>();
  function visit(id: string) {
    if (complete.has(id)) return;
    const dependencies = graph.get(id);
    if (!dependencies) throw new WorkflowError(`Unknown dependency ID: ${id}`);
    if (pending.has(id)) throw new WorkflowError(`Dependency cycle at ${id}.`);
    pending.add(id);
    dependencies.forEach(visit);
    pending.delete(id);
    complete.add(id);
  }
  graph.forEach((_, id) => visit(id));
  return proposals;
}

export async function extract(note: string, goal: string) {
  const schema = JSON.parse(projectFile("task_schema.json"));
  const result = await structured(note, "task_proposals", projectFile("extraction_prompt.txt"), schema);
  return validateTasks(result, note, goal);
}

const draftFields = ["brand_x", "brand_linkedin", "founder_x", "founder_linkedin"] as const;

export async function draftPosts(text: string) {
  const result = object(await structured(text, "social_drafts", projectFile("voice_guide.txt"), {
    type: "object", required: draftFields, additionalProperties: false,
    properties: Object.fromEntries(draftFields.map((field) => [field, { type: "string" }])),
  }));
  for (const field of draftFields) {
    const draft = result[field];
    if (!nonempty(draft) || (field.endsWith("_x") && draft.length > 280)) {
      throw new WorkflowError("A draft was empty or exceeded the X limit. Try generating again.", 502);
    }
  }
  return result;
}

export async function narrate(text: string) {
  return openai("audio/speech", {
    model: "gpt-4o-mini-tts", voice: "coral", input: text, response_format: "mp3",
  });
}
