import assert from 'node:assert/strict';
import {classifyNativeSaveEntry} from '../web/native-save-entry.js';
import fs from 'node:fs';
const fakeAssets={maps:Array.from({length:101},()=>new Uint8Array(96*96))};
const fakeDoors=Array.from({length:101},()=>[]);
const good={port:39,empty:false,
  portWorld:{nation:5,x:288,y:240},
  portState:{viewX:10,viewY:38,playerX:12,playerY:14,
    mapX:22,mapY:52}};
const opts={portAssets:fakeAssets,portDoors:fakeDoors};
assert.deepEqual(classifyNativeSaveEntry(good,opts),{
  route:'town',port:39,source:'KOUKAI2_DAT_PARSED_TOWN_COORDINATES'});
for(const invalid of [
  {...good,port:255},
  {...good,port:254},
  {...good,empty:true},
  {...good,portWorld:null},
  {...good,portState:{...good.portState,mapX:999}},
  {...good,portState:{...good.portState,viewX:-1}},
  {...good,portState:{...good.portState,playerY:23}},
]){
  assert.equal(classifyNativeSaveEntry(invalid,opts).route,'hold');
}
assert.equal(classifyNativeSaveEntry({...good,port:255},opts).reason,
 'AT_SEA_COORDINATE_LAYOUT_UNVERIFIED');
assert.equal(classifyNativeSaveEntry(good,{}).reason,'ORIGINAL_TOWN_ASSETS_UNAVAILABLE');
const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
assert.ok(app.includes("classifyNativeSaveEntry(selected, { portAssets, portDoors })"));
assert.ok(app.includes('nativeSaveHold: entry.reason'));
assert.ok(!app.includes('new ReaGameRuntime'));
assert.ok(!app.includes('requestAnimationFrame(renderRuntime)'));
assert.ok(!app.includes('function renderRuntime()'));
console.log('UW2 browser-native original-save entry rejects invented fake REA game runtime: PASS');
