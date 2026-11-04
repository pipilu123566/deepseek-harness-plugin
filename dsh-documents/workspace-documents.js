import path from 'node:path';
import {Recovery} from './recovery.js';
import {splitDocumentLink} from './document-navigation.js';

const LIMIT=5*1024*1024;
const fail=code=>{const e=Error(code);e.code=code;throw e;};
const markdown=p=>/\.(md|markdown)$/i.test(p);
const mime={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp'};
const validVersion=v=>typeof v==='string'&&v.length>0&&v.length<=2048;

/** Session paths always resolve in ctx.fs's execution world, never node:fs. */
export class WorkspaceDocuments {
 constructor(ctx,stateDir){this.ctx=ctx;this.stateDir=stateDir;this.controllers=new Set();this.drafts=Promise.resolve();}
 stop(){for(const c of this.controllers)c.abort();this.controllers.clear();}
 async scope(id,signal){
  if(typeof id!=='string'||!id||id.length>200||!/^[\w.-]+$/.test(id))fail('invalid-session');
  const session=this.ctx.sessions.get(id),stored=session?undefined:await this.ctx.get('sessionPersistence')?.stat(id,{signal}),header=session?.header??stored?.header;
  if(!header)fail('unknown-session');
  const root=header.cwd??this.ctx.sandboxPolicy.workspaceRoot;
  // The official query reads exact cold projections without starting an Agent.
  let permissionUnknown=false,policy;
  if(session)policy=this.ctx.sandboxPolicy.resolve({session});
  else {
   let projection;try{projection=await this.ctx.get('sessionController')?.projections({sessionId:id},signal);}catch{signal?.throwIfAborted();}
   const mode=projection?.values?.sandboxMode??this.ctx.sandboxPolicy.defaultMode,known=projection?.kind==='sequenced'&&['read-only','workspace-write','danger-full-access'].includes(mode);
   permissionUnknown=!known;policy={mode:known?mode:'read-only',workspaceRoot:root,sessionId:id};
  }
  return {id,root,policy,permissionUnknown};
 }
 async locate(scope,p,signal,{missing=false,any=false}={}){
  if(typeof p!=='string'||!p||p.length>8192||/[\0\r\n]/.test(p)||(!any&&!markdown(p)))fail('invalid-path');
  const fs=this.ctx.fs,root=await fs.resolve(scope.root,{signal}),entry=await fs.lstat(p,{cwd:scope.root},signal);
  if(!entry&&!missing)fail('ENOENT');if(entry&&entry.type!=='file')fail(entry.type==='symlink'?'symlink':'not-file');
  const target=await fs.resolve(p,{cwd:scope.root,signal});if(!fs.contains(root,target))fail('outside-root');
  const info=await fs.stat(target,signal);if(info&&info.type!=='file')fail('not-file');if(!info&&!missing)fail('ENOENT');
  return {target,info,path:fs.processPath(target),root};
 }
 async full(scope,p,signal){
  const fs=this.ctx.fs,f=await this.locate(scope,p,signal);if(f.info.size>LIMIT)fail('too-large');
  const bytes=await fs.readBytes(f.target,signal,LIMIT),after=await fs.stat(f.target,signal);
  if(!after||after.version!==f.info.version)fail('conflict');if(bytes.byteLength>LIMIT)fail('too-large');
  let raw;try{raw=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);}catch{fail('unsupported-encoding');}
  if(raw.includes('\0'))fail('unsupported-encoding');
  const bom=raw.startsWith('\uFEFF');if(bom)raw=raw.slice(1);
  return {...f,bom,eol:raw.includes('\r\n')?'crlf':'lf',text:raw.replace(/\r\n/g,'\n'),version:after.version};
 }
 async execute(a){
  if(!a||a.root!==undefined)fail('invalid-request');
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);this.controllers.add(controller);
  try{return await this.run(a,controller.signal);}finally{clearTimeout(timeout);this.controllers.delete(controller);}
 }
 async run(a,signal){
  const scope=await this.scope(a.sessionId,signal),fs=this.ctx.fs;
  if(a.op==='workspaceRead'){
   const f=await this.full(scope,a.path,signal);
   return {kind:'text',path:f.path,text:f.text,version:f.version,bom:f.bom,eol:f.eol,writable:scope.policy.mode!=='read-only',cold:!this.ctx.sessions.get(scope.id),permissionUnknown:scope.permissionUnknown};
  }
  if(a.op==='workspaceSave'){
   if(typeof a.text!=='string'||a.text.includes('\0')||Buffer.byteLength(a.text)>LIMIT||!validVersion(a.version))fail('invalid-save');
   const f=await this.full(scope,a.path,signal);if(f.version!==a.version)fail('conflict');if(scope.policy.mode==='read-only')fail('read-only');
   const freshScope=await this.scope(a.sessionId,signal);if(freshScope.root!==scope.root||freshScope.policy.mode==='read-only')fail('read-only');
   const fresh=await this.locate(freshScope,a.path,signal);if(fresh.target.targetKey!==f.target.targetKey)fail('conflict');
   const raw=(f.bom?'\uFEFF':'')+(f.eol==='crlf'?a.text.replace(/\r?\n/g,'\r\n'):a.text);
   if(Buffer.byteLength(raw)>LIMIT)fail('too-large');
   const result=await fs.writeText(fresh.target,raw,{kind:'replaceIfVersion',version:a.version},signal,freshScope.policy);
   return {version:result.version};
  }
  if(a.op==='workspaceProbe'){
   const f=await this.locate(scope,a.path,signal);return {version:f.info.version,changed:f.info.version!==a.version,writable:scope.policy.mode!=='read-only',cold:!this.ctx.sessions.get(scope.id)};
  }
  if(a.op==='workspaceLink'||a.op==='workspaceImage'){
   if(typeof a.target!=='string'||a.target.length>8192||/^(?:[a-z][\w+.-]*:|\/\/)/i.test(a.target))fail('invalid-path');
   let target,fragment;try{({path:target,fragment}=splitDocumentLink(a.target));}catch{fail('invalid-path');}
   const base=await this.locate(scope,a.path,signal),paths=base.path.startsWith('/')?path.posix:path.win32;
   let dest=target?paths.resolve(paths.dirname(base.path),target.replace(/\\/g,'/')):base.path;
   if(a.op==='workspaceLink'&&target&&!paths.extname(dest))dest+='.md';
   const f=await this.locate(scope,dest,signal,{any:true});
   if(a.op==='workspaceLink')return {path:f.path,fragment};
   const type=mime[paths.extname(f.path).toLowerCase()];if(!type)fail('invalid-image');
   if(f.info.size>25*1024*1024)fail('too-large');const bytes=await fs.readBytes(f.target,signal,25*1024*1024);
   return {url:'data:'+type+';base64,'+Buffer.from(bytes).toString('base64')};
  }
  if(/^workspaceRecovery(?:Read|Write|Drop)$/.test(a.op)){
   const f=await this.locate(scope,a.path,signal,{missing:true});
   const adapter={stateDir:path.join(this.stateDir,'workspace'),state:{root:scope.id+'\0'+fs.fileUrl(f.root)},validRecoveryVersion:validVersion,resolve:async()=>f.path};
   const store=new Recovery(adapter),request={...a,path:f.path,op:a.op.replace('workspaceRecovery','recovery')};
   const pending=this.drafts.catch(()=>{}).then(()=>store.run(request));this.drafts=pending.catch(()=>{});return pending;
  }
  fail('invalid-request');
 }
}

export function workspaceError(error){return ({FS_STALE_VERSION:'conflict',FS_NOT_FOUND:'ENOENT',FS_NOT_REGULAR_FILE:'not-file',FS_NOT_TEXT:'unsupported-encoding',FS_TOO_LARGE:'too-large',FS_SANDBOX_DENIED:'read-only',FS_PERMISSION_DENIED:'EACCES',ABORT_ERR:'timeout'})[error?.code]||error?.code||'io-error';}
