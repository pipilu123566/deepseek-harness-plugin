window.__ModuleLoader__.load({
  id: '@pipilu123566/dsh-balance',
  factory(require) {
    const React = require('react'), h = React.createElement;
    const zh = {
      title: '余额与用量', trigger: '余额', description: '账户余额与本机记录分开统计', accounts: '账户余额', refresh: '刷新', refreshing: '更新中…', loading: '正在查询…', empty: '尚未配置服务商', failed: '暂时无法读取余额，请重试', snapshotLabel: '查询快照', staleUsage: '用量更新失败，以下为上次结果', close: '关闭', pinned: '已固定',
      officialAccount: '官方账户', officialApi: '官方 API', thirdParty: '第三方', available: '可用余额', toppedUp: '充值余额', granted: '赠送余额',
      signedOut: '登录后查看', unavailable: '查询失败，请稍后重试', unauthorized: '密钥无效或无余额查询权限', rateLimited: '查询过于频繁，请稍后重试', unsupported: '暂不支持此厂商的余额接口', missingCredential: '未找到可用 API 密钥',
      note: '余额按原币种展示，不折算为 Token。', updated: '更新于',
      today: '今日用量', usageSnapshot: '用量快照', localScope: '本机 · 北京时间', turnUsage: '本轮消耗', tokenUnit: 'Token', estimated: '费用估算', partialEstimate: '部分费用估算', unpriced: '部分调用未定价', allUnpriced: '费用未定价', missingUsage: '部分调用未上报用量', noUsage: '用量未上报', partialUsage: '部分会话读取失败', usageUnavailable: '暂时无法读取用量，请重试', usageNote: '按已记录模型用量估算，不含其他设备与工具费用。', input: '未命中输入', cacheRead: '缓存读取', cacheWrite: '缓存写入', output: '输出（含推理）', modelDetails: '按厂商与模型查看',
      pricing: '模型单价', modelKey: '厂商 / 模型', currency: '币种', perMillion: '所选币种／百万 Token', priceInput: '输入单价', priceOutput: '输出单价', priceRead: '缓存命中单价', priceWrite: '缓存创建单价', cacheOptional: '缓存价格（可选）', priceHint: '缓存价格留空表示未定价；填 0 表示免费。保存会重算历史估算，不代表账单实扣。', save: '保存并重算', saving: '保存中…', resetPrice: '恢复默认／未定价', priceLoad: '正在读取单价…', priceLoadError: '单价读取失败，请重新载入', priceError: '保存失败，请重新载入最新单价后重试', reloadPrices: '重新载入', saved: '已保存，正在更新用量', resetSaved: '已移除自定义单价，正在更新用量', customPrice: '正在使用自定义单价', defaultPrice: '未设置自定义单价：使用默认价格或保持未定价', invalidModel: '请使用完整的厂商/模型标识，不含空格', invalidPrice: '请输入 0 至 1000000 的数值，最多 8 位小数', requiredPrice: '请填写单价', optional: '可留空',
    };
    const en = {
      title: 'Balance and usage', trigger: 'Balance', description: 'Account balances and local usage are separate', accounts: 'Account balances', refresh: 'Refresh', refreshing: 'Updating…', loading: 'Loading…', empty: 'No providers configured', failed: 'Unable to read balances. Please retry.', snapshotLabel: 'Query snapshot', staleUsage: 'Usage refresh failed. Showing previous results.', close: 'Close', pinned: 'Pinned',
      officialAccount: 'Official account', officialApi: 'Official API', thirdParty: 'Third party', available: 'Available', toppedUp: 'Topped up', granted: 'Granted',
      signedOut: 'Sign in to view', unavailable: 'Unavailable. Please retry later.', unauthorized: 'Invalid key or no balance permission', rateLimited: 'Rate limited. Please retry later.', unsupported: 'Balance API not supported for this provider', missingCredential: 'No API credential found',
      note: 'Balances keep their currency; not a token count.', updated: 'Updated',
      today: 'Today’s usage', usageSnapshot: 'Usage snapshot', localScope: 'This installation · Beijing time', turnUsage: 'Turn usage', tokenUnit: 'tokens', estimated: 'Estimated cost', partialEstimate: 'Partly priced estimate', unpriced: 'Some calls are unpriced', allUnpriced: 'Cost not priced', missingUsage: 'Some calls did not report usage', noUsage: 'Usage not reported', partialUsage: 'Some sessions could not be read', usageUnavailable: 'Unable to read usage. Please retry.', usageNote: 'Recorded model usage estimates; excludes other devices and tool fees.', input: 'Uncached input', cacheRead: 'Cache read', cacheWrite: 'Cache write', output: 'Output (includes reasoning)', modelDetails: 'View providers and models',
      pricing: 'Model prices', modelKey: 'Provider / model', currency: 'Currency', perMillion: 'Selected currency per million tokens', priceInput: 'Input price', priceOutput: 'Output price', priceRead: 'Cache hit price', priceWrite: 'Cache creation price', cacheOptional: 'Cache prices (optional)', priceHint: 'Blank cache prices remain unpriced; zero means free. Saving reprices historical estimates, not invoices.', save: 'Save and recalculate', saving: 'Saving…', resetPrice: 'Restore default / unpriced', priceLoad: 'Loading prices…', priceLoadError: 'Unable to load prices. Please reload.', priceError: 'Save failed. Reload the latest prices and retry.', reloadPrices: 'Reload', saved: 'Saved. Updating usage.', resetSaved: 'Custom price removed. Updating usage.', customPrice: 'Using a custom price', defaultPrice: 'No custom price: using defaults or remaining unpriced', invalidModel: 'Enter the full provider/model identifier without spaces.', invalidPrice: 'Enter a value from 0 to 1000000, with up to 8 decimal places.', requiredPrice: 'Enter a price.', optional: 'May be blank',
    };
    Object.assign(zh, {
      title: '余额与消耗', today: '今日消耗', usageSnapshot: '消耗快照', turnUsage: '本轮消耗',
      byModel: '按模型', bySession: '按会话', back: '返回概览', usageDetails: '消耗明细',
      untitledSession: '未命名会话', noSpend: '暂无消耗', pendingAmount: '金额待确认',
      shortEstimate: '预估', pricingAction: '单价', compactUnsupported: '暂不支持', compactNotConnected: '余额未接入', aliyunBilling: '尚未接入阿里云账户余额。当前模型密钥用于调用模型，查询余额需单独接入阿里云费用服务；余额属于整个阿里云账户。', providerCount: '{count} 个来源 · 滚动查看更多', compactUnavailable: '暂不可用',
      staleUsage: '更新失败，显示上次消耗', usageUnavailable: '暂时无法读取消耗，请重试',
      usageNote: '本机记录 · 北京时间；金额按模型单价估算，不代表账单实扣。',
    });
    Object.assign(en, {
      title: 'Balance and spending', today: 'Today’s spending', usageSnapshot: 'Spending snapshot', turnUsage: 'Turn spending',
      byModel: 'By model', bySession: 'By session', back: 'Back to overview', usageDetails: 'Spending details',
      untitledSession: 'Untitled session', noSpend: 'No spending', pendingAmount: 'Amount unknown',
      shortEstimate: 'Estimate', pricingAction: 'Prices', compactUnsupported: 'Not supported', compactNotConnected: 'Not connected', aliyunBilling: 'Alibaba Cloud account balance is not connected. Model API keys are for inference; balance queries require separate billing access. The balance covers the entire Alibaba Cloud account.', providerCount: '{count} providers · Scroll for more', compactUnavailable: 'Unavailable',
      staleUsage: 'Refresh failed. Showing previous spending.', usageUnavailable: 'Unable to read spending. Please retry.',
      usageNote: 'This installation · Beijing time. Model-price estimates, not invoiced charges.',
    });
    const css = `
.pb-seat{position:relative;z-index:40;flex:none}.pb-wide{height:36px;margin-bottom:8px}.pb-rail{height:36px;width:36px;margin-bottom:8px}
.pb-chip{height:32px;display:flex;align-items:center;gap:5px;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);padding:0 7px;font:inherit;cursor:pointer;white-space:nowrap}.pb-chip[aria-expanded=true]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.pb-seat :is(button,input,select,summary):focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}
.pb-pop{position:fixed;inset:auto;margin:0;box-sizing:border-box;width:360px;max-width:calc(100vw - 24px);max-height:calc(100dvh - 32px);overflow:auto;overscroll-behavior:contain;background:var(--dsw-specific-menu);backdrop-filter:var(--dsw-menu-backdrop-filter);color:var(--dsw-alias-label-primary);border:0;border-radius:var(--dsw-radius-lg);padding:16px;box-shadow:var(--dsw-elevation-panel);font:inherit;font-size:13px;line-height:1.5;cursor:default}
.pb-head,.pb-section-head,.pb-provider-name{display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0}.pb-title{margin:0;font-size:15px;font-weight:500}.pb-section-title{margin:0;font-size:13px;font-weight:500}.pb-sub,.pb-note,.pb-time{font-size:11px;color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere}.pb-sub{margin-top:4px}.pb-actions{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.pb-head>.pb-actions{flex:none}.pb-action{min-height:28px;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;padding:4px 8px;font:inherit;font-size:12px;touch-action:manipulation}.pb-action:disabled{opacity:.5;cursor:wait}.pb-close{min-width:28px;font-size:18px;line-height:1}.pb-primary{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.pb-section{margin-top:16px;padding-top:16px;border-top:.5px solid var(--dsw-alias-border-l2)}.pb-provider{padding-top:12px}.pb-provider+.pb-provider{margin-top:12px;border-top:.5px solid var(--dsw-alias-border-l2)}.pb-provider-name{align-items:baseline;font-size:12px;font-weight:500;margin-bottom:8px}.pb-provider-name>span:first-child{min-width:0;overflow-wrap:anywhere}.pb-tag{font-size:10px;font-weight:400;color:var(--dsw-alias-label-tertiary);flex:none}.pb-section-head .pb-tag{white-space:normal;text-align:right}
.pb-row{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-top:6px}.pb-row>span{min-width:0;overflow-wrap:anywhere}.pb-row>span:first-child{color:var(--dsw-alias-label-secondary);font-size:12px}.pb-value{font-variant-numeric:tabular-nums;font-family:inherit;font-weight:500;text-align:right;overflow-wrap:anywhere}.pb-row-primary .pb-value{font-size:18px;line-height:1.4}.pb-unit{font-size:11px;font-weight:400;color:var(--dsw-alias-label-secondary)}.pb-status{font-size:12px;color:var(--dsw-alias-label-secondary);margin:10px 0}.pb-note{margin:10px 0 0}.pb-time{margin-top:6px}.pb-notice{font-size:11px;color:var(--dsw-alias-label-secondary);margin:6px 0 0;overflow-wrap:anywhere}.pb-refresh-state{min-height:16px;margin:8px 0 -4px;font-size:11px;color:var(--dsw-alias-label-secondary)}
.pb-costs{display:flex;flex-wrap:wrap;gap:4px 12px}.pb-money{font-variant-numeric:tabular-nums;font-weight:500;overflow-wrap:anywhere}.pb-amount-unknown{font-size:12px;color:var(--dsw-alias-label-secondary);font-weight:400}.pb-model{padding:12px 0;border-bottom:.5px solid var(--dsw-alias-border-l2)}.pb-model-name{font-size:12px;overflow-wrap:anywhere}.pb-model-source{font-size:10px;color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere}.pb-model .pb-costs{font-size:16px;margin-top:6px}.pb-model .pb-time{margin-top:3px}
.pb-pop:popover-open:is([data-view="overview"],[data-view="usage"]){display:flex;flex-direction:column}.pb-pop:is([data-view="overview"],[data-view="usage"])>*{flex-shrink:0}.pb-pop .pb-overview,.pb-pop .pb-detail-list{flex-shrink:1;min-height:64px;overflow:auto;overscroll-behavior:contain;scrollbar-width:thin}.pb-overview{margin-top:12px;max-height:224px}.pb-detail-list{max-height:288px}.pb-overview:focus-visible,.pb-detail-list:focus-visible,.pb-overview summary:focus-visible,.pb-detail-list summary:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:-2px}.pb-list-hint{margin-top:10px;font-size:11px;color:var(--dsw-alias-label-tertiary)}.pb-list-hint+.pb-overview{margin-top:2px}.pb-wallet{border-bottom:.5px solid var(--dsw-alias-border-l2)}.pb-wallet summary,.pb-session summary{list-style:none;cursor:pointer;border-radius:var(--dsw-radius-sm)}.pb-wallet summary::-webkit-details-marker,.pb-session summary::-webkit-details-marker{display:none}.pb-wallet-summary{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr) 16px;gap:10px;align-items:center;padding:13px 0;min-height:24px}.pb-wallet-name{font-size:13px;overflow-wrap:anywhere}.pb-wallet-amount{display:flex;flex-direction:column;align-items:flex-end;text-align:right;font-size:16px;min-width:0}.pb-chevron{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;line-height:1;overflow:hidden;font-size:16px;color:var(--dsw-alias-label-tertiary);font-weight:400}.pb-wallet[open]>summary .pb-chevron,.pb-session[open]>summary .pb-chevron{transform:rotate(90deg)}.pb-wallet-detail{padding:0 0 12px}.pb-wallet-detail .pb-time{margin-top:8px}.pb-spend-link{display:flex;flex-direction:column;gap:6px;width:100%;padding:14px 0 6px;text-align:left;background:transparent;border:0;border-radius:var(--dsw-radius-sm);font:inherit;color:inherit;cursor:pointer}.pb-spend-label{display:flex;align-items:center;gap:7px;width:100%}.pb-spend-label>.pb-chevron{margin-left:auto}.pb-spend-link .pb-costs,.pb-spend-total .pb-costs{font-size:24px;line-height:1.35}.pb-spend-total{padding:14px 0 12px}.pb-spend-total .pb-time{margin-top:6px}.pb-footer{margin-top:10px;font-size:10px;color:var(--dsw-alias-label-tertiary);display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}.pb-tabs{display:flex;gap:4px;padding:3px;border-radius:var(--dsw-radius-md);background:var(--dsw-alias-settings-card-fill);margin:14px 0 2px}.pb-tab{flex:1;min-height:32px;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer}.pb-tab[aria-selected=true]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);font-weight:500}.pb-session{border-bottom:.5px solid var(--dsw-alias-border-l2)}.pb-session-summary{display:grid;grid-template-columns:minmax(0,1fr) 16px;gap:5px 10px;padding:12px 0}.pb-session-summary .pb-costs{grid-column:1;font-size:16px}.pb-session-summary>.pb-chevron{grid-column:2;grid-row:1/3;align-self:center}.pb-session-name{min-width:0;overflow-wrap:anywhere}.pb-session-detail{padding:0 8px 10px}.pb-empty{padding:14px 0;color:var(--dsw-alias-label-secondary);font-size:12px}.pb-back{padding-left:0;align-self:flex-start}
.pb-prices{display:flex;flex-direction:column;gap:10px;margin-top:12px}.pb-price-fieldset{border:0;padding:0;margin:0;display:flex;flex-direction:column;gap:10px;min-width:0}.pb-price-field{display:flex;flex-direction:column;gap:5px;min-width:0;font-size:12px}.pb-prices input,.pb-prices select{box-sizing:border-box;min-width:0;width:100%;min-height:32px;padding:6px 10px;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-md);color:var(--dsw-alias-label-primary);background:var(--dsw-alias-settings-card-fill);font:inherit}.pb-price-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.pb-prices summary{cursor:pointer;font-size:12px;border-radius:var(--dsw-radius-sm)}.pb-field-error{font-size:11px;color:var(--dsw-alias-label-primary)}.pb-prices [aria-invalid=true]{outline:1px solid var(--dsw-alias-label-secondary)}.pb-prices .pb-time{margin:0}.pb-price-summary{font-weight:500}.pb-prices .pb-status{margin:0}
@media(hover:hover){.pb-chip:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.pb-action:hover{background:var(--dsw-alias-interactive-bg-hover)}}
@media(max-width:380px){.pb-pop{padding:12px}.pb-price-grid{grid-template-columns:minmax(0,1fr)}.pb-section-head{align-items:flex-start}.pb-section-head .pb-tag{max-width:48%}.pb-head{align-items:flex-start}.pb-breakdown{gap:6px 10px}}
`;
    const turnCss = `.pb-turn{font-size:12px;color:var(--dsw-alias-label-secondary);margin:8px 0;line-height:1.6;overflow-wrap:anywhere}.pb-turn summary{cursor:pointer;border-radius:var(--dsw-radius-sm)}.pb-turn summary:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}.pb-turn .pb-usage-total{font-size:13px;font-weight:500;margin-top:8px}.pb-turn .pb-costs{display:flex;flex-wrap:wrap;gap:6px 12px}.pb-turn .pb-money{font-variant-numeric:tabular-nums}.pb-turn .pb-unit,.pb-turn .pb-time,.pb-turn .pb-model-source{font-size:11px;color:var(--dsw-alias-label-tertiary)}.pb-turn .pb-breakdown{display:flex;flex-wrap:wrap;gap:4px 16px;margin-top:6px}.pb-turn .pb-breakdown>div{display:flex;gap:6px}.pb-turn .pb-notice{font-size:11px;margin-top:4px}.pb-turn .pb-model{margin-top:8px;padding-left:10px;border-left:.5px solid var(--dsw-alias-border-l2)}.pb-turn .pb-model-name{overflow-wrap:anywhere}`;
    // Keep decimal text exact; formatting must not round large balances via Number.
    const decimalText = value => {
      const [integer, fraction] = String(value).replace(/(\.\d*?[1-9])0+$|\.0+$/, '$1').split('.');
      return integer.replace(/\B(?=(?:\d{3})+(?!\d))/g, ',') + (fraction ? '.' + fraction : '');
    };
    // Round only the presentation, using decimal digits so large amounts stay exact.
    const overviewText = value => {
      const text = String(value), negative = text.startsWith('-');
      const [whole, fraction = ''] = text.replace(/^-/, '').split('.');
      const digits = fraction.padEnd(3, '0');
      const cents = BigInt(whole || '0') * 100n + BigInt(digits.slice(0, 2)) + (digits[2] >= '5' ? 1n : 0n);
      const rounded = cents.toString().padStart(3, '0');
      return (negative && cents !== 0n ? '-' : '') + rounded.slice(0, -2).replace(/\B(?=(?:\d{3})+(?!\d))/g, ',') + '.' + rounded.slice(-2);
    };
    const costEntries = (costs, raw = false) => raw ? Object.entries(costs || {}).map(([currency, units]) => {
      const value = BigInt(units), digits = (value < 0n ? -value : value).toString().padStart(9, '0');
      return { currency, amount: (value < 0n ? '-' : '') + digits.slice(0, -8) + '.' + digits.slice(-8) };
    }) : costs || [];
    const costLabel = (value, t, raw) => costEntries(value.costs, raw).length ? t(value.unpriced || value.missing || value.status === 'partial' ? 'partialEstimate' : 'estimated') : t(value.calls ? 'allUnpriced' : 'estimated');
    const unknownAmount = (value, t) => t(!value.calls ? value.status === 'partial' ? 'pendingAmount' : 'noSpend' : value.missing === value.calls ? 'noUsage' : 'allUnpriced');
    function Amount({ value, t, raw = false, overview = false }) {
      const costs = costEntries(value.costs, raw);
      return h('span', { className: 'pb-costs' }, costs.length ? costs.map(x => h('span', { className: 'pb-money', key: x.currency }, h('span', { className: 'pb-unit' }, x.currency + ' '), (overview ? overviewText : decimalText)(x.amount))) : h('span', { className: 'pb-amount-unknown' }, unknownAmount(value, t)));
    }
    function UsageDetails({ value, t, raw = false }) {
      return h(React.Fragment, null,
        h(Amount, { value, t, raw }),
        costEntries(value.costs, raw).length > 0 && h('div', { className: 'pb-time' }, costLabel(value, t, raw)),
        value.missing > 0 && h('p', { className: 'pb-notice' }, t('missingUsage')),
        value.unpriced > 0 && h('p', { className: 'pb-notice' }, t('unpriced')),
      );
    }
    function ModelUsage({ group, t, raw = false }) {
      return h('div', { className: 'pb-model' }, h('div', { className: 'pb-model-name', translate: 'no' }, group.model), h('div', { className: 'pb-model-source', translate: 'no' }, group.provider), h(UsageDetails, { value: group, t, raw, compact: true }));
    }
    // Prefer a vendor's explicit available balance; otherwise sum wallet categories by currency.
    // Decimal arithmetic stays exact, including large balances and negative amounts.
    function overviewBalances(balances = []) {
      const currencies = [...new Set(balances.filter(x => ['available', 'toppedUp', 'granted'].includes(x.kind)).map(x => x.currency))];
      return currencies.map(currency => {
        const rows = balances.filter(x => x.currency === currency);
        const available = rows.find(x => x.kind === 'available');
        if (available) return available;
        const wallets = rows.filter(x => ['toppedUp', 'granted'].includes(x.kind));
        const scale = Math.max(0, ...wallets.map(x => (String(x.amount).split('.')[1] || '').length));
        const total = wallets.reduce((sum, x) => {
          const [whole, fraction = ''] = String(x.amount).split('.');
          return sum + BigInt(whole + fraction.padEnd(scale, '0'));
        }, 0n);
        const digits = (total < 0n ? -total : total).toString().padStart(scale + 1, '0');
        return { currency, amount: (total < 0n ? '-' : '') + (scale ? digits.slice(0, -scale) + '.' + digits.slice(-scale) : digits) };
      });
    }
    function ProviderBalance({ provider, t, locale, expanded, onExpanded }) {
      const balances = overviewBalances(provider.balances);
      const amount = (x, overview = false) => h('span', { className: 'pb-money', key: x.currency }, h('span', { className: 'pb-unit' }, x.currency + ' '), (overview ? overviewText : decimalText)(x.amount));
      return h('details', { className: 'pb-wallet', open: expanded, onToggle: e => { if (e.currentTarget.open !== expanded) onExpanded(e.currentTarget.open); } },
        h('summary', { className: 'pb-wallet-summary' }, h('span', { className: 'pb-wallet-name', translate: 'no' }, provider.name),
          h('span', { className: 'pb-wallet-amount' }, provider.status === 'ready' && balances.length ? balances.map(x => amount(x, true)) : h('span', { className: 'pb-amount-unknown' }, t(provider.status === 'signedOut' ? 'signedOut' : provider.status === 'unsupported' ? provider.reason === 'aliyunBilling' ? 'compactNotConnected' : 'compactUnsupported' : 'compactUnavailable'))), h('span', { className: 'pb-chevron', 'aria-hidden': true }, '›')),
        h('div', { className: 'pb-wallet-detail' }, h('div', { className: 'pb-tag' }, t(provider.kind)),
          provider.status === 'ready' ? provider.balances.map((x, i) => h('div', { className: 'pb-row', key: i }, h('span', null, t(x.kind)), h('span', { className: 'pb-value' }, amount(x)))) : h('p', { className: 'pb-status' }, t(provider.reason === 'aliyunBilling' ? 'aliyunBilling' : provider.status)),
          provider.updatedAt && h('div', { className: 'pb-time' }, t('updated') + ' ' + new Date(provider.updatedAt).toLocaleTimeString(locale)),
        ));
    }
    function SpendingBreakdown({ usage, t, tab, setTab }) {
      const id = React.useId(), tabs = ['models', 'sessions'];
      const chooseWithKey = (event, index) => {
        const next = event.key === 'ArrowRight' ? (index + 1) % 2 : event.key === 'ArrowLeft' ? (index + 1) % 2 : event.key === 'Home' ? 0 : event.key === 'End' ? 1 : -1;
        if (next < 0) return;
        event.preventDefault(); setTab(tabs[next]); event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[next]?.focus();
      };
      return h(React.Fragment, null,
        h('div', { className: 'pb-tabs', role: 'tablist', 'aria-label': t('usageDetails') }, tabs.map((key, index) => h('button', { type: 'button', className: 'pb-tab', key, role: 'tab', id: id + '-' + key, 'aria-selected': tab === key, 'aria-controls': id + '-panel', tabIndex: tab === key ? 0 : -1, onClick: () => setTab(key), onKeyDown: e => chooseWithKey(e, index) }, t(key === 'models' ? 'byModel' : 'bySession')))),
        h('div', { key: tab, className: 'pb-detail-list', role: 'tabpanel', id: id + '-panel', 'aria-labelledby': id + '-' + tab, tabIndex: 0 }, tab === 'models' ? (usage.groups?.length ? usage.groups.map(group => h(ModelUsage, { key: group.provider + '/' + group.model, group, t })) : h('p', { className: 'pb-empty' }, unknownAmount(usage, t))) : (usage.sessions?.length ? usage.sessions.map(session => h('details', { className: 'pb-session', key: session.id },
          h('summary', { className: 'pb-session-summary' }, h('span', { className: 'pb-session-name', translate: 'no' }, session.title || t('untitledSession')), h(Amount, { value: session, t, overview: true }), (session.missing > 0 || session.unpriced > 0) && session.costs.length > 0 && h('span', { className: 'pb-tag' }, t('partialEstimate')), h('span', { className: 'pb-chevron', 'aria-hidden': true }, '›')),
          h('div', { className: 'pb-session-detail' }, h(UsageDetails, { value: session, t }), session.groups.map(group => h(ModelUsage, { key: group.provider + '/' + group.model, group, t }))),
        )) : h('p', { className: 'pb-empty' }, unknownAmount(usage, t)))),
      );
    }
    function TurnUsage({ turn, useProjection, t }) {
      const value = useProjection('pipiluTokenUsage')?.turns?.[turn.turn];
      if (!value) return null;
      const costs = costEntries(value.costs, true);
      const summary = [t('turnUsage'), costs.length ? costs.map(x => x.currency + ' ' + overviewText(x.amount)).join(' · ') + ' · ' + costLabel(value, t, true) : unknownAmount(value, t)];
      return h('details', { className: 'pb-turn' }, h('style', null, turnCss), h('summary', null, summary.join(' · ')), h(UsageDetails, { value, t, raw: true }), Object.values(value.groups).map(group => h(ModelUsage, { key: group.provider + '/' + group.model, group, t, raw: true })), h('div', { className: 'pb-time' }, t('usageNote')));
    }
    const icon = () => h('svg', { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, 'aria-hidden': true }, h('rect', { x: 3, y: 5, width: 18, height: 15, rx: 4 }), h('path', { d: 'M3 9h18M17 13h4M17 16h4' }));
    const priceForm = price => ({ currency: price?.currency || 'CNY', input: price?.input === undefined ? '' : String(price.input), output: price?.output === undefined ? '' : String(price.output), cacheRead: price?.cacheRead === undefined ? '' : String(price.cacheRead), cacheWrite: price?.cacheWrite === undefined ? '' : String(price.cacheWrite) });
    function PricingEditor({ connection, t }) {
      const [info, setInfo] = React.useState(null), [key, setKey] = React.useState('');
      const [form, setForm] = React.useState(priceForm()), [errors, setErrors] = React.useState({}), [focusRequest, setFocusRequest] = React.useState(0);
      const [status, setStatus] = React.useState(''), [loadState, setLoadState] = React.useState('loading'), [saving, setSaving] = React.useState(false);
      const lifetime = React.useRef(null), selection = React.useRef(''), formElement = React.useRef(null), listId = React.useId();
      const load = async controller => {
        setLoadState('loading'); setStatus('');
        try {
          const result = await connection.rpc.call('/api', 'pipiluBalance/pricing', { args: {} }, controller.signal);
          if (!result.ok) throw new Error('pricing-unavailable');
          if (controller.signal.aborted) return;
          setInfo(result.value); setForm(priceForm(result.value.prices[selection.current])); setErrors({}); setLoadState('ready');
        } catch { if (!controller.signal.aborted) setLoadState('failed'); }
      };
      React.useEffect(() => {
        const controller = new AbortController(); lifetime.current = controller;
        load(controller);
        return () => controller.abort();
      }, [connection]);
      React.useEffect(() => {
        if (!focusRequest) return;
        const field = formElement.current?.querySelector('[aria-invalid="true"]');
        for (let parent = field?.parentElement; parent && parent !== formElement.current; parent = parent.parentElement) {
          if (parent.tagName === 'DETAILS') parent.open = true;
        }
        field?.focus();
      }, [focusRequest]);
      const select = value => {
        selection.current = value; setKey(value); setStatus(''); setErrors({}); setForm(priceForm(info?.prices[value]));
      };
      const save = async reset => {
        const nextErrors = {};
        if (key.length > 300 || !/^[a-z][a-z0-9-]*\/[^\s]+$/.test(key)) nextErrors.key = 'invalidModel';
        if (!reset) for (const name of ['input', 'output', 'cacheRead', 'cacheWrite']) {
          if (form[name] === '') { if (name === 'input' || name === 'output') nextErrors[name] = 'requiredPrice'; }
          else if (!/^\d+(?:\.\d{1,8})?$/.test(form[name]) || Number(form[name]) > 1000000) nextErrors[name] = 'invalidPrice';
        }
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length) { setFocusRequest(value => value + 1); return; }
        if (saving || !info) return;
        const controller = lifetime.current;
        setSaving(true); setStatus('');
        try {
          const result = await connection.rpc.call('/api', 'pipiluBalance/savePrice', { args: { key, value: reset ? null : form, revision: info.revision } }, controller.signal);
          if (!result.ok) throw new Error('price-save-failed');
          if (controller.signal.aborted) return;
          setInfo(result.value); setForm(priceForm(result.value.prices[key])); setStatus(reset ? 'resetSaved' : 'saved');
          connection.reconnect();
        } catch { if (!controller.signal.aborted) setStatus('priceError'); }
        finally { if (!controller.signal.aborted) setSaving(false); }
      };
      const field = (name, label, optional = false) => h('label', { className: 'pb-price-field', key: name }, t(label), h('input', { name, type: 'text', inputMode: 'decimal', autoComplete: 'off', spellCheck: false, required: !optional, value: form[name], placeholder: optional ? t('optional') : '0', 'aria-invalid': !!errors[name], 'aria-describedby': errors[name] ? listId + '-' + name : undefined, onChange: e => { setForm({ ...form, [name]: e.target.value }); setStatus(''); if (errors[name]) setErrors({ ...errors, [name]: undefined }); } }), errors[name] && h('span', { id: listId + '-' + name, className: 'pb-field-error' }, t(errors[name])));
      return h('form', { ref: formElement, className: 'pb-prices', noValidate: true, onSubmit: e => { e.preventDefault(); save(false); } },
        loadState !== 'ready' && h('div', { role: 'status', className: 'pb-status' }, t(loadState === 'loading' ? 'priceLoad' : 'priceLoadError'), loadState === 'failed' && h('button', { type: 'button', className: 'pb-action', onClick: () => load(lifetime.current) }, t('reloadPrices'))),
        h('fieldset', { className: 'pb-price-fieldset', disabled: saving || loadState !== 'ready' },
          h('label', { className: 'pb-price-field' }, t('modelKey'), h('input', { name: 'model', required: true, list: listId, value: key, placeholder: 'provider/model', autoComplete: 'off', spellCheck: false, 'aria-invalid': !!errors.key, 'aria-describedby': errors.key ? listId + '-model-error' : undefined, onChange: e => select(e.target.value) }), errors.key && h('span', { id: listId + '-model-error', className: 'pb-field-error' }, t(errors.key))),
          h('datalist', { id: listId }, (info?.models || []).map(value => h('option', { key: value, value }))),
          key && h('div', { className: 'pb-time' }, t(info?.prices[key] ? 'customPrice' : 'defaultPrice')),
          h('label', { className: 'pb-price-field' }, t('currency'), h('select', { name: 'currency', value: form.currency, autoComplete: 'off', onChange: e => { setForm({ ...form, currency: e.target.value }); setStatus(''); } }, h('option', { value: 'CNY' }, 'CNY · ¥'), h('option', { value: 'USD' }, 'USD · $'))),
          h('div', { className: 'pb-time' }, t('perMillion')),
          h('div', { className: 'pb-price-grid' }, field('input', 'priceInput'), field('output', 'priceOutput')),
          h('details', null, h('summary', null, t('cacheOptional')), h('div', { className: 'pb-price-grid' }, field('cacheRead', 'priceRead', true), field('cacheWrite', 'priceWrite', true))),
          h('div', { className: 'pb-time' }, t('priceHint')),
          h('div', { className: 'pb-actions' }, h('button', { type: 'submit', className: 'pb-action pb-primary', disabled: saving || !info }, t(saving ? 'saving' : 'save')), h('button', { type: 'button', className: 'pb-action', disabled: saving || !info?.prices[key], onClick: () => save(true) }, t('resetPrice'))),
        ),
        status && h('div', { role: 'status', className: 'pb-status' }, t(status), status === 'priceError' && h('button', { type: 'button', className: 'pb-action', onClick: () => load(lifetime.current) }, t('reloadPrices'))),
      );
    }
    function Balance({ wide, t, connection, locale }) {
      const [open, setOpen] = React.useState(false), [pinned, setPinned] = React.useState(false);
      const [view, setView] = React.useState('overview'), [usageTab, setUsageTab] = React.useState('models');
      const [expandedProviders, setExpandedProviders] = React.useState([]);
      const [usage, setUsage] = React.useState(null), [usageUpdatedAt, setUsageUpdatedAt] = React.useState(null);
      const [data, setData] = React.useState(null), [busy, setBusy] = React.useState(false), [error, setError] = React.useState(false), [usageError, setUsageError] = React.useState(false);
      const panel = React.useRef(null), leaveTimer = React.useRef(null), suppressFocus = React.useRef(false);
      const anchor = React.useRef(null), trigger = React.useRef(null), request = React.useRef(null), sequence = React.useRef(0);
      const id = React.useId(), heading = React.useRef(null), spendLink = React.useRef(null), pricesLink = React.useRef(null);
      const navigate = destination => { setView(destination); setPinned(true); };
      const returnToOverview = () => {
        const previous = view; setView('overview');
        queueMicrotask(() => (previous === 'pricing' ? pricesLink : spendLink).current?.focus());
      };
      React.useEffect(() => { if (!open) { setView('overview'); setUsageTab('models'); setExpandedProviders([]); } }, [open]);
      React.useEffect(() => { if (open && view !== 'overview') heading.current?.focus(); }, [view]);
      const refresh = React.useCallback(async (force = false) => {
        if (request.current) return;
        const controller = new AbortController(); request.current = controller;
        const generation = ++sequence.current;
        const current = () => generation === sequence.current && !controller.signal.aborted;
        setBusy(true); setError(false); setUsageError(false);
        // Connection generations are not account identities. Re-read balances without reusing an unverified account snapshot.
        setData(null);
        const balances = connection.rpc.call('/api', 'pipiluBalance/snapshot', { args: { client: { locale: locale.getSnapshot().active, timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60, refresh: force === true } } }, controller.signal).then(result => {
          if (!result.ok) throw new Error('balance-query-failed');
          if (current()) setData(result.value);
        }).catch(() => { if (current()) setError(true); });
        const usageRequest = connection.rpc.call('/api', 'pipiluBalance/usageSummary', { args: {} }, controller.signal).then(result => {
          if (!result.ok || result.value.status === 'unavailable') throw new Error('usage-unavailable');
          if (current()) { setUsage(result.value); setUsageUpdatedAt(Date.now()); }
        }).catch(() => { if (current()) setUsageError(true); });
        await Promise.allSettled([balances, usageRequest]);
        if (request.current === controller) { request.current = null; setBusy(false); }
      }, [connection, locale]);
      React.useEffect(() => () => { sequence.current++; request.current?.abort(); clearTimeout(leaveTimer.current); }, []);
      React.useLayoutEffect(() => {
        if (!open || !panel.current || !trigger.current) return;
        const pop = panel.current;
        pop.showPopover();
        const place = () => {
          const rect = trigger.current.getBoundingClientRect(), width = pop.offsetWidth, height = pop.offsetHeight;
          pop.style.left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)) + 'px';
          pop.style.top = Math.max(12, Math.min(rect.top - height - 8, window.innerHeight - height - 12)) + 'px';
        };
        place();
        const observer = new ResizeObserver(place); observer.observe(pop);
        window.addEventListener('resize', place);
        return () => { observer.disconnect(); window.removeEventListener('resize', place); if (pop.matches(':popover-open')) pop.hidePopover(); };
      }, [open, wide]);
      const close = () => { setOpen(false); setPinned(false); suppressFocus.current = true; trigger.current?.focus(); suppressFocus.current = false; };
      React.useEffect(() => {
        if (!open) return;
        refresh();
        const timer = setInterval(refresh, 60000);
        const dismiss = e => { if (!anchor.current?.contains(e.target)) { setOpen(false); setPinned(false); } };
        const escape = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
        document.addEventListener('pointerdown', dismiss); document.addEventListener('keydown', escape);
        return () => { clearInterval(timer); document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape); sequence.current++; request.current?.abort(); request.current = null; setBusy(false); };
      }, [open, refresh]);
      // Reconnection invalidates account-derived results and cancels the old generation.
      React.useEffect(() => connection.generation.subscribe(() => {
        sequence.current++; request.current?.abort(); request.current = null;
        setData(null); setUsage(null); setUsageUpdatedAt(null); setExpandedProviders([]); setError(false); setUsageError(false); setBusy(false);
        if (open) refresh();
      }), [connection, open, refresh]);
      const usageTitle = usage?.day && usage.day !== new Date(Date.now() + 28800000).toISOString().slice(0, 10) ? t('usageSnapshot') : t('today');
      return h('div', { ref: anchor, className: 'pb-seat ' + (wide ? 'pb-wide' : 'pb-rail'),
        onPointerEnter: () => { clearTimeout(leaveTimer.current); setOpen(true); }, onPointerLeave: () => { leaveTimer.current = setTimeout(() => { if (!pinned && !anchor.current?.contains(document.activeElement)) setOpen(false); }, 180); },
        onBlur: e => { if (!e.currentTarget.contains(e.relatedTarget) && !pinned) setOpen(false); },
      }, h('style', null, css),
        h('button', { ref: trigger, type: 'button', className: 'pb-chip', 'aria-label': t('title'), 'aria-expanded': open, 'aria-controls': id, 'aria-haspopup': 'dialog', onFocus: () => { if (!suppressFocus.current) setOpen(true); }, onClick: () => { setPinned(!pinned); setOpen(!pinned); } }, icon(), wide ? h('span', null, t('trigger')) : null),
        open && h('section', { ref: panel, popover: 'manual', id, role: 'dialog', 'aria-label': t('title'), className: 'pb-pop', 'data-view': view, onPointerEnter: () => { clearTimeout(leaveTimer.current); setOpen(true); } },
          view !== 'overview' && h('button', { type: 'button', className: 'pb-action pb-back', onClick: returnToOverview }, '‹ ' + t('back')),
          h('div', { className: 'pb-head' }, h('h2', { className: 'pb-title', ref: heading, tabIndex: -1 }, view === 'usage' ? usageTitle : t(view === 'pricing' ? 'pricing' : 'title')),
            h('div', { className: 'pb-actions' }, view === 'overview' && h('button', { type: 'button', className: 'pb-action', ref: pricesLink, 'aria-label': t('pricing'), onClick: () => navigate('pricing') }, t('pricingAction')),
              view !== 'pricing' && h('button', { type: 'button', className: 'pb-action', disabled: busy, onClick: () => refresh(true) }, t('refresh')),
              h('button', { type: 'button', className: 'pb-action pb-close', 'aria-label': t('close'), onClick: close }, '×'))),
          view === 'overview' && h(React.Fragment, null,
            data?.providers.length > 4 && h('div', { className: 'pb-list-hint' }, t('providerCount').replace('{count}', data.providers.length)),
            h('section', { className: 'pb-overview', 'aria-label': t('accounts'), tabIndex: 0 },
              error && h('p', { className: 'pb-status', role: 'status' }, t('failed')),
              !data ? !error && h('p', { className: 'pb-status' }, t('loading')) : data.providers.length === 0 ? h('p', { className: 'pb-status' }, t('empty')) : data.providers.map(provider => h(ProviderBalance, { key: provider.id, provider, t, locale: locale.getSnapshot().active, expanded: expandedProviders.includes(provider.id), onExpanded: expanded => { setExpandedProviders(previous => expanded ? [...new Set([...previous, provider.id])] : previous.filter(id => id !== provider.id)); if (expanded) setPinned(true); } }))),
            h('button', { type: 'button', className: 'pb-spend-link', ref: spendLink, onClick: () => navigate('usage') },
              h('span', { className: 'pb-spend-label' }, usageTitle, h('span', { className: 'pb-tag' }, t(usage?.unpriced || usage?.missing || usage?.status === 'partial' ? 'partialEstimate' : 'shortEstimate')), h('span', { className: 'pb-chevron', 'aria-hidden': true }, '›')),
              usage ? h(Amount, { value: usage, t, overview: true }) : h('span', { className: 'pb-amount-unknown' }, t(usageError ? 'usageUnavailable' : 'loading'))),
            usageError && usage && h('p', { className: 'pb-notice', role: 'status' }, t('staleUsage')),
            h('div', { className: 'pb-footer' }, h('span', null, t('localScope')), h('span', { role: 'status' }, busy ? t('refreshing') : usage?.day && usageTitle !== t('today') ? usage.day : usageUpdatedAt ? t('updated') + ' ' + new Date(usageUpdatedAt).toLocaleTimeString(locale.getSnapshot().active) : '')),
          ),
          view === 'usage' && h(React.Fragment, null,
            usageError && h('p', { className: 'pb-status', role: 'status' }, t(usage ? 'staleUsage' : 'usageUnavailable')),
            !usage ? !usageError && h('p', { className: 'pb-status' }, t('loading')) : h(React.Fragment, null,
              h('div', { className: 'pb-spend-total' }, h(UsageDetails, { value: usage, t }), h('div', { className: 'pb-time' }, usage.day + (usageUpdatedAt ? ' · ' + t('updated') + ' ' + new Date(usageUpdatedAt).toLocaleTimeString(locale.getSnapshot().active) : ''))),
              usage.status === 'partial' && h('p', { className: 'pb-notice' }, t('partialUsage') + ' (' + usage.failedSessions + ')'),
              h(SpendingBreakdown, { usage, t, tab: usageTab, setTab: setUsageTab }),
            ), h('p', { className: 'pb-note' }, t('usageNote'))),
          view === 'pricing' && h(PricingEditor, { connection, t }),
        ),
      );
    }
    return {
      inject: ['slots', 'connection', 'locale'],
      apply(ctx) {
        ctx.locale.register('pipilu.balance', { zh, en });
        ctx.slots.inject('conversation.chat.turnTail', () => ctx.slots.register({ name: 'conversation.chat.turnTail', id: 'pipilu-turn-usage', order: 90, locale: 'pipilu.balance' }, TurnUsage));
        ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({ name: 'sidebar.footer.action', id: 'pipilu-balance', order: 100, locale: 'pipilu.balance', inject: () => ({ connection: ctx.connection, locale: ctx.locale }) }, Balance));
      },
    };
  },
});
