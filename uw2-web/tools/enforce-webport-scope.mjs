// UW2 automatic development source-scope gate. No original game assets.
// Existing emulation research is preserved but frozen: it cannot receive
// new automatic features or tests instead of playable browser game work.
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const POLICY_ONLY=new Set([
 'AGENTS.md','uw2-web/AGENTS.md','uw2-web/README.md',
 'uw2-web/docs/ORIGINAL_DOS_TO_WEB_DISASSEMBLY_MASTER_PLAN_20261031.md',
 'uw2-web/tools/enforce-webport-scope.mjs',
 'uw2-web/tests/enforce-webport-scope.test.mjs',
 '.github/workflows/uw2-web-fidelity.yml'
]);
const FROZEN_WEB=/^uw2-web\/web\/(?:realmode-|dos-|bios-|ems-|vga-|guest-|browser-original-|browser-dos-|mz-loader\.|opl[0-9-]|pit[0-9-]|pic[0-9-]|pinned-dos-)/i;
const FROZEN_TOOL=/^uw2-web\/tools\/(?:original-(?:main|open|koei|dos|fm|p[0-9])|p[013]-|rea-|ghidra-|.*(?:8086|cpu-probe|ems-int|dos-guest|int67))/i;
const FROZEN_TEST=/^uw2-web\/tests\/(?:original-(?:main|open|koei|dos|fm).*(?:cpu|probe|ems|far)|(?:guest|dos|bios|ems|vga|pic|pit|opl|realmode|mz-loader|p[013]-).*|.*(?:cpu-probe|int67|8086)).*\.test\.mjs$/i;
export function checkWebPortChangeSet(paths){
 if(!Array.isArray(paths)||paths.some(p=>typeof p!=='string'))
  throw new TypeError('changed GitHub paths must be a string array');
 const relevant=[...new Set(paths)].filter(p=>p.startsWith('uw2-web/')||
  p==='AGENTS.md'||p==='.github/workflows/uw2-web-fidelity.yml');
 if(relevant.some(p=>p.includes('..')||p.includes('\\')))
  throw new Error('unsafe GitHub change path');
 const frozen=relevant.filter(p=>FROZEN_WEB.test(p)||
  FROZEN_TOOL.test(p)||FROZEN_TEST.test(p));
 if(frozen.length)
  throw new Error('UW2 WEB ONLY: emulator/CPU/DOS/EMS source or test changes forbidden: '+frozen.join(', '));
 const change=relevant.filter(p=>!POLICY_ONLY.has(p));
 if(!change.length)return {mode:'POLICY_ONLY',changed:relevant.length};
 const source=change.filter(p=>p.startsWith('uw2-web/web/')||p==='uw2-web/serve.py');
 if(!source.length)
  throw new Error('UW2 WEB ONLY: tool/test/doc-only changes do not deliver playable web game source');
 const tests=change.filter(p=>/^uw2-web\/tests\/[^/]+\.test\.mjs$/.test(p));
 if(!tests.length)
  throw new Error('UW2 WEB ONLY: changing gameplay requires associated web gameplay tests');
 return {mode:'GAMEPLAY_AND_TEST',changed:relevant.length,
  shipping:source.length,tests:tests.length};
}
export function changedPathsFromGit(before,after){
 if(typeof after!=='string'||!/^[0-9a-f]{40}$/.test(after))
  throw new Error('exact HEAD SHA missing for UW2 policy gate');
 const current=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(current!==after)throw new Error('CI HEAD differs from requested exact SHA');
 let base=before;
 if(typeof base!=='string'||!/^[0-9a-f]{40}$/.test(base)||base==='0'.repeat(40))
  base=execFileSync('git',['rev-parse','HEAD^'],{encoding:'utf8'}).trim();
 const diff=execFileSync('git',['diff','--name-only','--diff-filter=ACDMRT',base,after],{encoding:'utf8'});
 return diff.split(/\r?\n/).filter(Boolean);
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 try{
  const files=changedPathsFromGit(process.env.BEFORE_SHA,process.env.AFTER_SHA);
  console.log('UW2 WEB-ONLY policy PASS',JSON.stringify(checkWebPortChangeSet(files)));
 }catch(error){
  console.error('UW2 WEB-ONLY policy FAIL',error.message);
  process.exitCode=1;
 }
}
