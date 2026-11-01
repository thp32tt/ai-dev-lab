import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  pubTreatMaximum,pubTreat,fleetFreeBunks,pubRecruitOffer,hireCrew,dismissCrew
} from '../web/pub.js';

const fixture=()=>({
  money:1_000,rank:0,charm:60,dayFlags:0b10101010,
  portMeta:{economy:1_000,pubDrinkId:0},
  fleet:{count:2,totalCrew:15,ships:[
    {currentCrew:10,maxCrew:20},{currentCrew:5,maxCrew:10}
  ]}
});
const unchanged=(value,run)=>{
  const before=structuredClone(value);
  run(value);
  assert.deepEqual(value,before);
};

// The shipping browser invokes these four transaction functions from the
// pub-treat and pub-crew key handlers, not from a separate demonstration.
const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
for(const call of ['pubTreat(selected,','hireCrew(selected,',
                    'dismissCrew(selected,','pubRecruitOffer(selected,'])
  assert.ok(app.includes(call),call);

{
  const s=fixture();
  assert.equal(fleetFreeBunks(s),15);
  assert.equal(pubTreatMaximum(s),50);
  assert.equal(pubRecruitOffer(s,80).unitPrice,55);
  assert.equal(pubRecruitOffer(s,80).maximum,15);
  const treat=pubTreat(s,20,10);
  assert.deepEqual({bottles:treat.bottles,cost:treat.cost,gain:treat.gain,enthusiasm:treat.enthusiasm},
    {bottles:10,cost:30,gain:12,enthusiasm:32});
  assert.equal(s.money,970);
  const hired=hireCrew(s,0,7,80);
  assert.equal(hired.quantity,7);
  assert.equal(hired.cost,385);
  assert.equal(s.money,585);
  assert.equal(s.fleet.ships[0].currentCrew,17);
  assert.equal(s.fleet.totalCrew,22);
  assert.equal(s.dayFlags,0b10101011);
  unchanged(s,x=>assert.equal(hireCrew(x,0,1,80).reason,'used-today'));
  assert.equal(dismissCrew(s,0,3).quantity,3);
  assert.equal(s.fleet.totalCrew,19);
  assert.equal(s.fleet.ships[0].currentCrew,14);
  assert.equal(s.money,585);
}
{
  const s=fixture();s.money=0;
  assert.equal(pubTreatMaximum(s),0);
  unchanged(s,x=>assert.equal(pubTreat(x,20,20).bottles,0));
  unchanged(s,x=>assert.equal(hireCrew(x,0,1,80).quantity,0));
}
{
  const s=fixture();s.fleet.ships[0].currentCrew=20;s.fleet.totalCrew=25;
  assert.equal(hireCrew(s,0,1,80).reason,'ship-full');
  assert.equal(pubRecruitOffer(s,80).maximum,5);
  assert.equal(hireCrew(s,1,100,80).quantity,5);
  assert.equal(s.fleet.ships[1].currentCrew,10);
  assert.equal(s.fleet.totalCrew,30);
}
for(const v of [NaN,Infinity,-1,600_000_001,0.5,'100',undefined]){
  const s=fixture();s.money=v;
  unchanged(s,x=>assert.equal(pubTreat(x,20,1).bottles,0));
  unchanged(s,x=>assert.equal(hireCrew(x,0,1,80).quantity,0));
  unchanged(s,x=>assert.equal(dismissCrew(x,0,1).quantity,0));
  assert.equal(pubTreatMaximum(s),0);
  assert.equal(pubRecruitOffer(s,80).maximum,0);
}
for(const req of [NaN,Infinity,-3,1.5,'3',undefined]){
  const s=fixture();
  unchanged(s,x=>assert.equal(hireCrew(x,0,req,80).quantity,0));
  unchanged(s,x=>assert.equal(dismissCrew(x,0,req).quantity,0));
  unchanged(s,x=>assert.equal(pubTreat(x,20,req).bottles,0));
}
for(const corrupted of [
  s=>{s.fleet.ships[1].currentCrew=NaN;},
  s=>{s.fleet.ships[1].currentCrew=11;},
  s=>{s.fleet.totalCrew=999;},
  s=>{s.fleet.count=1;},
  s=>{s.fleet.ships[1].maxCrew=Infinity;},
  s=>{s.dayFlags=256;},
  s=>{s.rank=-1;},
  s=>{s.portMeta.economy='1000';},
  s=>{s.portMeta.pubDrinkId=250;}
]){
  const s=fixture();corrupted(s);
  unchanged(s,x=>assert.equal(hireCrew(x,0,1,80).quantity,0));
  // Dismissal needs only a coherent fleet and wallet, not port pricing,
  // rank or a recruitment flag.
  if(!['dayFlags','rank','portMeta'].some(k=>!Object.is(s[k],fixture()[k])))
    assert.equal(fleetFreeBunks(s),0);
}
{
  const s=fixture();s.portMeta.economy=NaN;
  unchanged(s,x=>assert.equal(pubTreat(x,50,1).bottles,0));
  assert.equal(pubTreatMaximum(s),0);
}
{
  const s=fixture();s.money=600_000_000;
  assert.equal(pubTreat(s,100,50).bottles,50);
  assert.equal(s.money,599_999_850);
}
{
  const s=fixture();s.fleet.ships[0].currentCrew=65535;
  s.fleet.ships[0].maxCrew=65535;
  s.fleet.totalCrew=65540;
  assert.equal(hireCrew(s,0,1,80).quantity,0);
  assert.equal(dismissCrew(s,0,65535).quantity,65535);
  assert.equal(s.fleet.totalCrew,5);
}
console.log('UW2 shipping native pub treat, recruitment and dismissal atomic integrity: PASS');
