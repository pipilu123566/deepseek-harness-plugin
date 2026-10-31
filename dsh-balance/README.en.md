# DSH Balance

[中文](README.md) | English

View account balances, today's model costs and session spending from the DeepSeek Harness sidebar, and configure prices for individual models.

[Download 1.1.0](https://github.com/pipilu123566/deepseek-harness-plugin/releases/tag/%40pipilu123566%2Fdsh-balance%401.1.0) · [Report a problem](https://github.com/pipilu123566/deepseek-harness-plugin/issues)

## See the workflow

Open the sidebar wallet → inspect balances and daily spending → save model prices and recalculate → review costs by session.

![DSH Balance 1.1.0 feature prototype: open the overview, save model prices and recalculate, then inspect session costs](https://raw.githubusercontent.com/pipilu123566/deepseek-harness-plugin/main/dsh-balance/media/balance-1.1.0-workflow.en.gif)

An approximately 14-second loop illustrating 1.1.0 features, not a screen recording. Amounts, models and prices are demo data, not real balances, official rates or invoices. Static steps: [Overview](media/balance-1.1.0-overview.en.png) · [Model prices](media/balance-1.1.0-prices.en.png) · [Session spending](media/balance-1.1.0-sessions.en.png). An [actual runtime screenshot using demo data](docs/images/balance-1.1.0-demo.png) is also available.

## Features

- Hover, focus or click the wallet button to open or pin the panel. Close it with Escape, the close button or an outside click.
- See available balances and daily spending in the overview. Expand a provider for wallet details and timestamps; multiple models from one provider share a single balance row.
- View daily costs by model or session, expand a session for its model breakdown, and see costs at the end of each assistant turn.
- Set input, output, cache-read and cache-write prices for an exact provider/model in the price editor. Saving recalculates estimates and persists across restarts.
- Overview amounts use two decimal places; expanded details retain precision. Currencies remain separate without exchange-rate conversion.
- Provider and cost lists scroll within a bounded area. Refresh manually or once per minute while the panel is open; polling stops when it closes.
- Missing credentials, unsupported providers, rate limits, failures, missing prices and missing usage remain explicit instead of appearing as zero balances or zero costs.

## Compatibility

1.1.0 declares compatibility only with **DeepSeek Harness 0.2.1-rc.5**. The wallet occupies its own sidebar footer row above the account button. Other host versions need separate verification.

These plugins are primarily built for the author's own needs and have not undergone comprehensive compatibility testing. See the [validation record](docs/validation.en.md) for the public release's tested platforms, installation and interaction coverage.

## Install or upgrade

1. Download [`pipilu123566-dsh-balance-1.1.0.tgz`](https://github.com/pipilu123566/deepseek-harness-plugin/releases/download/%40pipilu123566%2Fdsh-balance%401.1.0/pipilu123566-dsh-balance-1.1.0.tgz) from the Release. This is the installable plugin package; GitHub's automatically generated source archive is not a substitute.
2. Fully quit Harness, then run this from the download directory:

   ```sh
   dsh plugin --profile desktop add ./pipilu123566-dsh-balance-1.1.0.tgz --ignore-scripts
   ```

3. Reopen Harness and find the wallet button at the bottom of the sidebar. Configure provider connections in the existing Harness settings.

On macOS, if `dsh` is not on your PATH, use the application's CLI:

```sh
'/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh' plugin --profile desktop add ./pipilu123566-dsh-balance-1.1.0.tgz --ignore-scripts
```

Upgrade public version 1.0.0 using the same steps. For an existing Web profile, replace `desktop` with its name and stop/restart that instance around package changes. Keep only one balance bundle in a profile. Do not install the parent repository root as a plugin.

To uninstall, quit the target instance, run this command and reopen it:

```sh
dsh plugin --profile desktop remove @pipilu123566/dsh-balance
```

## Balance sources

| Provider | Source | Requirements and limits |
| --- | --- | --- |
| DeepSeek signed-in account | Harness account service | Sign in through Harness; top-up and granted wallets are shown by currency |
| DeepSeek API | Official `/user/balance` | Official API key; available, top-up and granted balances |
| OpenRouter | Official `/api/v1/credits` | Requires a management key; ordinary keys may be denied; total credits minus usage |
| SiliconFlow | Official `/v1/user/info` | Key for `api.siliconflow.cn`; amounts in CNY |
| Alibaba Cloud Bailian / Qwen | Balance query not integrated | A model API key cannot directly query the cloud account's cash balance; account funds and Token Plan / Coding Plan quotas are distinct |
| Other configured providers | Balance query unsupported | No guessed private endpoints; model prices can still be configured to estimate recorded usage |

API references: [DeepSeek](https://api-docs.deepseek.com/api/get-user-balance/), [OpenRouter](https://openrouter.ai/docs/api/api-reference/credits/get-remaining-credits), [SiliconFlow](https://github.com/siliconflow/siliconcloud/blob/main/openapi.yaml), [Alibaba Cloud account balance](https://help.aliyun.com/zh/user-center/developer-reference/api-bssopenapi-2017-12-14-queryaccountbalance).

Only configured providers are queried. Credentials go only to the corresponding allowlisted HTTPS endpoint. Custom reverse proxies, nonstandard ports, credentials embedded in URLs and redirects are rejected. A balance is a timestamped snapshot, not a live account-change feed.

## Usage and pricing

Amounts are **model-cost estimates, not provider billing statements**. They cover recorded model usage in sessions accessible to the current host, excluding other devices, unrecorded requests and tool charges such as search or fetch. Days use Beijing time. Inherited fork calls are not charged twice, and reasoning tokens already included in output are not counted again.

Missing usage, missing prices and unreadable sessions remain visible. Mixed results total only priced calls and indicate partial estimates. CNY and USD are never added together. Session lists include only sessions with calls that day, use titles from the host projection, and label untitled sessions explicitly.

Built-in prices for official DeepSeek routes use the [official CNY prices checked on 2026-10-30](https://api-docs.deepseek.com/zh-cn/quick_start/pricing/), including Beijing peak/off-peak periods. The built-in date range is 2026-09-19 through 2026-12-31. Outside that range, unknown models and identically named models on third-party routes do not automatically receive these prices. Prices may change; override them in the price editor as needed. The plugin does not automatically update its price table.

Custom prices are keyed by exact `provider/model`, support CNY and USD, and use currency per million tokens with up to eight decimal places. Input and output prices are required. An empty cache price means unpriced; enter `0` only for a free category. Saving recalculates existing records with the current settings, which cannot reconstruct historical provider tariffs or actual bills. Reset restores built-in pricing on supported official routes and leaves other routes unpriced. Concurrent configuration changes are rejected; reload before editing again.

## Data and development

API keys and raw provider responses stay on the Host. The client receives display fields such as balances, usage, model identifiers and session titles, not conversation bodies. The plugin adds no analytics or separate backend. Balance queries do not append session events; prices are saved through Harness settings.

Use the pinned Node **22.21.1**, pnpm **10.33.2** and lockfile inside the plugin directory:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm test
pnpm pack --out /path/to/output/dsh-balance.tgz
```

The Host uses Cordis, Typert, session queries and projections. The client reuses the host's React, theme and locale services and renders in public sidebar and turn-tail slots. Disposal releases listeners, timers, popovers, observation leases and in-flight requests. See [contributing](CONTRIBUTING.md) and the [validation record](docs/validation.en.md).

## License

[MIT](LICENSE). Third-party dependencies retain their own licenses.
