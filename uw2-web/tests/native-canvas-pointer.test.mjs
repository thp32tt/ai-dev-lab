import assert from 'node:assert/strict';
import fs from 'node:fs';
import {nativeCanvasPointerPoint,nativeSystemMenuPointerHit,
 nativeLoadSlotPointerHit,nativeNewGameHeroPointerHit} from '../web/native-canvas-pointer.js';

const canvas={width:640,height:400,clientLeft:2,clientTop:2,
 clientWidth:800,clientHeight:500,
 getBoundingClientRect(){return {left:90,top:40,width:804,height:504};}};
assert.deepEqual(nativeCanvasPointerPoint({clientX:90+2+200,clientY:40+2+100},canvas),{x:160,y:80});
assert.equal(nativeCanvasPointerPoint({clientX:90+1,clientY:42},canvas),null);
assert.equal(nativeCanvasPointerPoint({clientX:892,clientY:542},canvas),null);
assert.equal(nativeCanvasPointerPoint({clientX:NaN,clientY:150},canvas),null);
assert.equal(nativeCanvasPointerPoint({},canvas),null);
for(let i=0;i<5;i++)
 assert.equal(nativeSystemMenuPointerHit({x:220,y:48+i*16+8},5),i);
assert.equal(nativeSystemMenuPointerHit({x:220,y:48+16+8},2),1);
assert.equal(nativeSystemMenuPointerHit({x:220,y:48+16+8},1),null);
assert.equal(nativeSystemMenuPointerHit({x:100,y:72}),null);
assert.equal(nativeSystemMenuPointerHit({x:220,y:135}),null);
for(let i=0;i<10;i++)
 assert.equal(nativeLoadSlotPointerHit({x:300,y:96+i*16+8}),i);
assert.equal(nativeLoadSlotPointerHit({x:300,y:256}),null);
const points=[[56,184],[104,280],[184,56],[280,80],[328,256],[512,168]];
for(let id=0;id<6;id++){
 const [x,y]=points[id];
 assert.equal(nativeNewGameHeroPointerHit({x,y}),id);
 assert.equal(nativeNewGameHeroPointerHit({x:x+63.99,y:y+79.99}),id);
 // Selector regions are exactly original 64x80; labels do not add a hit area.
 assert.notEqual(nativeNewGameHeroPointerHit({x:x+64,y:y+79}),id);
 assert.notEqual(nativeNewGameHeroPointerHit({x:x+63,y:y+80}),id);
}
assert.equal(nativeNewGameHeroPointerHit({x:10,y:20}),null);
assert.equal(nativeNewGameHeroPointerHit({x:110,y:360}),null);
assert.equal(nativeNewGameHeroPointerHit({x:106,y:58}),null);
const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
assert.match(app,/from "\.\/native-canvas-pointer\.js"/);
assert.match(app,/canvas\.addEventListener\("click",\s*event\s*=>/);
assert.match(app,/nativeSystemMenuPointerHit\(point,\s*menuDefs\[ORIGINAL_SYSTEM_MENU_INDEX\]\?\.options\?\.length/);
assert.match(app,/handleSystemKey\(\{key:"Enter",preventDefault\(\)\{\}\}\)/);
assert.match(app,/nativeNewGameHeroPointerHit\(point\)/);
assert.match(app,/newGameHeroCursor=hit;\s*newGameHeroNotice="";\s*handleSystemKey\(\{key:"Enter",preventDefault\(\)\{\}\}\)/);
assert.doesNotMatch(app,/if\(hit===newGameHeroCursor\)/);
assert.match(app,/nativeLoadSlotPointerHit\(point\)/);
console.log('UW2 native pointer scaled canvas / original menu / six heroes / 10 save rows PASS');
