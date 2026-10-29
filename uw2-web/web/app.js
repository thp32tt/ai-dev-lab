import { parseOffsetTextTable, parseMenuTable, parseSaveSlots, parseKoreanPortTable, stripMenuControls } from "./binary.js";
import { ReaGameRuntime } from "./runtime.js";
import { decodeLS11 } from "./ls11.js";
import { decodePlanarIndexed, drawIndexedCanvas } from "./koei-image.js";
import { decodePortAssets, renderPortMapToCanvas, renderPortViewport, renderTownView } from "./port-map.js";
import {
  decodeOpeningArchive,
  chooseTitleLikeRecord,
  chooseOpeningGallery,
  drawOpeningFit,
  KoreanOpeningPlayer,
  KOREAN_OPENING_SCENE_PLAN,
} from "./opening.js";
import { readGraphRecords, decodeGraphRecord, graphIndicesToRgba, UW2_APPROX_PALETTE } from "./graph-format.js";
import {
  parsePortDoors,
  PortWalkingRuntime,
  BUILDING_MENU_INDEX,
} from "./town.js";
import {
  decodeWorldAssets,
  findNearestSea,
  renderSeaView,
  findPortCallTarget,
  SeaRuntime,
} from "./world-map.js";
import { decodeKoreanChar, drawHeroSprite, drawFolkSprite, folkFrameIndex } from "./char.js";
import { parseWindCur, FLOW_DIR_NAMES } from "./windcur.js";
import { D2MusicPlayer } from "./music.js";
import { parseUw2Fonts, drawUw2Text } from "./font.js";
import { UI_LAYOUT, UI_GRAPH_RECORD } from "./ui-layout.js";
import {
  pubSpecialty,
  initialPubEnthusiasm,
  pubTreatMaximum,
  pubTreat,
  pubRecruitOffer,
  hireCrew,
  dismissCrew,
} from "./pub.js";
import {
  GOODS_CATEGORY_NAMES,
  decodeMarketAssets,
  currentPortMarket,
  buyGoods,
  sellGoods,
  carriedGoodsRows,
} from "./market.js";
import {
  bankCreditLine,
  bankDepositMaximum,
  bankWithdrawMaximum,
  bankBorrowMaximum,
  bankRepayMaximum,
  bankDeposit,
  bankWithdraw,
  bankBorrow,
  bankRepay,
  applyMonthlyBankInterest,
  applyBankInterestCrossings,
} from "./bank.js";
import {
  ITEM_TYPES,
  itemShopMode,
  itemShopStock,
  carriedItems,
  itemBuyStatus,
  buyItem,
  itemSellStatus,
  sellItem,
  itemCounterOffer,
} from "./item-shop.js";
import {
  RESOURCE_KEYS,
  RESOURCE_NAMES,
  harborSupplyPrices,
  shipCargoUsed,
  shipCargoFree,
  maxSupplyLoad,
  resourceUnitsAboard,
  loadSupply,
  unloadSupply,
  harborDepartureStatus,
  consumeDepartureDay,
  advanceDateTicks,
  lodgeCheckIn,
  buildingVisitTicks,
} from "./buildings.js";

const $ = (id) => document.getElementById(id);
const canvas = $("screen");
const ctx = canvas.getContext("2d");

let slots = [];
let selected = null;
let menus = [];
let menuDefs = [];
let messages = [];
let saveBuffer = null;
let runtime = null;
let viewMode = "loading";
let kaoPortraits = [];
let portAssets = null;
let openingData = null;
let openingTitle = null;
let openingPlayer = null;
let portDoors = null;
let townRuntime = null;
let buildingImages = [];
let uiGraph = null;
const uiCanvasCache = new WeakMap();
const UI_VIEW_X = UI_LAYOUT.viewport.x;
const UI_VIEW_Y = UI_LAYOUT.viewport.y;
const UI_VIEW_SIZE = UI_LAYOUT.viewport.w;
let worldAssets = null;
let marketAssets = null;
let seaRuntime = null;
let charAssets = null;
let windCur = null;
let portCatalog = [];
let buildingUi = null;
let musicPlayer = null;
let fontAssets = null;
let musicMode = null;
let musicAutostartPending = true;
let seaAutoTimer = null;
let seaAutoActive = false;

const MUSIC_TRACK_BY_MODE = Object.freeze({
  opening: 0,
  town: 19,
  sea: 21,
  runtime: 19,
  preview: 0,
});

function controllerMusicState() {
  return musicPlayer?.state() ?? {
    supported: false,
    loaded: false,
    songCount: 0,
    track: 0,
    playing: false,
  };
}

function publishControllerState(extra = {}) {
  const nearbyPort = viewMode === "sea" && seaRuntime && portCatalog.length
    ? (findPortCallTarget(seaRuntime.snapshot(), portCatalog)?.name ?? null)
    : null;
  const detail = {
    mode: viewMode,
    autoSail: seaAutoActive,
    nearbyPort,
    music: controllerMusicState(),
    ...extra,
  };
  window.__uw2MusicState = () => controllerMusicState();
  window.__uw2SeaState = () => seaRuntime?.snapshot?.() ?? null;
  window.__uw2VoyageState = () => ({
    sea: seaRuntime?.snapshot?.() ?? null,
    dateTime: selected?.dateTime ? { ...selected.dateTime } : null,
    fleet: selected?.fleet ? structuredClone(selected.fleet) : null,
    lastSeaProvisionDate: selected?.lastSeaProvisionDate ?? null,
  });
  window.dispatchEvent(new CustomEvent("uw2-game-state", { detail }));
}

function setMusicForMode(mode = viewMode, force = false) {
  if (!musicPlayer?.songCount) {
    publishControllerState();
    return;
  }
  if (!force && musicMode === mode) {
    publishControllerState();
    return;
  }
  musicMode = mode;
  const track = MUSIC_TRACK_BY_MODE[mode] ?? MUSIC_TRACK_BY_MODE.town;
  musicPlayer.setTrack(track);
  if (musicPlayer.desiredPlaying) {
    musicPlayer.unlock().then(publishControllerState).catch(() => publishControllerState());
  } else {
    publishControllerState();
  }
}

async function loadMusicSupport() {
  const buf = await loadBuffer("D2.MML");
  let manifest = null;
  try {
    const res = await fetch("./generated/music/manifest.json", { cache: "no-store" });
    if (res.ok) manifest = await res.json();
  } catch {}
  musicPlayer = new D2MusicPlayer({ volume: 0.65, manifest });
  const parsed = musicPlayer.load(buf);
  setMusicForMode(viewMode, true);
  return parsed;
}
function tryAutostartMusic(event) {
  if (!musicAutostartPending || !musicPlayer?.songCount) return;
  if (event?.target?.closest?.("[data-action=\"sound\"]")) return;
  musicAutostartPending = false;
  const track = MUSIC_TRACK_BY_MODE[viewMode] ?? MUSIC_TRACK_BY_MODE.town;
  musicMode = viewMode;
  musicPlayer.play(track).then(publishControllerState).catch(() => publishControllerState());
}

window.addEventListener("pointerdown", tryAutostartMusic, { capture: true });
window.addEventListener("keydown", tryAutostartMusic, { capture: true });

function stopSeaAuto(reason = null) {
  if (seaAutoTimer) clearInterval(seaAutoTimer);
  seaAutoTimer = null;
  seaAutoActive = false;
  if (reason && seaRuntime) seaRuntime.lastEvent = reason;
  publishControllerState();
}

function toggleSeaAuto() {
  if (viewMode !== "sea" || !seaRuntime) {
    publishControllerState();
    return false;
  }
  if (seaAutoActive) {
    stopSeaAuto("auto-stop");
    renderSeaScreen();
    return false;
  }
  seaAutoActive = true;
  publishControllerState();
  seaAutoTimer = setInterval(() => {
    if (viewMode !== "sea" || !seaRuntime) {
      stopSeaAuto();
      return;
    }
    tickSeaWithBankInterest();
    const snap = seaRuntime.snapshot();
    if (snap.lastEvent === "coast-block") {
      stopSeaAuto("auto-coast-block");
    }
    renderSeaScreen();
  }, 220);
  renderSeaScreen();
  return true;
}

function graphImageCanvas(image) {
  if (!image) return null;
  let c = uiCanvasCache.get(image);
  if (c) return c;
  c = document.createElement("canvas");
  c.width = image.width; c.height = image.height;
  const g = c.getContext("2d");
  const rgba = graphIndicesToRgba(image.indices, UW2_APPROX_PALETTE);
  g.putImageData(new ImageData(rgba, image.width, image.height), 0, 0);
  uiCanvasCache.set(image, c);
  return c;
}

function drawOriginalGraph(image, x, y, w = image?.width, h = image?.height) {
  const src = graphImageCanvas(image);
  if (!src) return false;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, x, y, w, h);
  ctx.restore();
  return true;
}

function drawOriginalSceneFrame(scene) {
  const frame = scene === "sea" ? uiGraph?.sea : uiGraph?.town;
  if (!drawOriginalGraph(frame, 0, 0, 640, 400)) {
    ctx.fillStyle = "#05070b"; ctx.fillRect(0, 0, 640, 400);
  }
}

function drawOriginalParchment(x, y, w = 368, h = 152) {
  const src = graphImageCanvas(uiGraph?.dialogue);
  if (!src) {
    ctx.fillStyle = "#f0dfc0"; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#996c25"; ctx.strokeRect(x, y, w, h);
    return;
  }
  const sw = src.width, sh = src.height, c = 16;
  const dw = Math.min(c, Math.floor(w / 3));
  const dh = Math.min(c, Math.floor(h / 3));
  ctx.save(); ctx.imageSmoothingEnabled = false;
  const parts = [
    [0,0,c,c, x,y,dw,dh], [c,0,sw-2*c,c, x+dw,y,w-2*dw,dh], [sw-c,0,c,c, x+w-dw,y,dw,dh],
    [0,c,c,sh-2*c, x,y+dh,dw,h-2*dh], [c,c,sw-2*c,sh-2*c, x+dw,y+dh,w-2*dw,h-2*dh], [sw-c,c,c,sh-2*c, x+w-dw,y+dh,dw,h-2*dh],
    [0,sh-c,c,c, x,y+h-dh,dw,dh], [c,sh-c,sw-2*c,c, x+dw,y+h-dh,w-2*dw,dh], [sw-c,sh-c,c,c, x+w-dw,y+h-dh,dw,dh],
  ];
  for (const p of parts) ctx.drawImage(src, ...p);
  ctx.restore();
}

