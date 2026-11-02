import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SAVE} from '../web/binary.js';
import {originalSavedHeroPersonOffset} from '../web/native-original-hero-record.js';
import {originalKoreanHeroRoster} from '../web/native-original-hero-roster.js';
import {nativeNewGameHeroChoices,nativeNewGameSourceDemo}
 from '../web/native-new-game-hero.js';

// Plain ASCII is a valid strict subset of the owner's EUC-KR name field
// encoding. No Korean DOS assets or fixed copyrighted names in Git.
const pages=Buffer.alloc(SAVE.PAGE_SIZE*10,0xff);
function putName(page,id,first,last){
 const pos=originalSavedHeroPersonOffset(page,id);
 pages.fill(0,pos,pos+26);
 Buffer.from(first,'ascii').copy(pages,pos,0,12);
 Buffer.from(last,'ascii').copy(pages,pos+13,0,12);
}
for(let p=0;p<10;p++)for(let id=0;id<6;id++)
 putName(p,id,'Hero'+id,'Family'+id);
let names=originalKoreanHeroRoster(pages);
assert.deepEqual(names,Array.from({length:6},(_,id)=>'Hero'+id+' Family'+id));
assert.equal(Object.isFrozen(names),true);
const slots=Array.from({length:10},(_,index)=>({index,empty:true,memo:''}));
const heroes=nativeNewGameHeroChoices(slots,names);
assert.deepEqual(heroes.map(x=>x.label),names);
assert.ok(heroes.every(x=>x.sourceSlot===null&&!x.originalNewGameReady));
assert.equal(nativeNewGameSourceDemo(heroes,4,slots).allowed,false);
// A changed save person's name must not silently become a canonical
// six-hero selector name on unoccupied or unrelated pages.
putName(4,2,'Changed','Name');
names=originalKoreanHeroRoster(pages);
assert.equal(names[2],null);
assert.equal(names[1],'Hero1 Family1');
assert.equal(nativeNewGameHeroChoices(slots,names)[2].label,'원본 주인공 3');
putName(4,2,'Hero2','Family2');
// A corrupt EUC-KR name is rejected independently per original hero.
const off=originalSavedHeroPersonOffset(3,5);
pages[off]=0xff;pages[off+1]=0x00;
assert.equal(originalKoreanHeroRoster(pages)[5],null);
putName(3,5,'Hero5','Family5');
// Strict source buffer type/ten-page range.
assert.throws(()=>originalKoreanHeroRoster([]),/verified Korean save/);
assert.throws(()=>originalKoreanHeroRoster(pages.subarray(0,-1)),/verified Korean save/);
// The same verified source roster is routed through actual shipping
// save ingestion, drawing and confirmation; it never creates initial fleet.
const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const save=fs.readFileSync(new URL('../web/native-korean-save-source.js',import.meta.url),'utf8');
assert.match(save,/heroNames=originalKoreanHeroRoster\(verifiedBytes\)/);
assert.match(save,/slots,portCatalog:ports,heroNames/);
assert.match(app,/originalHeroNames = verified\.heroNames/);
assert.equal((app.match(/nativeNewGameHeroChoices\(slots,originalHeroNames\)/g)||[]).length,2);
assert.match(app,/originalNewGameReady:false/);
assert.match(app,/실제 Start New Game 초기화는 미구현/);
console.log('UW2 six original Korean SHA-pinned protagonist names, all-ten-page consensus, source-only MAIN Canvas labels and no false new-game initialization PASS');
