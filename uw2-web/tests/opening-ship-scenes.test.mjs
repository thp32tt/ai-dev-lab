import assert from 'node:assert/strict';
import {planKoreanOpeningShipArt} from '../web/opening.js';

// Fixture contains only record dimensions and identities, not game artwork.
// The SOURCE part 2 records are temporal alternatives, not stereo/tile halves.
const parts=Array.from({length:14},()=>({records:[]}));
const record=(part,index,width,height)=>{
 const image={partIndex:part,recordIndex:index,width,height};
 parts[part].records[index]=image;
 return image;
};
const ocean0=record(1,0,640,200),ocean1=record(1,1,640,200);
const bow0=record(2,0,320,200),bow1=record(2,1,320,200);
const backing=record(11,0,640,200),boarding=record(12,0,256,200);
const opening={parts};
for(const [t,expectedOcean,expectedBow] of [[0,ocean0,bow0],
  [699,ocean0,bow0],[700,ocean1,bow1],[1400,ocean0,bow0]]){
 const p=planKoreanOpeningShipArt(opening,2,t);
 assert.equal(p.caption,0);
 assert.equal(p.layers.length,2,'never draw duplicate ship bows');
 assert.deepEqual(p.layers.map(x=>x.image),[expectedOcean,expectedBow]);
 assert.deepEqual(p.layers.map(x=>[x.x,x.y]),[[0,0],[160,200]]);
 assert.equal(p.layers[1].transparentZero,false);
}
const before=planKoreanOpeningShipArt(opening,11,0,640,400,1000);
assert.equal(before.caption,9);
assert.deepEqual(before.layers.map(x=>x.image),[backing,boarding]);
assert.deepEqual(before.layers.map(x=>[x.x,x.y]),[[0,0],[640,200]]);
const finished=planKoreanOpeningShipArt(opening,11,1000,640,400,1000);
assert.deepEqual(finished.layers.map(x=>[x.x,x.y]),[[0,0],[192,200]]);
assert.equal(finished.layers[1].transparentZero,true);
const wrong=record(2,0,640,200);
assert.throws(()=>planKoreanOpeningShipArt(opening,2,0),
 /artwork dimensions mismatch/);
parts[2].records[0]=bow0;
assert.throws(()=>planKoreanOpeningShipArt(opening,2,-1),/bounded frame/);
assert.throws(()=>planKoreanOpeningShipArt(opening,3,0),/scenes 2\/11/);
assert.equal(wrong.width,640);
console.log('UW2 native opening ships: temporal bow frame, no duplication, carried boarding background PASS');
