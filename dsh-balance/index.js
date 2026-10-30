import { createHash } from 'node:crypto';
import { TypertRemoteService, Remote } from '@deepseek-ai/dsh-typert-protocol';
import { APP_IDENTITY } from '@deepseek-ai/dsh-llm';
import { adapterFor, queryBalance, balanceCache } from './balances.js';

// Standard JS equivalent of @Remote; uses the public decorator, no private symbols.
const initializers = [];
export default class BalanceService extends TypertRemoteService {
  static inject = ['llm', 'settings', 'credentials'];
  constructor(ctx) {
    super(ctx, 'pipiluBalance', { namespace: 'pipiluBalance' });
    for (const init of initializers) init.call(this);
    this.lifetime = new AbortController();
    this.cache = balanceCache((adapter, key) => queryBalance(adapter, key, fetch, this.lifetime.signal));
    ctx.effect(() => () => { this.lifetime.abort(); this.cache.clear(); });
  }
  async snapshot(client) {
    if (!client || typeof client.locale !== 'string' || client.locale.length > 40 || !Number.isInteger(client.timezoneOffsetSeconds) || Math.abs(client.timezoneOffsetSeconds) > 86400) throw new TypeError('invalid-client');
    if (client.refresh === true) this.cache.clear();
    const directory = this.ctx.llm.listConfigurableProviders();
    const forms = this.ctx.settings.describe();
    const tasks = [];
    const account = this.ctx.get('deepseekAccount');
    if (account) tasks.push((async () => {
      const base = { id: 'deepseek-account', name: 'DeepSeek', kind: 'officialAccount' };
      try {
        if ((await account.getState()).status !== 'credential-stored') return { ...base, status: 'signedOut' };
        const result = await account.getBalance({ version: APP_IDENTITY.version, locale: client.locale, timezoneOffsetSeconds: client.timezoneOffsetSeconds });
        if (result === null) return { ...base, status: 'signedOut' };
        if (result.status !== 'ready') return { ...base, status: 'unavailable' };
        // Keep distinct wallet categories. Never convert currencies or infer token counts.
        const balances = [...result.value.map(x => ({ kind: 'toppedUp', amount: x.balance, currency: x.currency })), ...result.bonusWallets.map(x => ({ kind: 'granted', amount: x.balance, currency: x.currency }))];
        return { ...base, status: 'ready', balances, updatedAt: Date.now() };
      } catch { return { ...base, status: 'unavailable' }; }
    })());
    for (const provider of directory) {
      if (provider.provider === 'deepseek-account') continue;
      const form = forms.find(x => x.ns === provider.settingsNs);
      let config = form?.value;
      for (const segment of provider.settingsPath || []) config = config?.[segment];
      const ref = config?.apiKeyEnv || (provider.provider === 'deepseek-official' ? 'DEEPSEEK_API_KEY' : undefined);
      const credential = ref ? await this.ctx.credentials.resolve(ref) : undefined;
      // The catalog includes dormant vendors. Only show explicit config or usable credentials.
      if (!config && !credential) continue;
      if (provider.provider === 'deepseek-official' && !credential) continue;
      const baseURL = config?.baseURL || provider.defaultBaseURL || (provider.provider === 'deepseek-official' ? 'https://api.deepseek.com' : '');
      const adapter = adapterFor(baseURL);
      const base = { id: provider.provider, name: config?.displayName || provider.displayName || provider.provider, kind: provider.provider === 'deepseek-official' ? 'officialApi' : 'thirdParty' };
      if (!adapter) { tasks.push(Promise.resolve({ ...base, status: 'unsupported' })); continue; }
      if (!credential?.value) { tasks.push(Promise.resolve({ ...base, status: 'missingCredential' })); continue; }
      const fingerprint = createHash('sha256').update(adapter.url).update('\0').update(credential.value).digest('hex');
      tasks.push(this.cache.get(fingerprint, adapter, credential.value).then(result => ({ ...base, ...result })));
    }
    return { providers: await Promise.all(tasks), checkedAt: Date.now() };
  }
}
Remote(BalanceService.prototype.snapshot, { kind: 'method', name: 'snapshot', static: false, private: false, addInitializer: init => initializers.push(init) });
