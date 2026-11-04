import {mountCapture} from './capture-view.js';
const pending=new Map();let id=0;
window.__reply=message=>{const p=pending.get(message.id);if(!p)return;pending.delete(message.id);message.ok?p.resolve(message.data):p.reject(Error(message.error));};
const api=request=>new Promise((resolve,reject)=>{const serial=++id;pending.set(serial,{resolve,reject});window.webkit.messageHandlers.documents.postMessage(JSON.stringify({id:serial,request}));});
// Only bundled code runs in this page; rendered note links never navigate the privileged view.
document.addEventListener('click',e=>{if(e.target.closest?.('a'))e.preventDefault();},true);
window.__capture=mountCapture(document.getElementById('capture'),{api,onClose:()=>api({op:'nativeClose'}),language:navigator.language});
