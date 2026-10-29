# Mouthfolio progress

Client checkpoint: **28 October 2026**, after foundation integration through
[Mouthfolio #1](https://github.com/imweihuang/Mouthfolio/pull/1). This is a dated
client progress record, not a live service or release report.

Mouthfolio is the primary planned customer experience, with ASOF Data as its
intended data foundation. The current demo uses fictional data and has no hosted
connection. The next milestone is one complete research journey: explore a
company, see related market commentary, inspect its sources and understand what
changed. A **voice** is a person or account whose market commentary is followed.
ASOF Research and ASOF Chat remain separate product directions with no active
development planned.

## Where we are

| Work area | In place | Still to do |
|---|---|---|
| Client foundation | The independent client, selected visual assets and [license notices](../THIRD_PARTY_NOTICES.md) are integrated into main. | Review later component imports individually, including their assets and dependencies. |
| Contributor safeguards | Staged-content, authorship, destination identity and outgoing-history guards are included, with portable instructions and CI. | Complete the exact-candidate review and separately authorize source release. |
| Working demonstration | The fictional local demo and its automated checks are integrated into main. | Connect the full company, question, voice, source and edition reading flow. |
| Reading experience | Selected light tokens and the local font are available. | Import the selected company shell, charts and filing reader with synthetic fixtures. Full Storybook extraction remains open. |
| Hosted information | Connection code has been tested locally against the agreed data format. | The demo has no hosted service connection. Backend checks and release are separate. |
| Reader usefulness | The intended question-led journey is defined. | Test the complete journey with readers; no customer-use or paid-demand result is claimed. |

The local demo foundation is integrated. The full connected feature build has
not started in this repository at this checkpoint. Each milestone below states
what must work before it can be called complete; no progress percentage is assigned.

## Roadmap and completion conditions

| Arc | Milestone | Complete when | State |
|---|---|---|---|
| Prepare the foundations | Independent sample client | A clean checkout runs with synthetic data, local assets and portable checks, without backend access. | Integrated in [#1](https://github.com/imweihuang/Mouthfolio/pull/1); clean-checkout checks passed |
| Prepare the foundations | Early-alpha source release | The exact candidate and retained repository contents pass source/rights review, contributor guidance is ready, and public visibility is separately authorized and verified. | Release preparation; visibility change pending |
| Complete a research journey | Selected reading components | The company shell, charts and filing reader use the consumer interface; source boundaries and notices pass. | Proposed next |
| Complete a research journey | Connected company and voice navigation | Readers move between question, company, view, source and earlier editions without losing dates or browser history. | Proposed next |
| Complete a research journey | Journey acceptance | Phone, desktop and keyboard checks cover missing evidence, corrections, unavailable records and source navigation. | Not started |
| Connect qualified research | Authorized service integration | The backend supplies eligible information and enforces current access, display rights and revocation. | Separate later work |
| Learn from readers | Hosted reader trial | Hosted content and service access are separately qualified, then a bounded trial gathers evidence of usefulness. | On hold |

The first journey can be completed with synthetic information before any real
research connection. The small source alpha can be released before that full
journey under the [source-release checklist](RELEASE.md). Research preparation is distinct from launching the parked
ASOF Research product. Publishing this repository, publishing research and
deploying a service remain separate decisions.

## Maintaining this record

Update the checkpoint and affected rows when a client milestone or dependency
changes. Link the PR that provides evidence; a draft, a passing test, integration
into main and a deployed experience are different states. An open proposal is
not an active task unless someone has accepted that work.

The [development handoff](DEVELOPMENT.md) owns source selection and the next
feature sequence. The [source boundary](SOURCE_BOUNDARY.md) controls what may
enter this repository. Keep combined business planning, private operations,
backend task registers and source evidence outside this client repository.
