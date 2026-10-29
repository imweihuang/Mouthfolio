import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, realpathSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scan, snapshot, checkPush, checkIdentity, checkMessage, checkRepositoryIdentity, repositoryFromUrl } from "../scripts/publication-boundary.mjs";

const scripts = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../scripts");
const env = { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_AUTHOR_NAME: "Fixture", GIT_AUTHOR_EMAIL: "1+fixture@users.noreply.github.com", GIT_COMMITTER_NAME: "Fixture", GIT_COMMITTER_EMAIL: "1+fixture@users.noreply.github.com" };
const run = (root, ...args) => execFileSync("git", args, { cwd: root, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
function put(root, file, content) { mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); writeFileSync(path.join(root, file), content); }
function fixture(t) {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), "mouthfolio-boundary-")));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  run(root, "init", "--initial-branch=main");
  put(root, "README.md", "Synthetic client fixture.\n");
  put(root, "docs/import-manifest.json", JSON.stringify({ imports: [] }));
  put(root, "contracts/contract.lock.json", JSON.stringify({ source_revision: "a".repeat(40), files: {} }));
  run(root, "add", "."); run(root, "commit", "-m", "Synthetic root");
  return root;
}
const zero = "0".repeat(40);
const destination = "https://github.com/fixture/client.git";
const policy = root => ({ repository: "fixture/client", rootCommit: run(root, "rev-list", "--max-parents=0", "HEAD") });
const update = (root, remote = zero) => `refs/heads/main ${run(root, "rev-parse", "HEAD")} refs/heads/main ${remote}`;
const homePath = ["", "Users", "fictional", "notes"].join("/");

