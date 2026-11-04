/** Decode the path and fragment separately: %23 in a filename is not an anchor. */
export function splitDocumentLink(value){
 const target=value.replace(/^<|>$/g,''),hash=target.indexOf('#');
 return {path:decodeURIComponent(hash<0?target:target.slice(0,hash)),fragment:hash<0?null:decodeURIComponent(target.slice(hash+1))};
}
const titleKey=value=>value.normalize('NFC').replace(/\\([\\`*_[\]{}()#+.!|>~-])/g,'$1').replace(/\[\[([^\]]+)\]\]/g,(_a,b)=>b.split('|').at(-1)).replace(/!?\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/<[^>]*>/g,'').replace(/(`+)([^`]+)\1/g,'$2').replace(/(\*\*|__|~~|==)(.+?)\1/g,'$2').replace(/\*([^*]+)\*/g,'$1').replace(/(^|\W)_([^_]+)_(?=\W|$)/g,'$1$2').trim().replace(/\s+/g,' ').toLocaleLowerCase();
/** First match in document order; chained # fragments constrain parent headings. */
export function headingForFragment(items,fragment){
 if(fragment==='')return 0;if(fragment.startsWith('^'))return null;
 const literal=fragment.includes('#')?items.find(item=>item.text.normalize('NFC').trim().toLocaleLowerCase()===fragment.normalize('NFC').trim().toLocaleLowerCase()):null;if(literal)return literal.from;
 const wanted=fragment.split('#').map(titleKey),byPosition=new Map(items.map(x=>[x.from,x]));
 for(const item of items){if(titleKey(item.text)!==wanted.at(-1))continue;let parent=item.parent,remaining=wanted.length-2;
  while(remaining>=0&&parent!==null){const p=byPosition.get(parent);if(!p)break;if(titleKey(p.text)===wanted[remaining])remaining--;parent=p.parent;}
  if(remaining<0)return item.from;
 }return null;
}
const copy=x=>x?{root:x.root,path:x.path,position:x.position?{...x.position}:undefined}:null;
const same=(a,b)=>a&&b&&a.root===b.root&&a.path===b.path&&a.position?.anchor===b.position?.anchor&&a.position?.head===b.position?.head;
/** Session-local metadata only. Failed navigation never consumes a history entry. */
export class DocumentHistory {
 constructor(limit=50){this.limit=limit;this.entries=[];this.index=-1;}
 clear(){this.entries=[];this.index=-1;}
 get canBack(){return this.index>0;}get canForward(){return this.index+1<this.entries.length;}
 target(delta){return copy(this.entries[this.index+delta]);}
 visit(from,to){
  if(from){if(this.index<0)this.entries.push(copy(from)),this.index=0;else this.entries[this.index]=copy(from);}
  if(same(this.entries[this.index],to))return;
  this.entries=this.entries.slice(0,this.index+1);this.entries.push(copy(to));if(this.entries.length>this.limit)this.entries.shift();this.index=this.entries.length-1;
 }
 move(delta,from){if(!this.target(delta))return false;if(from)this.entries[this.index]=copy(from);this.index+=delta;return true;}
}
