# Source, dependency and asset notices

Original project code and the original synthetic fixtures are MIT-licensed.
This does not license access to ASOF Data or confer rights to real source data.
The import manifest records source revisions, paths and asset digests.

## Selected original AsOf code

The named CSS token subset in `app/tokens.css` comes from the original AsOf
visual system. The timestamp and exact-decimal routines in `lib/contract.ts`
adapt `frontend/lib/companyApi/client.ts` at the selected API revision. The
small Node type generator adapts the schema-to-TypeScript algorithm in
`scripts/export_company_api_contract.py` at that same revision. Copyright
2026 imweihuang; these selected original exports are licensed under MIT.
This license statement applies to the selected exports, not the private repo.

The original private Python model, storage, fixtures and API implementation are
not included. The React Bits-derived landing component and dependent header
are excluded; no React Bits vendor code is present.

## Font

The unmodified Source Serif 4 Latin font retains **SIL OFL 1.1**, including its
full notice in `public/fonts/SourceSerif4-OFL.txt`. It is not relicensed as MIT.
The source asset records the Google Fonts v14 weight-400 cut, Google Fonts commit
`bf51302780b3fa944f0e8e957fee5a5830065583`, and Adobe upstream
`b3980ade53bb3d023a0006076d05349236b309b1`. The import manifest records exact bytes.
Other text uses system fonts. No logo, trademark asset, image or external font
service is bundled. The code license grants no trademark rights.

## Dependencies

The lockfile pins the dependency graph; package notices remain in their packages.
Direct runtime dependencies: Next.js, React, React DOM, Ajv and ajv-formats (MIT).
Development dependencies: TypeScript and Playwright (Apache-2.0), and the Node,
React and React DOM TypeScript definitions (MIT). GitHub Actions use official
checkout/setup-node actions pinned to commit IDs, with their upstream terms.
No third-party package source is copied into this repository.

The Next.js version stays aligned with the selected client. Its PostCSS dependency
is overridden to 8.5.32 to include current advisory fixes; build and browser checks
verify that combination. Ajv is pinned to 8.20.0. Preserve these patches when
refreshing the lockfile rather than copying an older dependency graph unchanged.
