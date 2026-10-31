import { hostname } from 'node:os';
import { DesktopController } from './controller.js';
import { createDesktopServer, PREFIX } from './server.js';
import { createNativeBridge } from './native-bridge.js';
import { prepareAgent } from './prepare-agent.js';

export const name = 'pipilu-remote-desktop';
export const inject = ['connection', 'webServer'];
export async function apply(ctx, config = {}) {
  const entryRoot = config.publicUrl ? new URL(config.publicUrl) : new URL(ctx.webServer.getOrigin());
  if (entryRoot.pathname !== '/' || entryRoot.search || entryRoot.hash || entryRoot.username || entryRoot.password || (config.publicUrl && entryRoot.protocol !== 'https:')) throw new Error('publicUrl must be an HTTPS root URL');
  const native = createNativeBridge({ executable:await prepareAgent(), iceServers: config.iceServers || [{ urls: ['stun:stun.cloudflare.com:3478'] }], relayOnly: config.relayOnly === true });
  const server = createDesktopServer({
    control: new DesktopController(), native, machineName: hostname(),
    getEntryUrl: () => ctx.connection.authenticatedUrl(new URL(`${PREFIX}login`,entryRoot).href),
    authorizeLogin(req,res) {
      if(req.headers.host!==entryRoot.host){res.writeHead(403,{'Cache-Control':'no-store'});res.end();return;}
      // Official authorizeIndex supports a mounted frontend by stripping its prefix.
      const mounted={method:req.method,headers:req.headers,url:'/'+new URL(req.url,'http://localhost').search};
      if(ctx.connection.authorizeIndex(mounted,res)){res.writeHead(303,{'Location':'./','Cache-Control':'no-store'});res.end();}
    },
    authorize(req) { const result = ctx.connection.admit(req); return 'rejection' in result ? false : result.peer.principal.kind; },
  });
  ctx.effect(() => ctx.webServer.register({ kind: 'prefix', path: PREFIX.slice(0, -1), handler: server.handler }));
  ctx.effect(() => ctx.webServer.registerUpgrade({ path: `${PREFIX}socket`, handler: server.upgrade }));
  ctx.effect(() => () => server.dispose());
}
