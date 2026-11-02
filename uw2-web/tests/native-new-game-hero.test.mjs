import assert from 'node:assert/strict';
import fs from 'node:fs';
import {originalMainHeroPersonAddress,originalSavedHeroPersonOffset,
 isOriginalSavedHeroOwner} from '../web/native-original-hero-record.js';
import {nativeNewGameHeroChoices,nativeNewGameSourceDemo,
 NATIVE_NEW_GAME_HERO_COUNT} from '../web/native-new-game-hero.js';
const slots=Array.from({length:10},(_,i)=>({index:i,empty:true}));
slots[1]={index:1,empty:false,heroId:3,heroName:'source three',
 raw:{page:33340,personBase:originalSavedHeroPersonOffset(1,3)}};
slots[2]={index:2,empty:false,heroId:0,heroName:'source zero',
 raw:{page:66680,personBase:originalSavedHeroPersonOffset(2,0)}};
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
assert.deepEqual(Array.from({length:6},(_,id)=>originalMainHeroPersonAddress(id)),
 [0x1242,0x1274,0x12a6,0x12d8,0x130a,0x133c]);
for(let id=0;id<6;id++)for(let index=0;index<10;index++){
 const expected=index*33340+0x06a9+50*id;
 assert.equal(originalSavedHeroPersonOffset(index,id),expected);
 assert.equal(isOriginalSavedHeroOwner({index,heroId:id,
  raw:{page:index*33340,personBase:expected}}),true);
}
for(const id of [-1,6,255,'2',null,Infinity,1.5]){
 assert.equal(originalMainHeroPersonAddress(id),null);
 assert.equal(originalSavedHeroPersonOffset(0,id),null);
}
const moved=structuredClone(slots);
moved[1].raw.personBase+=50;
assert.equal(nativeNewGameSourceDemo(heroes,3,moved).allowed,false);
assert.equal(nativeNewGameHeroChoices(moved)[3].sourceSlot,null);
const swapped=structuredClone(slots);
swapped[1].raw.page=0;
assert.equal(nativeNewGameSourceDemo(heroes,3,swapped).allowed,false);
const invalid=structuredClone(slots);
invalid[1].unverified=true;
assert.equal(nativeNewGameHeroChoices(invalid)[3].sourceSlot,null);
const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const controller=fs.readFileSync(new URL('../web/web-controller.js',import.meta.url),'utf8');
assert.match(app,/systemUi\.cursor === 1\) \{\s*enterNativeNewGameSelect\(\)/);
assert.match(app,/viewMode==="new-game-select"/);
assert.match(app,/nativeNewGameSourceDemo\(/);
assert.match(app,/drawIndexedCanvas\(thumbnail,img,box.w,box.h,1\)/);
assert.match(app,/originalNewGameSelectorRect\(hero.id\)/);
assert.match(app,/selectLoadedSlot\(demo\.slotIndex\)/);
assert.match(app,/실제 Start New Game 초기화는 미구현/);
assert.match(controller,/new-game-select/);
assert.match(controller,/emitKey\("Enter"\)/);
console.log('UW2 live Start New Game: six original portraits, real menu navigation, exact-source save-only playable demo; unproven fresh initialization stays HOLD PASS');
