/** The same Markdown grammar as the editor; positions distinguish duplicate titles. */
export function headingsFromTree(doc,tree){
 const source=doc.line(1).text==='---'?doc.toString():'',front=/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.exec(source),end=front?.[0].length||0,items=[],stack=[];
 tree.iterate({enter(n){if(['FencedCode','CodeBlock','HTMLBlock'].includes(n.name))return false;
  if(!/^(ATX|Setext)Heading[1-6]$/.test(n.name)||n.node.parent?.name!=='Document'||n.from<end)return;
  const level=Number(n.name.at(-1)),line=doc.lineAt(n.from),text=line.text.replace(/^ {0,3}#{1,6}(?:[ \t]+|$)/,'').replace(/[ \t]+#+[ \t]*$/,'').trim();
  while(stack.length&&stack.at(-1).level>=level)stack.pop();const item={from:line.from,to:n.to,level,depth:stack.length,text:text||'…',parent:stack.at(-1)?.from??null};items.push(item);stack.push(item);
 }});return items;
}
export function activeHeading(items,pos){let lo=0,hi=items.length;while(lo<hi){const mid=(lo+hi)>>1;if(items[mid].from<=pos)lo=mid+1;else hi=mid;}return items[lo-1]?.from??null;}
