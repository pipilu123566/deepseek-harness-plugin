import test from 'node:test';
import assert from 'node:assert/strict';
import { Context } from '@deepseek-ai/cordis';
import { LlmRuntime } from '@deepseek-ai/dsh-llm';
import { TypertRemoteService, remoteMethods } from '@deepseek-ai/dsh-typert-protocol';
import BalanceService from './index.js';

const request = { locale: 'zh', timezoneOffsetSeconds: 28800 };
const testCredential = 'test-only-balance-credential';

// Real Cordis fibers, LLM directory, and Typert service metadata. Settings is a
// read-only configuration fixture; credentials and HTTP never reach real data.
// This is component lifecycle coverage, not a profile Loader or RPC/UI test.
async function createHost(t) {
  const ctx = new Context();
  t.after(() => ctx.fiber.dispose());
  await ctx.plugin(LlmRuntime);
  ctx.llm.registerConfigurableProviders([{
    provider: 'deepseek-official', displayName: 'Test DeepSeek',
    settingsNs: 'test-balances', settingsPath: [],
    defaultBaseURL: 'https://api.deepseek.com',
  }]);
  ctx.provide('settings', {
    describe: () => [{ ns: 'test-balances', value: {
      baseURL: 'https://api.deepseek.com', apiKeyEnv: 'TEST_BALANCE_KEY',
    } }],
  });
  ctx.provide('credentials', {
    resolve: async reference => {
      assert.equal(reference, 'TEST_BALANCE_KEY');
      return { value: testCredential };
    },
  });
  return ctx;
}

async function mountBalance(ctx) {
  const fiber = await ctx.plugin(BalanceService);
  const service = ctx.get('pipiluBalance');
  assert.ok(service instanceof TypertRemoteService);
  assert.equal(service.typertRemote.namespace, 'pipiluBalance');
  assert.deepEqual(remoteMethods(service).map(marker => marker.method), ['snapshot', 'usageSummary', 'pricing', 'savePrice']);
  return { fiber, service };
}

function balanceResponse(amount) {
  return new Response(JSON.stringify({
    is_available: true,
    balance_infos: [{ currency: 'CNY', total_balance: amount,
      topped_up_balance: amount, granted_balance: '0' }],
  }), { status: 200, headers: { 'content-type': 'application/json' } });
}

function verifyHttpBoundary(url, options) {
  assert.equal(url, 'https://api.deepseek.com/user/balance');
  assert.equal(options.headers.Authorization, `Bearer ${testCredential}`);
  assert.equal(options.redirect, 'error');
  assert.ok(options.signal instanceof AbortSignal);
}

function availableAmount(snapshot) {
  assert.equal(snapshot.providers.length, 1);
  assert.equal(snapshot.providers[0].status, 'ready');
  return snapshot.providers[0].balances.find(row => row.kind === 'available').amount;
}

test('disposing a mounted service aborts its in-flight HTTP request and allows a clean remount', { timeout: 5000 }, async t => {
  const ctx = await createHost(t);
  const started = Promise.withResolvers();
  let calls = 0, aborts = 0, activeRequests = 0, firstSignal;
  t.mock.method(globalThis, 'fetch', (url, options) => {
    verifyHttpBoundary(url, options);
    calls++;
    if (calls > 1) {
      assert.equal(options.signal.aborted, false, 'remount must own a fresh lifetime');
      return Promise.resolve(balanceResponse('22.50'));
    }
    firstSignal = options.signal;
    activeRequests++;
    return new Promise((resolve, reject) => {
      const abort = () => {
        aborts++;
        activeRequests--;
        reject(options.signal.reason);
      };
      if (options.signal.aborted) abort();
      else options.signal.addEventListener('abort', abort, { once: true });
      started.resolve();
    });
  });

  const first = await mountBalance(ctx);
  const pendingSnapshot = first.service.snapshot(request);
  await started.promise;
  assert.equal(firstSignal.aborted, false);
  assert.equal(activeRequests, 1);

  await first.fiber.dispose();
  const cancelledSnapshot = await pendingSnapshot;
  assert.equal(firstSignal.aborted, true);
  assert.equal(aborts, 1);
  assert.equal(activeRequests, 0);
  assert.equal(ctx.get('pipiluBalance'), undefined, 'unloaded service must leave the registry');
  assert.equal(cancelledSnapshot.providers[0].status, 'unavailable');
  assert.equal(cancelledSnapshot.providers[0].balances, undefined);
  assert.ok(!JSON.stringify(cancelledSnapshot).includes(testCredential));

  await first.fiber.dispose();
  assert.equal(aborts, 1, 'repeated disposal must not repeat cleanup');
  const second = await mountBalance(ctx);
  assert.notEqual(second.service, first.service);
  assert.equal(availableAmount(await second.service.snapshot(request)), '22.50');
  assert.equal(availableAmount(await second.service.snapshot(request)), '22.50');
  assert.equal(calls, 2, 'the new lifetime must make one fresh query, then cache it');
});

