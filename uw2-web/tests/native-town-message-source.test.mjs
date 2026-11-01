import assert from 'node:assert/strict';
import {townPersonMessageId,PortWalkingRuntime} from '../web/town.js';
const actor={slot:0,x:11,y:10,type:0,active:true,walker:false};
assert.equal(townPersonMessageId({port:39},actor),0x282+39);
assert.equal(townPersonMessageId({port:99},actor),0x282+99);
for(const id of [100,101,115,129]){
 assert.equal(townPersonMessageId({port:100,portCatalogId:id},actor),null);
}
assert.equal(townPersonMessageId({port:100},actor),null);
assert.equal(townPersonMessageId({port:39,portCatalogId:100},actor),null);
const assets={
 maps:Array.from({length:101},()=>new Uint8Array(96*96)),
 chipNo:new Uint8Array(101),
 walkBounds:[[0,100,200,250]]
};
const original={port:100,portCatalogId:101,portName:'source supply 101',
 portState:{viewX:0,viewY:0,playerX:10,playerY:10},
 townActors:[actor],dateTime:{day:5}};
const runtime=new PortWalkingRuntime(original,assets,[]);
const before=runtime.snapshot();
const result=runtime.move('right');
assert.equal(result.moved,false);
assert.equal(result.unverifiedMessage,true);
assert.equal(result.actorSlot,0);
assert.equal(runtime.talk,null);
assert.deepEqual([runtime.mapX,runtime.mapY],[10,10]);
assert.equal(runtime.snapshot().lastEvent,'source-npc-dialogue-unverified');
assert.deepEqual(runtime.snapshot().actors,before.actors);
const normal=new PortWalkingRuntime({...original,port:39,portCatalogId:39},assets,[]);
const ordinary=normal.move('right');
assert.equal(ordinary.talk.messageId,0x282+39);
assert.equal(normal.talk.messageId,0x282+39);
console.log('UW2 source port 0-99 NPC lore is scoped; shared supply 100-129 fail closed: PASS');