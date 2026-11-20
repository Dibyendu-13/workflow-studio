# Workflow Studio

An interactive workspace for running workflow prototypes and exploring their architecture. The web app uses Next.js, React, and TypeScript.

## Run locally

Use Node.js 22 or newer. Set `OPENAI_API_KEY` in an ignored `.env` file in the project root or in the server environment. The Next.js server uses it for task extraction, draft generation, and narration.

```sh
npm ci
npm run dev -- --port 3000
```

Open [Workflow Studio](http://127.0.0.1:3000/). For a production build, run `npm run build`, then `npm run start -- --port 3000`.

## Workflows

| Workflow | What you can try |
| --- | --- |
| [Ops Brain](build_plan.md) | Extract owners, dates, and dependencies from a [fictional meeting note](examples/launch_discussion.md), and flag tasks that need review. |
| [Publishing & Insights Hub](submissions/prd_2.md) | Approve a post and schedule it in a browser-local test queue. |
| [Text Content Engine](submissions/prd_3.md) | Generate four drafts from a transcript for X and LinkedIn in two voices. |
| [AI Carousels](submissions/prd_4.md) | Render five downloadable PNG slides from editable copy. |
| [Yap Auto-Editor](submissions/prd_5.md) | Rank and play clips from a synthetic recording with a timestamped transcript. |
| [AI Explainers & Motion Graphics](submissions/prd_6.md) | Create a narrated, animated preview from a script. |
| [AI Character Content](submissions/prd_7.md) | Render three illustrated shots and play a line of dialogue. |

Each workflow has a build plan in the UI. The publishing queue is a simulation and the sample inputs are fictional.

## Checks

```sh
npm run typecheck
npm run build
python3 -m unittest
```

## Python prototype

The original CLI and browser prototype run with Python 3.10+ using the standard library.

```sh
python3 ops_brain.py examples/launch_meeting.md
python3 web_app.py --port 8000
```

The formatted-note CLI example runs offline. For free-form extraction, run `python3 ops_brain.py --goal launch_storefront examples/launch_discussion.md`. It uses OpenAI when a key is configured and otherwise tries the signed-in Codex CLI. The Python browser prototype uses OpenAI for extraction and drafting, and macOS `say` for narration.
