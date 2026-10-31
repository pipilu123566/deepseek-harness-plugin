import { TypertRemoteService, Remote } from '@deepseek-ai/dsh-typert-protocol';
import os from 'node:os';
import path from 'node:path';
import { Library } from './library.js';
const initializers=[];
export default class DocumentsService extends TypertRemoteService {
 constructor(ctx){super(ctx,'pipiluDocuments',{namespace:'pipiluDocuments'});for(const init of initializers)init.call(this);this.library=new Library(path.join(process.env.DSH_HOME||path.join(os.homedir(),'.dsh'),'document-library'));}
 async execute(request){try{return {ok:true,data:await this.library.execute(request)};}catch(e){return {ok:false,error:e.code||'io-error'};}}
}
Remote(DocumentsService.prototype.execute,{kind:'method',name:'execute',static:false,private:false,addInitializer:init=>initializers.push(init)});
