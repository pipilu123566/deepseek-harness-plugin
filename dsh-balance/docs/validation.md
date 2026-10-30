# Release validation — 1.0.0

Validated on 2026-10-30 with DeepSeek Harness **0.2.1-rc.5**, macOS and Chrome. Development tooling: Node 22.21.1 / pnpm 10.33.2. The application's bundled package manager performs profile installation.

## Results

| Check | Result and evidence |
| --- | --- |
| Automated checks | 9 tests passed: endpoint allowlist, money parsing, failure states, cache isolation, unknown providers, account wallets, client registration, abort on disposal and fresh remount |
| Install | An actual `.tgz` was installed with the official CLI into an isolated profile; no `link:` dependency or copied account configuration |
| Shared host APIs | Cordis context, LLM service and Typert service identity checks passed; imports resolved to the installed Harness runtime |
| No credentials | Real RPC returned the DeepSeek account as `signedOut`; the interface showed the sign-in state without fabricated balances |
| Demonstration data | A separate, unpublished fixture supplied DeepSeek wallet, OpenRouter and SiliconFlow sample responses to the real host and client; the panel rendered separate currencies and wallet categories |
| Interaction | Open, pin, manual refresh, Escape with focus restoration, keyboard reopening and collapsed sidebar operation were exercised in Chrome |
| Layout | Wallet button occupies a separate footer row above the account button; expanded and collapsed layouts were inspected |
| Removal | After removal and host restart, the wallet entry disappeared and the balance RPC returned HTTP 404 |
| Lifecycle | Tests verify cancellation of an in-flight request, removal of the service, idempotent disposal and no cache reuse after remount |
| Public scope | MIT license, bilingual documentation and explicit package file list; no enterprise adapter, private credential bridge, personal configuration or demonstration fixture in the package |

The README screenshot is a cropped capture of that running UI with **demonstration balances**, not real account data. The fixture and runtime observer are outside the released source and are never required by the plugin.

## Host dependency resolution

The three Harness APIs are `peerDependencies`, with exact development versions in the lockfile. They are supplied by the host at runtime, rather than installing a second Cordis or LLM runtime into the profile. The rc.5 profile installer may report unmet peer dependencies because its physical package tree does not contain these host APIs. Runtime identity was checked separately; this warning alone is not evidence that loading failed. Always check actual loading on the declared host version.

## Limits

- Live DeepSeek API-key, OpenRouter management-key and SiliconFlow account queries were **not** revalidated for this release. HTTP fixtures verify response handling, not live account permissions or provider availability.
- This release was exercised in an isolated Harness **Web** instance on macOS. A new Electron desktop installation, Windows and Linux were not tested. The daily desktop profile was not modified.
- Automatic minute-by-minute polling and cleanup on close are covered by code inspection; a full minute-by-minute network trace was not recorded during this release check.
- Compatibility beyond Harness 0.2.1-rc.5 is not claimed.

## Reproducing the checks

Run `pnpm install --frozen-lockfile --ignore-scripts` and `pnpm test` with the repository's declared tools. Package from a clean committed source tree, then install the `.tgz` in a new `DSH_HOME` and profile. Do not copy existing credentials. Check signed-out behavior, then exercise providers with credentials you own if live verification is needed. Stop the instance before removal or reinstalling.

Release attachments include the installable archive and `SHA256SUMS`; the Release tag identifies the corresponding source commit. Public-source installation and checksum read-back are recorded in the Release notes.
