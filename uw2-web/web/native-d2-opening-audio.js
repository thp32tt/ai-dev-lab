// Native browser-only preview of song #1 in the user's own D2.MML.
// Song index is source-proven, but pitch bias, note shortcuts, envelope,
// timbre and tempo are NOT FMDRV/OPL-exact. No DOS/8086 execution.
import {parseD2Music,parseD2SongTable} from './music.js';
const HZ=22050,TICK=1/48;
const bytesOf=x=>x instanceof Uint8Array?x:x instanceof ArrayBuffer?
 new Uint8Array(x):ArrayBuffer.isView(x)?
 new Uint8Array(x.buffer,x.byteOffset,x.byteLength):null;
export function decodeNativeD2OpeningEvents(value){
 const b=bytesOf(value);
 if(!b||b.length<96||b.length>131072)throw new Error('D2 source bytes invalid');
 const first=parseD2SongTable(b)[0];
 if(!first||first.channelOffsets.length<2)throw new Error('D2 song table invalid');
 const next=parseD2SongTable(b)[1]?.channelOffsets[0]??b.length;
 const result=[];
 for(let channel=0;channel<Math.min(4,first.channelOffsets.length);channel++){
  let p=first.channelOffsets[channel],end=first.channelOffsets[channel+1]??next;
  if(p<0||p>=end||end>b.length)throw new Error('D2 channel bounds invalid');
  let tick=0,steps=0;const notes=[];
  while(p<end&&steps++<4096){
   const op=b[p++];
   if(op===0xff)break;
   if(op>=0xf0){
    if([0xf0,0xf2,0xf4,0xf5,0xf9,0xfa].includes(op)){
     if(p>=end)throw new Error('D2 control truncated');
     p++;
    }
    continue;
   }
   if(op>=0x70)continue; // original shortcut/control: not guessed
   if(p+1>=end)throw new Error('D2 note truncated');
   const duration=b[p++],gate=b[p++];
   if(duration<1||duration>192||gate>duration+5)throw new Error('D2 note duration/gate invalid');
   if(op!==0)notes.push(Object.freeze({
    pitch:op,midi:Math.min(108,op+24),
    startTick:tick,gateTicks:Math.min(duration,gate)}));
   tick+=duration;
  }
  if(steps>=4096||tick>6000)throw new Error('D2 song exceeds browser budget');
  result.push(Object.freeze({channel,notes:Object.freeze(notes),totalTicks:tick}));
 }
 if(!result.some(x=>x.notes.length))throw new Error('D2 song missing source notes');
 return Object.freeze(result);
}
export function synthesizeNativeD2OpeningPCM(channels,sampleRate=HZ){
 if(!Array.isArray(channels)||channels.length<1||channels.length>4||
    !Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>48000)
  throw new Error('D2 browser synthesis input invalid');
 const duration=Math.max(...channels.map(x=>x.totalTicks));
 if(!Number.isSafeInteger(duration)||duration<1||duration>6000)
  throw new Error('D2 music duration invalid');
 const pcm=new Float32Array(Math.ceil((duration*TICK+0.1)*sampleRate));
 for(const c of channels){
  const amp=[0.17,0.11,0.09,0.10][c.channel]??0.08;
  for(const n of c.notes){
   const start=Math.floor(n.startTick*TICK*sampleRate);
   const count=Math.min(pcm.length-start,Math.floor(n.gateTicks*TICK*sampleRate));
   if(!Number.isInteger(n.midi)||n.midi<1||n.midi>108||count<0)
    throw new Error('D2 note frequency invalid');
   const freq=440*Math.pow(2,(n.midi-69)/12);
   const omega=2*Math.PI*freq/sampleRate;
   for(let i=0;i<count;i++){
    const env=Math.min(1,i/(0.014*sampleRate),(count-i)/(0.055*sampleRate));
    const phase=i*omega;
    pcm[start+i]+=amp*env*(Math.sin(phase+0.42*Math.sin(2*phase))+
      0.14*Math.sin(2*phase));
   }
  }
 }
 for(let i=0;i<pcm.length;i++)pcm[i]=Math.tanh(pcm[i]*0.92);
 return pcm;
}
export class NativeD2OpeningPlayer{
 constructor({volume=0.65,contextFactory=null}={}){
  this.volume=Math.max(0,Math.min(1,Number(volume)||0));
  this.contextFactory=contextFactory??globalThis.AudioContext??globalThis.webkitAudioContext??null;
  this.supported=typeof this.contextFactory==='function';
  this.music=null;this.channels=null;this.track=0;this.context=null;
  this.buffer=null;this.gain=null;this.source=null;this.startedAt=0;
  this.desiredPlaying=false;
 }
 load(data){
  this.music=parseD2Music(data);
  this.channels=decodeNativeD2OpeningEvents(data);
  return this.music;
 }
 get songCount(){return this.music?.songCount??0}
 get rendered(){return !!this.channels}
 get playing(){return !!this.source&&this.context?.state==='running'}
 state(){return {
  supported:this.supported,loaded:!!this.music,rendered:this.rendered,
  renderer:'D2 original-note WebAudio approximate synthesis, NOT original OPL',
  fidelity:'D2_SOURCE_EVENTS_SYNTH_APPROX_NOT_FMDRV',
  songCount:this.songCount,renderedTrackCount:this.rendered?1:0,
  track:this.track,playing:this.playing,desiredPlaying:this.desiredPlaying,
  contextState:this.context?'web-audio:'+this.context.state:'web-audio:await-user-gesture',
  currentTime:this.playing?Math.max(0,this.context.currentTime-this.startedAt):0,
  volume:this.volume
 }}
 setTrack(index){
  if(index!==0){this.pause();this.track=Number.isInteger(index)?index:-1;}
  else this.track=0;
  return this.state();
 }
 async unlock(){
  if(!this.supported||!this.channels||!this.desiredPlaying||this.track!==0)return this.state();
  if(this.source)return this.state();
  if(!this.context){
   this.context=new this.contextFactory();
   this.gain=this.context.createGain();this.gain.gain.value=this.volume;
   this.gain.connect(this.context.destination);
  }
  if(!this.buffer){
   const pcm=synthesizeNativeD2OpeningPCM(this.channels);
   this.buffer=this.context.createBuffer(1,pcm.length,HZ);
   this.buffer.getChannelData(0).set(pcm);
  }
  // Keep the native audio unlock directly inside the real user click.
  const resume=this.context.resume();
  const source=this.context.createBufferSource();
  source.buffer=this.buffer;source.loop=true;source.connect(this.gain);
  source.start();this.source=source;this.startedAt=this.context.currentTime;
  try{await resume;}catch(e){
   source.stop();source.disconnect();this.source=null;throw e;
  }
  return this.state();
 }
 async play(index=0){
  this.setTrack(index);
  if(this.track!==0)return this.state();
  this.desiredPlaying=true;return this.unlock();
 }
 pause(){
  this.desiredPlaying=false;
  if(this.source){try{this.source.stop()}catch{}this.source.disconnect();this.source=null;}
  return this.state();
 }
 toggle(){return this.playing?Promise.resolve(this.pause()):this.play(this.track)}
 async next(){return this.state()}
 setVolume(x){
  this.volume=Math.max(0,Math.min(1,Number(x)||0));
  if(this.gain)this.gain.gain.value=this.volume;
  return this.state();
 }
}
