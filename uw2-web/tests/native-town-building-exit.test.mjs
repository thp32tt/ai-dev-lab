import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PortWalkingRuntime} from '../web/town.js';
import {prepareNativeTownMovement} from '../web/native-town-movement.js';
import {prepareNativeTownBuildingExit as stage,commitNativeTownBuildingExit as commit}
 from '../web/native-town-building-exit.js';
const clock=(y=1522,m=7,d=6,t=48)=>({
 year:y,month:m,day:d,timeTick:t,hour:Math.floor(t/3),minute:(t%3)*20
});
function setup(dateTime=clock()){
 const assets={maps:[new Uint8Array(96*96)],
  chipNo:Uint8Array.of(0),walkBounds:[[0,100,200,250]]};
 const door={id:4,name:'source inn',present:true,x:22,y:52};
 const doors=[Array.from({length:12},(_,i)=>
  i===4?door:{id:i,present:false,x:0,y:0})];
 const session={port:0,portName:'source',
  portState:{viewX:10,viewY:38,playerX:12,playerY:14,mapX:22,mapY:52},
  townActors:[{slot:0,x:50,y:50,type:1,active:true}],
  dateTime,money:5000,bankBalance:1000,dayFlags:1};
 const runtime=new PortWalkingRuntime(session,assets,doors);
 runtime.insideBuilding=door;
 return {session,runtime,assets};
}
function prepare(s,kind='visit',ticks=2){
 const before=structuredClone(s.session),shown=s.runtime.snapshot();
 const tx=stage({...s,kind,ticks});
 assert.deepEqual(s.session,before,'staging cannot charge time or money');
 assert.deepEqual(s.runtime.snapshot(),shown,'staging cannot move sprite');
 return tx;
}
const town=setup(),prepared=prepare(town);
assert.equal(prepared.allowed,true,prepared.reason);
assert.equal(prepared.updates.portState.mapY,53);
assert.equal(prepared.updates.dateTime.timeTick,50);
assert.equal(prepared.fields.insideBuilding,null);
assert.equal(commit(prepared),true);
assert.equal(town.session.portState.mapY,53);
assert.equal(town.runtime.mapY,53);
assert.equal(town.runtime.insideBuilding,null);
assert.equal(town.session.dateTime.timeTick,50);
const continued=prepareNativeTownMovement({...town,direction:'right',rng:()=>.99});
assert.equal(continued.allowed,true,continued.reason);
assert.equal(continued.updates.portState.mapX,23);
const inn=setup(clock(1522,1,31,70)),lodged=prepare(inn,'lodge');
assert.equal(lodged.allowed,true,lodged.reason);
assert.deepEqual(lodged.updates.dateTime,clock(1522,2,1,24));
assert.equal(lodged.updates.bankBalance,1030);
assert.equal(lodged.updates.dayFlags,0);
assert.equal(commit(lodged),true);
assert.equal(inn.runtime.lastEvent,'lodge-check-in');
assert.equal(inn.session.portState.mapY,53);
assert.equal(prepareNativeTownMovement({...inn,direction:'right',rng:()=>.99}).allowed,true);
const reject=(s,kind,ticks,reason)=>{
 const tx=prepare(s,kind,ticks);
 assert.equal(tx.allowed,false,reason);
 assert.equal(tx.reason,reason);
 assert.equal(commit(tx),false);
};
reject(setup(clock(9999,12,31,71)),'lodge',undefined,'native-town-calendar-overflow');
reject(setup(clock(1522,2,30,20)),'visit',2,'native-town-calendar-state-invalid');
reject(setup(),'visit',0,'native-town-visit-ticks-invalid');
const drift=setup();drift.session.portState.mapY=55;
reject(drift,'visit',2,'native-building-exit-session-drift');
const noDoor=setup();noDoor.runtime.insideBuilding=null;
reject(noDoor,'visit',2,'native-building-source-door-invalid');
const forged=setup();forged.runtime.insideBuilding={...forged.runtime.insideBuilding};
reject(forged,'visit',2,'native-building-source-door-invalid');
const blocked=setup();blocked.assets.maps[0][54*96+22]=240;
reject(blocked,'visit',2,'ORIGINAL_TOWN_GEOMETRY_UNVERIFIED');
const badOrigin=setup();badOrigin.assets.maps[0][53*96+22]=240;
reject(badOrigin,'visit',2,'ORIGINAL_TOWN_GEOMETRY_UNVERIFIED');
const npc=setup();npc.session.townActors[0].x=5;
reject(npc,'visit',2,'native-building-exit-session-drift');
const app=readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
assert.ok(app.includes('exitNativeTownBuilding("visit",buildingUi?.visitTicks)'));
assert.ok(app.includes('exitNativeTownBuilding("lodge")'));
assert.ok(!app.includes('townRuntime.leaveBuilding()'));
console.log('UW2 native town building/inn exit atomic calendar-position and next keyboard walk: PASS');
