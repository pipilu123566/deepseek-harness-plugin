import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {markdownSupport,presentationPlan} from './live-preview.js';
import {isMermaidBlock,highlightedCode,localDiagramOnly} from './code-preview.js';
const state=(doc,anchor=doc.length)=>EditorState.create({doc,selection:{anchor},extensions:[markdownSupport()]});
test('closed SQL fences render highlighted code without changing Markdown or body indentation',()=>{
 const doc='Intro\n\n```sql\nSELECT *\n\tFROM accounts;\n```\n\nAfter';
 const s=state(doc),code=presentationPlan(s).find(x=>x.kind==='code');
 assert(code);assert.equal(code.language,'sql');assert.equal(code.code,'SELECT *\n\tFROM accounts;');
 assert.equal(s.doc.toString(),doc);assert(highlightedCode(code.code,code.language).includes('hljs-keyword'));
});
test('moving the caret into a preview exposes the complete original fence, then restores the preview',()=>{
 const doc='```mermaid\nflowchart LR\n A --> B\n```\n\nAfter';let s=state(doc);
 assert(presentationPlan(s).some(x=>x.kind==='code'));
 s=s.update({selection:{anchor:doc.indexOf('A -->')}}).state;assert(!presentationPlan(s).some(x=>x.kind==='code'));
 s=s.update({selection:{anchor:doc.length}}).state;assert(presentationPlan(s).some(x=>x.kind==='code'));
 assert.equal(s.doc.toString(),doc);
});
test('unclosed fences and fences in list or quote containers remain editable source',()=>{
 for(const doc of ['```mermaid\nflowchart LR\n A --> B','- ```js\n  let x=1;\n  ```\n\nAfter','> ```js\n> let x=1;\n> ```\n\nAfter'])assert(!presentationPlan(state(doc)).some(x=>x.kind==='code'));
});
test('an indented opening fence strips only its own indentation from the rendered code',()=>{
 const doc='  ```sql\n  SELECT 1;\n    WHERE true;\n  ```\n\nAfter',code=presentationPlan(state(doc)).find(x=>x.kind==='code');
 assert.equal(code.code,'SELECT 1;\n  WHERE true;');
});
test('Mermaid is explicit or inferred only from an unlabelled flowchart',()=>{
 assert(isMermaidBlock('mermaid','sequenceDiagram\nA->>B: hello'));
 assert(isMermaidBlock('','flowchart LR\n A --> B'));
 assert(isMermaidBlock('','graph TD\n A --> B'));
 assert(!isMermaidBlock('text','flowchart LR\n A --> B'));
 assert(!isMermaidBlock('sql','flowchart LR'));
 assert(!isMermaidBlock('','console.log("flowchart LR")'));
});
test('plain and highlighted code encode embedded HTML instead of executing it',()=>{
 for(const language of ['','unknown','html']){
  const rendered=highlightedCode('<script>alert(1)</script><img src=x onerror=alert(1)>',language);
  assert(!rendered.includes('<script>'));assert(!rendered.includes('<img '));
 }
});
test('diagram resources that would request images or remote CSS remain source',()=>{
 assert(localDiagramOnly('flowchart LR\n A[https://example.com] --> B'));
 for(const code of ['flowchart LR\n A@{img:"https://example.com/a.png"}','flowchart LR\n classDef red fill:url(https://example.com/a.svg);','%%{init:{"themeCSS":"@import url(https://example.com)"}}%%'])assert(!localDiagramOnly(code));
});
