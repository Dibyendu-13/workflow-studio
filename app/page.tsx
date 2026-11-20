import { projectFile } from "../lib/project-files";
import Studio, { type Project } from "./studio";

const summaries = [
  "Extract task proposals from meeting notes and flag decisions that need human review.",
  "Approve a revision and schedule it to a local test destination.",
  "Turn a transcript into four drafts for two channels and two voices.",
  "Render a five-slide carousel and download each slide as a PNG.",
  "Rank and play clips from a 20-minute sample recording.",
  "Turn a script into an animated, narrated preview.",
  "Render a recurring illustrated character across scenes and hear its dialogue.",
];

export default function Page() {
  const projects: Project[] = summaries.map((description, index) => {
    const number = index + 1;
    const source = projectFile(index === 0 ? "build_plan.md" : `submissions/prd_${number}.md`);
    const [heading, ...lines] = source.split("\n");
    return {
      number, description, title: index === 0 ? "Ops Brain" : heading.replace(/^# /, ""),
      plan: lines.join("\n").trim(),
    };
  });
  return <Studio projects={projects} templates={projectFile("project_demos.html")} />;
}
