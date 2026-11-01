export function swapControl(mode,platform=''){
 return mode==='pc'||mode==='auto'&&/win|linux/i.test(platform);
}
export function keyModifiers(event,swap=false){
 return{meta:!!(swap?event.ctrlKey:event.metaKey),ctrl:!!(swap?event.metaKey:event.ctrlKey),shift:!!event.shiftKey,alt:!!event.altKey};
}
export function keyboardMessage(event,down,swap=false){
 let code=event.code;
 if(!code||code==='Unidentified')return null;
 if(swap)code=({ControlLeft:'MetaLeft',ControlRight:'MetaRight',MetaLeft:'ControlLeft',MetaRight:'ControlRight'})[code]||code;
 if(code==='NumpadEnter')code='Enter';
 return{type:'key',code,down,...keyModifiers(event,swap)};
}
export function wheelAction(event,{pan=false,height=600}={}){
 const unit=event.deltaMode===1?16:event.deltaMode===2?height:1;
 let dx=event.deltaX*unit,dy=event.deltaY*unit;
 if(event.ctrlKey||event.metaKey)return{type:'zoom',factor:Math.exp(Math.max(-2,Math.min(2,-dy/250)))};
 if(pan)return{type:'pan',dx:-dx,dy:-dy};
 if(event.shiftKey&&dx===0){dx=dy;dy=0;}
 return{type:'wheel',dx,dy};
}
