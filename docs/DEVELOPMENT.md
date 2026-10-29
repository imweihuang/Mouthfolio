# Development handoff

This source snapshot contains the selected synthetic client foundation.
The [progress record](PROGRESS.md) maps the remaining client work to plain-English
milestones. It is a dated summary; this handoff retains the source and boundary
rules for implementation.

## Selected sources and ownership

The functional reference is AsOf company API/dashboard candidate
`2fa1e270fa50f41970fc0818ecc63426502df13d` (#1217). The visual overlay is
`816357d8dd0a8666f2f138d9f5d36b352a0af735` (#1215): approved light tokens,
typography and component reference. Both are immutable references even if an
upstream branch later advances. They are not an instruction to merge the private
branch stack or copy its files wholesale.

The import manifest selects the initial token subset and font. The API's timestamp,
decimal and generator patterns are adapted with notices. The runnable research
demo is intentionally small and synthetic; the full reader, charts, two-pane
shell and Storybook are subsequent reviewed imports. Their private fixtures,
local API loaders and operator routes cannot cross with them.

Mouthfolio now owns new reusable client work following foundation integration.
AsOf owns capture, evidence, rights, review, schemas and backend enforcement.
Existing AsOf UI owners retain their frozen candidates and current work until
their selected source is imported. There is no duplicate feature implementation
mandate and no live Station cutover in this preparation.

## First feature slice

1. Import the selected company/filing shell and portable UI components against
   the synthetic contract. Update the allowlist, notices and browser checks.
2. Extend the contract only in AsOf when the feature needs a new projection;
   pin its reviewed revision here. Keep real source data in AsOf.
3. Connect company/question/voice navigation while retaining as-of/window and
   browser history. Keep absent evidence explicit.
4. Evaluate a real hosted adapter separately, after backend access, rights and
   publication qualification. The injected adapter here is tested but unconnected.

## Verification and merge gate

README lists the clean-checkout commands. `CI passed` runs contract generation,
import/asset boundaries, type checks, contrast, behavioral tests, a production
build and a focused browser suite. It runs on drafts as well as ready PRs and
on pushes to main. Standard Ubuntu, a 12-minute cap and superseded-run cancellation
bound cost. No release, deployment, secrets, write-token permissions, stored CI
artifacts or optional paid runner are configured. npm cache uses GitHub's default
included storage; no storage limit is raised.

Main protection requires the GitHub Actions `CI passed` check, an up-to-date base,
resolved conversations and PR integration. It applies to administrators; force
pushes and branch deletion are disabled. For the current single-maintainer repo,
required review count is zero; founder authorization and verified-head guards
remain the merge procedure. Protection is a live setting, not something a PR
can install by claiming it in this document. Verify it in GitHub before merging.

Public standard-runner Actions compute is free under GitHub's current pricing.
While a repository is private, included account allowance applies, then applicable
charges. Larger runners and storage have separate billing rules. See
[GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions).

Publishing source, publishing research, and deploying a service are separate
decisions. Use the [source-release checklist](RELEASE.md) for the early alpha.
The runnable synthetic foundation can be released before the full reading journey;
that release grants no hosted-data access or deployment authority.
