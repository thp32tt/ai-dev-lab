import { decodeLS11 } from "./ls11.js";
import { readGraphRecords, decodeGraphRecord } from "./graph-format.js";

export const UW2_OPENING_PALETTE = Object.freeze([
  [0,0,0], [0,43,204], [204,43,0], [204,85,153],
  [0,170,102], [0,170,255], [243,162,97], [243,227,211],
  [113,113,146], [162,162,195], [211,113,65], [0,97,195],
  [0,97,97], [113,81,97], [162,113,81], [0,65,178],
]);

const TICK_MS = 1000 / 60;

export const OPENING_FIDELITY_POLICY = Object.freeze({
  defaultMode: "reverse-engineered-only",
  approximatePlaybackOptIn: "openingApprox=1",
  exactReplayReady: false,
  reason: "OPEN.EXE scene blit/copy/timing transcript is not fully closed yet",
});

export function decodeOpeningArchive(arrayBuffer) {
  const archive = decodeLS11(arrayBuffer);
  const parts = archive.decoded.map((part, partIndex) => ({
    partIndex,
    records: readGraphRecords(part.data).map((record, recordIndex) => ({
      partIndex,
      recordIndex,
      ...decodeGraphRecord(record),
    })),
  }));
  return {
    magic: archive.magic,
    parts,
    recordCount: parts.reduce((n, p) => n + p.records.length, 0),
  };
}

export function flattenOpening(opening) {
  return opening.parts.flatMap(p => p.records);
}

function imageCanvas(image, transparentZero = false, palette = UW2_OPENING_PALETTE) {
  const c = document.createElement("canvas");
  c.width = image.width;
  c.height = image.height;
  const x = c.getContext("2d");
  const rgba = new Uint8ClampedArray(image.indices.length * 4);
  for (let i = 0; i < image.indices.length; i++) {
    const idx = image.indices[i];
    const p = i * 4;
    const col = palette[idx] ?? [0,0,0];
    rgba[p] = col[0];
    rgba[p + 1] = col[1];
    rgba[p + 2] = col[2];
    rgba[p + 3] = transparentZero && idx === 0 ? 0 : 255;
  }
  x.putImageData(new ImageData(rgba, image.width, image.height), 0, 0);
  return c;
}

export function drawOpeningFit(ctx, image, x, y, w, h, opts = {}) {
  const src = imageCanvas(image, !!opts.transparentZero, opts.palette ?? UW2_OPENING_PALETTE);
  const scale = opts.noUpscale
    ? Math.min(1, w / image.width, h / image.height)
    : Math.min(w / image.width, h / image.height);
  const dw = Math.max(1, Math.round(image.width * scale));
  const dh = Math.max(1, Math.round(image.height * scale));
  const dx = Math.round(x + (w - dw) / 2);
  const dy = Math.round(y + (h - dh) / 2);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, dx, dy, dw, dh);
  return { dx, dy, dw, dh };
}

export function drawOpeningNative(ctx, image, x, y, opts = {}) {
  const src = imageCanvas(image, !!opts.transparentZero, opts.palette ?? UW2_OPENING_PALETTE);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, Math.round(x), Math.round(y));
  return { dx: Math.round(x), dy: Math.round(y), dw: image.width, dh: image.height };
}

export function chooseTitleLikeRecord(opening) {
  const korean = opening?.parts?.[0]?.records?.[10];
  if (korean?.width === 640 && korean?.height === 128) return korean;
  const all = flattenOpening(opening);
  return all.find(x => x.width === 640 && x.height === 128)
      ?? all.find(x => x.width === 640)
      ?? all[0]
      ?? null;
}

export function chooseOpeningGallery(opening, limit = 12) {
  const all = flattenOpening(opening);
  const large = all.filter(x => x.width * x.height >= 20000 && x.height >= 80);
  return (large.length ? large : all).slice(0, limit);
}

function getRecord(opening, part, record) {
  const image = opening?.parts?.[part]?.records?.[record];
  if (!image) throw new Error(`opening record missing part ${part} record ${record}`);
  return image;
}

function sleep(ms, signal) {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    if (!signal) return;
    const abort = () => {
      clearTimeout(id);
      reject(new DOMException("Aborted", "AbortError"));
    };
    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });
  });
}

