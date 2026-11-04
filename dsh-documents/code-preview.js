import hljs from 'highlight.js/lib/common';
import mermaid from 'mermaid';
import DOMPurify from 'dompurify';

export function readCodeFence(doc,node){
 const first=node.firstChild,last=node.lastChild;
 if(first?.name!=='CodeMark'||last?.name!=='CodeMark'||first.from===last.from)return null;
 const opening=doc.lineAt(node.from),closing=doc.lineAt(last.from);
 const info=node.getChild('CodeInfo'),language=info?doc.sliceString(info.from,info.to).trim().split(/\s/)[0].toLowerCase():'';
 const indent=node.from-opening.from;
 const code=doc.sliceString(opening.to+1,closing.from).replace(/\n$/,'').split('\n').map(line=>line.replace(new RegExp('^ {0,'+indent+'}'),'' )).join('\n');
 return {from:opening.from,to:closing.to,language,code};
}
export function isMermaidBlock(language,code){
 if(language==='mermaid')return true;
 // Unlabelled flowcharts are common in existing notes; explicit text/code languages remain literal.
 return !language&&/^\s*(?:flowchart|graph)\s+(?:LR|RL|TB|TD|BT)\b/.test(code);
}
const escape=text=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function highlightedCode(code,language){return language&&hljs.getLanguage(language)?hljs.highlight(code,{language,ignoreIllegals:true}).value:escape(code);}
export function localDiagramOnly(code){return !/(?:@import|url\s*\(|\b(?:img|image)\s*:)/i.test(code);}
const externalCSS=css=>/@import/i.test(css)||Array.from(css.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)).some(m=>!m[2].trim().startsWith('#'));
export function cleanDiagram(svg){
 const holder=document.createElement('div');holder.innerHTML=DOMPurify.sanitize(svg,{USE_PROFILES:{svg:true,svgFilters:true},FORBID_TAGS:['script','foreignObject','image','a']});
 for(const el of holder.querySelectorAll('*')){
  for(const a of Array.from(el.attributes))if((/href$/i.test(a.name)&&!a.value.startsWith('#'))||externalCSS(a.value))el.removeAttribute(a.name);
  if(el.tagName.toLowerCase()==='style'&&externalCSS(el.textContent))el.remove();
 }
 const result=holder.querySelector('svg');if(!result)throw Error('invalid-diagram');return result;
}
let renderQueue=Promise.resolve(),serial=0;
const secure=['secure','securityLevel','startOnLoad','maxTextSize','maxEdges','suppressErrorRendering','theme','themeCSS','themeVariables','fontFamily','flowchart','htmlLabels','dompurifyConfig','layout'];
export function createCodePreview(block,{onEdit,onMeasure,canEdit=()=>true}){
 const en=(document.documentElement.lang||'zh').startsWith('en'),t=(zh,enText)=>en?enText:zh;
 const el=document.createElement('section');el.className='pdoc-code-preview';
 const head=document.createElement('div');head.className='pdoc-code-head';
 const label=document.createElement('span'),diagram=isMermaidBlock(block.language,block.code);label.textContent=diagram?'Mermaid':block.language||t('代码块','Code');head.append(label);
 const edit=document.createElement('button');edit.type='button';edit.textContent=t('编辑','Edit');edit.onclick=()=>{if(canEdit())onEdit();};
 const copy=document.createElement('button');copy.type='button';copy.textContent=t('复制','Copy');copy.onclick=async()=>{try{
  if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(block.code);
  else {const field=document.createElement('textarea');field.value=block.code;field.style.position='fixed';field.style.opacity='0';el.append(field);field.select();const ok=document.execCommand('copy');field.remove();if(!ok)throw Error('copy');}
  copy.textContent=t('已复制','Copied');
 }catch{copy.textContent=t('复制失败','Copy failed');}};
 head.append(edit,copy);el.append(head);
 let alive=true,frame=0;
 const commitUI=fn=>{if(!alive)return;if(!canEdit()){frame=requestAnimationFrame(()=>commitUI(fn));return;}fn();onMeasure?.();};
 const pre=document.createElement('pre'),code=document.createElement('code');code.innerHTML=highlightedCode(block.code,block.language);pre.append(code);
 if(!diagram)el.append(pre);
 else {
  const content=document.createElement('div');content.className='pdoc-diagram';content.setAttribute('aria-label',t('Mermaid 图表','Mermaid diagram'));content.setAttribute('role','img');content.textContent=t('正在绘制图表…','Rendering diagram…');el.append(content);
  renderQueue=renderQueue.catch(()=>{}).then(async()=>{
   if(!alive)return;
   if(block.code.length>50000||!localDiagramOnly(block.code)){commitUI(()=>{content.textContent=t('此图表暂显示源码，可点击「编辑」查看。','Showing source for this diagram. Choose Edit to inspect it.');el.append(pre);});return;}
   const stage=document.createElement('div');stage.className='pdoc-diagram-stage';stage.setAttribute('aria-hidden','true');el.append(stage);
   try{
    const color=getComputedStyle(el).color.match(/[\d.]+/g)?.map(Number)||[0,0,0],dark=color[0]+color[1]+color[2]>420;
    mermaid.initialize({startOnLoad:false,securityLevel:'strict',suppressErrorRendering:true,maxTextSize:50000,maxEdges:500,theme:dark?'dark':'default',htmlLabels:false,flowchart:{htmlLabels:false},secure});
    const {svg}=await mermaid.render('pdocGraph'+(++serial),block.code,stage);
    if(!alive)return;const diagram=cleanDiagram(svg);commitUI(()=>{content.replaceChildren(diagram);content.setAttribute('data-rendered','true');});
   }catch{
    if(!alive)return;commitUI(()=>{content.removeAttribute('role');content.textContent=t('图表未能绘制，请点击「编辑」检查代码。','Diagram could not be rendered. Choose Edit to check the code.');el.append(pre);});
   }finally{stage.remove();}
  });
 }
 el.addEventListener('mousedown',event=>{if(event.target.closest('button'))event.preventDefault();});
 el.addEventListener('dblclick',event=>{if(!event.target.closest('button')&&canEdit())onEdit();});
 return {dom:el,destroy(){alive=false;if(frame)cancelAnimationFrame(frame);}};
}

