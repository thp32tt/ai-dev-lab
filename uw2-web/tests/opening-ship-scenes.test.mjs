import assert from 'node:assert/strict';
import fs from 'node:fs';
import {planKoreanOpeningShipArt} from '../web/opening.js';
// Synthetic record identity/dimensions only: NEVER ship copyrighted art in CI.
const parts=Array.from({length:14},()=>({records:[]}));
const rec=(part,i,w,h)=>{const image={partIndex:part,recordIndex:i,width:w,height:h};
 parts[part].records[i]=image;return image;};
const ocean0=rec(1,0,640,200),ocean1=rec(1,1,640,200);
const bow0=rec(2,0,320,200),bow1=rec(2,1,320,200);
const backdrop=rec(11,0,640,200),boarding=rec(12,0,256,200);
const opening={parts};
for(const [elapsed,image,x] of [[0,ocean0,0],[550,ocean0,0],
 [600,bow0,160],[700,bow1,160],[1400,bow0,160]]){
 const plan=planKoreanOpeningShipArt(opening,2,elapsed,640,400,1000);
 assert.equal(plan.caption,0);
 assert.equal(plan.layers.length,1,'panorama + bow may not form a two-story composite');
 assert.equal(plan.layers[0].image,image);
 assert.deepEqual([plan.layers[0].x,plan.layers[0].y],[x,100]);
 assert.equal(plan.layers[0].transparentZero,false);
}
for(const [elapsed,image,x] of [[0,backdrop,0],[550,backdrop,0],
 [560,boarding,192],[1000,boarding,192]]){
 const plan=planKoreanOpeningShipArt(opening,11,elapsed,640,400,1000);
 assert.equal(plan.caption,9);
 assert.equal(plan.layers.length,1,'boarding closeup must be its own cinematic shot');
 assert.equal(plan.layers[0].image,image);
 assert.deepEqual([plan.layers[0].x,plan.layers[0].y],[x,100]);
}
const wrong=rec(2,0,640,200);
assert.throws(()=>planKoreanOpeningShipArt(opening,2,600),/artwork dimensions mismatch/);
parts[2].records[0]=bow0;
assert.throws(()=>planKoreanOpeningShipArt(opening,2,-1),/bounded frame/);
assert.throws(()=>planKoreanOpeningShipArt(opening,3,0),/scenes 2\/11/);
assert.equal(wrong.width,640);
const source=fs.readFileSync(new URL('../web/opening.js',import.meta.url),'utf8');
assert.match(source,/const image=getRecord\(opening,p<0\.79\?11:12,1\)/);
assert.doesNotMatch(source,/drawOpeningNative\(ctx, b, Math\.round\(\(canvas\.width - b\.width\)/);
assert.match(source,/if \(exact\?\.eye && cfg\.eye\?\.length/);
console.log('UW2 native OPGRAPH cinematic single-shot sea/boarding, no split ship or guessed eye overlay PASS');
