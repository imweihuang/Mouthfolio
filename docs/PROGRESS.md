# Mouthfolio progress

Current checkpoint: **31 October 2026**. The source is public, and the first hosted
Anthropic research journey is available. The company-first client changes below
are a separate presentation update, not a claim that this revision is deployed.

Mouthfolio starts with a company, connects its reported evidence to commentary,
and lets readers inspect sources or follow an author's history inline. A
**voice** is a person or account whose market commentary is followed.
The default local demo uses fictional information and needs no service access.

## Current state

| Area | In place | Remaining work |
|---|---|---|
| Public source | The [early-alpha repository](https://github.com/imweihuang/Mouthfolio), license notices, contributor instructions and publication guards are available. | Review each future import and preserve the boundary between code and service data. |
| Connected reading | [Journey #3](https://github.com/imweihuang/Mouthfolio/pull/3) connects company, voice and source pages with dated context, exact receipts and visible missing-value reasons. | Complete the filing reader and broaden company coverage. |
| Local demonstration | Fictional observations, distinct views/mentions, corrections, cutoff changes and unavailable states work without a backend connection. | Continue testing the experience as it expands. |
| Hosted Anthropic slice | [Anthropic on Mouthfolio](https://asof.io/mouthfolio/companies/anthropic) connects reported SEC filing figures with a partial commentary archive and original sources. | Broaden qualified coverage and gather reader feedback. |
| Record TLDR | The client supports eligible, reviewed summaries with visible authorship and capture context. | Broaden qualified summary coverage; the commentary archive remains partial. |
| Design and usefulness | Selected light tokens and the local font support the integrated journey. | Full Storybook extraction and reader trials remain open; no customer-use or paid-demand result is claimed. |

[Open the Anthropic alpha](https://asof.io/mouthfolio/companies/anthropic).
The page shows the date of its newest eligible commentary. Coverage is partial;
archive freshness does not establish complete reactions to a filing.
Missing evidence stays visible. There is no stable API or
production-support commitment during this alpha.

ASOF Research and ASOF Chat remain separate product directions with no active
development planned. A public client repository does not grant rights to service
data; the [source boundary](SOURCE_BOUNDARY.md) remains in force.

## Client presentation update: 31 October 2026

The client now organizes the company journey around Overview and Commentary.
Overview combines dated company facts when qualified, reported figures, two
compact financial comparisons and readable source notes. Financials holds the complete evidence table and detailed charts;
Sources holds the receipt library. A desktop source-context pane keeps the
company in view while reading evidence, with a modal drawer on smaller screens.
Author history is reached from commentary, not a sidebar roster.

The compact charts offer supported reporting-period choices, exact
tables and links to each observation's receipt. Full-year and first-half scales
remain separate, and result/cash-flow pairs require matching reporting periods.
Commentary cards preserve attributed statements and mention counts in their
context and offer URL-backed voice, type and order controls in the full feed.
The optional v0.4 contract supports separately qualified company facts. A
complete reported reconciliation enables a conditional waterfall. The client
creates no new commentary or summaries, and code changes do not establish
production admission, deployment or CI acceptance of this revision. Local verification and hosted acceptance remain separate.

Anthropic remains the first hosted company. Additional companies require
qualified company facts, attributed commentary and source coverage; the new
navigation does not establish that a second hosted company is available.

## Historical checkpoint: 28 October 2026

[Foundation #1](https://github.com/imweihuang/Mouthfolio/pull/1) integrated the
independent client and fictional demo. At that checkpoint, the connected journey
and hosted qualification were future work. The current state above supersedes
that earlier roadmap; it does not turn local checks into hosted acceptance.

## Keeping this record current

Update the date and affected state when evidence changes. Link the relevant PR
or user-facing result, and distinguish integration, local verification and hosted
acceptance. Keep private operations and source evidence outside this repository.
See the [journey guide](JOURNEY.md) for current client behavior.
