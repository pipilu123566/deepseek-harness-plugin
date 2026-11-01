import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function fixture(){
 let registration;
 vm.runInNewContext(readFileSync(new URL('../client.js',import.meta.url),'utf8'),{window:{__ModuleLoader__:{load:value=>{registration=value;}}}});
 const plugin=registration.factory(()=>({createElement(){}}));
 const dictionaries=new Map(),entries=new Map();
 const locale={register(ns,value){
  if(dictionaries.has(ns))throw Error(`locale namespace ${ns} already registered`);
  dictionaries.set(ns,value);
  return()=>{if(dictionaries.get(ns)===value)dictionaries.delete(ns);};
 }};
 function mount(){
  const effects=[];
  const effect=callback=>{const off=callback();if(typeof off==='function')effects.push(off);return off;};
  const ctx={locale,effect,slots:{
   register(options,component){assert.equal(entries.has(options.id),false);const entry={options,component};entries.set(options.id,entry);return()=>{if(entries.get(options.id)===entry)entries.delete(options.id);};},
   inject(name,callback){return effect(callback);}
  }};
  plugin.apply(ctx);return()=>{for(const off of effects.reverse())off();};
 }
 return{mount,dictionaries,entries};
}
test('client dictionary and sidebar survive repeated hot updates without duplicate registration',()=>{
 const f=fixture();
 for(let i=0;i<4;i++){
  const off=f.mount();assert.equal(f.entries.size,1);assert.equal(f.dictionaries.size,1);
  const [{options}]=f.entries.values();assert.equal(f.dictionaries.has(options.locale),true);
  off();assert.equal(f.entries.size,0);assert.equal(f.dictionaries.size,0);
 }
});
test('upgrading a page with the legacy orphan dictionary restores the sidebar without touching other owners',()=>{
 const f=fixture(),legacy={zh:{title:'legacy'}},other={en:{title:'other'}};
 f.dictionaries.set('pipilu.remote',legacy);f.dictionaries.set('another-plugin',other);
 for(let i=0;i<3;i++){const off=f.mount();assert.equal(f.entries.size,1);off();assert.equal(f.dictionaries.size,2);}
 assert.equal(f.dictionaries.get('pipilu.remote'),legacy);assert.equal(f.dictionaries.get('another-plugin'),other);
});
