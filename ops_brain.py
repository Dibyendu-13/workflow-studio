"""Convert meeting notes into JSON task proposals for human review."""

import argparse
from dataclasses import asdict, dataclass
from datetime import date
from graphlib import CycleError, TopologicalSorter
import json
import os
from pathlib import Path
import re
from shutil import which
import subprocess
from tempfile import TemporaryDirectory
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


DECISION = re.compile(
    r"- \[(?P<task_id>[\w-]+)\] (?P<title>[^|]+)"
    r"\| Owner: (?P<owner>[^|]+)\| Due: (?P<due_date>\d{4}-\d{2}-\d{2})"
    r"(?: \| Depends on: (?P<dependencies>[\w, -]+))?"
)

DESKTOP_CODEX = Path(
    "/Applications/ChatGPT.app/Contents/Resources/codex-cli/"
    "CodexCLI.app/Contents/MacOS/codex"
)


@dataclass(frozen=True)
class TaskProposal:
    task_id: str
    title: str
    owner: str | None
    due_date: str | None
    goal_id: str
    depends_on: list[str]


@dataclass(frozen=True)
class SourcedTaskProposal(TaskProposal):
    source_excerpt: str
    review_notes: list[str]
    needs_review: bool


def extract_tasks(note: str) -> list[TaskProposal]:
    goals = re.findall(r"^Goal: ([\w-]+)$", note, re.MULTILINE)
    if len(goals) != 1:
        raise ValueError("Expected exactly one 'Goal: goal_id' line.")

    _, heading, decisions = note.partition("\n## Decisions\n")
    if not heading:
        raise ValueError("Missing '## Decisions' section.")

    proposals = []
    for line in decisions.splitlines():
        if line.startswith("## "):
            break
        if not line.strip():
            continue
        decision = DECISION.fullmatch(line.strip())
        if not decision:
            raise ValueError(f"Invalid decision format: {line}")

        title = decision["title"].strip()
        owner = decision["owner"].strip()
        if not title or not owner:
            raise ValueError("Each decision needs a title and an owner.")

        dependencies = decision["dependencies"] or ""
        proposals.append(
            TaskProposal(
                task_id=decision["task_id"],
                title=title,
                owner=owner,
                due_date=date.fromisoformat(decision["due_date"]).isoformat(),
                goal_id=goals[0],
                depends_on=[item.strip() for item in dependencies.split(",") if item.strip()],
            )
        )

    validate_graph(proposals)
    return proposals


def validate_graph(proposals: list[TaskProposal]) -> None:
    if not proposals:
        raise ValueError("No decisions found.")

    graph = {task.task_id: task.depends_on for task in proposals}
    if len(graph) != len(proposals):
        raise ValueError("Task IDs must be unique.")
    missing = {dependency for task in proposals for dependency in task.depends_on} - graph.keys()
    if missing:
        raise ValueError(f"Unknown dependency IDs: {', '.join(sorted(missing))}")
    try:
        TopologicalSorter(graph).prepare()
    except CycleError as error:
        raise ValueError(f"Dependency cycle: {' -> '.join(error.args[1])}") from error


def proposals_from_response(response: dict, note: str, goal_id: str) -> list[TaskProposal]:
    schema_path = Path(__file__).with_name("task_schema.json")
    fields = json.loads(schema_path.read_text())["properties"]["tasks"]["items"]["required"]
    if not isinstance(response, dict) or not isinstance(response.get("tasks"), list):
        raise ValueError("Extractor must return a tasks array.")

    proposals = []
    for task in response["tasks"]:
        if not isinstance(task, dict) or set(task) != set(fields):
            raise ValueError("Extractor returned unexpected task fields.")
        for field in ("task_id", "title", "source_excerpt"):
            if not isinstance(task[field], str) or not task[field].strip():
                raise ValueError(f"Task {field} must be non-empty text.")
        for field in ("owner", "due_date"):
            if task[field] is not None and (
                not isinstance(task[field], str) or not task[field].strip()
            ):
                raise ValueError(f"Task {field} must be non-empty text or null.")
        for field in ("depends_on", "review_notes"):
            if not isinstance(task[field], list) or any(
                not isinstance(item, str) or not item.strip() for item in task[field]
            ):
                raise ValueError(f"Task {field} must be a list of non-empty strings.")

        task_id = task["task_id"]
        excerpt = task["source_excerpt"].strip()
        if excerpt not in note:
            raise ValueError(f"Task {task_id} has an excerpt absent from the meeting note.")
        due_date = task["due_date"]
        if due_date is not None:
            try:
                if date.fromisoformat(due_date).isoformat() != due_date:
                    raise ValueError
            except ValueError as error:
                raise ValueError(f"Task {task_id} has an invalid due date: {due_date}") from error

        review_notes = list(task["review_notes"])
        if task["owner"] is None:
            review_notes.append("Owner needs confirmation.")
        if due_date is None:
            review_notes.append("Due date needs confirmation.")
        proposals.append(
            SourcedTaskProposal(
                task_id=task_id,
                title=task["title"],
                owner=task["owner"],
                due_date=due_date,
                goal_id=goal_id,
                depends_on=task["depends_on"],
                source_excerpt=excerpt,
                review_notes=list(dict.fromkeys(review_notes)),
                needs_review=bool(review_notes),
            )
        )

    validate_graph(proposals)
    return proposals


