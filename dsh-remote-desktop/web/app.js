import QRCode from 'qrcode';
import {initPanels} from './panels.js';
import {createInputSender} from './input.js';
import {swapControl,keyModifiers,keyboardMessage,wheelAction} from './desktop-input.js';
import {fitView,zoomView,panView,resizeView,remotePoint,MAX_ZOOM} from './view.js';
const $=id=>document.getElementById(id);
const video=$('desktop-video'),screen=$('screen'),base=new URL('./',location.href);
$('back-link').href=new URL('../',base).href;
let state,ws,pc,channel,config,nativeReady=false,offered=false,active=false,pending=false,generation=0,polling=false,statusUnavailable=false,sequence=0,testPattern=false,handshakeTimer,entry,entryTimer,entryGeneration=0,pan=false;
let pointers=new Map(),gesture=null,view=null,statsTimer,previousStats,inputRTT=null;
const sentAt=new Map();
const messages={
 'input-congested':'操作通道持续拥堵，已安全断开，请降低清晰度后重连。',
 'display-unavailable':'所选显示器已断开，请刷新后选择其他显示器。',
 'permissions-required':'请在 Mac 上打开「DeepSeek 远程桌面权限」，授权屏幕录制和辅助功能后重试。',
 'agent-unavailable':'Mac 原生助手尚未就绪，请检查安装后重试。',
 'agent-timeout':'Mac 助手启动超时，请检查权限后重新连接。',
 'capture-failed':'Mac 画面采集暂不可用，请重新连接；持续失败时再检查屏幕状态与录屏权限。',
 'display-wake-failed':'无法唤醒 Mac 显示器，请稍后重新连接。',
 'capture-stopped':'Mac 已停止屏幕共享，请重新连接。',
 'negotiation-failed':'桌面连接协商失败，请重新连接。',
 'desktop-in-use':'桌面正在使用中，请在原页面断开后重试。',
 'connection-owner-required':'请在原页面结束正在使用的连接。',
};
function notice(text=''){ $('notice').textContent=text;$('notice').hidden=!text; }
function clearEntry(){entryGeneration++;entry=null;clearTimeout(entryTimer);$('copy-mobile-link').hidden=true;$('prepare-mobile-link').hidden=false;$('mobile-link-status').textContent='';const canvas=$('mobile-qr');canvas.hidden=true;canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);}
function render(){
 const ready=state?.native?.installed&&state.native.screen&&state.native.input;
 const busy=state?.phase!=='idle'&&state?.phase!==undefined&&!ws;
 $('machine-name').textContent=state?.machineName||'这台 Mac';
 $('machine-name').title=state?.machineName||'这台 Mac';
 $('status-label').textContent=active?'已连接':ws?'正在连接':pending?'正在处理':busy?'桌面正在使用中':!state?'正在检查':!ready?'电脑尚未就绪':'可以连接';
 $('status-pill').dataset.tone=active||ready&&!busy?'good':'neutral';
 $('connect').hidden=!!ws;$('connect').disabled=pending||!ready||busy;
 $('setup').hidden=!state?.native?.installed||!!ready||!!ws;$('setup').disabled=pending;
 $('disconnect').hidden=!ws&&!(state?.owned&&state?.phase!=='idle');$('disconnect').disabled=pending;
 $('empty-state').hidden=active;$('live-dot').dataset.live=String(active);
 $('viewer-label').textContent=active?(testPattern?'测试画面 · 输入不会操作 Mac':'实时桌面'):'电脑画面';
 if(!active)$('connection-detail').textContent=ws?'正在连接':'未连接';
 $('empty-title').textContent=ws?'正在连接桌面':busy?'桌面正在使用中':!ready?'Mac 助手需要授权':'连接你的 Mac';
 $('empty-description').textContent=ws?'正在建立画面和操作通道。':busy?'请在原页面断开后再连接。':!ready?'在 Mac 授权屏幕录制和辅助功能后，刷新状态。':'点击「连接这台 Mac」，即可查看和操作当前桌面。';
 for(const id of ['view-mode','pan','zoom-reset'])$(id).disabled=!active;
 $('display-select').disabled=pending; $('priority-select').disabled=pending;
 renderView();
}
async function api(path,body){
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),10000);
 try{const r=await fetch(new URL('api/'+path,base),{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',headers:body===undefined?{}:{'Content-Type':'application/json','X-Remote-Desktop':'1'},body:body===undefined?undefined:JSON.stringify(body),signal:abort.signal});
  const value=await r.json();if(!r.ok)throw Object.assign(new Error('request-failed'),{code:value.error,status:r.status});return value;
 }finally{clearTimeout(timer);}
}
function errorText(e){return messages[e.code]||(e.status===401||e.status===403?'请返回 DeepSeek 重新登录。':'连接暂不可用，请检查电脑和网络后重试。');}
const inputSender=createInputSender({
 buffered:()=>channel?.bufferedAmount??Infinity,
 write(m){
  if(!active||channel?.readyState!=='open')return false;
  const id=++sequence;sentAt.set(id,{time:performance.now(),notify:['text','key','shortcut'].includes(m.type)});
  if(sentAt.size>128)sentAt.delete(sentAt.keys().next().value);
  channel.send(JSON.stringify({...m,id}));return true;
 },onBlocked:()=>failed('input-congested')
});
function send(m){return active&&channel?.readyState==='open'?inputSender.send(m):false;}
async function measureConnection(peer,current){
 try{
  const report=await peer.getStats();if(current!==generation)return;
  let rtt=null,videoStats;
  report.forEach(r=>{if(r.type==='candidate-pair'&&r.state==='succeeded'&&r.nominated&&Number.isFinite(r.currentRoundTripTime))rtt=Math.round(r.currentRoundTripTime*1000);if(r.type==='inbound-rtp'&&r.kind==='video'&&!r.isRemote)videoStats=r;});
  const parts=[];if(rtt!==null)parts.push(`网络 ${rtt} ms`);if(inputRTT!==null)parts.push(`输入 ${Math.round(inputRTT)} ms`);
  if(videoStats){
   const prev=previousStats;previousStats=videoStats;
   if(prev){
    const frames=(videoStats.framesDecoded||0)-(prev.framesDecoded||0),seconds=(videoStats.timestamp-prev.timestamp)/1000;
    if(seconds>0)parts.push(`画面 ${Math.round(frames/seconds)} FPS`);
    const emitted=(videoStats.jitterBufferEmittedCount||0)-(prev.jitterBufferEmittedCount||0);
    if(emitted>0)parts.push(`缓冲 ${Math.round(((videoStats.jitterBufferDelay||0)-(prev.jitterBufferDelay||0))*1000/emitted)} ms`);
   }
  }
  $('stream-health').textContent=parts.join(' · ')||'正在测量连接';
 }catch{}
}

function cleanup(){
 generation++;clearTimeout(handshakeTimer);clearInterval(statsTimer);inputSender.clear();sentAt.clear();inputRTT=null;previousStats=null;$('stream-health').textContent='';active=false;nativeReady=false;offered=false;config=null;
 if(channel?.readyState==='open')channel.send(JSON.stringify({type:'release'}));
 channel?.close();channel=null;pc?.close();pc=null;const old=ws;ws=null;old?.close();
 video.srcObject=null;$('capture-size').textContent='连接后显示实际分辨率';view=null;gesture=null;pointers.clear();render();
}
async function disconnect(){
 cleanup();pending=true;render();
 try{state=await api('disconnect',{});notice();}catch(e){notice(errorText(e));}finally{pending=false;render();}
}
async function refresh(){
 if(pending||polling)return;polling=true;
 try{state=await api('status');renderDisplays();if(statusUnavailable){statusUnavailable=false;notice();}if(ws&&(!state.owned||state.phase==='idle')){cleanup();notice('连接已结束，可重新连接。');}render();}
 catch(e){if(e.status===401||e.status===403){if(ws)cleanup();notice(errorText(e));}else{statusUnavailable=true;notice(ws?'暂时无法更新连接状态，正在重试。':errorText(e));}}finally{polling=false;}
}
function failed(code){cleanup();notice(messages[code]||'连接已断开，请重新连接。');refresh();}
async function negotiate(){
 if(!config||!nativeReady||offered||!ws)return;offered=true;
 const current=generation;
 try{
  const peer=new RTCPeerConnection({iceServers:config.iceServers,iceTransportPolicy:config.relayOnly?'relay':'all'});pc=peer;
  const tr=peer.addTransceiver('video',{direction:'recvonly'});
  try{if('jitterBufferTarget' in tr.receiver)tr.receiver.jitterBufferTarget=0;}catch{}
  statsTimer=setInterval(()=>measureConnection(peer,current),2000);
  const codecs=RTCRtpReceiver.getCapabilities?.('video')?.codecs;
  if(codecs&&tr.setCodecPreferences)tr.setCodecPreferences([...codecs.filter(c=>c.mimeType==='video/H264'),...codecs.filter(c=>c.mimeType!=='video/H264')]);
  const dc=peer.createDataChannel('input',{ordered:true});channel=dc;
  function checkConnected(){if(current!==generation)return;active=dc.readyState==='open'&&['connected','completed'].includes(peer.iceConnectionState)&&video.readyState>=2;if(active){clearTimeout(handshakeTimer);notice();video.play().catch(()=>{});$('connection-detail').textContent=testPattern?'测试画面已连接':'桌面已连接';}render();}
  dc.onopen=checkConnected;video.onloadeddata=checkConnected;
  dc.onmessage=e=>{let m;try{m=JSON.parse(e.data);}catch{return;}if(m.type==='ack'){const sent=sentAt.get(m.id);if(sent){inputRTT=performance.now()-sent.time;sentAt.delete(m.id);}if(sent?.notify&&!m.ok)notice('输入未执行，请确认 Mac 辅助功能权限。');}};
  dc.onclose=()=>{if(current===generation)failed();};
  peer.onicecandidate=e=>{if(current===generation&&e.candidate&&ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify({type:'candidate',candidate:e.candidate.candidate,sdpMid:e.candidate.sdpMid,sdpMLineIndex:e.candidate.sdpMLineIndex}));};
  peer.ontrack=e=>{if(current!==generation)return;video.srcObject=e.streams[0]||new MediaStream([e.track]);video.play().catch(()=>{});};
  peer.oniceconnectionstatechange=()=>{if(current!==generation)return;checkConnected();if(peer.iceConnectionState==='failed')failed();};
  const offer=await peer.createOffer();await peer.setLocalDescription(offer);
  if(current===generation&&ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify({type:'offer',sdp:offer.sdp}));
 }catch{if(current===generation)failed('negotiation-failed');}
}
async function connect(){
 if(pending||ws)return;pending=true;notice();render();
 try{
  state=await api('connect',{displayId:Number($('display-select').value),priority:$('priority-select').value});const current=++generation;nativeReady=false;config=null;offered=false;
  const url=new URL('socket',base);url.protocol=url.protocol==='https:'?'wss:':'ws:';
  const socket=new WebSocket(url);ws=socket;
  socket.onmessage=async e=>{
   if(current!==generation)return;
   let m;try{m=JSON.parse(e.data);}catch{return failed();}
   if(m.type==='configuration'){config=m;testPattern=m.testPattern===true;negotiate();}
   else if(m.type==='ready'){nativeReady=true;negotiate();}
   else if(m.type==='answer'){try{await pc?.setRemoteDescription({type:'answer',sdp:m.sdp});for(const c of candidates)await pc?.addIceCandidate(c);candidates=[];}catch{failed('negotiation-failed');}}
   else if(m.type==='candidate'){const c={candidate:m.candidate,sdpMid:m.sdpMid,sdpMLineIndex:m.sdpMLineIndex};if(pc?.remoteDescription)pc.addIceCandidate(c).catch(()=>failed('negotiation-failed'));else candidates.push(c);}
   else if(m.type==='capture'){$('capture-size').textContent=`采集 ${m.width} × ${m.height}`;}
   else if(m.type==='error')failed(m.code);
   else if(m.type==='closed')failed();
  };
  let candidates=[];
  socket.onclose=()=>{if(current===generation)failed();};socket.onerror=()=>{if(current===generation)failed();};
  handshakeTimer=setTimeout(()=>{if(current===generation)failed('negotiation-failed');},30000);
 }catch(e){notice(errorText(e));}finally{pending=false;render();}
}
function renderDisplays(){
 const select=$('display-select'), selected=select.value;
 const displays=state?.native?.displays||[];
 const key=JSON.stringify(displays);
 if(select.dataset.inventory===key)return;
 select.dataset.inventory=key;select.replaceChildren(new Option('主显示器','0'));
 for(const d of displays)select.add(new Option(`${d.name} · ${d.width}×${d.height}${d.main?'（主屏）':''}`,String(d.id)));
 select.value=[...select.options].some(o=>o.value===selected)?selected:'0';
}
async function changeCapture(){
 if(pending)return;
 if(ws){await disconnect();if(!pending)await connect();}
}
$('display-select').addEventListener('change',changeCapture);
$('priority-select').addEventListener('change',changeCapture);
const platform=navigator.userAgentData?.platform||navigator.platform||'';
const mappedControl=()=>swapControl($('keyboard-map').value,platform);
const mods=e=>keyModifiers(e,mappedControl());
$('keyboard-map').addEventListener('change',()=>send({type:'release'}));
function local(e){const r=screen.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
function point(e){return view?remotePoint(view,local(e)):{x:0,y:0};}
function renderView(){
 if(view){video.style.width=view.baseWidth+'px';video.style.height=view.baseHeight+'px';video.style.transform=`translate(${view.x}px,${view.y}px) scale(${view.zoom})`;}
 const zoom=view?.zoom||1;$('zoom-value').textContent=Math.round(zoom*100)+'%';
 $('zoom-out').disabled=!active||zoom<=1.001;$('zoom-in').disabled=!active||zoom>=MAX_ZOOM;
 if(view){const actual=video.videoWidth/view.baseWidth;$('view-mode').value=Math.abs(zoom-1)<.001?'fit':Math.abs(zoom-actual)<.001?'actual':'custom';}
}
function layoutView(reset=false){
 const r=screen.getBoundingClientRect();if(!video.videoWidth||!r.width||!r.height)return;
 view=!view||reset?fitView(r.width,r.height,video.videoWidth,video.videoHeight):resizeView(view,r.width,r.height,video.videoWidth,video.videoHeight);renderView();
}
function changeZoom(zoom,anchor){if(!view)return;view=zoomView(view,zoom,anchor);renderView();}
function moveView(dx,dy){if(!view)return;view=panView(view,dx,dy);renderView();}
function pointer(action,e){send({type:'pointer',action,button:e.button===2?2:0,...point(e),...mods(e)});}
function touches(){return [...pointers.values()].filter(p=>p.touch);}
function pair(){const [a,b]=touches();return{center:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},distance:Math.hypot(a.x-b.x,a.y-b.y)};}
video.addEventListener('loadedmetadata',()=>layoutView(true));
video.addEventListener('resize',()=>{layoutView(true);if(video.videoWidth)$('capture-size').textContent=`接收 ${video.videoWidth} × ${video.videoHeight}`;});
new ResizeObserver(()=>layoutView()).observe(screen);
video.addEventListener('pointerdown',e=>{
 if(!active)return;e.preventDefault();video.focus();video.setPointerCapture(e.pointerId);
 pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,touch:e.pointerType==='touch',down:false});
 if(e.pointerType==='touch'){
  if(touches().length===2&&view){const p=pair();gesture={...p,previous:p.center,view:{...view},mode:'pending'};send({type:'release'});}
  return;
 }
 if(!pan){pointer('down',e);pointers.get(e.pointerId).down=true;}
});
video.addEventListener('pointermove',e=>{
 if(!active)return;e.preventDefault();const p=pointers.get(e.pointerId),old=p&&{x:p.x,y:p.y};if(p){p.x=e.clientX;p.y=e.clientY;}
 if(e.pointerType==='touch'){
  if(gesture){
   if(touches().length<2)return;
   const next=pair(),ratio=next.distance/Math.max(1,gesture.distance);
   if(Math.abs(ratio-1)>.035)gesture.mode='zoom';
   else if(gesture.mode==='pending'&&Math.hypot(next.center.x-gesture.center.x,next.center.y-gesture.center.y)>6)gesture.mode=(gesture.view.zoom>1.01||pan)?'pan':'scroll';
   if(gesture.mode==='zoom'){
    const r=screen.getBoundingClientRect();view=zoomView(gesture.view,gesture.view.zoom*ratio,{x:gesture.center.x-r.left,y:gesture.center.y-r.top},{x:next.center.x-r.left,y:next.center.y-r.top});renderView();
   }else if(gesture.mode==='pan'){view=panView(gesture.view,next.center.x-gesture.center.x,next.center.y-gesture.center.y);renderView();}
   else if(gesture.mode==='scroll')send({type:'wheel',dx:gesture.previous.x-next.center.x,dy:gesture.previous.y-next.center.y});
   gesture.previous=next.center;return;
  }
  if(!p)return;
  if(pan){moveView(e.clientX-old.x,e.clientY-old.y);return;}
  if(!p.down&&Math.hypot(e.clientX-p.startX,e.clientY-p.startY)>6){pointer('down',{...e,clientX:p.startX,clientY:p.startY});p.down=true;}
  if(p.down)pointer('move',e);return;
 }
 if(pan){if(old)moveView(e.clientX-old.x,e.clientY-old.y);}else pointer('move',e);
});
for(const kind of ['pointerup','pointercancel'])video.addEventListener(kind,e=>{
 if(!active)return;e.preventDefault();const p=pointers.get(e.pointerId);pointers.delete(e.pointerId);
 if(gesture){if(!touches().length)gesture=null;return;}
 if(kind==='pointercancel'){send({type:'release'});return;}
 if(!pan&&p){if(p.touch&&!p.down)pointer('down',e);pointer('up',e);}
});
video.addEventListener('contextmenu',e=>e.preventDefault());
video.addEventListener('wheel',e=>{
 if(!active)return;e.preventDefault();
 const action=wheelAction(e,{pan,height:screen.getBoundingClientRect().height});
 if(action.type==='zoom')changeZoom((view?.zoom||1)*action.factor,local(e));
 else if(action.type==='pan')moveView(action.dx,action.dy);
 else send(action);
},{passive:false});
for(const kind of ['keydown','keyup'])video.addEventListener(kind,e=>{if(!active)return;const message=keyboardMessage(e,kind==='keydown',mappedControl());if(message){e.preventDefault();send(message);}});
video.addEventListener('blur',()=>{send({type:'release'});pointers.clear();gesture=null;});
$('connect').addEventListener('click',connect);$('disconnect').addEventListener('click',disconnect);$('refresh').addEventListener('click',refresh);
$('setup').addEventListener('click',async()=>{try{await api('setup',{});notice('权限窗口已在 Mac 打开，请在电脑上完成授权后刷新状态。');}catch(e){notice(errorText(e));}});
$('view-mode').addEventListener('change',()=>changeZoom($('view-mode').value==='actual'&&view?video.videoWidth/view.baseWidth:1));
$('zoom-in').addEventListener('click',()=>changeZoom((view?.zoom||1)*1.25));
$('zoom-out').addEventListener('click',()=>changeZoom((view?.zoom||1)/1.25));
$('zoom-reset').addEventListener('click',()=>changeZoom(1));
$('pan').addEventListener('click',()=>{pan=!pan;screen.dataset.pan=String(pan);$('pan').setAttribute('aria-pressed',String(pan));});
if($('remote-page').requestFullscreen){$('fullscreen').hidden=false;$('fullscreen').addEventListener('click',()=>document.fullscreenElement?document.exitFullscreen():$('remote-page').requestFullscreen());}
$('prepare-mobile-link').addEventListener('click',async()=>{const gen=++entryGeneration;$('prepare-mobile-link').disabled=true;try{const value=await api('entry');if(gen!==entryGeneration||document.hidden)return;const url=new URL(value.url);if(url.origin!==base.origin||url.pathname!==new URL('login',base).pathname||url.username||url.password)throw Error();entry=url.href;await QRCode.toCanvas($('mobile-qr'),entry,{width:240,margin:2});if(gen!==entryGeneration||document.hidden)return;$('mobile-qr').hidden=false;$('prepare-mobile-link').hidden=true;$('copy-mobile-link').hidden=false;$('mobile-link-status').textContent='用本人手机或 iPad 扫码登录，也可以复制链接。二维码在本页显示 60 秒。';entryTimer=setTimeout(()=>{clearEntry();$('mobile-link-status').textContent='二维码已收起，需要时可重新准备链接。';},60000);}catch{notice('暂时无法准备手机访问链接。');}finally{$('prepare-mobile-link').disabled=false;}});
$('copy-mobile-link').addEventListener('click',async()=>{if(!entry)return;try{await navigator.clipboard.writeText(entry);clearEntry();$('mobile-link-status').textContent='已复制，请在自己的手机或 iPad 打开。';}catch{notice('复制失败，请重试。');}});
const disposePanels=initPanels(document,{onMobileClose:clearEntry});
window.addEventListener('pagehide',disposePanels,{once:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearEntry();send({type:'release'});}});
window.addEventListener('pagehide',cleanup);
refresh();setInterval(refresh,5000);
