import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {auditNativeWebEntry} from '../tools/assert-native-web-entry.mjs';
const real=auditNativeWebEntry();
assert.ok(real.entrypoints.includes('./app.js'));
assert.ok(real.modules.includes('opening.js'));
assert.ok(real.modules.includes('native-graph-canvas.js'));
assert.ok(!real.modules.includes('realmode-8086.js'));
assert.ok(!real.modules.includes('dos-int21.js'));
assert.ok(real.modules.includes('native-original-file.js'));
assert.ok(!real.modules.includes('pinned-dos-resources.js'));

const dir=mkdtempSync(join(tmpdir(),'uw2-native-graph-'));
try{
 const web=join(dir,'web');mkdirSync(web);
 writeFileSync(join(web,'index.html'),'<script type="module" src="./app.js"></script>');
 writeFileSync(join(web,'app.js'),"import './shell.js';");
 writeFileSync(join(web,'shell.js'),"import './realmode-8086.js';");
 writeFileSync(join(web,'realmode-8086.js'),'export const cpu = true;');
 assert.throws(()=>auditNativeWebEntry(web),/DOS\/8086 execution module/);
 writeFileSync(join(web,'shell.js'),"import('./guest-original-execution-session.js');");
 assert.throws(()=>auditNativeWebEntry(web),/DOS\/8086 execution module/);
 writeFileSync(join(web,'shell.js'),"import('./'+window.name);");
 assert.throws(()=>auditNativeWebEntry(web),/nonliteral dynamic import/);
 writeFileSync(join(web,'shell.js'),'export const native = true;');
 assert.equal(auditNativeWebEntry(web).moduleCount,2);
}finally{rmSync(dir,{recursive:true,force:true});}
console.log('UW2 shipping browser HTML graph bans DOS/8086 CPU and nonliteral imports: PASS');
