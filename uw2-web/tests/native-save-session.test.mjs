import assert from 'node:assert/strict';
import fs from 'node:fs';
import {openNativeSaveSession,syncNativeTownSession}
 from '../web/native-save-session.js';
const original={index:1,empty:false,port:0,money:100,
 portState:{viewX:10,viewY:38,playerX:12,playerY:14,mapX:22,mapY:52},
 townActors:[{slot:0,x:23,y:50,type:1,active:true}]};
const assets={maps:[new Uint8Array(96*96)],chipNo:Uint8Array.of(0),
 walkBounds:[[0,100,200,250]]};
const session=openNativeSaveSession(original);
assert.notEqual(session,original);
assert.notEqual(session.portState,original.portState);
session.money-=30;
const snap={portId:0,viewX:11,viewY:38,playerX:12,playerY:14,
 mapX:23,mapY:52,actors:[{slot:0,x:24,y:50,type:1,active:true}]};
assert.equal(syncNativeTownSession(session,snap,assets).updated,true);
assert.deepEqual(session.portState,{viewX:11,viewY:38,playerX:12,
 playerY:14,mapX:23,mapY:52});
assert.equal(session.townActors[0].x,24);
snap.actors[0].x=50;
assert.equal(session.townActors[0].x,24);
assert.equal(original.money,100);
assert.equal(original.townActors[0].x,23);
assert.equal(original.portState.viewX,10);
const baseline=structuredClone(session);
for(const bad of [
 {...snap,portId:1},{...snap,mapX:99},{...snap,playerX:23},
 {...snap,actors:[{...snap.actors[0],active:'yes'}]},
 {...snap,actors:Array.from({length:9},()=>snap.actors[0])}
]){
 assert.equal(syncNativeTownSession(session,bad,assets).updated,false);
 assert.deepEqual(session,baseline);
}
assert.throws(()=>openNativeSaveSession({index:10,portState:{}}),/validated/);
const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
assert.equal((app.match(/openNativeSaveSession\(slot\)/g)||[]).length,2);
assert.ok(app.includes('syncNativeTownSession(selected,st,portAssets)'));
assert.ok(!app.includes('selected = slot;'));
console.log('UW2 native game session copies original save and commits live validated town coordinates: PASS');
