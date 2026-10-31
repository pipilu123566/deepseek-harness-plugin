import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
const TEXT = new Set(['.md','.markdown','.txt','.sql','.json','.js','.ts','.jsx','.tsx','.py','.csv','.yml','.yaml','.toml','.css','.html','.xml','.log','.sh']);
const MIME = {'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp','.pdf':'application/pdf'};
const hash = b => createHash('sha256').update(b).digest('hex');
export class LibraryError extends Error { constructor(code){super(code);this.code=code;} }
const fail = c => {throw new LibraryError(c);};
export class Library {
 constructor(stateDir){this.stateDir=stateDir;this.state={root:'',inbox:'',recent:[]};this.queue=Promise.resolve();this.ready=this.load();}
 async load(){try {this.state={...this.state,...JSON.parse(await fs.readFile(path.join(this.stateDir,'state.json'),'utf8'))};}catch(e){if(e.code!=='ENOENT')throw e;}}
 async persist(){await fs.mkdir(this.stateDir,{recursive:true,mode:0o700});const p=path.join(this.stateDir,randomUUID()+'.tmp');await fs.writeFile(p,JSON.stringify(this.state),{mode:0o600});await fs.rename(p,path.join(this.stateDir,'state.json'));}
 async resolve(rel='',create=false){
  if(!this.state.root)fail('not-configured');
  if(typeof rel!=='string'||path.isAbsolute(rel)||rel.includes('\0')||rel.split(/[\\/]/).includes('..'))fail('invalid-path');
  const root=await fs.realpath(this.state.root), target=path.resolve(root,rel);
  const actual=create?path.join(await fs.realpath(path.dirname(target)),path.basename(target)):await fs.realpath(target);
  if(actual!==root&&!actual.startsWith(root+path.sep))fail('outside-root');
  // Refuse symlinks for writes and directory traversal; never follow a link out of the selected root.
  if(actual!==target)fail('symlink');
  return actual;
 }
 async execute(args){await this.ready;const task=this.queue.then(()=>this.run(args));this.queue=task.catch(()=>{});return task;}
 async run(a){
  if(!a||typeof a.op!=='string')fail('invalid-request');
  if(a.op==='status')return {...this.state};
  if(a.op==='configure'){
   if(typeof a.root!=='string'||!path.isAbsolute(a.root)||typeof a.inbox!=='string')fail('invalid-config');
   const root=await fs.realpath(a.root);if(!(await fs.stat(root)).isDirectory())fail('invalid-config');
   const old=this.state;this.state={root,inbox:a.inbox,recent:old.root===root?old.recent:[]};
   try{const p=await this.resolve(a.inbox);if(path.extname(p).toLowerCase()!=='.md'||!(await fs.stat(p)).isFile())fail('invalid-inbox');await this.persist();}catch(e){this.state=old;throw e;}
   return {...this.state};
  }
  if(a.op==='list'){
   const dir=await this.resolve(a.path||'');const entries=await fs.readdir(dir,{withFileTypes:true});return entries.filter(e=>!e.name.startsWith('.')&&!e.isSymbolicLink()).map(e=>({name:e.name,path:path.posix.join(a.path||'',e.name),directory:e.isDirectory()})).sort((a,b)=>Number(b.directory)-Number(a.directory)||a.name.localeCompare(b.name));
  }
  if(a.op==='search'){
   if(typeof a.query!=='string'||a.query.length>200)fail('invalid-query');const q=a.query.toLocaleLowerCase();let found=[],scanned=0,truncated=false;
   const walk=async rel=>{for(const e of await fs.readdir(await this.resolve(rel),{withFileTypes:true})){
    if(e.name.startsWith('.')||e.isSymbolicLink())continue;if(++scanned>20000){truncated=true;return;}
    const p=path.posix.join(rel,e.name);if(e.isDirectory())await walk(p);else if(p.toLocaleLowerCase().includes(q)){found.push({name:e.name,path:p,directory:false});if(found.length>=200){truncated=true;return;}}if(truncated)return;
   }};if(q)await walk('');return {files:found,truncated};
  }
  if(a.op==='read'){
   const p=await this.resolve(a.path),st=await fs.stat(p);if(!st.isFile())fail('not-file');const ext=path.extname(p).toLowerCase();const kind=TEXT.has(ext)?'text':MIME[ext]?'preview':'external';
   if(kind==='external'){if(a.touch!==false){this.state.recent=[a.path,...this.state.recent.filter(x=>x!==a.path)].slice(0,15);await this.persist();}return {path:a.path,kind,size:st.size};}if(st.size>(kind==='text'?5:25)*1024*1024)fail('too-large');
   const bytes=await fs.readFile(p);let result={path:a.path,kind,version:hash(bytes),size:bytes.length};
   if(kind==='text'){let text;try{text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);}catch{fail('unsupported-encoding');}const bom=text.startsWith('\ufeff');if(bom)text=text.slice(1);result={...result,text,bom,eol:text.includes('\r\n')?'crlf':'lf'};}
   else result.url=`data:${MIME[ext]};base64,${bytes.toString('base64')}`;
   if(a.touch!==false){this.state.recent=[a.path,...this.state.recent.filter(x=>x!==a.path)].slice(0,15);await this.persist();}return result;
  }
  if(a.op==='save'){
   const p=await this.resolve(a.path);if(!TEXT.has(path.extname(p).toLowerCase())||typeof a.text!=='string'||Buffer.byteLength(a.text)>5*1024*1024)fail('invalid-text');
   const before=await fs.readFile(p);if(hash(before)!==a.version)fail('conflict');const stat=await fs.stat(p);
   const bytes=Buffer.from((a.bom?'\ufeff':'')+a.text);const temp=path.join(path.dirname(p),'.documents-'+randomUUID()+'.tmp');
   try{await fs.writeFile(temp,bytes,{mode:stat.mode&0o777,flag:'wx'});await this.resolve(a.path);if(hash(await fs.readFile(p))!==a.version)fail('conflict');await fs.rename(temp,p);}finally{await fs.unlink(temp).catch(()=>{});}
   return {version:hash(bytes)};
  }
  if(a.op==='create'){
   if(typeof a.path!=='string'||path.extname(a.path).toLowerCase()!=='.md')fail('invalid-name');const p=await this.resolve(a.path,true);await fs.writeFile(p,'',{flag:'wx',mode:0o600});return {path:a.path};
  }
  if(a.op==='openExternal'){
   const p=await this.resolve(a.path);if(!(await fs.stat(p)).isFile())fail('not-file');
   const command=process.platform==='darwin'?'open':process.platform==='win32'?null:'xdg-open';if(!command)fail('external-unavailable');
   await new Promise((ok,no)=>{const c=spawn(command,[p],{stdio:'ignore'});c.on('error',()=>no(new LibraryError('external-unavailable')));c.on('exit',code=>code===0?ok():no(new LibraryError('external-unavailable')));});return {opened:true};
  }
  fail('invalid-operation');
 }
}
