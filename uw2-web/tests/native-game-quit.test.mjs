import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const controller=fs.readFileSync(new URL('../web/web-controller.js',import.meta.url),'utf8');
const from=app.indexOf('function finishNativeQuitGame(){');
const to=app.indexOf('function selectLoadedSlot(index)',from);
assert.ok(from>=0&&to>from);
const actual=app.slice(from,to);
// Execute the ACTUAL shipping Quit Game body using a synthetic native
// selected/sea/town session; no copied implementation or fake DOS emulator.
function fixture(checkpointInFlight=false){
 const source='return (()=>{'+
 `let checkpointInFlight=FIX.checkpointInFlight;
 let selected={index:1,money:300,dateTime:{year:1522,day:6}};
 let townRuntime={insideBuilding:null};let seaRuntime={ticks:32};
 let buildingUi={mode:"menu"};let systemReturnMode="sea";
 let checkpointFeedback="prior";let portCatalog=[{id:7}];
 let verifiedReferencePortCatalog=[{id:0}];
 let systemUi={mode:"system-menu",cursor:3,slot:0,messageId:null};
 let viewMode="system-menu";const messages=FIX.messages;
 const SYSTEM_UI_LAYOUT={emptySlot:{x:176,y:256,w:288,h:48}};
 const calls=[];const buttons={"run-button":{disabled:false},"runtime-status":{textContent:"prior"}};
 const $=id=>buttons[id]??(buttons[id]={});
 const stopSeaAuto=()=>calls.push("stopSeaAuto");
 const renderSlots=()=>calls.push("renderSlots");
 const drawSystemBase=()=>calls.push("drawSystemBase");
 const drawSystemWindow=x=>calls.push(["window",x]);
 const drawOriginalTextTop=(t,x,y)=>calls.push(["text",t,x,y]);
 const stripUw2MessageControls=t=>t.replace(/\\x1b./g,"");
 const setMusicForMode=m=>calls.push(["music",m]);
 const publishControllerState=s=>calls.push(["publish",s]);
 `+actual+
 `return {run:finishNativeQuitGame,state:()=>({selected,townRuntime,seaRuntime,buildingUi,
 systemReturnMode,checkpointFeedback,portCatalog,verifiedReferencePortCatalog,viewMode,systemUi,calls,buttons})};
 })();`;
 return new Function('FIX',source)({checkpointInFlight,messages:{
   957:{text:'source-key-prompt'},958:{text:'source-quit-message'}
 }});
}
const held=fixture(true);
const before=held.state();
assert.equal(held.run(),false);
assert.deepEqual(held.state(),before);
const f=fixture();
assert.equal(f.run(),true);
const result=f.state();
assert.equal(result.selected,null);
assert.equal(result.townRuntime,null);
assert.equal(result.seaRuntime,null);
assert.equal(result.buildingUi,null);
assert.equal(result.systemReturnMode,null);
assert.equal(result.checkpointFeedback,'');
assert.equal(result.viewMode,'quit-ended');
assert.equal(result.systemUi.mode,'quit-ended');
assert.equal(result.systemUi.messageId,958);
assert.equal(result.portCatalog,result.verifiedReferencePortCatalog);
assert.equal(result.buttons['run-button'].disabled,true);
assert.match(result.buttons['runtime-status'].textContent,/Quit Game/);
assert.equal(result.calls[0],'stopSeaAuto');
assert.equal(result.calls[1],'renderSlots');
assert.ok(result.calls.find(c=>Array.isArray(c)&&c[0]==='text'&&c[1]==='source-quit-message'));
assert.ok(result.calls.find(c=>Array.isArray(c)&&c[0]==='text'&&c[1]==='source-key-prompt'));
assert.ok(result.calls.find(c=>Array.isArray(c)&&c[0]==='music'&&c[1]==='quit-ended'));
assert.ok(result.calls.find(c=>Array.isArray(c)&&c[0]==='publish'&&c[1].systemUi.mode==='quit-ended'));
// Verify all entry gestures reuse original MAIN #56 keyboard router.
assert.match(app,/systemUi\.cursor === 3\) \{\s*finishNativeQuitGame\(\);/);
assert.match(app,/if\(viewMode==="quit-ended"\)\{[\s\S]*?enterSystemMenu\(0\);/);
assert.match(app,/else if\(viewMode==="quit-ended"\)\{[\s\S]*?handleSystemKey\(\{key:"Enter"/);
assert.match(controller,/"quit-ended"\]\.includes\(mode\)/);
assert.match(controller,/"quit-ended": "게임 종료 · 메인 메뉴로 복귀"/);
assert.doesNotMatch(actual,/saveBuffer\s*=|fetch\(|localStorage|\.clear\(|\.removeItem\(|delete\s+slot/);
assert.match(app,/verifiedReferencePortCatalog = verified\.portCatalog/);
console.log('UW2 actual original Korean MAIN Quit Game: source MESSAGE #958/#957, atomic active session disposal, inactive checkpoint barrier and main input restoration PASS');
