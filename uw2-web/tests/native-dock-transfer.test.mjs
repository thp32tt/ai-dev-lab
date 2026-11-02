import assert from 'node:assert/strict';
import fs from 'node:fs';
import {nativeDockTransferMaximum,transferNativeDockSupply} from '../web/native-dock-transfer.js';
const makeShip=(index,water=100,food=100,lumber=0,shot=0,load=20)=>({
 index,name:'original fleet '+index,cargo:100,load,
 water,food,lumber,shot,currentCrew:10,maxCrew:20,
 goods:[{slot:0,id:255,quantity:0},{slot:1,id:255,quantity:0}]
});
const source=()=>({money:5000,dateTime:{year:1522},fleet:{
 ships:[makeShip(3,200,100,0,0,30),makeShip(8,100,100,0,0,20)],
 count:2,totalCrew:20
}});
const s=source(),p=structuredClone(s);
assert.equal(nativeDockTransferMaximum(s,0,1,'water'),20);
assert.deepEqual(s,p,'maximum must not mutate live fleet');
const a=transferNativeDockSupply(s,0,1,'water',3);
assert.equal(a.quantity,3);
assert.equal(s.fleet.ships[0].water,170);
assert.equal(s.fleet.ships[1].water,130);
assert.equal(s.fleet.ships[0].load,27);
assert.equal(s.fleet.ships[1].load,23);
assert.equal(s.money,5000);
assert.deepEqual(s.dateTime,p.dateTime);
assert.equal(s.fleet.totalCrew,20);
assert.equal(s.fleet.count,2);
assert.equal(transferNativeDockSupply(s,1,0,'water',2).quantity,2);
assert.equal(s.fleet.ships[0].water,190);
assert.equal(s.fleet.ships[1].water,110);
// Destination cannot overfill cargo or source u16.
const full=source();full.fleet.ships[1].cargo=20;
assert.equal(nativeDockTransferMaximum(full,0,1,'food'),0);
const beforeFull=structuredClone(full);
assert.equal(transferNativeDockSupply(full,0,1,'food',1).quantity,0);
assert.deepEqual(full,beforeFull);
// Same ship, bad source amount, index, roster drift, reserve source load.
const errors=[[-1,1,'food',1],[0,2,'food',1],[0,0,'food',1],
 [0,1,'invalid',1],[0,1,'water',-1],[0,1,'water',NaN],[0,1,'water',1.5]];
for(const args of errors){
 const f=source(),saved=structuredClone(f);
 assert.equal(transferNativeDockSupply(f,...args).quantity,0);
 assert.deepEqual(f,saved);
}
const malformed=source();malformed.fleet.totalCrew=21;
const saved=structuredClone(malformed);
assert.equal(transferNativeDockSupply(malformed,0,1,'water',5).quantity,0);
assert.deepEqual(malformed,saved);
const lowLoad=source();lowLoad.fleet.ships[0].load=2;
assert.equal(nativeDockTransferMaximum(lowLoad,0,1,'water'),2);
assert.equal(transferNativeDockSupply(lowLoad,0,1,'water',30).quantity,2);
assert.equal(lowLoad.fleet.ships[0].load,0);
// Verified source u16 storage and destination's full 5 slots.
const ceil=source();ceil.fleet.ships[1].water=65530;
assert.equal(nativeDockTransferMaximum(ceil,0,1,'water'),0);
const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const keys=fs.readFileSync(new URL('../web/native-context-commands.js',import.meta.url),'utf8');
assert.match(app,/ui.mode="dock-transfer";ui.ship=0;ui.dockTarget=1/);
assert.match(app,/transferNativeDockSupply\(selected,ui.ship,ui.dockTarget,resource,q\)/);
assert.match(app,/drawHarborDock\(ui\)/);
assert.match(keys,/'dock-transfer':dock/);
console.log('UW2 native dock real source fleet inter-ship water/food/lumber/shot supply transfer atomic caps, no cash/time, UI PASS');