function clear(ctx, canvas) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function centerNative(ctx, image, canvas, transparentZero = false, oy = 0) {
  return drawOpeningNative(
    ctx,
    image,
    Math.round((canvas.width - image.width) / 2),
    Math.round((canvas.height - image.height) / 2 + oy),
    { transparentZero },
  );
}

function ref(part, records) {
  return { part, records: Array.isArray(records) ? records : [records] };
}

/*
 * Korean OPEN.EXE authoritative scene table:
 * DS:0740, 12 near pointers:
 * 5152,5390,588D,5B4B,5FA2,6433,67C5,6BD5,6FF2,73D3,75F1,7B2C.
 *
 * The sources below are traced from the actual 0x18493 LS11-part loads and
 * 0x14E58 GRAPH record lookups in the user's Korean OPEN.EXE. Part 13 stays
 * resident as the shared story-caption pack.
 */
export const KOREAN_OPENING_SCENE_PLAN = Object.freeze([
  {
    scene: 0,
    name: "KOEI / REKOEITION credits",
    sources: [ref(0, [0,1,3,4,2])],
    ticks: 445,
  },
  {
    scene: 1,
    name: "대항해시대 II title reveal",
    sources: [ref(0, [5,6,7,8,9,11,12,13,14,15,10])],
    ticks: 330,
  },
  {
    scene: 2,
    name: "sea panorama",
    sources: [ref(13,0), ref(1,[0,1]), ref(2,[0,1])],
    ticks: 440,
  },
  {
    scene: 3,
    name: "Otto Spinola",
    sources: [ref(13,1), ref(3,[5,0,1,2,3,4,6,7,8,9,10])],
    ticks: 360,
  },
  {
    scene: 4,
    name: "Catalina Erantzo",
    sources: [ref(13,2), ref(4,[0,1,2,3,4,5,6,7])],
    ticks: 360,
  },
  {
    scene: 5,
    name: "Ernst von Bohr",
    sources: [ref(13,3), ref(5,[0,1,2,3,4,5,6,7])],
    ticks: 360,
  },
  {
    scene: 6,
    name: "Pietro Conti",
    sources: [ref(13,4), ref(6,[0,1,2,3,4,5,6,7])],
    ticks: 360,
  },
  {
    scene: 7,
    name: "Ali Vezas",
    sources: [ref(13,5), ref(7,[0,1,2,3,4,5,6,7])],
    ticks: 360,
  },
  {
    scene: 8,
    name: "lovers / story",
    sources: [ref(13,6), ref(8,[5,0,1,2,3,4,6,7,8,9,10,11,12,13,14])],
    ticks: 390,
  },
  {
    scene: 9,
    name: "antagonist plot",
    sources: [ref(13,7), ref(9,[10,0,1,2,3,4,5,6,7,8,9])],
    ticks: 340,
  },
  {
    scene: 10,
    name: "João Ferrero",
    sources: [
      ref(13,8),
      ref(10,[0,1,2,3,4]),
      ref(3,[0,1,2,3,4]),
      ref(11,[1,0]),
      ref(12,1),
      ref(13,9),
    ],
    ticks: 672,
  },
  {
    scene: 11,
    name: "boarding / closing",
    sources: [ref(12,0)],
    ticks: 258,
  },
]);

export const KOREAN_OPENING_UNUSED_RECORDS = Object.freeze([]);

function drawCaption(ctx, canvas, opening, record) {
  const copy = getRecord(opening, 13, record);
  const x = Math.max(4, Math.round((canvas.width - copy.width) / 2));
  const y = Math.max(4, canvas.height - copy.height - 6);
  drawOpeningNative(ctx, copy, x, y, { transparentZero: true });
}

function pixelMatchPosition(base, overlay) {
  if (!base || !overlay || overlay.width > base.width || overlay.height > base.height) return null;
  let best = null;
  // Small overlays are eyes/sparkles. Ignore black pixels and sample every second
  // pixel for speed; the location is cached by callers.
  for (let y = 0; y <= base.height - overlay.height; y += 2) {
    for (let x = 0; x <= base.width - overlay.width; x += 2) {
      let match = 0;
      let count = 0;
      for (let oy = 0; oy < overlay.height; oy += 2) {
        const bo = (y + oy) * base.width + x;
        const oo = oy * overlay.width;
        for (let ox = 0; ox < overlay.width; ox += 2) {
          const v = overlay.indices[oo + ox];
          if (v === 0) continue;
          count++;
          if (base.indices[bo + ox] === v) match++;
        }
      }
      if (!count) continue;
      const score = match / count;
      if (!best || score > best.score) best = { x, y, score };
    }
  }
  return best;
}

