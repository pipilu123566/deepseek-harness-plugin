window.__ModuleLoader__.load({
  id: '@pipilu/dsh-remote-desktop',
  factory(require) {
    const React = require('react'), h = React.createElement;
    const icon = () => h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, 'aria-hidden': true },
      h('rect', { x: 3, y: 4, width: 18, height: 13, rx: 2.5 }), h('path', { d: 'M8 21h8M12 17v4M3 13h18' }));
    const css = '.prd-entry{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:44px;min-width:44px;box-sizing:border-box;padding:0 10px;border:0;border-radius:9px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;text-decoration:none;white-space:nowrap;cursor:pointer}.prd-entry:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.prd-entry:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}.prd-entry:disabled{opacity:.6;cursor:wait}.prd-entry svg{flex:none}.prd-sidebar-entry{width:100%;justify-content:flex-start}.prd-sidebar-entry[data-wide=false]{width:44px;padding:0;justify-content:center}.prd-entry-status{display:block;max-width:260px;padding:4px 10px;font-size:11px;line-height:1.6;color:var(--dsw-alias-label-secondary)}';
    function Entry({ wide, t }) {
      const [pending, setPending] = React.useState(false);
      const [status, setStatus] = React.useState('');
      const request = React.useRef(null);
      React.useEffect(() => () => { request.current?.abort(); request.current = null; }, []);
      const desktop = new URL(document.baseURI).protocol === 'dsh-app:';
      const url = new URL('remote-desktop/', document.baseURI);
      const sidebar = wide !== undefined;
      const openDesktopWeb = async () => {
        if (request.current) return;
        const controller = new AbortController();
        request.current = controller;
        setPending(true);
        setStatus('');
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
          const response = await fetch(new URL('api/entry', url), {
            credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
            headers: { Accept: 'application/json', 'X-Remote-Desktop': '1' },
          });
          if (!response.ok) throw new Error('entry-unavailable');
          const body = await response.json();
          const destination = new URL(body.url);
          const loopback = destination.hostname === 'localhost' || destination.hostname.endsWith('.localhost') || /^127\./.test(destination.hostname) || destination.hostname === '[::1]';
          if (!['http:', 'https:'].includes(destination.protocol) || (destination.protocol === 'http:' && !loopback) || destination.username || destination.password) throw new Error('invalid-entry');
          if (controller.signal.aborted || request.current !== controller) return;
          // Desktop 0.2.1-rc.5 forwards HTTP(S) window.open to shell.openExternal.
          // Keep this short-lived login URL out of element attributes and storage.
          window.open(destination.href, '_blank', 'noopener,noreferrer');
          setStatus(t('opened'));
        } catch {
          if (request.current === controller) setStatus(t('openFailed'));
        } finally {
          clearTimeout(timeout);
          if (request.current === controller) { request.current = null; setPending(false); }
        }
      };
      return h(React.Fragment, null,
        h('style', null, css),
        h(desktop ? 'button' : 'a', {
          className: 'prd-entry' + (sidebar ? ' prd-sidebar-entry' : ''), 'data-wide': wide,
          ...(desktop ? { type: 'button', onClick: openDesktopWeb, disabled: pending, 'aria-busy': pending } : { href: url.href }),
          'aria-label': t('title'), title: t('title'),
        }, icon(), wide === false ? null : h('span', null, t(pending ? 'opening' : 'title'))),
        status ? h('span', { className: 'prd-entry-status', role: 'status' }, status) : null);
    }
    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.locale.register('pipilu.remote', {
          zh: { title: '远程桌面', opening: '正在打开…', opened: '已在浏览器打开远程桌面。', openFailed: '暂时无法打开，请确认 DeepSeek 正在运行后重试。' },
          en: { title: 'Remote desktop', opening: 'Opening…', opened: 'Remote desktop opened in your browser.', openFailed: 'Unable to open. Check that DeepSeek is running and try again.' },
        });
        ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
          name: 'sidebar.footer.action', id: 'pipilu-remote-desktop-sidebar', order: 60, locale: 'pipilu.remote',
        }, Entry));
      },
    };
  },
});
