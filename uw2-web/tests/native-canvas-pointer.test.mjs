import assert from 'node:assert/strict';
import fs from 'node:fs';
import {nativeCanvasPointerPoint,nativeSystemMenuPointerHit,
 nativeLoadSlotPointerHit,nativeNewGameHeroPointerHit,
 nativeDialoguePointerInside,nativeBuildingMenuPointerHit,
 nativeModalRowPointerHit,nativeYesNoPointerHit,
 nativeTownWalkPointerDirection} from '../web/native-canvas-pointer.js';

const canvas={width:640,height:400,clientLeft:2,clientTop:2,
 clientWidth:800,clientHeight:500,
 getBoundingClientRect(){return {left:90,top:40,width:804,height:504};}};
assert.deepEqual(nativeCanvasPointerPoint({clientX:90+2+200,clientY:40+2+100},canvas),{x:160,y:80});
assert.equal(nativeCanvasPointerPoint({clientX:90+1,clientY:42},canvas),null);
assert.equal(nativeCanvasPointerPoint({clientX:892,clientY:542},canvas),null);
assert.equal(nativeCanvasPointerPoint({clientX:NaN,clientY:150},canvas),null);
assert.equal(nativeCanvasPointerPoint({},canvas),null);
for(let i=0;i<5;i++)
 assert.equal(nativeSystemMenuPointerHit({x:220,y:48+i*16+8},5),i);
assert.equal(nativeSystemMenuPointerHit({x:220,y:48+16+8},2),1);
assert.equal(nativeSystemMenuPointerHit({x:220,y:48+16+8},1),null);
assert.equal(nativeSystemMenuPointerHit({x:100,y:72}),null);
assert.equal(nativeSystemMenuPointerHit({x:220,y:135}),null);
for(let i=0;i<10;i++)
 assert.equal(nativeLoadSlotPointerHit({x:300,y:96+i*16+8}),i);
