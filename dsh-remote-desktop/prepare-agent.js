import { readFile, mkdir, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
const run=(cmd,args)=>new Promise((resolve,reject)=>execFile(cmd,args,{timeout:30000,maxBuffer:16384},error=>error?reject(new Error('Native agent verification failed')):resolve()));
export async function prepareAgent({ home=process.env.DSH_HOME||join(homedir(),'.dsh') }={}) {
 const manifest=JSON.parse(await readFile(new URL('./agent/manifest.json',import.meta.url),'utf8'));
 if(!/^[a-f0-9]{64}$/.test(manifest.sha256))throw Error('Invalid native agent manifest');
 const zip=fileURLToPath(new URL('./agent/DeepSeekRemoteAgent.zip',import.meta.url));
 const bytes=await readFile(zip);if(createHash('sha256').update(bytes).digest('hex')!==manifest.sha256)throw Error('Native agent archive mismatch');
 const root=resolve(home,'remote-desktop','native',manifest.sha256.slice(0,20)),app=join(root,'DeepSeek Remote.app');
 const binary=join(app,'Contents/MacOS/DeepSeekRemoteAgent');
 try{await access(binary);}catch{await mkdir(root,{recursive:true,mode:0o700});await run('/usr/bin/ditto',['-x','-k',zip,root]);}
 await run('/usr/bin/codesign',['--verify','--deep','--strict',app]);
 return binary;
}
