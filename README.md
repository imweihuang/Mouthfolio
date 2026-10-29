# Mouthfolio by ASOF

Explore market views, company evidence and what changed.

Mouthfolio is being built to help self-directed investors explore what market
commentators have said, compare those views with company evidence, and see what
changed over time. The current client connects company, voice and source pages,
with dated evidence and an ongoing research question when one is available.

A **voice** is a person or account whose market commentary is followed.

## Early alpha

This public repository contains an experimental, [MIT-licensed](LICENSE) client
with a local research demo. **All companies, voices, values and excerpts in the
demo are fictional.** It runs without an account, backend connection or credentials.
The local demo does not connect to ASOF Data or provide real research. A separate
Anthropic service journey is implemented; hosted acceptance is pending. An
optional v0.3 service response can add explicitly labelled AI-authored Record
TLDRs beside the source context; the default demo remains v0.2.

### Hosted Anthropic alpha — acceptance pending

The planned entry is [Anthropic on Mouthfolio](https://asof.io/mouthfolio/companies/anthropic).
The first slice is prepared to connect 21 reported SEC filing figures with a
partial archive of attributed views and mentions, and let readers move from the
company to a voice and its source receipts. Its newest archived commentary is
from 10 October 2026; this is not a current-news feed or a collection of reactions
to the later filing. Coverage is limited to eligible records in that archive.

This dated preparation note does not establish that the hosted service is ready.
The fictional local demo remains available without a service connection.

| Available in the client | Still to complete |
|---|---|
| Connected company, voice and source pages with reported metrics, distinct views/mentions and an evidence inspector | A complete filing reader and broader company coverage |
| Dated sources, a later correction and visible missing-data and error states in the fictional demo | Reader trials of the complete journey |
| Fictional data that works locally, plus a server adapter that fails closed without an authorized service | Hosted Anthropic acceptance |

For contributors, the repository also includes selected visual foundations, a
versioned client-service interface and automated checks. The connection code has
been tested locally. The default demo remains offline; see the [journey guide](docs/JOURNEY.md)
for the separate service route and deployment-time connection.

Interfaces and presentation may change during the alpha. There is no stable API
or production-support commitment. Publishing this source is separate from
deploying a service or publishing real research.

See [progress and milestones](docs/PROGRESS.md) for the dated client status,
what is in place and what completes the next research journey.

The connected journey is integrated through [Mouthfolio #3](https://github.com/imweihuang/Mouthfolio/pull/3).
A complete filing reader, full Storybook extraction, broader coverage and reader
trials remain open. ASOF Research and ASOF Chat are separate product directions
with no active development planned.

## Client and data boundary

This repository contains the client, selected design assets, documented consumer
interfaces and synthetic examples. Service connections use an authorized
interface; the client does not read the private evidence store.

ASOF Data retains source capture, evidence storage, review, permissions and
operations. This repository's license does not grant access to that service or
rights to its data. See [the source boundary](docs/SOURCE_BOUNDARY.md) before
bringing files or dependencies into this repository.

## Run the demo

Use Node **22.22.0** (`.nvmrc`) and npm **10.9.4**. All commands run from this
repository root:

```sh
npm ci --ignore-scripts
npm run guards:install
npm run dev
```

Open <http://127.0.0.1:3210>. No environment file, account, backend, provider or
credential is needed to run the demo. It includes an original edition, a later correction,
a missing metric, and unavailable/revoked examples. Its fonts are local.

## Contributing

Start with [CONTRIBUTING.md](CONTRIBUTING.md). After setup, run:

```sh
npm run check
npm run build
npx --no-install playwright install chromium
npm run test:browser
```

The browser check starts and stops its own production preview on a free loopback port.
It checks dates, evidence links, keyboard access, reload/Back, error states,
320/390/1440px layouts and absence of external requests. Local screenshots go
to ignored `artifacts/`. The same checks run on every PR and push to `main`.
The required GitHub check is **CI passed**; no draft or path filter skips it.

Local [publication guards](docs/SOURCE_BOUNDARY.md#local-publication-guards) inspect
staged files and outgoing history before Git sends content. New clones must install
them explicitly. They do not replace rights review or authorize a public release.

The [consumer contract](contracts/README.md),
[import manifest](docs/import-manifest.json), and
[development handoff](docs/DEVELOPMENT.md) define ownership and remaining work.
Report ordinary bugs or proposals through [GitHub issues](https://github.com/imweihuang/Mouthfolio/issues).
For vulnerabilities, follow [SECURITY.md](SECURITY.md) and avoid public disclosure
of sensitive details. Maintainers use the [source-release checklist](docs/RELEASE.md).

The `private: true` setting in `package.json` prevents accidental npm publication.
It does not control GitHub visibility; this alpha is a source checkout, not an npm package.

Every displayed value or attributed view should be traceable. Keep publication
time, evidence availability, reporting period and corrections distinct. Missing
evidence stays visible; the product does not infer holdings or rank investors.

## License

Original project code and the [original synthetic fixtures](fixtures/README.md)
are MIT-licensed; retain the copyright and license notice. Selected adapted code
and third-party assets are recorded in [the notices](THIRD_PARTY_NOTICES.md).
The bundled Source Serif 4 font retains SIL OFL 1.1. The code license grants no
rights to ASOF Data, real source material or trademarks.
