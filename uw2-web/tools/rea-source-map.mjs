#!/usr/bin/env node
// Source-to-REA coordinate bridge. NEVER interpret Ghidra virtual BSS as raw bytes.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseMzHeader} from './original-inventory.mjs';

export const GHIDRA_DOS_LOAD_BASE=0x10000; // Established by Korean 16-bit REA snapshots.
export function rawToRea(raw,mz,base=GHIDRA_DOS_LOAD_BASE) {
  if(!Number.isInteger(raw)||raw<mz.headerBytes||raw>=mz.declaredBytes) return null;
  return base+raw-mz.headerBytes;
}
export function reaToRaw(linear,mz,base=GHIDRA_DOS_LOAD_BASE) {
  const n=linear-base+mz.headerBytes;
  return Number.isInteger(linear)&&linear>=base&&n<mz.declaredBytes?n:null;
}
export function inspectReaSourceMap(exeBytes,overview,{name='<DOS EXE>',base=GHIDRA_DOS_LOAD_BASE,expectedSha256=null}={}) {
  const mz=parseMzHeader(exeBytes,name);
  const normalized=overview?.data?.normalized_result??overview?.normalized_result??overview;
  const segs=normalized?.segments;
  if(!Array.isArray(segs))throw Error(`${name}: no REA segment overview`);
  const codes=segs.filter(s=>/^CODE_/.test(s.name)).map(s=>({
    name:s.name,start:Number(s.start),end:Number(s.end),length:s.length
  })).sort((a,b)=>a.start-b.start);
  const sourceEnd=base+mz.imageBytes;
  const codeContiguous=codes.length>0&&codes[0].start===base&&codes.at(-1).end===sourceEnd&&
    codes.every((s,i)=>s.end>=s.start && s.end-s.start===s.length &&
      (i===0||s.start===codes[i-1].end));
  const data=segs.filter(s=>s.name==='DATA').map(s=>({
    start:Number(s.start),end:Number(s.end),length:s.length
  }));
  const noDataBeforeSourceEnd=data.every(s=>s.start>=sourceEnd);
  const findings={
    name,mz:{headerBytes:mz.headerBytes,declaredBytes:mz.declaredBytes,imageBytes:mz.imageBytes,
      entry:mz.entry,relocationCount:mz.relocationCount},
    rea:{loadBase:base,initializedSourceEnd:sourceEnd,codeRegions:codes.length,
      candidateProcedures:normalized.procedure_count??null,uninitializedDataRegions:data,
      entryPoint:base+mz.entry.imageOffset},
    checks:{codeContiguous,noDataBeforeSourceEnd,
      entryRoundTrips:reaToRaw(base+mz.entry.imageOffset,mz,base)===mz.headerBytes+mz.entry.imageOffset},
    distinction:'REA candidate procedures are NOT validated functions or total disassembly coverage; virtual BSS must never be read as EXE file bytes',
  };
  findings.gate=Object.values(findings.checks).every(Boolean)?'PASS':'FAIL';
  return findings;
}

const isMain=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isMain){
  const [file,reaFile]=process.argv.slice(2);
  if(!file||!reaFile){process.stderr.write('Usage: node tools/rea-source-map.mjs <original.exe> <rea-overview.json>\n');process.exitCode=2;}
  else try{
    const b=fs.readFileSync(file),overview=JSON.parse(fs.readFileSync(reaFile,'utf-8'));
    const result=inspectReaSourceMap(b,overview,{name:path.basename(file)});
    process.stdout.write(`${JSON.stringify(result,null,2)}\n`);
    if(result.gate!=='PASS') process.exitCode=1;
  }catch(error){process.stderr.write(`${error.message}\n`);process.exitCode=1;}
}
