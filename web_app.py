"""Serve the Ops Brain demo on localhost."""

import argparse
from dataclasses import asdict
from html import escape
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import re

from ops_brain import extract_with_openai, openai_key
from project_demos import draft_posts, speak

PROJECT = Path(__file__).resolve().parent
MAX_BODY_BYTES = 32_000
ASSETS = {
    "/project_demos.js": ("application/javascript", "project_demos.js"),
    "/yap-transcript": ("application/json", "examples/yap_transcript.json"),
    "/yap-video": ("video/mp4", "examples/yap_sample.mp4"),
}


def plan_sections(body):
    sections = []
    for block in body.strip().split("\n\n"):
        if block.startswith("## "):
            sections.append(f"<h3>{escape(block[3:])}</h3>")
        elif block.startswith("```text\n") and block.endswith("\n```"):
            diagram = block.removeprefix("```text\n").removesuffix("\n```")
            sections.append(f"<pre><code>{escape(diagram)}</code></pre>")
        else:
            paragraph = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", escape(block))
            sections.append(f"<p>{paragraph.replace(chr(10), '<br>')}</p>")
    return "".join(sections)


def demo_page():
    tabs = []
    panels = []
    for number in range(2, 8):
        path = PROJECT / "submissions" / f"prd_{number}.md"
        title, body = path.read_text(encoding="utf-8").split("\n", 1)
        title = escape(title.removeprefix("# ").strip())
        tabs.append(
            f'<button type="button" role="tab" id="tab-{number}" '
            f'aria-controls="panel-{number}" aria-selected="false" tabindex="-1">'
            f'{number} · {title}</button>'
        )
        panels.append(
            f'<section role="tabpanel" id="panel-{number}" aria-labelledby="tab-{number}" '
            f'hidden><h2>{title}</h2><div id="demo-{number}"></div>'
            f'<details class="plan"><summary>Build plan</summary>'
            f'<article>{plan_sections(body)}</article></details></section>'
        )
    _, _, ops_plan = (PROJECT / "build_plan.md").read_text(encoding="utf-8").partition("\n")
    page = (PROJECT / "demo.html").read_text(encoding="utf-8")
    return page.replace("<!-- PROJECT_TABS -->", "".join(tabs)).replace(
        "<!-- PROJECT_PANELS -->", "".join(panels)
    ).replace(
        "<!-- OPS_BUILD_PLAN -->", plan_sections(ops_plan)
    ).replace("<!-- DEMO_TEMPLATES -->", (PROJECT / "project_demos.html").read_text(encoding="utf-8")).encode()


class DemoHandler(BaseHTTPRequestHandler):
    def send_payload(self, status, content_type, body):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def send_json(self, status, payload):
        self.send_payload(status, "application/json", json.dumps(payload).encode())

    def do_GET(self):
        if self.path == "/":
            self.send_payload(200, "text/html; charset=utf-8", demo_page())
        elif self.path == "/sample":
            note = (PROJECT / "examples" / "launch_discussion.md").read_text(encoding="utf-8")
            self.send_json(200, {"note": note, "goal": "launch_storefront"})
        elif self.path in ASSETS:
            content_type, filename = ASSETS[self.path]
            self.send_payload(200, content_type, (PROJECT / filename).read_bytes())
        else:
            self.send_json(404, {"error": "Page not found."})

    def do_POST(self):
        if self.path not in {"/extract", "/drafts", "/voice"}:
            self.send_json(404, {"error": "Page not found."})
            return
        host = self.headers.get("Host")
        origin = self.headers.get("Origin")
        allowed_hosts = {f"127.0.0.1:{self.server.server_port}", f"localhost:{self.server.server_port}"}
        if host not in allowed_hosts or (origin and origin != f"http://{host}"):
            self.send_json(403, {"error": "Open the demo from localhost."})
            return
        if self.headers.get_content_type() != "application/json":
            self.send_json(415, {"error": "Send JSON."})
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= MAX_BODY_BYTES:
                self.send_json(413, {"error": "Use a note smaller than 32 KB."})
                return
            data = json.loads(self.rfile.read(size))
            if not isinstance(data, dict):
                raise ValueError("Send a JSON object.")
            if self.path in {"/drafts", "/voice"}:
                value = data.get("text")
                if not isinstance(value, str):
                    raise ValueError("Enter text to continue.")
                if self.path == "/drafts":
                    self.send_json(200, {"drafts": draft_posts(value)})
                else:
                    self.send_payload(200, "audio/wav", speak(value))
                return
            note, goal = data.get("note"), data.get("goal")
            if not isinstance(note, str) or not isinstance(goal, str):
                raise ValueError("Enter a meeting note and goal ID.")
            tasks = extract_with_openai(note, goal.strip(), openai_key())
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_json(400, {"error": "Invalid JSON."})
            return
        except ValueError as error:
            self.send_json(400, {"error": str(error)})
            return
        self.send_json(200, {"tasks": [asdict(task) for task in tasks]})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    with ThreadingHTTPServer(("127.0.0.1", args.port), DemoHandler) as server:
        print(f"Open http://127.0.0.1:{server.server_port}", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
