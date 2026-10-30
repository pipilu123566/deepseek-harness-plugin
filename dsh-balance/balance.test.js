import test from 'node:test';
import assert from 'node:assert/strict';
import { adapterFor, parseBalance, queryBalance, balanceCache, subtract, unsupportedReason } from './balances.js';

test('exact endpoint allowlist rejects relays, credentials, ports and query strings', () => {
  assert.equal(adapterFor('https://api.deepseek.com/v1').url, 'https://api.deepseek.com/user/balance');
  assert.equal(adapterFor('https://openrouter.ai/api/v1').kind, 'openrouter');
  for (const url of ['http://api.deepseek.com', 'https://api.deepseek.com.evil.test', 'https://secret@api.deepseek.com', 'https://api.deepseek.com:8443', 'https://api.deepseek.com?key=x', 'https://api.deepseek.com/proxy', 'https://unknown.test/v1']) assert.equal(adapterFor(url), null);
});

test('money remains decimal and currency-specific; invalid data never becomes zero', () => {
  assert.equal(subtract('100.5', '25.75'), '74.75');
  assert.equal(subtract('0.3', '0.2'), '0.1');
  assert.equal(subtract('9007199254740993.01', '0.01'), '9007199254740993.00');
  assert.equal(subtract('1', '2.25'), '-1.25');
  const balances = parseBalance('deepseek', { is_available: false, balance_infos: [{ currency: 'CNY', total_balance: '-0.01', granted_balance: '0', topped_up_balance: '-0.01' }, { currency: 'USD', total_balance: '1', granted_balance: '0', topped_up_balance: '1' }] });
  assert.deepEqual(balances.filter(x => x.kind === 'available').map(x => x.currency), ['CNY', 'USD']);
  assert.equal(parseBalance('siliconflow', { status: true, data: { totalBalance: '88.88', chargeBalance: '88', balance: '.88' } }).length, 3);
});

test('missing fields and authentication failures cannot display fabricated balances', async () => {
  for (const payload of [{}, { is_available: true, balance_infos: [] }, { is_available: true, balance_infos: [{ currency: 'CNY', total_balance: null }] }]) assert.throws(() => parseBalance('deepseek', payload));
  const adapter = adapterFor('https://api.deepseek.com');
  for (const [http, expected] of [[401, 'unauthorized'], [403, 'unauthorized'], [429, 'rateLimited'], [500, 'unavailable']]) {
    const result = await queryBalance(adapter, 'SECRET', async (url, init) => {
      assert.equal(init.redirect, 'error'); assert.equal(init.headers.Authorization, 'Bearer SECRET');
      return { ok: false, status: http };
    });
    assert.deepEqual(result, { status: expected });
    assert.ok(!JSON.stringify(result).includes('SECRET'));
  }
  assert.deepEqual(await queryBalance(adapter, 'SECRET', async () => { throw new Error('SECRET'); }), { status: 'unavailable' });
  assert.deepEqual(await queryBalance(adapter, 'SECRET', async () => ({ ok: true, text: async () => '<html>sign in</html>' })), { status: 'unavailable' });
});

test('cache coalesces hover requests and isolates credentials and expiry', async () => {
  let count = 0, clock = 0;
  const cache = balanceCache(async value => { count++; return value; }, 60, () => clock);
  assert.deepEqual(await Promise.all([cache.get('key1', 1), cache.get('key1', 2)]), [1, 1]);
  assert.equal(count, 1);
  assert.equal(await cache.get('key2', 3), 3);
  clock = 61;
  assert.equal(await cache.get('key1', 4), 4);
  cache.clear();
  assert.equal(await cache.get('key1', 5), 5);
});

test('unknown configured providers never receive network requests or expose credentials', async t => {
  const { Context } = await import('@deepseek-ai/cordis');
  const { default: BalanceService } = await import('./index.js');
  const ctx = new Context();
  t.after(() => ctx.fiber.dispose());
  ctx.provide('llm', { listConfigurableProviders: () => [{
    provider: 'custom-private', displayName: 'Custom provider', settingsNs: 'fixture-custom', settingsPath: [],
  }] });
  ctx.provide('settings', { describe: () => [{ ns: 'fixture-custom', value: {
    baseURL: 'https://private-provider.invalid/v1', apiKeyEnv: 'FIXTURE_KEY',
  } }] });
  ctx.provide('credentials', { resolve: async reference => {
    assert.equal(reference, 'FIXTURE_KEY');
    return { value: 'fixture-only-never-send-this' };
  } });
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async () => { requests++; throw new Error('unexpected-network-request'); });
  const result = await new BalanceService(ctx).snapshot({ locale: 'en', timezoneOffsetSeconds: 0 });
  assert.equal(result.providers.length, 1);
  assert.equal(result.providers[0].status, 'unsupported');
  assert.equal(result.providers[0].balances, undefined);
  assert.equal(requests, 0);
  assert.ok(!JSON.stringify(result).includes('fixture-only-never-send-this'));
});

