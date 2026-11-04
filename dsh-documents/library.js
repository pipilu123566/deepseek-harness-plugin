import {splitDocumentLink} from './document-navigation.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { Capture } from './capture.js';
import {Recovery} from './recovery.js';
import { randomUUID as uuid } from 'node:crypto';
import { spawn } from 'node:child_process';
const TEXT = new Set(['.md','.markdown','.txt','.sql','.json','.js','.ts','.jsx','.tsx','.py','.csv','.yml','.yaml','.toml','.css','.html','.xml','.log','.sh']);
const MIME = {'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp','.pdf':'application/pdf'};
const hash = b => createHash('sha256').update(b).digest('hex');
const fileStamp=s=>[s.dev,s.ino,s.size,s.mtimeMs,s.ctimeMs].join(':');
export class LibraryError extends Error { constructor(code){super(code);this.code=code;} }
const fail = c => {throw new LibraryError(c);};
export class Library {
 constructor(stateDir){this.stateDir=stateDir;this.state={root:'',inbox:'',recent:[],attachments:'',globalCapture:false,defaultMarkdown:false};this.queue=Promise.resolve();this.capture=new Capture(this);this.recovery=new Recovery(this);this.ready=this.load();}
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
  if(a.op==='previewSettings'){if(a.enabled!==undefined){if(typeof a.enabled!=='boolean')fail('invalid-config');const old=this.state;this.state={...old,defaultMarkdown:a.enabled};try{await this.persist();}catch(e){this.state=old;throw e;}}return {enabled:!!this.state.defaultMarkdown};}
  if(a.op!=='configure'&&a.root!==undefined&&a.root!==this.state.root)fail('conflict');
  if(['recoveryRead','recoveryWrite','recoveryDrop'].includes(a.op))return this.recovery.run(a);
  if(a.op==='probe'){const p=await this.resolve(a.path),stat=await fs.stat(p);if(!stat.isFile())fail('not-file');const stamp=fileStamp(stat);return {changed:stamp!==a.stamp,stamp};}
  if(a.op==='status'){let legacyDraft=false;try{legacyDraft=(await fs.stat(path.join(path.dirname(this.stateDir),'quick-capture/draft.md'))).size>0;}catch{}return {...this.state,legacyDraft:legacyDraft&&!this.state.legacyMigrated};}
  if(a.op==='migrateCapture'){
   if(this.state.legacyMigrated)return this.capture.read();const draft=await this.capture.read();if(draft.text)fail('capture-not-empty');
   const legacy=path.join(path.dirname(this.stateDir),'quick-capture'),text=await fs.readFile(path.join(legacy,'draft.md'),'utf8');await this.capture.write({version:draft.version,text});this.state.legacyMigrated=true;await this.persist();return this.capture.read();
  }
  if(a.op==='captureRead')return this.capture.read();
  if(a.op==='captureWrite')return this.capture.write(a);
  if(a.op==='captureCommit')return this.capture.commit(a);
  if(a.op==='configure'){
   if(typeof a.root!=='string'||!path.isAbsolute(a.root)||typeof a.inbox!=='string')fail('invalid-config');
   if(a.globalCapture!==undefined&&typeof a.globalCapture!=='boolean')fail('invalid-config');const root=await fs.realpath(a.root);if(!(await fs.stat(root)).isDirectory())fail('invalid-config');
   const old=this.state;await this.capture.recover();const draft=await this.capture.state();if(draft.text&&old.root&&(root!==old.root||a.inbox!==old.inbox))fail('capture-not-empty');this.state={...old,root,inbox:a.inbox,recent:old.root===root?old.recent:[],attachments:a.attachments===undefined?old.attachments:a.attachments,globalCapture:a.globalCapture===undefined?old.globalCapture:!!a.globalCapture};
   try{if(typeof this.state.attachments!=='string')fail('invalid-config');if(this.state.attachments){const d=await this.resolve(this.state.attachments);if(!(await fs.stat(d)).isDirectory())fail('invalid-config');}const p=await this.resolve(a.inbox);if(path.extname(p).toLowerCase()!=='.md'||!(await fs.stat(p)).isFile())fail('invalid-inbox');await this.persist();}catch(e){this.state=old;throw e;}
   return {...this.state};
  }
  if(a.op==='resolveLink'){
   if(typeof a.target!=='string'||a.target.length>1000||/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(a.target))fail('invalid-path');
   let target,fragment;try{({path:target,fragment}=splitDocumentLink(a.target));}catch{fail('invalid-path');}
   if(!target)target=a.from;
   if(!target||path.isAbsolute(target)||target.includes('\0'))fail('invalid-path');
   const paths=[path.posix.join(path.posix.dirname(a.from||this.state.inbox),target),target];
   for(const rel of [...new Set(paths.flatMap(p=>path.extname(p)?[p]:[p+'.md',p]))]){try{const p=await this.resolve(rel);if((await fs.stat(p)).isFile())return {path:rel,fragment};}catch(e){if(!['ENOENT','ENOTDIR'].includes(e.code))throw e;}}
   const name=path.posix.basename(target),found=await this.run({op:'search',query:name});
   const matches=found.files.filter(f=>[name,name+'.md'].includes(path.posix.basename(f.path)));
   if(matches.length!==1||found.truncated)fail(matches.length>1?'ambiguous-link':'ENOENT');return {path:matches[0].path,fragment};
  }
  if(a.op==='importAttachments'){
   if(!this.state.attachments)fail('attachments-not-configured');
   const directory=await this.resolve(this.state.attachments),note=await this.resolve(a.path||this.state.inbox);
   if(!(await fs.stat(directory)).isDirectory()||!TEXT.has(path.extname(note).toLowerCase()))fail('invalid-path');
   if(!Array.isArray(a.files)||!a.files.length||a.files.length>32)fail('invalid-attachment');
   let total=0;const files=a.files.map(f=>{if(typeof f?.name!=='string'||!f.name||f.name!==path.basename(f.name)||/[\\/\0]/.test(f.name)||typeof f.data!=='string'||f.data.length>90*1024*1024||f.data.length%4!==0||/[^A-Za-z0-9+/=]/.test(f.data))fail('invalid-attachment');const bytes=Buffer.from(f.data,'base64');if(bytes.toString('base64')!==f.data)fail('invalid-attachment');total+=bytes.length;if(bytes.length>64*1024*1024||total>256*1024*1024)fail('too-large');return {name:f.name,bytes};});
   const created=[];
   try{return await (async()=>{const result=[];for(const f of files){const ext=path.extname(f.name),stem=path.basename(f.name,ext).slice(0,70),dest=path.join(directory,stem+'-'+uuid()+ext);await fs.writeFile(dest,f.bytes,{flag:'wx',mode:0o600});created.push(dest);const rel=path.relative(path.dirname(note),dest).split(path.sep).map(p=>encodeURIComponent(p).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase())).join('/');const label=f.name.replace(/[\[\]\\]/g,'\\$&').replace(/[\r\n]/g,' ');result.push({path:path.relative(this.state.root,dest).split(path.sep).join('/'),markdown:(MIME[ext.toLowerCase()]?.startsWith('image/')?'!':'')+'['+label+']('+rel+')'});}return result;})();}catch(e){await Promise.all(created.map(p=>fs.unlink(p)));throw e;}
  }
  if(a.op==='list'){
   const dir=await this.resolve(a.path||'');const entries=await fs.readdir(dir,{withFileTypes:true});return entries.filter(e=>!e.name.startsWith('.')&&!e.isSymbolicLink()).map(e=>({name:e.name,path:path.posix.join(a.path||'',e.name),directory:e.isDirectory()})).sort((a,b)=>Number(b.directory)-Number(a.directory)||a.name.localeCompare(b.name));
  }
  if(a.op==='tree'){
   const all=a.expanded==='all';if(!all&&(!Array.isArray(a.expanded)||a.expanded.some(p=>typeof p!=='string')))fail('invalid-request');
   const expanded=new Set(all?[]:a.expanded),opened=[],entries=[];
   const walk=async(rel='',depth=0)=>{for(const e of await this.run({op:'list',path:rel})){
    entries.push({...e,depth});
    if(e.directory&&(all||expanded.has(e.path))){opened.push(e.path);await walk(e.path,depth+1);}
   }};await walk();return {entries,expanded:opened};
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
   const bytes=await fs.readFile(p),after=await fs.stat(p);let result={path:a.path,kind,version:hash(bytes),size:bytes.length,stamp:fileStamp(st)===fileStamp(after)?fileStamp(after):null};
   if(kind==='text'){let text;try{text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);}catch{fail('unsupported-encoding');}const bom=text.startsWith('\ufeff');if(bom)text=text.slice(1);result={...result,text,bom,eol:text.includes('\r\n')?'crlf':'lf'};}
   else result.url=`data:${MIME[ext]};base64,${bytes.toString('base64')}`;
   if(a.touch!==false){this.state.recent=[a.path,...this.state.recent.filter(x=>x!==a.path)].slice(0,15);await this.persist();}return result;
  }
  if(a.op==='save'){
   const p=await this.resolve(a.path);if(!TEXT.has(path.extname(p).toLowerCase())||typeof a.text!=='string'||Buffer.byteLength(a.text)>5*1024*1024)fail('invalid-text');
   const before=await fs.readFile(p);if(hash(before)!==a.version)fail('conflict');const stat=await fs.stat(p);
   const bytes=Buffer.from((a.bom?'\ufeff':'')+a.text);const temp=path.join(path.dirname(p),'.documents-'+randomUUID()+'.tmp');
   try{await fs.writeFile(temp,bytes,{mode:stat.mode&0o777,flag:'wx'});await this.resolve(a.path);if(hash(await fs.readFile(p))!==a.version)fail('conflict');await fs.rename(temp,p);}finally{await fs.unlink(temp).catch(()=>{});}
   // Force one verified reread after save; a later stat could already belong to an external edit.
   return {version:hash(bytes),stamp:null};
  }
  if(a.op==='create'){
   if(typeof a.path!=='string'||path.extname(a.path).toLowerCase()!=='.md')fail('invalid-name');const p=await this.resolve(a.path,true);await fs.writeFile(p,'',{flag:'wx',mode:0o600});return {path:a.path};
  }
  if(a.op==='mkdir'){
   if(typeof a.path!=='string'||!a.path||a.path.split(/[\\/]/).pop().startsWith('.'))fail('invalid-name');
   const p=await this.resolve(a.path,true);await fs.mkdir(p,{mode:0o700});return {path:a.path};
  }
  if(a.op==='openExternal'){
   const p=await this.resolve(a.path);if(!(await fs.stat(p)).isFile())fail('not-file');
   const command=process.platform==='darwin'?'open':process.platform==='win32'?null:'xdg-open';if(!command)fail('external-unavailable');
   await new Promise((ok,no)=>{const c=spawn(command,[p],{stdio:'ignore'});c.on('error',()=>no(new LibraryError('external-unavailable')));c.on('exit',code=>code===0?ok():no(new LibraryError('external-unavailable')));});return {opened:true};
  }
  fail('invalid-operation');
 }
}
