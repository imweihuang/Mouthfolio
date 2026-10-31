# Company-first research journey

Start with Anthropic's **Overview**: dated company context when available, reported
figures, two financial comparisons and a short selection of readable commentary. **Commentary** opens the fuller
dated feed. Financials and Sources support deeper reading. Author names link
from individual commentary items to their history about the company; the sidebar
stays focused on company navigation rather than an inventory of voices.

Overview shows revenue and matched result/cash-flow evidence together. Controls
offer only supported periods. Readers can choose full years or first halves
where available, select a result period, and open either exact table. Financials retains the
complete reported-evidence table, detailed comparisons, and a maintained question
when one is available. Revenue charts keep full years and first halves separate,
with independent zero-based scales. The result and cash-flow chart compares the
same reporting period, with negative values left of zero and positive values
right. A period selector and exact-table controls support closer reading. Charts
include only recognized USD measures and compatible reported bases; unmatched or
ambiguous observations remain in the complete evidence table. Missing evidence
is not plotted as zero. Year-over-year revenue change is calculated only for
matching consecutive periods. The conditional accounting reconciliation requires
a complete, source-matched set of adjustments. No margin or cash runway is inferred.

Chart labels and headline amounts may be rounded; exact tables retain the
original values, units, reporting periods and financial basis. Each plotted
observation and table source link opens its exact receipt. The headline summary
prioritizes the latest recognized revenue and matched result/cash-flow pair,
then fills remaining slots from other reported observations, up to four records.
Reconciliation adjustments remain in their chart and the full evidence table.
Each measure retains its own reporting period; dates can differ across measures.
Different bases or durations are never merged; the complete reporting history
remains in Financials. Missing values retain their explanation. A cash balance is
a point-in-time observation, not operating cash flow.

Overview selects a small set of recent source cards, prioritizing available
company-relevant summaries or substantive attributed text. This is a selection
of posts, not a voice's overall position. The default “Notes first” order puts
readable cards first, ordered by publication date within that group. Other
archived sources remain expandable. Each card groups one exact voice and receipt, retains
every attributed-view statement in its expandable context, and shows mentions
separately. Company readers can filter by voice; both full feeds offer All, Views and Mentions
filters and notes-first/newest/oldest ordering. A type filter selects whole matching cards,
so a mixed card retains both its views and mentions. Voice pages stay scoped to
the selected voice and company. A named reference alone establishes no stance.
Attributed-view text is plain text, not quotation styling. When a service response
omits conditions or horizon, optional view context directs readers to the
original source;
absence from this projection does not establish that the speaker stated none.

## Record TLDR

A validated v0.3 or v0.4 receipt may include a **Summary**, labelled
**AI-authored · AI-reviewed**. It appears once per source card
and in the exact source inspector, with source capture and summary
availability dates. This is ASOF-authored summary text, not a source quote or a
new stance. A mention remains a named reference. Null summaries and v0.2
responses leave the existing evidence journey intact.

Receipt display describes what this projection includes; it does not assert the
source's full reuse permissions. A link-only receipt has no source excerpt and
directs readers to the original source for full context when its URL is present.

## Routes and context

- `/` and `/companies/aster-compute` open the fictional offline demo.
- `/companies/anthropic` is the first service subject. It never reuses demo data.
- Company sections use `section=commentary|financials|sources`; omitting it opens
  Overview. Section links and source links preserve the evidence cutoff and
  selected receipt. Chart controls are local display choices, not new evidence.
- `/voices/{id}?company={company-id}` opens the selected company's voice context.
- `asof`, `window=all` and `receipt` are URL-backed. A receipt selects an immutable
  identity, not the latest version of the clicked metric. Changing the cutoff
  does not silently replace a selected receipt. Unknown or revoked receipts show
  a source-unavailable notice without another source's content.
- Commentary filters use `voice`, `kind=all|views|mentions` and
  `order=newest|oldest`. Defaults are all voices, all record types and newest
  first. Links and cutoff changes preserve the selected research context and
  receipt. Entering a voice profile clears the company voice filter and makes
  the route's voice authoritative, while retaining type and order selections.