test('native account async state and wallet categories are preserved; dormant providers stay hidden', async () => {
  const { Context } = await import('@deepseek-ai/cordis');
  const { default: BalanceService } = await import('./index.js');
  const ctx = new Context();
  ctx.provide('llm', { listConfigurableProviders: () => [
    { provider: 'deepseek-account' },
    { provider: 'deepseek-official', settingsNs: 'llm-deepseek', settingsPath: [] },
    { provider: 'unconfigured', settingsNs: 'llm-pi-ai', settingsPath: ['providers', 'unconfigured'] },
    { provider: 'custom', displayName: 'Custom', settingsNs: 'llm-pi-ai', settingsPath: ['providers', 'custom'] },
  ] });
  ctx.provide('settings', { describe: () => [{ ns: 'llm-pi-ai', value: { providers: { custom: { baseURL: 'https://relay.test/v1' } } } }] });
  ctx.provide('credentials', { resolve: async () => undefined });
  let signedIn = true;
  ctx.provide('deepseekAccount', {
    getState: async () => ({ status: signedIn ? 'credential-stored' : 'signed-out' }),
    getBalance: async () => ({ status: 'ready', value: [{ currency: 'CNY', balance: '11.00' }], bonusWallets: [{ currency: 'USD', balance: '2.0001' }] }),
  });
  const service = new BalanceService(ctx);
  const request = { locale: 'zh', timezoneOffsetSeconds: 28800 };
  const result = await service.snapshot(request);
  assert.deepEqual(result.providers.map(x => x.id), ['deepseek-account', 'custom']);
  assert.deepEqual(result.providers[0].balances, [{ kind: 'toppedUp', amount: '11.00', currency: 'CNY' }, { kind: 'granted', amount: '2.0001', currency: 'USD' }]);
  assert.equal(result.providers[1].status, 'unsupported');
  signedIn = false;
  assert.equal((await service.snapshot(request)).providers[0].status, 'signedOut');
  await ctx.fiber.dispose();
});

test('client uses the requested footer slot and opens on hover with click-to-pin', async () => {
  const { readFileSync } = await import('node:fs');
  const { runInNewContext } = await import('node:vm');
  let module, registration, View, cursor = 0, later;
  const hooks = [];
  const React = {
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
    useState: initial => { const i = cursor++; if (!(i in hooks)) hooks[i] = initial; return [hooks[i], value => { hooks[i] = typeof value === 'function' ? value(hooks[i]) : value; }]; },
    useRef: initial => { const i = cursor++; return hooks[i] ??= { current: initial }; },
    useId: () => 'balance-dialog', useCallback: fn => fn, useEffect: () => {}, useLayoutEffect: () => {},
  };
  runInNewContext(readFileSync(new URL('./client.js', import.meta.url), 'utf8'), { window: { __ModuleLoader__: { load: value => { module = value; } } }, document: { activeElement: null }, setTimeout: fn => { later = fn; }, clearTimeout: () => {} });
  const plugin = module.factory(name => { assert.equal(name, 'react'); return React; });
  plugin.apply({ locale: { register: () => {} }, slots: { inject: (name, callback) => { assert.ok(['sidebar.footer.action', 'conversation.chat.turnTail'].includes(name)); callback(); }, register: (options, component) => { if (options.name === 'sidebar.footer.action') { registration = options; View = component; } } } });
  assert.equal(registration.id, 'pipilu-balance');
  const props = { wide: true, t: key => key, connection: {}, locale: {} };
  const render = () => { cursor = 0; return View(props); };
  const section = node => node.children.find(x => x?.type === 'section');
  let tree = render();
  assert.ok(!section(tree));
  tree.props.onPointerEnter(); tree = render();
  assert.equal(section(tree).props.popover, 'manual');
  tree.props.onPointerLeave(); later(); tree = render();
  assert.ok(!section(tree));
  tree.children.find(x => x?.type === 'button').props.onClick(); tree = render();
  tree.props.onPointerLeave(); later(); tree = render();
  assert.ok(section(tree));
});


test('Aliyun inference providers explain separate billing access without sending model keys', async t => {
  const endpoint = 'https://workspace-test.cn-beijing.maas.aliyuncs.com/compatible-mode/v1';
  for (const url of [endpoint, 'https://dashscope.aliyuncs.com/compatible-mode/v1/']) assert.equal(unsupportedReason(url), 'aliyunBilling');
  for (const url of ['https://qwen.proxy.test/compatible-mode/v1', endpoint + '?key=test', endpoint.replace('aliyuncs.com', 'aliyuncs.com.evil.test'), endpoint.replace('https:', 'http:')]) assert.equal(unsupportedReason(url), undefined);
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async () => { requests++; throw new Error('Unexpected request'); });
  const { Context } = await import('@deepseek-ai/cordis');
  const { default: BalanceService } = await import('./index.js');
  const ctx = new Context();
  t.after(() => ctx.fiber.dispose());
  ctx.provide('llm', { listConfigurableProviders: () => [{ provider: 'qwen', settingsNs: 'test-qwen', settingsPath: [] }] });
  ctx.provide('settings', { describe: () => [{ ns: 'test-qwen', value: { baseURL: endpoint, apiKeyEnv: 'TEST_MODEL_KEY', models: Array.from({ length: 30 }, (_, i) => ({ id: 'model-' + i })) } }] });
  ctx.provide('credentials', { resolve: async () => ({ value: 'test-only-inference-key' }) });
  const service = new BalanceService(ctx);
  const snapshot = await service.snapshot({ locale: 'zh', timezoneOffsetSeconds: 28800 });
  assert.deepEqual(snapshot.providers, [{ id: 'qwen', name: 'qwen', kind: 'thirdParty', status: 'unsupported', reason: 'aliyunBilling' }]);
  assert.equal(requests, 0);
  assert.ok(!JSON.stringify(snapshot).includes('test-only-inference-key'));
});
