import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
import { ControlError } from './controller.js';

export const PREFIX = '/remote-desktop/';
export const LEASE_COOKIE = 'dsh_remote_desktop_lease';
const assets = new Map([
  ['', ['index.html', 'text/html; charset=utf-8']],
  ['index.html', ['index.html', 'text/html; charset=utf-8']],
  ['app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['style.css', ['style.css', 'text/css; charset=utf-8']],
]);
const csp = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; media-src 'self' blob:; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

export function readLease(cookie = '') {
  const values = cookie.split(';').map(part => part.trim()).filter(part => part.startsWith(`${LEASE_COOKIE}=`));
  if (values.length !== 1) return '';
  const value = values[0].slice(LEASE_COOKIE.length + 1);
  return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : '';
}
export function validateBrowserRequest(req) {
  const host = req.headers.host;
  const origin = req.headers.origin;
  if (typeof host !== 'string' || typeof origin !== 'string') return false;
  try {
    const parsed = new URL(origin);
    if (parsed.host !== host || !['https:', 'http:'].includes(parsed.protocol) || origin !== parsed.origin) return false;
    const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname);
    return parsed.protocol === 'https:' || loopback;
  } catch { return false; }
}
function headers(res, type = 'application/json; charset=utf-8') {
  res.setHeader('Content-Type', type);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', csp);
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}
function json(res, status, body) { headers(res); res.writeHead(status); res.end(JSON.stringify(body)); }
async function readBody(req) {
  if (req.headers['content-type']?.split(';')[0] !== 'application/json' || req.headers['x-remote-desktop'] !== '1') throw new ControlError('invalid-request', 400);
  let size = 0; const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 4096) throw new ControlError('request-too-large', 413);
    chunks.push(chunk);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error();
    return value;
  } catch { throw new ControlError('invalid-request', 400); }
}
function exactKeys(value, keys) { if (Object.keys(value).some(key => !keys.includes(key))) throw new ControlError('invalid-request', 400); }

