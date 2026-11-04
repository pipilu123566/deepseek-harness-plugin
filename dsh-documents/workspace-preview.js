import {AutoSave} from './autosave.js';
import {parseWorkspaceAddress,workspaceAddress,markdownPreviewDefinition,workspaceDraftId} from './workspace-address.js';
import {explorerIcon} from './explorer-ui.js';
import {BrowserWorkspaceRecovery,workspaceBackup,workspaceRecoveries} from './workspace-browser-recovery.js';

/** A file-tab adapter; the editor, IME gate and writer are the existing shared implementations. */
export function createWorkspacePreview({React,ctx,api,t,Editor}){
 const h=React.createElement,entries=new Map(),pendingHeadings=new Map(),local=new BrowserWorkspaceRecovery(),ID=markdownPreviewDefinition(()=>t('workspaceEditor')).id;
 let disposePreview=null,disposeClose=null,stopped=false,syncing=false,settingQueue=Promise.resolve();
 const status=s=>s.error?'paused':s.saving?'saving':s.dirty?'dirty':'saved';
 const message=e=>t(({composing:'finishInput',conflict:'conflict','read-only':'workspaceReadOnly','unknown-session':'workspaceUnknownSession','outside-root':'workspaceOutside',symlink:'denied','unsupported-encoding':'encoding','too-large':'large',ENOENT:'missing','not-file':'missing',timeout:'workspaceDisconnected',transport:'workspaceDisconnected'})[e?.message]||'error');
 function entryFor(key,file){
  let entry=entries.get(key);if(entry)return entry;
  // A closed offline tab still owns its unsaved buffer. Reopening the same
  // resource adopts it; a duplicate live tab keeps a separate guarded writer.
  for(const retained of entries.values())if(!retained.mounted&&retained.writer.state.dirty&&retained.file.sessionId===file.sessionId&&(retained.file.path===file.path||retained.writer.state.doc?.path===file.path)){
   entries.delete(retained.key);retained.key=key;entries.set(key,retained);return retained;
  }
  const scoped=request=>api({...request,sessionId:file.sessionId});
  const writer=new AutoSave(s=>scoped({op:'workspaceSave',path:s.doc.path,text:s.text,version:s.doc.version}));
  writer.backup=workspaceBackup(scoped,file.sessionId,local,error=>{if(writer.state.browserRecoveryError!==error)writer.publish({browserRecoveryError:error});});
  entry={key,file,writer,scoped,mounted:0,tabId:null};entries.set(key,entry);return entry;
 }
 async function flushAll(){for(const e of entries.values()){if(e.writer.state.composing)throw Error('composing');if(!await e.writer.flush())throw Error('composing');}}
 function registration(enabled){
  if(enabled&&!disposePreview){
   disposeClose=ctx.sidebarRight.registerCloseHandler('text',(_session,tab)=>{for(const e of entries.values())if(e.tabId===tab.id){if(e.writer.state.composing)throw Error(t('finishInput'));void e.writer.flush().catch(()=>{});}});
   disposePreview=ctx.documentPreviews.register(markdownPreviewDefinition(()=>t('workspaceEditor')));
  }else if(!enabled&&disposePreview){disposePreview();disposePreview=null;disposeClose?.();disposeClose=null;}
 }
 async function refresh(){if(stopped||syncing)return;syncing=true;try{const {enabled}=await api({op:'previewSettings'});if(!enabled&&disposePreview)await flushAll();if(!stopped)registration(enabled);}catch{}finally{syncing=false;}}
 async function setEnabled(enabled){
  const next=settingQueue.catch(()=>{}).then(async()=>{if(!enabled)await flushAll();const result=await api({op:'previewSettings',enabled});registration(result.enabled);return result;});settingQueue=next;return next;
 }
 function WorkspacePreview(props){const {tab}=props.useTabInfo();return h(Body,{...props,key:tab.id+'\0'+props.resourceAddress,tab});}
 function Body({resourceAddress,content,scrollportRef,tab}){
  const file=React.useMemo(()=>parseWorkspaceAddress(resourceAddress),[resourceAddress]);
  if(!file)return h('p',{role:'alert'},t('workspaceUnknownSession'));
  return h(FileBody,{file,resourceAddress,content,scrollportRef,tab});
 }
 function FileBody({file,resourceAddress,content,scrollportRef,tab}){
  const entry=React.useMemo(()=>entryFor(tab.id+'\0'+resourceAddress,file),[tab.id,resourceAddress]),{writer,scoped}=entry;
  const area=React.useRef(null),container=React.useRef(null),alive=React.useRef(true),request=React.useRef(0),owner=React.useRef(content),scrollOwner=React.useRef(scrollportRef),read=React.useRef(null),lastLoaded=React.useRef(null),navigated=React.useRef(null);
  owner.current=content;scrollOwner.current=scrollportRef;
  const [state,setState]=React.useState(writer.state),[loading,setLoading]=React.useState(!writer.state.doc),[notice,setNotice]=React.useState(''),[recovery,setRecovery]=React.useState(null),[outline,setOutline]=React.useState(false),[headings,setHeadings]=React.useState([]),[active,setActive]=React.useState(null),[loadedRevision,setLoadedRevision]=React.useState(0);
  const revision=content.kind==='renderer'?content.revision:0;
  const tellLoaded=version=>{if(owner.current.kind==='renderer')owner.current.loaded(version);};
  const run=async fn=>{try{await fn();}catch(e){if(alive.current)setNotice(message(e));}};
  const flush=async()=>{if(!await writer.flush())throw Error('composing');};
  read.current=async()=>{
   const ticket=++request.current;
   if(writer.state.composing){setNotice(t('finishInput'));return;}
   if(writer.state.dirty||writer.state.saving){try{await flush();}catch(e){setNotice(message(e));return;}}
   setLoading(!writer.state.doc);
   try{
    const doc=await scoped({op:'workspaceRead',path:file.path});
    if(!alive.current||ticket!==request.current||tab.signal.aborted)return;
    // A read in flight must never replace newly typed or marked text.
    if(writer.state.dirty||writer.state.saving||writer.state.composing){lastLoaded.current=null;setNotice(t('workspaceReloadDeferred'));return;}
    const previous=writer.state.doc;
    if(!previous||previous.version!==doc.version||previous.writable!==doc.writable)writer.open({...doc,recoveryId:previous?.recoveryId||workspaceDraftId()});
    tellLoaded(doc.version);lastLoaded.current=revision;
    if(!previous){try{const r=await workspaceRecoveries(scoped,file.sessionId,doc,local);if(alive.current&&ticket===request.current)setRecovery(r?{...r,doc}:null);}catch{setNotice(t('recoveryWarning'));}}
    if(alive.current){setLoadedRevision(v=>v+1);setNotice(doc.permissionUnknown?t('workspaceUnknownSession'):doc.writable?'':t('workspaceReadOnly'));}
   }catch(e){if(alive.current&&ticket===request.current){setNotice(message(e));if(owner.current.kind==='renderer')owner.current.failed();}}
   finally{if(alive.current&&ticket===request.current)setLoading(false);}
  };
  React.useEffect(()=>{
   alive.current=true;entry.mounted++;entry.tabId=tab.id;
   const off=writer.subscribe(next=>{if(alive.current)setState(old=>['doc','dirty','saving','composing','error','recoveryError','browserRecoveryError'].some(k=>old[k]!==next[k])?next:old);});
   const unload=e=>{if(writer.state.dirty||writer.state.composing){e.preventDefault();e.returnValue='';}};
   window.addEventListener('beforeunload',unload);
   return()=>{alive.current=false;request.current++;entry.mounted--;off();scrollOwner.current?.(null);window.removeEventListener('beforeunload',unload);void writer.flush().catch(()=>{}).finally(()=>{if(!entry.mounted&&!writer.state.dirty&&!writer.state.composing){writer.stop();entries.delete(entry.key);}});};
  },[entry]);
  React.useEffect(()=>{if(content.kind==='renderer'&&!state.composing&&lastLoaded.current!==revision)void read.current();},[revision,state.composing]);
  React.useEffect(()=>{if(state.doc&&!state.saving&&!state.dirty&&!state.error)tellLoaded(state.doc.version);},[state.doc?.version,state.saving,state.dirty,state.error]);
  React.useEffect(()=>{
   if(!state.doc)return;let checking=false,cancelled=false;
   const check=async()=>{
    const s=writer.state;if(checking||document.hidden||!tab.visible||s.saving||s.composing||s.error)return;checking=true;
    try{const p=await scoped({op:'workspaceProbe',path:s.doc.path,version:s.doc.version});if(cancelled||!alive.current||writer.state.doc?.version!==s.doc.version)return;
     const latest=writer.state;if(latest.composing||latest.saving)return;
     if(p.changed){if(latest.dirty)writer.block(Error('conflict'));else void read.current();}
     else if(p.writable!==latest.doc.writable){if(latest.dirty)writer.block(Error('read-only'));else void read.current();}
    }catch(e){if(!cancelled&&alive.current)setNotice(message(e));}finally{checking=false;}
   };
   const timer=setInterval(check,3000),foreground=()=>{if(!document.hidden)void check();};window.addEventListener('focus',foreground);document.addEventListener('visibilitychange',foreground);
   return()=>{cancelled=true;clearInterval(timer);window.removeEventListener('focus',foreground);document.removeEventListener('visibilitychange',foreground);};
  },[state.doc?.path,tab.visible]);
  React.useLayoutEffect(()=>{if(!state.doc||!area.current)return;scrollOwner.current?.(area.current.view.scrollDOM);return()=>scrollOwner.current?.(null);},[!!state.doc,state.doc?.writable]);
  React.useEffect(()=>{
   if(!state.doc||state.composing)return;const fragment=pendingHeadings.get(resourceAddress);
   if(fragment!==undefined){pendingHeadings.delete(resourceAddress);navigated.current=tab.navigation.revision;void area.current?.jumpHeading(fragment).then(result=>{if(alive.current&&result!=='ok')setNotice(t('headingMissing'));});}
   else if(navigated.current!==tab.navigation.revision){const line=tab.navigation.params?.line;if(Number.isSafeInteger(line)&&line>0){const editor=area.current,doc=editor?.view.state.doc;if(doc)editor.jumpTo(doc.line(Math.min(line,doc.lines)).from);}navigated.current=tab.navigation.revision;}
  },[loadedRevision,tab.navigation.revision,state.composing]);
  const copyText=async text=>{if(navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(text);return;}catch{}}
   const field=document.createElement('textarea'),focused=document.activeElement;field.value=text;field.style.cssText='position:fixed;opacity:0;left:0;top:0';container.current.append(field);try{field.select();if(!document.execCommand('copy'))throw Error('clipboard');}finally{field.remove();focused?.focus({preventScroll:true});}};
  const copy=async()=>{if(writer.state.composing)throw Error('composing');await copyText(writer.state.text);setNotice(t('recoveryCopied'));};
  const link=target=>run(async()=>{if(writer.state.composing)throw Error('composing');await flush();const result=await scoped({op:'workspaceLink',path:writer.state.doc.path,target});if(result.path===writer.state.doc.path&&result.fragment!==null){const resultCode=await area.current.jumpHeading(result.fragment);if(resultCode!=='ok')setNotice(t('headingMissing'));return;}const address=workspaceAddress(file.sessionId,result.path);if(result.fragment!==null&&result.fragment!==undefined)pendingHeadings.set(address,result.fragment);tab.actions.openResource(address);});
  const button=(label,fn,disabled=false)=>h('button',{type:'button',disabled,onClick:()=>void run(fn)},t(label));
  const discard=()=>{if(writer.state.composing)throw Error('composing');if(!window.confirm(t('discard')+'?'))return;return writer.dropDraft(writer.state).then(()=>{writer.open(null);lastLoaded.current=null;return read.current();});};
  return h('section',{className:'pdoc pdoc-workspace-preview',ref:container,'aria-label':t('workspaceEditor')},h('style',null,previewCSS),
   h('div',{className:'pdoc-workspace-tools'},h('button',{type:'button','aria-label':t('outline'),'aria-pressed':outline,onClick:()=>setOutline(v=>!v)},explorerIcon(React,'outline')),h('button',{type:'button','aria-label':t('find'),onClick:()=>{if(!area.current?.find())setNotice(t('finishInput'));}},explorerIcon(React,'search')),h('span',{role:'status'},t(loading?'loading':state.doc?status(state):'workspaceNotLoaded'))),
   (notice||state.error)&&h('div',{role:'alert',className:'pdoc-workspace-notice'},state.error?message(state.error):notice),
   (state.recoveryError||state.browserRecoveryError)&&h('div',{role:'alert'},t('recoveryWarning')),
   state.error&&h('div',{className:'pdoc-workspace-tools'},button('retry',()=>writer.retry()),button('copyDraft',copy),button('reload',discard)),
   !state.doc&&!loading&&button('retry',()=>read.current()),
   recovery&&h('div',{className:'pdoc-workspace-recovery',role:'region','aria-label':t('recovery')},h('span',null,t('recovery')),recovery.drafts.length>1&&h('select',{'aria-label':t('recoveryChoice'),value:recovery.draft.id,onChange:e=>void run(async()=>{const item=recovery.drafts.find(d=>d.id===e.target.value);const draft=item.text!==undefined?item:(await scoped({op:'workspaceRecoveryRead',path:writer.state.doc.path,id:item.id})).draft;setRecovery(draft?{...recovery,draft}:null);})},recovery.drafts.map((r,i)=>h('option',{key:r.id,value:r.id},(i+1)+' · '+new Date(r.updated).toLocaleString()))),button('restore',async()=>{if(writer.state.composing||writer.state.dirty)throw Error('conflict');const r=recovery;writer.publish({doc:{...writer.state.doc,recoveryVersion:r.draft.version}});writer.change(r.draft.text);if(r.draft.version!==writer.state.doc.version)writer.block(Error('conflict'));if(await writer.retainDraft())await writer.backup.drop({doc:{...writer.state.doc,recoveryId:r.draft.id},text:r.draft.text});setRecovery(null);},!state.doc?.writable),button('copyDraft',async()=>{await copyText(recovery.draft.text);setNotice(t('recoveryCopied'));}),button('later',()=>setRecovery(null))),
   h('div',{className:'pdoc-workspace-editing'},outline&&h('nav',{'aria-label':t('outline'),className:'pdoc-workspace-outline'},headings.length?headings.map(item=>h('button',{type:'button',key:item.from,'aria-current':item.from===active?'location':undefined,style:{paddingLeft:6+item.depth*12},onMouseDown:e=>e.preventDefault(),onClick:()=>{if(!area.current?.jumpTo(item.from))setNotice(t('finishInput'));}},item.text)):h('p',null,t('outlineEmpty'))),
    state.doc&&h(Editor,{key:String(state.doc.writable),value:writer.state.text,label:state.doc.path,markdown:true,readOnly:!state.doc.writable,apiRef:area,onChange:text=>{writer.change(text);setNotice('');},onComposition:value=>writer.composition(value),onSave:()=>run(flush),onOutline:outline?setHeadings:undefined,onActiveHeading:setActive,openLink:link,resolveImage:async target=>(await scoped({op:'workspaceImage',path:writer.state.doc.path,target})).url})),
   h('div',{className:'pdoc-workspace-hint'},t('keyboard')));
 }
 function start(){void refresh();const timer=setInterval(()=>{if(!document.hidden)void refresh();},5000),focus=()=>void refresh();window.addEventListener('focus',focus);return async()=>{stopped=true;clearInterval(timer);window.removeEventListener('focus',focus);disposePreview?.();disposeClose?.();for(const e of entries.values()){try{await e.writer.flush();}catch{}await e.writer.retainDraft();await e.writer.backupQueue;e.writer.stop();}entries.clear();pendingHeadings.clear();await local.close();};}
 return {Component:WorkspacePreview,ID,start,setEnabled,refresh,flushAll};
}

