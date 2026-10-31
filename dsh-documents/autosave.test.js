import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AutoSave} from './autosave.js';
const doc={kind:'text',path:'inbox.md',version:'v1',text:'原文'};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('autosave debounces and holds marked text until composition ends',async()=>{
 const writes=[],s=new AutoSave(async x=>{writes.push(x.text);return {version:'v2'};},10);s.open(doc);
 s.composition(true);s.change('原文zhong');await wait(30);assert.equal(writes.length,0);
 assert.equal(await s.flush(),false);s.change('原文中文');s.composition(false);await wait(30);
 assert.deepEqual(writes,['原文中文']);assert.equal(s.state.dirty,false);s.stop();
});
test('an in-flight save cannot mark newer typing saved; following write uses the new version',async()=>{
 const writes=[];let finish;const s=new AutoSave(x=>{writes.push({text:x.text,version:x.doc.version});return writes.length===1?new Promise(r=>finish=r):Promise.resolve({version:'v3'});},10000);s.open(doc);s.change('原文一');
 const first=s.flush();await Promise.resolve();s.change('原文一二');const second=s.flush();finish({version:'v2'});await Promise.all([first,second]);
 assert.deepEqual(writes,[{text:'原文一',version:'v1'},{text:'原文一二',version:'v2'}]);assert.equal(s.state.text,'原文一二');assert.equal(s.state.original,'原文一二');assert.equal(s.state.dirty,false);s.stop();
});
test('composition begun during a save keeps the newer buffer dirty without persisting marked text',async()=>{
 let finish;const writes=[],s=new AutoSave(x=>{writes.push(x.text);return new Promise(r=>finish=r);},10000);s.open(doc);s.change('原文一');const pending=s.flush();await Promise.resolve();s.composition(true);s.change('原文一zhong');finish({version:'v2'});assert.equal(await pending,false);assert.deepEqual(writes,['原文一']);assert.equal(s.state.dirty,true);assert.equal(s.state.text,'原文一zhong');s.stop();
});
test('conflicts retain drafts and block automatic retries and navigation flushes',async()=>{
 let calls=0;const s=new AutoSave(async()=>{calls++;throw Error('conflict');},10);s.open(doc);s.change('本地草稿');await assert.rejects(s.flush(),/conflict/);s.change('继续编辑');await wait(30);await assert.rejects(s.flush(),/conflict/);assert.equal(calls,1);assert.equal(s.state.text,'继续编辑');assert.equal(s.state.original,'原文');assert.equal(s.state.dirty,true);s.stop();
});
test('retry retains the draft and explicit reload clears a failed buffer',async()=>{
 let fail=true;const s=new AutoSave(async()=>{if(fail)throw Error('transport');return {version:'v2'};},10000);s.open(doc);s.change('新内容');await assert.rejects(s.flush(),/transport/);fail=false;await s.retry();assert.equal(s.state.original,'新内容');s.open({...doc,version:'v3',text:'外部版本'});assert.equal(s.state.text,'外部版本');assert.equal(s.state.error,null);s.stop();
});
test('leaving a view can flush its retained buffer after listeners detach',async()=>{
 let finish;const s=new AutoSave(()=>new Promise(r=>finish=r),10000);s.open(doc);const detach=s.subscribe(()=>{});s.change('离开前输入');detach();const pending=s.flush();await Promise.resolve();finish({version:'v2'});await pending;assert.equal(s.state.dirty,false);assert.equal(s.state.original,'离开前输入');s.stop();
});
