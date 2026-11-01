// Page-only controls: opening panels never establishes a remote connection.
export function initPanels(doc,{onMobileClose=()=>{}}={}){
 const byId=id=>doc.getElementById(id),dialog=byId('mobile-access-dialog'),open=byId('mobile-access-open');
 const listeners=[];
 function listen(target,type,handler){target.addEventListener(type,handler);listeners.push(()=>target.removeEventListener(type,handler));}
 listen(open,'click',()=>{if(!dialog.open)dialog.showModal();});
 listen(byId('mobile-access-close'),'click',()=>dialog.close());
 listen(dialog,'click',event=>{
  if(event.target!==dialog)return;
  const r=dialog.getBoundingClientRect();
  if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();
 });
 listen(dialog,'close',()=>{onMobileClose();if(!doc.hidden)open.focus();});
 listen(doc,'visibilitychange',()=>{if(doc.hidden&&dialog.open)dialog.close();});
 // Native dialog handles Escape, focus containment and the inert background.
 return()=>{for(const off of listeners)off();if(dialog.open)dialog.close();onMobileClose();};
}
