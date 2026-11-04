# Mouthfolio

**Track what people say about the companies you follow.**

A Mouthfolio brings together a person’s public investment views over time,
with the dates and sources behind them. What has someone said about an
investment? Who else has discussed a company or asset you follow?

[Explore Mouthfolio](https://mouthfolio.com/) · [Run the fictional demo](#run-the-demo)

<a id="early-alpha"></a>

## Reading a company page

In **Overview**, explore reported figures alongside their reporting periods.
In **Commentary**, select an author to read their remarks about that company
over time. Open a source to check what they said and when. The client calls
a person or account whose commentary appears here a **voice**.

A mention alone doesn’t tell you where someone stands. Even when someone
expresses a view, their words don’t tell you what they own. Coverage and
dates on each page tell you which records are available.

## About the client

This repository contains the [MIT-licensed](LICENSE) client, its documented
service interface, and an offline demo. **All companies, voices, values and
excerpts in the local demo are fictional.** See the [journey guide](docs/JOURNEY.md)
for the service connection and [progress record](docs/PROGRESS.md) for milestones.

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

Open <http://127.0.0.1:3210> for the landing page, or
<http://127.0.0.1:3210/companies/aster-compute> for the fictional demo.
No environment file, account, backend, provider or
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
It checks the landing and company entry, dates, evidence links, keyboard access, reload/Back, error states,
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

Every displayed value or attributed view should be traceable. Keep publication
time, evidence availability, reporting period and corrections distinct. Missing
evidence stays visible; the product does not infer holdings or rank investors.

## License

Original project code and the [original synthetic fixtures](fixtures/README.md)
are MIT-licensed; retain the copyright and license notice. Selected adapted code
and third-party assets are recorded in [the notices](THIRD_PARTY_NOTICES.md).
The bundled Source Serif 4 font retains SIL OFL 1.1. The code license grants no
rights to ASOF Data, real source material or trademarks.
