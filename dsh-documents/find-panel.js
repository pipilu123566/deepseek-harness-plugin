import {SearchQuery,getSearchQuery,setSearchQuery,findNext,findPrevious,closeSearchPanel} from '@codemirror/search';
/** Keep the official search engine, with a small current-document-only panel. */
export function createFindPanel(view){
 const en=(document.documentElement.lang||navigator.language||'zh').startsWith('en'),t=(zh,english)=>en?english:zh;
 const dom=document.createElement('div');dom.className='cm-search pdoc-find';
 const input=document.createElement('input');input.className='cm-textfield';input.name='search';input.setAttribute('main-field','true');input.setAttribute('aria-label',t('查找','Find'));input.placeholder=t('查找当前文档','Find in this document');input.value=getSearchQuery(view.state).search;let composing=false;
 const commit=()=>{if(!composing)view.dispatch({effects:setSearchQuery.of(new SearchQuery({search:input.value,literal:true}))});};
 input.addEventListener('input',commit);input.addEventListener('compositionstart',()=>composing=true);input.addEventListener('compositionend',()=>{composing=false;commit();});
 dom.addEventListener('keydown',e=>{if(composing||e.isComposing||e.keyCode===229)return;if(e.key==='Enter'){e.preventDefault();e.stopPropagation();commit();(e.shiftKey?findPrevious:findNext)(view);}else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeSearchPanel(view);view.focus();}});
 dom.append(input);for(const [label,action]of[[t('上一个','Previous'),()=>findPrevious(view)],[t('下一个','Next'),()=>findNext(view)],[t('关闭查找','Close find'),()=>{closeSearchPanel(view);view.focus();}]]){const b=document.createElement('button');b.type='button';b.className='cm-button';b.textContent=label;b.onclick=action;dom.append(b);}
 return {dom,top:true,mount(){input.focus();input.select();},update(){const q=getSearchQuery(view.state);if(!composing&&input.value!==q.search)input.value=q.search;}};
}