function drawOriginalPanelText(text, x, y, opts = {}) {
  if (fontAssets) {
    return drawUw2Text(ctx, fontAssets, String(text ?? ""), x, y - 14, {
      color: opts.color ?? "#2b1a0e",
      lineHeight: opts.lineHeight ?? 18,
    });
  }
  ctx.save();
  ctx.fillStyle = opts.color ?? "#2b1a0e";
  ctx.font = `${opts.bold ? "bold " : ""}${opts.size ?? 15}px "Malgun Gothic", sans-serif`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(String(text ?? ""), x, y);
  ctx.restore();
  return null;
}

function drawOriginalDatePanel(date, label = "") {
  if (!date) return;
  drawOriginalPanelText(`${date.year}.${date.month}.${date.day}`, 505, 26, {size:12,bold:true});
  drawOriginalPanelText(`${String(date.hour).padStart(2,"0")}:${String(date.minute).padStart(2,"0")}`, 555, 45, {size:11});
  if (label) drawOriginalPanelText(label, 500, 65, {size:11,bold:true});
}

function advanceSelectedDateTicks(ticks) {
  if (!selected?.dateTime) return [];
  const before={...selected.dateTime};
  advanceDateTicks(selected.dateTime,ticks);
  const events=applyBankInterestCrossings(selected,before,selected.dateTime);
  if(events.length) selected.lastBankInterest=events.at(-1);
  return events;
}

function lodgeSelected() {
  if (!selected?.dateTime) return [];
  const before={...selected.dateTime};
  lodgeCheckIn(selected.dateTime);
  const events=applyBankInterestCrossings(selected,before,selected.dateTime);
  if(events.length) selected.lastBankInterest=events.at(-1);
  return events;
}

function tickSeaWithBankInterest() {
  if (!seaRuntime) return false;
  const before=seaRuntime.snapshot();
  const moved=seaRuntime.move();
  const after=seaRuntime.snapshot();
  if(selected){
    selected.dateTime={...after.dateTime};
    const dayChanged =
      before.dateTime?.year !== after.dateTime?.year ||
      before.dateTime?.month !== after.dateTime?.month ||
      before.dateTime?.day !== after.dateTime?.day;
    if(dayChanged) {
      consumeDepartureDay(selected);
      selected.lastSeaProvisionDate = {
        year: after.dateTime.year,
        month: after.dateTime.month,
        day: after.dateTime.day,
      };
    }
    const events=applyBankInterestCrossings(selected,before.dateTime,after.dateTime);
    if(events.length) selected.lastBankInterest=events.at(-1);
  }
  return moved;
}

async function loadBuffer(name) {
  const res = await fetch("/game/" + encodeURIComponent(name), { cache: "no-store" });
  if (!res.ok) throw new Error(name + " HTTP " + res.status);
  return res.arrayBuffer();
}

function fmtBytes(n) {
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KiB";
  return (n / 1024 / 1024).toFixed(1) + " MiB";
}

function rows(items, mapper) {
  const box = document.createElement("div");
  box.className = "list";
  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "row";
    row.textContent = mapper(item);
    box.appendChild(row);
  });
  return box;
}

async function loadManifest() {
  const res = await fetch("/api/manifest", { cache: "no-store" });
  const data = await res.json();
  $("manifest-status").textContent = data.gameDirAvailable
    ? `${data.fileCount}개 원본 데이터 파일 사용 가능`
    : "원본 게임 디렉터리를 찾지 못했습니다.";
  $("manifest").replaceChildren(rows(data.files, x => `${x.name} · ${fmtBytes(x.size)}`));
}

async function loadTables() {
  const [menuBuf, msgBuf] = await Promise.all([
    loadBuffer("MENU.DAT"),
    loadBuffer("MESSAGE.DAT"),
  ]);
  menus = parseOffsetTextTable(menuBuf);
  menuDefs = parseMenuTable(menuBuf);
  messages = parseOffsetTextTable(msgBuf);
  $("menus").replaceChildren(rows(menus, x => `#${x.index}  ${stripMenuControls(x.text)}`));
  $("messages").replaceChildren(rows(messages.slice(0, 120), x => `#${x.index}  ${x.text.replace(/\n/g, " / ")}`));
}

async function loadOpeningGraphics() {
  const buf = await loadBuffer("OPGRAPH.LZW");
  openingData = decodeOpeningArchive(buf);
  openingTitle = chooseTitleLikeRecord(openingData);
  $("opening-button").disabled = !openingTitle;

  const gallery = $("opening-gallery");
  gallery.replaceChildren();
  const chosen = chooseOpeningGallery(openingData, 12);
  for (const image of chosen) {
    const fig = document.createElement("figure");
    fig.className = "opening-card";
    const c = document.createElement("canvas");
    c.width = 320;
    c.height = 180;
    const cctx = c.getContext("2d");
    cctx.fillStyle = "#000";
    cctx.fillRect(0, 0, c.width, c.height);
    drawOpeningFit(cctx, image, 0, 0, c.width, c.height);
    const cap = document.createElement("figcaption");
    cap.textContent = `part ${image.partIndex} / record ${image.recordIndex} · ${image.width}×${image.height}`;
    fig.append(c, cap);
    gallery.appendChild(fig);
  }
  $("opening-status").textContent =
    `${openingData.magic} · 한국어판 14 parts / ${openingData.recordCount} GRAPH records · OPEN.EXE 12-scene playback`;
}

function renderSelectedPortMap() {
  const portCanvas = $("portmap");
  if (!selected || !portAssets) return;
  if (selected.port === 0xff) {
    const pctx = portCanvas.getContext("2d");
    portCanvas.width = 384;
    portCanvas.height = 96;
    pctx.fillStyle = "#071522";
    pctx.fillRect(0, 0, portCanvas.width, portCanvas.height);
    pctx.fillStyle = "#e7edf5";
    pctx.font = "20px Malgun Gothic";
    pctx.fillText("현재 세이브는 해상 상태입니다.", 30, 55);
    $("portmap-status").textContent = "해상 상태 · 항구 맵 없음";
    return;
  }
  const info = renderPortMapToCanvas(portCanvas, portAssets, selected.port, 0.25);
  $("portmap-status").textContent =
    `PORT #${selected.port} ${selected.portName} · CHIP bank ${info.bankId} · 96×96 tiles / 1536×1536 px`;
}

async function loadFontSupport() {
  const [allFontBuf, hankakuBuf] = await Promise.all([
    loadBuffer("ALL_FONT.16P"),
    loadBuffer("HANKAKU.FNT"),
  ]);
  fontAssets = parseUw2Fonts(allFontBuf, hankakuBuf);
  return fontAssets;
}

async function loadCharacterSupport() {
  const charBuf = await loadBuffer("CHAR.LZW");
  charAssets = decodeKoreanChar(charBuf);
}

async function loadWorldSupport() {
  const [worldBuf, data1Buf, windBuf] = await Promise.all([
    loadBuffer("WORLDMAP.LZW"),
    loadBuffer("DATA1.LZW"),
    loadBuffer("WINDCUR.DAT"),
  ]);
  worldAssets = decodeWorldAssets(worldBuf, data1Buf);
  marketAssets = decodeMarketAssets(data1Buf);
  windCur = parseWindCur(windBuf);
}

async function loadTownSupport() {
  const [zaBuf, graphBuf] = await Promise.all([
    loadBuffer("ZA_DAT.DAT"),
    loadBuffer("GRAPH.DAT"),
  ]);
  portDoors = parsePortDoors(zaBuf);
  const records = readGraphRecords(new Uint8Array(graphBuf));
  buildingImages = records.slice(6, 18).map(decodeGraphRecord);
  uiGraph = {
    yesNo: decodeGraphRecord(records[UI_GRAPH_RECORD.yesNo]),
    sea: decodeGraphRecord(records[UI_GRAPH_RECORD.sea]),
    town: decodeGraphRecord(records[UI_GRAPH_RECORD.town]),
    dialogue: decodeGraphRecord(records[UI_GRAPH_RECORD.dialogue]),
    side: decodeGraphRecord(records[UI_GRAPH_RECORD.side]),
  };
}

async function loadPortMaps() {
  const [chipBuf, mapBuf, chipNoBuf] = await Promise.all([
    loadBuffer("PORTCHIP.LZW"),
    loadBuffer("PORTMAP.LZW"),
    loadBuffer("CHIP_NO.DAT"),
  ]);
  portAssets = decodePortAssets(chipBuf, mapBuf, chipNoBuf);
  $("portmap-status").textContent =
    `7 tile banks × 240 tiles · PORTMAP ${portAssets.maps.length}개 · CHIP_NO ${portAssets.chipNo.length}개`;
  renderSelectedPortMap();
}

function renderSlots() {
  const root = $("save-slots");
  root.replaceChildren();
  for (const slot of slots) {
    const btn = document.createElement("button");
    btn.className = "slot" + (slot.empty ? " empty" : "") +
      (selected?.index === slot.index ? " selected" : "");
    btn.disabled = slot.empty;
    btn.textContent = slot.empty
      ? `${slot.index + 1}. No data`
      : `${slot.index + 1}. ${slot.memo} · ${slot.portName} · ${slot.heroName} · ${slot.money.toLocaleString()} G${slot.ending ? " · END" : ""}`;
    btn.addEventListener("click", () => {
      selected = slot;
      if (saveBuffer && selected?.raw?.page != null) {
        portCatalog = parseKoreanPortTable(saveBuffer, selected.raw.page);
      }
      $("run-button").disabled = false;
      renderSlots();
      drawPreview(slot);
      renderSelectedPortMap();
    });
    root.appendChild(btn);
  }
}

async function loadPortraits() {
  const buf = await loadBuffer("KAO.LZW");
  const decoded = decodeLS11(buf, 16);
  const root = $("portraits");
  root.replaceChildren();

  kaoPortraits = decoded.decoded.map(entry =>
    decodePlanarIndexed(entry.data, 64, 80, 3, 1, true)
  );
  decoded.decoded.slice(0, 8).forEach((entry, i) => {
    const fig = document.createElement("figure");
    fig.className = "portrait";
    const c = document.createElement("canvas");
    const cap = document.createElement("figcaption");
    cap.textContent = `KAO #${i}`;
    drawIndexedCanvas(c, kaoPortraits[i], 64, 80, 2);
    fig.append(c, cap);
    root.appendChild(fig);
  });

  $("kao-status").textContent =
    `${decoded.magic} · FAT ${decoded.entries.length}개 · 16개 해제 / 첫 8개 표시 · 64×80/3bpp`;
  if (selected && viewMode === "preview") drawPreview(selected);
}

