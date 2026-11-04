import { indentMore, indentLess, insertTab } from '@codemirror/commands';

const released=new WeakSet();
export function isTabReleased(view){return released.has(view);}
export function releaseEditorTab(view,enabled=true){enabled?released.add(view):released.delete(view);view.setTabFocusMode?.(enabled);}
export function editorKeydown(view,event,{composing=false,focusOutside=()=>{}}={}){
 if(composing||event.isComposing||event.keyCode===229||view.composing)return false;
 if(event.ctrlKey||event.metaKey||event.altKey)return false;
 if(event.key==='Escape'){releaseEditorTab(view);event.preventDefault();event.stopPropagation();return true;}
 if(event.key==='Tab'&&released.has(view)){event.preventDefault();event.stopPropagation();releaseEditorTab(view,false);focusOutside(event.shiftKey);return true;}
 if(event.key!=='Tab'&&released.has(view))releaseEditorTab(view,false);
 return editorTab(view,event);
}
/** The editor owns Tab only while it has focus. IME candidate keys remain with the IME. */
export function editorTab(view, event) {
 if (event.key !== 'Tab' || event.ctrlKey || event.metaKey || event.altKey || event.isComposing || event.keyCode === 229 || view.composing || released.has(view)) return false;
 const state=view.state;
 const list=state.selection.ranges.some(r=>/^\s*(?:[-+*]|\d+[.)])\s/.test(state.doc.lineAt(r.head).text));
 const run=event.shiftKey?indentLess:list?indentMore:insertTab;
 run(view);
 event.preventDefault();event.stopPropagation();
 return true;
}
