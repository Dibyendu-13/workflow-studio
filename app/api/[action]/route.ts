import { projectAsset, projectFile } from "../../../lib/project-files";
import { draftPosts, extract, narrate, WorkflowError } from "../../../lib/workflows";

type Context = { params: Promise<{ action: string }> };
const maxBody = 32_000;
const noStore = { "Cache-Control": "no-store" };

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: noStore });
}

export async function GET(_: Request, { params }: Context) {
  const { action } = await params;
  if (action === "sample") {
    return json({ goal: "launch_storefront", note: projectFile("examples/launch_discussion.md") });
  }
  if (action === "yap-transcript") return json(JSON.parse(projectFile("examples/yap_transcript.json")));
  if (action === "yap-video") {
    return new Response(new Uint8Array(projectAsset("examples/yap_sample.mp4")), {
      headers: { "Content-Type": "video/mp4", ...noStore },
    });
  }
  return json({ error: "Endpoint not found." }, 404);
}

function field(data: Record<string, unknown>, name: string, max: number) {
  const value = data[name];
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new WorkflowError(`Enter ${name} of up to ${max.toLocaleString()} characters.`);
  }
  return value.trim();
}

async function readBody(request: Request) {
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") {
    throw new WorkflowError("Send JSON.", 415);
  }
  const reader = request.body?.getReader();
  if (!reader) throw new WorkflowError("Send a request body.");
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  while (true) {
    const item = await reader.read();
    if (item.done) break;
    size += item.value.byteLength;
    if (size > maxBody) {
      await reader.cancel();
      throw new WorkflowError("Keep the request under 32 KB.", 413);
    }
    text += decoder.decode(item.value, { stream: true });
  }
  const data: unknown = JSON.parse(text + decoder.decode());
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new WorkflowError("Send a JSON object.");
  }
  return data as Record<string, unknown>;
}

export async function POST(request: Request, { params }: Context) {
  const { action } = await params;
  if (!["extract", "drafts", "voice"].includes(action)) return json({ error: "Endpoint not found." }, 404);
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && origin !== new URL(request.url).origin &&
      !(host && [`http://${host}`, `https://${host}`].includes(origin))) {
    return json({ error: "Open the demo from the same origin." }, 403);
  }
  try {
    const data = await readBody(request);
    if (action === "extract") {
      return json({ tasks: await extract(field(data, "note", 20_000), field(data, "goal", 120)) });
    }
    if (action === "drafts") return json({ drafts: await draftPosts(field(data, "text", 12_000)) });
    const audio = await narrate(field(data, "text", 600));
    return new Response(audio.body, { headers: { "Content-Type": "audio/mpeg", ...noStore } });
  } catch (error) {
    if (error instanceof WorkflowError) return json({ error: error.message }, error.status);
    if (error instanceof SyntaxError) return json({ error: "Invalid JSON." }, 400);
    return json({ error: "The workflow could not finish. Try again." }, 500);
  }
}
