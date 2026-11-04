// Same segment grammar as dsh-util-workspace-path; no filesystem resolution here.
export function parseWorkspaceAddress(address){
 try{const prefix='dsh-resource://file/session/';if(typeof address!=='string'||!address.startsWith(prefix))return null;const raw=address.slice(prefix.length).split(/[?#]/,1)[0],parts=raw.split('/'),sessionId=decodeURIComponent(parts.shift());if(!sessionId||!parts.length)return null;const path=parts.map(decodeURIComponent).join('/');if(!path||path.includes('\0'))return null;return {sessionId,path};}catch{return null;}
}
export function workspaceAddress(sessionId,path){return 'dsh-resource://file/session/'+encodeURIComponent(sessionId)+'/'+path.replace(/\\/g,'/').split('/').map(p=>encodeURIComponent(p).replace(/%3A/gi,':')).join('/');}
export const markdownPreviewDefinition=title=>({id:'pipilu-documents/markdown-editor',extensions:['md','markdown'],priority:'extension',title,loading:'renderer',wrap:false});
// randomUUID is absent on ordinary HTTP origins; getRandomValues remains usable.
export function workspaceDraftId(source=globalThis.crypto){return typeof source.randomUUID==='function'?source.randomUUID():Array.from(source.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');}
