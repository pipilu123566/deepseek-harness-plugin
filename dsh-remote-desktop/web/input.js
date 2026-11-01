// Keep fresh motion at the browser boundary; reliable button/key events retain order.
export function createInputSender({write,buffered,schedule=requestAnimationFrame,cancel=cancelAnimationFrame,onBlocked}) {
 const pending=new Map();let frame=null;
 function clear(){if(frame!==null)cancel(frame);frame=null;pending.clear();}
 function flush(){
  frame=null;
  if(buffered()<=2048){for(const m of pending.values())write(m);pending.clear();}
  if(pending.size)frame=schedule(flush);
 }
 function send(m){
  const motion=m.type==='wheel'||m.type==='pointer'&&m.action==='move';
  if(motion){
   const old=pending.get(m.type);
   if(m.type==='wheel'&&old)m={...m,dx:Math.max(-600,Math.min(600,old.dx+m.dx)),dy:Math.max(-600,Math.min(600,old.dy+m.dy))};
   pending.delete(m.type);pending.set(m.type,m);
   if(frame===null)frame=schedule(flush);
   return true;
  }
  if(frame!==null)cancel(frame);frame=null;
  if(buffered()<=2048){for(const value of pending.values())write(value);}
  pending.clear();
  // Fail closed instead of dropping a button/key release behind a clogged channel.
  if(buffered()>8192){onBlocked();return false;}
  return write(m);
 }
 return {send,clear};
}
