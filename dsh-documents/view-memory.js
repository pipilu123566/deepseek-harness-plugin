/** UI metadata only. No note text is written to browser storage. */
export class ViewMemory {
 constructor(storage){this.storage=storage;this.memory={};}
 read(){try{const raw=this.storage?.getItem('pipilu.documents.views.v1'),data=raw?JSON.parse(raw):this.memory;return data&&typeof data==='object'&&!Array.isArray(data)?data:this.memory;}catch{return this.memory;}}
 get(root,file){return this.read()[JSON.stringify([root,file])]?.value;}
 set(root,file,value){const key=JSON.stringify([root,file]),all={...this.read(),[key]:{value,updated:Date.now()}};const entries=Object.entries(all).sort((a,b)=>b[1].updated-a[1].updated).slice(0,200);this.memory=Object.fromEntries(entries);try{this.storage?.setItem('pipilu.documents.views.v1',JSON.stringify(this.memory));}catch{} }
}
