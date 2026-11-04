export function ancestorDirectories(file){const parts=file.split('/');parts.pop();return parts.map((_,i)=>parts.slice(0,i+1).join('/'));}
export function newEntryPath(parent,name,kind){
 name=name.trim();
 if(!name||name.startsWith('.')||/[\\/\0\r\n]/.test(name)||new TextEncoder().encode(name).length>220)throw Error('invalid-name');
 if(kind==='file'&&!/\.md$/i.test(name))name+='.md';
 return (parent?parent+'/':'')+name;
}
const paths={
 back:['m12 4-6 6 6 6'],forward:['m8 4 6 6-6 6'],
 settings:['M8 2h4l.5 2 1.5.9 2-.5 2 3.4-1.5 1.5v1.7l1.5 1.5-2 3.4-2-.5-1.5.9-.5 2H8l-.5-2-1.5-.9-2 .5-2-3.4L3.5 11V9.3L2 7.8l2-3.4 2 .5 1.5-.9Z','M13 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0'],
 outline:['M8 4h9','M8 10h9','M8 16h9','M3 4h1','M3 10h1','M3 16h1'],
 search:['M13 13l4 4','M14 8A6 6 0 1 1 2 8a6 6 0 0 1 12 0'],
 folder:['M3 7V5a1 1 0 0 1 1-1h4l2 2h6a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z','M3 8h14'],
 note:['M11 3H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6','m9 11 7-7 2 2-7 7-3 1Z'],
 newFolder:['M3 7V5a1 1 0 0 1 1-1h4l2 2h6a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z','M7 11h6','M10 8v6'],
 locate:['M4 3h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z','M3 7h14','M7 10h6','M7 13h4'],
 collapse:['m6 4 4 4 4-4','m6 16 4-4 4 4'],
 expand:['m6 7 4-4 4 4','m6 13 4 4 4-4'],
 chevron:['m7 5 5 5-5 5'],
 panel:['M4 3h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z','M8 3v14'],
 check:['m4 10 4 4 8-8'],close:['m5 5 10 10','m15 5-10 10']
};
export function explorerIcon(React,name){return React.createElement('svg',{viewBox:'0 0 20 20',width:18,height:18,fill:'none',stroke:'currentColor',strokeWidth:1.4,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true,focusable:false},...(paths[name]||paths.folder).map((d,key)=>React.createElement('path',{key,d})));}
