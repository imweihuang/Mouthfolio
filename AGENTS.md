# Mouthfolio agent instructions

Read README.md, CONTRIBUTING.md and docs/SOURCE_BOUNDARY.md before changing this
repository. It contains the early-alpha Mouthfolio client, a synthetic demo and
selected visual foundations. Do not infer GitHub visibility or release approval
from the presence of these source files. Read SECURITY.md for reporting and boundaries;
maintainers use docs/RELEASE.md before a separately authorized source release.
Read docs/DEVELOPMENT.md for the selected upstream candidates and remaining scope.

## Instruction and canon ownership

These instructions are self-contained for independent clones and linked worktrees.
An optional parent workspace routes cross-repository work; no parent guide or
private checkout is required to build, test or contribute here. The private data
service owns shared product/design originals and evidence/rights enforcement.
This repository owns public-safe client behavior, contributor setup, selected
licensed assets, pinned consumer exports and clearly synthetic examples. Import
only reviewed exports with provenance; do not copy a private canon wholesale.
CLAUDE.md imports this file so the two instruction entry points stay consistent.

## Delivery and publication boundary

- Work on an owned feature branch and deliver focused changes through a PR.
  Do not edit the default branch directly. Merge and public release require
  their applicable explicit authorization; a repository-creation grant is neither.
- Reuse selected Next.js/React UI and approved design tokens. Do not start a
  framework rewrite or copy a complete private repository into this one.
- Install local guards with `npm run guards:install` before committing or pushing.
  They scan the Git index, check the destination and independent client ancestry,
  and inspect every outgoing commit. Reinstall after reviewing guard updates.
  They are shared by linked worktrees and preserve unrelated existing hooks.
  A clone needs its own installation; CI does not prevent the first public push.
- Use the intended public Git name and GitHub noreply author/committer addresses.
  Preserve other contributors' identity choices by rejecting unsafe metadata,
  never rewriting it silently. Keep personal contact details out of messages and
  tags. Verify GitHub email privacy before using web edits or merge operations.
- Import only a reviewed file allowlist with source revision and attribution.
  Run the local leak scan before push; review history before any public release.
  Preserve upstream licenses. MIT applies only where we have the right to apply it.
- Keep ASOF Data, source archives, private routes, provider/customer data,
  credentials, deployment configuration and operator records outside this repo.
- Keep the synthetic demo usable without backend credentials and visibly
  fictional. Public-source availability is not redistribution permission.
- Preserve attribution, evidence versions, reporting periods and availability
  cutoffs. Unknown is not zero; request failure is not no change. Do not infer
  holdings, conviction or investor quality, or introduce performance rankings.
- Follow the backend's read-time eligibility and rights contract. Client-side
  hiding is not access control. Keep service credentials out of browser bundles.
- Run `npm run check` and `npm run build` for client changes. UI and adapter
  changes also need `npm run test:browser`; inspect the browser and screenshots.
  Setup and runtime pins are in README.md. No private backend is needed.
- ASOF Data owns the canonical consumer schema. Follow contracts/README.md;
  update its source revision and file hashes together, never just generated types.
- Keep the `CI passed` job unconditional and required. Normal protections and
  an expected-head guard apply to separately authorized merges.
