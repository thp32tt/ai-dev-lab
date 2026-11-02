import assert from 'node:assert/strict';
import fs from 'node:fs';
import {nativeNewGameHeroChoices,nativeNewGameSourceDemo,
 NATIVE_NEW_GAME_HERO_COUNT} from '../web/native-new-game-hero.js';
const slots=Array.from({length:10},(_,i)=>({index:i,empty:true}));
slots[1]={index:1,empty:false,heroId:3,heroName:'source three'};
slots[2]={index:2,empty:false,heroId:0,heroName:'source zero'};
const heroes=nativeNewGameHeroChoices(slots);
assert.equal(NATIVE_NEW_GAME_HERO_COUNT,6);
assert.equal(heroes.length,6);
assert.deepEqual(heroes.map(h=>h.portraitRecord),[0,1,2,3,4,5]);
assert.equal(heroes[0].label,'source zero');
assert.equal(heroes[3].label,'source three');
assert.equal(heroes[3].sourceSlot,1);
assert.equal(heroes[5].sourceSlot,null);
assert.ok(heroes.every(h=>h.originalNewGameReady===false));
assert.deepEqual(nativeNewGameSourceDemo(heroes,3,slots),{
 allowed:true,slotIndex:1,source:'EXISTING_KOREAN_SAVE_SNAPSHOT__NOT_NEW_GAME'
});
for(const id of [-1,6,2,null,'3']){
 assert.equal(nativeNewGameSourceDemo(heroes,id,slots).allowed,false);
}
const tampered=structuredClone(slots);
tampered[1].heroId=0;
assert.equal(nativeNewGameSourceDemo(heroes,3,tampered).allowed,false);
assert.equal(slots[1].heroId,3);
const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const controller=fs.readFileSync(new URL('../web/web-controller.js',import.meta.url),'utf8');
assert.match(app,/systemUi\.cursor === 1\) \{\s*enterNativeNewGameSelect\(\)/);
assert.match(app,/viewMode==="new-game-select"/);
assert.match(app,/nativeNewGameSourceDemo\(/);
assert.match(app,/drawIndexedCanvas\(thumbnail,img,64,80,1\)/);
assert.match(app,/selectLoadedSlot\(demo\.slotIndex\)/);
assert.match(app,/실제 Start New Game 초기화는 미구현/);
assert.match(controller,/new-game-select/);
assert.match(controller,/emitKey\("Enter"\)/);
console.log('UW2 live Start New Game: six original portraits, real menu navigation, exact-source save-only playable demo; unproven fresh initialization stays HOLD PASS');
