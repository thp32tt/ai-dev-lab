import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../web/boot-visibility.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
const server=fs.readFileSync(new URL('../serve.py',import.meta.url),'utf8');
assert.match(index,/<script src="\.\/boot-visibility\.js"><\/script>\s*<script type="module" src="\.\/app\.js"/);
assert.match(index,/id="boot-recovery"/);
assert.match(index,/id="boot-retry"/);
assert.match(server,/path\.endswith\(\("\.html", "\.js", "\.css"\)\)/);
assert.match(server,/Cache-Control", "no-store, max-age=0"/);
function runBoot(){
 const handlers=new Map(),elements=new Map();
 for(const name of ['screen','boot-recovery','boot-diagnostic','boot-retry','controller-mode','runtime-status']){
   elements.set(name,{id:name,textContent:name==='runtime-status'?'게임 데이터 로딩 중…':'',
     style:{display:'none'},listeners:new Map(),addEventListener(t,fn){this.listeners.set(t,fn)}});
 }
 const drawn=[];
 elements.get('screen').width=640;elements.get('screen').height=400;
 elements.get('screen').getContext=()=>({
   fillRect(...args){drawn.push(['fillRect',...args])},
   strokeRect(...args){drawn.push(['strokeRect',...args])},
   fillText(...args){drawn.push(['fillText',...args])},
   set fillStyle(v){},set strokeStyle(v){},set font(v){},
   set lineWidth(v){},set textAlign(v){}
 });
 let reloads=0, watchdog=null, timeout=null;
 const sandbox={document:{getElementById:id=>elements.get(id)},window:{
   addEventListener:(name,cb)=>handlers.set(name,cb)},
   location:{reload:()=>{reloads++}},
   setInterval:cb=>{watchdog=cb;return 1},
   clearInterval:()=>{},
   setTimeout:cb=>{timeout=cb}
 };
 vm.runInNewContext(source,sandbox,{filename:'boot-visibility.js'});
 return {elements,handlers,drawn,get reloads(){return reloads},tick:()=>watchdog(),timeout:()=>timeout(),
   diagnostics:()=>sandbox.window.__uw2BootDiagnostic()};
}
const ok=runBoot();
assert.ok(ok.drawn.find(x=>x[0]==='fillText'&&x[1]==='대항해시대 II'));
assert.equal(ok.diagnostics().ready,false);
ok.handlers.get('uw2-game-state')({detail:{mode:'opening'}});
assert.equal(ok.diagnostics().ready,true);
assert.equal(ok.elements.get('boot-recovery').style.display,'none');
ok.handlers.get('error')({message:'late sound error'});
assert.equal(ok.diagnostics().failed,false);
const error=runBoot();
error.handlers.get('error')({message:'Failed to fetch dynamically imported module'});
assert.equal(error.diagnostics().failed,true);
assert.equal(error.elements.get('boot-recovery').style.display,'flex');
assert.match(error.elements.get('boot-diagnostic').textContent,/Failed to fetch/);
error.elements.get('boot-retry').listeners.get('click')();
assert.equal(error.reloads,1);
const hang=runBoot();hang.timeout();
assert.equal(hang.diagnostics().failed,true);
assert.match(hang.diagnostics().message,/화면이 시작되지 않았습니다/);
console.log('UW2 browser boot paints before modules; startup errors visible/retry; no stale static cache: PASS');