const overlayPositionCache = new Map();
function drawMatchedOverlay(ctx, basePlacement, base, overlay, fallbackX, fallbackY) {
  const key = `${base.partIndex}:${base.recordIndex}/${overlay.partIndex}:${overlay.recordIndex}`;
  let pos = overlayPositionCache.get(key);
  if (pos === undefined) {
    pos = pixelMatchPosition(base, overlay);
    overlayPositionCache.set(key, pos ?? null);
  }
  const x = pos && pos.score >= 0.2 ? basePlacement.x + pos.x : fallbackX;
  const y = pos && pos.score >= 0.2 ? basePlacement.y + pos.y : fallbackY;
  drawOpeningNative(ctx, overlay, x, y, { transparentZero: true });
}

function placeCentered(ctx, canvas, image, y = null, transparentZero = false) {
  const x = Math.round((canvas.width - image.width) / 2);
  const py = y == null ? Math.round((canvas.height - image.height) / 2) : y;
  drawOpeningNative(ctx, image, x, py, { transparentZero });
  return { x, y: py };
}

function drawProfileExact(ctx, canvas, opening, cfg, elapsed, durationMs) {
  clear(ctx, canvas);
  const part = cfg.part;
  const progress = Math.min(0.999, elapsed / Math.max(1, durationMs));

  // OPEN.EXE first animates the small motif/sparkle records, then reveals the
  // large story frame, portrait and eye-blink overlays.
  if (progress < 0.20 && cfg.intro?.length) {
    const n = cfg.intro[Math.floor(elapsed / 120) % cfg.intro.length];
    const image = getRecord(opening, part, n);
    placeCentered(ctx, canvas, image, Math.round((canvas.height - image.height) / 2), true);
    drawCaption(ctx, canvas, opening, cfg.caption);
    return;
  }

  const mainRecord = cfg.mainAlt && progress > 0.62 ? cfg.mainAlt : cfg.main;
  const main = getRecord(opening, part, mainRecord);
  const mainX = Math.round((canvas.width - main.width) / 2);
  const mainY = Math.max(4, Math.round((300 - main.height) / 2));
  drawOpeningNative(ctx, main, mainX, mainY);

  if (cfg.portrait != null && progress > 0.42) {
    const portrait = getRecord(opening, part, cfg.portrait);
    if (portrait.recordIndex !== mainRecord) {
      const px = cfg.portraitSide === "right"
        ? canvas.width - portrait.width - 18
        : 18;
      const py = Math.max(8, 286 - portrait.height);
      drawOpeningNative(ctx, portrait, px, py, { transparentZero: true });
    }
  }

  if (cfg.eye?.length && progress > 0.48) {
    const eye = getRecord(opening, part, cfg.eye[Math.floor(elapsed / 180) % cfg.eye.length]);
    drawMatchedOverlay(
      ctx,
      { x: mainX, y: mainY },
      main,
      eye,
      mainX + Math.round((main.width - eye.width) / 2),
      mainY + Math.round(main.height * 0.35),
    );
  }

  if (cfg.extraEyeGroups?.length && progress > 0.55) {
    for (let g = 0; g < cfg.extraEyeGroups.length; g++) {
      const group = cfg.extraEyeGroups[g];
      const eye = getRecord(opening, part, group[Math.floor(elapsed / 210 + g) % group.length]);
      drawMatchedOverlay(
        ctx,
        { x: mainX, y: mainY },
        main,
        eye,
        mainX + 30 + g * 90,
        mainY + 70 + g * 28,
      );
    }
  }

  drawCaption(ctx, canvas, opening, cfg.caption);
}

function drawSeaPanorama(ctx, canvas, opening, elapsed) {
  clear(ctx, canvas);
  const frame = Math.floor(elapsed / 700) & 1;
  drawOpeningNative(ctx, getRecord(opening, 1, frame), 0, 0);
  drawOpeningNative(ctx, getRecord(opening, 2, frame), frame ? 320 : 0, 200);
  drawOpeningNative(ctx, getRecord(opening, 2, frame ^ 1), frame ? 0 : 320, 200);
  drawCaption(ctx, canvas, opening, 0);
}

