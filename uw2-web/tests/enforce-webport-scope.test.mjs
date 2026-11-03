import assert from 'node:assert/strict';
import fs from 'node:fs';
import {checkWebPortChangeSet,checkWebPortSourcePatch} from '../tools/enforce-webport-scope.mjs';
const web='uw2-web/web/app.js',test='uw2-web/tests/native-sea-hold.test.mjs';
assert.equal(checkWebPortChangeSet([web,test]).mode,'GAMEPLAY_AND_TEST');
assert.equal(checkWebPortChangeSet([
 'AGENTS.md','uw2-web/AGENTS.md','uw2-web/README.md',
 'uw2-web/docs/ORIGINAL_DOS_TO_WEB_DISASSEMBLY_MASTER_PLAN_20261031.md',
 'uw2-web/tools/enforce-webport-scope.mjs',
 'uw2-web/tests/enforce-webport-scope.test.mjs',
 '.github/workflows/uw2-web-fidelity.yml']).mode,'POLICY_ONLY');
for(const p of [
 'uw2-web/web/realmode-8086.js','uw2-web/web/dos-int21.js',
 'uw2-web/web/ems-int67-manager.js','uw2-web/web/bios-int16.js',
 'uw2-web/web/vga-mode12-read-adapter.js',
 'uw2-web/web/browser-original-main-session.js',
 'uw2-web/tools/original-main-far-chain-cpu-probe.mjs',
 'uw2-web/tests/original-main-far-chain-cpu-probe.test.mjs'
])assert.throws(()=>checkWebPortChangeSet([web,test,p]),/emulator\/CPU/);
assert.throws(()=>checkWebPortChangeSet([test]),/playable web game source/);
assert.throws(()=>checkWebPortChangeSet([web]),/gameplay requires associated/);
assert.throws(()=>checkWebPortChangeSet([
 'uw2-web/tools/original-inventory.mjs',test]),/automatic tools\/probes/);
assert.throws(()=>checkWebPortChangeSet(['uw2-web/docs/new-doc.md']),/playable web game source/);

assert.throws(()=>checkWebPortChangeSet([
 web,test,'uw2-web/web/cpu-runner.js'
]),/non-native browser runtime/);
assert.throws(()=>checkWebPortChangeSet([
 web,test,'uw2-web/web/new8086.js'
]),/emulator disguised/);
assert.throws(()=>checkWebPortChangeSet([
 'uw2-web/web/guest-execution-renamed.js',test,web
]),/emulator\/CPU/);
assert.throws(()=>checkWebPortChangeSet([
 'uw2-web/tools/novel-cpu-probe.js',test,web
]),/emulator\/CPU/);
assert.throws(()=>checkWebPortSourcePatch([
 "function execute8086(cpu) { return cpu.run(); }"
]),/emulator execution/);
assert.throws(()=>checkWebPortSourcePatch([
 "import { step } from './realmode-8086.js';"
]),/emulator execution/);
assert.equal(checkWebPortSourcePatch([
 "function sailShip() { tickSeaWithBankInterest(); }"
]).mode,'NO_EMULATOR_ENTRYPOINT');
assert.throws(()=>checkWebPortChangeSet([
 web,test,'uw2-web/web/native-8086.js'
]),/emulator disguised/);
assert.throws(()=>checkWebPortChangeSet([
 web,test,'uw2-web/web/native-guest-executor.js'
]),/emulator disguised/);
assert.throws(()=>checkWebPortChangeSet([
 web,test,'uw2-web/tools/safe-gameprobe.js'
]),/automatic tools\/probes/);
const agent=fs.readFileSync(new URL('../AGENTS.md',import.meta.url),'utf8');
const plan=fs.readFileSync(new URL('../docs/ORIGINAL_DOS_TO_WEB_DISASSEMBLY_MASTER_PLAN_20261031.md',import.meta.url),'utf8');
const readme=fs.readFileSync(new URL('../README.md',import.meta.url),'utf8');
for(const s of [agent,plan,readme]){
 assert.match(s,/웹게임/);
 assert.match(s,/8086/);
 assert.match(s,/금지|동결|중단/);
}
const ci=fs.readFileSync(new URL('../../.github/workflows/uw2-web-fidelity.yml',import.meta.url),'utf8');
assert.match(ci,/Enforce browser-only game development policy/);
assert.match(ci,/node uw2-web\/tools\/enforce-webport-scope.mjs/);
console.log('WEB-ONLY automatic development scope PASS: frozen legacy denied; only gameplay code plus tests or policy allowed');
