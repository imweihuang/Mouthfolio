# Mouthfolio

Question-led company and voice research, powered by ASOF Data.

Mouthfolio is being built to connect company evidence, attributed market views
and changes over time. The planned experience lets readers start with a company
or a voice, investigate a maintained question, and inspect supporting sources.

## Early alpha

This is an experimental, [MIT-licensed](LICENSE) client with a runnable synthetic
research demo. All companies, voices, values and excerpts in the demo are fictional.
It runs locally without an ASOF Data account, service connection or credentials.

| Available now | Planned |
|---|---|
| A small company/question/view/source example | The full company dashboard, filing reader and voice navigation |
| Dated evidence, a later correction and explicit missing/error states | A complete research journey and reader testing |
| Selected visual foundations, a versioned consumer contract and automated checks | A separately qualified connection to hosted ASOF Data |

Interfaces and presentation may change during the alpha. There is no stable API
or production-support commitment. The injected service adapter is tested but has
no configured hosted endpoint. Publishing this source is separate from deploying
a service or publishing real research.

See [progress and milestones](docs/PROGRESS.md) for the dated client status,
what is in place and what completes the next research journey.

The planned experience reuses the existing Next.js/React client and visual
system. Its first connected workflow is company → research question → attributed
view → evidence, with a filing reader and dated research editions. ASOF Research
and ASOF Chat are separate, parked product directions.

## Client and data boundary

This repository contains the client, selected design assets, documented consumer
interfaces and synthetic examples. Future hosted integration must use an
authorized service interface; the client does not read the private evidence store.

ASOF Data retains source capture, evidence storage, review, permissions and
operations. This repository's license does not grant access to that service or
rights to its data. See [the source boundary](docs/SOURCE_BOUNDARY.md) before
bringing files or dependencies into this repository.

## Contributing

Start with [CONTRIBUTING.md](CONTRIBUTING.md). Use Node **22.22.0** (`.nvmrc`) and
npm **10.9.4**. All commands run from this repository root:

```sh
npm ci --ignore-scripts
npm run guards:install
npm run dev
```

Open <http://127.0.0.1:3210>. No environment file, account, backend, provider or
credential is needed to run the demo. It includes an original edition, a later correction,
a missing metric, and unavailable/revoked examples. Its fonts are local.

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
