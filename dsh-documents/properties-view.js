/** Bounded, read-only projection. YAML is never parsed and serialized back to source. */
export function frontmatterRange(doc){
 if(doc.line(1).text!=='---')return null;
 for(let number=2;number<=Math.min(doc.lines,400);number++){const line=doc.line(number);if(line.to>65536)return null;if(/^(---|\.\.\.)\s*$/.test(line.text))return {from:0,to:line.to,bodyFrom:Math.min(doc.length,line.to+1),text:doc.sliceString(0,line.to)};}
 return null;
}
export function propertyRows(source){
 const lines=source.split(/\r?\n/).slice(1,-1),rows=[];let current=null;
 for(const line of lines){const m=/^([^\s#][^:]*):(?:[ \t]*(.*))?$/.exec(line);
  if(m){current={key:m[1],value:m[2]||''};rows.push(current);}else if(current)current.value+='\n'+line;
  else if(line.trim())rows.push({key:'…',value:line});
 }return rows;
}
export function createProperties(text,expanded,{toggle,edit}){
 const en=(document.documentElement.lang||'zh').startsWith('en'),t=(zh,english)=>en?english:zh,el=document.createElement('section');el.className='pdoc-properties';el.contentEditable='false';
 const head=document.createElement('div'),button=document.createElement('button'),source=document.createElement('button');head.className='pdoc-properties-head';button.type=source.type='button';button.textContent=t('属性','Properties')+' · '+propertyRows(text).length;button.setAttribute('aria-expanded',String(expanded));button.setAttribute('aria-label',t(expanded?'折叠属性':'展开属性',expanded?'Collapse properties':'Expand properties'));source.textContent=t('编辑属性源码','Edit properties source');button.onclick=toggle;source.onclick=edit;head.append(button,source);el.append(head);
 if(expanded){const list=document.createElement('dl');for(const r of propertyRows(text)){const key=document.createElement('dt'),value=document.createElement('dd');key.textContent=r.key;value.textContent=r.value||'—';list.append(key,value);}el.append(list);}return el;
}
export const propertiesTheme={'.pdoc-properties':{margin:'4px 0 14px',border:'1px solid var(--dsw-alias-border-l2,#8883)',borderRadius:'6px',padding:'6px 10px',fontSize:'13px'},'.pdoc-properties-head':{display:'flex',gap:'8px',justifyContent:'space-between',flexWrap:'wrap'},'.pdoc-properties button':{font:'inherit',color:'var(--dsw-alias-label-secondary)',background:'transparent',border:0,padding:'4px',cursor:'pointer'},'.pdoc-properties dl':{display:'grid',gridTemplateColumns:'minmax(70px,1fr) minmax(0,3fr)',gap:'6px 12px',margin:'8px 0'},'.pdoc-properties dt':{color:'var(--dsw-alias-label-secondary)',overflowWrap:'anywhere'},'.pdoc-properties dd':{margin:0,whiteSpace:'pre-wrap',overflowWrap:'anywhere'},'.pdoc-properties button:focus-visible':{outline:'2px solid var(--dsw-alias-state-business-primary,#7762b7)',outlineOffset:'1px'}};
