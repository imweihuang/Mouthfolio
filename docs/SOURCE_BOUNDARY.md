# Source boundary

This early-alpha client contains a synthetic demonstration and selected frontend
foundations. Original code and synthetic fixtures are MIT-licensed. Further
component imports, source publication and hosted-service qualification remain
separate work. The [release checklist](RELEASE.md) defines the source-release gate;
this document does not assert that a visibility change has occurred.

## Intended contents

- Selected company, voice, question, filing-reader and evidence-inspector UI.
- Approved design tokens and assets, with their rights and notices recorded.
- Versioned consumer interfaces and demo/service adapters.
- Fictional demo data, examples and contract tests with explicit fixture terms.
- Necessary frontend rendering/server adapter code and contributor documentation.

## Keep in the private data service

- Capture/extraction pipelines, databases, migrations and retained snapshots.
- Raw source text, licensed feeds, provider responses and real research fixtures.
- Review/admin tools, entitlement enforcement and private customer context.
- Credentials, infrastructure inventories, deployment configuration and receipts.

The client consumes an authorized, versioned interface. It does not directly read
the evidence database. The backend enforces access, rights and eligibility at
read time. Demo mode must work without service credentials; a production adapter
must keep any server credentials out of browser-delivered code.

## Import and license rules

Use fresh history and an explicit file allowlist. For each import, record the
source revision, selected paths, adaptations, upstream notices and data/asset
rights. Review transitive imports and generated/build output, not only entry files.
Do not copy the previous frontend directory or Git history wholesale.

The initial extraction excludes the React Bits-derived `LandingGlassSurface`
component, its dependent landing header and vendor copy because their retained
license restricts redistribution of the components themselves. A simple header
can be implemented independently. This exclusion does not judge existing hosted
use; it prevents assuming that all inherited frontend code is MIT-licensed.

MIT covers original project code. Third-party code keeps its own terms. Document
fixture and brand-asset permissions separately; do not infer them from the code
license or from a source being readable on the web.

## Before public release

Review the exact candidate commit, imported-file manifest, dependencies, assets,
demo data and notices. Scan the complete candidate history for secrets and private
material. Before changing repository visibility, also review every retained
branch/tag and repository surface, including PR/issue text, releases, and CI
logs/artifacts created during private preparation. Checking only the default
branch or release commit is insufficient for that visibility change.
Prove that a clean checkout builds and runs the synthetic demo without a private
backend. Review the consumer contract and production bundle for private routes or
data. Obtain explicit authorization for the public visibility/release change.

Keep code release and hosted-content qualification separate. Publishing the client
does not publish ASOF Data, enable its sources, or qualify research for display.


## Local publication guards

The client is independent of any parent workspace. Shared strategy/design owners
may live privately, but contributor instructions and build requirements here stay
public-safe and self-contained. Keep one local AGENTS.md and route CLAUDE.md to it.
Cross-repository changes use separate PRs and selected source exports, never shared
Git history or filesystem imports from a sibling repository.

Install with `npm run guards:install`. The pre-commit check reads staged Git blobs,
so an unstaged cleanup cannot conceal an unsafe staged file. The pre-push check
binds the configured GitHub destination and original client root, then scans every
outgoing commit snapshot, message and annotated tag. A new remote branch receives
a complete reachable-history scan. Later deletion does not remove earlier bytes.
Author, committer and tagger addresses must use GitHub noreply identities; messages
and attribution trailers cannot carry other contact addresses. The commit guard
also checks the active Git identities before creating a commit. No identity is
silently rewritten. Use the public name you intend to disclose.

The installed policy pins the destination's numeric GitHub repository ID as well
as its name. A live identity check rejects name reuse or redirects to a renamed
repository. An unavailable check blocks the push. Complete-history CI stays local
and does not need GitHub account credentials; private pushes use the normal GitHub
CLI session. See CONTRIBUTING.md for explicit fork installation.

The boundary check covers all candidate text files, including documentation,
scripts and workflows. It rejects private filenames, sensitive-path files without
reading them (including common network, package-publishing and Git credential stores),
symlinks, submodules, opaque archives and unreviewed binaries. It
checks known credential/private-runtime patterns, escaping imports, synthetic JSON
fixtures, import rights/revisions, unchanged asset hashes and the consumer contract.
Ordinary project npm settings remain allowed; npm authentication settings are rejected
without printing their values.
The exact reviewed browser smoke file has one hash-bound exception for private-route
strings because it requires those routes to return 404; its other checks still run.
An edited probe must be reviewed and its exception hash updated deliberately.

Guard copies and their destination policy live in local Git administrative storage,
so switching to an older worktree does not silently remove them. Installation
refuses incompatible existing hooks and locally modified generated wrappers;
added maintainer checks are preserved. CI also scans the checked-out tree and full
candidate history and runs negative controls. CI is a second layer after upload;
local hooks must run before a public push. Hooks can be bypassed, and pattern checks
cannot identify every private business fact, rights issue or encoded secret. Review
the exact staged paths, imports, outgoing history and rights as well.

Public release still requires the separate review above, including earlier private
CI logs/artifacts. No local guide, clean scan or protected branch grants publication.
