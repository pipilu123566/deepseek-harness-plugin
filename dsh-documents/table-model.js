const pipes=line=>{const result=[];for(let i=0;i<line.length;i++){if(line[i]!=='|')continue;let slash=0;for(let j=i-1;j>=0&&line[j]==='\\';j--)slash++;if(slash%2===0)result.push(i);}return result;};
export function splitTableRow(line,offset=0){
 const delimiters=pipes(line);if(!delimiters.length)return null;const edges=[-1,...delimiters,line.length],cells=[];
 for(let i=0;i<edges.length-1;i++){const from=edges[i]+1,to=edges[i+1];if((i===0||i===edges.length-2)&&!line.slice(from,to).trim())continue;const raw=line.slice(from,to),left=raw.length-raw.trimStart().length,right=raw.length-raw.trimEnd().length;cells.push({from:offset+from+left,to:offset+Math.max(from+left,to-right),text:raw.trim()});}return cells;
}
export const displayCell=text=>text.replace(/(\\+)\|/g,(_all,slashes)=>'\\'.repeat(Math.floor(slashes.length/2))+'|');
export const sourceCell=text=>text.replace(/\r?\n/g,'<br>').replace(/(\\*)\|/g,(_all,slashes)=>slashes+slashes+'\\|');
export function parseTable(text){
 if(text.length>200000)return null;const lines=text.split('\n');if(lines.length<2||lines.length>1002)return null;const parsed=[];let offset=0;
 for(const line of lines){const cells=splitTableRow(line,offset);if(!cells)return null;parsed.push({from:offset,to:offset+line.length,cells});offset+=line.length+1;}
 const columns=parsed[0].cells.length;if(!columns||columns>50||columns*(parsed.length-1)>5000||parsed[1].cells.length!==columns||!parsed[1].cells.every(c=>/^:?-{2,}:?$/.test(c.text))||parsed.some(r=>r.cells.length>columns))return null;
 return {text,columns,separator:parsed[1],rows:[parsed[0],...parsed.slice(2)]};
}
export function tableCellChange(model,row,column,text){
 const record=model.rows[row];if(!record||column<0||column>=model.columns)throw Error('invalid-table-cell');const cell=record.cells[column];
 if(cell)return {from:cell.from,to:cell.to,insert:sourceCell(text)};
 const values=Array.from({length:model.columns},(_,i)=>record.cells[i]?.text||'');values[column]=sourceCell(text);return {from:record.from,to:record.to,insert:'| '+values.join(' | ')+' |'};
}
export function tableStructure(model,row,column,action){
 const values=model.rows.map(r=>Array.from({length:model.columns},(_,c)=>r.cells[c]?.text||'')),align=model.separator.cells.map(c=>c.text);let nextRow=row,nextCol=column;
 if(action==='addRow'){values.splice(row+1,0,Array(model.columns).fill(''));nextRow=row+1;}
 else if(action==='deleteRow'){if(row===0||values.length<2)return null;values.splice(row,1);nextRow=Math.min(row,values.length-1);}
 else if(action==='addColumn'){for(const r of values)r.splice(column+1,0,'');align.splice(column+1,0,'---');nextCol=column+1;}
 else if(action==='deleteColumn'){if(model.columns===1)return null;for(const r of values)r.splice(column,1);align.splice(column,1);nextCol=Math.min(column,align.length-1);}
 else return null;
 const line=r=>'| '+r.join(' | ')+' |';return {text:[line(values[0]),line(align),...values.slice(1).map(line)].join('\n'),row:nextRow,column:nextCol};
}
