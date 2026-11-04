/** A single undoable edit; never intercept composition or reformat the whole document. */
export function toggleMarkup(view,mark){
 if(view.composing)return false;const s=view.state,r=s.selection.main;if(s.selection.ranges.length!==1)return false;
 const before=s.doc.sliceString(s.doc.lineAt(r.from).from,r.from),after=s.doc.sliceString(r.to,s.doc.lineAt(r.to).to);
 const italicBoundary=mark!=='*'||((before.match(/\*+$/)?.[0].length||0)%2===1&&(after.match(/^\*+/)?.[0].length||0)%2===1);
 const wrap=italicBoundary&&before.endsWith(mark)&&after.startsWith(mark);
 const text=s.doc.sliceString(r.from,r.to);if(wrap)view.dispatch({changes:[{from:r.from-mark.length,to:r.from,insert:''},{from:r.to,to:r.to+mark.length,insert:''}],selection:{anchor:r.from-mark.length,head:r.to-mark.length},annotations:isolateHistory.of('full'),userEvent:'input.format'});
 else view.dispatch({changes:{from:r.from,to:r.to,insert:mark+text+mark},selection:{anchor:r.from+mark.length,head:r.to+mark.length},annotations:isolateHistory.of('full'),userEvent:'input.format'});return true;
}
import {isolateHistory} from '@codemirror/commands';
