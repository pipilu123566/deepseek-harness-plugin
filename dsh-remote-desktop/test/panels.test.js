import test from 'node:test';
import assert from 'node:assert/strict';
import {initPanels} from '../web/panels.js';

// Event-level fixture only; native dialog layout/focus trapping needs a browser.
class Target extends EventTarget{
 constructor(){super();this.hidden=false;this.open=false;this.attrs=new Map();this.focused=0;}
 setAttribute(k,v){this.attrs.set(k,v);}
 focus(){this.focused++;}
 showModal(){this.open=true;}
 close(){if(this.open){this.open=false;this.dispatchEvent(new Event('close'));}}
 getBoundingClientRect(){return{left:100,top:50,right:400,bottom:350};}
 fire(type,props={}){const e=new Event(type,{cancelable:true});Object.assign(e,props);this.dispatchEvent(e);return e;}
}
function fixture(){
 const ids=['mobile-access-dialog','mobile-access-open','mobile-access-close'];
 const elements=Object.fromEntries(ids.map(id=>[id,new Target()]));
 const doc=new Target();doc.getElementById=id=>elements[id];
 let mobileClears=0;
 const dispose=initPanels(doc,{onMobileClose:()=>mobileClears++});
 return{doc,elements,dispose,get mobileClears(){return mobileClears;}};
}
test('mobile entry is modal, clears its credentials on close and returns to its trigger',()=>{
 const f=fixture(),d=f.elements['mobile-access-dialog'],o=f.elements['mobile-access-open'];
 o.fire('click');assert.equal(d.open,true);assert.equal(f.mobileClears,0);
 f.elements['mobile-access-close'].fire('click');assert.equal(d.open,false);assert.equal(f.mobileClears,1);assert.equal(o.focused,1);
 o.fire('click');d.close(); // Native Escape takes this same close-event path.
 assert.equal(f.mobileClears,2);assert.equal(o.focused,2);f.dispose();
});
test('only backdrop clicks dismiss access; backgrounding and disposal clear the entry',()=>{
 const f=fixture(),d=f.elements['mobile-access-dialog'],o=f.elements['mobile-access-open'];
 o.fire('click');d.fire('click',{clientX:200,clientY:200});assert.equal(d.open,true);
 d.fire('click',{clientX:50,clientY:20});assert.equal(d.open,false);assert.equal(f.mobileClears,1);
 o.fire('click');f.doc.hidden=true;f.doc.fire('visibilitychange');assert.equal(d.open,false);assert.equal(f.mobileClears,2);
 o.fire('click');f.dispose();
 assert.equal(d.open,false);assert.equal(f.mobileClears,3);
 o.fire('click');assert.equal(d.open,false);
});
