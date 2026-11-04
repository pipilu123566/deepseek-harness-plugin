import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {atomicJSON} from './capture.js';
const hash=text=>createHash('sha256').update(text).digest('hex');
const fail=code=>{const e=Error(code);e.code=code;throw e;};
/** Separate drafts per editor; dropping a saved snapshot never removes newer typing. */
export class Recovery {
 constructor(library){this.library=library;this.directory=path.join(library.stateDir,'recovery');}
 async files(){await fs.mkdir(this.directory,{recursive:true,mode:0o700});return (await fs.readdir(this.directory)).filter(n=>/^[a-f0-9]{64}\.json$/.test(n));}
 key(a){return hash(this.library.state.root+'\0'+a.path+'\0'+a.id)+'.json';}
 async records(a){const root=hash(this.library.state.root),records=[];for(const name of await this.files()){try{const record=JSON.parse(await fs.readFile(path.join(this.directory,name),'utf8'));if(record.root===root&&record.path===a.path)records.push(record);}catch(e){if(e.code!=='ENOENT')throw e;}}return records.sort((a,b)=>b.updated-a.updated);}
 async run(a){
  await this.library.resolve(a.path,true);
  if(a.op==='recoveryRead'){const records=await this.records(a);return {drafts:records.map(({id,updated,text,revision})=>({id,updated,size:Buffer.byteLength(text),...revision===undefined?{}:{revision}})),draft:records.find(r=>!a.id||r.id===a.id)||null};}
  if(typeof a.id!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(a.id)||typeof a.text!=='string'||Buffer.byteLength(a.text)>5*1024*1024)fail('invalid-recovery');
  const file=path.join(this.directory,this.key(a));
  if(a.op==='recoveryDrop'){try{const old=JSON.parse(await fs.readFile(file,'utf8'));if(old.text===a.text)await fs.unlink(file);}catch(e){if(e.code!=='ENOENT')throw e;}return {removed:true};}
  if(a.op!=='recoveryWrite'||!(this.library.validRecoveryVersion?.(a.version)??(typeof a.version==='string'&&/^[a-f0-9]{64}$/.test(a.version))))fail('invalid-recovery');
  if(a.revision!==undefined&&(!Number.isSafeInteger(a.revision)||a.revision<0))fail('invalid-recovery');
  const record={root:hash(this.library.state.root),path:a.path,id:a.id,version:a.version,text:a.text,updated:Date.now(),...a.revision===undefined?{}:{revision:a.revision}},bytes=Buffer.byteLength(JSON.stringify(record)),files=await this.files();let total=bytes;
  if(!files.includes(path.basename(file))&&files.length>=20)fail('recovery-limit');
  for(const name of files)if(name!==path.basename(file))total+=(await fs.stat(path.join(this.directory,name))).size;
  if(total>20*1024*1024)fail('recovery-limit');await atomicJSON(file,record);return {retained:true};
 }
}
