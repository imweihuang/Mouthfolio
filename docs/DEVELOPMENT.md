# Development handoff

The [README](../README.md) describes the current client and the
[progress record](PROGRESS.md) maps remaining work to milestones. This handoff
retains source ownership and verification guidance.

## Selected sources and ownership

The functional reference is AsOf company API/dashboard candidate
`2fa1e270fa50f41970fc0818ecc63426502df13d` (#1217). The visual overlay is
`816357d8dd0a8666f2f138d9f5d36b352a0af735` (#1215): approved light tokens,
typography and component reference. Both are immutable references even if an
upstream branch later advances. They are not an instruction to merge the private
branch stack or copy its files wholesale.

The import manifest selects the initial token subset and font. The API's timestamp,
decimal and generator patterns are adapted with notices. The runnable research
demo is intentionally small and synthetic; the full filing reader and Storybook
remain subsequent reviewed work. Their private fixtures,
local API loaders and operator routes cannot cross with them.

Mouthfolio now owns new reusable client work following foundation integration.
AsOf owns capture, evidence, rights, review, schemas and backend enforcement.
Existing AsOf UI owners retain their frozen candidates and current work until
their selected source is imported. There is no duplicate feature implementation
mandate and no live Station cutover in this preparation.

The client starts with a company Overview and a separate Commentary section.
Overview contains reported figures, one compact financial comparison and selected
source cards. Financials and Sources retain the complete reported evidence and
receipt library. On desktop, company navigation and source context sit alongside
the reading area; smaller screens use a source drawer. Author history is linked
from commentary items rather than a sidebar roster.

The charts use only compatible observations in the existing consumer response.
Compact metric and period controls resolve against available evidence; exact
tables preserve original values. Source cards group exact voice/receipt pairs
without adding commentary or inferring a stance from mentions. See
[JOURNEY](JOURNEY.md) for chart limits, exact-source links and URL-backed sections
and filters. This presentation change adds no service data or deployment
acceptance. Anthropic is the first hosted company; further company entries need
qualified facts and source coverage rather than placeholder metrics.

## Continue development

Use [PROGRESS](PROGRESS.md) for milestone status and [JOURNEY](JOURNEY.md) for the
connected company, voice and source experience. This handoff does not maintain a
second feature backlog. New service projections originate in ASOF Data and are
pinned here through the consumer contract; real source data stays with that service.

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