test('a cached balance never carries over when the plugin is disposed and mounted again', { timeout: 5000 }, async t => {
  const ctx = await createHost(t);
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    verifyHttpBoundary(url, options);
    assert.equal(options.signal.aborted, false);
    calls++;
    return balanceResponse(calls === 1 ? '10.00' : '7.25');
  });

  const first = await mountBalance(ctx);
  assert.equal(availableAmount(await first.service.snapshot(request)), '10.00');
  assert.equal(availableAmount(await first.service.snapshot(request)), '10.00');
  assert.equal(calls, 1, 'opening again in the same lifetime should use its cache');
  await first.fiber.dispose();
  assert.equal(ctx.get('pipiluBalance'), undefined);

  const second = await mountBalance(ctx);
  assert.equal(availableAmount(await second.service.snapshot(request)), '7.25');
  assert.equal(availableAmount(await second.service.snapshot(request)), '7.25');
  assert.equal(calls, 2, 'the same credential must be queried again after remount');
  await second.fiber.dispose();
  assert.equal(ctx.get('pipiluBalance'), undefined);
});

test('custom price writes use revision checks and can be read back and removed without model or balance requests', async t => {
  const ctx = new Context();
  t.after(() => ctx.fiber.dispose());
  const config = { prices: {} };
  let revision = 3, mutations = 0;
  ctx.provide('llm', {
    listProviders: () => [{ id: 'generic-provider' }],
    listModels: async () => [{ provider: 'generic-provider', id: 'example-model' }],
  });
  ctx.provide('credentials', { resolve: () => { throw new Error('unexpected credential read'); } });
  ctx.provide('settings', {
    describe: () => [{ ns: 'pipilu-balance', revision, value: config }],
    mutate: async (namespace, operations, expectedRevision) => {
      assert.equal(namespace, 'pipilu-balance');
      if (expectedRevision !== revision) throw new Error('revision-conflict');
      mutations++;
      for (const operation of operations) {
        assert.equal(operation.path[0], 'prices');
        const key = operation.path[1];
        config.prices = { ...config.prices };
        if (operation.op === 'unset') delete config.prices[key];
        else { assert.equal(operation.op, 'set'); config.prices[key] = operation.value; }
      }
      revision++;
    },
  });
  t.mock.method(globalThis, 'fetch', () => { throw new Error('unexpected network request'); });
  const service = new BalanceService(ctx, config), key = 'generic-provider/example-model';
  assert.deepEqual(await service.pricing(), { prices: {}, models: [key], revision: 3 });
  const saved = await service.savePrice(key, { currency: 'CNY', input: '2', output: '4', cacheRead: '0' }, 3);
  assert.deepEqual(saved.prices[key], { currency: 'CNY', input: 2, output: 4, cacheRead: 0 });
  assert.equal(saved.revision, 4);
  await assert.rejects(service.savePrice(key, null, 3), /revision-conflict/);
  await assert.rejects(service.savePrice(key, null, -1), /invalid-revision/);
  await assert.rejects(service.savePrice(key, { currency: 'CNY', input: '', output: '4' }, 4), /invalid-price/);
  assert.equal(mutations, 1);
  assert.deepEqual((await service.pricing()).prices[key], saved.prices[key]);
  const removed = await service.savePrice(key, null, 4);
  assert.deepEqual(removed.prices, {});
  assert.equal(removed.revision, 5);
  assert.equal(mutations, 2);
});