export function validSignal(m) {
  if (!m || typeof m !== 'object' || Array.isArray(m)) return false;
  if (m.type === 'offer') return typeof m.sdp === 'string' && m.sdp.length < 240000 && Object.keys(m).every(k => ['type','sdp'].includes(k));
  if (m.type === 'candidate') return typeof m.candidate === 'string' && m.candidate.length < 8192 && Number.isSafeInteger(m.sdpMLineIndex) && m.sdpMLineIndex >= 0 && m.sdpMLineIndex < 16 && (m.sdpMid === null || (typeof m.sdpMid === 'string' && m.sdpMid.length < 80)) && Object.keys(m).every(k => ['type','candidate','sdpMid','sdpMLineIndex'].includes(k));
  return false;
}
export function createDesktopServer({ control, native, authorize, authorizeLogin, machineName, getEntryUrl }) {
  const wss = new WebSocketServer({ noServer:true, maxPayload:256*1024, perMessageDeflate:false });
  const agents = new Set();
  let disposed=false;
  const snapshot=async token=>({ ...control.snapshot(token), native:await native.status(), machineName, transport:'webrtc', relayConfigured:(native.configuration.iceServers||[]).some(s=>(Array.isArray(s.urls)?s.urls:[s.urls]).some(u=>/^turns?:/.test(u))) });
  async function handler(req,res) {
    try {
      if(disposed)return json(res,503,{error:'unavailable'});
      const pathname=new URL(req.url,'http://localhost').pathname;
      if(req.method==='GET'&&pathname===PREFIX+'login'&&authorizeLogin)return authorizeLogin(req,res);
      const owner=authorize(req);
      if(!owner){
        if(req.method==='GET'&&(pathname===PREFIX||pathname===PREFIX+'index.html')){
          const page=await readFile(new URL('./dist/sign-in.html',import.meta.url));
          headers(res,'text/html; charset=utf-8');res.writeHead(401);res.end(page);return;
        }
        return json(res,401,{error:'sign-in-required'});
      }
      if(owner!=='owner')return json(res,403,{error:'owner-required'});
      if(!pathname.startsWith(PREFIX))return json(res,404,{error:'not-found'});
      const path=pathname.slice(PREFIX.length),token=readLease(req.headers.cookie);
      if(req.method==='GET'&&path==='api/status')return json(res,200,await snapshot(token));
      if(req.method==='GET'&&path==='api/entry')return json(res,200,{url:getEntryUrl()});
      if(req.method==='GET'&&assets.has(path)) {
        const [file,mime]=assets.get(path);const bytes=await readFile(fileURLToPath(new URL(`./dist/${file}`,import.meta.url)));
        headers(res,mime);res.writeHead(200);res.end(bytes);return;
      }
      if(req.method!=='POST'||!['api/connect','api/disconnect','api/setup'].includes(path))return json(res,404,{error:'not-found'});
      if(!validateBrowserRequest(req))return json(res,403,{error:'secure-origin-required'});
      exactKeys(await readBody(req),[]);
      if(path==='api/setup'){
        if(control.phase!=='idle')throw new ControlError('desktop-in-use');
        native.setup();return json(res,200,{opened:true});
      }
      const secure=req.headers.origin.startsWith('https:')?'; Secure':'';
      let current='';
      if(path==='api/connect') {
        const status=await native.status();
        if(!status.installed)throw new ControlError('agent-unavailable',503);
        if(!status.screen||!status.input)throw new ControlError('permissions-required',503);
        current=control.connect(token);
        res.setHeader('Set-Cookie',`${LEASE_COOKIE}=${current}; Path=/; HttpOnly; SameSite=Strict${secure}`);
      }else{
        control.disconnect(token);res.setHeader('Set-Cookie',`${LEASE_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict${secure}`);
      }
      json(res,200,await snapshot(current));
    }catch(e){if(!res.headersSent)json(res,e instanceof ControlError?e.status:500,{error:e instanceof ControlError?e.code:'remote-desktop-unavailable'});else res.destroy();}
  }
  function reject(socket,status){socket.end(`HTTP/1.1 ${status} Rejected\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);}
  function upgrade(req,socket,head){
    const token=readLease(req.headers.cookie);
    if(disposed||authorize(req)!=='owner'||!validateBrowserRequest(req))return reject(socket,403);
    if(!control.canConnect(token))return reject(socket,409);
    wss.handleUpgrade(req,socket,head,ws=>{
      let agent,closed=false,alive=true,offered=false;
      const send=m=>{if(!closed&&ws.readyState===WebSocket.OPEN&&ws.bufferedAmount<1024*1024)ws.send(JSON.stringify(m));};
      const stop=()=>{if(closed)return;closed=true;clearInterval(heartbeat);agent?.stop();agents.delete(agent);ws.terminate();};
      const handle={terminate:stop,once:ws.once.bind(ws)};
      const heartbeat=setInterval(()=>{if(!alive||!control.hasSocket(handle)||authorize(req)!=='owner')return stop();alive=false;ws.ping();},15000);heartbeat.unref();
      try{control.attachSocket(token,handle);}catch{stop();return;}
      ws.on('pong',()=>{alive=true;});ws.once('error',stop);ws.once('close',stop);
      try{
        agent=native.start({onMessage:m=>{send(m);if(m.type==='error'||m.type==='closed')setTimeout(stop,30).unref();},onClose:stop});agents.add(agent);
        send({type:'configuration',...native.configuration,testPattern:native.testPattern===true});
      }catch{send({type:'error',code:'agent-unavailable'});stop();return;}
      ws.on('message',(data,binary)=>{
        if(binary||closed||!control.hasSocket(handle))return stop();
        let m;try{m=JSON.parse(data.toString());}catch{return stop();}
        if(!validSignal(m)||(m.type==='offer'&&offered))return stop();
        if(m.type==='offer')offered=true;
        if(!agent.send(m))stop();
      });
    });
  }
  async function dispose(){if(disposed)return;disposed=true;control.dispose();for(const a of agents)a.stop();agents.clear();native.dispose?.();await new Promise(resolve=>wss.close(resolve));}
  return{handler,upgrade,dispose,snapshot};
}

