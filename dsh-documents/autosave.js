/** One serialized writer per editor buffer. Saving never replaces the current editor text. */
export class AutoSave {
 constructor(write,delay=700){this.write=write;this.delay=delay;this.listeners=new Set();this.state={doc:null,text:'',original:'',dirty:false,saving:false,composing:false,error:null};this.timer=null;this.inflight=null;this.stopped=false;this.backup=null;this.backupTimer=null;this.backupQueue=Promise.resolve();}
 subscribe(fn){this.listeners.add(fn);fn(this.state);return()=>this.listeners.delete(fn);}
 publish(patch){this.state={...this.state,...patch};for(const fn of this.listeners)fn(this.state);}
 cancel(){clearTimeout(this.timer);this.timer=null;clearTimeout(this.backupTimer);this.backupTimer=null;}
 retainDraft(snapshot=this.state){if(!this.backup||!snapshot.dirty||snapshot.composing)return Promise.resolve(false);this.backupQueue=this.backupQueue.catch(()=>{}).then(()=>this.backup.retain(snapshot)).then(()=>{if(this.state.doc?.path===snapshot.doc.path&&this.state.doc?.recoveryId===snapshot.doc.recoveryId&&this.state.recoveryError)this.publish({recoveryError:null});return true;},e=>{if(this.state.doc?.path===snapshot.doc.path&&this.state.doc?.recoveryId===snapshot.doc.recoveryId)this.publish({recoveryError:e});return false;});return this.backupQueue;}
 dropDraft(snapshot){if(this.backup)this.backupQueue=this.backupQueue.catch(()=>{}).then(()=>this.backup.drop(snapshot)).then(()=>{if(this.state.doc?.path===snapshot.doc.path&&this.state.doc?.recoveryId===snapshot.doc.recoveryId&&this.state.recoveryError)this.publish({recoveryError:null});},e=>{if(this.state.doc?.path===snapshot.doc.path&&this.state.doc?.recoveryId===snapshot.doc.recoveryId)this.publish({recoveryError:e});});return this.backupQueue;}
 schedule(){this.cancel();if(!this.stopped&&this.state.dirty&&!this.state.composing){if(this.backup)this.backupTimer=setTimeout(()=>void this.retainDraft(),Math.min(350,this.delay));if(!this.state.error)this.timer=setTimeout(()=>{this.flush().catch(()=>{});},this.delay);}}
 open(doc){this.cancel();this.publish({doc,text:doc?.text||'',original:doc?.text||'',dirty:false,saving:false,composing:false,error:null,recoveryError:null});}
 change(text){this.publish({text,dirty:this.state.doc?.kind==='text'&&text!==this.state.original});this.schedule();}
 composition(composing){this.publish({composing});this.schedule();}
 block(error){this.cancel();this.publish({error});this.schedule();}
 async flush(){
  this.cancel();
  if(this.stopped)return false;
  if(this.inflight){await this.inflight;return this.flush();}
  if(this.state.error){await this.retainDraft();throw this.state.error;}
  if(this.state.composing)return false;
  if(!this.state.dirty)return true;
  const snapshot=this.state;
  this.publish({saving:true});
  this.inflight=Promise.resolve().then(()=>this.backup?this.retainDraft(snapshot).then(()=>this.write(snapshot)):this.write(snapshot)).then(result=>{
   if(this.state.doc!==snapshot.doc)return;
   this.publish({doc:{...snapshot.doc,version:result.version,stamp:result.stamp,text:snapshot.text},original:snapshot.text,dirty:this.state.text!==snapshot.text});this.dropDraft(snapshot);
  }).catch(error=>{this.block(error);throw error;}).finally(()=>{this.inflight=null;this.publish({saving:false});});
  await this.inflight;
  return this.flush();
 }
 retry(){this.publish({error:null});return this.flush();}
 stop(){this.stopped=true;this.cancel();this.listeners.clear();}
}
