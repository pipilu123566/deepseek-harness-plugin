import { Annotation, EditorSelection, EditorState, StateField, StateEffect, Transaction, Prec } from '@codemirror/state';
import { Decoration, EditorView, keymap, WidgetType, drawSelection } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, undo, redo, isolateHistory } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { syntaxTree, syntaxTreeAvailable, syntaxHighlighting, HighlightStyle, indentUnit, StreamLanguage, codeFolding, foldable, foldedRanges, foldEffect, unfoldEffect, foldKeymap } from '@codemirror/language';
import { editorKeydown, releaseEditorTab } from './editor-keys.js';
import {closingFenceInput,closingFenceEnter} from './fence-editing.js';
import {readCodeFence,createCodePreview,codePreviewTheme} from './code-preview.js';
import {sql} from '@codemirror/legacy-modes/mode/sql';
import {javascript,json} from '@codemirror/legacy-modes/mode/javascript';
import {python} from '@codemirror/legacy-modes/mode/python';
import {shell} from '@codemirror/legacy-modes/mode/shell';
import { tags } from '@lezer/highlight';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import {search,searchKeymap,openSearchPanel} from '@codemirror/search';
import {parseOutline,activeHeading} from './outline.js';
import {toggleMarkup} from './editor-format.js';
import {frontmatterRange,createProperties,propertiesTheme} from './properties-view.js';
import {createTableView,tableTheme} from './table-view.js';
import {headingForFragment} from './document-navigation.js';
import {createFindPanel} from './find-panel.js';

