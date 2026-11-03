import assert from 'node:assert/strict';
import {decodeNativeD2OpeningEvents,synthesizeNativeD2OpeningPCM,
 NativeD2OpeningPlayer} from '../web/native-d2-opening-audio.js';
const bytes=new Uint8Array(256);
const offsets=[128,156,180,204,0];
offsets.forEach((v,i)=>{bytes[i*2]=v&255;bytes[i*2+1]=v>>8});
bytes.set([0xf2,0x47,0xf8,0xf4,0x69,0xfd,0xf0,0,
  0x2f,24,22,0x92,0x34,48,45,0x00,24,0,0xff],128);
bytes.set([0xf8,0xf0,0x1a,0x21,12,11,0xff],156);
bytes.set([0x00,24,0,0x11,12,10,0xff],180);
bytes.set([0x2a,24,12,0xff],204);
const oneByteTail=Uint8Array.from(bytes);
oneByteTail[204+3]=0; // remove channel-end marker
oneByteTail[203]=0x36; // outside last channel; never parsed
assert.equal(decodeNativeD2OpeningEvents(bytes).length,4);
const channels=decodeNativeD2OpeningEvents(bytes);
assert.equal(channels.length,4);
assert.deepEqual(channels[0].notes.map(n=>[n.pitch,n.startTick]),
 [[47,0],[52,24]]);
assert.equal(channels[0].totalTicks,96);
assert.deepEqual(channels[1].notes.map(n=>n.pitch),[33]);
assert.deepEqual(channels[2].notes.map(n=>n.pitch),[17]);
const pcm=synthesizeNativeD2OpeningPCM(channels,8000);
assert.ok(pcm.length>=16000);
assert.ok(pcm.some(x=>Math.abs(x)>0.03));
assert.ok(pcm.every(Number.isFinite));
assert.ok(pcm.every(x=>x>=-1&&x<=1));
assert.throws(()=>decodeNativeD2OpeningEvents(new Uint8Array(20)),/bytes invalid/);
const corrupt=Uint8Array.from(bytes);
corrupt[128+9]=0;
assert.throws(()=>decodeNativeD2OpeningEvents(corrupt),/duration\/gate invalid/);
let started=0,stopped=0,resumed=0;
class FakeAudioContext{
 constructor(){this.currentTime=0;this.state='suspended';this.destination={};}
 createGain(){return {gain:{value:0},connect(){}}}
 createBuffer(channels,count,rate){assert.equal(channels,1);
  return {count,rate,data:new Float32Array(count),getChannelData(){return this.data}};}
 createBufferSource(){return {loop:false,connect(){},disconnect(){},
   start(){started++},stop(){stopped++}}}
 resume(){resumed++;this.state='running';return Promise.resolve()}
}
const p=new NativeD2OpeningPlayer({contextFactory:FakeAudioContext});
p.load(bytes);
assert.equal(p.state().rendered,true);
assert.equal(p.state().renderedTrackCount,1);
assert.equal(p.state().playing,false);
assert.equal(p.context,null,'do not create AudioContext before user gesture');
await p.play(0);
assert.equal(p.playing,true);
assert.equal(started,1);assert.equal(resumed,1);
p.pause();assert.equal(stopped,1);assert.equal(p.playing,false);
await p.play(19);assert.equal(started,1,'never invent unverified town song');
await p.play(0);assert.equal(started,2);
p.setVolume(0.25);assert.equal(p.state().volume,0.25);
p.pause();
console.log('UW2 browser D2 source-note audio/gesture/unverified-song refusal PASS');
