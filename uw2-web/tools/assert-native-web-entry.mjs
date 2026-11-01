#!/usr/bin/env node
// Check the ACTUAL shipping HTML module dependency graph, not just the
// top-level app.js source file. Original DOS/8086 CPU devices are allowed
// in isolated tests/tools, NEVER on the browser game's import path.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ownDir=path.dirname(fileURLToPath(import.meta.url));
const defaultWeb=path.join(ownDir,'../web');
// Match declarative imports/exports only at statement boundaries. The
// preceding broad regex could mistake a comment mentioning "import" plus
// a later string for a dependency and fabricate an emulator import.
const staticImports=/(?:^|\n)\s*(?:import\s+(?:[^'"]*?\s+from\s+)?|export\s+[^'"]*?\s+from\s+)['"]([^'"]+)['"]/g;
const dynamicLiteral=/\bimport\s*\(\s*(['"])(.*?)\1\s*\)/g;
const forbidden=/^(?:realmode-8086|mz-loader|dos-int21|dos-ivt-snapshot|dos-psp-snapshot|dos-child-continuation|dos-com-child-runner|guest-.*|browser-original-.*|browser-dos-child-.*|bios-.*|vga-.*|opl2-.*|pit8253-.*)\.js$/;
export function auditNativeWebEntry(webDir=defaultWeb){
  const html=fs.readFileSync(path.join(webDir,'index.html'),'utf8');
  const entryMatches=[...html.matchAll(/<script\s+[^>]*type=["']module["'][^>]*src=["']([^"']+)["']/g)];
  if(!entryMatches.length)
    throw new Error('native web must have explicit real HTML module entrypoints');
  const visited=new Set(),paths=[];
  const visit=(filename,parents=[])=>{
    const resolved=path.resolve(webDir,filename);
    if(resolved!==webDir&&!resolved.startsWith(webDir+path.sep))
      throw new Error('shipping web module escapes source tree: '+filename);
    const short=path.relative(webDir,resolved).replaceAll(path.sep,'/');
    if(forbidden.test(path.basename(short)))
      throw new Error('shipping web entry imports DOS/8086 execution module: '+[...parents,short].join(' -> '));
    if(visited.has(resolved))return;
    visited.add(resolved);paths.push(short);
    const src=fs.readFileSync(resolved,'utf8');
    // Unknown runtime-computed module imports cannot be audited safely.
    const staticPaths=[...src.matchAll(staticImports)].map(x=>x[1]);
    const literalPaths=[...src.matchAll(dynamicLiteral)].map(x=>x[2]);
    const dynamicCount=[...src.matchAll(/\bimport\s*\(/g)].length;
    if(dynamicCount!==literalPaths.length)
      throw new Error('shipping web uses nonliteral dynamic import: '+short);
    for(const spec of [...staticPaths,...literalPaths]){
      if(!spec.startsWith('./')&&!spec.startsWith('../'))
        throw new Error('shipping web import is not local: '+spec);
      if(!spec.endsWith('.js'))
        throw new Error('shipping web source import must name .js: '+spec);
      visit(path.relative(webDir,path.resolve(path.dirname(resolved),spec)),[...parents,short]);
    }
  };
  for(const match of entryMatches){
    if(!match[1].startsWith('./'))
      throw new Error('native web entry must be a local module');
    visit(match[1]);
  }
  return Object.freeze({entrypoints:entryMatches.map(m=>m[1]),
    moduleCount:paths.length,modules:Object.freeze(paths.sort()),
    policy:'NATIVE_WEB_SHIPPING_GRAPH__NO_DOS_8086_EXECUTION'});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=auditNativeWebEntry();
 process.stdout.write(JSON.stringify({
  result:'NATIVE_WEB_SHIPPING_GRAPH_PASS',
  moduleCount:report.moduleCount,entrypoints:report.entrypoints
 })+'\n');
}
