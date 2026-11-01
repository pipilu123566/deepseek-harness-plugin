import test from 'node:test';
import assert from 'node:assert/strict';
import {createInputSender} from '../web/input.js';
function fixture(){
 let buffered=0,next=0;const frames=new Map(),messages=[];let blocked=false;
 const sender=createInputSender({buffered:()=>buffered,write:m=>{messages.push(m);buffered+=Buffer.byteLength(JSON.stringify(m));return true;},schedule:f=>{frames.set(++next,f);return next;},cancel:id=>frames.delete(id),onBlocked:()=>{blocked=true;}});
 return {sender,messages,setBuffer:n=>{buffered=n;},get buffered(){return buffered;},get blocked(){return blocked;},tick(){const queue=[...frames.values()];frames.clear();queue.forEach(f=>f());}};
}
test('1000 motion events never queue stale positions ahead of button release',()=>{
 const f=fixture();f.sender.send({type:'pointer',action:'down',x:0,y:0});
 for(let i=0;i<1000;i++)f.sender.send({type:'pointer',action:'move',x:i/1000,y:.5});
 assert.equal(f.sender.send({type:'pointer',action:'up',x:1,y:.5}),true);
 assert.deepEqual(f.messages.map(m=>m.action),['down','move','up']);
 assert.equal(f.messages[1].x,.999);assert.ok(f.buffered<2048);
 f.tick();assert.equal(f.messages.length,3);
});
test('congestion retains only latest motion and never silently drops key up',()=>{
 const f=fixture();f.setBuffer(4096);
 for(let i=0;i<1000;i++)f.sender.send({type:'pointer',action:'move',x:i/1000,y:.5});
 f.tick();assert.equal(f.messages.length,0);
 assert.equal(f.sender.send({type:'key',code:'ShiftLeft',down:false}),true);
 assert.equal(f.messages.length,1);assert.equal(f.messages[0].down,false);
 f.setBuffer(10000);assert.equal(f.sender.send({type:'release'}),false);assert.equal(f.blocked,true);
});
test('wheel coalescing preserves delta; cancel removes pending motion across sessions',()=>{
 const f=fixture();for(let i=0;i<20;i++)f.sender.send({type:'wheel',dx:1,dy:2});f.tick();
 assert.deepEqual(f.messages,[{type:'wheel',dx:20,dy:40}]);
 f.sender.send({type:'pointer',action:'move',x:1,y:1});f.sender.clear();f.tick();assert.equal(f.messages.length,1);
});
