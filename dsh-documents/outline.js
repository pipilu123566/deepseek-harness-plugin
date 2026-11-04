import {markdownLanguage} from '@codemirror/lang-markdown';
import {headingsFromTree} from './outline-core.js';
import workerSource from './outline-worker.js';
export {headingsFromTree,activeHeading} from './outline-core.js';
/** A worker prevents a single huge Markdown block from overrunning the UI time budget. */
export function parseOutline(doc,onResult,{schedule=fn=>setTimeout(fn,16),cancel=clearTimeout,budget=4}={}){
 let stopped=false,timer=null,worker=null,url=null;
 const release=()=>{worker?.terminate();worker=null;if(url){URL.revokeObjectURL(url);url=null;}};
 const fallback=()=>{if(stopped)return;if(doc.length>200000){onResult([],Error('outline-worker-unavailable'));return;}const parser=markdownLanguage.parser.startParse(doc.toString());
  const tick=()=>{timer=null;if(stopped)return;const start=performance.now();do{const tree=parser.advance();if(tree){onResult(headingsFromTree(doc,tree));return;}}while(performance.now()-start<budget);timer=schedule(tick);};timer=schedule(tick);
 };
 timer=schedule(()=>{timer=null;if(stopped)return;try{
  if(typeof Worker!=='function'){fallback();return;}url=URL.createObjectURL(new Blob([workerSource],{type:'text/javascript'}));worker=new Worker(url);
  worker.onmessage=e=>{release();if(!stopped)onResult(e.data.items);};worker.onerror=e=>{e.preventDefault();release();fallback();};worker.postMessage({source:doc.toString()});
 }catch{release();fallback();}});
 return ()=>{stopped=true;if(timer!==null)cancel(timer);release();};
}
