import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {history,undo} from '@codemirror/commands';
import {markdownSupport,presentationPlan} from './live-preview.js';
import {closingFenceChange,closingFenceInput,closingFenceEnter} from './fence-editing.js';
const state=text=>EditorState.create({doc:text,extensions:[markdownSupport()]});
test('typing the final closing backtick after Tab ends the code block before following text',()=>{
 let s=state('```text \n\tssss\n\t``\n\n# 后面的正文');
 const at=s.doc.line(3).to,change=closingFenceChange(s,at,at,'`')||{from:at,to:at,insert:'`'};
 s=s.update({changes:change,selection:{anchor:s.doc.length+(change.insert.length-(change.to-change.from))}}).state;
 const outside=s.doc.line(5).from,plan=presentationPlan(s);
 assert(!plan.some(x=>x.className==='pdoc-code-line'&&x.from===outside),'closing fence must stop the code background before following Markdown');
 assert.equal(s.doc.line(3).text,'```');
 assert.equal(s.doc.line(2).text,'\tssss');
});
test('code fences keep literal Callout syntax inside code from receiving a rendered Callout',()=>{
 const s=state('```md\n> [!NOTE] literal\n```\n\n末尾'),plan=presentationPlan(s);
 assert(!plan.some(x=>x.className==='pdoc-callout'),'code content must not receive Markdown Callout styling');
});
const view=text=>{let s=EditorState.create({doc:text,selection:{anchor:text.length},extensions:[markdownSupport(),history()]});return {get state(){return s;},dispatch(tr){s=s.update(tr).state;}};};
test('Enter closes a previously inserted indented fence and the following heading renders normally',()=>{
 const v=view('```text \n\tssss\n\t```');assert(closingFenceEnter(v));
 assert.equal(v.state.doc.toString(),'```text \n\tssss\n```\n');
 const pos=v.state.doc.length;v.dispatch({changes:{from:pos,insert:'# 后面的正文'}});
 assert(!presentationPlan(v.state).some(x=>x.className==='pdoc-code-line'&&x.from===pos));
 assert(presentationPlan(v.state).some(x=>x.className==='pdoc-h1'&&x.from===pos));
});
test('closing fence alignment is one undoable edit and retains body tabs',()=>{
 const v=view('  ~~~~sql\n\tselect 1;\n\t~~~'),p=v.state.doc.length;
 assert(closingFenceInput(v,p,p,'~'));assert.equal(v.state.doc.toString(),'  ~~~~sql\n\tselect 1;\n  ~~~~');
 assert(undo(v));assert.equal(v.state.doc.toString(),'  ~~~~sql\n\tselect 1;\n\t~~~');
});
test('incomplete, mixed, annotated and container fences are left literal',()=>{
 for(const [doc,text]of [['````md\n\t``','`'],['```md\n\t~~','~'],['```md\n\t```literal','`'],['- ```md\n  \t``','`'],['> ```md\n> \t``','`'],['not a code block\n\t``','`'],['```md\n  ``','`']]){
  const s=state(doc);assert.equal(closingFenceChange(s,doc.length,doc.length,text),null,JSON.stringify(doc));
 }
 const s=state('```md\n\t');assert.equal(closingFenceChange(s,s.doc.length,s.doc.length,'```\n# pasted text'),null);
});
test('closing assistance never edits an active input composition',()=>{
 const v=view('```md\n\t``');v.composing=true;assert.equal(closingFenceInput(v,v.state.doc.length,v.state.doc.length,'`'),false);
 assert.equal(v.state.doc.toString(),'```md\n\t``');
 const w=view('```md\n\t```');w.composing=true;assert.equal(closingFenceEnter(w),false);assert.equal(w.state.doc.toString(),'```md\n\t```');
});
