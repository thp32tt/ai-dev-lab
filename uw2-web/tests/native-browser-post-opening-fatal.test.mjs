import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Test the non-module watchdog independently of a working original game set.
const bootstrap=fs.readFileSync(new URL('../web/boot-visibility.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const elements=new Map();
const handlers=new Map();
for(const name of ['screen','boot-recovery','boot-diagnostic','boot-retry','boot-skip',
                   'controller-mode','runtime-status']){
 elements.set(name,{textContent:'',style:{display:'none'},
   addEventListener(){},getContext(){return {
    fillRect(){},strokeRect(){},fillText(){}
   }},width:640,height:400});
}
const window={addEventListener:(type,fn)=>handlers.set(type,fn)};
const document={getElementById:id=>elements.get(id)};
vm.runInNewContext(bootstrap,{window,document,
 setInterval(){return 1},clearInterval(){},setTimeout(){},
 location:{reload(){}}});
const errorView=()=>elements.get('boot-recovery').style.display;
assert.equal(errorView(),'none');
handlers.get('uw2-game-state')({detail:{mode:'opening'}});
assert.equal(window.__uw2BootDiagnostic().ready,true);
assert.equal(elements.get('boot-skip').style.display,'block');
handlers.get('uw2-game-state')({detail:{mode:'opening-title'}});
assert.equal(elements.get('boot-skip').style.display,'none');
// A generic optional audio error after initial rendering is not a fatal
// original-asset boot error and must not cover the source canvas.
handlers.get('error')({message:'optional audio failed'});
assert.equal(errorView(),'none');
handlers.get('uw2-boot-failure')({detail:{
 phase:'MAIN 원본 리소스',message:'MENU.DAT HTTP 404'}});
assert.equal(errorView(),'flex');
assert.match(elements.get('boot-diagnostic').textContent,/MAIN 원본 리소스: MENU.DAT HTTP 404/);
assert.equal(window.__uw2BootDiagnostic().failed,true);

// Source wiring must report all three original boot failure boundaries and
// publish the opening-title state, not silently leave the controller in OPEN.
assert.match(app,/function reportOriginalBootFailure\(phase, error\)/);
assert.match(app,/reportOriginalBootFailure\("OPEN 원본 그래픽", err\)/);
assert.match(app,/reportOriginalBootFailure\("MAIN 원본 리소스", new Error\(gameResourceFailure\)\)/);
assert.match(app,/reportOriginalBootFailure\("OPEN 재생", err\)/);
const title=app.slice(app.indexOf('function drawOpeningTitleHold('),
 app.indexOf('function completeOpening('));
assert.match(title,/viewMode = "opening-title";/);
assert.match(title,/publishControllerState\(\);/);
console.log('UW2 source boot: intro-to-title state + immediate fatal resource diagnostics PASS');
