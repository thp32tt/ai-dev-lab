import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ORIGINAL_NEW_GAME_SELECTOR_RECTS,originalNewGameSelectorRect,
 originalNewGameSelectorHit} from '../web/native-new-game-layout.js';
const coordinates=[[56,184],[104,280],[184,56],[280,80],[328,256],[512,168]];
assert.deepEqual(ORIGINAL_NEW_GAME_SELECTOR_RECTS.map(x=>[x.x,x.y]),coordinates);
assert.deepEqual(ORIGINAL_NEW_GAME_SELECTOR_RECTS.map(x=>[x.w,x.h]),coordinates.map(()=>[64,80]));
assert.equal(ORIGINAL_NEW_GAME_SELECTOR_RECTS.length,6);
for(let id=0;id<6;id++){
 const rect=originalNewGameSelectorRect(id);
 assert.equal(rect.id,id);
 assert.ok(Object.isFrozen(rect));
 assert.ok(rect.x>=0&&rect.y>=0&&rect.x+rect.w<=640&&rect.y+rect.h<=400);
 assert.equal(originalNewGameSelectorHit({x:rect.x,y:rect.y}),id);
 assert.equal(originalNewGameSelectorHit({x:rect.x+63,y:rect.y+79}),id);
}
for(const i of [-1,6,'2',null,1.2,NaN])
 assert.equal(originalNewGameSelectorRect(i),null);
for(const p of [null,{}, {x:NaN,y:100}, {x:1,y:Infinity}, {x:639,y:399}])
 assert.equal(originalNewGameSelectorHit(p),null);
const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const point=fs.readFileSync(new URL('../web/native-canvas-pointer.js',import.meta.url),'utf8');
assert.match(app,/originalNewGameSelectorRect\(hero.id\)/);
assert.match(app,/ctx.drawImage\(thumbnail,box.x,box.y,box.w,box.h\)/);
assert.doesNotMatch(app,/const x=106\+col\*165,y=58\+row\*140/);
assert.match(point,/originalNewGameSelectorHit\(point\)/);
assert.doesNotMatch(point,/const x=94\+col\*165,y=53\+row\*140/);
console.log('UW2 actual Korean MAIN 6 selector rectangles, original 64x80 source layout and click parity PASS');