async function loadSaves() {
  const buf = await loadBuffer("KOUKAI2.DAT");
  saveBuffer = buf;
  slots = parseSaveSlots(buf);
  portCatalog = parseKoreanPortTable(buf, 0);
  $("save-status").textContent =
    `KOUKAI2.DAT ${fmtBytes(buf.byteLength)} · 슬롯당 33,340 bytes`;
  const first = slots.find(x => !x.empty);
  if (first) {
    selected = first;
    if (saveBuffer && selected?.raw?.page != null) {
      portCatalog = parseKoreanPortTable(saveBuffer, selected.raw.page);
    }
    $("run-button").disabled = false;
  }
  renderSlots();
  renderSelectedPortMap();
}

function drawFrame(title, lines) {
  ctx.fillStyle = "#071522";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#c9a95e";
  ctx.lineWidth = 3;
  ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);
  ctx.fillStyle = "#f1d58b";
  ctx.font = "bold 28px Malgun Gothic, sans-serif";
  ctx.fillText(title, 38, 62);
  ctx.font = "20px Malgun Gothic, sans-serif";
  ctx.fillStyle = "#e7edf5";
  lines.forEach((line, i) => ctx.fillText(line, 42, 108 + i * 32));
}

function drawHeroPortrait(slot) {
  const id = slot?.portraitIdCandidate;
  const indexed = Number.isInteger(id) ? kaoPortraits[id] : null;
  if (!indexed) return;
  const tmp = document.createElement("canvas");
  drawIndexedCanvas(tmp, indexed, 64, 80, 1);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, 0, 0, 64, 80, 478, 82, 128, 160);
  ctx.strokeStyle = "#c9a95e";
  ctx.strokeRect(477, 81, 130, 162);
}

function drawPreview(slot) {
  viewMode = "preview";
  if (runtime) runtime.pause();
  drawFrame("대항해시대 II", [
    `SAVE ${slot.index + 1}: ${slot.memo}`,
    `항구: ${slot.portName}`,
    `주인공: ${slot.heroName}`,
    `소지금: ${slot.money.toLocaleString()} G`,
    `얼굴 후보 ID: ${slot.portraitIdCandidate}`,
    "원본 MENU / MESSAGE / KAO / PORTMAP 로드",
  ]);
  drawHeroPortrait(slot);
  $("runtime-status").textContent = "세이브 미리보기";
}

function drawOpeningTitleHold(reason = "complete") {
  if (!openingTitle) return;
  viewMode = "opening-title";
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawOpeningFit(ctx, openingTitle, 0, 0, canvas.width, canvas.height, { noUpscale: true });
  $("runtime-status").textContent =
    reason === "skip" ? "오프닝 건너뜀 · 타이틀" : "오프닝 완료 · 타이틀";
  $("debug").textContent = JSON.stringify({
    view: "opening-title",
    reason,
    scenes: KOREAN_OPENING_SCENE_PLAN.length,
    parts: openingData?.parts?.length ?? 0,
    records: openingData?.recordCount ?? 0,
    title: {
      part: openingTitle.partIndex,
      record: openingTitle.recordIndex,
      width: openingTitle.width,
      height: openingTitle.height,
    },
  }, null, 2);
}

function stopOpening(showTitle = false) {
  if (openingPlayer) openingPlayer.stop();
  if (showTitle && openingTitle) drawOpeningTitleHold("skip");
}

function startOpeningPlayback() {
  if (!openingData || !openingTitle) return;
  if (runtime) runtime.pause();
  if (openingPlayer) openingPlayer.stop();

  viewMode = "opening";
  setMusicForMode("opening");
  publishControllerState();
  const openingSpeed = Math.max(0.05, Number(new URLSearchParams(location.search).get("openingSpeed")) || 1);
  openingPlayer = new KoreanOpeningPlayer(openingData, canvas, {
    speed: openingSpeed,
    loop: false,
    onScene: (scene, cycle = 0) => {
      viewMode = "opening";
      $("runtime-status").textContent =
        `원본 오프닝 · scene ${scene.scene + 1}/${KOREAN_OPENING_SCENE_PLAN.length} · ${scene.name}`;
      $("debug").textContent = JSON.stringify({
        view: "opening",
        scene: scene.scene,
        name: scene.name,
        cycle,
        sources: scene.sources,
        artifact: "Korean OPEN.EXE / OPGRAPH.LZW",
      }, null, 2);
    },
    onFinish: () => {
      drawOpeningTitleHold("complete");
    },
  });
  openingPlayer.play().catch(err => {
    $("runtime-status").textContent = "오프닝 재생 오류: " + err.message;
    $("debug").textContent = err.stack || String(err);
  });
}

function drawBuildingImage(image, x, y, w, h) {
  if (!image) return;
  ctx.fillStyle = "#000";
  ctx.fillRect(x, y, w, h);
  drawOpeningFit(ctx, image, x, y, w, h);
}


const NATION_NAMES = Object.freeze(["포르투갈","에스파니아","오스만","영국","이탈리아","네덜란드"]);

function ensureBuildingUi(buildingId) {
  if (!buildingUi || buildingUi.buildingId !== buildingId) {
    buildingUi = {
      buildingId,
      mode: "menu",
      cursor: 0,
      ship: 0,
      resource: 0,
      loadMode: true,
      visitTicks: buildingVisitTicks(),
      pubEnthusiasm: buildingId === 1 ? initialPubEnthusiasm(selected) : null,
      pubAmount: 1,
      bankAmount: 100,
      itemPending: null,
      messageId: null,
      messageText: "",
      departure: null,
      last: "",
    };
  }
  return buildingUi;
}

function buildingOptions(buildingId) {
  const menuIndex = BUILDING_MENU_INDEX[buildingId];
  return Number.isInteger(menuIndex) ? (menuDefs[menuIndex]?.options ?? []) : [];
}

