import {TypertRemoteService,Remote} from '@deepseek-ai/dsh-typert-protocol';
import os from 'node:os';
import path from 'node:path';
import {Library} from './library.js';
import {WorkspaceDocuments,workspaceError} from './workspace-documents.js';
const initializers=[];
export default class DocumentsService extends TypertRemoteService {
 static inject=['fs','sessions','sandboxPolicy'];
 constructor(ctx){
  super(ctx,'pipiluDocuments',{namespace:'pipiluDocuments'});for(const init of initializers)init.call(this);
  this.library=new Library(path.join(process.env.DSH_HOME||path.join(os.homedir(),'.dsh'),'document-library'));
  this.workspace=new WorkspaceDocuments(ctx,this.library.stateDir);
  this.native=null;this.nativeState={supported:process.platform==='darwin'&&process.arch==='arm64',loaded:false};this.stopped=false;this.nativeQueue=Promise.resolve();
  ctx.effect(()=>{this.library.ready.then(()=>this.syncNative()).catch(()=>{});return async()=>{this.stopped=true;this.workspace.stop();await this.workspace.drafts;await this.nativeQueue;await this.native?.dispose();this.native=null;};});
 }
 syncNative(){this.nativeQueue=this.nativeQueue.then(async()=>{
  if(this.stopped)return;
  if(!this.library.state.globalCapture){await this.native?.dispose();this.native=null;this.nativeState={...this.nativeState,loaded:false,error:null};return;}
  if(this.native)return;
  if(!this.nativeState.supported){this.nativeState.error='全局随记仅支持 Apple Silicon Mac；请使用文档库内的随记入口。';return;}
  try{const {createNativeCapture,captureHTML}=await import('./native-capture.js');this.native=await createNativeCapture({html:captureHTML(),execute:a=>this.library.execute(a)});this.nativeState={supported:true,...this.native.status()};}
  catch(e){this.nativeState={supported:true,loaded:false,error:String(e.message||e)};}
 });return this.nativeQueue;}
 async execute(request){try{const data=await (request?.op?.startsWith('workspace')?this.workspace.execute(request):this.library.execute(request));if(request.op==='configure')await this.syncNative();return {ok:true,data:['status','configure'].includes(request.op)?{...data,native:{...this.nativeState,...this.native?.status()}}:data};}catch(e){return {ok:false,error:workspaceError(e)};}}
}
Remote(DocumentsService.prototype.execute,{kind:'method',name:'execute',static:false,private:false,addInitializer:init=>initializers.push(init)});
