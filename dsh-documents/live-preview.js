import { Annotation, EditorSelection, EditorState, StateField, Transaction } from '@codemirror/state';
import { Decoration, EditorView, keymap, WidgetType, drawSelection } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { syntaxTree, syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

export const markdownSupport = () => markdown({base:markdownLanguage,completeHTMLTags:false,pasteURLAsLink:false});
const externalChange = Annotation.define();
/** Presentation only: source positions and the original document remain authoritative. */
export function presentationPlan(state) {
 const doc=state.doc,active=(from,to)=>state.selection.ranges.some(r=>{
  const a=doc.lineAt(r.from).from,b=doc.lineAt(r.to>r.from?r.to-1:r.to).to;
  return from<=b&&to>=a;
 });
 const out=[],hidden=new Set(),hide=(from,to)=>{const key=from+':'+to;if(to>from&&!hidden.has(key)){hidden.add(key);out.push({kind:'hide',from,to});}};
 syntaxTree(state).iterate({enter(n){
  const name=n.name,raw=doc.sliceString(n.from,n.to),editing=active(n.from,n.to);
  if(/^ATXHeading[1-6]$/.test(name))out.push({kind:'line',from:doc.lineAt(n.from).from,to:doc.lineAt(n.from).from,className:'pdoc-h'+name.at(-1)});
  if(name==='Blockquote')for(let pos=doc.lineAt(n.from).from;pos<=n.to;){const line=doc.lineAt(pos);out.push({kind:'line',from:pos,to:pos,className:'pdoc-quote'});if(line.to===doc.length)break;pos=line.to+1;}
  if(['StrongEmphasis','Emphasis','Strikethrough','InlineCode'].includes(name))out.push({kind:'mark',from:n.from,to:n.to,className:({StrongEmphasis:'pdoc-strong',Emphasis:'pdoc-em',Strikethrough:'pdoc-strike',InlineCode:'pdoc-code'})[name]});
  if(name==='FencedCode'){
   for(let pos=doc.lineAt(n.from).from;pos<=n.to;){const line=doc.lineAt(pos);out.push({kind:'line',from:pos,to:pos,className:'pdoc-code-line'});if(line.to===doc.length)break;pos=line.to+1;}
   if(!editing){for(const c of [n.node.firstChild,n.node.lastChild])if(c?.name==='CodeMark'){const line=doc.lineAt(c.from);hide(line.from,line.to);}}
   return false;
  }
  if(name==='Table'&&!editing){out.push({kind:'table',from:n.from,to:n.to,text:raw});return false;}
  if(name==='Link'){
   if(!editing){const children=[];for(let c=n.node.firstChild;c;c=c.nextSibling)children.push(c);const marks=children.filter(c=>c.name==='LinkMark');
    if(marks.length>=2){hide(marks[0].from,marks[0].to);hide(marks[1].from,n.to);out.push({kind:'mark',from:marks[0].to,to:marks[1].from,className:'pdoc-link'});return false;}
   }
  }
  if(!editing&&['HeaderMark','EmphasisMark','StrikethroughMark','CodeMark','QuoteMark'].includes(name)){
   let end=n.to;if(['HeaderMark','QuoteMark'].includes(name)){const space=/^[ \t]+/.exec(doc.sliceString(end,doc.lineAt(end).to));if(space)end+=space[0].length;}
   hide(n.from,end);
  }
  if(!editing&&name==='ListMark'&&/^[-+*]$/.test(raw))out.push({kind:'bullet',from:n.from,to:n.to});
 }});
 return out;
}
class Bullet extends WidgetType {eq(){return true;}toDOM(){const el=document.createElement('span');el.textContent='•';el.setAttribute('aria-hidden','true');return el;}}
class Table extends WidgetType {
 constructor(text,pos){super();this.text=text;this.pos=pos;}
 eq(other){return this.text===other.text&&this.pos===other.pos;}
 toDOM(view){const el=document.createElement('div');el.className='pdoc-live-table';el.innerHTML=DOMPurify.sanitize(marked.parse(this.text),{FORBID_TAGS:['iframe','object','embed','input','form','style'],FORBID_ATTR:['src','srcset','style']});
  el.addEventListener('mousedown',e=>{e.preventDefault();view.dispatch({selection:{anchor:this.pos},scrollIntoView:true});view.focus();});return el;
 }
 ignoreEvent(){return false;}
}
function decorate(state){const ranges=[];for(const p of presentationPlan(state)){
 if(p.kind==='line')ranges.push(Decoration.line({class:p.className}).range(p.from));
 else if(p.kind==='mark')ranges.push(Decoration.mark({class:p.className}).range(p.from,p.to));
 else if(p.kind==='table')ranges.push(Decoration.replace({widget:new Table(p.text,p.from),block:true}).range(p.from,p.to));
 else ranges.push(Decoration.replace(p.kind==='bullet'?{widget:new Bullet()}:{}).range(p.from,p.to));
}return Decoration.set(ranges,true);}
const liveField=StateField.define({create:decorate,update(value,tr){return tr.docChanged||tr.selection||syntaxTree(tr.startState)!==syntaxTree(tr.state)?decorate(tr.state):value;},provide:f=>EditorView.decorations.from(f)});
const theme=EditorView.theme({
 '&':{height:'100%',fontSize:'inherit',color:'var(--dsw-alias-label-primary)'},
 '&.cm-focused':{outline:'none'},'.cm-scroller':{overflow:'auto',fontFamily:'inherit',lineHeight:'1.75'},
 '.cm-content':{padding:'10px 12px',minHeight:'180px',caretColor:'var(--dsw-alias-label-primary)'},'.cm-line':{padding:'0 2px'},
 '.cm-selectionBackground, &.cm-focused .cm-selectionBackground':{backgroundColor:'#6495ed45'},'.cm-cursor':{borderLeftColor:'var(--dsw-alias-label-primary)'},
 '.pdoc-h1':{fontSize:'1.8em',fontWeight:'500',lineHeight:'1.5',paddingTop:'12px',paddingBottom:'8px'},
 '.pdoc-h2':{fontSize:'1.5em',fontWeight:'500',lineHeight:'1.5',paddingTop:'10px',paddingBottom:'6px'},
 '.pdoc-h3':{fontSize:'1.25em',fontWeight:'500',paddingTop:'8px',paddingBottom:'4px'},'.pdoc-h4,.pdoc-h5,.pdoc-h6':{fontSize:'1.1em',fontWeight:'500'},
 '.pdoc-strong':{fontWeight:'500'},'.pdoc-em':{fontStyle:'italic'},'.pdoc-strike':{textDecoration:'line-through'},
 '.pdoc-code,.pdoc-code-line':{fontFamily:'var(--dsw-font-family-code,monospace)',backgroundColor:'var(--dsw-alias-settings-card-fill,#8882)'},
 '.pdoc-quote':{borderLeft:'2px solid var(--dsw-alias-border-l2,#8885)',paddingLeft:'12px',color:'var(--dsw-alias-label-secondary)'},
 '.pdoc-link':{textDecoration:'underline',textUnderlineOffset:'3px'},
 '.pdoc-live-table':{overflowX:'auto',margin:'8px 0'},'.pdoc-live-table table':{borderCollapse:'collapse',fontSize:'inherit'},'.pdoc-live-table td,.pdoc-live-table th':{border:'1px solid var(--dsw-alias-border-l2,#8885)',padding:'6px 10px',textAlign:'left',fontWeight:'400'}
});
/** Host React is injected; the bundle never installs another React instance. */
export function createMarkdownEditor(React){
 return function MarkdownEditor({value,onChange,onSave,onComposition,apiRef,label}){
  const parent=React.useRef(null),editor=React.useRef(null),current=React.useRef();current.current={value,onChange,onSave,onComposition,label};
  React.useLayoutEffect(()=>{
   const view=new EditorView({parent:parent.current,state:EditorState.create({doc:value,extensions:[markdownSupport(),history(),drawSelection(),EditorView.lineWrapping,theme,syntaxHighlighting(HighlightStyle.define([{tag:tags.heading,fontWeight:'500'},{tag:tags.processingInstruction,color:'var(--dsw-alias-label-tertiary)'},{tag:tags.monospace,fontFamily:'var(--dsw-font-family-code,monospace)'}])),liveField,
    EditorView.contentAttributes.of({'aria-label':label,spellcheck:'true'}),
    EditorView.domEventHandlers({compositionstart(){current.current.onComposition(true);return false;},compositionend(){queueMicrotask(()=>current.current.onComposition(false));return false;}}),
    keymap.of([{key:'Mod-s',run:()=>{current.current.onSave();return true;}},...defaultKeymap,...historyKeymap]),
    EditorView.updateListener.of(u=>{if(u.docChanged&&!u.transactions.some(tr=>tr.annotation(externalChange)))current.current.onChange(u.state.doc.toString());})
   ]})});editor.current=view;
   const api={get value(){return view.state.doc.toString();},get selectionStart(){return view.state.selection.main.from;},get selectionEnd(){return view.state.selection.main.to;},focus(){view.focus();},selectEnd(){const p=view.state.doc.length;view.dispatch({selection:EditorSelection.cursor(p),effects:EditorView.scrollIntoView(p,{y:'end'})});view.focus();}};
   apiRef.current=api;
   return()=>{if(apiRef.current===api)apiRef.current=null;editor.current=null;view.destroy();};
  },[]);
  React.useLayoutEffect(()=>{const view=editor.current;if(view&&view.state.doc.toString()!==value){view.dispatch({changes:{from:0,to:view.state.doc.length,insert:value},annotations:[externalChange.of(true),Transaction.addToHistory.of(false)]});}},[value]);
  return React.createElement('div',{className:'pdoc-live-editor',ref:parent});
 };
}
