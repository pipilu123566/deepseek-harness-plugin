import test from 'node:test';
import assert from 'node:assert/strict';
import {swapControl,keyModifiers,keyboardMessage,wheelAction} from '../web/desktop-input.js';

test('PC Control chords map both modifier keys and flags to Mac Command',()=>{
 const swap=swapControl('auto','Win32');assert.equal(swap,true);
 const down=keyboardMessage({code:'ControlLeft',ctrlKey:true},true,swap);
 const copy=keyboardMessage({code:'KeyC',ctrlKey:true},true,swap);
 const up=keyboardMessage({code:'ControlLeft',ctrlKey:false},false,swap);
 assert.equal(down.code,'MetaLeft');assert.equal(down.meta,true);assert.equal(down.ctrl,false);
 assert.equal(copy.code,'KeyC');assert.equal(copy.meta,true);assert.equal(copy.ctrl,false);
 assert.equal(up.code,'MetaLeft');assert.equal(up.down,false);
 assert.equal(keyboardMessage({code:'MetaRight',metaKey:true},true,swap).code,'ControlRight');
});
test('Mac and raw mode preserve native chords, including terminal Control-C',()=>{
 assert.equal(swapControl('auto','MacIntel'),false);assert.equal(swapControl('auto','Linux x86_64'),true);
 assert.equal(swapControl('raw','Win32'),false);assert.equal(swapControl('pc','MacIntel'),true);
 assert.deepEqual(keyModifiers({ctrlKey:true,shiftKey:true},false),{meta:false,ctrl:true,shift:true,alt:false});
 assert.equal(keyboardMessage({code:'KeyC',ctrlKey:true},true,false).ctrl,true);
 assert.equal(keyboardMessage({code:'NumpadEnter'},false,false).code,'Enter');
 assert.equal(keyboardMessage({code:'Unidentified'},true),null);
});
test('wheel scrolls remote content; Shift maps vertical delta to horizontal once',()=>{
 assert.deepEqual(wheelAction({deltaX:4,deltaY:60,deltaMode:0}),{type:'wheel',dx:4,dy:60});
 assert.deepEqual(wheelAction({deltaX:0,deltaY:120,deltaMode:0,shiftKey:true}),{type:'wheel',dx:120,dy:0});
 assert.deepEqual(wheelAction({deltaX:120,deltaY:0,deltaMode:0,shiftKey:true}),{type:'wheel',dx:120,dy:0});
});
test('Ctrl or Command wheel zooms locally and pan mode moves the view',()=>{
 const event={deltaX:0,deltaY:120,deltaMode:0};
 for(const mod of ['ctrlKey','metaKey']){
  const action=wheelAction({...event,[mod]:true});assert.equal(action.type,'zoom');assert.ok(action.factor<1);
 }
 assert.deepEqual(wheelAction(event,{pan:true}),{type:'pan',dx:-0,dy:-120});
 assert.equal(wheelAction({...event,deltaY:-120,metaKey:true},{pan:true}).type,'zoom');
});
test('line and page wheels normalize units before scrolling or zooming',()=>{
 assert.deepEqual(wheelAction({deltaX:0,deltaY:3,deltaMode:1}),{type:'wheel',dx:0,dy:48});
 assert.deepEqual(wheelAction({deltaX:0,deltaY:1,deltaMode:2},{height:500}),{type:'wheel',dx:0,dy:500});
 assert.ok(Number.isFinite(wheelAction({deltaX:0,deltaY:1e7,deltaMode:0,ctrlKey:true}).factor));
});
