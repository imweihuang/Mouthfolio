import { readFileSync, writeFileSync, mkdirSync, chmodSync, lstatSync, existsSync, realpathSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { git, PUBLIC_ROOT, UPSTREAM, UPSTREAM_ID } from "./publication-boundary.mjs";

const root = git(process.cwd(), ["rev-parse", "--show-toplevel"]).trim();
const common = realpathSync(path.resolve(root, git(root, ["rev-parse", "--git-common-dir"]).trim()));
const hooks = path.join(common, "hooks");
let configured = "";
try { configured = execFileSync("git", ["config", "--get", "core.hooksPath"], { cwd: root, encoding: "utf8" }).trim(); } catch { /* Default hooks. */ }
if (configured && path.resolve(root, configured) !== hooks && (!existsSync(path.resolve(root, configured)) || realpathSync(path.resolve(root, configured)) !== hooks)) throw new Error("Existing external hooksPath: preserve/integrate it before installation.");
const marker = "# mouthfolio-publication-guard-v1";
const hookScript = (name, revision) => `#!/bin/sh\n${marker}\nset -eu\ncommon=$(git rev-parse --git-common-dir)\nexec node "$common/mouthfolio-guards/${revision}/publication-guard.mjs" ${name} "$@"\n`;
for (const name of ["pre-commit", "pre-push"]) {
  const file = path.join(hooks, name);
  const info = lstatSync(file, { throwIfNoEntry: false });
  const existing = info?.isFile() ? readFileSync(file, "utf8") : "";
  const revision = /\/mouthfolio-guards\/([0-9a-f]{64})\/publication-guard\.mjs/.exec(existing)?.[1];
  if (info && (!info.isFile() || !revision || existing !== hookScript(name, revision))) throw new Error(`Existing ${name} hook: preserve/integrate it before installation.`);
}
const args = process.argv.slice(2);
const options = new Map();
for (let i = 0; i < args.length; i += 2) {
  if (!["--destination", "--repository-id"].includes(args[i]) || !args[i + 1] || options.has(args[i])) throw new Error("Use --destination owner/repository and --repository-id NUMBER for a reviewed fork.");
  options.set(args[i], args[i + 1]);
}
const repository = (options.get("--destination") ?? UPSTREAM).toLowerCase();
if (!/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/.test(repository) || repository === "imweihuang/asof") throw new Error("Select the reviewed client repository or contributor fork.");
const repositoryId = Number(options.get("--repository-id") ?? (repository === UPSTREAM ? UPSTREAM_ID : NaN));
if (!Number.isSafeInteger(repositoryId) || repositoryId <= 0 || (repository === UPSTREAM && repositoryId !== UPSTREAM_ID)) throw new Error("Pin the reviewed repository's numeric GitHub ID; a name alone is insufficient.");
const sourceDir = path.dirname(fileURLToPath(import.meta.url));
const files = ["publication-boundary.mjs", "publication-guard.mjs"];
const digest = createHash("sha256").update(files.map(f => readFileSync(path.join(sourceDir, f))).join("\n")).update(`${repository}:${repositoryId}`).digest("hex");
const release = path.join(common, "mouthfolio-guards", digest);
mkdirSync(release, { recursive: true });
mkdirSync(hooks, { recursive: true });
for (const file of files) writeFileSync(path.join(release, file), readFileSync(path.join(sourceDir, file)));
writeFileSync(path.join(release, "policy.json"), JSON.stringify({ repository, repositoryId, rootCommit: PUBLIC_ROOT }, null, 2) + "\n");
for (const name of ["pre-commit", "pre-push"]) {
  writeFileSync(path.join(hooks, name), hookScript(name, digest), { mode: 0o755 });
  chmodSync(path.join(hooks, name), 0o755);
}
execFileSync("git", ["config", "--local", "core.hooksPath", hooks], { cwd: root });
console.log(`Installed staged and outgoing-history guards for ${repository}; shared by all worktrees. Reinstall after reviewing guard updates.`);