function formattedMessage(messageId, values = []) {
  let text = Number.isInteger(messageId) ? (messages[messageId]?.text ?? `MESSAGE #${messageId}`) : "";
  let vi = 0;
  text = text.replace(/%[-+0-9.#hlL]*[duxs]/gi, () => String(values[vi++] ?? "…"));
  return text.replace(/\x1b./g, "");
}

function drawBox(x, y, w, h, fill = "rgba(7,21,34,.97)") {
  ctx.fillStyle = fill;
  ctx.fillRect(x,y,w,h);
  ctx.strokeStyle = "#f1d58b";
  ctx.lineWidth = 2;
  ctx.strokeRect(x+1,y+1,w-2,h-2);
}

function drawBuildingMessage(ui) {
  const values = ui.departure?.messageId === 61 ? [ui.departure.days] : [];
  const text = ui.messageText || formattedMessage(ui.messageId, values);
  const { x, y, w, h } = UI_LAYOUT.dialogue;
  drawOriginalParchment(x,y,w,h);
  wrapTownMessage(text,31).slice(0,6).forEach((line,i)=>
    drawOriginalPanelText(line,x+16,y+30+i*16,{color:"#24160c"})
  );
  if (ui.mode === "sail-confirm") {
    const yn = UI_LAYOUT.yesNo;
    drawOriginalGraph(uiGraph?.yesNo, yn.x, yn.y, yn.w, yn.h);
  } else {
    drawOriginalPanelText("▼", x + Math.floor((w - 16) / 2), y + h - 12, {color:"#6e431b"});
  }
}
function drawHarborSupply(ui) {
  const ships = selected?.fleet?.ships ?? [];
  const prices = harborSupplyPrices(selected);
  ui.ship = Math.max(0, Math.min(ui.ship, Math.max(0, ships.length - 1)));
  ui.resource = Math.max(0, Math.min(ui.resource, 3));
  const ship = ships[ui.ship];
  const resource = RESOURCE_KEYS[ui.resource];

  drawBox(38, 44, 564, 308, "rgba(5,12,20,.985)");
  ctx.fillStyle = "#f1d58b";
  ctx.font = "bold 20px Malgun Gothic, sans-serif";
  ctx.fillText(`보급 · ${ui.loadMode ? "적재" : "하역"}`, 58, 74);
  ctx.font = "14px Malgun Gothic, sans-serif";
  ctx.fillStyle = "#e7edf5";
  ctx.fillText(`소지금 ${Number(selected?.money ?? 0).toLocaleString()} G`, 390, 74);

  const priceText = RESOURCE_KEYS.map((k,i)=>{
    const p=prices[k];
    return `${RESOURCE_NAMES[i]} ${p==null?"?":p+"G"}`;
  }).join("  ");
  ctx.fillText(priceText,58,98);

  ctx.font = "13px monospace";
  (ships.length ? ships : [{name:"함선 없음"}]).slice(0,10).forEach((sh,i)=>{
    const y=126+i*26;
    const mark=i===ui.ship?"▶":" ";
    const values=RESOURCE_KEYS.map(k=>String(resourceUnitsAboard(sh,k)).padStart(4," ")).join(" ");
    ctx.fillStyle=i===ui.ship?"#f1d58b":"#d6dbe3";
    ctx.fillText(`${mark} ${String(sh.name??"").slice(0,15).padEnd(15," ")} ${values}`,58,y);
  });

  if (ship) {
    const max = ui.loadMode
      ? maxSupplyLoad(selected,ship,resource)
      : resourceUnitsAboard(ship,resource);
    ctx.fillStyle="#e7edf5";
    ctx.font="14px Malgun Gothic, sans-serif";
    ctx.fillText(`선택: ${RESOURCE_NAMES[ui.resource]} · 현재 ${resourceUnitsAboard(ship,resource)} · 가능 ${max}`,58,300);
    ctx.fillText(`화물 ${shipCargoUsed(ship)}/${ship.cargo} (빈칸 ${shipCargoFree(ship)}) · 총중량 ${ship.load} · ${ui.last || "←/→ 자원  ↑/↓ 함선"}`,58,324);
  }
  ctx.fillStyle="#9fb0c4";
  ctx.font="12px Malgun Gothic, sans-serif";
  ctx.fillText("L 적재 / U 하역 / Enter 1개 / Shift+Enter 10개 / M 최대 / ESC 메뉴",58,344);
}

function drawItemShopTrade(ui, selling = false) {
  const shop=itemShopStock(selected);
  const rows=selling
    ? carriedItems(selected).map(x=>({
        inventorySlot:x.slot,
        id:x.id,
        item:x.item,
        name:x.item.name,
        price:itemSellStatus(selected,x.slot).offer ?? 0,
      }))
    : shop.items.map(item=>({
        id:item.id,
        item,
        name:item.name,
        price:item.price,
      }));
  ui.item=Math.max(0,Math.min(ui.item??0,Math.max(0,rows.length-1)));
  const row=rows[ui.item];

  drawBox(56,52,548,294,"rgba(5,12,20,.988)");
  ctx.fillStyle="#f1d58b";
  ctx.font="bold 20px Malgun Gothic, sans-serif";
  ctx.fillText(`아이템 상점 · ${selling?"매각":"구입"}`,76,82);
  ctx.fillStyle="#e7edf5";
  ctx.font="14px Malgun Gothic, sans-serif";
  ctx.fillText(`소지금 ${Number(selected?.money??0).toLocaleString()} G · 보유 ${carriedItems(selected).length}/20`,310,82);

  if(shop.mode==="closed"){
    ctx.fillStyle="#e7edf5";
    ctx.fillText("현재 영업 시간이 아닙니다. 일반 08:00–20:00 / 비밀상점 02:00–03:00",76,118);
    ctx.fillStyle="#9fb0c4";
    ctx.fillText("ESC: 메뉴",76,326);
    return;
  }

  if(!selling){
    ctx.fillStyle="#9fb0c4";
    ctx.fillText(shop.mode==="secret"?"비밀상점 재고":"일반 재고",76,108);
  }

  rows.slice(0,10).forEach((it,i)=>{
    const y=136+i*20;
    const item=it.item;
    ctx.fillStyle=i===ui.item?"#f1d58b":"#d7dde7";
    const type=ITEM_TYPES[item.type]??`TYPE${item.type}`;
    const suffix=selling
      ? `${String(it.price).padStart(7," ")}G ${item.equipped?"[장착]":""}`
      : `${String(it.price).padStart(7," ")}G`;
    ctx.fillText(`${i===ui.item?"▶":" "} ${String(it.name).padEnd(12," ")} ${type.padEnd(5," ")} ${suffix}`,76,y);
  });

  if(!rows.length){
    ctx.fillStyle="#aeb8c6";
    ctx.fillText(selling?"매각할 아이템이 없습니다.":"판매 중인 아이템이 없습니다.",76,140);
  }

  if(row){
    const it=row.item;
    ctx.fillStyle="#e7edf5";
    ctx.fillText(
      `선택: ${it.name} · 등급값 ${it.rating} · 그림 ${it.picture} · ${ui.last||""}`,
      76,314
    );
  }
  ctx.fillStyle="#9fb0c4";
  ctx.font="12px Malgun Gothic, sans-serif";
  ctx.fillText(
    selling
      ?"↑↓ 선택 · Enter 기본가 매각 · C 흥정 후 매각 · ESC 메뉴"
      :"↑↓ 선택 · Enter 구입 · ESC 메뉴",
    76,336
  );
}


function drawItemShopDecision(ui) {
  const p=ui.itemPending;
  if(!p) return;
  let text="";
  if(ui.mode==="item-buy-confirm"){
    text=`${formattedMessage(240,[p.item.name])}${Number(p.item.price).toLocaleString()}${formattedMessage(241)}\n구입하시겠습니까？`;
  }else if(ui.mode==="item-sell-offer"){
    text=`${formattedMessage(245,[p.item.name])}${Number(p.offer).toLocaleString()}${formattedMessage(247)}\n이 가격에 파시겠습니까？`;
  }else if(ui.mode==="item-sell-counter"){
    text=`${formattedMessage(246)}${Number(p.counter?.offer??0).toLocaleString()}${formattedMessage(247)}\n흥정 가격에 파시겠습니까？`;
  }else return;

  drawBox(96,172,448,126,"rgba(2,9,16,.985)");
  ctx.fillStyle="#f4f4f4";
  ctx.font="bold 15px Malgun Gothic, sans-serif";
  wrapTownMessage(text,36).slice(0,4).forEach((line,i)=>ctx.fillText(line,112,200+i*21));
  ctx.fillStyle="#f1d58b";
  ctx.font="12px Malgun Gothic, sans-serif";
  ctx.fillText("ENTER / Y: 예    N / ESC: 아니오",290,286);
}

function itemShopFailureText(status) {
  if(!status) return "";
  return formattedMessage(status.messageId) || status.reason || "거래할 수 없습니다.";
}

function drawMarketTrade(ui, selling = false) {
  const ships=selected?.fleet?.ships ?? [];
  ui.ship=Math.max(0,Math.min(ui.ship,Math.max(0,ships.length-1)));
  const pm=currentPortMarket(selected,marketAssets);
  const rows=selling ? carriedGoodsRows(selected,marketAssets) : (pm?.buy ?? []);
  ui.item=Math.max(0,Math.min(ui.item ?? 0,Math.max(0,rows.length-1)));
  const row=rows[ui.item];

  drawBox(34,40,572,316,"rgba(5,12,20,.988)");
  ctx.fillStyle="#f1d58b";
  ctx.font="bold 20px Malgun Gothic, sans-serif";
  ctx.fillText(`교역소 · ${selling?"매각":"구입"}`,54,70);
  ctx.fillStyle="#e7edf5";
  ctx.font="14px Malgun Gothic, sans-serif";
  ctx.fillText(`소지금 ${Number(selected?.money??0).toLocaleString()} G · 경제 ${selected?.portMeta?.economy ?? 0}`,340,70);

  ctx.font="13px Malgun Gothic, sans-serif";
  rows.slice(0,11).forEach((it,i)=>{
    const y=100+i*21;
    ctx.fillStyle=i===ui.item?"#f1d58b":"#d7dde7";
    if(selling){
      ctx.fillText(`${i===ui.item?"▶":" "} ${String(it.name).padEnd(8," ")} ${String(it.quantity).padStart(4," ")}통  ${String(it.sellPrice).padStart(4," ")}G  ${it.shipName}`,54,y);
    }else{
      ctx.fillText(`${i===ui.item?"▶":" "} ${String(it.name).padEnd(8," ")} ${String(it.price).padStart(4," ")}G${it.specialty?"  ★특산":""}`,54,y);
    }
  });

  if(!rows.length){
    ctx.fillStyle="#aeb8c6";ctx.fillText(selling?"매각할 교역품이 없습니다.":"구입할 상품이 없습니다.",54,118);
  }

  if(row){
    if(!selling){
      const ship=ships[ui.ship];
      ctx.fillStyle="#e7edf5";
      ctx.fillText(`함선: ${ship?.name ?? "-"} · 화물 ${ship?shipCargoUsed(ship):0}/${ship?.cargo ?? 0} · 빈칸 ${ship?shipCargoFree(ship):0}`,330,302);
      ctx.fillText(`선택 ${row.name} · ${row.price}G/통 · ${ui.last || "←/→ 함선 선택"}`,54,326);
    }else{
      ctx.fillStyle="#e7edf5";
      ctx.fillText(`선택 ${row.name} · 매각 ${row.sellPrice}G/통 · ${row.shipName} · ${ui.last || ""}`,54,326);
    }
  }
  ctx.fillStyle="#9fb0c4";
  ctx.font="12px Malgun Gothic, sans-serif";
  ctx.fillText(selling
    ?"↑↓ 상품 · Enter 1통 · Shift+Enter 10통 · M 전량 · ESC 메뉴"
    :"↑↓ 상품 · ←→ 함선 · Enter 1통 · Shift+Enter 10통 · M 최대 · ESC 메뉴",
    54,348);
}

function drawMarketRates(ui) {
  const pm=currentPortMarket(selected,marketAssets);
  drawBox(300,70,314,286,"rgba(5,12,20,.988)");
  ctx.fillStyle="#f1d58b";
  ctx.font="bold 18px Malgun Gothic, sans-serif";
  ctx.fillText("시세 · 물가",320,100);
  ctx.font="14px Malgun Gothic, sans-serif";
  GOODS_CATEGORY_NAMES.forEach((name,i)=>{
    const rate=pm?.rates?.[i] ?? 0;
    ctx.fillStyle="#e7edf5";
    ctx.fillText(`${name.padEnd(5," ")} ${String(rate).padStart(3," ")}`,320,128+i*20);
  });
  ctx.fillStyle="#9fb0c4";
  ctx.font="12px Malgun Gothic, sans-serif";
  ctx.fillText("ENTER / ESC: 메뉴",320,342);
}

function drawPubCrew(ui, dismissing = false) {
  const ships=selected?.fleet?.ships ?? [];
  ui.ship=Math.max(0,Math.min(ui.ship,Math.max(0,ships.length-1)));
  const ship=ships[ui.ship];
  const offer=pubRecruitOffer(selected,ui.pubEnthusiasm);

  drawBox(56,52,548,296,"rgba(5,12,20,.988)");
  ctx.fillStyle="#f1d58b";
  ctx.font="bold 20px Malgun Gothic, sans-serif";
  ctx.fillText(`주점 · ${dismissing?"선원 해고":"선원 고용"}`,76,82);
  ctx.fillStyle="#e7edf5";
  ctx.font="14px Malgun Gothic, sans-serif";
  ctx.fillText(`열의 ${ui.pubEnthusiasm} · 1인 ${offer.unitPrice}G · 가능 ${offer.maximum}명`,76,108);

  ships.forEach((sh,i)=>{
    const y=140+i*30;
    ctx.fillStyle=i===ui.ship?"#f1d58b":"#d7dde7";
    ctx.fillText(`${i===ui.ship?"▶":" "} ${sh.name}  ${sh.currentCrew}/${sh.maxCrew}명`,76,y);
  });
  if(ship){
    ctx.fillStyle="#e7edf5";
    ctx.fillText(`선택 ${ship.name} · 현재 ${ship.currentCrew}명 · 빈선실 ${Math.max(0,ship.maxCrew-ship.currentCrew)}`,76,284);
    ctx.fillText(ui.last||"",76,308);
  }
  ctx.fillStyle="#9fb0c4";
  ctx.font="12px Malgun Gothic, sans-serif";
  ctx.fillText(dismissing
    ?"↑↓ 함선 · Enter 1명 · Shift+Enter 10명 · M 전원 · ESC 메뉴"
    :"↑↓ 함선 · Enter 1명 · Shift+Enter 10명 · M 최대 · ESC 메뉴",76,334);
}

function drawBankAmount(ui) {
  const mode=ui.mode;
  const meta={
    "bank-deposit":{title:"예금",max:bankDepositMaximum(selected)},
    "bank-withdraw":{title:"인출",max:bankWithdrawMaximum(selected)},
    "bank-borrow":{title:"대출",max:bankBorrowMaximum(selected)},
    "bank-repay":{title:"상환",max:bankRepayMaximum(selected)},
  }[mode];
  if(!meta) return;

  ui.bankAmount=Math.max(0,Math.min(meta.max,Math.floor(ui.bankAmount||0)));
  drawBox(102,88,440,232,"rgba(5,12,20,.988)");
  ctx.fillStyle="#f1d58b";
  ctx.font="bold 20px Malgun Gothic, sans-serif";
  ctx.fillText(`은행 · ${meta.title}`,122,120);
  ctx.fillStyle="#e7edf5";
  ctx.font="15px Malgun Gothic, sans-serif";
  const bal=Math.trunc(selected?.bankBalance??0);
  ctx.fillText(`소지금: ${Number(selected?.money??0).toLocaleString()} G`,122,154);
  ctx.fillText(`은행잔액: ${bal.toLocaleString()} G`,122,180);
  ctx.fillText(`작위: ${selected?.rank??0} · 신용한도: ${bankCreditLine(selected).toLocaleString()} G`,122,206);
  ctx.fillText(`금액: ${ui.bankAmount.toLocaleString()} / 최대 ${meta.max.toLocaleString()} G`,122,236);
  if(ui.last){
    ctx.fillStyle="#d7dde7";
    ctx.fillText(ui.last,122,264);
  }
  ctx.fillStyle="#9fb0c4";
  ctx.font="12px Malgun Gothic, sans-serif";
  ctx.fillText("←/→ 100G · Shift+←/→ 10,000G · M 최대 · Enter 실행 · ESC 메뉴",122,302);
}

function drawPubTreat(ui) {
  const spec=pubSpecialty(selected);
  const max=pubTreatMaximum(selected);
  ui.pubAmount=Math.max(0,Math.min(max,ui.pubAmount||1));
  const economy=Math.max(1,selected?.portMeta?.economy??0);
  const strength=Math.floor(ui.pubAmount*200/economy);
  const gain=Math.floor(strength*(selected?.charm??0)/10);
  const next=Math.min(100,ui.pubEnthusiasm+gain);

  drawBox(106,96,430,214,"rgba(5,12,20,.988)");
  ctx.fillStyle="#f1d58b";
  ctx.font="bold 20px Malgun Gothic, sans-serif";
  ctx.fillText("주점 · 한턱내기",126,128);
  ctx.fillStyle="#e7edf5";
  ctx.font="15px Malgun Gothic, sans-serif";
  ctx.fillText(`특산주: ${spec.name} · ${spec.price}G/병`,126,160);
  ctx.fillText(`병수: ${ui.pubAmount} / 최대 ${max}`,126,188);
  ctx.fillText(`비용: ${ui.pubAmount*spec.price}G`,126,214);
  ctx.fillText(`열의: ${ui.pubEnthusiasm} → ${next} (+${gain})`,126,240);
  ctx.fillStyle="#9fb0c4";
  ctx.font="12px Malgun Gothic, sans-serif";
  ctx.fillText("←/→ 1병 · Shift+←/→ 10병 · M 최대 · Enter 구매 · ESC 메뉴",126,286);
}

function drawPortSupport(ui) {
  drawBox(354,116,260,216);
  ctx.fillStyle="#f1d58b";
  ctx.font="bold 17px Malgun Gothic, sans-serif";
  ctx.fillText("항구의 지지율",374,144);
  ctx.font="14px Malgun Gothic, sans-serif";
  const support=selected?.portMeta?.support ?? [];
  NATION_NAMES.forEach((name,i)=>{
    ctx.fillStyle="#e7edf5";
    ctx.fillText(`${name.padEnd(7," ")} ${String(support[i] ?? 0).padStart(3," ")}%`,374,172+i*23);
  });
  ctx.fillStyle="#9fb0c4";
  ctx.font="12px Malgun Gothic, sans-serif";
  ctx.fillText("ENTER / ESC: 돌아가기",374,318);
}

function renderBuildingInterface(s) {
  const ui=ensureBuildingUi(s.building.id);
  const options=buildingOptions(s.building.id);

  if (ui.mode === "supply") {
    drawHarborSupply(ui);
    $("runtime-status").textContent = "항 · 보급 · 원본 적재량/가격 공식 적용";
    return;
  }
  if (ui.mode === "pub-recruit") {
    drawPubCrew(ui,false);
    $("runtime-status").textContent = "주점 · 선원 고용 · 원본 열의/경제/작위 공식";
    return;
  }
  if (ui.mode === "pub-dismiss") {
    drawPubCrew(ui,true);
    $("runtime-status").textContent = "주점 · 선원 해고";
    return;
  }
  if (ui.mode === "pub-treat") {
    drawPubTreat(ui);
    $("runtime-status").textContent = "주점 · 한턱내기 · 열의 상승";
    return;
  }
  if (ui.mode.startsWith("item-")) {
    const selling=!ui.mode.startsWith("item-buy");
    drawItemShopTrade(ui,selling);
    drawItemShopDecision(ui);
    $("runtime-status").textContent =
      ui.mode==="item-buy-confirm" ? "아이템 상점 · 구입 가격 확인" :
      ui.mode==="item-sell-offer" ? "아이템 상점 · 1차 매입가 확인" :
      ui.mode==="item-sell-counter" ? "아이템 상점 · Luck 흥정가 확인" :
      "아이템 상점 · 한국어판 26바이트 아이템 정의/20칸 인벤토리";
    return;
  }
  if (ui.mode.startsWith("bank-")) {
    drawBankAmount(ui);
    $("runtime-status").textContent = "은행 · 원본 예금/대출 공식 적용";
    return;
  }
  if (ui.mode === "market-buy") {
    drawMarketTrade(ui,false);
    $("runtime-status").textContent = "교역소 · 구입 · DATA1 시장/항구 시세 적용";
    return;
  }
  if (ui.mode === "market-sell") {
    drawMarketTrade(ui,true);
    $("runtime-status").textContent = "교역소 · 매각 · 함선 교역품 5칸 적용";
    return;
  }
  if (ui.mode === "market-rates") {
    drawMarketRates(ui);
    $("runtime-status").textContent = "교역소 · 시세/물가 · 10개 품목군";
    return;
  }
  if (ui.mode === "support") {
    drawPortSupport(ui);
    $("runtime-status").textContent = "여관 · 항구의 지지율";
    return;
  }

  if (ui.mode === "menu") {
    const opts=options.length?options:["전용 기능"];
    const { x, y, w, h } = UI_LAYOUT.dialogue;
    drawOriginalParchment(x,y,w,h);
    opts.slice(0,6).forEach((opt,i)=>{
      drawOriginalPanelText(
        (i===ui.cursor?">":" ") + opt,
        x+16,
        y+30+i*16,
        {color:i===ui.cursor?"#8a2d13":"#24160c"}
      );
    });
    $("runtime-status").textContent = s.building.name + " · " + s.portName;
  } else if (ui.mode === "message" || ui.mode === "sail-confirm") {
    drawBuildingMessage(ui);
    $("runtime-status").textContent = ui.mode === "sail-confirm"
      ? `출항 확인 · 예상 ${ui.departure?.days ?? 0}일`
      : `건물 메시지 · MESSAGE #${ui.messageId ?? "-"}`;
  }
}

function exitBuildingWithVisitTime() {
  if (buildingUi?.visitTicks && selected?.dateTime) {
    advanceSelectedDateTicks(buildingUi.visitTicks);
  }
  buildingUi=null;
  townRuntime.leaveBuilding();
  renderTownScreen();
}

function runBuildingCommand(ui, buildingId) {
  const cursor=ui.cursor;
  if (buildingId === 1) {
    if (cursor === 0) {
      ui.mode="pub-recruit"; ui.ship=0; ui.last="";
      return;
    }
    if (cursor === 1) {
      ui.mode="pub-dismiss"; ui.ship=0; ui.last="";
      return;
    }
    if (cursor === 2) {
      ui.mode="pub-treat"; ui.pubAmount=1; ui.last="";
      return;
    }
    ui.mode="message";
    ui.messageId=null;
    ui.messageText=`${buildingOptions(buildingId)[cursor] ?? "이 기능"}: 항해자/여급/도박은 다음 역분석 단위에서 연결합니다.`;
    return;
  }
  if (buildingId === 0) {
    if (cursor === 0) {
      ui.mode="market-buy"; ui.item=0; ui.ship=0; ui.last="";
      return;
    }
    if (cursor === 1) {
      ui.mode="market-sell"; ui.item=0; ui.last="";
      return;
    }
    if (cursor === 2) {
      ui.mode="message"; ui.messageId=null;
      ui.messageText="투자는 원본 경제·지지율 변동식과 투자 한도 검증 후 연결합니다.";
      return;
    }
    ui.mode="market-rates"; ui.item=0; ui.last="";
    return;
  }
  if (buildingId === 3) {
    if (cursor === 0) {
      const departure=harborDepartureStatus(selected);
      ui.departure=departure;
      ui.messageId=departure.messageId;
      ui.messageText="";
      ui.mode=departure.allowed?"sail-confirm":"message";
      return;
    }
    if (cursor === 1) {
      ui.mode="supply";
      ui.ship=0; ui.resource=0; ui.loadMode=true; ui.last="";
      return;
    }
    ui.mode="message";
    ui.messageId=null;
    ui.messageText="도크의 보관·취역·교환은 다음 구현 단계에서 원본 선박 예비 레코드와 연결합니다.";
    return;
  }
  if (buildingId === 9) {
    ui.item=0;
    ui.itemPending=null;
    if(cursor===0){
      if((selected?.money??0)<=0){
        ui.mode="message"; ui.messageId=236; ui.messageText=""; return;
      }
      if(!(selected?.inventory??[]).includes(0xff)){
        ui.mode="message"; ui.messageId=237; ui.messageText=""; return;
      }
      ui.mode="item-buy";
      ui.last=formattedMessage(238);
      return;
    }
    if(carriedItems(selected).length===0){
      ui.mode="message"; ui.messageId=243; ui.messageText=""; return;
    }
    ui.mode="item-sell";
    ui.last=formattedMessage(244);
    return;
  }

  if (buildingId === 8) {
    const modes=["bank-deposit","bank-withdraw","bank-borrow","bank-repay"];
    ui.mode=modes[cursor] ?? "menu";
    ui.bankAmount=100;
    ui.last="";
    const max={
      "bank-deposit":bankDepositMaximum(selected),
      "bank-withdraw":bankWithdrawMaximum(selected),
      "bank-borrow":bankBorrowMaximum(selected),
      "bank-repay":bankRepayMaximum(selected),
    }[ui.mode] ?? 0;
    if(max<=0){
      let probe={messageId:null,reason:"unavailable"};
      if(ui.mode==="bank-deposit") probe=bankDeposit(selected,0);
      else if(ui.mode==="bank-withdraw") probe=bankWithdraw(selected,0);
      else if(ui.mode==="bank-borrow") probe=bankBorrow(selected,0);
      else if(ui.mode==="bank-repay") probe=bankRepay(selected,0);
      ui.mode="message";
      ui.messageId=probe.messageId;
      ui.messageText="";
    } else {
      ui.bankAmount=Math.min(100,max);
    }
    return;
  }

  if (buildingId === 4) {
    if (cursor === 2) {
      lodgeSelected();
      buildingUi=null;
      townRuntime.leaveBuilding();
      townRuntime.lastEvent="lodge-check-in";
      renderTownScreen();
      return;
    }
    if (cursor === 1) {
      ui.mode="support";
      return;
    }
    ui.mode="message";
    ui.messageId=67;
    ui.messageText="";
    return;
  }

  ui.mode="message";
  ui.messageId=null;
  ui.messageText=`${buildingOptions(buildingId)[cursor] ?? "이 기능"}: 원본 메뉴 진입은 연결됐으며 거래/이벤트 로직을 계속 이식 중입니다.`;
}

function handleBuildingKey(event) {
  const building=townRuntime?.insideBuilding;
  if (!building) return false;
  const ui=ensureBuildingUi(building.id);
  const key=event.key.toLowerCase();

  if (ui.mode === "message") {
    if (!["shift","control","alt","meta"].includes(key)) {
      event.preventDefault();
      ui.mode="menu"; ui.messageId=null; ui.messageText=""; ui.departure=null;
      renderTownScreen();
    }
    return true;
  }

  if (ui.mode === "sail-confirm") {
    if (key === "enter" || key === "y" || key === "1") {
      event.preventDefault();
      advanceSelectedDateTicks(ui.visitTicks);
      consumeDepartureDay(selected);
      buildingUi=null;
      startSeaFromPort();
      return true;
    }
    if (key === "escape" || key === "n") {
      event.preventDefault();
      ui.mode="menu"; ui.departure=null; ui.messageId=null;
      renderTownScreen();
    }
    return true;
  }

  if (ui.mode.startsWith("item-")) {
    const yes=key==="enter"||key==="y"||key==="1";
    const no=key==="escape"||key==="n"||key==="0";

    if(ui.mode==="item-buy-confirm"){
      event.preventDefault();
      if(yes){
        const p=ui.itemPending;
        const tx=p ? buyItem(selected,p.id) : {quantity:0,reason:"missing-pending"};
        ui.itemPending=null;
        if(tx.quantity){
          // The transaction already validated pre-buy gold and inventory space.
          // Re-checking the post-buy state here mislabels an exact-price purchase
          // or a purchase that fills the final slot as a failure.
          ui.mode="item-buy";
          ui.last=formattedMessage(242);
        }else{
          ui.mode="item-buy";
          ui.last=itemShopFailureText(tx);
        }
      }else if(no){
        ui.itemPending=null;
        ui.mode="item-buy";
        ui.last=formattedMessage(238);
      }
      renderTownScreen();
      return true;
    }

    if(ui.mode==="item-sell-offer"){
      event.preventDefault();
      const p=ui.itemPending;
      if(yes){
        const tx=p ? sellItem(selected,p.inventorySlot,p.offer) : {quantity:0,reason:"missing-pending"};
        ui.itemPending=null;
        if(tx.quantity){
          // Selling the last carried item is still a successful sale; the
          // empty-inventory message belongs to the next attempted sale.
          ui.mode="item-sell";
          ui.last=formattedMessage(248);
        }else{
          ui.mode="item-sell";
          ui.last=itemShopFailureText(tx);
        }
      }else if(no){
        if(!p){
          ui.mode="item-sell"; ui.itemPending=null;
        }else{
          const co=itemCounterOffer(selected,p.item);
          if(co.success){
            p.counter=co;
            ui.mode="item-sell-counter";
          }else{
            ui.itemPending=null;
            ui.mode="item-sell";
            ui.last=`흥정 실패 · Luck ${selected?.luck??0} < roll ${co.roll}`;
          }
        }
      }
      renderTownScreen();
      return true;
    }

    if(ui.mode==="item-sell-counter"){
      event.preventDefault();
      const p=ui.itemPending;
      if(yes){
        const tx=p ? sellItem(selected,p.inventorySlot,p.counter?.offer??p.offer) : {quantity:0,reason:"missing-pending"};
        ui.itemPending=null;
        if(tx.quantity){
          // Selling the last carried item is still a successful sale; the
          // empty-inventory message belongs to the next attempted sale.
          ui.mode="item-sell";
          ui.last=formattedMessage(248);
        }else{
          ui.mode="item-sell";
          ui.last=itemShopFailureText(tx);
        }
      }else if(no){
        ui.itemPending=null;
        ui.mode="item-sell";
        ui.last=formattedMessage(244);
      }
      renderTownScreen();
      return true;
    }

    const selling=ui.mode==="item-sell";
    const shop=itemShopStock(selected);
    const rows=selling ? carriedItems(selected) : shop.items;
    ui.item=Math.max(0,Math.min(ui.item??0,Math.max(0,rows.length-1)));

    if(key==="escape"){
      event.preventDefault();ui.mode="menu";ui.last="";ui.itemPending=null;renderTownScreen();return true;
    }
    if(shop.mode==="closed"){
      event.preventDefault();renderTownScreen();return true;
    }
    if(key==="arrowup"||key==="w"){
      event.preventDefault();ui.item=Math.max(0,ui.item-1);renderTownScreen();return true;
    }
    if(key==="arrowdown"||key==="s"){
      event.preventDefault();ui.item=Math.min(Math.max(0,rows.length-1),ui.item+1);renderTownScreen();return true;
    }
    if(key==="enter"){
      event.preventDefault();
      const row=rows[ui.item];
      if(row){
        if(selling){
          const st=itemSellStatus(selected,row.slot);
          if(st.allowed){
            ui.itemPending={
              inventorySlot:row.slot,
              id:row.id,
              item:st.item,
              offer:st.offer,
            };
            ui.mode="item-sell-offer";
            ui.last="";
          }else ui.last=itemShopFailureText(st);
        }else{
          const st=itemBuyStatus(selected,row.id);
          if(st.allowed){
            ui.itemPending={id:row.id,item:st.item};
            ui.mode="item-buy-confirm";
            ui.last="";
          }else ui.last=itemShopFailureText(st);
        }
      }
      renderTownScreen();return true;
    }
    return true;
  }

  if (ui.mode.startsWith("bank-")) {
    const mode=ui.mode;
    const max={
      "bank-deposit":bankDepositMaximum(selected),
      "bank-withdraw":bankWithdrawMaximum(selected),
      "bank-borrow":bankBorrowMaximum(selected),
      "bank-repay":bankRepayMaximum(selected),
    }[mode] ?? 0;
    ui.bankAmount=Math.max(0,Math.min(max,ui.bankAmount||0));

    if(key==="escape"){
      event.preventDefault();
      ui.mode="menu"; ui.last="";
      renderTownScreen();
      return true;
    }
    const step=event.shiftKey?10000:100;
    if(key==="arrowleft"){
      event.preventDefault();
      ui.bankAmount=Math.max(0,ui.bankAmount-step);
      renderTownScreen(); return true;
    }
    if(key==="arrowright"){
      event.preventDefault();
      ui.bankAmount=Math.min(max,ui.bankAmount+step);
      renderTownScreen(); return true;
    }
    if(key==="m"){
      event.preventDefault();
      ui.bankAmount=max;
      renderTownScreen(); return true;
    }
    if(key==="enter"){
      event.preventDefault();
      let tx;
      if(mode==="bank-deposit") tx=bankDeposit(selected,ui.bankAmount);
      else if(mode==="bank-withdraw") tx=bankWithdraw(selected,ui.bankAmount);
      else if(mode==="bank-borrow") tx=bankBorrow(selected,ui.bankAmount);
      else tx=bankRepay(selected,ui.bankAmount);
      ui.last=tx.quantity
        ? `${tx.quantity.toLocaleString()}G 처리 · 잔액 ${Number(selected.bankBalance??0).toLocaleString()}G`
        : `처리 불가: ${tx.reason??"unknown"}`;
      ui.bankAmount=Math.min(ui.bankAmount,{
        "bank-deposit":bankDepositMaximum(selected),
        "bank-withdraw":bankWithdrawMaximum(selected),
        "bank-borrow":bankBorrowMaximum(selected),
        "bank-repay":bankRepayMaximum(selected),
      }[mode] ?? 0);
      renderTownScreen(); return true;
    }
    return true;
  }

  if (ui.mode === "pub-recruit" || ui.mode === "pub-dismiss") {
    const dismissing=ui.mode==="pub-dismiss";
    const ships=selected?.fleet?.ships ?? [];
    ui.ship=Math.max(0,Math.min(ui.ship,Math.max(0,ships.length-1)));
    if (key === "escape") {
      event.preventDefault(); ui.mode="menu"; ui.last=""; renderTownScreen(); return true;
    }
    if (key === "arrowup" || key === "w") {
      event.preventDefault(); ui.ship=Math.max(0,ui.ship-1); renderTownScreen(); return true;
    }
    if (key === "arrowdown" || key === "s") {
      event.preventDefault(); ui.ship=Math.min(Math.max(0,ships.length-1),ui.ship+1); renderTownScreen(); return true;
    }
    if (key === "enter" || key === "m") {
      event.preventDefault();
      const ship=ships[ui.ship];
      if(ship){
        let q=event.shiftKey?10:1;
        if(key==="m"){
          q=dismissing ? ship.currentCrew : Math.min(
            Math.max(0,ship.maxCrew-ship.currentCrew),
            pubRecruitOffer(selected,ui.pubEnthusiasm).maximum
          );
        }
        const tx=dismissing
          ? dismissCrew(selected,ui.ship,q)
          : hireCrew(selected,ui.ship,q,ui.pubEnthusiasm);
        ui.last=dismissing
          ? `선원 -${tx.quantity}`
          : tx.reason==="used-today"
            ? "오늘은 이미 선원을 고용했습니다."
            : `선원 +${tx.quantity} / -${Number(tx.cost??0).toLocaleString()}G`;
      }
      renderTownScreen(); return true;
    }
    return true;
  }

  if (ui.mode === "pub-treat") {
    const max=pubTreatMaximum(selected);
    if(key==="escape"){
      event.preventDefault();ui.mode="menu";renderTownScreen();return true;
    }
    if(key==="arrowleft"){
      event.preventDefault();ui.pubAmount=Math.max(0,(ui.pubAmount||0)-(event.shiftKey?10:1));renderTownScreen();return true;
    }
    if(key==="arrowright"){
      event.preventDefault();ui.pubAmount=Math.min(max,(ui.pubAmount||0)+(event.shiftKey?10:1));renderTownScreen();return true;
    }
    if(key==="m"){
      event.preventDefault();ui.pubAmount=max;renderTownScreen();return true;
    }
    if(key==="enter"){
      event.preventDefault();
      const tx=pubTreat(selected,ui.pubEnthusiasm,ui.pubAmount);
      ui.pubEnthusiasm=tx.enthusiasm;
      ui.last=`${tx.specialty.name} ${tx.bottles}병 / -${tx.cost}G / 열의 +${tx.gain}`;
      ui.mode="menu";
      renderTownScreen();return true;
    }
    return true;
  }

  if (ui.mode === "market-rates") {
    if (key === "enter" || key === "escape" || key === " ") {
      event.preventDefault();
      ui.mode="menu";
      renderTownScreen();
    }
    return true;
  }

  if (ui.mode === "market-buy" || ui.mode === "market-sell") {
    const selling=ui.mode==="market-sell";
    const ships=selected?.fleet?.ships ?? [];
    const pm=currentPortMarket(selected,marketAssets);
    const rows=selling ? carriedGoodsRows(selected,marketAssets) : (pm?.buy ?? []);
    ui.item=Math.max(0,Math.min(ui.item??0,Math.max(0,rows.length-1)));
    ui.ship=Math.max(0,Math.min(ui.ship??0,Math.max(0,ships.length-1)));

    if (key === "escape") {
      event.preventDefault();
      ui.mode="menu"; ui.last="";
      renderTownScreen();
      return true;
    }
    if (key === "arrowup" || key === "w") {
      event.preventDefault();
      ui.item=Math.max(0,ui.item-1);
      renderTownScreen();
      return true;
    }
    if (key === "arrowdown" || key === "s") {
      event.preventDefault();
      ui.item=Math.min(Math.max(0,rows.length-1),ui.item+1);
      renderTownScreen();
      return true;
    }
    if (!selling && (key === "arrowleft" || key === "a")) {
      event.preventDefault();
      ui.ship=Math.max(0,ui.ship-1);
      renderTownScreen();
      return true;
    }
    if (!selling && (key === "arrowright" || key === "d")) {
      event.preventDefault();
      ui.ship=Math.min(Math.max(0,ships.length-1),ui.ship+1);
      renderTownScreen();
      return true;
    }
    if (key === "enter" || key === "m") {
      event.preventDefault();
      const row=rows[ui.item];
      if (row) {
        let q=event.shiftKey?10:1;
        if (key==="m") {
          if (selling) q=row.quantity;
          else {
            const ship=ships[ui.ship];
            q=ship ? Math.min(shipCargoFree(ship),Math.floor((selected?.money??0)/Math.max(1,row.price))) : 0;
          }
        }
        if (selling) {
          const tx=sellGoods(selected,marketAssets,row.shipIndex,row.goodsSlot,q);
          ui.last=`${tx.name??row.name} -${tx.quantity} / +${Number(tx.revenue??0).toLocaleString()}G`;
        } else {
          const tx=buyGoods(selected,marketAssets,ui.ship,row.good,q);
          ui.last=`${tx.name??row.name} +${tx.quantity} / -${Number(tx.cost??0).toLocaleString()}G`;
        }
      }
      renderTownScreen();
      return true;
    }
    return true;
  }

  if (ui.mode === "support") {
    if (key === "enter" || key === "escape" || key === " ") {
      event.preventDefault(); ui.mode="menu"; renderTownScreen();
    }
    return true;
  }

  if (ui.mode === "supply") {
    const ships=selected?.fleet?.ships ?? [];
    if (key === "escape") {
      event.preventDefault(); ui.mode="menu"; renderTownScreen(); return true;
    }
    if (key === "arrowup") ui.ship=Math.max(0,ui.ship-1);
    else if (key === "arrowdown") ui.ship=Math.min(Math.max(0,ships.length-1),ui.ship+1);
    else if (key === "arrowleft") ui.resource=(ui.resource+3)%4;
    else if (key === "arrowright") ui.resource=(ui.resource+1)%4;
    else if (key === "l") ui.loadMode=true;
    else if (key === "u" || key === "tab") ui.loadMode=!ui.loadMode;
    else if (key === "enter" || key === "m") {
      const ship=ships[ui.ship];
      const resource=RESOURCE_KEYS[ui.resource];
      if (ship) {
        let q=key==="m"
          ? (ui.loadMode?maxSupplyLoad(selected,ship,resource):resourceUnitsAboard(ship,resource))
          : (event.shiftKey?10:1);
        const tx=ui.loadMode
          ? loadSupply(selected,ui.ship,resource,q)
          : unloadSupply(selected,ui.ship,resource,q);
        ui.last=ui.loadMode
          ? `${RESOURCE_NAMES[ui.resource]} +${tx.quantity} / -${Number(tx.cost??0).toLocaleString()}G`
          : `${RESOURCE_NAMES[ui.resource]} -${tx.quantity}`;
      }
    } else return true;
    event.preventDefault();
    renderTownScreen();
    return true;
  }

  const opts=buildingOptions(building.id);
  if (key === "escape") {
    event.preventDefault(); exitBuildingWithVisitTime(); return true;
  }
  if (key === "arrowup" || key === "w") {
    event.preventDefault(); ui.cursor=(ui.cursor+Math.max(1,opts.length)-1)%Math.max(1,opts.length); renderTownScreen(); return true;
  }
  if (key === "arrowdown" || key === "s") {
    event.preventDefault(); ui.cursor=(ui.cursor+1)%Math.max(1,opts.length); renderTownScreen(); return true;
  }
  if (key === "enter") {
    event.preventDefault(); runBuildingCommand(ui,building.id); renderTownScreen(); return true;
  }
  return true;
}

function townMessageText(talk) {
  if (!talk || !Number.isInteger(talk.messageId)) return "";
  const raw = messages[talk.messageId]?.text ?? `MESSAGE #${talk.messageId}`;
  return raw
    .replace(/%[-+0-9.]*[sd]/g, "…")
    .replace(/\x1b./g, "");
}

function wrapTownMessage(text, width = 32) {
  const lines = [];
  for (const para of String(text).split("\n")) {
    if (!para) { lines.push(""); continue; }
    let rest = para;
    while (rest.length > width) {
      lines.push(rest.slice(0, width));
      rest = rest.slice(width);
    }
    lines.push(rest);
  }
  return lines;
}

function drawTownDialogue(talk) {
  if (!talk) return;
  const text = townMessageText(talk);
  const lines = wrapTownMessage(text, 31).slice(0, 6);
  const { x, y, w, h } = UI_LAYOUT.dialogue;
  drawOriginalParchment(x, y, w, h);
  lines.forEach((line, i) =>
    drawOriginalPanelText(line, x + 16, y + 30 + i * 16, { color: "#24160c" })
  );
  drawOriginalPanelText("▼", x + Math.floor((w - 16) / 2), y + h - 12, { color: "#6e431b" });
}
function renderTownScreen() {
  if (!townRuntime || !portAssets) return;
  const st = townRuntime.snapshot();
  drawOriginalSceneFrame("town");

  if (st.building) {
    const image = buildingImages[st.building.id];
    if (image) {
      const b = UI_LAYOUT.building;
      drawBuildingImage(image, b.x, b.y, image.width, image.height);
    }
    renderBuildingInterface(st);
  } else {
    renderTownView(ctx, portAssets, st.portId, st, UI_VIEW_X, UI_VIEW_Y, !charAssets);
    if (charAssets) {
      const fixedParity = st.stepParity & 1;
      for (const actor of st.actors ?? []) {
        if (!actor.active) continue;
        const sx = actor.x - st.viewX;
        const sy = actor.y - st.viewY;
        if (sx < -1 || sy < -1 || sx > 22 || sy > 22) continue;
        const frame = folkFrameIndex(actor, fixedParity);
        drawFolkSprite(ctx, charAssets, frame, sx, sy, UI_VIEW_X, UI_VIEW_Y);
      }
      drawHeroSprite(ctx, charAssets, selected?.heroId ?? 0, st, UI_VIEW_X, UI_VIEW_Y);
    }
    $("runtime-status").textContent = `항구 · ${st.portName}`;
    if (st.talk) {
      drawTownDialogue(st.talk);
      $("runtime-status").textContent = `대화 · ${st.portName}`;
    }
  }

  $("debug").textContent = JSON.stringify({
    mode: "town", hero: selected?.heroName, money: selected?.money, ...st,
    buildingUi, fleet: selected?.fleet ?? null, dateTime: selected?.dateTime ?? null,
  }, null, 2);
  publishControllerState();
}
function moveTown(direction) {
  if (!townRuntime || viewMode !== "town") return;
  townRuntime.move(direction);
  renderTownScreen();
}

function startSeaFromPort() {
  if (!selected?.portWorld || !worldAssets) return false;
  const start = findNearestSea(worldAssets, selected.portWorld.x, selected.portWorld.y, 40);
  if (!start) {
    $("runtime-status").textContent = "출항 실패: 항구 근처 항해 가능 바다를 찾지 못했습니다.";
    return false;
  }
  stopSeaAuto();
  seaRuntime = new SeaRuntime(
    worldAssets,
    start,
    windCur,
    selected?.dateTime?.month ?? 1,
    selected?.fleet ?? null,
    selected?.dateTime ?? null,
  );
  viewMode = "sea";
  setMusicForMode("sea");
  publishControllerState();
  renderSeaScreen();
  return true;
}

function buildArrivalSlot(port, seaState) {
  const mapId = port.mapId;
  const doors = portDoors?.[mapId] ?? [];
  const harbor = doors[3];
  if (!harbor?.present) return null;

  const mapX = harbor.x;
  const mapY = harbor.y + 1;
  const viewX = Math.max(0, Math.min(72, harbor.x - 12));
  const viewY = Math.max(0, Math.min(72, harbor.y - 13));

  const sameSavedPort = selected?.port === mapId;
  return {
    ...selected,
    port: mapId,
    portCatalogId: port.id,
    portName: port.name,
    portWorld: { nation: port.nation, x: port.x, y: port.y },
    portMeta: port.meta ? structuredClone(port.meta) : null,
    dateTime: { ...seaState.dateTime },
    portState: {
      viewX, viewY,
      playerX: mapX - viewX,
      playerY: mapY - viewY,
      mapX, mapY,
    },
    townActors: sameSavedPort ? (selected?.townActors ?? []) : [],
  };
}

function callNearbyPort() {
  if (!seaRuntime || !portCatalog.length) return false;
  const s = seaRuntime.snapshot();
  const port = findPortCallTarget(s, portCatalog);
  if (!port) {
    seaRuntime.lastEvent = "no-port-call";
    renderSeaScreen();
    return false;
  }
  const arrival = buildArrivalSlot(port, s);
  if (!arrival) {
    seaRuntime.lastEvent = "port-map-unavailable";
    renderSeaScreen();
    return false;
  }
  stopSeaAuto();
  selected = arrival;
  townRuntime = new PortWalkingRuntime(arrival, portAssets, portDoors);
  viewMode = "town";
  setMusicForMode("town");
  publishControllerState();
  renderTownScreen();
  return true;
}

function renderSeaScreen() {
  if (!seaRuntime || !worldAssets) return;
  const st = seaRuntime.snapshot();
  drawOriginalSceneFrame("sea");
  renderSeaView(ctx, worldAssets, st, UI_VIEW_X, UI_VIEW_Y, 23, 23);
  const nearbyPort = findPortCallTarget(st, portCatalog);
  const env = st.environment;
  const dirNames = ["북","북동","동","남동","남","남서","서","북서"];
  drawOriginalDatePanel(st.dateTime, "항해");
  drawOriginalPanelText(dirNames[st.heading] ?? st.heading, 548, 182, {size:12,bold:true});
  drawOriginalPanelText(`${st.speed?.knots ?? 0}`, 550, 222, {size:13,bold:true});
  drawOriginalPanelText(`${st.steps}`, 551, 260, {size:12});
  if (env) {
    drawOriginalPanelText(`${FLOW_DIR_NAMES[env.wind.dir]} ${env.wind.speed}`, 500, 105, {size:11});
    drawOriginalPanelText(`${FLOW_DIR_NAMES[env.current.dir]} ${env.current.speed}`, 500, 144, {size:11});
  }
  drawOriginalPanelText(seaAutoActive ? "AUTO" : "", 503, 282, {size:11,bold:true,color:"#7a260f"});
  if (nearbyPort) drawOriginalPanelText(nearbyPort.name, 500, 304, {size:11,bold:true});
  $("runtime-status").textContent = nearbyPort
    ? `항해 · ${nearbyPort.name} 기항 가능 · AUTO ${seaAutoActive ? "ON" : "OFF"}`
    : `항해 · AUTO ${seaAutoActive ? "ON" : "OFF"}`;
  publishControllerState({ nearbyPort: nearbyPort?.name ?? null });
  $("debug").textContent = JSON.stringify({
    mode: "sea", fromPort: selected?.portName, portWorld: selected?.portWorld,
    nearbyPort, ...st,
  }, null, 2);
}
function renderRuntime() {
  if (!runtime || viewMode !== "runtime") return;
  runtime.tick();
  const s = runtime.snapshot();
  const msg = messages[(s.frame >> 5) % Math.min(messages.length, 80)]?.text ?? "";
  drawFrame(s.hero || "대항해시대 II", [
    `Frame ${s.frame} · SAVE ${(s.slot ?? 0) + 1}`,
    `Money ${Number(s.money).toLocaleString()} G`,
    `REA state 0x426=${s.state426} 0x56F=${s.state56F} 0x570=${s.state570}`,
    stripMenuControls(menus[s.state56F % menus.length]?.text ?? ""),
    msg.replace(/\n/g, " ").slice(0, 40),
  ]);
  $("runtime-status").textContent = runtime.running ? "실행 중" : "일시정지";
  if (portAssets && runtime.slot?.port !== 0xff) {
    const p = renderPortViewport(ctx, portAssets, runtime.slot.port, 330, 210, 280, 155);
    if (p) {
      ctx.strokeStyle = "#c9a95e";
      ctx.strokeRect(329, 209, 282, 157);
    }
  }
  drawHeroPortrait(runtime.slot);
  $("debug").textContent = JSON.stringify({
    ...s,
    portraitIdCandidate: runtime.slot?.portraitIdCandidate,
    port: runtime.slot?.port,
  }, null, 2);
  requestAnimationFrame(renderRuntime);
}

$("opening-button").addEventListener("click", startOpeningPlayback);

$("run-button").addEventListener("click", () => {
  if (!selected) return;
  stopOpening(false);
  if (selected.port !== 0xff && portAssets && portDoors) {
    if (runtime) runtime.pause();
    townRuntime = new PortWalkingRuntime(selected, portAssets, portDoors);
    viewMode = "town";
    setMusicForMode("town");
    publishControllerState();
    $("pause-button").disabled = true;
    renderTownScreen();
    return;
  }
  runtime = new ReaGameRuntime(selected, menus, messages);
  runtime.start();
  viewMode = "runtime";
  setMusicForMode("runtime");
  publishControllerState();
  $("pause-button").disabled = false;
  $("pause-button").textContent = "일시정지";
  renderRuntime();
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if (viewMode === "opening") {
    event.preventDefault();
    stopOpening(true);
    return;
  }

  if (viewMode === "sea" && seaRuntime) {
    let handled = true;
    if (key === "enter" || key === "p") {
      event.preventDefault();
      callNearbyPort();
      return;
    }
    if (key === "g") {
      event.preventDefault();
      toggleSeaAuto();
      return;
    }
    if (key === "arrowleft" || key === "a" || key === "4") seaRuntime.turn(-1);
    else if (key === "arrowright" || key === "d" || key === "6") seaRuntime.turn(1);
    else if (key === "arrowup" || key === "w" || key === "8" || key === " ") tickSeaWithBankInterest();
    else handled = false;
    if (handled) {
      event.preventDefault();
      renderSeaScreen();
    }
    return;
  }

  if (viewMode !== "town" || !townRuntime) return;

  if (townRuntime.talk) {
    if (!["shift","control","alt","meta"].includes(key)) {
      event.preventDefault();
      townRuntime.dismissTalk();
      renderTownScreen();
    }
    return;
  }

  if (townRuntime.insideBuilding) {
    handleBuildingKey(event);
    return;
  }

  const direction =
    key === "arrowup" || key === "w" || key === "8" ? "up" :
    key === "arrowright" || key === "d" || key === "6" ? "right" :
    key === "arrowdown" || key === "s" || key === "2" ? "down" :
    key === "arrowleft" || key === "a" || key === "4" ? "left" : null;
  if (!direction) return;
  event.preventDefault();
  moveTown(direction);
});

$("pause-button").addEventListener("click", () => {
  if (!runtime || viewMode !== "runtime") return;
  if (runtime.running) {
    runtime.pause();
    $("pause-button").textContent = "계속";
  } else {
    runtime.start();
    $("pause-button").textContent = "일시정지";
  }
});

window.addEventListener("uw2-controller-action", async event => {
  const action = event.detail?.action;
  if (action === "controller-ready") {
    publishControllerState();
    return;
  }
  if (action === "auto-sail") {
    toggleSeaAuto();
    return;
  }
  if (action === "pause") {
    if (viewMode === "sea") toggleSeaAuto();
    else $("pause-button").click();
    return;
  }
  if (!musicPlayer?.songCount) {
    publishControllerState();
    return;
  }
  if (action === "sound") {
    musicAutostartPending = false;
    await musicPlayer.toggle();
    publishControllerState();
    return;
  }
  if (action === "track-prev" || action === "track-next") {
    musicAutostartPending = false;
    const delta = action === "track-prev" ? -1 : 1;
    await musicPlayer.next(delta);
    publishControllerState();
  }
});

// The original OPEN.EXE intro is the boot sequence.  Do not hold it behind
// unrelated save, portrait, port-map, or world-data fetches.
const openingBoot = loadOpeningGraphics().then(() => {
  if (viewMode !== "town" && viewMode !== "sea" && viewMode !== "runtime" && viewMode !== "preview") {
    startOpeningPlayback();
  }
}).catch(err => {
  $("opening-status").textContent = "오프닝 로드 오류: " + err.message;
  $("debug").textContent = err.stack || String(err);
});

const gameBoot = Promise.allSettled([
  loadManifest(),
  loadTables(),
  loadSaves(),
  loadPortraits(),
  loadPortMaps(),
  loadTownSupport(),
  loadWorldSupport(),
  loadCharacterSupport(),
  loadFontSupport(),
  loadMusicSupport(),
]).then(results => {
  const failed = results.filter(r => r.status === "rejected");
  if (failed.length) {
    $("runtime-status").textContent = "게임 데이터 일부 로드 오류: " +
      failed.map(r => r.reason?.message ?? String(r.reason)).join("; ");
  }
});

Promise.allSettled([openingBoot, gameBoot]);