function drawOtto(ctx, canvas, opening, elapsed, duration) {
  drawProfileExact(ctx, canvas, opening, {
    part: 3,
    caption: 1,
    intro: [5,0,1,2,3,4],
    main: 6,
    portrait: 7,
    portraitSide: "right",
    eye: [8,9,10],
  }, elapsed, duration);
}

const STORY_CONFIG = Object.freeze({
  4: { part:4, caption:2, intro:[0,1,2], main:3, mainAlt:4, eye:[5,6,7] },
  5: { part:5, caption:3, intro:[0,1,2], main:3, mainAlt:4, eye:[5,6,7] },
  6: { part:6, caption:4, intro:[0,1,2], main:3, mainAlt:4, eye:[5,6,7] },
  7: { part:7, caption:5, intro:[0,1,2], main:3, mainAlt:4, eye:[5,6,7] },
  8: {
    part:8, caption:6, intro:[0,1,2,3,4], main:5,
    eye:[6,7,8], extraEyeGroups:[[9,10,11],[12,13,14]],
  },
  9: { part:9, caption:7, intro:[0,1,2,3,4], main:10, eye:[5,6,7,8,9] },
});

function drawJoao(ctx, canvas, opening, elapsed, durationMs) {
  const p = elapsed / Math.max(1, durationMs);
  clear(ctx, canvas);

  if (p < 0.20) {
    const star = getRecord(opening, 3, Math.floor(elapsed / 120) % 5);
    placeCentered(ctx, canvas, star, 100, true);
    drawCaption(ctx, canvas, opening, 8);
    return;
  }

  if (p < 0.72) {
    const main = getRecord(opening, 10, p > 0.56 ? 4 : 0);
    const x = Math.round((canvas.width - main.width) / 2);
    const y = Math.max(8, Math.round((300 - main.height) / 2));
    drawOpeningNative(ctx, main, x, y);
    if (p < 0.56) {
      const eye = getRecord(opening, 10, 1 + (Math.floor(elapsed / 190) % 3));
      drawMatchedOverlay(ctx, {x,y}, main, eye, x + 80, y + 50);
    }
    drawCaption(ctx, canvas, opening, 8);
    return;
  }

  // Scene 10 itself preloads and displays the first boarding frames before
  // scene 11 continues with part12 record0.
  if (p < 0.86) {
    drawOpeningNative(ctx, getRecord(opening, 11, 1), 0, 0);
    const b = getRecord(opening, 12, 1);
    drawOpeningNative(ctx, b, Math.round((canvas.width - b.width) / 2), 200, { transparentZero:true });
  } else {
    drawOpeningNative(ctx, getRecord(opening, 11, 0), 0, 0);
    drawCaption(ctx, canvas, opening, 9);
  }
}

function drawBoardingClose(ctx, canvas, opening, elapsed, durationMs) {
  clear(ctx, canvas);
  const image = getRecord(opening, 12, 0);
  const p = Math.min(1, elapsed / Math.max(1, durationMs));
  // OPEN.EXE alternates/copies the 256x200 boarding image through two work
  // buffers. A small horizontal approach preserves that visible motion without
  // inventing extra OPGRAPH records.
  const startX = canvas.width;
  const endX = Math.round((canvas.width - image.width) / 2);
  const x = Math.round(startX + (endX - startX) * Math.min(1, p * 2.2));
  drawOpeningNative(ctx, image, x, 100);
}

export class KoreanOpeningPlayer {
  constructor(opening, canvas, {
    onScene = null,
    onFinish = null,
    onCycle = null,
    speed = 1,
    loop = false,
    allowApproximate = false,
  } = {}) {
    this.opening = opening;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.onScene = onScene;
    this.onFinish = onFinish;
    this.onCycle = onCycle;
    this.speed = Math.max(0.05, Number(speed) || 1);
    this.loop = !!loop;
    this.allowApproximate = !!allowApproximate;
    this.controller = null;
    this.playing = false;
    this.sceneIndex = -1;
    this.cycle = 0;
  }

  stop() {
    if (this.controller) this.controller.abort();
    this.controller = null;
    this.playing = false;
  }

  async waitTicks(ticks, signal) {
    await sleep(ticks * TICK_MS / this.speed, signal);
  }

  async playCredits(scene, signal) {
    const seq = scene.sources[0].records;
    const waits = [105,85,85,85,85];
    for (let i = 0; i < seq.length; i++) {
      clear(this.ctx, this.canvas);
      centerNative(this.ctx, getRecord(this.opening, 0, seq[i]), this.canvas);
      await this.waitTicks(waits[i] ?? 85, signal);
    }
  }

