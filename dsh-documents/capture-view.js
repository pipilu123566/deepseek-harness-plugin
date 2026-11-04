import {mountEditor} from './live-preview.js';
import {AutoSave} from './autosave.js';
export const captureCSS=`.pdoc-capture{display:flex;flex-direction:column;height:100%;min-height:260px;gap:10px;color:var(--dsw-alias-label-primary,#24242a);font:15px/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.pdoc-capture header{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.pdoc-capture header strong{font-weight:500;margin-right:auto}.pdoc-capture button{font:inherit;font-size:13px;border:1px solid var(--dsw-alias-border-l2,#8884);border-radius:6px;padding:5px 10px;background:var(--dsw-alias-settings-card-fill,#8881);color:inherit;cursor:pointer}.pdoc-capture button:disabled{opacity:.5;cursor:default}.pdoc-capture button:focus-visible{outline:2px solid #8973c4;outline-offset:2px}.pdoc-capture .pdoc-live-editor{flex:1;min-height:160px;border:1px solid var(--dsw-alias-border-l2,#8883);border-radius:8px;overflow:hidden}.pdoc-capture-status{font-size:12px;color:var(--dsw-alias-label-secondary,#777);overflow-wrap:anywhere}.pdoc-capture [role=alert]{color:var(--dsw-alias-state-danger,#bd4949)}.pdoc-capture input[type=file]{display:none}`;
export async function filesForUpload(files){let total=0;return Promise.all(files.map(async f=>{total+=f.size;if(f.size>64*1024*1024||total>256*1024*1024)throw Error('too-large');const data=await new Promise((ok,no)=>{const reader=new FileReader();reader.onload=()=>ok(reader.result.split(',')[1]);reader.onerror=no;reader.readAsDataURL(f);});return {name:f.name,data};}));}
export function mountCapture(parent,{api,onClose,onOpen,language='zh'}){
 const en=language.startsWith('en'),t=(zh,enText)=>en?enText:zh;
 const el=document.createElement('section');el.className='pdoc-capture';
 const style=document.createElement('style');style.textContent=captureCSS;
 const head=document.createElement('header'),title=document.createElement('strong');title.textContent=t('随记','Quick capture');head.append(title);
 const button=(text,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=fn;head.append(b);return b;};
 let disposed=false,editor,config,committing=false,importing=false,pendingCommit=null,pendingImport=Promise.resolve(),compositionWaiters=[];
 const writer=new AutoSave(s=>api({op:'captureWrite',text:s.text,version:s.doc.version}));
 const status=document.createElement('div');status.className='pdoc-capture-status';status.setAttribute('role','status');
 const host=document.createElement('div');host.className='pdoc-live-editor';
 const say=(text,error=false)=>{if(disposed)return;status.textContent=text;status.setAttribute('role',error?'alert':'status');};
 const attach=button(t('附件','Attach'),()=>fileInput.click());
 const inbox=button('Inbox',()=>onOpen?.(config?.inbox));
 const submit=button(t('追加到 Inbox · ⌘/Ctrl Enter','Append to Inbox · ⌘/Ctrl Enter'),()=>void commit());
 submit.disabled=true;attach.disabled=true;inbox.disabled=true;
 const retry=button(t('重试','Retry'),()=>void writer.retry().catch(e=>say(message(e),true)));retry.hidden=true;
 button(t('关闭','Close'),()=>void close());
 const fileInput=document.createElement('input');fileInput.type='file';fileInput.multiple=true;fileInput.onchange=()=>{void importFiles(Array.from(fileInput.files));fileInput.value='';};
 el.append(style,head,host,status,fileInput);parent.append(el);
 function message(e){return e.message==='conflict'?t('草稿已在其他窗口修改；当前内容已保留，请复制后重新打开。','Draft changed in another window. Your text is retained; copy it before reopening.'):e.message==='attachments-not-configured'?t('请先在文档库配置附件目录。','Configure an attachment folder in Documents first.'):e.message==='too-large'?t('内容或附件超过大小限制。','Content or attachment exceeds the size limit.'):e.message==='empty-capture'?t('先写下一条内容。','Write a note first.'):t('操作未完成，内容已保留。','Operation failed. Your text is retained.');}
 const unload=e=>{if(writer.state.dirty){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',unload);
 const unsubscribe=writer.subscribe(s=>{if(disposed)return;retry.hidden=!s.error||s.error.message==='conflict';if(s.error)say(message(s.error),true);else if(!committing&&!importing)say(t(s.saving?'正在保存草稿…':s.dirty?'等待保存草稿…':'草稿已保留；提交后追加到固定 Inbox。',s.saving?'Saving draft…':s.dirty?'Waiting to save draft…':'Draft retained; submit to append to the fixed Inbox.'));});
 const resolve=async(target,image=false)=>{const r=await api({op:'resolveLink',from:config.inbox,target});if(!image)return onOpen?.(r.path,{fragment:r.fragment});const doc=await api({op:'read',path:r.path,touch:false});return doc.url;};
 async function importFiles(files){if(!files.length||importing||committing||writer.state.composing)return;importing=true;submit.disabled=true;const range={from:editor.selectionStart,to:editor.selectionEnd},revision=editor.value;say(t('正在导入附件…','Importing attachments…'));pendingImport=(async()=>{let imported=false;try{const result=await api({op:'importAttachments',path:config.inbox,files:await filesForUpload(files)});const text='\n'+result.map(r=>r.markdown).join('\n')+'\n';editor.insert(text,editor.value===revision?range:undefined);await writer.flush();imported=true;}catch(e){say(message(e),true);}finally{importing=false;if(!disposed){submit.disabled=false;if(imported&&!writer.state.error)say(t('附件已导入，草稿已保留。','Attachment imported; draft retained.'));}}})();await pendingImport;}
 async function commit(){if(committing||importing||writer.state.composing)return;committing=true;submit.disabled=true;try{
  if(!pendingCommit){await writer.flush();pendingCommit={id:typeof crypto.randomUUID==='function'?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join(''),version:writer.state.doc.version,text:writer.state.text};}
  const snapshot=pendingCommit,result=await api({op:'captureCommit',id:snapshot.id,version:snapshot.version});
  if(writer.state.composing)await new Promise(resolve=>compositionWaiters.push(resolve));writer.cancel();const now=writer.state.text;
  pendingCommit=null;let remainder=now===snapshot.text?'':now.startsWith(snapshot.text)?now.slice(snapshot.text.length):now;
  writer.open(result.draft);editor.update({...options,value:result.draft.text});
  if(remainder){writer.change(remainder);editor.update({...options,value:remainder});await writer.flush();}
  say(t('已追加到 Inbox。','Appended to Inbox.'));editor.focus();
 }catch(e){say(message(e),true);}finally{committing=false;if(!disposed)submit.disabled=false;}}
 async function close(){try{if(writer.state.composing)return;say(t('正在保留草稿…','Retaining draft…'));await pendingImport;await writer.flush();await onClose?.();}catch(e){say(message(e),true);}}
 let options;
 const ready=(async()=>{try{
  [config]=await Promise.all([api({op:'status'})]);const draft=await api({op:'captureRead'});if(disposed)return;
  writer.open(draft);options={value:draft.text,label:t('随记 Markdown','Quick capture Markdown'),onChange:text=>writer.change(text),onComposition:v=>{writer.composition(v);if(!v){for(const resolve of compositionWaiters.splice(0))resolve();}},onSave:()=>void writer.flush().catch(e=>say(message(e),true)),onSubmit:()=>void commit(),resolveImage:target=>resolve(target,true),openLink:target=>void resolve(target).catch(e=>say(message(e),true)),importFiles:files=>void importFiles(files)};
  editor=mountEditor(host,options);editor.selectEnd();attach.disabled=!config.attachments;inbox.disabled=!onOpen;submit.disabled=false;
 }catch(e){say(message(e),true);submit.disabled=true;attach.disabled=true;}})();
 return {ready,get editor(){return editor;},get writer(){return writer;},commit,async flush(){await ready;await pendingImport;return writer.flush();},destroy(){disposed=true;window.removeEventListener('beforeunload',unload);unsubscribe();writer.flush().catch(()=>{}).finally(()=>writer.stop());editor?.destroy();el.remove();}};
}
