const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export const MAX_ZOOM=8;
function constrain(v){
 const w=v.baseWidth*v.zoom,h=v.baseHeight*v.zoom;
 return {...v,x:w<=v.width?(v.width-w)/2:clamp(v.x,v.width-w,0),y:h<=v.height?(v.height-h)/2:clamp(v.y,v.height-h,0)};
}
export function fitView(width,height,mediaWidth,mediaHeight){
 const scale=Math.min(width/mediaWidth,height/mediaHeight);
 return constrain({width,height,baseWidth:mediaWidth*scale,baseHeight:mediaHeight*scale,zoom:1,x:0,y:0});
}
export function remotePoint(v,p){return {x:clamp((p.x-v.x)/(v.baseWidth*v.zoom),0,1),y:clamp((p.y-v.y)/(v.baseHeight*v.zoom),0,1)};}
export function zoomView(v,zoom,anchor={x:v.width/2,y:v.height/2},destination=anchor){
 const image=remotePoint(v,anchor),z=clamp(zoom,1,MAX_ZOOM);
 return constrain({...v,zoom:z,x:destination.x-image.x*v.baseWidth*z,y:destination.y-image.y*v.baseHeight*z});
}
export function panView(v,dx,dy){return constrain({...v,x:v.x+dx,y:v.y+dy});}
export function resizeView(v,width,height,mediaWidth,mediaHeight){
 const image=remotePoint(v,{x:v.width/2,y:v.height/2}),next=fitView(width,height,mediaWidth,mediaHeight);
 return constrain({...next,zoom:v.zoom,x:width/2-image.x*next.baseWidth*v.zoom,y:height/2-image.y*next.baseHeight*v.zoom});
}