On desktop, the company navigation, reading area and source-context pane sit
alongside one another. Selecting a chart mark, value source or commentary source
opens its exact receipt in that pane. It becomes a modal drawer at widths of
1100px or less. Escape closes it and returns focus to the source opener. Back,
Forward and reload restore URL context. The underlying page remains usable with
an inspector open at wide desktop widths. A voice profile covers only records
linked to its selected company; it does not claim complete commentary coverage.
Publication dates are shown separately from ingestion and availability dates.
Records do not imply a response to another publication.

Coverage remains partial. The newest archived commentary date describes what is
available, not complete reactions to a filing or a current-news feed. Anthropic
is the first hosted company; subsequent companies need qualified observations,
attribution and source coverage before they can offer the same journey.

Company and voice links show a loading status as soon as navigation starts.
The current page and URL remain in place until the destination's fresh service
read completes. These links do not prefetch evidence or reuse a client response
cache to bypass current eligibility checks.

## Server connection

The server component defaults to the same v0.2 contract as the demo. The
hosting operator can supply `ASOF_DATA_ORIGIN` as an authorized HTTPS origin
without a path, query, credentials or fragment; loopback HTTP is also accepted
for local verification. The server requests the fixed versioned company endpoint.
`ASOF_DATA_API_VERSION` is also server-only: omit it for v0.2 or explicitly set
`v0.3` or `v0.4` to select the corresponding endpoint and matching validator. Other
values and mismatched responses fail closed without a fallback request. These
settings are never passed to client components.
No service credentials or real response fixtures are included in this repository.
Set `MOUTHFOLIO_SERVICE_ONLY=1` at runtime for a service-only deployment. It
disables the synthetic adapter on every route, including voice query parameters,
and makes the root default to Anthropic. Edge route restrictions alone do not
disable demo selection.
Missing configuration, transport errors and rejected payloads render **Research
unavailable**. Only a successful validated empty result renders **No record
found**. There is no demo fallback for service subjects.

Service requests have a 15-second deadline, including response-body reading, and
are not retried. Responses still pass the same size, schema and evidence checks.
`GET /health` returns only `{"status":"ok"}` without contacting the data service;
it checks process liveness, not research readiness. Use the configured base path
for this route, such as `/mouthfolio/health`. Verify research readiness separately
through the company, voice and source journey.

For hosting beneath an existing application, build with
`MOUTHFOLIO_BASE_PATH=/mouthfolio npm run build` and run the matching browser check
with `MOUTHFOLIO_BASE_PATH=/mouthfolio npm run test:browser`. Only an empty base
path or `/mouthfolio` is accepted. Next navigation, GET forms, scripts and bundled
font assets stay beneath the selected base path. Build again to change it.

## Verification and reuse

`npm run check`, `npm run build` and `npm run test:browser` cover this slice.
The browser suite checks both company and voice entry, grouped views/mentions,
exact snapshot identity across history and corrections, missing/revoked sources,
service-unavailable behavior, keyboard focus, and 320/390/1440px layouts. Run it
for each selected build base path. Screenshots remain in ignored `artifacts/`.
The existing approved token subset and local Source Serif 4 font are reused.
The layout and components are original client code informed by the selected
company/evidence reference; no additional upstream source or dependency was copied.

The consumer exports are pinned to their canonical source revision and hashes.
They contain only invented companies, voices, values and text. Public-source
availability grants no rights to service data. A runnable client and passing
local tests do not establish hosted data admission or deployment acceptance.

## Investor overview and dated company context

The three-pane company layout leads with reported figures, simultaneous revenue
and result/cash-flow comparisons, and readable commentary. The default “Notes
first” order puts source cards with substantive company text first; the complete
archive remains available, including mention-only records. Explicit date orders
remain chronological. “What changed” lists dated additions to this archive, not
changes since a user's last visit or a claim of continuous source monitoring.

Year-over-year revenue change uses consecutive equal-duration periods with the
same reported basis. A conditional waterfall connects net income to operating
cash flow only when all eleven eligible adjustments and both endpoints share the
required period/source lineage and reconcile exactly. Each figure retains its
receipt and exact table. Noncash adjustments are not represented as cash flows.

Optional v0.4 company context presents fixed, dated product names, delivery
channels and listing applications with exact receipts. It does not establish
current trading status. Missing or revoked context adds no inferred company facts;
older API versions remain supported. The source-code release includes only
synthetic fixtures. Hosted facts require separate service qualification.
