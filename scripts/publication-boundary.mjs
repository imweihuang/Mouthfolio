// This is a mistake-prevention check, not a substitute for source/rights review.
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, lstatSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

export const PUBLIC_ROOT = "1c904fb09824205ee5378089e946061857b69e89";
export const UPSTREAM = "imweihuang/mouthfolio";
export const UPSTREAM_ID = 1437778933;
const LIMIT = 2 * 1024 * 1024;
// Reviewed browser smoke deliberately requests these routes and requires 404.
// Only these exact reviewed versions may contain route strings; other rules apply.
// Retain published versions so complete-history scans continue to verify ancestors.
const ROUTE_PROBE_SHA256 = new Set([
  "c0d8fe6dd3b1447247a42da66e887372229f4db257ad210e0e1f02f8f4da3b42",
  "c5b6da5315a5b2534448688651f814b0d875f18eb8d948cf19c7f448cb269ad5",
  "1591649404ff44f7e97787dd1964591107d807a54300c4afa05cfdcb1dd6f020",
]);
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const forbidden = /(^|\/)(?:\.env(?:\..*)?|\.netrc|\.pypirc|\.git-credentials|\.delegate|\.claude|\.codex|\.aws|id_rsa(?:\..*)?|id_ed25519(?:\..*)?|id_ecdsa(?:\..*)?|secrets?(?:\.[^/]*)?|credentials(?:\.[^/]*)?|service[-_]account(?:\.[^/]*)?|\.gitmodules|backend|deploy|private|operator|credentials|archives|backups|raw-data|output)(?:\/|$)|\.(?:pem|key|p12|pfx|sqlite3?|db|dump|zip|tar|gz|bundle)$/i;
const privateDocs = /(^|\/)(?:DECISIONS(?:[^/]*)|REPO_STATE|OWNER_OVERVIEW|JOURNAL|DEPLOYMENT|BACKUP_RUNBOOK)\.(?:md|json|html)$/i;
const textRules = [
  ["local home path", /\/(?:Users|home)\/[A-Za-z0-9_.-]+\//],
  ["private backend import", /(?:from\s+|import\s+|["'])asof_backend(?:\b|\/)/],
  ["private route", /\/api\/(?:local-company|admin|operator)(?:[\/"'\s?]|$)/],
  ["private runtime host", /\basof-vm-\d+\b/],
  ["browser credential variable", /\bNEXT_PUBLIC_[A-Z0-9_]*(?:TOKEN|SECRET|KEY)\b/],
  ["private key", /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/],
  ["provider token", /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|AKIA[A-Z0-9]{16}|sk-(?:proj-|ant-)?[A-Za-z0-9_-]{24,})\b/],
  ["opaque LFS payload", /^version https:\/\/git-lfs\.github\.com\/spec\/v1/m],
];

export function git(root, args, encoding = "utf8") {
  try {
    return execFileSync("git", args, { cwd: root, encoding, maxBuffer: 32 * LIMIT,
      env: { ...process.env, GIT_NO_REPLACE_OBJECTS: "1" }, stdio: ["ignore", "pipe", "pipe"] });
  } catch {
    throw new Error(`Git inspection failed (${args[0]}); publication check is incomplete.`);
  }
}
function safePath(file) {
  return typeof file === "string" && file && !path.posix.isAbsolute(file) && !file.split("/").some(p => !p || p === "." || p === ".." || p === ".git") && !/[\\\x00-\x1f\x7f]/.test(file);
}
function pathIssue(file) {
  if (!safePath(file)) return "unsafe path";
  if (forbidden.test(file) || privateDocs.test(file)) return "private or opaque source path";
  return null;
}
export function inspectText(text, file) {
  // Return rule labels only. Never print the matching content or secret.
  const errors = textRules.filter(([,pattern]) => pattern.test(text)).map(([label]) => `${file}: ${label}`);
  // Project npm settings are legitimate source; authentication settings are not.
  if (/(^|\/)\.npmrc$/i.test(file) && /^\s*(?:\/\/[^\s=]*:)?(?:_authToken|_auth|_password|password)\s*=/im.test(text)) errors.push(`${file}: npm credential setting`);
  for (const [,specifier] of text.matchAll(/(?:from\s*|import\s*(?:\(\s*)?|require\s*\(\s*)["'](\.[^"']+)["']/g)) {
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier));
    if (target === ".." || target.startsWith("../")) errors.push(`${file}: import escapes repository`);
  }
  return errors;
}

const noreply = /^(?:[1-9][0-9]*\+)?[a-z0-9][a-z0-9-]*(?:\[bot\])?@users\.noreply\.github\.com$/i;
const emailPattern = /[a-z0-9.!#$%&'*+/=?^_`{|}~\[\]-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
export function checkIdentity(name, email, label = "Git identity") {
  const github = name === "GitHub" && email === "noreply@github.com";
  if (!name.trim() || /[\x00-\x1f\x7f<>@]/.test(name) || inspectText(name, label).length || (!github && !noreply.test(email))) {
    throw new Error(`${label}: use an approved public name and GitHub noreply address; contact values are not printed.`);
  }
}
export function checkMessage(text, label = "commit message") {
  const errors = inspectText(text, label);
  for (const [email] of text.matchAll(emailPattern)) {
    if (!noreply.test(email) && email !== "noreply@github.com") errors.push(`${label}: non-noreply contact address`);
  }
  if (errors.length) throw new Error([...new Set(errors)].join("\n"));
}
export function checkCurrentIdentity(root) {
  for (const role of ["AUTHOR", "COMMITTER"]) {
    const value = git(root, ["var", `GIT_${role}_IDENT`]).trim();
    const match = /^(.+) <([^<>\s]+)> [0-9]+ [+-][0-9]{4}$/.exec(value);
    if (!match) throw new Error(`Cannot verify ${role.toLowerCase()} identity.`);
    checkIdentity(match[1], match[2], `${role.toLowerCase()} identity`);
  }
}
export function checkRepositoryIdentity(observed, policy) {
  if (!Number.isSafeInteger(policy.repositoryId) || policy.repositoryId <= 0 ||
      observed?.id !== policy.repositoryId || observed?.full_name?.toLowerCase() !== policy.repository.toLowerCase()) {
    throw new Error("Remote repository identity changed; review the destination and reinstall its guard.");
  }
}
export async function verifyRepositoryIdentity(policy) {
  // Use the normal GitHub CLI session for private repositories. Public clones can
  // use the unauthenticated API; neither path reads or prints credential files.
  const result = spawnSync("gh", ["api", "--hostname", "github.com", `repos/${policy.repository}`, "--jq", "{id,full_name}"],
    { encoding: "utf8", timeout: 10000, maxBuffer: 65536 });
  let observed;
  if (result.status === 0) {
    try { observed = JSON.parse(result.stdout); } catch { /* Fail closed below. */ }
  } else {
    try {
      const response = await fetch(`https://api.github.com/repos/${policy.repository}`, {
        redirect: "error", credentials: "omit", signal: AbortSignal.timeout(10000),
        headers: { Accept: "application/vnd.github+json" },
      });
      if (response.ok) observed = await response.json();
    } catch { /* No cached identity acceptance. */ }
  }
  if (!observed) throw new Error("Cannot verify the remote repository identity. Private pushes need an authenticated GitHub CLI session.");
  checkRepositoryIdentity(observed, policy);
}

export function snapshot(root, kind, revision) {
  root = git(root, ["rev-parse", "--show-toplevel"]).trim();
  const entries = new Map();
  if (kind === "worktree") {
    for (const file of git(root, ["ls-files", "--cached", "--others", "--exclude-standard", "-z"]).split("\0").filter(Boolean)) {
      // Do not follow even an ancestor symlink into private neighboring files.
      if (pathIssue(file)) { entries.set(file, { mode: "forbidden" }); continue; }
      let cursor = root, info;
      for (const part of file.split("/")) {
        cursor = path.join(cursor, part);
        try { info = lstatSync(cursor); } catch { info = null; break; }
        if (info.isSymbolicLink()) break;
      }
      if (!info) continue; // An unstaged deletion has no worktree bytes.
      entries.set(file, { mode: info.isFile() ? "100644" : "unsupported", size: info.size });
    }
  } else if (kind === "index") {
    for (const row of git(root, ["ls-files", "--stage", "-z"]).split("\0").filter(Boolean)) {
      const tab = row.indexOf("\t"), [mode, oid, stage] = row.slice(0, tab).split(" ");
      if (stage !== "0") throw new Error("Unmerged index; resolve conflicts before committing.");
      entries.set(row.slice(tab + 1), { mode, oid });
    }
  } else if (kind === "tree") {
    if (!/^[0-9a-f]{40,64}$/.test(revision)) throw new Error("A full immutable commit is required.");
    for (const row of git(root, ["ls-tree", "-rz", revision]).split("\0").filter(Boolean)) {
      const tab = row.indexOf("\t"), [mode, , oid] = row.slice(0, tab).split(" ");
      entries.set(row.slice(tab + 1), { mode, oid });
    }
  } else throw new Error("Unknown snapshot mode.");
  const read = file => {
    const entry = entries.get(file);
    if (pathIssue(file) || !entry || !["100644", "100755"].includes(entry.mode)) throw new Error(`${file}: missing or unsafe file`);
    const size = entry.size ?? Number(git(root, ["cat-file", "-s", entry.oid]).trim());
    if (!Number.isFinite(size) || size > LIMIT) throw new Error(`${file}: file exceeds review size limit`);
    return kind === "worktree" ? readFileSync(path.join(root, file)) : git(root, ["cat-file", "blob", entry.oid], null);
  };
  return { root, entries, read };
}

export function scan(source, { requireMetadata = true } = {}) {
  const errors = [];
  const json = file => {
    try { return JSON.parse(source.read(file).toString("utf8")); }
    catch { errors.push(`${file}: missing or invalid boundary metadata`); return null; }
  };
  const manifestPath = "docs/import-manifest.json";
  const manifest = source.entries.has(manifestPath) || requireMetadata ? json(manifestPath) : null;
  const imports = Array.isArray(manifest?.imports) ? manifest.imports : [];
  if (manifest && !Array.isArray(manifest.imports)) errors.push(`${manifestPath}: invalid import list`);
  const assets = new Map();
  for (const entry of imports) {
    if (!safePath(entry.destination) || pathIssue(entry.destination) || !/^[0-9a-f]{40}$/.test(entry.source_revision) || !entry.license) {
      errors.push(`${manifestPath}: import requires a safe destination, revision and license`); continue;
    }
    if (assets.has(entry.destination)) errors.push(`${manifestPath}: duplicate import destination`);
    assets.set(entry.destination, entry);
    try {
      const bytes = source.read(entry.destination);
      if (entry.mode === "unchanged" && sha256(bytes) !== entry.source_sha256) errors.push(`${entry.destination}: imported bytes changed`);
    } catch (error) { errors.push(error.message); }
  }
  for (const [file, entry] of source.entries) {
    const issue = pathIssue(file);
    if (issue) { errors.push(`${file}: ${issue}`); continue; } // Never read sensitive paths.
    if (!["100644", "100755"].includes(entry.mode)) { errors.push(`${file}: symlink, submodule or non-regular file`); continue; }
    let bytes;
    try { bytes = source.read(file); } catch (error) { errors.push(error.message); continue; }
    const asset = assets.get(file);
    if (file.startsWith("public/") && (!asset || bytes.length > 1024 * 1024)) errors.push(`${file}: unreviewed or oversized public asset`);
    let text;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (text.includes("\0")) text = undefined;
    } catch { /* Binary bytes must match the reviewed manifest exactly. */ }
    if (text === undefined) {
      if (!file.startsWith("public/") || !asset || asset.mode !== "unchanged" || sha256(bytes) !== asset.source_sha256) errors.push(`${file}: unreviewed binary`);
      continue;
    }
    const contentErrors = inspectText(text, file);
    errors.push(...contentErrors.filter(error => !(file === "scripts/browser-smoke.mjs" && ROUTE_PROBE_SHA256.has(sha256(bytes)) && error === `${file}: private route`)));
    if (file.startsWith("fixtures/") && file.endsWith(".json")) {
      try { if (JSON.parse(text).data_mode !== "synthetic") errors.push(`${file}: non-synthetic fixture`); }
      catch { errors.push(`${file}: invalid fixture JSON`); }
    }
  }
  const lockPath = "contracts/contract.lock.json";
  const lock = source.entries.has(lockPath) || requireMetadata ? json(lockPath) : null;
  if (lock) {
    if (!/^[0-9a-f]{40}$/.test(lock.source_revision) || !lock.files || typeof lock.files !== "object") errors.push(`${lockPath}: unpinned consumer contract`);
    for (const [file, expected] of Object.entries(lock.files ?? {})) {
      try { if (sha256(source.read(file)) !== expected) errors.push(`${file}: contract drift`); }
      catch (error) { errors.push(error.message); }
    }
  }
  if (errors.length) throw new Error([...new Set(errors)].join("\n"));
}

export function repositoryFromUrl(value) {
  const scp = /^git@github\.com:([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)(?:\.git)?$/.exec(value);
  if (scp) return scp[1].toLowerCase();
  try {
    const url = new URL(value);
    if (url.hostname !== "github.com" || url.port || url.password || url.search || url.hash ||
      !["https:", "ssh:"].includes(url.protocol) ||
      (url.protocol === "https:" && url.username) || (url.protocol === "ssh:" && url.username !== "git")) return null;
    return /^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/.test(url.pathname) ? url.pathname.slice(1).replace(/\.git$/, "").toLowerCase() : null;
  } catch { return null; }
}

export function checkPush(root, destination, input, { repository = UPSTREAM, rootCommit = PUBLIC_ROOT } = {}) {
  if (repositoryFromUrl(destination) !== repository.toLowerCase()) throw new Error("Push destination differs from the installed Mouthfolio repository policy.");
  if (git(root, ["rev-parse", "--is-shallow-repository"]).trim() !== "false") throw new Error("Fetch full history before pushing; ancestry cannot be verified in a shallow clone.");
  if (git(root, ["for-each-ref", "--format=%(refname)", "refs/replace"]).trim()) throw new Error("Replacement refs prevent a trustworthy history scan.");
  const common = path.resolve(root, git(root, ["rev-parse", "--git-common-dir"]).trim());
  if (existsSync(path.join(common, "info/grafts"))) throw new Error("Grafts prevent a trustworthy history scan.");
  const checked = new Set();
  for (const line of input.trim().split("\n").filter(Boolean)) {
    const fields = line.trim().split(/\s+/);
    if (fields.length !== 4 || !/^[0-9a-f]{40,64}$/.test(fields[1]) || !/^[0-9a-f]{40,64}$/.test(fields[3])) throw new Error("Malformed push update.");
    const [, local, , remote] = fields;
    if (/^0+$/.test(local)) continue;
    const tip = git(root, ["rev-parse", `${local}^{commit}`]).trim();
    const roots = git(root, ["rev-list", "--max-parents=0", tip]).trim().split("\n");
    if (roots.length !== 1 || roots[0] !== rootCommit) throw new Error("Foreign repository history: Mouthfolio must retain its independent root.");
    let object = local;
    while (object !== tip) {
      const tag = git(root, ["cat-file", "tag", object]);
      checkMessage(tag, "annotated tag");
      const tagger = /^tagger (.+) <([^<>\s]+)> [0-9]+ [+-][0-9]{4}$/m.exec(tag);
      if (!tagger) throw new Error("Annotated tag is missing a verifiable tagger identity.");
      checkIdentity(tagger[1], tagger[2], "tagger identity");
      const next = /^object ([0-9a-f]{40,64})$/m.exec(tag)?.[1];
      if (!next || next === object) throw new Error("Invalid annotated tag chain.");
      object = next;
    }
    let excluded = [];
    if (!/^0+$/.test(remote)) {
      // Missing remote objects cause a complete scan, never a skipped scan.
      try { git(root, ["cat-file", "-e", `${remote}^{commit}`]); excluded = ["--not", remote]; } catch { /* Full scan. */ }
    }
    for (const commit of git(root, ["rev-list", tip, ...excluded]).trim().split("\n").filter(Boolean)) {
      if (checked.has(commit)) continue;
      const identity = git(root, ["show", "-s", "--format=%an%x00%ae%x00%cn%x00%ce", commit]).trimEnd().split("\0");
      if (identity.length !== 4) throw new Error("Commit identity inspection is incomplete.");
      checkIdentity(identity[0], identity[1], "author identity");
      checkIdentity(identity[2], identity[3], "committer identity");
      checkMessage(git(root, ["show", "-s", "--format=%B", commit]), `commit ${commit.slice(0, 12)}`);
      try { scan(snapshot(root, "tree", commit), { requireMetadata: false }); }
      catch (error) { throw new Error(`Outgoing commit ${commit.slice(0, 12)}:\n${error.message}`); }
      checked.add(commit);
    }
  }
  return checked.size;
}
