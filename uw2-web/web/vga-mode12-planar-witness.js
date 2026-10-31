// Narrow original-CPU VGA 640x480x16 planar MODE 2 / MODE 0 write witness.
// IBM-compatible VGA write-mode-2 data expansion is documented by OSDev
// VGA Hardware and 82C451 Graphics Controller Registers. We intentionally
// support ONLY observed register conditions: GC05=02h (mode2) or
// GC05=00h with GC01=00h (mode0), GC03=00h, GC08=FFh,
// Sequencer02 map mask. This excludes latch/ROP/masked writes;
// a different mode is NOT silently treated as a real rendered pixel.
// This is a passive GPU-memory evidence layer, NOT an authentic VGA BIOS,
// vertical-retrace clock, palette renderer, or original visual parity.
const WIDTH=640,HEIGHT=480,STRIDE=WIDTH>>>3,VISIBLE=STRIDE*HEIGHT;
const VRAM_PHYSICAL=0xa0000,VRAM_END=0xb0000;
const validByte=v=>Number.isInteger(v)&&v>=0&&v<=255;
export function createOriginalVgaMode12PlaneWitness({maxObservedWrites=250000}={}){
  if(!Number.isInteger(maxObservedWrites)||maxObservedWrites<1||maxObservedWrites>2000000)
    throw new RangeError('bounded mode 12h guest byte-write budget required');
  const gc=new Map(),seq=new Map();
  const planes=Array.from({length:4},()=>new Uint8Array(VISIBLE));
  const validity=Array.from({length:4},()=>new Uint8Array(VISIBLE));
  let observedWrites=0,visibleWrites=0,fullyCoveredBytes=0,mode0Writes=0,mode2Writes=0;
  // GC06 controls which CPU address aperture actually reaches VGA. The
  // native A000 witness is only valid in graphics mode with planar addressing,
  // not in text mode, odd/even-chained addressing or B000/B800 mappings.
  // 01h maps A0000-BFFFF; 05h maps A0000-AFFFF (Mode 12h observed).
  const mapsPlanarA000=()=>gc.get(6)===0x01||gc.get(6)===0x05;
  const isReady=()=>{
    const mode=gc.get(5);
    return mapsPlanarA000()&&gc.get(3)===0&&gc.get(8)===255&&
      (mode===2||(mode===0&&gc.get(1)===0))&&
      Number.isInteger(seq.get(2))&&(seq.get(2)&0xf)!==0;
  };
  const snapshot=()=>Object.freeze({
    width:WIDTH,height:HEIGHT,strideBytes:STRIDE,
    observedWrites,visibleWrites,fullyCoveredBytes,mode0Writes,mode2Writes,
    visibleBytes:VISIBLE,
    configKnown:isReady(),
    graphicsMode:gc.has(5)?gc.get(5):null,
    sequencerMapMask:seq.has(2)?seq.get(2):null,
    fidelity:'ORIGINAL_CPU_WRITE_MODE0_MODE2_VGA_PLANES_ONLY__NO_BIOS_OR_FRAME_PARITY'
  });
  return Object.freeze({
    invalidateAfterBiosModeSet({mode}={}){
      // INT10 AH00 may reset VGA registers and framebuffer. The ROM's
      // actual memory contents are not inferred from a BIOS mode request.
      // Discard all previous per-plane evidence and stale register settings.
      // Only subsequent native writes with freshly witnessed GC/SEQ settings
      // can again make a pixel or CPU read provable.
      if(!validByte(mode))
        throw new RangeError('BIOS video mode byte required to invalidate VGA evidence');
      for(const plane of planes)plane.fill(0);
      for(const known of validity)known.fill(0);
      gc.clear();seq.clear();fullyCoveredBytes=0;
    },
    noteIndexedRegister(event){
      if(!event||typeof event!=='object'||!validByte(event.index)||
         !validByte(event.value))
        throw new Error('VGA GC/SEQ indexed register event required');
      const target=event.device==='graphics-controller'?gc:
        event.device==='sequencer'?seq:null;
      if(!target)return; // CRT registers are not modeled by this witness
      target.set(event.index,event.value);
    },
    observeNativeByte(event){
      if(!event||typeof event!=='object'||
         !Number.isInteger(event.physical)||event.physical<0||
         event.physical>=0x100000||!validByte(event.value))
        throw new Error('original 8086 physical VGA byte-write witness required');
      const address=event.physical;
      if(address<VRAM_PHYSICAL||address>=VRAM_END)return;
      if(observedWrites>=maxObservedWrites)
        throw new Error('VGA mode12 original-CPU write budget exceeded: fail closed');
      if(!isReady())
        throw new Error('VGA planar write requires exact observed GC06 graphics A000 planar aperture, mode0/mode2 GC01/03/05/08 and SEQ02: fail closed');
      // With full bitmask, rotate=0, and logical operation=replace, mode0
      // writes the CPU data byte unchanged to enabled planes. With mode2,
      // each AL bit expands to FFh/00h in one destination plane.
      const mode=gc.get(5);
      observedWrites++;
      if(mode===0)mode0Writes++;else mode2Writes++;
      const offset=address-VRAM_PHYSICAL;
      if(offset>=VISIBLE)return; // beyond visible 640x480, still raw VGA RAM
      visibleWrites++;
      const mask=seq.get(2)&15;
      let previouslyCovered=true;
      for(let p=0;p<4;p++)if(!validity[p][offset])previouslyCovered=false;
      for(let p=0;p<4;p++)if(mask&(1<<p)){
        planes[p][offset]=mode===0?event.value:((event.value&(1<<p))?255:0);
        validity[p][offset]=1;
      }
      if(!previouslyCovered&&validity.every(a=>a[offset]===1))
        fullyCoveredBytes++;
    },
    readSelectedPlaneByte(physical){
      // 8086 CPU VGA read mode 0 returns the byte from GC04's selected
      // physical plane, NOT the linear guest-RAM shadow of the last OUT/MOV.
      // Require an observed aperture/map, read mode and initialized bytes;
      // no guessed BIOS VGA baseline, latches, or mode-1 compare result.
      if(!Number.isInteger(physical)||physical<VRAM_PHYSICAL||
         physical>=VRAM_END)
        throw new RangeError('VGA planar read outside A0000-AFFFF aperture');
      const offset=physical-VRAM_PHYSICAL;
      if(offset>=VISIBLE)
        throw new Error('VGA planar read outside witnessed visible mode12 bytes: fail closed');
      const readMap=gc.get(4),graphicsMode=gc.get(5);
      if(!Number.isInteger(readMap)||readMap<0||readMap>3||
         !Number.isInteger(graphicsMode)||(graphicsMode&8)!==0||
         !mapsPlanarA000())
        throw new Error('VGA read requires observed GC04/GC05 read-mode0/GC06 A000 aperture: fail closed');
      if(!validity[readMap][offset])
        throw new Error('VGA read selected original plane byte is unverified: fail closed');
      return planes[readMap][offset];
    },
    readPixelIndex(x,y){
      if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||x>=WIDTH||y<0||y>=HEIGHT)
        throw new RangeError('VGA mode12 pixel coordinate outside 640x480');
      const offset=y*STRIDE+(x>>>3),mask=1<<(7-(x&7));
      let color=0;
      for(let p=0;p<4;p++){
        if(!validity[p][offset])return null; // unknown BIOS VRAM baseline
        if(planes[p][offset]&mask)color|=1<<p;
      }
      return color;
    },
    captureGroundedIndexedRect(x,y,width,height){
      // Unlike a full-frame claim, a rectangular comparison can use the
      // partial original OPEN.EXE CPU writes that are already verified.
      // All four VGA planes must be proven at every touched byte: a crop
      // may start/end in the middle of a byte, but unknown bits are never
      // filled with an assumed background color.
      if(![x,y,width,height].every(Number.isInteger)||x<0||y<0||
         width<1||height<1||x>=WIDTH||y>=HEIGHT||
         width>WIDTH-x||height>HEIGHT-y)
        throw new RangeError('VGA mode12 grounded rectangle outside 640x480');
      const firstByte=x>>>3,lastByte=(x+width-1)>>>3;
      for(let row=y;row<y+height;row++)
        for(let b=firstByte;b<=lastByte;b++)
          for(let p=0;p<4;p++)
            if(!validity[p][row*STRIDE+b])
              throw new Error('VGA mode12 rectangle has an unverified original plane byte: fail closed');
      const indices=new Uint8Array(width*height);
      for(let row=0;row<height;row++)
        for(let col=0;col<width;col++){
          const offset=(y+row)*STRIDE+((x+col)>>>3),bit=1<<(7-((x+col)&7));
          let color=0;
          for(let p=0;p<4;p++)if(planes[p][offset]&bit)color|=1<<p;
          indices[row*width+col]=color;
        }
      return indices; // owned copy; never expose mutable evidence planes
    },
    captureCompleteIndexedFrame(){
      if(fullyCoveredBytes!==VISIBLE)
        throw new Error('VGA mode12 not every pixel is grounded by native CPU writes');
      const indices=new Uint8Array(WIDTH*HEIGHT);
      for(let y=0;y<HEIGHT;y++){
        for(let x=0;x<WIDTH;x++){
          const offset=y*STRIDE+(x>>>3),mask=1<<(7-(x&7));
          let color=0;
          for(let p=0;p<4;p++)if(planes[p][offset]&mask)color|=1<<p;
          indices[y*WIDTH+x]=color;
        }
      }
      return indices;
    },
    getState:snapshot
  });
}
