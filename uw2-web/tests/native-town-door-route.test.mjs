import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PortWalkingRuntime,canStandAt} from '../web/town.js';
import {prepareNativeTownMovement,commitNativeTownMovement} from '../web/native-town-movement.js';
import {nativeTownSourceDoorChoices,planNativeTownDoorRoute} from '../web/native-town-door-route.js';
import {nativeTownClickRouteNext} from '../web/native-town-click-route.js';
const geometry=()=>({maps:[new Uint8Array(96*96)],chipNo:Uint8Array.of(0),walkBounds:[[0,100,200,250]]});
const session=()=>({port:0,portName:'source',portState:{
 viewX:10,viewY:38,playerX:12,playerY:14,mapX:22,mapY:52
},townActors:[]});
const doors=()=>[{
 id:8,name:'은행',x:22,y:78,present:true
},{id:1,name:'주점',x:23,y:64,present:true},
 {id:3,name:'해상',x:0,y:0,present:false}];
const s=session(),a=geometry(),d=doors(),rt=new PortWalkingRuntime(s,a,[d]);
const choices=nativeTownSourceDoorChoices(rt.snapshot(),rt.doors);
assert.deepEqual(choices.map(x=>x.id),[8,1]);assert.equal(choices[0].name,'은행');
const plan=planNativeTownDoorRoute({snapshot:rt.snapshot(),doors:rt.doors,assets:a,buildingId:8});
assert.equal(plan.targetBuildingId,8);
assert.deepEqual(plan.goal,{x:22,y:78});
assert.equal(plan.moves.length,26);
assert.ok(plan.moves.every(x=>x.direction==='down'));
let count=0,building=null;
for(const next of plan.moves){
 assert.deepEqual(nativeTownClickRouteNext(plan,count,rt.snapshot()),next);
 const tx=prepareNativeTownMovement({session:s,runtime:rt,assets:a,direction:next.direction,rng:()=>.99});
 assert.equal(tx.allowed,true,tx.reason);assert.equal(tx.movement.moved,true);
 assert.equal(commitNativeTownMovement(tx),true);
 assert.equal(rt.mapX,next.x);assert.equal(rt.mapY,next.y);
 building=tx.movement.building??building;count++;
}
assert.equal(count,26);
assert.equal(building?.id,8);
assert.equal(rt.insideBuilding?.id,8);
assert.equal(rt.playerY<=22,true);
assert.equal(nativeTownClickRouteNext(plan,0,rt.snapshot()),null);
assert.deepEqual(nativeTownSourceDoorChoices(rt.snapshot(),rt.doors),[]);
// Non-target door is never crossed.
const ds=session();const dr=new PortWalkingRuntime(ds,a,[d]);
const detour=planNativeTownDoorRoute({snapshot:dr.snapshot(),doors:dr.doors,assets:a,buildingId:8});
assert.ok(detour.moves.every(x=>x.x!==23||x.y!==64));
assert.ok(detour.moves.every(x=>canStandAt(a,0,x.x,x.y)));
for(const bad of [-1,12,NaN,'8',{},null,1.5])
 assert.equal(planNativeTownDoorRoute({snapshot:dr.snapshot(),doors:dr.doors,assets:a,buildingId:bad}),null);
assert.equal(planNativeTownDoorRoute({snapshot:dr.snapshot(),doors:dr.doors,assets:a,buildingId:8,maxSteps:20}),null);
// No source door, blocked target, actor guard and active dialogue refuse.
const blank=session(),br=new PortWalkingRuntime(blank,a,[[]]);
assert.equal(planNativeTownDoorRoute({snapshot:br.snapshot(),doors:br.doors,assets:a,buildingId:8}),null);
const block=geometry();block.maps[0][79*96+22]=255;
assert.equal(planNativeTownDoorRoute({snapshot:dr.snapshot(),doors:dr.doors,assets:block,buildingId:8}),null);
const npc=session();npc.townActors=[{slot:1,x:22,y:78,active:true,type:1}];
const nr=new PortWalkingRuntime(npc,a,[d]);
assert.equal(planNativeTownDoorRoute({snapshot:nr.snapshot(),doors:nr.doors,assets:a,buildingId:8}),null);
assert.equal(planNativeTownDoorRoute({snapshot:{...dr.snapshot(),talk:{messageId:1}},
 doors:dr.doors,assets:a,buildingId:8}),null);
assert.equal(planNativeTownDoorRoute({snapshot:{...dr.snapshot(),mapX:300},
 doors:dr.doors,assets:a,buildingId:8}),null);
const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const controller=fs.readFileSync(new URL('../web/web-controller.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
assert.match(app,/nativeTownSourceDoorChoices\(townRuntime\.snapshot\(\),townRuntime\.doors\)/);
assert.match(app,/planNativeTownDoorRoute\(\{/);
assert.match(app,/stepTownClickRoute\(\)/);
assert.match(app,/action==="town-door-go"/);
assert.match(app,/action==="town-door-stop"/);
assert.match(app,/Number\.isSafeInteger\(buildingId\)/);
assert.match(controller,/emitAction\(action,\{buildingId:id\}\)/);
assert.match(controller,/renderSourceDoorControls\(state\)/);
assert.match(html,/id="town-door-panel"[^>]*hidden/);
assert.match(html,/id="town-door-stop"[^>]*disabled/);
console.log('UW2 Korean source town buildings 96x96 path, real door entry via staged native walking, collision/actor/limit, UI PASS');
