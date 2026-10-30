window.__ModuleLoader__.load({
  id: '@pipilu123566/dsh-balance',
  factory(require) {
    const React = require('react'), h = React.createElement;
    const zh = {
      title: '账户余额', trigger: '余额', description: '已配置厂商的账户余额', refresh: '刷新', loading: '正在查询…', empty: '尚未配置服务商', failed: '暂时无法读取余额，请重试',
      officialAccount: '官方账户', officialApi: '官方 API', thirdParty: '第三方', available: '可用余额', toppedUp: '充值余额', granted: '赠送余额',
      signedOut: '登录后查看', unavailable: '查询失败，请稍后重试', unauthorized: '密钥无效或无余额查询权限', rateLimited: '查询过于频繁，请稍后重试', unsupported: '暂不支持此厂商的余额接口', missingCredential: '未找到可用 API 密钥',
      note: '按厂商币种展示，不折算为 Token 数量。', updated: '更新于', close: '关闭',
    };
    const en = {
      title: 'Provider balances', trigger: 'Balance', description: 'Balances of configured providers', refresh: 'Refresh', loading: 'Checking…', empty: 'No providers configured', failed: 'Unable to read balances. Please retry.',
      officialAccount: 'Official account', officialApi: 'Official API', thirdParty: 'Third party', available: 'Available', toppedUp: 'Topped up', granted: 'Granted',
      signedOut: 'Sign in to view', unavailable: 'Unavailable. Please retry later.', unauthorized: 'Invalid key or no balance permission', rateLimited: 'Rate limited. Please retry later.', unsupported: 'Balance API not supported for this provider', missingCredential: 'No API credential found',
      note: 'Shown in the provider currency; not a token count.', updated: 'Updated', close: 'Close',
    };
    const css = `
.pb-seat{position:relative;z-index:40;flex:none}.pb-wide{height:36px;margin-bottom:8px}.pb-rail{height:36px;width:36px;margin-bottom:8px}
.pb-chip{height:32px;display:flex;align-items:center;gap:5px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);padding:0 7px;font:inherit;cursor:pointer;white-space:nowrap}.pb-chip:hover,.pb-chip[aria-expanded=true]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.pb-seat button:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.pb-pop{position:fixed;inset:auto;margin:0;box-sizing:border-box;width:320px;max-width:calc(100vw - 24px);max-height:calc(100vh - 100px);overflow:auto;background:var(--dsw-alias-settings-card-fill);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l3);border-radius:14px;padding:16px;box-shadow:0 8px 28px #0003;font-size:13px;line-height:1.5;cursor:default}
.pb-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.pb-title{margin:0;font-size:14px;font-weight:600}.pb-sub,.pb-note,.pb-time{font-size:11px;color:var(--dsw-alias-label-tertiary)}.pb-sub{margin-top:3px}.pb-actions{display:flex;gap:6px}.pb-action{border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;padding:5px;font:inherit}.pb-action:hover{background:var(--dsw-alias-interactive-bg-hover)}.pb-action:disabled{opacity:.5;cursor:wait}
.pb-provider{padding:13px 0;border-bottom:1px solid var(--dsw-alias-border-l2)}.pb-provider-name{display:flex;align-items:center;justify-content:space-between;gap:8px;font-weight:500;margin-bottom:7px}.pb-tag{font-size:10px;font-weight:400;color:var(--dsw-alias-label-tertiary);white-space:nowrap}.pb-row{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-top:5px}.pb-value{font-variant-numeric:tabular-nums;font-family:inherit;font-weight:500;overflow-wrap:anywhere}.pb-status{font-size:12px;color:var(--dsw-alias-label-secondary)}.pb-note{margin:12px 0 0}.pb-time{margin-top:7px}
`;
    const icon = () => h('svg', { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, 'aria-hidden': true }, h('rect', { x: 3, y: 5, width: 18, height: 15, rx: 4 }), h('path', { d: 'M3 9h18M17 13h4M17 16h4' }));
    function Balance({ wide, t, connection, locale }) {
      const [open, setOpen] = React.useState(false), [pinned, setPinned] = React.useState(false);
      const [data, setData] = React.useState(null), [busy, setBusy] = React.useState(false), [error, setError] = React.useState(false);
      const panel = React.useRef(null), leaveTimer = React.useRef(null), suppressFocus = React.useRef(false);
      const anchor = React.useRef(null), trigger = React.useRef(null), request = React.useRef(null), stamp = React.useRef(0), sequence = React.useRef(0);
      const id = React.useId();
      const refresh = React.useCallback(async (force = false) => {
        if (request.current) return;
        const controller = new AbortController(); request.current = controller;
        const generation = ++sequence.current;
        setBusy(true); setError(false); setData(null);
        try {
          const result = await connection.rpc.call('/api', 'pipiluBalance/snapshot', { args: { client: { locale: locale.getSnapshot().active, timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60, refresh: force === true } } }, controller.signal);
          if (!result.ok) throw new Error('balance-query-failed');
          if (generation === sequence.current && !controller.signal.aborted) { setData(result.value); stamp.current = Date.now(); }
        } catch { if (!controller.signal.aborted && generation === sequence.current) { setError(true); setData(null); } }
        finally { if (request.current === controller) { request.current = null; setBusy(false); } }
      }, [connection, locale]);
      React.useEffect(() => () => { sequence.current++; request.current?.abort(); clearTimeout(leaveTimer.current); }, []);
      React.useLayoutEffect(() => {
        if (!open || !panel.current || !trigger.current) return;
        const pop = panel.current;
        pop.showPopover();
        const place = () => {
          const rect = trigger.current.getBoundingClientRect();
          pop.style.left = Math.max(12, Math.min(rect.left, window.innerWidth - pop.offsetWidth - 12)) + 'px';
          pop.style.top = Math.max(12, rect.top - pop.offsetHeight - 8) + 'px';
        };
        place();
        const observer = new ResizeObserver(place); observer.observe(pop);
        window.addEventListener('resize', place);
        return () => { observer.disconnect(); window.removeEventListener('resize', place); if (pop.matches(':popover-open')) pop.hidePopover(); };
      }, [open, wide]);
      React.useEffect(() => {
        if (!open) return;
        refresh();
        const timer = setInterval(refresh, 60000);
        const dismiss = e => { if (!anchor.current?.contains(e.target)) { setOpen(false); setPinned(false); } };
        const escape = e => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); setPinned(false); suppressFocus.current = true; trigger.current?.focus(); suppressFocus.current = false; } };
        document.addEventListener('pointerdown', dismiss); document.addEventListener('keydown', escape);
        return () => { clearInterval(timer); document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape); };
      }, [open, refresh]);
      // Reconnect invalidates data; each reopen reads the current provider/account state.
      React.useEffect(() => connection.generation.subscribe(() => { stamp.current = 0; setData(null); if (open) refresh(); }), [connection, open, refresh]);
      return h('div', { ref: anchor, className: 'pb-seat ' + (wide ? 'pb-wide' : 'pb-rail'),
        onPointerEnter: () => { clearTimeout(leaveTimer.current); setOpen(true); }, onPointerLeave: () => { leaveTimer.current = setTimeout(() => { if (!pinned && !anchor.current?.contains(document.activeElement)) setOpen(false); }, 180); },
        onBlur: e => { if (!e.currentTarget.contains(e.relatedTarget) && !pinned) setOpen(false); },
      }, h('style', null, css),
        h('button', { ref: trigger, type: 'button', className: 'pb-chip', 'aria-label': t('title'), 'aria-expanded': open, 'aria-controls': id, 'aria-haspopup': 'dialog', onFocus: () => { if (!suppressFocus.current) setOpen(true); }, onClick: () => { setPinned(!pinned); setOpen(!pinned); } }, icon(), wide ? h('span', null, t('trigger')) : null),
        open && h('section', { ref: panel, popover: 'manual', id, role: 'dialog', 'aria-label': t('title'), className: 'pb-pop', onPointerEnter: () => { clearTimeout(leaveTimer.current); setOpen(true); } },
          h('div', { className: 'pb-head' }, h('h2', { className: 'pb-title' }, t('title')), h('div', { className: 'pb-actions' }, h('button', { type: 'button', className: 'pb-action', disabled: busy, onClick: () => refresh(true) }, t('refresh')), h('button', { type: 'button', className: 'pb-action', 'aria-label': t('close'), onClick: () => { setOpen(false); setPinned(false); suppressFocus.current = true; trigger.current?.focus(); suppressFocus.current = false; } }, '×'))),
          h('div', { className: 'pb-sub' }, t('description')),
          h('div', { 'aria-live': 'polite', 'aria-busy': busy },
            error ? h('p', { className: 'pb-status', role: 'status' }, t('failed')) : !data ? h('p', { className: 'pb-status' }, t('loading')) : data.providers.length === 0 ? h('p', { className: 'pb-status' }, t('empty')) : data.providers.map(provider => h('div', { key: provider.id, className: 'pb-provider' },
              h('div', { className: 'pb-provider-name' }, h('span', null, provider.name), h('span', { className: 'pb-tag' }, t(provider.kind))),
              provider.status === 'ready' ? provider.balances.map((balance, i) => h('div', { key: i, className: 'pb-row' }, h('span', null, t(balance.kind)), h('span', { className: 'pb-value' }, (balance.currency === 'CNY' ? '¥ ' : balance.currency === 'USD' ? '$ ' : '') + String(balance.amount).replace(/(\.\d*?[1-9])0+$|\.0+$/, '$1') + ' ' + balance.currency))) : h('div', { className: 'pb-status' }, t(provider.status)),
              provider.updatedAt && h('div', { className: 'pb-time' }, t('updated') + ' ' + new Date(provider.updatedAt).toLocaleTimeString()),
            )),
          ), h('p', { className: 'pb-note' }, t('note')),
        ),
      );
    }
    return {
      inject: ['slots', 'connection', 'locale'],
      apply(ctx) {
        ctx.locale.register('pipilu.balance', { zh, en });
        ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({ name: 'sidebar.footer.action', id: 'pipilu-balance', order: 100, locale: 'pipilu.balance', inject: () => ({ connection: ctx.connection, locale: ctx.locale }) }, Balance));
      },
    };
  },
});
