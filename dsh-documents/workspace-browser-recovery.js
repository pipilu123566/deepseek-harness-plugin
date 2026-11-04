/** IndexedDB writes happen on the existing idle backup path, never on each key. */
export class BrowserWorkspaceRecovery {
 constructor(factory){this.factory=factory;if(factory===undefined){try{this.factory=globalThis.indexedDB;}catch{this.factory=null;}}this.opening=null;}
 open(){
  if(!this.factory)return Promise.reject(Error('browser-recovery-unavailable'));
  if(!this.opening)this.opening=new Promise((resolve,reject)=>{let blocked=false;const r=this.factory.open('pipilu-documents-workspace-recovery',2);r.onupgradeneeded=()=>{const db=r.result,store=db.objectStoreNames.contains('drafts')?r.transaction.objectStore('drafts'):db.createObjectStore('drafts',{keyPath:'key'});if(!store.indexNames.contains('file'))store.createIndex('file',['sessionId','path']);if(!db.objectStoreNames.contains('sizes')){const sizes=db.createObjectStore('sizes',{keyPath:'key'}),cursor=store.openCursor();cursor.onsuccess=()=>{const c=cursor.result;if(c){sizes.put({key:c.key,size:c.value.size??c.value.text.length*2});c.continue();}};}};r.onsuccess=()=>{const db=r.result;if(blocked){db.close();return;}db.onversionchange=()=>{db.close();this.opening=null;};resolve(db);};r.onerror=()=>{this.opening=null;reject(r.error);};r.onblocked=()=>{blocked=true;this.opening=null;reject(Error('browser-recovery-unavailable'));};});
  return this.opening;
 }
 async list(sessionId,path){const db=await this.open();return new Promise((resolve,reject)=>{const tx=db.transaction('drafts','readonly'),r=tx.objectStore('drafts').index('file').getAll([sessionId,path]);r.onsuccess=()=>resolve(r.result.sort((a,b)=>b.updated-a.updated));r.onerror=()=>reject(r.error);tx.onabort=()=>reject(tx.error);});}
 async retain(sessionId,s,revision){
  const db=await this.open(),record={key:JSON.stringify([sessionId,s.doc.path,s.doc.recoveryId]),sessionId,path:s.doc.path,id:s.doc.recoveryId,version:s.doc.recoveryVersion||s.doc.version,text:s.text,revision,updated:Date.now(),size:s.text.length*2};
  return new Promise((resolve,reject)=>{const tx=db.transaction(['drafts','sizes'],'readwrite'),store=tx.objectStore('drafts'),sizes=tx.objectStore('sizes'),r=sizes.getAll();let failure;
   r.onsuccess=()=>{const others=r.result.filter(d=>d.key!==record.key);if(!browserRecoveryBudget(others,record.size)){failure=Error('recovery-limit');tx.abort();return;}store.put(record);sizes.put({key:record.key,size:record.size});};
   tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(failure||tx.error||Error('browser-recovery-unavailable'));
  });
 }
 async drop(sessionId,s){const db=await this.open(),key=JSON.stringify([sessionId,s.doc.path,s.doc.recoveryId]);return new Promise((resolve,reject)=>{const tx=db.transaction(['drafts','sizes'],'readwrite'),store=tx.objectStore('drafts'),r=store.get(key);r.onsuccess=()=>{if(r.result?.text===s.text){store.delete(key);tx.objectStore('sizes').delete(key);}};tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
 async close(){const opened=this.opening;this.opening=null;if(opened){try{(await opened).close();}catch{}}}
}

/** A browser copy survives a host/client restart even when the Remote is offline. */
export function workspaceBackup(scoped,sessionId,local,onLocalError){
 let revision=0,retained=null,pending=null;
 const either=async tasks=>{const results=await Promise.allSettled(tasks.map(task=>Promise.resolve().then(task)));onLocalError?.(results[0].status==='rejected'?results[0].reason:null);if(!results.some(r=>r.status==='fulfilled'))throw results[0].reason;};
 return {
  retain:s=>{if(retained&&retained.doc.path===s.doc.path&&retained.doc.recoveryId===s.doc.recoveryId&&retained.doc.version===s.doc.version&&retained.text===s.text)return pending;retained=s;const next=++revision;pending=either([()=>local.retain(sessionId,s,next),()=>scoped({op:'workspaceRecoveryWrite',path:s.doc.path,id:s.doc.recoveryId,version:s.doc.recoveryVersion||s.doc.version,text:s.text,revision:next})]).catch(e=>{retained=null;throw e;});return pending;},
  drop:s=>{if(retained?.doc.recoveryId===s.doc.recoveryId&&retained.text===s.text)retained=null;return either([()=>local.drop(sessionId,s),()=>scoped({op:'workspaceRecoveryDrop',path:s.doc.path,id:s.doc.recoveryId,text:s.text})]);},
 };
}

/** Merge full browser copies with host metadata; a newer local copy wins per id. */
export async function workspaceRecoveries(scoped,sessionId,doc,local){
 const results=await Promise.allSettled([local.list(sessionId,doc.path),scoped({op:'workspaceRecoveryRead',path:doc.path})]);
 if(results.every(r=>r.status==='rejected'))throw results[0].reason;
 const browser=results[0].status==='fulfilled'?results[0].value:[],host=results[1].status==='fulfilled'?results[1].value:{drafts:[],draft:null};
 const records=new Map(host.drafts.map(d=>[d.id,{...d,origin:'host',...(host.draft?.id===d.id?host.draft:{})}]));
 // Revisions belong to one writer id; wall clocks on a remote host and browser may differ.
 for(const d of browser){const old=records.get(d.id);if(!old||(d.revision??0)>=(old.revision??0))records.set(d.id,{...d,origin:'browser'});}
 const drafts=[...records.values()].sort((a,b)=>b.updated-a.updated),backup=workspaceBackup(scoped,sessionId,local),kept=[];
 for(const d of drafts){if(d.text===doc.text){await backup.drop({doc:{...doc,recoveryId:d.id},text:d.text});continue;}kept.push(d);}
 for(const first of kept){const draft=first.text!==undefined?first:(await scoped({op:'workspaceRecoveryRead',path:doc.path,id:first.id})).draft;if(draft)return {drafts:kept,draft};}
 return null;
}

/** Admit a new/replacement draft using metadata only; pending drafts are never evicted. */
export function browserRecoveryBudget(otherSizes,nextSize){return otherSizes.length<20&&otherSizes.reduce((n,d)=>n+d.size,nextSize)<=20*1024*1024;}
