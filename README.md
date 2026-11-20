# PRD 1 — Ops Brain

## Run Workflow Studio

Use Node.js 22 or newer. From this directory, run:

```sh
npm ci
npm run dev -- --port 3000
```

Open [Workflow Studio](http://127.0.0.1:3000). No Python server is needed for the Next.js app.
Keep `OPENAI_API_KEY` in this project's ignored `.env` or set it in the server environment.
Ops Brain and the Text Content Engine use OpenAI for structured extraction and drafting.
Explainers and Character Content use OpenAI speech. The publishing queue is local to the browser.

For a production build, run `npm run build`, then `npm run start -- --port 3000`.
The Python CLI and the earlier Python web server remain available below.

Just Sortd is a pre-launch D2C brand in Mumbai. Its team of 5–10 people plus freelancers and vendors works in Notion, Slack, and Google Workspace. Most team members are non-technical. Ops Brain is the operations system in the brief and has no dependency on the other PRDs.

[Ops Brain PRD](https://justsortd.notion.site/PRD-1-Ops-Brain-41c990a2e07480009bd7e00fcd0fc89d) · [Take-home brief and shared build principles](https://justsortd.notion.site/product-engineer-take-home-task)

## Problem and goal

Decisions from meetings and brainstorms can go untracked. A delay early in a chain of tasks can threaten an entire goal before anyone notices, leaving someone to chase updates manually. Ops Brain aims to automate about 80% of the workflow from meeting input to assigned tasks, priorities, and follow-ups.

- **Team members** need to see what matters today and this week, what blocks them, and whom they are blocking.
- **Founders and leads** need to see goal progress and risks without asking for updates.

## System requirements

- Turn decisions from meetings, brainstorms, and notes into tasks with an owner, a due date, a linked goal, and links to prerequisite tasks.
- Prioritise work using company goals, deadlines, and dependencies. Explain each ranking and keep priorities stable until underlying conditions change.
- When a task slips, alert affected downstream people before their own deadlines are impacted. Show the affected tasks and goals.
- Automate follow-ups and show founders whether each goal is on track, at risk, or off track, with reasons.
- Over time, support handing recurring work to AI agents and improving the system using historical runs.

## Constraints and build principles

- Use the existing Notion Tasks, Projects, and Meetings databases. Notion is the source of truth. Use Slack for alerts and quick input.
- Require a human to confirm proposed dates, owners, and priorities before applying changes. Require human approval before assigning work to anyone.
- Let non-technical users start workflows from Slack, a Notion button, or a folder upload. Send failures to one alerts channel in plain language and provide a runbook for common fixes.
- Use a model-agnostic AI layer and route each job to the lowest-cost model that meets its needs. Keep prompts and rules in editable, versioned configuration.
- For each run, log input, output, model, cost, and whether a person approved, edited, or rejected the result. Report monthly running costs.
- Prefer native features and managed services. Justify custom code and choose components that can support the production workflow.

## Success metrics

| Metric | Target |
| --- | --- |
| Task completeness | At least 90% of active tasks have an owner, due date, goal link, and dependencies where relevant. |
| Early warning | Flag slips at least three days before the downstream task is due. |
| Extraction quality | At least 80% of AI-extracted tasks are approved without edits. |
| Priority quality | Daily rankings match a founder's judgement on eight of ten spot-checked days. |
| Admin time | Spend under 15 minutes per week managing tasks. |

## Non-goals

- A custom Gantt app or front end.
- Replacing Notion as the task tool.
- Performance reviews or appraisals.

## Take-home submission

Budget **3–4 hours** for the unpaid take-home.

1. **One-page build plan.** Describe what you would ship in v1 and why. Include an architecture diagram, data model, buy-versus-build decisions, failure handling, and estimated monthly running cost.
2. **Working demo for your primary PRD.** Budget 1–2 hours. Turn one sample meeting note into structured tasks with owners, due dates, goal links, and dependencies. A rough demo without a UI is acceptable. Submit a repository, live link, or screen recording. Use public or realistic fictional inputs, avoid private data, and identify the inputs in the Loom.
3. **Loom of up to five minutes.** Walk through the build plan and show the demo working.

Name the selected PRD in the emailed submission form. Submit within five days of receiving the email, then reply to confirm submission. Submit once per PRD. Optional additional PRDs require a build plan and Loom and are estimated at 1–2 hours each.

## Paid trial if shortlisted

Build the core of v1 over five working days in a sandbox using a test Notion teamspace and Slack channel. Include a runbook and monthly cost estimate.

The acceptance test uses a chain of at least four tasks linked to one goal. When an upstream task slips, every affected person must be notified within 15 minutes, and priorities must update correctly.

## Assumptions to state in the build plan

- How competing company goals are weighted.
- Which working hours and days Slack alerts should respect.

## Run the starter

From this directory, run the example with Python 3.10 or newer. The starter uses only the Python standard library.

```sh
python3 ops_brain.py examples/launch_meeting.md
```

The CLI reads a fictional launch meeting note and prints four JSON task proposals. Each proposal has a task ID, title, owner, due date, goal ID, and prerequisite task IDs. The CLI checks for invalid dates, duplicate task IDs, missing prerequisites, and dependency cycles.

This command uses a deterministic parser for the formatted decisions in the sample. The JSON output represents proposed work for human review.

### Review the demo without Codex

Open the [fictional meeting note](examples/launch_discussion.md) and the
[captured output from a verified run](examples/launch_discussion_output.json).
The JSON is saved output. To extract tasks from a new free-form note, use the
signed-in CLI below.

### Run the free-form demo

Sign in to Codex before running the demo. The script uses `codex` from your PATH if available, or the CLI bundled with the ChatGPT desktop app at its default macOS install location. If neither is available, install the standalone CLI. The model call requires connectivity and sends the note to Codex for extraction. Use the fictional sample for the take-home.

```sh
python3 ops_brain.py --goal launch_storefront examples/launch_discussion.md
```

The goal argument is the existing goal to link. The model extracts task fields from prose. Python checks source excerpts, date formats, unique IDs, and dependencies. An unresolved owner or deadline becomes a review flag. The original formatted-note command still works without Codex.

- [One-page build plan](build_plan.md)

### Run the browser demo without Codex

Set `OPENAI_API_KEY` in this project's ignored `.env` file or in the server environment.
Run `python3 web_app.py` and open [localhost](http://127.0.0.1:8000).
Select **Load sample**, then **Extract tasks**, or paste a new note and enter its goal ID.
Only the Python server reads the key. It sends the meeting note to the OpenAI API.
The server listens on localhost. Reviewers who run it on their own computer need an API key on that server. The CLI also uses the API when a key is available and otherwise uses Codex.

### Additional take-home submissions

The browser demo has a tab for every PRD. Ops Brain is the primary submission with live extraction. The other six tabs each include a runnable prototype and build plan.

| Tab | Run it |
| --- | --- |
| Ops Brain | Load the fictional meeting note and extract task proposals. |
| Publishing & Insights Hub | Approve a revision and schedule it to a local test destination. The queue lives in the current browser. |
| Text Content Engine | Generate brand and founder drafts for X and LinkedIn from a transcript. |
| AI Carousels | Enter a topic and four lines of copy, then render and download five PNGs. |
| Yap Auto-Editor | Rank three clips from the bundled 20-minute synthetic recording and play their intervals. Ranking uses its pre-aligned transcript. |
| AI Explainers & Motion Graphics | Generate narration from a script and play an animated, captioned preview. |
| AI Character Content | Render three PNGs from a consistent illustrated character template and listen to one line of dialogue. |

Ops Brain and the Text Content Engine use the server’s OpenAI key. The two narration features use macOS `say`. The other prototypes run offline. The sandbox queue does not publish to real accounts, and publishing integrations remain in the build plans.

- [PRD 2 · Publishing & Insights Hub](submissions/prd_2.md)
- [PRD 3 · Text Content Engine](submissions/prd_3.md)
- [PRD 4 · AI Carousels](submissions/prd_4.md)
- [PRD 5 · Yap Auto-Editor](submissions/prd_5.md)
- [PRD 6 · AI Explainers & Motion Graphics](submissions/prd_6.md)
- [PRD 7 · AI Character Content](submissions/prd_7.md)
