/** No secrets or provider payloads leave this module. Only documented hosts are queried. */
export function decimal(value) {
  if ((typeof value !== 'string' && typeof value !== 'number') || !/^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(String(value))) throw new Error('invalid-balance');
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('invalid-balance');
  return String(value).replace(/^(-?)\./, '$10.');
}
export function subtract(a, b) {
  a = decimal(a); b = decimal(b);
  const scale = Math.max((a.split('.')[1] || '').length, (b.split('.')[1] || '').length);
  const integer = s => BigInt(s.replace('.', '') + '0'.repeat(scale - (s.split('.')[1] || '').length));
  const n = integer(a) - integer(b), sign = n < 0n ? '-' : '', digits = (n < 0n ? -n : n).toString().padStart(scale + 1, '0');
  return sign + (scale ? digits.slice(0, -scale) + '.' + digits.slice(-scale) : digits);
}
const row = (kind, amount, currency) => ({ kind, amount: decimal(amount), currency });
export function adapterFor(baseURL) {
  let url;
  try { url = new URL(baseURL); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash) return null;
  const hosts = {
    'api.deepseek.com': ['deepseek', '/user/balance'],
    'openrouter.ai': ['openrouter', '/api/v1/credits'],
    'api.siliconflow.cn': ['siliconflow', '/v1/user/info'],
  };
  const spec = hosts[url.hostname];
  // A custom reverse proxy must never receive a different vendor's credentials.
  if (!spec || !['', '/', '/v1', '/v1/', '/api/v1', '/api/v1/'].includes(url.pathname)) return null;
  return { kind: spec[0], url: url.origin + spec[1] };
}
// Explanation only: this does not authorize or perform a billing request.
export function unsupportedReason(baseURL) {
  let url;
  try { url = new URL(baseURL); } catch { return undefined; }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash || !/^\/compatible-mode\/v1\/?$/.test(url.pathname)) return undefined;
  const host = url.hostname;
  if (['dashscope.aliyuncs.com', 'dashscope-intl.aliyuncs.com', 'dashscope-us.aliyuncs.com'].includes(host) || /^[a-z0-9-]+\.[a-z0-9-]+\.maas\.aliyuncs\.com$/.test(host)) return 'aliyunBilling';
  return undefined;
}
export function parseBalance(kind, data) {
  if (kind === 'deepseek') {
    if (typeof data?.is_available !== 'boolean' || !Array.isArray(data.balance_infos) || !data.balance_infos.length) throw new Error('invalid-balance');
    return data.balance_infos.flatMap(x => {
      if (!['CNY', 'USD'].includes(x.currency)) throw new Error('invalid-balance');
      return [row('available', x.total_balance, x.currency), row('toppedUp', x.topped_up_balance, x.currency), row('granted', x.granted_balance, x.currency)];
    });
  }
  if (kind === 'openrouter') return [row('available', subtract(data?.data?.total_credits, data?.data?.total_usage), 'USD')];
  if (kind === 'siliconflow') {
    if (data?.status !== true || !data.data) throw new Error('invalid-balance');
    return [row('available', data.data.totalBalance, 'CNY'), row('toppedUp', data.data.chargeBalance, 'CNY'), row('granted', data.data.balance, 'CNY')];
  }
  throw new Error('unsupported');
}
export async function queryBalance(adapter, key, fetcher = fetch, signal) {
  try {
    const response = await fetcher(adapter.url, { headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' }, redirect: 'error', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000) });
    if (!response.ok) return { status: response.status === 401 || response.status === 403 ? 'unauthorized' : response.status === 429 ? 'rateLimited' : 'unavailable' };
    const text = await response.text();
    if (text.length > 131072) return { status: 'unavailable' };
    return { status: 'ready', balances: parseBalance(adapter.kind, JSON.parse(text)), updatedAt: Date.now() };
  } catch { return { status: 'unavailable' }; }
}
/** TTL and single-flight are scoped to a plugin lifetime and credential fingerprint. */
export function balanceCache(load, ttl = 60000, now = Date.now) {
  const values = new Map(), pending = new Map();
  let revision = 0;
  return {
    clear() { revision++; values.clear(); },
    async get(key, ...args) {
      const hit = values.get(key);
      if (hit && now() - hit.at < ttl) return hit.value;
      if (pending.has(key)) return pending.get(key);
      const generation = revision;
      const request = Promise.resolve().then(() => load(...args)).then(value => {
        if (generation === revision) values.set(key, { at: now(), value });
        return value;
      }).finally(() => pending.delete(key));
      pending.set(key, request);
      return request;
    },
  };
}