const previewCSS=`.pdoc-workspace-preview{height:100%;min-height:240px;min-width:0;display:flex;flex-direction:column;gap:8px;padding:8px;font:inherit;color:var(--dsw-alias-label-primary);box-sizing:border-box}.pdoc-workspace-preview *{box-sizing:border-box}.pdoc-workspace-preview button{font:inherit;color:inherit;cursor:pointer;border:0;border-radius:var(--dsw-radius-sm,6px);background:transparent;padding:5px 8px;min-height:30px}.pdoc-workspace-preview button:hover,.pdoc-workspace-preview [aria-current=location],.pdoc-workspace-preview [aria-pressed=true]{background:var(--dsw-alias-interactive-bg-hover,#8882)}.pdoc-workspace-preview button:focus-visible{outline:2px solid var(--dsw-focus-ring-color,#8973c4)}.pdoc-workspace-tools{display:flex;gap:5px;align-items:center;flex-wrap:wrap;flex:none}.pdoc-workspace-tools button:has(svg){display:inline-flex;padding:5px}.pdoc-workspace-tools [role=status],.pdoc-workspace-hint{font-size:12px;color:var(--dsw-alias-label-secondary)}.pdoc-workspace-notice{font-size:12px;overflow-wrap:anywhere}.pdoc-workspace-editing{display:flex;flex:1;min-height:160px;min-width:0;gap:8px}.pdoc-workspace-preview .pdoc-live-editor{flex:1;min-width:0;min-height:160px;overflow:hidden}.pdoc-workspace-outline{width:150px;max-width:35%;flex:none;overflow:auto;border-right:1px solid var(--dsw-alias-border-l2,#8883);font-size:12px}.pdoc-workspace-outline button{display:block;width:100%;text-align:left;overflow-wrap:anywhere}.pdoc-workspace-recovery{padding:8px;border:1px solid var(--dsw-alias-border-l2,#8883);border-radius:6px}.pdoc-workspace-hint{flex:none;overflow-wrap:anywhere}`;
