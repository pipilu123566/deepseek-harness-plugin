import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createEventPump} from './native-event-pump.js';
function clock(){let id=0;const pending=new Map();return {pending,setTimer(fn,delay){const handle={id:++id,unref(){}};pending.set(handle,{fn,delay});return handle;},clearTimer(handle){pending.delete(handle);},next(){assert.equal(pending.size,1);const [handle,job]=pending.entries().next().value;pending.delete(handle);job.fn();return job.delay;},delay(){assert.equal(pending.size,1);return [...pending.values()][0].delay;}};}
test('focused input polls promptly and returns to the existing idle cadence',()=>{
 const c=clock();let active=false,calls=0;const pump=createEventPump(()=>calls++,{...c,active:()=>active});
 assert.equal(c.next(),0);assert.equal(c.delay(),16);
 active=true;pump.wake();assert.equal(c.next(),0);assert.equal(c.delay(),4);
 c.next();active=false;c.next();assert.equal(c.delay(),16);assert.equal(calls,4);pump.stop();assert.equal(c.pending.size,0);
});
test('repeated wake calls never duplicate event pumps and a stopped pump cannot restart',()=>{
 const c=clock();let calls=0;const pump=createEventPump(()=>{calls++;pump.wake();},{...c,active:()=>true});
 for(let i=0;i<10;i++)pump.wake();assert.equal(c.pending.size,1);c.next();assert.equal(calls,1);assert.equal(c.pending.size,1);
 pump.stop();pump.wake();assert.equal(c.pending.size,0);
});
test('stopping inside a native callback does not schedule work after disposal',()=>{
 const c=clock();const pump=createEventPump(()=>pump.stop(),c);c.next();assert.equal(c.pending.size,0);
});
