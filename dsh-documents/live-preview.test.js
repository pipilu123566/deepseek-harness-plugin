import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EditorState,EditorSelection} from '@codemirror/state';
import {history,undo} from '@codemirror/commands';
import {markdownSupport,presentationPlan} from './live-preview.js';
const state=(doc,anchor,head=anchor)=>EditorState.create({doc,selection:EditorSelection.range(anchor,head),extensions:[markdownSupport(),history()]});
const hides=s=>presentationPlan(s).filter(x=>x.kind==='hide');
test('inactive heading hides markers; active heading retains syntax and heading style',()=>{const text='# 第一标题\n\n### 第二标题\n';const s=state(text,text.indexOf('第二'));assert(hides(s).some(x=>x.from===0&&x.to===2));assert(!hides(s).some(x=>x.from===text.indexOf('###')));assert(presentationPlan(s).some(x=>x.className==='pdoc-h3'));assert.equal(s.doc.toString(),text);});
test('moving caret restores old presentation without rewriting source',()=>{const text='# 第一\n\n## 第二\n';const a=state(text,2),b=a.update({selection:{anchor:text.indexOf('第二')}}).state;assert(!hides(a).some(x=>x.from===0));assert(hides(b).some(x=>x.from===0));assert.equal(b.doc.toString(),text);});
test('multiline selection reveals all touched lines, excludes next line at exclusive endpoint',()=>{const text='# 一\n## 二\n### 三\n';const pos=text.indexOf('###');const s=state(text,0,pos);assert.equal(hides(s).length,1);assert.equal(hides(s)[0].from,pos);});
test('nested inline syntax is presentation only; current line shows all delimiters',()=>{const text='**加粗** 和 *斜体*、`code`、~~删除~~\n\n末尾';const away=state(text,text.length);assert(hides(away).length>=8);const active=state(text,3);assert.equal(hides(active).length,0);assert.equal(active.doc.toString(),text);});
test('bullets decorate without changing ordered numbering or indentation',()=>{const text='- 一级\n  - 二级\n1. 有序\n\n结尾';const p=presentationPlan(state(text,text.length));assert.equal(p.filter(x=>x.kind==='bullet').length,2);assert.equal(p.filter(x=>x.kind==='hide').length,0);});
test('table reads as widget away from caret and exposes entire source when selected',()=>{const text='段落\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n末尾';assert(presentationPlan(state(text,text.length)).some(x=>x.kind==='table'));assert(!presentationPlan(state(text,text.indexOf('| 1'))).some(x=>x.kind==='table'));assert.equal(state(text,0).doc.toString(),text);});
test('fenced code keeps source delimiters editable throughout the active block',()=>{const text='```sql\nselect 1;\n```\n\n结尾';assert.equal(hides(state(text,text.length)).length,2);assert.equal(hides(state(text,text.indexOf('select'))).length,0);});
test('Chinese edit and undo preserve the original Markdown',()=>{const text='# 标题\n\n原有内容';let s=state(text,text.length);s=s.update({changes:{from:s.doc.length,insert:'，中文追加'}}).state;assert.equal(s.doc.toString(),text+'，中文追加');assert(undo({state:s,dispatch:tr=>{s=tr.state;}}));assert.equal(s.doc.toString(),text);});

test('an unfinished fence creates only one replacement range',()=>{const text='正文\n\n```';const p=hides(state(text,0));assert.equal(p.length,1);assert.equal(state(text,0).doc.toString(),text);});
