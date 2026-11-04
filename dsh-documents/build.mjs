import {build} from 'esbuild';
import {writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
const worker=await build({entryPoints:['outline-worker-source.js'],bundle:true,format:'iife',minify:true,write:false});
await writeFile('outline-worker.js','export default '+JSON.stringify(worker.outputFiles[0].text)+';\n');
await build({entryPoints:['client-source.js'],bundle:true,format:'iife',minifyWhitespace:true,outfile:'client.js'});
const bundle=await build({entryPoints:['capture-native-source.js'],bundle:true,format:'iife',minifyWhitespace:true,write:false});
const nonce=randomBytes(20).toString('hex'),code=bundle.outputFiles[0].text.replace(/<\/script/gi,'<\\/script');
await writeFile('capture.html',`<!doctype html><html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none';script-src 'nonce-${nonce}';style-src 'unsafe-inline';img-src data:;connect-src 'none';base-uri 'none';form-action 'none';frame-src 'none'"><title>DSH 随记</title><style>:root{color-scheme:light dark;--dsw-alias-label-primary:#25252a;--dsw-alias-label-secondary:#74747c;--dsw-alias-background-primary:#fafafa}@media(prefers-color-scheme:dark){:root{--dsw-alias-label-primary:#dedee4;--dsw-alias-label-secondary:#a0a0aa;--dsw-alias-background-primary:#202025}}*{box-sizing:border-box}body{margin:0;background:var(--dsw-alias-background-primary);padding:14px}#capture{height:calc(100dvh - 28px)}</style><div id="capture"></div><script nonce="${nonce}">${code}</script></html>`);
