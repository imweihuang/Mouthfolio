# Mouthfolio consumer contract

`asof.mouthfolio.research.v0.1` is the development interface for the first
company → maintained question → attributed view → receipt workflow. ASOF Data
owns the canonical schema; `contract.lock.json` pins its source commit and the
redistributable files. It is a consumer projection, not a copy of the private
evidence graph or an announcement of a hosted API.

`mouthfolio-research.v0.1.schema.json` describes the response. `types.ts` is
generated with `npm run contracts:generate`; `contracts:check` rejects drift.
The schema and synthetic examples are original project material under MIT.

## Meaning and compatibility

- Requests bind company ID, an explicit ISO timestamp with timezone (`asof`),
  and `window=all`. Availability, publication and reporting period are separate.
- Company, question/edition, voice, attributed view, observation and receipt
  identities stay distinct. A correction has a new version and predecessor.
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

The proposed path is `/api/mouthfolio/v0.1/companies/{id}/research`. Neither this
demo nor the current AsOf production server implements it. The existing local
company API is an internal reference; it is not aliased or made public here.

Contract upgrades start in AsOf. Review and copy only the named contract files
at the selected commit, update the lock, regenerate types, and run the local and
hosted checks. Public CI validates the vendored files without private-repo access.