def openai_key() -> str:
    key = os.environ.get("OPENAI_API_KEY", "").strip()
    if key:
        return key
    dotenv = Path(__file__).with_name(".env")
    if dotenv.is_file():
        for line in dotenv.read_text(encoding="utf-8-sig").splitlines():
            name, separator, value = line.strip().removeprefix("export ").partition("=")
            if separator and name.strip() == "OPENAI_API_KEY":
                return value.strip().strip("\"'")
    return ""


def extract_with_openai(note: str, goal_id: str, key: str) -> list[TaskProposal]:
    if not note.strip() or not goal_id.strip():
        raise ValueError("Enter a meeting note and goal ID.")
    project = Path(__file__).resolve().parent
    output = structured_response(
        note, key, "task_proposals",
        project.joinpath("extraction_prompt.txt").read_text(encoding="utf-8"),
        json.loads(project.joinpath("task_schema.json").read_text(encoding="utf-8")),
    )
    return proposals_from_response(output, note, goal_id)


def structured_response(text: str, key: str, name: str, instructions: str, schema: dict) -> dict:
    if not key:
        raise ValueError("Set OPENAI_API_KEY in the project .env file.")
    payload = {
        "model": os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
        "instructions": instructions,
        "input": text,
        "store": False,
        "max_output_tokens": 6000,
        "text": {"format": {
            "type": "json_schema", "name": name, "strict": True,
            "schema": schema,
        }},
    }
    request = Request(
        "https://api.openai.com/v1/responses",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=60) as response:
            result = json.load(response)
    except HTTPError as error:
        if error.code == 401:
            raise ValueError("OpenAI rejected the API key (HTTP 401). Check or replace OPENAI_API_KEY.") from None
        raise ValueError(f"OpenAI API request failed (HTTP {error.code}). Check your API access and billing.") from None
    except (URLError, TimeoutError):
        raise ValueError("Could not reach the OpenAI API. Check connectivity and retry.") from None

    if result.get("status") != "completed":
        raise ValueError("OpenAI did not complete extraction. Try a shorter note.")
    output = "".join(
        part["text"]
        for item in result.get("output", []) if item.get("type") == "message"
        for part in item.get("content", []) if part.get("type") == "output_text"
    )
    if not output:
        raise ValueError("OpenAI returned no structured result.")
    return json.loads(output)


def extract_free_form(note: str, goal_id: str) -> list[TaskProposal]:
    if not note.strip():
        raise ValueError("Meeting note is empty.")
    codex = which("codex")
    if codex is None and DESKTOP_CODEX.is_file() and os.access(DESKTOP_CODEX, os.X_OK):
        codex = str(DESKTOP_CODEX)
    if codex is None:
        raise ValueError("Codex CLI was not found on PATH or in the default macOS app location.")
    project = Path(__file__).resolve().parent
    prompt = project.joinpath("extraction_prompt.txt").read_text(encoding="utf-8")
    schema = project / "task_schema.json"
    with TemporaryDirectory(prefix="ops-brain-") as directory:
        try:
            result = subprocess.run(
                [
                    codex, "--ask-for-approval", "never", "exec",
                    "--sandbox", "read-only", "--ephemeral", "--ignore-user-config",
                    "--skip-git-repo-check", "--output-schema", str(schema), "-",
                ],
                cwd=directory,
                input=f"{prompt}\nMeeting note (JSON string):\n{json.dumps(note)}\n",
                capture_output=True,
                text=True,
                timeout=180,
            )
        except subprocess.TimeoutExpired as error:
            raise ValueError("Codex extraction timed out after three minutes.") from error

    if result.returncode:
        raise ValueError(
            f"Codex extraction failed. Check connectivity and run `{codex} login status`."
        )
    return proposals_from_response(json.loads(result.stdout), note, goal_id)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("meeting_note", type=Path, help="Path to the Markdown meeting note")
    parser.add_argument("--goal", help="Existing goal ID for free-form notes (uses the Codex CLI)")
    args = parser.parse_args()

    try:
        note = args.meeting_note.read_text(encoding="utf-8")
        key = openai_key() if args.goal else ""
        if key:
            proposals = extract_with_openai(note, args.goal, key)
        elif args.goal:
            proposals = extract_free_form(note, args.goal)
        else:
            proposals = extract_tasks(note)
    except (OSError, ValueError) as error:
        parser.exit(1, f"Error: {error}\n")

    print(json.dumps([asdict(task) for task in proposals], indent=2))


if __name__ == "__main__":
    main()
