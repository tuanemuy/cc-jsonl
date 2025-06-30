import * as path from "node:path";
import { fileURLToPath } from "node:url";

export function getProjectRoot(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.resolve(__dirname, "../..");
}