export const codePreviewTheme={
 '.pdoc-code-preview':{margin:'10px 0',border:'1px solid var(--dsw-alias-border-l2,#8883)',borderRadius:'6px',overflow:'hidden',backgroundColor:'var(--dsw-alias-settings-card-fill,#8881)'},
 '.pdoc-code-head':{display:'flex',alignItems:'center',gap:'8px',padding:'6px 10px',fontSize:'12px',color:'var(--dsw-alias-label-secondary)'},
 '.pdoc-code-head>span':{marginRight:'auto'},'.pdoc-code-head button':{font:'inherit',color:'inherit',border:0,borderRadius:'4px',background:'transparent',padding:'4px 8px',cursor:'pointer'},
 '.pdoc-diagram-stage':{position:'absolute',visibility:'hidden',pointerEvents:'none',width:'800px',left:'-10000px'},
 '.pdoc-code-head button:hover':{backgroundColor:'var(--dsw-alias-interactive-bg-hover,#8882)'},'.pdoc-code-head button:focus-visible':{outline:'2px solid var(--dsw-focus-ring-color,#8973c4)'},
 '.pdoc-code-preview pre':{margin:0,padding:'12px 16px 18px',overflowX:'auto',whiteSpace:'pre',fontSize:'13px',lineHeight:'1.65',fontFamily:'var(--dsw-font-family-code,monospace)'},
 '.pdoc-code-preview code':{font:'inherit',color:'var(--dsw-alias-label-primary)'},'.pdoc-diagram':{padding:'12px',overflowX:'auto',fontSize:'13px'},'.pdoc-diagram svg':{display:'block',maxWidth:'100%',minWidth:'600px',height:'auto',margin:'0 auto'},
 '.pdoc-diagram svg text':{fill:'var(--dsw-alias-label-primary)!important'},
 '.pdoc-diagram svg .node>:is(rect,circle,ellipse,polygon),.pdoc-diagram svg :is(.actor,.note,.labelBox)':{fill:'var(--dsw-alias-settings-card-fill,#8882)!important',stroke:'var(--dsw-alias-label-secondary,#777)!important'},
 '.pdoc-diagram svg .flowchart-link':{stroke:'var(--dsw-alias-label-secondary,#777)!important'},
 '.hljs-keyword,.hljs-selector-tag,.hljs-literal':{color:'#b168bd'},'.hljs-string,.hljs-attr':{color:'#45976d'},'.hljs-number,.hljs-built_in':{color:'#bb7838'},'.hljs-title,.hljs-type':{color:'#548fc0'},'.hljs-comment,.hljs-quote':{color:'var(--dsw-alias-label-secondary,#808088)'}
};