test("docs, scripts, workflows and commit metadata receive content checks", t => {
  for (const file of ["docs/guide.md", "scripts/helper.sh", ".github/workflows/example.yml", "notes.txt"]) {
    const root = fixture(t); put(root, file, homePath);
    assert.throws(() => scan(snapshot(root, "worktree")), /local home path/);
  }
});
test("commit checks read staged bytes, not a cleaned working copy", t => {
  const root = fixture(t); put(root, "docs/guide.md", homePath); run(root, "add", "docs/guide.md");
  put(root, "docs/guide.md", "Safe replacement\n");
  assert.doesNotThrow(() => scan(snapshot(root, "worktree")));
  assert.throws(() => scan(snapshot(root, "index")), /local home path/);
});
test("private paths are rejected before any content read", () => {
  for (const file of [".env.local", ".netrc", "tools/.netrc", ".pypirc", ".git-credentials", "backend/secret.txt", "docs/REPO_STATE.md", "dump.db"]) {
    let reads = 0;
    assert.throws(() => scan({ entries: new Map([[file, { mode: "100644" }]]), read() { reads++; throw Error("must not read"); } }, { requireMetadata: false }), /private or opaque source path/);
    assert.equal(reads, 0);
  }
});
test("project npm settings remain usable but credential settings are rejected without echoing values", t => {
  const root = fixture(t), value = "synthetic-credential-value";
  for (const file of [".npmrc", "tools/.npmrc"]) {
    put(root, file, "engine-strict=true\nignore-scripts=true\n");
    assert.doesNotThrow(() => scan(snapshot(root, "worktree")));
    for (const setting of ["_authToken", "_auth", "_password", "password", "//registry.example.invalid/:_authToken"]) {
      put(root, file, `${setting}=${value}\n`);
      assert.throws(() => scan(snapshot(root, "worktree")), error => error.message.includes("npm credential setting") && !error.message.includes(value));
    }
    rmSync(path.join(root, file));
  }
});
test("untracked ignored environment files are not read by the candidate scan", t => {
  const root = fixture(t); put(root, ".gitignore", ".env*\n"); put(root, ".env.local", "Synthetic secret-bearing filename, no real credential.");
  assert.doesNotThrow(() => scan(snapshot(root, "worktree")));
  run(root, "add", "-f", ".env.local");
  assert.throws(() => scan(snapshot(root, "index")), /private or opaque source path/);
});
test("file and ancestor symlinks cannot read outside the checkout", t => {
  const root = fixture(t); symlinkSync("/unavailable-private-target", path.join(root, "link.md"));
  assert.throws(() => scan(snapshot(root, "worktree")), /symlink/);
  run(root, "add", "link.md");
  assert.throws(() => scan(snapshot(root, "index")), /symlink/);
  rmSync(path.join(root, "link.md")); run(root, "reset", "HEAD", "link.md");
  put(root, "docs/guide.md", "Synthetic\n"); run(root, "add", "docs/guide.md");
  rmSync(path.join(root, "docs"), { recursive: true }); symlinkSync("/unavailable-private-target", path.join(root, "docs"));
  assert.throws(() => scan(snapshot(root, "worktree")), /symlink|unsafe file|boundary metadata/);
});
test("binary files, submodules and non-synthetic fixtures fail", t => {
  const root = fixture(t); put(root, "image.bin", Buffer.from([0, 255, 2]));
  assert.throws(() => scan(snapshot(root, "worktree")), /unreviewed binary/);
  rmSync(path.join(root, "image.bin")); put(root, "fixtures/example.json", '{"data_mode":"authorized"}');
  assert.throws(() => scan(snapshot(root, "worktree")), /non-synthetic fixture/);
  rmSync(path.join(root, "fixtures"), { recursive: true });
  run(root, "update-index", "--add", "--cacheinfo", `160000,${run(root, "rev-parse", "HEAD")},dependency`);
  assert.throws(() => scan(snapshot(root, "index")), /submodule/);
});
test("an outgoing file remains blocked after a later deletion", t => {
  const root = fixture(t), p = policy(root), base = run(root, "rev-parse", "HEAD");
  put(root, "notes.md", homePath); run(root, "add", "notes.md"); run(root, "commit", "-m", "Synthetic accident");
  run(root, "rm", "notes.md"); run(root, "commit", "-m", "Remove fixture");
  assert.doesNotThrow(() => scan(snapshot(root, "worktree")));
  assert.throws(() => checkPush(root, destination, update(root, base), p), /Outgoing commit.*\nnotes.md: local home path/);
});
test("safe outgoing history passes; foreign root and wrong destination fail", t => {
  const root = fixture(t), p = policy(root);
  assert.equal(checkPush(root, destination, update(root), p), 1);
  assert.throws(() => checkPush(root, "https://github.com/fixture/other.git", update(root), p), /destination/);
  assert.throws(() => checkPush(root, destination, update(root), { ...p, rootCommit: "b".repeat(40) }), /Foreign repository/);
  assert.throws(() => checkPush(root, destination, "malformed", p), /Malformed/);
});
test("missing remote objects fall back to full history inspection", t => {
  const root = fixture(t);
  assert.equal(checkPush(root, destination, update(root, "b".repeat(40)), policy(root)), 1);
});
test("commit messages and annotated tags are scanned without echoing content", t => {
  const root = fixture(t), p = policy(root);
  run(root, "commit", "--allow-empty", "-m", homePath);
  assert.throws(() => checkPush(root, destination, update(root), p), error => error.message.includes("local home path") && !error.message.includes(homePath));
  run(root, "reset", "--hard", "HEAD~1"); run(root, "tag", "-a", "demo", "-m", homePath);
  assert.throws(() => checkPush(root, destination, `refs/tags/demo ${run(root, "rev-parse", "demo")} refs/tags/demo ${zero}`, p), /annotated tag: local home path/);
  run(root, "tag", "-a", "outer", "demo", "-m", "Safe outer annotation");
  assert.throws(() => checkPush(root, destination, `refs/tags/outer ${run(root, "rev-parse", "outer")} refs/tags/outer ${zero}`, p), /annotated tag: local home path/);
});
test("URL parsing binds the exact GitHub repository", () => {
  for (const value of ["https://github.com/Fixture/Client.git", "git@github.com:Fixture/Client.git", "ssh://git@github.com/Fixture/Client.git"]) assert.equal(repositoryFromUrl(value), "fixture/client");
  for (const value of ["https://github.com.evil.invalid/fixture/client", "https://github.com/fixture/client?x=1", "file:///tmp/client", "https://user@github.com/fixture/client"]) assert.equal(repositoryFromUrl(value), null);
});
test("installer preserves existing hooks and guards all linked worktrees", t => {
  const root = fixture(t), install = (...args) => spawnSync(process.execPath, [path.join(scripts, "install-guards.mjs"), ...args], { cwd: root, env, encoding: "utf8" });
  put(root, ".git/hooks/pre-push", "#!/bin/sh\n# existing owner hook\n");
  assert.notEqual(install().status, 0);
  assert.match(readFileSync(path.join(root, ".git/hooks/pre-push"), "utf8"), /existing owner hook/);
  rmSync(path.join(root, ".git/hooks/pre-push")); assert.equal(install().status, 0);
  const sibling = path.join(root, "linked"); run(root, "worktree", "add", "-b", "fixture", sibling);
  assert.equal(run(sibling, "config", "--get", "core.hooksPath"), path.join(root, ".git/hooks"));
  const denied = spawnSync(path.join(root, ".git/hooks/pre-push"), ["origin", destination], { cwd: sibling, env, encoding: "utf8", input: update(root) });
  assert.notEqual(denied.status, 0); assert.match(denied.stderr, /destination/);
  assert.ok(existsSync(path.join(root, ".git/hooks/pre-commit")));
});
test("reinstallation preserves customized managed hooks before changing either hook", t => {
  for (const name of ["pre-commit", "pre-push"]) {
    const root = fixture(t), install = () => spawnSync(process.execPath, [path.join(scripts, "install-guards.mjs")], { cwd: root, env, encoding: "utf8" });
    assert.equal(install().status, 0);
    const hook = path.join(root, ".git/hooks", name);
    const other = path.join(root, ".git/hooks", name === "pre-push" ? "pre-commit" : "pre-push");
    const original = readFileSync(hook, "utf8"), otherOriginal = readFileSync(other, "utf8");
    for (const changed of [original + "# Additional maintainer check\n", "# Local wrapper\n" + original, original.replace("set -eu", "set -e")]) {
      writeFileSync(hook, changed);
      assert.notEqual(install().status, 0);
      assert.equal(readFileSync(hook, "utf8"), changed);
      assert.equal(readFileSync(other, "utf8"), otherOriginal);
    }
    // An intact generated wrapper can still upgrade from an older guard revision.
    writeFileSync(hook, original.replace(/\/mouthfolio-guards\/[0-9a-f]{64}\//, `/mouthfolio-guards/${"a".repeat(64)}/`));
    assert.equal(install().status, 0);
    assert.equal(readFileSync(hook, "utf8"), original);
  }
});

test("merging foreign history is rejected even when its files are discarded", t => {
  const root = fixture(t), p = policy(root);
  run(root, "checkout", "--orphan", "foreign"); put(root, "README.md", "Foreign synthetic root");
  run(root, "add", "."); run(root, "commit", "-m", "Foreign fixture root");
  run(root, "checkout", "main"); run(root, "merge", "--allow-unrelated-histories", "-s", "ours", "foreign", "-m", "Join synthetic histories");
  assert.doesNotThrow(() => scan(snapshot(root, "worktree")));
  assert.throws(() => checkPush(root, destination, update(root), p), /Foreign repository history/);
});
test("shallow history and local ancestry overrides fail closed", t => {
  const root = fixture(t), p = policy(root), head = run(root, "rev-parse", "HEAD");
  put(root, ".git/shallow", head + "\n");
  assert.throws(() => checkPush(root, destination, update(root), p), /shallow clone/);
  rmSync(path.join(root, ".git/shallow"));
  run(root, "update-ref", `refs/replace/${head}`, head);
  assert.throws(() => checkPush(root, destination, update(root), p), /Replacement refs/);
  run(root, "update-ref", "-d", `refs/replace/${head}`);
  put(root, ".git/info/grafts", head + "\n");
  assert.throws(() => checkPush(root, destination, update(root), p), /Grafts/);
});

test("noreply identities pass while private contact details are rejected without echoing them", () => {
  for (const email of ["1+fixture@users.noreply.github.com", "fixture@users.noreply.github.com", "2+fixture-bot[bot]@users.noreply.github.com"]) assert.doesNotThrow(() => checkIdentity("Fixture", email));
  assert.doesNotThrow(() => checkIdentity("GitHub", "noreply@github.com"));
  for (const email of ["person@example.invalid", "1+fixture@users.noreply.github.com.invalid", "noreply@github.com"]) {
    assert.throws(() => checkIdentity("Fixture", email), error => /noreply/.test(error.message) && !error.message.includes(email));
  }
  assert.throws(() => checkIdentity("contact@example.invalid", "1+fixture@users.noreply.github.com"), /public name/);
});
test("both author and committer metadata are checked across outgoing history", t => {
  for (const key of ["GIT_AUTHOR_EMAIL", "GIT_COMMITTER_EMAIL"]) {
    const root = fixture(t), p = policy(root), base = run(root, "rev-parse", "HEAD");
    execFileSync("git", ["commit", "--allow-empty", "-m", "Synthetic identity accident"], { cwd: root, env: { ...env, [key]: "person@example.invalid" }, stdio: "pipe" });
    run(root, "commit", "--allow-empty", "-m", "Safe later commit");
    assert.throws(() => checkPush(root, destination, update(root, base), p), error => /identity/.test(error.message) && !error.message.includes("person@example.invalid"));
  }
});
test("trailers, annotated taggers and earlier commits cannot retain personal email", t => {
  assert.doesNotThrow(() => checkMessage("Co-authored-by: Fixture <1+fixture@users.noreply.github.com>"));
  assert.throws(() => checkMessage("Co-authored-by: Example <person@example.invalid>"), error => /non-noreply/.test(error.message) && !error.message.includes("person@example.invalid"));
  const root = fixture(t), p = policy(root);
  execFileSync("git", ["tag", "-a", "contact", "-m", "Synthetic tag"], { cwd: root, env: { ...env, GIT_COMMITTER_EMAIL: "person@example.invalid" }, stdio: "pipe" });
  assert.throws(() => checkPush(root, destination, `refs/tags/contact ${run(root, "rev-parse", "contact")} refs/tags/contact ${zero}`, p), /non-noreply/);
});
test("an installed commit guard rejects overridden personal authorship before creating a commit", t => {
  const root = fixture(t), before = run(root, "rev-parse", "HEAD");
  execFileSync(process.execPath, [path.join(scripts, "install-guards.mjs")], { cwd: root, env, stdio: "pipe" });
  const result = spawnSync("git", ["commit", "--allow-empty", "-m", "Should not exist"], { cwd: root, env: { ...env, GIT_AUTHOR_EMAIL: "person@example.invalid" }, encoding: "utf8" });
  assert.notEqual(result.status, 0); assert.match(result.stderr, /author identity/);
  assert.ok(!result.stderr.includes("person@example.invalid")); assert.equal(run(root, "rev-parse", "HEAD"), before);
});
test("a reused repository name, renamed repository or missing numeric pin is blocked", () => {
  const p = { repository: "fixture/client", repositoryId: 17 };
  assert.doesNotThrow(() => checkRepositoryIdentity({ id: 17, full_name: "Fixture/Client" }, p));
  for (const value of [{ id: 18, full_name: "fixture/client" }, { id: 17, full_name: "fixture/renamed" }, {}, null]) assert.throws(() => checkRepositoryIdentity(value, p), /identity changed/);
  assert.throws(() => checkRepositoryIdentity({ id: 17, full_name: "fixture/client" }, { repository: "fixture/client" }), /identity changed/);
});
test("fork installation requires an explicit numeric identity and preserves it", t => {
  const root = fixture(t), install = (...args) => spawnSync(process.execPath, [path.join(scripts, "install-guards.mjs"), ...args], { cwd: root, env, encoding: "utf8" });
  assert.notEqual(install("--destination", "fixture/client").status, 0);
  assert.equal(install("--destination", "fixture/client", "--repository-id", "17").status, 0);
  const hook = readFileSync(path.join(root, ".git/hooks/pre-push"), "utf8"), revision = /\/mouthfolio-guards\/([0-9a-f]{64})\//.exec(hook)[1];
  assert.equal(JSON.parse(readFileSync(path.join(root, ".git/mouthfolio-guards", revision, "policy.json"))).repositoryId, 17);
});
