import assert from 'node:assert/strict';
import fs from 'node:fs';
import {harborSupplyPrices,shipCargoFree,maxSupplyLoad,loadSupply,
 unloadSupply,harborDepartureStatus,consumeDepartureDay}
 from '../web/buildings.js';
// Synthetic original-structure u16 ship records, NO Korean DOS reference
// claim. The shipping browser's harbor panel calls these exact functions.
const makeShip=()=>({
 index:0,cargo:10,load:5,water:20,food:10,lumber:0,shot:0,
 currentCrew:5,navigationPercent:100,
 goods:Array.from({length:5},(_,slot)=>({slot,id:255,quantity:0}))
});
const makeSlot=(money=100)=>({
 money,portMeta:{rates:Array(10).fill(50)},
 fleet:{ships:[makeShip()]}
});
const base=makeSlot();
assert.deepEqual(harborSupplyPrices(base),{
 water:0,food:20,lumber:90,shot:120,unresolved:false
});
assert.equal(shipCargoFree(base.fleet.ships[0]),7);
assert.equal(maxSupplyLoad(base,base.fleet.ships[0],'food'),5);
const purchase=loadSupply(base,0,'food',3);
assert.deepEqual(purchase,{quantity:3,cost:60,unitPrice:20});
assert.equal(base.money,40);
assert.equal(base.fleet.ships[0].food,40);
assert.equal(base.fleet.ships[0].load,8);
assert.equal(maxSupplyLoad(base,base.fleet.ships[0],'food'),2);
assert.equal(loadSupply(base,0,'food',50).quantity,2);
assert.equal(base.money,0);
assert.equal(base.fleet.ships[0].food,60);
assert.equal(base.fleet.ships[0].load,10);
assert.equal(maxSupplyLoad(base,base.fleet.ships[0],'water'),2); // cargo-used and speed-load are separate
assert.equal(unloadSupply(base,0,'food',3).quantity,3);
assert.equal(base.fleet.ships[0].food,30);
assert.equal(base.fleet.ships[0].load,7);
assert.equal(base.money,0); // unloading never creates cash
const maxField=makeSlot(100);
maxField.fleet.ships[0].water=65530;
assert.equal(maxSupplyLoad(maxField,maxField.fleet.ships[0],'water'),0);
assert.equal(loadSupply(maxField,0,'water',1).quantity,0);
assert.equal(maxField.fleet.ships[0].water,65530);
const maxLoad=makeSlot(100);
maxLoad.fleet.ships[0].load=65535;
assert.equal(maxSupplyLoad(maxLoad,maxLoad.fleet.ships[0],'water'),0);
const freeWater=makeSlot(0);
assert.equal(loadSupply(freeWater,0,'water',1).quantity,1);
assert.equal(freeWater.money,0);
const invalidMutations=[
 x=>{x.money=-1;},x=>{x.money=600000001;},
 x=>{x.money=NaN;},x=>{x.money=Infinity;},
 x=>{x.money='100';},x=>{x.fleet.ships[0].cargo=-1;},
 x=>{x.fleet.ships[0].cargo=Infinity;},
 x=>{x.fleet.ships[0].load=65536;},
 x=>{x.fleet.ships[0].food=65536;},
 x=>{x.fleet.ships[0].water=-1;},
 x=>{x.fleet.ships[0].goods[0].quantity=Infinity;},
 x=>{x.fleet.ships[0].goods[0].id=-1;},
 x=>{x.portMeta.rates[2]=NaN;},
 x=>{x.portMeta.rates[9]=Infinity;},
 x=>{x.portMeta.rates[2]='50';}
];
for(const mutate of invalidMutations){
 const slot=makeSlot();mutate(slot);
 const original=structuredClone(slot);
 assert.equal(loadSupply(slot,0,'food',3).quantity,0);
 assert.deepEqual(slot,original);
}
for(const q of [-1,0,NaN,Infinity,1.5,'2',undefined]){
 const slot=makeSlot(),original=structuredClone(slot);
 assert.equal(loadSupply(slot,0,'food',q).quantity,0);
 assert.equal(unloadSupply(slot,0,'food',q).quantity,0);
 assert.deepEqual(slot,original);
}
for(const mutate of [
 x=>{x.fleet.ships[0].water=Infinity;},
 x=>{x.fleet.ships[0].load=-1;},
 x=>{x.fleet.ships[0].goods[0].quantity=65536;},
 x=>{x.money='100';}
]){
 const slot=makeSlot();mutate(slot);
 const original=structuredClone(slot);
 assert.equal(unloadSupply(slot,0,'food',3).quantity,0);
 assert.deepEqual(slot,original);
}
const noMeta=makeSlot();
noMeta.portMeta=null;
assert.equal(maxSupplyLoad(noMeta,noMeta.fleet.ships[0],'water'),0);
assert.equal(loadSupply(noMeta,0,'water',5).quantity,0);
const supplyPort={...noMeta,port:100};
assert.equal(loadSupply(supplyPort,0,'water',1).quantity,1);
assert.equal(supplyPort.fleet.ships[0].water,30);
assert.equal(supplyPort.money,100);
assert.equal(maxSupplyLoad(supplyPort,supplyPort.fleet.ships[0],'food'),0);
const fleet=makeSlot();
fleet.fleet.ships.push({...makeShip(),index:1,food:100,water:100});
fleet.fleet.ships[1].currentCrew=Infinity;
const prior=structuredClone(fleet);
assert.equal(harborDepartureStatus(fleet).allowed,false);
assert.equal(consumeDepartureDay(fleet).consumed,false);
assert.deepEqual(fleet,prior); // no partial first-ship consumption
fleet.fleet.ships[1].currentCrew=5;
const before=fleet.fleet.ships.map(s=>[s.water,s.food,s.load]);
assert.equal(consumeDepartureDay(fleet).consumed,true);
for(let i=0;i<fleet.fleet.ships.length;i++){
 assert.equal(fleet.fleet.ships[i].water,before[i][0]-5);
 assert.equal(fleet.fleet.ships[i].food,before[i][1]-5);
}
const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
for(const needle of [
 'loadSupply(selected,ui.ship,resource,q)',
 'unloadSupply(selected,ui.ship,resource,q)',
 'harborDepartureStatus(selected)','consumeDepartureDay(selected)'
])assert.ok(app.includes(needle));
console.log('UW2 native harbor supply load/unload/departure u16 and wallet atomicity: PASS');
