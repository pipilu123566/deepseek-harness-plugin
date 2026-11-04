import {readFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {createEventPump} from './native-event-pump.js';
/** A window and hotkey only. Markdown, input, attachments and draft logic live in capture-view.js. */
export async function createNativeCapture({execute,html,registerHotkey=true}){
 if(process.platform!=='darwin'||process.arch!=='arm64')throw Error('全局随记仅支持 Apple Silicon Mac');
 const {default:koffi}=await import('koffi');
 const libc=koffi.load('/usr/lib/libSystem.B.dylib');if(!libc.func('int pthread_main_np(void)')())throw Error('全局随记需要 DSH Host 主线程');
 const objc=koffi.load('/usr/lib/libobjc.A.dylib'),appkit=koffi.load('/System/Library/Frameworks/AppKit.framework/AppKit'),carbon=koffi.load('/System/Library/Frameworks/Carbon.framework/Carbon'),cf=koffi.load('/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation');koffi.load('/System/Library/Frameworks/WebKit.framework/WebKit');
 const cls=objc.func('void *objc_getClass(const char *)'),sel=objc.func('void *sel_registerName(const char *)'),msg=(r,a=[])=>objc.func('objc_msgSend',r,['void *','void *',...a]);
 const p0=msg('void *'),p1=msg('void *',['void *']),pstr=msg('void *',['str']),v0=msg('void'),v1=msg('void',['void *']),v2=msg('void',['void *','void *']),vb=msg('void',['bool']),vl=msg('void',['long']),b1=msg('bool',['void *']),b0=msg('bool'),l0=msg('long'),utf8=msg('str');
 const text=s=>pstr(cls('NSString'),sel('stringWithUTF8String:'),String(s)),get=(o,s)=>p0(o,sel(s)),send=(o,s,v)=>v1(o,sel(s),v),alloc=n=>get(cls(n),'alloc');
 const point=koffi.struct({x:'double',y:'double'}),size=koffi.struct({width:'double',height:'double'}),rect=koffi.struct({origin:point,size}),hotId=koffi.struct({signature:'uint32_t',id:'uint32_t'}),eventType=koffi.struct({eventClass:'uint32_t',eventKind:'uint32_t'});
 const initWindow=msg('void *',[rect,'ulong','ulong','bool']),initWeb=msg('void *',[rect,'void *']),nextEvent=msg('void *',['ulong','void *','void *','bool']);
 const allocateClass=objc.func('void *objc_allocateClassPair(void *,const char *,size_t)'),registerClass=objc.func('void objc_registerClassPair(void *)'),disposeClass=objc.func('void objc_disposeClassPair(void *)'),addMethod=objc.func('bool class_addMethod(void *,void *,void *,const char *)');
 const getTarget=carbon.func('void *GetApplicationEventTarget(void)'),register=carbon.func('RegisterEventHotKey','int',['uint32_t','uint32_t',hotId,'void *','uint32_t',koffi.out(koffi.pointer('void *'))]),unregister=carbon.func('int UnregisterEventHotKey(void *)'),install=carbon.func('InstallEventHandler','int',['void *','void *','ulong',koffi.pointer(eventType),'void *',koffi.out(koffi.pointer('void *'))]),remove=carbon.func('int RemoveEventHandler(void *)');
 const parameter=carbon.func('GetEventParameter','int',['void *','uint32_t','uint32_t','void *','ulong','void *',koffi.out(koffi.pointer(hotId))]),receive=carbon.func('ReceiveNextEvent','int',['ulong',koffi.pointer(eventType),'double','bool',koffi.out(koffi.pointer('void *'))]),dispatch=carbon.func('int SendEventToEventTarget(void *,void *)'),releaseEvent=carbon.func('void ReleaseEvent(void *)');
 const runLoop=cf.func('int CFRunLoopRunInMode(void *,double,bool)'),mode=koffi.decode(cf.symbol('kCFRunLoopDefaultMode'),'void *');
 const owned=[],callbacks=[],pending=new Set(),uid=randomBytes(4).readUInt32LE(),identity={signature:0x44534443,id:uid},key={eventClass:0x6b657962,eventKind:6};
 let app,panel,web,controller,handlerClass,hotkey=null,eventHandler=null,hotCallback=null,timer=null,disposed=false,disposing=false,pumping=false,interactive=false,originalMenu=null,menu=null,policy=null,picker=null;
 const blockType=koffi.struct({isa:'void *',flags:'int',reserved:'int',invoke:'void *',descriptor:'void *'}),blockDescriptor=koffi.struct({reserved:'ulong',size:'ulong'});
 const copyBlock=libc.func('void *_Block_copy(void *)'),releaseBlock=libc.func('void _Block_release(void *)'),filesCompletion=koffi.proto('DshFilesCompletion_'+uid,'void',['void *','void *']);
 const status={loaded:false,visible:false,hotkeyRegistered:false,hotkeyCount:0,disposed:false,error:null};
 const own=o=>{if(!o)throw Error('Native capture initialization failed');owned.push(o);return o;},make=n=>own(get(alloc(n),'init'));
 const pool=fn=>{const p=get(alloc('NSAutoreleasePool'),'init');try{return fn();}finally{v0(p,sel('drain'));}};
 const evaluate=code=>{if(!disposed&&!disposing&&web)pool(()=>v2(web,sel('evaluateJavaScript:completionHandler:'),text(code),null));};
 function show(){if(disposed||disposing)return;pool(()=>{send(panel,'makeKeyAndOrderFront:',null);vb(app,sel('activateIgnoringOtherApps:'),true);send(panel,'makeFirstResponder:',web);status.visible=true;interactive=true;timer?.wake();evaluate('window.__capture?.editor?.focus()');});}
 function hide(){if(panel)pool(()=>send(panel,'orderOut:',null));status.visible=false;interactive=false;timer?.wake();}
 async function handle(request){
  if(request?.op==='nativeClose'){hide();return {closed:true};}
  if(!['status','captureRead','captureWrite','captureCommit','resolveLink','read','importAttachments'].includes(request?.op))throw Error('invalid-operation');
  if(request.op==='read'){const result=await execute({...request,touch:false});if(result.kind!=='preview'||!result.url?.startsWith('data:image/'))throw Error('invalid-operation');return {url:result.url};}
  return execute(request);
 }
 function stop(){if(hotkey){const e=unregister(hotkey);if(e)throw Error('UnregisterEventHotKey: '+e);hotkey=null;status.hotkeyRegistered=false;}if(eventHandler){const e=remove(eventHandler);if(e)throw Error('RemoveEventHandler: '+e);eventHandler=null;}if(hotCallback&&!eventHandler){koffi.unregister(hotCallback);hotCallback=null;}}
 async function dispose(){if(disposed||disposing)return;disposing=true;if(picker)send(picker,'cancel:',null);hide();stop();await Promise.allSettled([...pending]);if(timer){timer.stop();timer=null;}pool(()=>{
  if(web){send(web,'setUIDelegate:',null);v0(web,sel('stopLoading'));}if(controller)send(controller,'removeScriptMessageHandlerForName:',text('documents'));
  if(panel)v0(panel,sel('close'));
  if(app&&menu&&get(app,'mainMenu')===menu)send(app,'setMainMenu:',originalMenu);
  if(app&&policy!==null)vl(app,sel('setActivationPolicy:'),policy);
  for(const o of owned.reverse())v0(o,sel('release'));if(originalMenu)v0(originalMenu,sel('release'));
  for(const cb of callbacks)koffi.unregister(cb);callbacks.length=0;if(handlerClass)disposeClass(handlerClass);
  panel=web=controller=null;
 });disposed=true;status.loaded=false;status.disposed=true;}
 try{pool(()=>{
  app=get(cls('NSApplication'),'sharedApplication');policy=l0(app,sel('activationPolicy'));vl(app,sel('setActivationPolicy:'),1);
  originalMenu=get(app,'mainMenu');if(originalMenu)get(originalMenu,'retain');
  menu=make('NSMenu');const item=make('NSMenuItem'),edit=make('NSMenu');send(item,'setSubmenu:',edit);send(menu,'addItem:',item);send(edit,'setTitle:',text('编辑'));
  const initItem=msg('void *',['void *','void *','void *']);for(const [name,action,key]of[['剪切','cut:','x'],['复制','copy:','c'],['粘贴','paste:','v'],['全选','selectAll:','a'],['撤销','undo:','z']]){const i=own(initItem(alloc('NSMenuItem'),sel('initWithTitle:action:keyEquivalent:'),text(name),sel(action),text(key)));vl(i,sel('setKeyEquivalentModifierMask:'),1<<20);send(edit,'addItem:',i);}send(app,'setMainMenu:',menu);v0(app,sel('finishLaunching'));
  panel=own(initWindow(alloc('NSPanel'),sel('initWithContentRect:styleMask:backing:defer:'),{origin:{x:0,y:0},size:{width:760,height:540}},1|2|8,2,false));send(panel,'setTitle:',text('DSH 随记'));vb(panel,sel('setReleasedWhenClosed:'),false);vb(panel,sel('setHidesOnDeactivate:'),false);vb(panel,sel('setFloatingPanel:'),true);vl(panel,sel('setLevel:'),3);vl(panel,sel('setCollectionBehavior:'),1|(1<<8));v0(panel,sel('center'));
  const configuration=make('WKWebViewConfiguration');send(configuration,'setWebsiteDataStore:',get(cls('WKWebsiteDataStore'),'nonPersistentDataStore'));controller=get(configuration,'userContentController');
  handlerClass=allocateClass(cls('NSObject'),'DshDocumentsMessages_'+uid,0);if(!handlerClass)throw Error('WK handler class unavailable');
  const proto=koffi.proto('DshDocumentsWK_'+uid,'void',['void *','void *','void *','void *']);
  const callback=koffi.register((_self,_cmd,_controller,message)=>{if(disposed||disposing)return;try{
   const body=get(message,'body');if(!b1(body,sel('isKindOfClass:'),cls('NSString')))return;const raw=utf8(body,sel('UTF8String')),packet=JSON.parse(raw);if(!Number.isSafeInteger(packet.id))return;
   const task=Promise.resolve().then(()=>handle(packet.request)).then(data=>evaluate('window.__reply('+JSON.stringify({id:packet.id,ok:true,data})+')'),e=>evaluate('window.__reply('+JSON.stringify({id:packet.id,ok:false,error:e.code||'io-error'})+')')).finally(()=>pending.delete(task));pending.add(task);
  }catch{/* A malformed bridge message never escapes into native code. */}},koffi.pointer(proto));callbacks.push(callback);
  if(!addMethod(handlerClass,sel('userContentController:didReceiveScriptMessage:'),callback,'v@:@@'))throw Error('WK handler registration failed');const openPanelProto=koffi.proto('DshDocumentsFilePanel_'+uid,'void',['void *','void *','void *','void *','void *','void *']);
  const openPanelCallback=koffi.register((_self,_cmd,_web,parameters,_frame,completion)=>{
   if(picker||disposing||disposed){koffi.call(koffi.decode(completion,blockType).invoke,filesCompletion,completion,null);return;}
   const copied=copyBlock(completion),dialog=get(cls('NSOpenPanel'),'openPanel');get(dialog,'retain');picker=dialog;
   vb(dialog,sel('setCanChooseFiles:'),true);vb(dialog,sel('setCanChooseDirectories:'),false);vb(dialog,sel('setAllowsMultipleSelection:'),b0(parameters,sel('allowsMultipleSelection')));
   let finish;const waiting=new Promise(resolve=>finish=resolve);pending.add(waiting);
   const responseProto=koffi.proto('DshDocumentsFileResponse_'+uid+'_'+randomBytes(4).toString('hex'),'void',['void *','long']);
   const descriptor=koffi.alloc(blockDescriptor,1),block=koffi.alloc(blockType,1);
   const response=koffi.register((_block,result)=>{
    try{pool(()=>{koffi.call(koffi.decode(copied,blockType).invoke,filesCompletion,copied,result===1?get(dialog,'URLs'):null);releaseBlock(copied);v0(dialog,sel('release'));});}
    finally{picker=null;queueMicrotask(()=>{koffi.unregister(response);koffi.free(block);koffi.free(descriptor);pending.delete(waiting);finish();});}
   },koffi.pointer(responseProto));
   koffi.encode(descriptor,blockDescriptor,{reserved:0,size:koffi.sizeof(blockType)});
   koffi.encode(block,blockType,{isa:libc.symbol('_NSConcreteGlobalBlock'),flags:1<<28,reserved:0,invoke:response,descriptor});
   v2(dialog,sel('beginSheetModalForWindow:completionHandler:'),panel,block);
  },koffi.pointer(openPanelProto));callbacks.push(openPanelCallback);
  if(!addMethod(handlerClass,sel('webView:runOpenPanelWithParameters:initiatedByFrame:completionHandler:'),openPanelCallback,'v@:@@@@'))throw Error('WK file panel registration failed');
  registerClass(handlerClass);const handler=own(get(p0(handlerClass,sel('alloc')),'init'));v2(controller,sel('addScriptMessageHandler:name:'),handler,text('documents'));
  web=own(initWeb(alloc('WKWebView'),sel('initWithFrame:configuration:'),{origin:{x:0,y:0},size:{width:760,height:540}},configuration));send(web,'setUIDelegate:',handler);vl(web,sel('setAutoresizingMask:'),2|16);send(get(panel,'contentView'),'addSubview:',web);v2(web,sel('loadHTMLString:baseURL:'),text(html),null);
 });
 if(registerHotkey){const proto=koffi.proto('DshDocumentsHotkey_'+uid,'int',['void *','void *','void *']);hotCallback=koffi.register((_next,event)=>{try{const id={};if(parameter(event,0x2d2d2d2d,0x686b6964,null,koffi.sizeof(hotId),null,id)!==0||id.signature!==identity.signature||id.id!==uid)return -9874;status.hotkeyCount++;show();return 0;}catch{return -9874;}},koffi.pointer(proto));let out=[null];if(install(getTarget(),hotCallback,1,key,null,out))throw Error('全局快捷键注册失败');eventHandler=out[0];out=[null];if(register(49,2048,identity,getTarget(),1,out))throw Error('⌥ Space 已被占用，请先停用旧速记插件');hotkey=out[0];status.hotkeyRegistered=true;}
 timer=createEventPump(()=>{if(pumping||disposed||disposing&&!picker)return;pumping=true;try{pool(()=>{for(let n=0;n<8;n++){const out=[null];if(receive(1,key,0,true,out)||!out[0])break;try{dispatch(out[0],getTarget());}finally{releaseEvent(out[0]);}}runLoop(mode,0,true);for(let n=0;n<24;n++){const event=nextEvent(app,sel('nextEventMatchingMask:untilDate:inMode:dequeue:'),0xffffffffffffffffn,get(cls('NSDate'),'distantPast'),mode,true);if(!event)break;send(app,'sendEvent:',event);}v0(app,sel('updateWindows'));status.visible=b0(panel,sel('isVisible'));interactive=status.visible&&b0(panel,sel('isKeyWindow'));});}catch(e){status.error=String(e.message);}finally{pumping=false;}},{active:()=>interactive||!!picker});status.loaded=true;
 return {show,hide,dispose,status:()=>({...status}),evaluate};
 }catch(e){await dispose();throw e;}
}
export function captureHTML(){return readFileSync(new URL('./capture.html',import.meta.url),'utf8');}
