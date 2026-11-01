import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PortWalkingRuntime} from '../web/town.js';
import {prepareNativeTownMovement,commitNativeTownMovement} from '../web/native-town-movement.js';
const initial=()=>({port:0,portName:'source',
 portState:{viewX:10,viewY:38,playerX:12,playerY:14,mapX:22,mapY:52},
 townActors:[{slot:0,x:50,y:50,type:1,active:true}]});
const geometry=()=>({maps:[new Uint8Array(96*96)],
 chipNo:Uint8Array.of(0),walkBounds:[[0,100,200,250]]});
function setup(){
 const session=initial(),assets=geometry();
 const runtime=new PortWalkingRuntime(session,assets,[[]]);
 return {session,assets,runtime};
}
const s=setup();
const before=structuredClone(s.session),oldView=s.runtime.snapshot();
const step=prepareNativeTownMovement({...s,direction:'right',rng:()=>.99});
assert.equal(step.allowed,true,step.reason);
assert.equal(step.movement.moved,true);
assert.deepEqual(s.session,before);
assert.deepEqual(s.runtime.snapshot(),oldView);
assert.equal(commitNativeTownMovement(step),true);
assert.equal(s.runtime.mapX,23);
assert.equal(s.session.portState.mapX,23);
assert.equal(s.runtime.slot,s.session);
assert.deepEqual(s.session.townActors,s.runtime.actors);
assert.equal(s.runtime.stepParity,1);
// One source NPC message may be scheduled without moving, and only after
// a complete transaction is the talk/dialogue state published.
const npc=setup();
npc.session.townActors[0].x=24;npc.session.townActors[0].y=52;
npc.runtime.actors[0].x=24;npc.runtime.actors[0].y=52;
const talk=prepareNativeTownMovement({...npc,direction:'right',rng:()=>.99});
assert.equal(talk.allowed,true,talk.reason);
assert.equal(talk.movement.moved,false);
assert.equal(talk.movement.talk.messageId,0x282);
assert.equal(npc.runtime.talk,null);
assert.equal(commitNativeTownMovement(talk),true);
assert.equal(npc.runtime.talk.messageId,0x282);
assert.equal(npc.session.portState.mapX,22);
// All refusals leave live runtime and session identical.
function hold(s,expected){
 const save=structuredClone(s.session);
 // The malformed-actor regression must itself avoid calling snapshot(),
 // which intentionally assumes a source-shaped actors array.
 const st=Array.isArray(s.runtime.actors)?s.runtime.snapshot():null;
 const rawActors=structuredClone(s.runtime.actors);
 const r=prepareNativeTownMovement({...s,direction:'right',rng:()=>.99});
 assert.equal(r.allowed,false,expected||r.reason);
 if(expected)assert.equal(r.reason,expected);
 assert.deepEqual(s.session,save);
 if(st)assert.deepEqual(s.runtime.snapshot(),st);
 assert.deepEqual(s.runtime.actors,rawActors);
 assert.equal(commitNativeTownMovement(r),false);
}
const drift=setup();
drift.session.portState.mapX=88;
hold(drift,'native-town-session-drift');
const actor=setup();
actor.runtime.actors[0].x=NaN;
hold(actor,'native-town-session-drift');
const owner=setup();
owner.runtime.portId=1;
hold(owner,'native-town-owner-invalid');
const corrupt=setup();
corrupt.assets.maps[0][53*96+22]=240;
hold(corrupt,'ORIGINAL_TOWN_GEOMETRY_UNVERIFIED');
const badActors=setup();
badActors.runtime.actors={invalid:true};
hold(badActors,'native-town-owner-invalid');
// The active keyboard movement path must use the staged transaction.
const app=readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
assert.match(app,/prepareNativeTownMovement[\\s\\S]*session:selected,runtime:townRuntime,assets:portAssets,direction/);
assert.match(app,/commitNativeTownMovement\(step\)/);
assert.doesNotMatch(app,/\btownRuntime\.move\(direction\)/);
console.log('UW2 browser town walking stages source geometry/NPC/dialogue before committing active state: PASS');
