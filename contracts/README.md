# Mouthfolio consumer contract

`asof.mouthfolio.research.v0.2` remains the default development interface for the first
company → voice → view or mention → receipt workflow. ASOF Data
owns the canonical schema; `contract.lock.json` pins its source commit and the
redistributable files. The additive v0.3 export is pinned separately in
`contract.v0.3.lock.json` and the import manifest. These are consumer projections, not a copy of the private
evidence graph or an announcement of a hosted API.

`mouthfolio-research.v0.2.schema.json` describes the response. `types.ts` is
generated with `npm run contracts:generate`; `contracts:check` rejects drift.
The v0.3 and v0.4 schemas and versioned types use the same generator and drift check.
Both schemas and their synthetic examples are original project material under MIT.

## Meaning and compatibility

- Requests bind company ID, an explicit ISO timestamp with timezone (`asof`),
  and `window=all`. Availability, publication and reporting period are separate.
- Company, question/edition, voice, attributed view, observation and receipt
  identities stay distinct. Mentions are separate named references without an inferred stance. A correction has a new version and predecessor.
- Missing amounts are null with a reason, never zero. Decimal strings retain
  exact values. A view is attributed text, not a holding, forecast or voice score.
- `ready`, `no_record_found`, `revoked` and `unavailable` are different states.
  All non-ready states contain no research records. Transport and validation
  errors throw `ResearchUnavailable`; they never manufacture a no-record response.
- The server must enforce current access, publication eligibility and display
  rights even for historical requests. `data_mode=authorized` is a payload mode,
  not an authorization check. Client validation is an additional containment layer.
- `link_only` receipts contain no excerpt. Excerpts must already be displayable;
  arbitrary private source text must never reach the client. Public record scope
  remains the backend's decision, not this schema's inventory of possible fields.
- This pre-release schema rejects undeclared fields. Change the version for
  shape or semantic changes; update canonical files, generated types, pinned
  hashes and both adapters together. No silent contract upgrades.

## Two adapters, one interface

`lib/demo-adapter.ts` is offline and synthetic. Earlier cutoffs cannot see the
later correction. Revocation applies at read time, including earlier cutoffs.

`lib/service-adapter.ts` validates the same response with `authorized` mode.
The host application supplies a trusted server transport. Requests are GET,
no-store, no-redirect, with a five-second signal and a 256 KiB response cap.
The injected transport must honor cancellation and must not expose credentials
to browser code. There is no configured origin or credential in this preparation.

The default service path is `/api/mouthfolio/v0.2/companies/{id}/research`.
Explicit server-only `ASOF_DATA_API_VERSION=v0.3` selects the v0.3 endpoint and
validator together. Unsupported settings or mismatched responses fail closed;
there is no fallback to another version after an error. This client
does not implement that endpoint. The server-only adapter can connect to an
operator-configured origin; see [the journey guide](../docs/JOURNEY.md).
Financial observations carry their reported basis. A ready commentary response
need not invent an assessment or financial observations.

Contract upgrades start in AsOf. Review and copy only the named contract files
at the selected commit, update the lock, regenerate types, and run the local and
hosted checks. Public CI validates the vendored files without private-repo access.

## Record TLDR in v0.3

A receipt adds required nullable `summary`. When present, it carries an immutable
summary identity and version, at most 500 characters of ASOF-authored text,
`generated_by=ai`, source capture and summary availability timestamps, and
explicit capture framing. It is separate from the source excerpt and attributed
view. A link-only receipt still has `excerpt=null`; a summary grants no excerpt
permission. A null summary renders no TLDR or replacement narrative.

The client labels this text **Record TLDR** and **AI-authored · AI-reviewed**,
shows its capture/availability dates and preserves the source receipt context.
Its availability must be no later than the requested cutoff, and its capture
cannot follow summary availability. Backend review, rights, current revocation
and exact source/snapshot qualification remain server responsibilities.

The fictional default demo remains v0.2. The v0.3 examples are synthetic test
fixtures; their presence does not activate or qualify a hosted summary service.


## Company disclosures in v0.4

The additive v0.4 response includes `company.context` with an explicit available,
unavailable or revoked state. Available facts are narrowly typed as product,
delivery channel or listing application. Each fact retains an immutable version,
disclosure date, availability timestamp, receipt and correction reference.

The client shows products and access methods as separately sourced disclosures.
A listing application identifies the proposed venue and symbol at its disclosure
date; it does not establish current listing status or a completed offering. Empty
or revoked context never creates a substitute business description.

Explicit server-only `ASOF_DATA_API_VERSION=v0.4` selects its endpoint and validator
together. The development default remains v0.2. Earlier response versions remain
unchanged and do not acquire company context. The v0.4 schema/types and two
synthetic examples use a separate `contract.v0.4.lock.json`; the reviewed source
commit and file hashes must be pinned before publication.
