import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { checkPush, checkCurrentIdentity, verifyRepositoryIdentity, scan, snapshot, UPSTREAM, PUBLIC_ROOT, git } from "./publication-boundary.mjs";

try {
  const mode = process.argv[2];
  if (mode === "pre-commit") {
    checkCurrentIdentity(process.cwd());
    scan(snapshot(process.cwd(), "index"));
    console.log("Mouthfolio staged content boundary passed.");
  } else if (mode === "pre-push") {
    // Installed policy lives beside the copied guard, outside candidate history.
    const policyPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "policy.json");
    const policy = JSON.parse(readFileSync(policyPath, "utf8"));
    if (!policy.repository || policy.rootCommit !== PUBLIC_ROOT) throw new Error("Invalid installed publication policy; reinstall the reviewed guard.");
    const count = checkPush(process.cwd(), process.argv[4], readFileSync(0, "utf8"), policy);
    await verifyRepositoryIdentity(policy);
    console.log(`Mouthfolio repository identity, authorship, ancestry and ${count} outgoing commits passed.`);
  } else if (mode === "history") {
    const head = git(process.cwd(), ["rev-parse", "HEAD"]).trim();
    const count = checkPush(process.cwd(), `https://github.com/${UPSTREAM}.git`, `HEAD ${head} refs/heads/review ${"0".repeat(40)}`);
    console.log(`Mouthfolio complete history check passed for ${count} commits.`);
  } else throw new Error("Use pre-commit, pre-push or history.");
} catch (error) {
  console.error(`Publication blocked: ${error.message}`);
  process.exitCode = 1;
}
