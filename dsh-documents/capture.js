import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
const fail=code=>{const e=new Error(code);e.code=code;throw e;};
export async function atomicJSON(file,value){await fs.mkdir(path.dirname(file),{recursive:true,mode:0o700});const temp=file+'.'+randomUUID()+'.tmp';try{await fs.writeFile(temp,JSON.stringify(value),{flag:'wx',mode:0o600});await fs.rename(temp,file);}finally{await fs.unlink(temp).catch(()=>{});}}
async function readJSON(file,fallback){try{return JSON.parse(await fs.readFile(file,'utf8'));}catch(e){if(e.code==='ENOENT')return fallback;throw e;}}
/** All calls run on Library's queue, including ordinary document writes. */
export class Capture {
 constructor(library){this.library=library;this.file=path.join(library.stateDir,'capture.json');this.journal=path.join(library.stateDir,'capture-pending.json');}
 async state(){return readJSON(this.file,{text:'',version:'initial',receipts:[]});}
 async read(){await this.recover();const {text,version}=await this.state();return {text,version,kind:'text',path:'capture'};}
 async write(a){await this.recover();if(typeof a.text!=='string'||Buffer.byteLength(a.text)>5*1024*1024)fail('invalid-text');const current=await this.state();if(current.version!==a.version)fail('conflict');const next={...current,text:a.text,version:randomUUID()};await atomicJSON(this.file,next);return {version:next.version};}
 async recover(){
  const pending=await readJSON(this.journal,null);if(!pending)return;
  const lib=this.library,p=await lib.resolve(pending.path),bytes=await fs.readFile(p),after=Buffer.from(pending.after,'base64');
  if(hash(bytes)===pending.before){await lib.run({op:'save',path:pending.path,text:after.toString('utf8').replace(/^\ufeff/,''),bom:after[0]===239&&after[1]===187&&after[2]===191,version:pending.before});}
  else if(!bytes.subarray(0,after.length).equals(after))fail('capture-recovery-conflict');
  const current=await this.state();
  if(!current.receipts.some(r=>r.id===pending.id)){
   const receipt={id:pending.id,path:pending.path};
   await atomicJSON(this.file,{...current,text:current.version===pending.draftVersion?'':current.text,version:current.version===pending.draftVersion?randomUUID():current.version,receipts:[...current.receipts,receipt].slice(-100)});
  }
  await fs.unlink(this.journal);
 }
 async commit(a){
  if(typeof a.id!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(a.id))fail('invalid-request');
  await this.recover();const current=await this.state(),prior=current.receipts.find(r=>r.id===a.id);
  if(prior)return {...prior,draft:await this.read()};
  if(current.version!==a.version)fail('conflict');if(!current.text.trim())fail('empty-capture');
  const lib=this.library,p=await lib.resolve(lib.state.inbox),bytes=await fs.readFile(p);
  // Preserve the Inbox's BOM and newline convention; do not touch existing text.
  const prefix=bytes.toString('utf8'),eol=prefix.includes('\r\n')?'\r\n':'\n',text=current.text.replace(/\r?\n/g,eol);
  const after=prefix+(prefix.length&&!prefix.endsWith('\n')?eol:'')+text+(text.endsWith('\n')?'':eol);
  if(Buffer.byteLength(after)>5*1024*1024)fail('too-large');
  await atomicJSON(this.journal,{id:a.id,path:lib.state.inbox,before:hash(bytes),after:Buffer.from(after).toString('base64'),draftVersion:current.version});
  await this.recover();return {id:a.id,path:lib.state.inbox,draft:await this.read()};
 }
}
