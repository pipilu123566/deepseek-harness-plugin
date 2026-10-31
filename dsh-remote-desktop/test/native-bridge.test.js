import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createNativeBridge} from '../native-bridge.js';
function child(pid){
 const p=new EventEmitter();p.pid=pid;p.stdout=new EventEmitter();p.stderr={resume(){}};p.messages=[];
 p.stdin=Object.assign(new EventEmitter(),{destroyed:false,writableLength:0,write(s){p.messages.push(JSON.parse(s));},end(s){p.messages.push(JSON.parse(s));}});
 p.kill=signal=>{p.killed=signal;};return p;
}
test('real capture waits for display wake and releases its sleep assertion on disconnect',async()=>{
 let resolveWake;const waking=new Promise(r=>{resolveWake=r;}),agent=child(12345),awake=child(12346),calls=[];
 const bridge=createNativeBridge({wake:()=>waking,spawnProcess:(file,args)=>{calls.push({file,args});return calls.length===1?agent:awake;}});
 const session=bridge.start({onMessage(){},onClose(){}});agent.stdout.emit('data',Buffer.from('{"type":"started"}\n'));
 assert.deepEqual(agent.messages,[]);assert.equal(calls.length,1);
 resolveWake();await new Promise(r=>setImmediate(r));
 assert.deepEqual(calls[1],{file:'/usr/bin/caffeinate',args:['-d','-i','-w','12345']});assert.equal(agent.messages[0].type,'start');
 session.stop();assert.equal(awake.killed,'SIGTERM');assert.equal(agent.messages.at(-1).type,'stop');agent.emit('close');
});
test('disconnect during display wake never starts capture or a late sleep assertion',async()=>{
 let resolveWake;const waking=new Promise(r=>{resolveWake=r;}),agent=child(12345),calls=[];
 const bridge=createNativeBridge({wake:()=>waking,spawnProcess:(file,args)=>{calls.push({file,args});return agent;}});
 const session=bridge.start({onMessage(){},onClose(){}});agent.stdout.emit('data',Buffer.from('{"type":"started"}\n'));session.stop();agent.emit('close');
 resolveWake();await new Promise(r=>setImmediate(r));assert.equal(calls.length,1);assert.deepEqual(agent.messages,[{type:'stop'}]);
});
