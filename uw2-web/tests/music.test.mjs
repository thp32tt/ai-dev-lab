import assert from "node:assert/strict";
import fs from "node:fs";
import {
  parseD2SongTable,
  parseD2Music,
  decodeD2Channel,
} from "../web/music.js";

const gd=process.env.UW2_GAME_DIR || "/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD";
const raw=fs.readFileSync(gd+"/D2.MML");
const bytes=new Uint8Array(raw.buffer,raw.byteOffset,raw.byteLength);

const table=parseD2SongTable(bytes);
assert.equal(table.length,22);
assert.deepEqual(table[0].rawOffsets,[0x462,0x4c8,0x5af,0x5d8,0]);
assert.deepEqual(table[15].rawOffsets,[0x4088,0x424d,0x43af,0,0]);
assert.deepEqual(table[21].rawOffsets,[0x5b1d,0x5fff,0x64c6,0x685e,0]);

const music=parseD2Music(bytes);
assert.equal(music.songCount,22);
assert.equal(music.byteLength,27866);
assert.equal(music.songs[0].channels.length,4);
assert.equal(music.songs[15].channels.length,3);
assert.equal(music.songs[21].channels.length,4);

const eventCounts=music.songs.map(s=>s.channels.map(c=>c.events.length));
assert.ok(eventCounts[0].every(n=>n>3));
assert.ok(eventCounts[1].every(n=>n>=2));
assert.ok(eventCounts.flat().reduce((a,b)=>a+b,0)>900);

for(const song of music.songs){
  for(const ch of song.channels){
    for(const e of ch.events){
      assert.ok(e.pitch>=0&&e.pitch<0x70);
      assert.ok(e.ticks>0&&e.ticks<=0xc0);
      assert.ok(e.expression>=0&&e.expression<=0x40);
      assert.ok(e.sourceOffset>=ch.start&&e.sourceOffset<ch.end);
    }
  }
}

const synthetic=new Uint8Array([0xf8,0xf4,0x55,0xf0,0,0x30,0x18,8,0,0x0c,0,0xff]);
const ev=decodeD2Channel(synthetic,0,synthetic.length);
assert.deepEqual(ev.map(x=>[x.pitch,x.ticks,x.expression]),[[0x30,0x18,8],[0,0x0c,0]]);

console.log(JSON.stringify({
  songs:music.songCount,
  firstSongOffsets:music.songs[0].rawOffsets.map(x=>"0x"+x.toString(16)),
  channelCounts:music.songs.map(s=>s.channels.length),
  eventCounts,
  totalEvents:eventCounts.flat().reduce((a,b)=>a+b,0),
},null,2));
console.log("D2 music parser tests: PASS");