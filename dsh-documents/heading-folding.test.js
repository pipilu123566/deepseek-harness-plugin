import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {history,undoDepth} from '@codemirror/commands';
import {codeFolding,foldEffect,unfoldEffect,foldedRanges} from '@codemirror/language';
import {markdownSupport,presentationPlan} from './live-preview.js';

const createState = doc => EditorState.create({
 doc,
 selection:{anchor:doc.length},
 extensions:[markdownSupport(),codeFolding(),history()]
});
const controls = state => presentationPlan(state).filter(item => item.kind === 'fold');
const controlAt = (state,from) => {
 const control=controls(state).find(item => item.from === from);
 assert(control,`Expected a heading fold control at ${from}`);
 return control;
};
const ranges = state => {
 const result=[];
 foldedRanges(state).between(0,state.doc.length,(from,to) => result.push({from,to}));
 return result;
};

test('all six heading levels fold descendants until a same or higher heading',()=>{
 for(let level=1;level<=6;level++){
  for(const boundaryLevel of new Set([level,1])){
   const heading='#'.repeat(level)+' Heading';
   const descendants=level<6?'\n\n'+'#'.repeat(level+1)+' Child\nchild body':'';
   const section=heading+'\nbody'+descendants;
   const next='#'.repeat(boundaryLevel)+' Next';
   const doc=section+'\n\n'+next+'\noutside';
   const state=createState(doc),control=controlAt(state,0);
   assert.equal(control.to,0);
   assert.equal(control.range.from,heading.length);
   assert.equal(control.range.to,section.length);
   assert.equal(control.folded,false);
   assert.equal(typeof control.label,'string');
   assert(control.label.length>0);
   assert(control.range.to<doc.indexOf(next));
   if(level<6)assert(state.doc.sliceString(control.range.from,control.range.to).includes('child body'));
  }
 }
});

test('empty sections have no control and the last populated section folds to document end',()=>{
 const doc='# Empty\n# Body\ncontent\n\n## Empty child\n\n# Last empty';
 assert.deepEqual(controls(createState(doc)).map(item=>item.from),[doc.indexOf('# Body')]);
 const last='# Last\nbody at end';
 const control=controlAt(createState(last),0);
 assert.equal(control.range.to,last.length);
 assert.equal(last.slice(control.range.from),'\nbody at end');
});

test('Setext headings use their own section boundaries',()=>{
 const first='Title\n=====\nbody\n\nSection\n-------\nchild';
 const doc=first+'\n\nNext\n====\noutside';
 const state=createState(doc);
 assert.deepEqual(controls(state).map(item=>item.from),[0,doc.indexOf('Section'),doc.indexOf('Next')]);
 assert.equal(controlAt(state,0).range.to,first.length);
 assert.equal(controlAt(state,doc.indexOf('Section')).range.to,first.length);
 assert.equal(controlAt(state,doc.indexOf('Next')).range.to,doc.length);
});

test('frontmatter and code contain no heading controls or false section boundaries',()=>{
 const doc='---\n# Metadata heading\nname: sample\n---\n\n# Real\ntext\n\n```md\n# Fake fenced\n## Fake child\n```\n\n    # Fake indented\n\n\\# Escaped\n\nend\n\n# Next\noutside';
 const state=createState(doc);
 assert.deepEqual(controls(state).map(item=>item.from),[doc.indexOf('# Real'),doc.indexOf('# Next')]);
 const range=controlAt(state,doc.indexOf('# Real')).range;
 const hidden=state.doc.sliceString(range.from,range.to);
 assert(hidden.includes('# Fake fenced'));
 assert(hidden.includes('# Fake indented'));
 assert(hidden.endsWith('end'));
 assert(!hidden.includes('# Next'));
});

test('identical heading text has independent fold state',()=>{
 const doc='# Repeat\nfirst\n\n# Repeat\nsecond';
 let state=createState(doc);
 const first=controlAt(state,0),secondFrom=doc.lastIndexOf('# Repeat');
 state=state.update({effects:foldEffect.of(first.range)}).state;
 assert.equal(controlAt(state,0).folded,true);
 assert.equal(controlAt(state,secondFrom).folded,false);
 assert.deepEqual(ranges(state),[first.range]);
});

test('unfolding a parent preserves a previously folded child',()=>{
 const doc='# Parent\nparent body\n\n## Child\nchild body\n\n# Next\noutside';
 let state=createState(doc);
 const parent=controlAt(state,0).range;
 const childFrom=doc.indexOf('## Child'),child=controlAt(state,childFrom).range;
 state=state.update({effects:foldEffect.of(child)}).state;
 state=state.update({effects:foldEffect.of(parent)}).state;
 assert.deepEqual(ranges(state),[parent,child]);
 state=state.update({effects:unfoldEffect.of(parent)}).state;
 assert.deepEqual(ranges(state),[child]);
 assert.equal(controlAt(state,0).folded,false);
 assert.equal(controlAt(state,childFrom).folded,true);
 assert.equal(state.doc.toString(),doc);
});

test('fold effects preserve Markdown and do not add an editable history entry',()=>{
 const doc='# Heading\n**content**\n\n# Next\nuntouched';
 let state=createState(doc);
 const range=controlAt(state,0).range;
 for(const effect of [foldEffect.of(range),unfoldEffect.of(range)]){
  const transaction=state.update({effects:effect});
  assert.equal(transaction.docChanged,false);
  state=transaction.state;
  assert.equal(state.doc.toString(),doc);
  assert.equal(undoDepth(state),0);
 }
});

test('editing before a folded heading maps its control and folded range',()=>{
 const doc='Intro\n\n# Heading\nfolded body\n\n# Next\noutside';
 let state=createState(doc);
 const headingFrom=doc.indexOf('# Heading'),range=controlAt(state,headingFrom).range;
 state=state.update({effects:foldEffect.of(range)}).state;
 const prefix='Added before\n';
 state=state.update({changes:{from:0,insert:prefix}}).state;
 const mapped={from:range.from+prefix.length,to:range.to+prefix.length};
 assert.deepEqual(ranges(state),[mapped]);
 assert.deepEqual(controlAt(state,headingFrom+prefix.length).range,mapped);
 assert.equal(controlAt(state,headingFrom+prefix.length).folded,true);
 assert.equal(state.doc.toString(),prefix+doc);
});
