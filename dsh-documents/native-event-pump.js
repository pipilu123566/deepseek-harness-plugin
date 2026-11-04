/** Keep native input responsive while the panel is active, without speeding up idle polling. */
export function createEventPump(step,{active=()=>false,setTimer=setTimeout,clearTimer=clearTimeout}={}){
 let timer=null,stopped=false,running=false;
 function schedule(delay){if(timer!==null)clearTimer(timer);timer=null;if(stopped)return;timer=setTimer(tick,delay);timer.unref?.();}
 function tick(){timer=null;if(stopped||running)return;running=true;try{step();}finally{running=false;schedule(active()?4:16);}}
 schedule(0);
 return {wake(){if(!running)schedule(0);},stop(){stopped=true;if(timer!==null)clearTimer(timer);timer=null;}};
}
