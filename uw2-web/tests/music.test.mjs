import assert from "node:assert/strict";
import fs from "node:fs";
import {
  parseD2SongTable,
  parseD2Music,
  D2MusicPlayer,
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
assert.equal(music.songs[0].channelOffsets.length,4);
assert.equal(music.songs[15].channelOffsets.length,3);
assert.equal(music.songs[21].channelOffsets.length,4);
assert.equal("events" in music.songs[0],false);

const manifest={
  tracks:[
    {index:0,file:"d2-01.ogg",role:"opening",loop:false},
    {index:19,file:"d2-20.ogg",role:"town",loop:true},
    {index:21,file:"d2-22.ogg",role:"sea",loop:true},
  ],
};
const player=new D2MusicPlayer({manifest});
player.load(bytes);
assert.equal(player.state().rendered,true);
assert.equal(player.state().renderedTrackCount,3);
assert.equal(player.track,0);
player.setTrack(19);
assert.equal(player.track,19);
await player.next(1);
assert.equal(player.track,21);
await player.next(1);
assert.equal(player.track,0);
await player.next(-1);
assert.equal(player.track,21);

console.log(JSON.stringify({
  songs:music.songCount,
  firstSongOffsets:music.songs[0].rawOffsets.map(x=>"0x"+x.toString(16)),
  renderedTracks:manifest.tracks.map(x=>x.index+1),
  heuristicNoteDecoder:false,
},null,2));
console.log("D2/FMDRV media player tests: PASS");