assert.equal(nativeLoadSlotPointerHit({x:300,y:256}),null);
const points=[[56,184],[104,280],[184,56],[280,80],[328,256],[512,168]];
for(let id=0;id<6;id++){
 const [x,y]=points[id];
 assert.equal(nativeNewGameHeroPointerHit({x,y}),id);
 assert.equal(nativeNewGameHeroPointerHit({x:x+63.99,y:y+79.99}),id);
 // Selector regions are exactly original 64x80; labels do not add a hit area.
 assert.notEqual(nativeNewGameHeroPointerHit({x:x+64,y:y+79}),id);
 assert.notEqual(nativeNewGameHeroPointerHit({x:x+63,y:y+80}),id);
}
assert.equal(nativeNewGameHeroPointerHit({x:10,y:20}),null);
assert.equal(nativeNewGameHeroPointerHit({x:110,y:360}),null);
assert.equal(nativeNewGameHeroPointerHit({x:106,y:58}),null);
const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
assert.match(app,/from "\.\/native-canvas-pointer\.js"/);
assert.match(app,/canvas\.addEventListener\("click",\s*event\s*=>/);
assert.match(app,/nativeSystemMenuPointerHit\(point,\s*menuDefs\[ORIGINAL_SYSTEM_MENU_INDEX\]\?\.options\?\.length/);
assert.match(app,/handleSystemKey\(\{key:"Enter",preventDefault\(\)\{\}\}\)/);
assert.match(app,/nativeNewGameHeroPointerHit\(point\)/);
assert.match(app,/newGameHeroCursor=hit;\s*newGameHeroNotice="";\s*handleSystemKey\(\{key:"Enter",preventDefault\(\)\{\}\}\)/);
assert.doesNotMatch(app,/if\(hit===newGameHeroCursor\)/);
assert.match(app,/nativeLoadSlotPointerHit\(point\)/);
// GRAPH #22 origin is (104,136), 368x152. Menu text baselines
// are y+30+i*16; titled scrollable rows start at y+46.
assert.equal(nativeDialoguePointerInside({x:104,y:136}),true);
assert.equal(nativeDialoguePointerInside({x:471.9,y:287.9}),true);
assert.equal(nativeDialoguePointerInside({x:472,y:160}),false);
assert.equal(nativeDialoguePointerInside({x:300,y:288}),false);
assert.equal(nativeDialoguePointerInside({x:NaN,y:160}),false);
for(let i=0;i<6;i++)
 assert.equal(nativeBuildingMenuPointerHit({x:180,y:150+i*16+8},6),i);
assert.equal(nativeBuildingMenuPointerHit({x:180,y:150+5*16+8},3),null);
assert.equal(nativeBuildingMenuPointerHit({x:180,y:150+6*16+8},8),null);
assert.equal(nativeBuildingMenuPointerHit({x:115,y:156},4),null);
assert.equal(nativeBuildingMenuPointerHit({x:180,y:149},4),null);
assert.equal(nativeBuildingMenuPointerHit({x:180,y:165.999},1),0);
assert.equal(nativeBuildingMenuPointerHit({x:180,y:166},1),null);
assert.equal(nativeBuildingMenuPointerHit({x:180,y:158},0),null);
for(let i=0;i<7;i++)
 assert.equal(nativeModalRowPointerHit({x:200,y:166+i*16+8},
   {rowCount:12,selectedIndex:9,title:true}),i+3);
assert.equal(nativeModalRowPointerHit({x:200,y:166+7*16+8},
 {rowCount:12,selectedIndex:9,title:true}),null);
assert.equal(nativeModalRowPointerHit({x:200,y:166+6*16+8},
 {rowCount:5,selectedIndex:0,title:true}),null);
assert.equal(nativeModalRowPointerHit({x:200,y:150+8},
 {rowCount:3,selectedIndex:1,title:false}),0);
assert.equal(nativeModalRowPointerHit({x:115,y:172},
 {rowCount:5,selectedIndex:1,title:true}),null);
assert.equal(nativeModalRowPointerHit({x:200,y:174},
 {rowCount:0,selectedIndex:0,title:true}),null);
assert.equal(nativeModalRowPointerHit({x:200,y:174},
 {rowCount:5,selectedIndex:Infinity,title:true}),null);
assert.match(app,/nativeBuildingMenuPointerHit\(point,options\.length\|\|1\)/);
assert.match(app,/ui\.cursor=hit;\s*handleBuildingKey\(\{key:"Enter",preventDefault\(\)\{\}\}\)/);
assert.match(app,/townRuntime\.dismissTalk\(\);\s*renderTownScreen\(\)/);
assert.match(app,/nativeModalRowPointerHit\(point,\{[\s\S]*?rowCount:count,selectedIndex:ui\[field\],title:true/);
assert.match(app,/ui\[field\]=hit;\s*renderTownScreen\(\)/);
assert.match(app,/if\(!field\)return/);
assert.doesNotMatch(app,/ui\[field\]=hit;\s*handleBuildingKey/);
// Owner's GRAPH.DAT record #0 (144x56) was decoded from the Korean DOS
// asset and independently visually verified: LEFT=YES, RIGHT=NO.
// The source image is NEVER added to the repository or mutated.
assert.equal(nativeYesNoPointerHit({x:488,y:346}),'yes');
assert.equal(nativeYesNoPointerHit({x:548.99,y:381.99}),'yes');
assert.equal(nativeYesNoPointerHit({x:555,y:346}),'no');
assert.equal(nativeYesNoPointerHit({x:615.99,y:381.99}),'no');
for(const p of [{x:480,y:360},{x:488,y:345.99},{x:549,y:360},
 {x:554.99,y:360},{x:616,y:360},{x:550,y:360},
 {x:600,y:382},{x:600,y:345},{x:700,y:360},
 {x:NaN,y:360},{x:500,y:Infinity}])
 assert.equal(nativeYesNoPointerHit(p),null);
assert.match(app,/viewMode==="load-confirm"\)\{/);
assert.match(app,/nativeYesNoPointerHit\(point\)/);
assert.match(app,/handleSystemKey\(\{key:hit==="yes"\?"Enter":"Escape",preventDefault\(\)\{\}\}\)/);
assert.match(app,/ui\.mode==="sail-confirm"\|\|ui\.mode==="item-buy-confirm"/);
assert.match(app,/ui\.mode==="item-sell-offer"\|\|ui\.mode==="item-sell-counter"/);
assert.match(app,/handleBuildingKey\(\{key:hit==="yes"\?"Enter":"Escape",preventDefault\(\)\{\}\}\)/);
assert.match(app,/viewMode==="load-empty"\)\{/);
assert.doesNotMatch(app,/nativeYesNoPointerHit\(point\)[\s\S]{0,100}?(?:buyGoods|sellGoods|startSeaFromPort)\(/);
// GRAPH #5 source native playfield (96,8), 16px tile. Verified hero anchor.
const townPoint=(x,y)=>({x:96+x*16+8,y:8+y*16+8});
const sourceTown={playerX:12,playerY:14};
assert.equal(nativeTownWalkPointerDirection(townPoint(12,14),sourceTown),null);
assert.equal(nativeTownWalkPointerDirection(townPoint(12,13),sourceTown),"up");
assert.equal(nativeTownWalkPointerDirection(townPoint(12,15),sourceTown),"down");
assert.equal(nativeTownWalkPointerDirection(townPoint(11,14),sourceTown),"left");
assert.equal(nativeTownWalkPointerDirection(townPoint(13,14),sourceTown),"right");
assert.equal(nativeTownWalkPointerDirection(townPoint(17,15),sourceTown),"right");
assert.equal(nativeTownWalkPointerDirection(townPoint(11,19),sourceTown),"down");
assert.equal(nativeTownWalkPointerDirection(townPoint(11,13),sourceTown),"left");
for(const p of [{x:95.99,y:240},{x:300,y:7.99},{x:480,y:240},
 {x:300,y:392},{x:96+23*16+8,y:240},{x:300,y:8+23*16+8},
 {x:NaN,y:240},{x:300,y:Infinity}])
 assert.equal(nativeTownWalkPointerDirection(p,sourceTown),null);
for(const bad of [null,{}, {playerX:23,playerY:14},
 {playerX:12.5,playerY:14},{playerX:12,playerY:-1}])
 assert.equal(nativeTownWalkPointerDirection(townPoint(12,13),bad),null);
assert.match(app,/const direction=nativeTownWalkPointerDirection\(point,townRuntime\.snapshot\(\)\);\s*if\(direction!==null\)moveTown\(direction\)/);
assert.match(app,/const building=townRuntime\.insideBuilding;\s*if\(!building\)\{/);
console.log('UW2 native pointer: original menu, six heroes, saves, town dialogue, building menus, trade/crew/ship row selection PASS');
