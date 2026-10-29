# Contributing

Mouthfolio is an early-alpha client with a small runnable synthetic demo. The full
company and filing experiences remain separate feature imports described in
[the development handoff](docs/DEVELOPMENT.md). No private service or sibling
checkout is needed to contribute to this repository.

Open a [GitHub issue](https://github.com/imweihuang/Mouthfolio/issues) for a bug or
proposal. Include the revision, Node/npm versions and a minimal synthetic example.
Discuss large API or design changes before implementing them. Follow
[SECURITY.md](SECURITY.md) for vulnerabilities; keep credentials, private research
and customer material out of issues, PRs, screenshots and logs.

## Work on a focused branch

Use a `codex/` feature branch for agent work and a pull request for integration.
Keep the default branch unchanged after repository initialization. Include what
changed, why, the checks performed and any remaining limitation in each PR.

## Install publication guards

After `npm ci --ignore-scripts`, run `npm run guards:install`. The installer checks
for existing hooks before changing repository-local configuration. If it stops,
preserve and deliberately integrate the existing hooks; do not bypass either set.
This includes generated hooks with local additions: a marker comment alone does
not authorize the installer to replace them.
Installed guards use a pinned local copy shared by all worktrees. Reinstall after
reviewing guard changes. No parent workspace, private repository or credential is
needed for these checks.

The default push destination is the upstream Mouthfolio repository. Contributors
using their own reviewed fork must also verify its numeric repository ID (for
example, `gh api repos/your-account/your-fork --jq .id`) and install with:

```sh
npm run guards:install -- --destination your-account/your-fork --repository-id REVIEWED_NUMBER
```

Choose that destination explicitly. The pre-push guard verifies the live repository
ID, so renaming a repository and reusing its old name cannot silently retarget an
installed guard. Private pushes need an authenticated GitHub CLI session; public
destinations also support an unauthenticated API check. Offline checks, builds and
guard installation do not need account access.

Use your chosen public Git name and GitHub-provided noreply address for both author
and committer metadata. Configure them locally in this repository before committing.
Do not include personal contact details in commit messages, co-author/sign-off
trailers or tags. GitHub web edits and merges need email privacy enabled separately.
Contributor identities are checked, never silently rewritten. A local identity
change does not remove earlier metadata from history.

An arbitrary remote URL, another repository's
history or a missing/incomplete history scan fails closed. `npm run check:history`
inspects all commits reachable from the current HEAD. If a private file appears
in an unpushed commit, deleting it in a later commit is insufficient: remove it
from the unpublished history before pushing. Do not rewrite shared history
without its owner's authorization.

## Bring in only reviewed source

Follow [SOURCE_BOUNDARY](docs/SOURCE_BOUNDARY.md). Record the source revision,
file allowlist and attribution for any extraction. Review imported code, assets,
fixtures, dependencies and build outputs together. A clean scan does not replace
license or data-rights review.

Use fictional identities and synthetic data for examples. Do not commit retained
source text, production responses, customer context, credentials or operational
files. Keep sample data visibly labelled throughout the experience.

## Verify the change

Follow the pinned [README setup](README.md). Run `npm run check`, `npm run build`
and, for UI/adapter changes, `npm run test:browser`. Check local links and
`git diff --check`, and run the local leak scan before pushing. The mandatory
`CI passed` job runs on PRs (including drafts) and `main`; it has no secrets or
deployment permissions. A failed or skipped verification does not qualify a merge.

UI changes need browser evidence, accessible keyboard interaction and coverage
of missing/error states. Verify dates, units, filters, chart headlines and source
receipts together. Keep demo and service adapters on the same documented contract.

The service adapter accepts an injected server transport and is exercised by
tests. This repo does not implement or connect to the proposed hosted endpoint.
Do not add a browser token or import the local AsOf database to make it work.
