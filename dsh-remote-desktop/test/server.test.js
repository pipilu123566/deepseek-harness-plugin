import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { EventEmitter, once } from 'node:events';
import { WebSocket } from 'ws';
import { DesktopController } from '../controller.js';
import { createDesktopServer, validSignal } from '../server.js';

async function fixture(t,permission={installed:true,screen:true,input:true}) {
 const sessions=[];
 const native={configuration:{iceServers:[]},status:async()=>permission,start(callbacks){const agent={stopped:false,sent:[],send(m){this.sent.push(m);return true;},stop(){this.stopped=true;}};sessions.push(agent);queueMicrotask(()=>callbacks.onMessage({type:'ready'}));return agent;}};
 const control=new DesktopController(),api=createDesktopServer({control,native,machineName:'Test Mac',getEntryUrl:()=> 'https://example.invalid/',authorize:req=>req.headers.cookie?.includes('owner=yes')?'owner':false});
 const server=http.createServer(api.handler);server.on('upgrade',api.upgrade);server.listen(0,'127.0.0.1');await once(server,'listening');
 const origin=`http://127.0.0.1:${server.address().port}`;
 t.after(async()=>{await api.dispose();server.closeAllConnections();await new Promise(r=>server.close(r));});
 async function request(path,method='GET',cookie='owner=yes',body={}){return fetch(origin+'/remote-desktop/api/'+path,{method,headers:{Cookie:cookie,Origin:origin,...(method==='POST'?{'Content-Type':'application/json','X-Remote-Desktop':'1'}:{})},body:method==='POST'?JSON.stringify(body):undefined});}
 return {origin,control,sessions,request};
}
test('owner authentication and exact connect body required',async t=>{const f=await fixture(t);assert.equal((await f.request('status','GET','')).status,401);assert.equal((await f.request('connect','POST','owner=yes',{sessionId:'any'})).status,400);assert.equal(f.sessions.length,0);});
test('anonymous desktop navigation explains device authorization while APIs remain protected',async t=>{
 const f=await fixture(t);
 for(const path of ['/remote-desktop/','/remote-desktop/index.html']){
  const r=await fetch(f.origin+path);assert.equal(r.status,401);assert.match(r.headers.get('content-type'),/text\/html/);
  const html=await r.text();assert.match(html,/准备手机访问链接/);assert.match(html,/同一个浏览器/);assert.doesNotMatch(html,/\?token=/);
  assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(r.headers.get('set-cookie'),null);
 }
 const status=await f.request('status','GET','');assert.equal(status.status,401);assert.deepEqual(await status.json(),{error:'sign-in-required'});
 assert.equal((await f.request('connect','POST','')).status,401);assert.equal(f.sessions.length,0);
});
test('missing native permissions fail closed before creating a lease',async t=>{const f=await fixture(t,{installed:true,screen:false,input:true});const r=await f.request('connect','POST');assert.equal(r.status,503);assert.equal((await r.json()).error,'permissions-required');assert.equal(f.control.phase,'idle');});
test('one lease, signaling only, disconnect stops native process and can reconnect',async t=>{
 const f=await fixture(t);const r=await f.request('connect','POST');assert.equal(r.status,200);const cookie='owner=yes; '+r.headers.get('set-cookie').split(';')[0];
 const ws=new WebSocket(f.origin.replace('http:','ws:')+'/remote-desktop/socket',{headers:{Cookie:cookie,Origin:f.origin}});await once(ws,'open');
 assert.equal(f.sessions.length,1);ws.send(JSON.stringify({type:'offer',sdp:'v=0\r\n'}));await new Promise(r=>setTimeout(r,20));assert.equal(f.sessions[0].sent[0].type,'offer');
 assert.equal((await f.request('connect','POST','owner=yes')).status,409);
 assert.equal((await f.request('disconnect','POST','owner=yes')).status,403);
 const closed=once(ws,'close');assert.equal((await f.request('disconnect','POST',cookie)).status,200);await closed;assert.equal(f.sessions[0].stopped,true);assert.equal(f.control.phase,'idle');assert.equal((await f.request('connect','POST')).status,200);
});
test('input data and configuration injection over signaling are rejected',async t=>{
 const f=await fixture(t);const r=await f.request('connect','POST');const cookie='owner=yes; '+r.headers.get('set-cookie').split(';')[0];
 const ws=new WebSocket(f.origin.replace('http:','ws:')+'/remote-desktop/socket',{headers:{Cookie:cookie,Origin:f.origin}});await once(ws,'open');const closed=once(ws,'close');ws.send(JSON.stringify({type:'text',text:'not allowed in signaling'}));await closed;assert.equal(f.sessions[0].stopped,true);assert.deepEqual(f.sessions[0].sent,[]);
});
test('signal schema excludes remote spawn and oversized payloads',()=>{assert.equal(validSignal({type:'start',iceServers:[]}),false);assert.equal(validSignal({type:'offer',sdp:'v=0',executable:'/bin/sh'}),false);assert.equal(validSignal({type:'offer',sdp:'a'.repeat(250000)}),false);assert.equal(validSignal({type:'candidate',candidate:'test',sdpMid:'0',sdpMLineIndex:-1}),false);});
test('stale close never releases a newer lease',()=>{const c=new DesktopController();const a=c.connect();const first=new EventEmitter();first.terminate=()=>{};c.attachSocket(a,first);c.disconnect(a);const b=c.connect();first.emit('close');assert.equal(c.owned(b),true);c.dispose();});
