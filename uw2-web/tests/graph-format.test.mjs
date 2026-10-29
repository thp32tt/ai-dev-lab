import assert from "node:assert/strict";
import fs from "node:fs";
import { decodeLS11 } from "../web/ls11.js";
import { readGraphRecords, decodeGraphRecord } from "../web/graph-format.js";

const gd=process.env.UW2_GAME_DIR || "/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD";
const read=(n)=>fs.readFileSync(gd+"/"+n);
const u8=(b)=>new Uint8Array(b.buffer,b.byteOffset,b.byteLength);

const summary={};
for(const name of ["GRAPH.DAT","GRAPH2.DAT","ENDGRP.DAT"]){
  const records=readGraphRecords(u8(read(name)));
  const dims=[];
  for(const rec of records){
    const im=decodeGraphRecord(rec);
    assert.equal(im.indices.length,im.width*im.height);
    assert.ok(im.indices.every(v=>v<16));
    dims.push([im.width,im.height]);
  }
  summary[name]={records:records.length,dims:dims.slice(0,20)};
}

const op=read("OPGRAPH.LZW");
const opAb=op.buffer.slice(op.byteOffset,op.byteOffset+op.byteLength);
const parts=decodeLS11(opAb).decoded;
let total=0; const perPart=[]; const firstDims=[];
for(let pi=0;pi<parts.length;pi++){
  const records=readGraphRecords(parts[pi].data);
  perPart.push(records.length);
  total+=records.length;
  for(const rec of records){
    const im=decodeGraphRecord(rec);
    assert.equal(im.indices.length,im.width*im.height);
    assert.ok(im.indices.every(v=>v<16));
    if(firstDims.length<30) firstDims.push([pi,im.width,im.height]);
  }
}
summary.OPGRAPH={parts:parts.length,records:total,perPart,firstDims};
assert.equal(parts.length,14);
assert.equal(total,108);
console.log(JSON.stringify(summary,null,2));
console.log("graph-format tests: PASS");