export const markdownSupport = () => markdown({base:markdownLanguage,completeHTMLTags:false,pasteURLAsLink:false});
const externalChange = Annotation.define();
const compositionChange=StateEffect.define();
const propertiesToggle=StateEffect.define(),propertiesExpanded=StateField.define({create:()=>false,update:(value,tr)=>{for(const e of tr.effects)if(e.is(propertiesToggle))return e.value;return value;}});
const compositionState=StateField.define({create:()=>false,update:(v,tr)=>{for(const e of tr.effects)if(e.is(compositionChange))return e.value;return v;}});
/** Presentation only: source positions and the original document remain authoritative. */
export function presentationPlan(state,bounds={from:0,to:state.doc.length}) {
 const doc=state.doc,active=(from,to)=>state.selection.ranges.some(r=>{
  const a=doc.lineAt(r.from).from,b=doc.lineAt(r.to>r.from?r.to-1:r.to).to;
  return from<=b&&to>=a;
 });
 const excluded=[],out=[],hidden=new Set(),hide=(from,to)=>{const key=from+':'+to;if(to>from&&!hidden.has(key)){hidden.add(key);out.push({kind:'hide',from,to});}};
 syntaxTree(state).iterate({from:bounds.from,to:bounds.to,enter(n){
  const name=n.name,raw=['Table','ListMark'].includes(n.name)?doc.sliceString(n.from,n.to):'',editing=active(n.from,n.to);
  if(['FencedCode','InlineCode','CodeBlock','HTMLBlock'].includes(name))excluded.push([n.from,n.to]);
  if(/^(?:ATX|Setext)Heading[1-6]$/.test(name)){
   const line=doc.lineAt(n.from);out.push({kind:'line',from:line.from,to:line.from,className:'pdoc-h'+name.at(-1)});
   let range=foldable(state,line.from,line.to),folded=false;
   foldedRanges(state).between(line.to,line.to,(from,to)=>{if(from===line.to){range={from,to};folded=true;}});
   if(range&&(folded||range.to>n.to))out.push({kind:'fold',from:line.from,to:line.from,range,folded,label:line.text.replace(/^ {0,3}#{1,6}(?:\s|$)/,'').trim()});
  }
  if(name==='Blockquote')for(let pos=doc.lineAt(n.from).from;pos<=n.to;){const line=doc.lineAt(pos);out.push({kind:'line',from:pos,to:pos,className:'pdoc-quote'});if(line.to===doc.length)break;pos=line.to+1;}
  if(['StrongEmphasis','Emphasis','Strikethrough','InlineCode'].includes(name))out.push({kind:'mark',from:n.from,to:n.to,className:({StrongEmphasis:'pdoc-strong',Emphasis:'pdoc-em',Strikethrough:'pdoc-strike',InlineCode:'pdoc-code'})[name]});
  if(name==='FencedCode'){
   const block=n.node.parent?.name==='Document'?readCodeFence(doc,n.node):null;
   if(block&&!editing){out.push({kind:'code',...block});return false;}
   for(let pos=doc.lineAt(n.from).from;pos<=n.to;){const line=doc.lineAt(pos);out.push({kind:'line',from:pos,to:pos,className:'pdoc-code-line'});if(line.to===doc.length)break;pos=line.to+1;}
   if(!editing){for(const c of [n.node.firstChild,n.node.lastChild])if(c?.name==='CodeMark'){const line=doc.lineAt(c.from);hide(line.from,line.to);}}
   return false;
  }
  if(name==='Table'&&!editing){out.push({kind:'table',from:n.from,to:n.to,text:raw});return false;}
  if(name==='Link'){
   if(!editing){const children=[];for(let c=n.node.firstChild;c;c=c.nextSibling)children.push(c);const marks=children.filter(c=>c.name==='LinkMark');
    if(marks.length>=2){hide(marks[0].from,marks[0].to);hide(marks[1].from,n.to);out.push({kind:'mark',from:marks[0].to,to:marks[1].from,className:'pdoc-link',target:children.find(c=>c.name==='URL')?doc.sliceString(children.find(c=>c.name==='URL').from,children.find(c=>c.name==='URL').to):''});return false;}
   }
  }
  if(!editing&&['HeaderMark','EmphasisMark','StrikethroughMark','CodeMark','QuoteMark'].includes(name)){
   let end=n.to;if(['HeaderMark','QuoteMark'].includes(name)){const space=/^[ \t]+/.exec(doc.sliceString(end,doc.lineAt(end).to));if(space)end+=space[0].length;}
   hide(n.from,end);
  }
  if(!editing&&name==='ListMark'&&/^[-+*]$/.test(raw))out.push({kind:'bullet',from:n.from,to:n.to});
 }});
 const front=frontmatterRange(doc);
 if(front){excluded.push([0,front.to]);if(!active(0,Math.max(0,front.to-1)))out.push({kind:'properties',from:0,to:front.to,text:front.text,expanded:state.field(propertiesExpanded,false)||false});else for(let p=0;p<=front.to;){const l=doc.lineAt(p);out.push({kind:'line',from:p,to:p,className:'pdoc-frontmatter'});p=l.to+1;}}
 const excludedAt=(from,to)=>excluded.some(([a,b])=>from<b&&to>a);
 const allowed=(from,to)=>!active(from,to)&&!excludedAt(from,to);
 for(let number=doc.lineAt(bounds.from).number;number<=doc.lineAt(Math.min(bounds.to,syntaxTree(state).length)).number;number++){
  const l=doc.line(number),task=/^(\s*[-+*]\s+)\[([ xX])\]/.exec(l.text),callout=/^(\s*>\s*)\[!([\w-]+)\][+-]?/.exec(l.text);
  if(task&&allowed(l.from,l.to)){const from=l.from+task[1].length;out.push({kind:'task',from,to:from+3,checked:task[2].toLowerCase()==='x'});}
  if(callout&&!excludedAt(l.from,l.to)){out.push({kind:'line',from:l.from,to:l.from,className:'pdoc-callout'});const from=l.from+callout[1].length;if(allowed(l.from,l.to))out.push({kind:'tag',from,to:l.from+callout[0].length,text:callout[2]});}
  const image=/^\s*(?:!\[\[([^\]\n]+)\]\]|!\[([^\]\n]*)\]\(([^\n]+)\))\s*$/.exec(l.text);
  if(image&&allowed(l.from,l.to)){out.push({kind:'image',from:l.from,to:l.to,target:(image[1]||image[3]).split('|')[0],text:image[2]||image[1]?.split('|')[1]||'图片'});continue;}
  for(const m of l.text.matchAll(/(?<!!)\[\[([^\]\n]+)\]\]/g)){
   const from=l.from+m.index,to=from+m[0].length;if(!allowed(from,to))continue;
   const [target,alias]=m[1].split('|');hide(from,from+2+(alias?target.length+1:0));hide(to-2,to);
   out.push({kind:'mark',from:from+2+(alias?target.length+1:0),to:to-2,className:'pdoc-link',target});
  }
 }
 // A block image owns the whole line; remove any nested Markdown decorations.
 const images=out.filter(x=>x.kind==='image');
 return out.filter(x=>x.from>=bounds.from&&x.to<=bounds.to&&(!front||x.from>=front.to||x.kind==='properties'||x.kind==='line'&&x.className==='pdoc-frontmatter')&&(x.kind==='image'||!images.some(i=>x.from>=i.from&&x.to<=i.to&&x.kind!=='line')));
}
const resources=new WeakMap();
class CodePreview extends WidgetType {
 constructor(block){super();this.block=block;}
 eq(other){const a=this.block,b=other.block;return a.language===b.language&&a.code===b.code;}
 toDOM(view){const preview=createCodePreview(this.block,{canEdit:()=>!view.composing&&!view.state.field(compositionState),onEdit:()=>{const pos=view.posAtDOM(preview.dom);view.dispatch({selection:{anchor:Math.min(view.state.doc.lineAt(pos).to+1,view.state.doc.length)},scrollIntoView:true});view.focus();},onMeasure:()=>view.requestMeasure()});preview.dom._dispose=()=>preview.destroy();return preview.dom;}
 destroy(dom){dom._dispose?.();}
}
class HeadingFold extends WidgetType {
 constructor(range,folded,label){super();Object.assign(this,{range,folded,label});}
 eq(other){return this.folded===other.folded&&this.label===other.label;}
 toDOM(view){
  const button=document.createElement('button');button.type='button';button.className='pdoc-fold-toggle';button.textContent=this.folded?'▸':'▾';
  button.setAttribute('aria-expanded',String(!this.folded));button.setAttribute('aria-label',(this.folded?'展开章节：':'收起章节：')+this.label);button.title=button.getAttribute('aria-label');
  button.addEventListener('mousedown',event=>event.preventDefault());
  button.addEventListener('click',event=>{
   event.preventDefault();event.stopPropagation();if(view.composing||view.state.field(compositionState))return;
   const pos=view.posAtDOM(button),line=view.state.doc.lineAt(pos),current=foldable(view.state,line.from,line.to)||this.range;let range=current;
   foldedRanges(view.state).between(line.to,line.to,(from,to)=>{if(from===line.to)range={from,to};});const {from,to}=range;
   const selection=!this.folded&&view.state.selection.ranges.some(r=>r.from<to&&r.to>from)?EditorSelection.cursor(from):undefined;
   view.dispatch({effects:(this.folded?unfoldEffect:foldEffect).of(this.range),...(selection?{selection}:{})});view.focus();
  });return button;
 }
}
const headingFolding=codeFolding({placeholderDOM(view,onclick){
 const button=document.createElement('button');button.type='button';button.className='cm-foldPlaceholder';button.textContent='…';button.setAttribute('aria-label','展开折叠内容');button.title='展开折叠内容';
 button.addEventListener('mousedown',event=>event.preventDefault());button.addEventListener('click',event=>{if(view.composing||view.state.field(compositionState)){event.preventDefault();return;}onclick(event);view.focus();});return button;
}});
class Tag extends WidgetType {constructor(text){super();this.text=text;}eq(o){return this.text===o.text;}toDOM(){const e=document.createElement('span');e.className='pdoc-callout-tag';e.textContent=this.text;return e;}}
class Task extends WidgetType {constructor(checked,pos){super();this.checked=checked;this.pos=pos;}eq(o){return this.checked===o.checked;}toDOM(view){const e=document.createElement('button');e.type='button';e.disabled=view.state.readOnly;e.className='pdoc-task';e.setAttribute('role','checkbox');e.setAttribute('aria-checked',String(this.checked));e.setAttribute('aria-label',this.checked?'标记为未完成':'标记为完成');e.textContent=this.checked?'☑':'☐';e.addEventListener('mousedown',ev=>ev.preventDefault());e.addEventListener('click',ev=>{ev.preventDefault();view.dispatch({changes:{from:view.posAtDOM(e),to:view.posAtDOM(e)+3,insert:this.checked?'[ ]':'[x]'}});view.focus();});return e;}ignoreEvent(){return false;}}
class Image extends WidgetType {constructor(target,text,pos){super();Object.assign(this,{target,text,pos});}eq(o){return this.target===o.target&&this.text===o.text;}toDOM(view){const el=document.createElement('figure');el.className='pdoc-image';const img=document.createElement('img'),caption=document.createElement('figcaption');img.alt=this.text;caption.textContent=this.text;el.append(img,caption);let alive=true;el._dispose=()=>{alive=false;};Promise.resolve().then(()=>resources.get(view)?.resolveImage?.(this.target)).then(url=>{if(alive&&/^data:image\/(png|jpeg|gif|webp);base64,/.test(url||''))img.src=url;else if(alive){img.remove();caption.textContent=this.target;}}).catch(()=>{if(alive){img.remove();caption.textContent=this.target;}});el.addEventListener('dblclick',()=>{view.dispatch({selection:{anchor:view.posAtDOM(el)}});view.focus();});return el;}destroy(dom){dom._dispose?.();}ignoreEvent(){return false;}}
class Bullet extends WidgetType {eq(){return true;}toDOM(){const el=document.createElement('span');el.textContent='•';el.setAttribute('aria-hidden','true');return el;}}
class Properties extends WidgetType {
 constructor(text,expanded){super();Object.assign(this,{text,expanded});}eq(other){return this.text===other.text&&this.expanded===other.expanded;}
 toDOM(view){return createProperties(this.text,this.expanded,{toggle:()=>{if(view.composing||view.state.field(compositionState))return;view.dispatch({effects:propertiesToggle.of(!this.expanded)});},edit:()=>{if(view.composing||view.state.field(compositionState))return;const line=view.state.doc.line(Math.min(2,view.state.doc.lines));view.dispatch({selection:{anchor:line.from},scrollIntoView:true});view.focus();}});}ignoreEvent(){return true;}
}
class Table extends WidgetType {
 constructor(text,pos){super();this.text=text;this.pos=pos;}eq(other){return this.text===other.text;}
 toDOM(view){
  const blocked=()=>view.state.readOnly||view.composing||view.state.field(compositionState),composition=value=>{view.dispatch({effects:compositionChange.of(value)});resources.get(view)?.onComposition?.(value);};
  const context={canEdit:()=>!blocked(),composition,change:(el,change,structural,force=false)=>{if(blocked()&&!force)return false;const from=view.posAtDOM(el),source=el._tableSource;if(view.state.doc.sliceString(from,from+source.length)!==source)return false;view.dispatch({changes:{from:from+change.from,to:from+change.to,insert:change.insert},annotations:structural?isolateHistory.of('full'):undefined,userEvent:'input.table'});return true;},editSource:el=>{view.dispatch({selection:{anchor:view.posAtDOM(el)},scrollIntoView:true});view.focus();},exit:el=>{const pos=Math.min(view.state.doc.length,view.posAtDOM(el)+(el._tableSource?.length||0)+1);view.dispatch({selection:{anchor:pos},scrollIntoView:true});view.focus();releaseEditorTab(view);},command:(key,shift)=>{if(blocked())return;if(key==='z')(shift?redo:undo)(view);else if(key==='y')redo(view);else if(key==='f')openSearchPanel(view);else if(key==='s')resources.get(view)?.onSave?.();else if(key==='submit')resources.get(view)?.onSubmit?.();}};
  const control=view.state.readOnly?null:createTableView(view,this.text,context);if(control){const el=control.dom;el._tableControl=control;el._tableSource=this.text;return el;}
  const el=document.createElement('div');el.className='pdoc-live-table';el.innerHTML=DOMPurify.sanitize(marked.parse(this.text),{FORBID_TAGS:['iframe','object','embed','input','form','style'],FORBID_ATTR:['src','srcset','style']});el.addEventListener('mousedown',event=>{if(blocked())return;event.preventDefault();context.editSource(el);});return el;
 }
 updateDOM(dom){if(!dom._tableControl)return false;dom._tableSource=this.text;return dom._tableControl.update(this.text);}
 destroy(dom){dom._tableControl?.destroy();}ignoreEvent(){return true;}
}
function decorationRanges(state,bounds){const ranges=[];for(const p of presentationPlan(state,bounds)){
 if(p.kind==='properties')ranges.push(Decoration.replace({widget:new Properties(p.text,p.expanded),block:true}).range(p.from,p.to));
 else if(p.kind==='line')ranges.push(Decoration.line({class:p.className}).range(p.from));
 else if(p.kind==='fold')ranges.push(Decoration.widget({widget:new HeadingFold(p.range,p.folded,p.label),side:-1}).range(p.from));
 else if(p.kind==='mark')ranges.push(Decoration.mark({class:p.className,attributes:p.target?{'data-pdoc-link':p.target}:undefined}).range(p.from,p.to));
 else if(['task','image','tag'].includes(p.kind))ranges.push(Decoration.replace({widget:p.kind==='task'?new Task(p.checked,p.from):p.kind==='image'?new Image(p.target,p.text,p.from):new Tag(p.text),block:p.kind==='image'}).range(p.from,p.to));
 else if(p.kind==='table')ranges.push(Decoration.replace({widget:new Table(p.text,p.from),block:true}).range(p.from,p.to));
 else if(p.kind==='code')ranges.push(Decoration.replace({widget:new CodePreview(p),block:true}).range(p.from,p.to));
 else ranges.push(Decoration.replace(p.kind==='bullet'?{widget:new Bullet()}:{}).range(p.from,p.to));
}return ranges;}
function decorate(state){return Decoration.set(decorationRanges(state),true);}
function blockAt(state,pos){const front=frontmatterRange(state.doc);if(front&&pos<=front.to)return {from:0,to:front.to};let node=syntaxTree(state).resolveInner(pos,1);while(node.parent&&node.parent.name!=='Document')node=node.parent;const line=state.doc.lineAt(pos);return node.name==='Document'?{from:line.from,to:line.to}:{from:Math.min(node.from,line.from),to:Math.max(node.to,line.to)};}
export const liveField=StateField.define({create:decorate,update(value,tr){
 if(tr.state.field(compositionState,false))return value.map(tr.changes);
 if(tr.effects.some(e=>e.is(compositionChange)||e.is(propertiesToggle))||foldedRanges(tr.startState)!==foldedRanges(tr.state)&&!tr.docChanged)return decorate(tr.state);
 const a=tr.startState.selection.main,b=tr.state.selection.main;
 if(!tr.docChanged&&tr.selection&&syntaxTree(tr.startState)===syntaxTree(tr.state)&&tr.startState.selection.ranges.length===1&&tr.state.selection.ranges.length===1&&a.empty&&b.empty&&tr.startState.doc.lineAt(a.head).number===tr.state.doc.lineAt(b.head).number)return value;
 let plain=tr.docChanged&&syntaxTree(tr.startState).length===tr.startState.doc.length&&syntaxTree(tr.state).length===tr.state.doc.length&&syntaxTreeAvailable(tr.startState,tr.startState.doc.length)&&syntaxTreeAvailable(tr.state,tr.state.doc.length)&&a.empty&&b.empty&&tr.startState.selection.ranges.length===1&&tr.state.selection.ranges.length===1,count=0;
 tr.changes.iterChanges((from,to,_c,_d,insert)=>{count++;const line=tr.startState.doc.lineAt(from);if(to>line.to||from<=line.from||!/^\s*\p{L}/u.test(line.text)||!/^[\p{L}\p{N}\t ,，。]*$/u.test(insert.toString()+tr.startState.doc.sliceString(from,to)))plain=false;});
 if((plain&&count===1)||!tr.docChanged&&tr.selection&&syntaxTree(tr.startState)===syntaxTree(tr.state)&&a.empty&&b.empty&&tr.startState.selection.ranges.length===1&&tr.state.selection.ranges.length===1){
  const bounds=[blockAt(tr.state,b.from),blockAt(tr.state,b.to),...[a.from,a.to].map(p=>blockAt(tr.state,tr.changes.mapPos(p)))].sort((x,y)=>x.from-y.from),merged=[];
  for(const r of bounds){const last=merged.at(-1);if(last&&r.from<=last.to+1)last.to=Math.max(last.to,r.to);else merged.push({...r});}
  let next=value.map(tr.changes);for(const r of merged)next=next.update({filterFrom:r.from,filterTo:r.to,filter:()=>false,add:decorationRanges(tr.state,r),sort:true});return next;
 }
 return tr.docChanged||tr.selection||syntaxTree(tr.startState)!==syntaxTree(tr.state)?decorate(tr.state):value;
},provide:f=>EditorView.decorations.from(f)});
const theme=EditorView.theme({
 ...codePreviewTheme,
 '.pdoc-find':{display:'flex',gap:'4px',alignItems:'center',flexWrap:'wrap',padding:'6px'},'.pdoc-find input':{flex:'1',width:'120px!important',minWidth:'80px',font:'inherit'},'.pdoc-find button':{font:'inherit',fontSize:'12px'},
 '&':{height:'100%',fontSize:'inherit',color:'var(--dsw-alias-label-primary)'},
 '&.cm-focused':{outline:'none'},'.cm-scroller':{overflow:'auto',fontFamily:'inherit',lineHeight:'1.75'},
 '.cm-content':{padding:'20px clamp(12px,4vw,42px) 80px',maxWidth:'860px',width:'100%',margin:'0 auto',minHeight:'180px',caretColor:'var(--dsw-alias-label-primary)'},'.cm-line':{padding:'0 2px'},
 '&.pdoc-markdown .cm-content':{paddingLeft:'clamp(28px,4vw,42px)'},
 '.pdoc-fold-toggle':{display:'inline-flex',alignItems:'center',justifyContent:'center',verticalAlign:'middle',width:'24px',height:'24px',margin:'0 2px 0 -26px',padding:0,border:0,borderRadius:'4px',fontSize:'14px',lineHeight:1,background:'transparent',color:'var(--dsw-alias-label-secondary)',cursor:'pointer'},
 '.pdoc-fold-toggle:hover':{backgroundColor:'var(--dsw-alias-settings-card-fill,#8882)'},'.pdoc-fold-toggle[aria-expanded=false]':{color:'var(--dsw-alias-label-primary)'},
 '.cm-foldPlaceholder':{font:'inherit',fontSize:'.85em',lineHeight:'1.4',padding:'0 6px',marginLeft:'6px',border:'1px solid var(--dsw-alias-border-l2,#8885)',borderRadius:'4px',backgroundColor:'var(--dsw-alias-settings-card-fill,#8882)',color:'var(--dsw-alias-label-secondary)',cursor:'pointer'},
 '.pdoc-fold-toggle:focus-visible,.cm-foldPlaceholder:focus-visible':{outline:'2px solid var(--dsw-alias-state-business-primary,#7762b7)',outlineOffset:'2px'},
 '.cm-selectionBackground, &.cm-focused .cm-selectionBackground':{backgroundColor:'#6495ed45'},'.cm-cursor':{borderLeftColor:'var(--dsw-alias-label-primary)'},
 '.pdoc-h1':{fontSize:'1.8em',fontWeight:'500',lineHeight:'1.5',paddingTop:'12px',paddingBottom:'8px'},
 '.pdoc-h2':{fontSize:'1.5em',fontWeight:'500',lineHeight:'1.5',paddingTop:'10px',paddingBottom:'6px'},
 '.pdoc-h3':{fontSize:'1.25em',fontWeight:'500',paddingTop:'8px',paddingBottom:'4px'},'.pdoc-h4,.pdoc-h5,.pdoc-h6':{fontSize:'1.1em',fontWeight:'500'},
 '.pdoc-strong':{fontWeight:'500'},'.pdoc-em':{fontStyle:'italic'},'.pdoc-strike':{textDecoration:'line-through'},
 '.pdoc-code,.pdoc-code-line':{fontFamily:'var(--dsw-font-family-code,monospace)',backgroundColor:'var(--dsw-alias-settings-card-fill,#8882)'},
 '.pdoc-quote':{borderLeft:'2px solid var(--dsw-alias-border-l2,#8885)',paddingLeft:'12px',color:'var(--dsw-alias-label-secondary)'},
 '.pdoc-link':{textDecoration:'underline',textUnderlineOffset:'3px',cursor:'pointer',color:'var(--dsw-alias-state-business-primary,#7762b7)'},
 '.pdoc-frontmatter':{fontFamily:'var(--dsw-font-family-code,monospace)',color:'var(--dsw-alias-label-secondary)',backgroundColor:'var(--dsw-alias-settings-card-fill,#8881)'},'.pdoc-callout':{backgroundColor:'var(--dsw-alias-settings-card-fill,#8881)',borderLeft:'3px solid var(--dsw-alias-state-business-primary,#7762b7)'},'.pdoc-callout-tag':{fontSize:'.8em',fontWeight:'500',marginRight:'8px'},'.pdoc-task':{font:'inherit',padding:'0 2px',border:0,background:'transparent',color:'inherit',cursor:'pointer'},'.pdoc-image':{margin:'12px 0'},'.pdoc-image img':{maxWidth:'100%',maxHeight:'440px',objectFit:'contain',borderRadius:'6px'},'.pdoc-image figcaption':{fontSize:'.8em',color:'var(--dsw-alias-label-secondary)'},
 ...propertiesTheme,...tableTheme
});
const codeLanguage=ext=>({sql,javascript,js:javascript,ts:javascript,json,py:python,sh:shell})[ext];
/** One editor implementation for host panels and the native WebKit capture window. */
export function mountEditor(parent, options){
 let current=options,destroyed=false,pendingInsert=[],outlineTimer=null,stopOutline=null,positionTimer=null,headings=[],active=null,navigationStop=null,navigationResolve=null;
 const position=()=>({anchor:view.state.selection.main.anchor,head:view.state.selection.main.head,top:view.scrollDOM.scrollTop});
 const remember=()=>{clearTimeout(positionTimer);if(current.onViewState&&!view.composing&&!view.state.field(compositionState))positionTimer=setTimeout(()=>{if(!destroyed)current.onViewState?.(position());},350);};
 const publishActive=()=>{if(view.composing||view.state.field(compositionState))return;const next=activeHeading(headings,view.state.selection.main.head);if(next!==active){active=next;current.onActiveHeading?.(next);}};
 const outline=()=>{clearTimeout(outlineTimer);stopOutline?.();if(options.markdown===false||!current.onOutline)return;outlineTimer=setTimeout(()=>{if(destroyed||view.composing||view.state.field(compositionState))return;const doc=view.state.doc;stopOutline=parseOutline(doc,(items,error)=>{if(destroyed||view.state.doc!==doc||view.composing||view.state.field(compositionState))return;headings=items;current.onOutlineError?.(error);current.onOutline?.(items);active=undefined;publishActive();});},200);};
 const view=new EditorView({parent,state:EditorState.create({doc:options.value||'',extensions:[
  EditorState.readOnly.of(!!options.readOnly),EditorView.editable.of(!options.readOnly),EditorState.transactionFilter.of(tr=>options.readOnly&&tr.docChanged?[]:tr),
  ...(options.markdown===false?(codeLanguage(options.extension)?[StreamLanguage.define(codeLanguage(options.extension))]:[]):[markdownSupport(),headingFolding,liveField,EditorView.editorAttributes.of({class:'pdoc-markdown'}),keymap.of(foldKeymap.map(binding=>({...binding,run:v=>!v.composing&&!v.state.field(compositionState)&&binding.run(v)})))]),compositionState,propertiesExpanded,history(),drawSelection(),EditorView.lineWrapping,indentUnit.of('\t'),EditorState.tabSize.of(4),theme,
  syntaxHighlighting(HighlightStyle.define([{tag:tags.heading,fontWeight:'500'},{tag:tags.processingInstruction,color:'var(--dsw-alias-label-tertiary)'},{tag:tags.monospace,fontFamily:'var(--dsw-font-family-code,monospace)'}])),
  EditorView.contentAttributes.of({'aria-label':options.label||'Markdown','aria-description':'Tab 插入制表符或缩进，Shift+Tab 反缩进；按 Escape 后 Tab 离开编辑器',spellcheck:'true'}),
  EditorView.inputHandler.of((v,from,to,text)=>options.markdown!==false&&!v.state.field(compositionState)&&closingFenceInput(v,from,to,text)),
  EditorView.domEventHandlers({
   compositionstart(){releaseEditorTab(view,false);view.dispatch({effects:compositionChange.of(true)});current.onComposition?.(true);return false;},
   compositionend(){queueMicrotask(()=>{if(destroyed)return;view.dispatch({effects:compositionChange.of(false)});current.onComposition?.(false);for(const text of pendingInsert.splice(0))insert(text);});return false;},
   mousedown(event){if(event.target.closest?.('[data-pdoc-link]')&&current.openLink){event.preventDefault();return true;}return false;},
   click(event){const link=event.target.closest?.('[data-pdoc-link]');if(link&&current.openLink){event.preventDefault();current.openLink(link.dataset.pdocLink);return true;}return false;},
   paste(event){const files=Array.from(event.clipboardData?.files||[]);if(files.length&&current.importFiles){event.preventDefault();current.importFiles(files);return true;}return false;},
   drop(event){const files=Array.from(event.dataTransfer?.files||[]);if(files.length&&current.importFiles){event.preventDefault();current.importFiles(files);return true;}return false;}
  }),
  search({top:true,createPanel:createFindPanel}),EditorState.transactionExtender.of(tr=>{if(options.markdown===false||!tr.isUserEvent('select.search'))return null;const effects=[];foldedRanges(tr.startState).between(0,tr.startState.doc.length,(from,to)=>{if(tr.newSelection.ranges.some(r=>r.from>from&&r.from<=to))effects.push(unfoldEffect.of({from,to}));});return effects.length?{effects}:null;}),
  Prec.highest(keymap.of([...searchKeymap.map(binding=>({...binding,stopPropagation:true,run:v=>!v.composing&&!v.state.field(compositionState)&&binding.run(v)})),...options.markdown===false?[]:[{key:'Mod-b',run:v=>!v.state.field(compositionState)&&toggleMarkup(v,'**'),stopPropagation:true},{key:'Mod-i',run:v=>!v.state.field(compositionState)&&toggleMarkup(v,'*'),stopPropagation:true}],{key:'Enter',run:v=>options.markdown!==false&&!v.state.field(compositionState)&&closingFenceEnter(v)}])),
  keymap.of([{key:'Mod-s',run:v=>{if(v.composing)return false;current.onSave?.();return true;}},{key:'Mod-Enter',run:v=>{if(v.composing)return false;current.onSubmit?.();return !!current.onSubmit;}},...defaultKeymap,...historyKeymap]),
  EditorView.updateListener.of(u=>{if(u.docChanged){if(!u.transactions.some(tr=>tr.annotation(externalChange)))current.onChange?.(u.state.doc.toString());outline();}if(u.selectionSet||u.docChanged){publishActive();remember();}if(u.transactions.some(tr=>tr.effects.some(e=>e.is(compositionChange)&&!e.value))){outline();publishActive();remember();}})
 ]})});
 // Capture inside our own editor, before Markdown's list keymap and bubbling host shortcuts.
 const keyboard=event=>{if(event.target.closest?.('button,[data-pdoc-table-input]'))return;if(editorKeydown(view,event,{composing:view.state.field(compositionState),focusOutside:backward=>{const scope=view.dom.closest('.pdoc-capture,.pdoc')||parent;const buttons=Array.from(scope.querySelectorAll('button,input')).filter(e=>!e.disabled&&!view.dom.contains(e)&&e.getClientRects().length);(backward?buttons.at(-1):buttons[0])?.focus();}}))event.stopImmediatePropagation();};
 view.contentDOM.addEventListener('keydown',keyboard,true);
 resources.set(view,{resolveImage:target=>current.resolveImage?.(target),onComposition:value=>current.onComposition?.(value),onSave:()=>current.onSave?.(),onSubmit:()=>current.onSubmit?.()});
 view.scrollDOM.addEventListener('scroll',remember,{passive:true});
 if(options.initialState){const s=options.initialState,clamp=n=>Math.max(0,Math.min(view.state.doc.length,Number.isFinite(n)?n:0));view.dispatch({selection:{anchor:clamp(s.anchor),head:clamp(s.head)}});view.requestMeasure({read:()=>Math.max(0,Number(s.top)||0),write:top=>{view.scrollDOM.scrollTop=top;}});}
 if(!options.initialState&&options.markdown!==false){const front=frontmatterRange(view.state.doc);if(front&&front.bodyFrom<view.state.doc.length)view.dispatch({selection:{anchor:front.bodyFrom}});}
 outline();
 function insert(text,range=view.state.selection.main){if(view.composing||view.state.field(compositionState)){pendingInsert.push(text);return;}view.dispatch({changes:{from:range.from,to:range.to,insert:text},selection:{anchor:range.from+text.length},scrollIntoView:true});view.focus();}
 function cancelNavigation(){navigationStop?.();navigationStop=null;navigationResolve?.('changed');navigationResolve=null;}
 function jumpTo(pos){if(view.composing||view.state.field(compositionState))return false;pos=Math.max(0,Math.min(view.state.doc.length,pos));const effects=[];foldedRanges(view.state).between(0,view.state.doc.length,(from,to)=>{if(from<pos&&to>=pos)effects.push(unfoldEffect.of({from,to}));});view.dispatch({selection:{anchor:pos},effects:[...effects,EditorView.scrollIntoView(pos,{y:'start',yMargin:24})]});view.focus();return true;}
 function jumpHeading(fragment){cancelNavigation();if(view.composing||view.state.field(compositionState))return Promise.resolve('composing');if(fragment.startsWith('^'))return Promise.resolve('unsupported');if(fragment==='')return Promise.resolve(jumpTo(0)?'ok':'composing');const doc=view.state.doc;return new Promise(resolve=>{navigationResolve=resolve;navigationStop=parseOutline(doc,(items,error)=>{navigationStop=null;navigationResolve=null;if(destroyed||view.state.doc!==doc){resolve('changed');return;}const pos=headingForFragment(items,fragment);resolve(error?'unavailable':pos===null?'missing':jumpTo(pos)?'ok':'composing');});});}
 function setPosition(s){if(view.composing||view.state.field(compositionState))return false;const clamp=n=>Math.max(0,Math.min(view.state.doc.length,Number(n)||0));jumpTo(clamp(s.head??s.anchor));view.dispatch({selection:{anchor:clamp(s.anchor),head:clamp(s.head??s.anchor)}});view.requestMeasure({read:()=>Math.max(0,Number(s.top)||0),write:top=>{view.scrollDOM.scrollTop=top;}});return true;}
 return {view,get value(){return view.state.doc.toString();},get selectionStart(){return view.state.selection.main.from;},get selectionEnd(){return view.state.selection.main.to;},focus(){view.focus();},find(){if(view.composing||view.state.field(compositionState))return false;return openSearchPanel(view);},jumpTo,jumpHeading,setPosition,getPosition:position,selectEnd(){const p=view.state.doc.length;view.dispatch({selection:EditorSelection.cursor(p),effects:EditorView.scrollIntoView(p,{y:'end'})});view.focus();},insert,update(next){const changedOutline=!!current.onOutline!==!!next.onOutline;current=next;if(changedOutline){if(current.onOutline)outline();else{clearTimeout(outlineTimer);stopOutline?.();}}if(view.state.doc.toString()!==next.value&&!view.composing&&!view.state.field(compositionState))view.dispatch({changes:{from:0,to:view.state.doc.length,insert:next.value},annotations:[externalChange.of(true),Transaction.addToHistory.of(false)]});},destroy(){if(!view.composing&&!view.state.field(compositionState))current.onViewState?.(position());destroyed=true;cancelNavigation();clearTimeout(outlineTimer);clearTimeout(positionTimer);stopOutline?.();view.scrollDOM.removeEventListener('scroll',remember);view.contentDOM.removeEventListener('keydown',keyboard,true);resources.delete(view);view.destroy();}};
}
export function createMarkdownEditor(React){return function MarkdownEditor(props){const parent=React.useRef(null),editor=React.useRef(null);React.useLayoutEffect(()=>{const api=mountEditor(parent.current,props);editor.current=api;props.apiRef.current=api;return()=>{if(props.apiRef.current===api)props.apiRef.current=null;api.destroy();};},[]);React.useLayoutEffect(()=>editor.current?.update(props));return React.createElement('div',{className:'pdoc-live-editor',ref:parent});};}
