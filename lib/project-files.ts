import { readFileSync } from "node:fs";
import { join } from "node:path";

export function projectFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

export function projectAsset(path: string) {
  return readFileSync(join(process.cwd(), path));
}
