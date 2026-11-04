import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {Library} from './library.js';
import {ancestorDirectories,newEntryPath} from './explorer-ui.js';
async function fixture(t){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'dsh-explorer-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));const root=path.join(dir,'vault');await fs.mkdir(root);await fs.writeFile(path.join(root,'inbox.md'),'original');const lib=new Library(path.join(dir,'state'));const call=a=>lib.execute(a);await call({op:'configure',root,inbox:'inbox.md'});return {dir,root,call};}
test('new folders are created only inside an existing selected directory, without overwriting',async t=>{
 const {root,call}=await fixture(t);await call({op:'mkdir',path:'资料'});await call({op:'mkdir',path:'资料/项目'});
 assert((await fs.stat(path.join(root,'资料/项目'))).isDirectory());
 await call({op:'create',path:'资料/项目/新笔记.md'});
 await assert.rejects(call({op:'mkdir',path:'资料/项目'}),e=>e.code==='EEXIST');
 await assert.rejects(call({op:'mkdir',path:'inbox.md'}),e=>e.code==='EEXIST');
 assert.equal(await fs.readFile(path.join(root,'inbox.md'),'utf8'),'original');
 await assert.rejects(call({op:'mkdir',path:'missing/child'}),e=>e.code==='ENOENT');
});
test('new folders reject traversal, symlink parents, absolute paths and hidden names',async t=>{
 const {root,dir,call}=await fixture(t);await fs.symlink(dir,path.join(root,'outside'));
 for(const name of ['../escape',path.join(dir,'absolute'),'outside/escape','.hidden',''])await assert.rejects(call({op:'mkdir',path:name}));
 assert.deepEqual(await fs.readdir(dir),['state','vault']);
});
test('tree expands only chosen paths, all expansion and collapse preserve the active file',async t=>{
 const {call}=await fixture(t);await call({op:'mkdir',path:'资料'});await call({op:'mkdir',path:'资料/项目'});await call({op:'create',path:'资料/项目/说明.md'});
 const collapsed=await call({op:'tree',expanded:[]});assert(!collapsed.entries.some(e=>e.path==='资料/项目'));
 const full=await call({op:'tree',expanded:'all'});assert.deepEqual(full.expanded,['资料','资料/项目']);assert.equal(full.entries.find(e=>e.path==='资料/项目/说明.md').depth,2);
 const before=await call({op:'read',path:'资料/项目/说明.md'});await call({op:'tree',expanded:[]});const after=await call({op:'read',path:before.path,touch:false});assert.equal(after.version,before.version);
});
test('tree skips symlinks and hidden entries without traversing outside the root',async t=>{
 const {root,dir,call}=await fixture(t);await fs.mkdir(path.join(root,'.hidden'));await fs.writeFile(path.join(root,'a.md'),'');await fs.symlink(dir,path.join(root,'link'));
 const all=await call({op:'tree',expanded:'all'});assert(!all.entries.some(e=>e.name==='link'||e.name==='.hidden'));
 await assert.rejects(call({op:'tree',expanded:null}));
});
test('reveal paths contain every ancestor without changing file names or requiring automatic opening',()=>{
 assert.deepEqual(ancestorDirectories('资料/项目/说明.md'),['资料','资料/项目']);assert.deepEqual(ancestorDirectories('inbox.md'),[]);
 assert.equal(newEntryPath('资料/项目',' 新笔记 ','file'),'资料/项目/新笔记.md');assert.equal(newEntryPath('','已有.MD','file'),'已有.MD');assert.equal(newEntryPath('资料','子目录','folder'),'资料/子目录');
 for(const name of ['../逃逸','a/b','.隐藏','  ','a\\b'])assert.throws(()=>newEntryPath('',name,'file'),/invalid-name/);
});
