import {syntaxTree} from '@codemirror/language';
const columns=indent=>Array.from(indent).reduce((n,c)=>c==='\t'?n+4-n%4:n+1,0);
/** Align an explicitly typed standalone closer; never reinterpret stored Markdown. */
export function closingFenceChange(state,from,to,text){
 if(text&&!/^[`~]+$/.test(text))return null;
 const line=state.doc.lineAt(from);if(to>line.to)return null;
 const next=line.text.slice(0,from-line.from)+text+line.text.slice(to-line.from);
 const close=/^([ \t]+)(`{3,}|~{3,})([ \t]*)$/.exec(next);
 if(!close||columns(close[1])<4)return null;
 let node=syntaxTree(state).resolveInner(from,-1);while(node&&node.name!=='FencedCode')node=node.parent;
 // Container indentation belongs to Markdown's list/quote keymap, not this root-fence helper.
 if(!node||node.parent?.name!=='Document'||node.from>=line.from)return null;
 const opener=state.doc.lineAt(node.from),open=/^( {0,3})(`{3,}|~{3,})/.exec(opener.text);
 if(!open||close[2][0]!==open[2][0]||close[2].length<open[2].length)return null;
 return {from:line.from,to:line.to,insert:open[1]+close[2]+close[3]};
}
export function closingFenceInput(view,from,to,text){
 if(view.composing||view.state.selection.ranges.length!==1)return false;
 const change=closingFenceChange(view.state,from,to,text);if(!change)return false;
 const suffix=view.state.doc.lineAt(to).to-to;
 view.dispatch({changes:change,selection:{anchor:change.from+change.insert.length-suffix},scrollIntoView:true});return true;
}
export function closingFenceEnter(view){
 const state=view.state,range=state.selection.main,line=state.doc.lineAt(range.head);
 if(view.composing||state.selection.ranges.length!==1||!range.empty||range.head!==line.to)return false;
 const change=closingFenceChange(state,range.head,range.head,'');if(!change)return false;
 const indent=/^[ ]*/.exec(change.insert)[0],insert=change.insert+'\n'+indent;
 view.dispatch({changes:{...change,insert},selection:{anchor:change.from+insert.length},scrollIntoView:true});return true;
}