  async playTitle(scene, signal) {
    // Exact Korean record lookup order from scene function 0x5390:
    // 5,6,7,8,9, then 11..15, then 10.
    const staticSeq = [5,6,7,8,9];
    const holds = [32,18,32,38,44];
    for (let i=0;i<staticSeq.length;i++) {
      clear(this.ctx, this.canvas);
      centerNative(this.ctx, getRecord(this.opening,0,staticSeq[i]), this.canvas);
      await this.waitTicks(holds[i], signal);
    }

    // Five 32x32 twinkle records are actually used in this Korean build.
    const base = getRecord(this.opening,0,8);
    const roman = getRecord(this.opening,0,9);
    for (let pass=0;pass<3;pass++) {
      for (let i=0;i<5;i++) {
        clear(this.ctx, this.canvas);
        const bp = centerNative(this.ctx, base, this.canvas);
        drawOpeningNative(
          this.ctx,
          roman,
          Math.round((this.canvas.width - roman.width)/2),
          Math.round(bp.dy + base.height - 34),
          {transparentZero:true},
        );
        const twinkle=getRecord(this.opening,0,11+i);
        const tx=210+i*44;
        const ty=112+((i+pass)&1)*22;
        drawOpeningNative(this.ctx,twinkle,tx,ty,{transparentZero:true});
        await this.waitTicks(4,signal);
      }
    }

    clear(this.ctx,this.canvas);
    centerNative(this.ctx,getRecord(this.opening,0,10),this.canvas);
    await this.waitTicks(105,signal);
  }

  async animateScene(scene, signal) {
    const durationMs = scene.ticks * TICK_MS / this.speed;
    const start = performance.now();
    while (true) {
      const now=performance.now();
      const realElapsed=now-start;
      const logicalElapsed=realElapsed*this.speed;

      if (scene.scene===2) {
        drawSeaPanorama(this.ctx,this.canvas,this.opening,logicalElapsed);
      } else if (scene.scene===3) {
        drawOtto(this.ctx,this.canvas,this.opening,logicalElapsed,scene.ticks*TICK_MS);
      } else if (scene.scene>=4 && scene.scene<=9) {
        drawProfileExact(
          this.ctx,this.canvas,this.opening,STORY_CONFIG[scene.scene],
          logicalElapsed,scene.ticks*TICK_MS,
        );
      } else if (scene.scene===10) {
        drawJoao(this.ctx,this.canvas,this.opening,logicalElapsed,scene.ticks*TICK_MS);
      } else if (scene.scene===11) {
        drawBoardingClose(this.ctx,this.canvas,this.opening,logicalElapsed,scene.ticks*TICK_MS);
      }

      if (realElapsed>=durationMs) break;
      await sleep(Math.min(40,Math.max(1,durationMs-realElapsed)),signal);
    }
  }

  async playOneCycle(signal) {
    for (const scene of KOREAN_OPENING_SCENE_PLAN) {
      this.sceneIndex=scene.scene;
      this.onScene?.(scene,this.cycle);
      if (scene.scene===0) await this.playCredits(scene,signal);
      else if (scene.scene===1) await this.playTitle(scene,signal);
      else await this.animateScene(scene,signal);
    }
  }

  drawFinalTitle() {
    clear(this.ctx,this.canvas);
    const title=chooseTitleLikeRecord(this.opening);
    if (title) centerNative(this.ctx,title,this.canvas,false,-18);
  }

  async play() {
    if (!this.allowApproximate) {
      this.stop();
      clear(this.ctx, this.canvas);
      this.playing = false;
      this.sceneIndex = -1;
      this.onScene?.({
        scene: -1,
        name: "OPEN.EXE exact replay pending",
        sources: [],
        fidelity: "blocked-unverified",
      }, this.cycle);
      this.onFinish?.({ fidelity: "blocked-unverified" });
      return;
    }

    this.stop();
    this.controller=new AbortController();
    const {signal}=this.controller;
    this.playing=true;
    this.cycle=0;
    try {
      do {
        await this.playOneCycle(signal);
        this.cycle++;
        this.onCycle?.(this.cycle);
      } while (this.loop && !signal.aborted);
      this.onFinish?.();
    } catch(err) {
      if (err?.name!=="AbortError") throw err;
    } finally {
      if (this.controller?.signal===signal) this.controller=null;
      this.playing=false;
    }
  }
}