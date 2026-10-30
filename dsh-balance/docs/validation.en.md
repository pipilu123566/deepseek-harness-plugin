# Validation for 1.1.0

[中文](validation.md) | English

Validated on 2026-10-30 against DeepSeek Harness **0.2.1-rc.5**. Environment: an isolated Web profile on macOS, Node 22.21.1 and pnpm 10.33.2. Profile installation uses the host's bundled package manager.

## Verified

| Check | Result |
| --- | --- |
| Automated tests | 26 passed, covering endpoint allowlists, decimal amounts, currencies, cache isolation, lifecycle, usage aggregation, fork deduplication, missing prices and usage, price validation and configuration conflicts |
| No credentials | An actual package started through the real Loader; balance RPC reported signed-out status, daily usage was a known empty result, and custom prices were empty |
| Usage and recalculation | Synthetic session events entered real host projections: 6 calls and 13200 tokens, retaining 1 missing-usage call. Saving a test price produced exact reconciliation across models, sessions and turns: CNY 0.03466 and USD 0.0017, plus 1 unpriced call |
| Configuration boundary | Real `savePrice` RPC saved isolated settings and immediately recalculated usage; stale revisions and invalid prices were rejected |
| Restart persistence | After stopping and restarting the isolated host, saved prices remained present and model/session/turn reconciliation was unchanged |
| UI interaction | Chinese overview, provider details, model/session views and session model breakdowns passed; saving a price through the form updated costs, and Escape closed the panel and restored wallet-button focus |
| Language and narrow layout | English switching took effect immediately; at a 390×844 Web viewport the panel was 360 pixels wide with no horizontal page overflow. The README screenshot shows the running UI with demonstration data |
| Removal and reinstall | Official CLI removal deleted the package and bundle entry; RPC returned 404 and the wallet disappeared in Chrome. Reinstall restored queries, cost reconciliation and saved prices |
| Public scope | Explicit package files, MIT and bilingual documentation; source and tests contain no enterprise adapter, Python bridge, personal configuration or credential-file reads |

Synthetic events verify projections, pricing and display without making real model calls. External balances use fixture responses; usage aggregation, price saving and recalculation use product code.

## Limits

- Live DeepSeek API-key, OpenRouter management-key and SiliconFlow account queries were not revalidated. Fixtures do not establish real permissions or provider availability.
- Isolated Web results do not replace a new Electron desktop installation, Windows, Linux or physical mobile-device validation. The daily desktop configuration was not used for these tests.
- Amounts estimate the current host's recorded usage at the current configured prices; they are not provider bills and exclude tool charges and other devices. See the plugin documentation for date and pricing limits.
- No compatibility beyond Harness 0.2.1-rc.5 is claimed.

## Reproduce

Run `pnpm install --frozen-lockfile --ignore-scripts` and `pnpm test` inside the plugin directory using the declared toolchain. Package committed source, install the actual `.tgz` into a new `DSH_HOME` and isolated profile, and do not copy real credentials. Record credential-free, synthetic-data and live-account coverage separately.

Cordis, LLM and Typert APIs come from the host. The rc.5 profile installer may warn about missing peers; judge real loading and calls rather than installing another host runtime just to silence warnings. The Release contains the `.tgz` and `SHA256SUMS`, and its tag identifies the source.
