import { scan, snapshot } from "./publication-boundary.mjs";

try {
  const source = snapshot(process.cwd(), "worktree");
  scan(source);
  console.log(`Boundary checks passed for ${source.entries.size} candidate files.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
