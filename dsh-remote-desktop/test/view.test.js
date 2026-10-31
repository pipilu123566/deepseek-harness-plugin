import test from 'node:test';
import assert from 'node:assert/strict';
import {fitView,zoomView,panView,resizeView,remotePoint,MAX_ZOOM} from '../web/view.js';
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
test('phone pinch keeps the desktop point under the moving fingers',()=>{
 const fit=fitView(360,400,1920,1080);
 near(fit.baseHeight,202.5);near(fit.y,98.75);
 const zoomed=zoomView(fit,3,{x:180,y:200},{x:160,y:220});
 assert.deepEqual(remotePoint(zoomed,{x:160,y:220}),{x:.5,y:.5});
 near(zoomed.zoom,3);near(zoomed.baseWidth*zoomed.zoom,1080);
});
test('panning stays within the enlarged desktop and fit resets both offsets',()=>{
 const fit=fitView(360,400,1920,1080),zoomed=zoomView(fit,3);
 const bottom=panView(zoomed,-10000,-10000);near(bottom.x,-720);near(bottom.y,-207.5);
 const top=panView(bottom,10000,10000);near(top.x,0);near(top.y,0);
 const reset=zoomView(bottom,1);near(reset.x,0);near(reset.y,98.75);
});
test('rotation retains magnification and the desktop center where bounds allow',()=>{
 const portrait=zoomView(fitView(360,400,1920,1080),4);
 const landscape=resizeView(portrait,700,300,1920,1080);
 near(landscape.zoom,4);assert.deepEqual(remotePoint(landscape,{x:350,y:150}),{x:.5,y:.5});
 assert.equal(zoomView(landscape,100).zoom,MAX_ZOOM);assert.equal(zoomView(landscape,.1).zoom,1);
});
test('remote clicks after zoom and pan map to the original desktop coordinates',()=>{
 const view=panView(zoomView(fitView(360,400,1920,1080),4),45,-25);
 const desktop={x:.62,y:.4};
 const finger={x:view.x+desktop.x*view.baseWidth*view.zoom,y:view.y+desktop.y*view.baseHeight*view.zoom};
 const actual=remotePoint(view,finger);near(actual.x,desktop.x);near(actual.y,desktop.y);
});
