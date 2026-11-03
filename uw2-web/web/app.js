import { parseOffsetTextTable, parseMenuTable, parseSaveSlots, parseKoreanPortTable, stripMenuControls, stripUw2MessageControls } from "./binary.js";
import { classifyNativeSaveEntry } from "./native-save-entry.js";
import {nativeNewGameHeroChoices,nativeNewGameSourceDemo} from "./native-new-game-hero.js";
import {originalNewGameSelectorRect} from "./native-new-game-layout.js";
import {nativeCanvasPointerPoint,nativeSystemMenuPointerHit,
 nativeLoadSlotPointerHit,nativeNewGameHeroPointerHit,
 nativeDialoguePointerInside,nativeBuildingMenuPointerHit,
 nativeModalRowPointerHit,nativeYesNoPointerHit,
 nativeTownWalkPointerDirection,nativeSeaPointerCommand} from "./native-canvas-pointer.js";
import {planNativeTownClickRoute,nativeTownClickRouteNext} from "./native-town-click-route.js";
import {createNativeSeaHold} from "./native-sea-hold.js";
import {nativeReadySeaPortMarker,nativeReadySeaPortPointerHit,
  nativeSeaPortMarkerContains} from "./native-sea-port-pointer.js";
import {nativeTownSourceDoorChoices,planNativeTownDoorRoute} from "./native-town-door-route.js";
import { canBuildNativePortArrival } from "./native-port-arrival.js";
import {stageNativeTownSave} from "./native-save-load-transaction.js";
import { prepareNativePortCall } from "./native-port-call-transaction.js";
import { advanceNativeSeaAuto, createNativeAutoOriginPortProbe } from "./native-sea-auto.js";
import { advanceNativeSeaVoyageStep } from "./native-sea-voyage-step.js";
import { prepareNativeHarborDeparture } from "./native-harbor-departure.js";
import {prepareNativeTownBuildingExit,commitNativeTownBuildingExit} from "./native-town-building-exit.js";
import {confirmNativeItemPurchase,confirmNativeItemSale} from "./native-item-shop-confirm.js";
import {openNativeSaveSession,syncNativeTownSession} from "./native-save-session.js";
import {prepareNativeTownMovement,commitNativeTownMovement} from "./native-town-movement.js";
import {readVerifiedKoreanSaveSource} from "./native-korean-save-source.js";
import {saveNativeTownCheckpoint,loadNativeTownCheckpoint,resumeNativeTownRuntime} from "./native-town-checkpoint.js";
import {saveNativeSeaCheckpoint,loadNativeSeaCheckpoint,restoreNativeSeaRuntime,
 NATIVE_CHECKPOINT_CHOICE_KEY} from "./native-sea-checkpoint.js";
import {nativeCheckpointSlotStorage,recordNativeCheckpointSlot,
 resolveNativeCheckpointLoad,availableNativeCheckpointSlots,
 loadNativeCheckpointWithRecovery} from "./native-checkpoint-slot-bank.js";
import { decodeLS11 } from "./ls11.js";
import { decodePlanarIndexed, drawIndexedCanvas } from "./koei-image.js";
import { decodePortAssets, renderPortMapToCanvas, renderPortViewport, renderTownView } from "./port-map.js";
import {
  decodeOpeningVerifiedArchive,
  chooseTitleLikeRecord,
  chooseOpeningGallery,
  drawOpeningFit,
  KoreanOpeningPlayer,
  KOREAN_OPENING_SCENE_PLAN,
} from "./opening.js";
import { readGraphRecords, decodeGraphRecord, UW2_MAIN_VGA_PALETTE } from "./graph-format.js";
import { createNativeGraphCanvas } from "./native-graph-canvas.js";
import {prepareOriginalOpgraphArchive} from "./opgraph-original-archive.js";
import {KOREAN_OPGRAPH_JS_DECODE_EVIDENCE as koeiGraphEvidence} from "./opgraph-korean-evidence.js";
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
import { UI_LAYOUT, UI_GRAPH_RECORD, buildingGraphRecordForPort } from "./ui-layout.js";
import { originalTownHudEntries } from "./native-town-hud.js";
import { nativeSeaDayCount } from "./native-sea-hud.js";
import { ORIGINAL_SYSTEM_MENU_INDEX, SYSTEM_UI_LAYOUT, originalSaveSlotLine } from "./system-ui.js";
import { selectWebMusicRoute } from "./music-routing.js";
import { Uw2BootGate } from "./boot-sequence.js";
import {
  pubSpecialty,
  initialPubEnthusiasm,
  pubTreatMaximum,
  pubTreat,
  pubRecruitOffer,
  hireCrew,
  dismissCrew,
  rolloverPubDailyRecruitment,
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
import {nativeDockTransferMaximum,transferNativeDockSupply} from "./native-dock-transfer.js";

const $ = (id) => document.getElementById(id);
const canvas = $("screen");
const ctx = canvas.getContext("2d");

let slots = [];
let originalHeroNames = []; // Source-pinned six-person roster, not new-game state.
let selected = null;
let menus = [];
let menuDefs = [];
let messages = [];
let saveBuffer = null;
let originalSaveSha256 = null;
let checkpointFeedback = "";
let checkpointInFlight = false;
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
let verifiedReferencePortCatalog = [];
let buildingUi = null;
let musicPlayer = null;
let fontAssets = null;
let musicMode = null;
let musicAutostartPending = true;
let seaAutoTimer = null;
let seaAutoActive = false;
let townClickTimer=null,townClickPlan=null,townClickIndex=0,townClickOwner=null;
function stopTownClickRoute(){
 if(townClickTimer!==null)clearInterval(townClickTimer);
 townClickTimer=null;townClickPlan=null;townClickIndex=0;townClickOwner=null;
}
function stepTownClickRoute(){
 if(viewMode!=="town"||!townClickPlan||!townRuntime||
    !selected||checkpointInFlight||townClickOwner?.runtime!==townRuntime||
    townClickOwner?.session!==selected){stopTownClickRoute();return;}
 const next=nativeTownClickRouteNext(townClickPlan,townClickIndex,townRuntime.snapshot());
 if(!next){stopTownClickRoute();return;}
 const movement=moveTown(next.direction),after=townRuntime.snapshot();
 if(!movement?.moved||after.mapX!==next.x||after.mapY!==next.y||
    after.building||after.talk||viewMode!=="town"){stopTownClickRoute();return;}
 townClickIndex++;
 if(townClickIndex>=townClickPlan.moves.length)stopTownClickRoute();
}
function startTownClickRoute(point){
 if(viewMode!=="town"||!townRuntime||!selected||townRuntime.insideBuilding||
    townRuntime.talk)return false;
 const plan=planNativeTownClickRoute({point,snapshot:townRuntime.snapshot(),assets:portAssets});
 stopTownClickRoute();
 if(!plan)return false;
 townClickPlan=plan;townClickOwner={runtime:townRuntime,session:selected};
 stepTownClickRoute();
 if(townClickPlan)townClickTimer=setInterval(stepTownClickRoute,145);
 return true;
}
function startTownBuildingRoute(buildingId){
 if(viewMode!=="town"||!townRuntime||!selected||
    townRuntime.insideBuilding||townRuntime.talk||
    !Number.isSafeInteger(buildingId))return false;
 const plan=planNativeTownDoorRoute({
  snapshot:townRuntime.snapshot(),doors:townRuntime.doors,
  assets:portAssets,buildingId
 });
 stopTownClickRoute();
 if(!plan){
  publishControllerState({townDoorFeedback:"원본 통행 경로를 확인할 수 없습니다."});
  return false;
 }
 townClickPlan=plan;townClickOwner={runtime:townRuntime,session:selected};
 stepTownClickRoute();
 if(townClickPlan)townClickTimer=setInterval(stepTownClickRoute,145);
 publishControllerState({townDoorFeedback:"원본 건물까지 이동 중 · ESC/중지로 취소"});
 return true;
}

let systemUi = { mode: "system-menu", cursor: 0, slot: 0, messageId: null };
let systemReturnMode=null; // Remember live native town/sea for ESC menu return.
let newGameHeroCursor=0;
let newGameHeroNotice="";
let systemMenuPending = false;
const bootGate = new Uw2BootGate();
let gameResourceFailure = null;

// Error events go to the bootstrap watchdog, which is loaded before this ES
// module graph. Keep original data failures visible even during OPEN playback.
function reportOriginalBootFailure(phase, error) {
  window.dispatchEvent(new CustomEvent("uw2-boot-failure", {
    detail: { phase, message: String(error?.message ?? error) },
  }));
}

const fidelityParams = new URLSearchParams(location.search);
const allowApproximateMusic = fidelityParams.get("musicApprox") === "1";
const allowApproximateOpening = fidelityParams.get("openingApprox") !== "0";

function controllerMusicState() {
  return musicPlayer?.state() ?? {
    supported: false,
    loaded: false,
    songCount: 0,
    track: 0,
    playing: false,
  };
}

// The controller must never advertise "port available" when the real
// Korean ZA_DAT harbor door or PORTCHIP collision admission cannot land.
// These are read-only geometry checks, not an invented town transition.
function findReadyNativePortCall(seaState) {
  if(!seaState||!portCatalog.length)return null;
  const port=findPortCallTarget(seaState,portCatalog);
  if(!port)return null;
  return canBuildNativePortArrival({
    port,seaState,previous:selected,portDoors,portAssets
  })?port:null;
}

function publishControllerState(extra = {}) {
  const nearbyPort = viewMode === "sea" && seaRuntime
    ? (findReadyNativePortCall(seaRuntime.snapshot())?.name ?? null)
    : null;
  const detail = {
    mode: viewMode,
    // The web controller exposes existing native transaction keystrokes
    // only while that exact source-backed building UI owns the scene.
    nativeActionMode:viewMode==="town"&&townRuntime?.insideBuilding
      ? (buildingUi?.mode??null) : null,
    townSourceDoors:viewMode==="town"&&townRuntime&&!townRuntime.insideBuilding
      ? nativeTownSourceDoorChoices(townRuntime.snapshot(),townRuntime.doors)
      : [],
    townDoorWalking:Number.isSafeInteger(townClickPlan?.targetBuildingId),
    checkpointFeedback,
    checkpointInFlight,
    checkpointSlots:(()=>{
      try{return availableNativeCheckpointSlots(window.localStorage,slots);}
      catch{return [];}
    })(),
    autoSail: seaAutoActive,
    nearbyPort,
    music: controllerMusicState(),
    musicFidelity: selectWebMusicRoute(viewMode, allowApproximateMusic).fidelity,
    ...extra,
  };
  window.__uw2BootState = () => ({ opening: bootGate.opening, gameResourcesSettled: bootGate.gameResourcesSettled, viewMode });
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
  const route = selectWebMusicRoute(mode, allowApproximateMusic);
  if (route.track === null) {
    // A proven opening song must not bleed into an unproven game mode.
    musicPlayer.pause();
    publishControllerState();
    return;
  }
  musicPlayer.setTrack(route.track);
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
  const route = selectWebMusicRoute(viewMode, allowApproximateMusic);
  if (route.track === null) return;
  musicAutostartPending = false;
  musicMode = viewMode;
  musicPlayer.play(route.track).then(publishControllerState).catch(() => publishControllerState());
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
  // WebCrypto checkpoint Save/Load is an exclusive gameplay transaction.
  // Do not let the controller re-arm AUTO while its source snapshot is
  // being authenticated and written/restored.
  if(checkpointInFlight)return false;
  if (viewMode !== "sea" || !seaRuntime) {
    publishControllerState();
    return false;
  }
  if (seaAutoActive) {
    stopSeaAuto("auto-stop");
    renderSeaScreen();
    return false;
  }
  // The original harbor is within the departure sea anchor's call ring.
  // Only stop for that SAME origin after the ship has left the ring first.
  // Other ports remain immediately eligible for an automatic stop.
  const originPortId=selected?.portCatalogId ??
    (Number.isSafeInteger(selected?.port)&&selected.port>=0&&selected.port<100
      ?selected.port:null);
  const autoPortProbe=createNativeAutoOriginPortProbe({
    originPortId,
    portCandidate:state=>findPortCallTarget(state,portCatalog),
    portReady:findReadyNativePortCall,
  });
  if(autoPortProbe(seaRuntime.snapshot())){
    stopSeaAuto("auto-port-arrived");
    renderSeaScreen();
    return false;
  }
  // No zero-velocity auto loop: a stationary fleet must not consume days,
  // provisions or interest solely because the 220ms browser timer runs.
  if (!seaRuntime.hasNetMotion()) {
    stopSeaAuto("auto-no-net-motion");
    renderSeaScreen();
    return false;
  }
  seaAutoActive = true;
  publishControllerState();
  seaAutoTimer = setInterval(() => {
    if(checkpointInFlight){
      stopSeaAuto();
      return;
    }
    if (viewMode !== "sea" || !seaRuntime) {
      stopSeaAuto();
      return;
    }
    const advance=advanceNativeSeaAuto(
      seaRuntime,tickSeaWithBankInterest,autoPortProbe);
    if(!advance.advanced||advance.stopAtPort||advance.stopAtCoast||advance.stopAtProbe){
      stopSeaAuto(advance.reason);
      renderSeaScreen();
      return;
    }
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
  c = createNativeGraphCanvas(image,{palette:UW2_MAIN_VGA_PALETTE});
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
      scale: opts.scale ?? 1,
    });
  }
  ctx.save();
  ctx.fillStyle = opts.color ?? "#2b1a0e";
  ctx.font = `${opts.bold ? "bold " : ""}${(opts.size ?? 15)*(opts.scale ?? 1)}px "Malgun Gothic", sans-serif`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(String(text ?? ""), x, y);
  ctx.restore();
  return null;
}


function drawOriginalTextTop(text, x, y, opts = {}) {
  if (fontAssets) {
    return drawUw2Text(ctx, fontAssets, String(text ?? ""), x, y, {
      color: opts.color ?? "#2b1a0e",
      lineHeight: opts.lineHeight ?? 16,
    });
  }
  return drawOriginalPanelText(text, x, y + 14, opts);
}

function drawSystemBase() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (openingTitle) {
    drawOpeningFit(ctx, openingTitle, 0, 0, canvas.width, canvas.height, { noUpscale: true });
  }
}

function drawSystemWindow(box) {
  drawOriginalParchment(box.x, box.y, box.w, box.h);
}

function drawSystemMenu() {
  drawSystemBase();
  const menu = SYSTEM_UI_LAYOUT.menu;
  const options = menuDefs[ORIGINAL_SYSTEM_MENU_INDEX]?.options ?? [];
  drawSystemWindow(menu);
  options.slice(0, menu.count).forEach((opt, i) => {
    drawOriginalTextTop(opt, menu.textX, menu.textY + i * menu.rowH, {
      color: i === systemUi.cursor ? "#8a2d13" : "#24160c",
    });
  });
  viewMode = "system-menu";
  $("runtime-status").textContent = "시스템 메뉴";
  publishControllerState({ systemUi: { ...systemUi } });
}

function drawLoadSlots() {
  drawSystemBase();
  drawSystemWindow({ x: 192, y: 80, w: 256, h: 208 });
  const layout = SYSTEM_UI_LAYOUT.slots;
  for (let i = 0; i < layout.count; i++) {
    const slot = slots[i] ?? { empty: true };
    drawOriginalTextTop(
      originalSaveSlotLine(slot, i),
      layout.x1,
      layout.y + i * layout.rowH,
      { color: i === systemUi.slot ? "#8a2d13" : "#24160c" }
    );
  }
  drawOriginalTextTop(
    stripUw2MessageControls(messages[951]?.text ?? "데이터를 선택해 주세요."),
    layout.promptX,
    layout.promptY,
    { color: "#24160c" }
  );

  if (systemUi.mode === "load-confirm") {
    const c = SYSTEM_UI_LAYOUT.loadConfirm;
    drawSystemWindow(c);
    drawOriginalTextTop(
      stripUw2MessageControls(messages[952]?.text ?? "로드하겠습니다. 좋습니까？"),
      c.textX, c.textY, { color: "#24160c" }
    );
    const yn = UI_LAYOUT.yesNo;
    drawOriginalGraph(uiGraph?.yesNo, yn.x, yn.y, yn.w, yn.h);
  } else if (systemUi.mode === "load-empty") {
    const e = SYSTEM_UI_LAYOUT.emptySlot;
    drawSystemWindow(e);
    drawOriginalTextTop(
      stripUw2MessageControls(messages[953]?.text ?? "데이터가 기록되어 있지 않습니다."),
      e.textX, e.textY, { color: "#24160c" }
    );
  }
  viewMode = systemUi.mode;
  $("runtime-status").textContent =
    systemUi.mode === "load-confirm" ? "Load Data · 확인" :
    systemUi.mode === "load-empty" ? "Load Data · 빈 슬롯" :
    "Load Data · 슬롯 선택";
  publishControllerState({ systemUi: { ...systemUi } });
}

function enterSystemMenu(cursor = 0) {
  if (!bootGate.canShowSystemMenu()) return false;
  if (!fontAssets || !menuDefs[ORIGINAL_SYSTEM_MENU_INDEX] || !slots.length) {
    systemMenuPending = true;
    drawOpeningTitleHold("system-pending");
    return false;
  }
  systemMenuPending = false;
  systemUi = { mode: "system-menu", cursor, slot: 0, messageId: null };
  drawSystemMenu();
  setMusicForMode("system-menu");
  return true;
}


function drawNewGameHeroSelect(){
  // A distinct visible MAIN menu route, not a reused Load Data list.
  // Six portrait indices come directly from the original KAO source.
  const heroes=nativeNewGameHeroChoices(slots,originalHeroNames);
  drawSystemBase();
  drawSystemWindow({x:44,y:12,w:552,h:375});
  drawOriginalTextTop("Start New Game · 주인공 선택",126,24,{color:"#24160c"});
  // The original Korean selector is NOT a 3x2 grid. All six hit-boxes
  // derive from MAIN.EXE DS:AB6E and the 64x80 selector extent.
  for(const hero of heroes){
    const box=originalNewGameSelectorRect(hero.id);
    const img=kaoPortraits[hero.portraitRecord];
    if(img){
      const thumbnail=document.createElement("canvas");
      drawIndexedCanvas(thumbnail,img,box.w,box.h,1);
      ctx.imageSmoothingEnabled=false;
      ctx.drawImage(thumbnail,box.x,box.y,box.w,box.h);
    }
    ctx.lineWidth=hero.id===newGameHeroCursor?3:1;
    ctx.strokeStyle=hero.id===newGameHeroCursor?"#a43d1e":"#594b35";
    ctx.strokeRect(box.x,box.y,box.w,box.h);
  }
  const active=heroes[newGameHeroCursor];
  // Text belongs outside the source rectangles: the original UI uses
  // those precise areas to select characters, not save preview rows.
  drawOriginalTextTop(active.label.slice(0,18),56,366,
    {color:"#24160c"});
  drawOriginalTextTop(active.sourceSlot===null?"새 게임 초기 상태 미복원":
    `원본 저장 ${active.sourceSlot+1} · 저장 시점 체험`,328,366,
    {color:"#24160c"});
  viewMode="new-game-select";
  const hero=heroes[newGameHeroCursor];
  $("runtime-status").textContent=newGameHeroNotice||
    (hero.sourceSlot===null
      ?"새 게임 초기 데이터 미확인 · 이 주인공의 시작은 보류"
      :"새 게임 초기 데이터 미확인 · Enter는 기존 원본 저장 시점부터 체험");
  publishControllerState({newGameHero:hero.id,
    originalNewGameReady:false,sourceSnapshotSlot:hero.sourceSlot});
}
function enterNativeNewGameSelect(){
  newGameHeroCursor=0;newGameHeroNotice="";
  drawNewGameHeroSelect();
}
function handleNativeNewGameKey(key,event){
  const move={arrowleft:-1,a:-1,"4":-1,arrowright:1,d:1,"6":1,
    arrowup:-3,w:-3,"8":-3,arrowdown:3,s:3,"2":3};
  if(Object.hasOwn(move,key)){
    event.preventDefault();
    newGameHeroCursor=(newGameHeroCursor+move[key]+6)%6;
    newGameHeroNotice="";
    drawNewGameHeroSelect();return true;
  }
  if(key==="escape"){
    event.preventDefault();enterSystemMenu(1);return true;
  }
  if(key==="enter"){
    event.preventDefault();
    const demo=nativeNewGameSourceDemo(
      nativeNewGameHeroChoices(slots,originalHeroNames),newGameHeroCursor,slots);
    if(demo.allowed){
      const started=selectLoadedSlot(demo.slotIndex);
      if(started){
        $("runtime-status").textContent=
          "원본 저장 시점 체험 · 실제 Start New Game 초기화는 미구현";
        publishControllerState({nativeNewGameDemo:true});
        return true;
      }
      newGameHeroNotice="원본 저장 위치 검증 실패 · 다른 주인공을 선택하세요";
    }else{
      newGameHeroNotice=
        "실제 새 게임의 초기 선단·날짜·항구·스토리 미복원 · 시작 보류";
    }
    drawNewGameHeroSelect();return true;
  }
  return true;
}


function openNativeGameSystemMenu(){
  if(checkpointInFlight)return false;
  const from=viewMode;
  if(from!=="town"&&from!=="sea")return false;
  if(from==="town"&&(!townRuntime||townRuntime.talk||townRuntime.insideBuilding))
    return false;
  if(from==="sea"&&!seaRuntime)return false;
  // Menu entry pauses sailing, never generating an additional movement tick.
  if(from==="sea")stopSeaAuto();
  systemReturnMode=from;
  if(!enterSystemMenu(4)){
    systemReturnMode=null;return false;
  }
  return true;
}
function resumeNativeGameFromSystemMenu(){
  const target=systemReturnMode;
  if(target==="town"&&townRuntime){
    systemReturnMode=null;
    viewMode="town";setMusicForMode("town");renderTownScreen();
    return true;
  }
  if(target==="sea"&&seaRuntime){
    systemReturnMode=null;
    viewMode="sea";setMusicForMode("sea");renderSeaScreen();
    return true;
  }
  return false;
}
function selectNativeWebSaveFromSystemMenu(){
  if(!resumeNativeGameFromSystemMenu()){
    drawSystemMenu();
    const box={x:150,y:246,w:350,h:75};
    drawSystemWindow(box);
    drawOriginalTextTop("원본 DOS Save Data는 아직 미구현",box.x+14,box.y+14,
      {color:"#24160c"});
    drawOriginalTextTop("항구/항해 중 ESC로 열어 웹 임시저장 이용",box.x+14,box.y+32,
      {color:"#24160c"});
    return false;
  }
  // Reuse native SHA-bound WebCrypto checkpoint single-flight transaction.
  // Original user's DOS KOUKAI2.DAT remains strictly read-only.
  window.dispatchEvent(new CustomEvent("uw2-controller-action",{
    detail:{action:"checkpoint-save"}
  }));
  return true;
}

// The original Korean MAIN menu #56 option 3 is Quit Game; MESSAGE #958
// is its source ending line and #957 requests a subsequent key. A browser
// cannot terminate the containing tab, so the following key returns to its
// original MAIN selector. Unlike the former fake popup, quit ends the live
// session and never writes the owner's DOS save or web checkpoint.
function finishNativeQuitGame(){
  if(checkpointInFlight)return false;
  stopSeaAuto();
  selected=null;
  townRuntime=null;
  seaRuntime=null;
  buildingUi=null;
  systemReturnMode=null;
  checkpointFeedback="";
  portCatalog=verifiedReferencePortCatalog;
  $("run-button").disabled=true;
  renderSlots();
  systemUi={mode:"quit-ended",cursor:3,slot:0,messageId:958};
  drawSystemBase();
  const end=SYSTEM_UI_LAYOUT.emptySlot;
  const box={...end,y:end.y-20,h:end.h+32};
  drawSystemWindow(box);
  drawOriginalTextTop(
    stripUw2MessageControls(messages[958]?.text??"게임을 끝내겠습니다."),
    box.x+16,box.y+14,{color:"#24160c"});
  drawOriginalTextTop(
    stripUw2MessageControls(messages[957]?.text??"끝냈습니다. 아무 키나 눌러 주세요."),
    box.x+16,box.y+37,{color:"#24160c"});
  viewMode="quit-ended";
  setMusicForMode("quit-ended");
  $("runtime-status").textContent="Quit Game · 원본 저장 파일 유지 · 키를 누르면 메인 메뉴";
  publishControllerState({systemUi:{...systemUi}});
  return true;
}

function selectLoadedSlot(index) {
  const slot = slots[index];
  if (!slot || slot.empty) return false;
  // Do not destroy the active town/sea session on an invalid original save.
  return startSelectedGame(slot);
}

function handleSystemKey(event) {
  const key = event.key.toLowerCase();
  if(viewMode==="new-game-select")return handleNativeNewGameKey(key,event);
  if(viewMode==="quit-ended"){
    if(!["shift","control","alt","meta"].includes(key)){
      event.preventDefault();
      enterSystemMenu(0);
    }
    return true;
  }
  if (!["system-menu","load-select","load-confirm","load-empty"].includes(viewMode)) return false;

  if (viewMode === "system-menu") {
    if(key==="escape"){
      event.preventDefault();
      if(!resumeNativeGameFromSystemMenu())drawSystemMenu();
      return true;
    }
    const options = menuDefs[ORIGINAL_SYSTEM_MENU_INDEX]?.options ?? [];
    if (key === "arrowup" || key === "w" || key === "8") {
      event.preventDefault();
      systemUi.cursor = (systemUi.cursor + options.length - 1) % Math.max(1, options.length);
      drawSystemMenu();
      return true;
    }
    if (key === "arrowdown" || key === "s" || key === "2") {
      event.preventDefault();
      systemUi.cursor = (systemUi.cursor + 1) % Math.max(1, options.length);
      drawSystemMenu();
      return true;
    }
    if (key === "enter") {
      event.preventDefault();
      if (systemUi.cursor === 0) {
        systemUi.mode = "load-select";
        const first = slots.findIndex(x => !x.empty);
        systemUi.slot = first >= 0 ? first : 0;
        drawLoadSlots();
      } else if (systemUi.cursor === 1) {
        enterNativeNewGameSelect();
      } else if (systemUi.cursor === 4) {
        selectNativeWebSaveFromSystemMenu();
      } else if (systemUi.cursor === 3) {
        finishNativeQuitGame();
      } else {
        drawSystemMenu();
      }
      return true;
    }
    return true;
  }

  if (viewMode === "load-select") {
    if (key === "escape") {
      event.preventDefault();
      enterSystemMenu(0);
      return true;
    }
    if (key === "arrowup" || key === "w" || key === "8") {
      event.preventDefault();
      systemUi.slot = (systemUi.slot + 9) % 10;
      drawLoadSlots();
      return true;
    }
    if (key === "arrowdown" || key === "s" || key === "2") {
      event.preventDefault();
      systemUi.slot = (systemUi.slot + 1) % 10;
      drawLoadSlots();
      return true;
    }
    if (key === "enter") {
      event.preventDefault();
      systemUi.mode = slots[systemUi.slot]?.empty ? "load-empty" : "load-confirm";
      drawLoadSlots();
      return true;
    }
    return true;
  }

  if (viewMode === "load-empty") {
    if (!["shift","control","alt","meta"].includes(key)) {
      event.preventDefault();
      systemUi.mode = "load-select";
      drawLoadSlots();
    }
    return true;
  }

  if (viewMode === "load-confirm") {
    if (key === "enter" || key === "y" || key === "1") {
      event.preventDefault();
      selectLoadedSlot(systemUi.slot);
      return true;
    }
    if (key === "escape" || key === "n" || key === "0") {
      event.preventDefault();
      systemUi.mode = "load-select";
      drawLoadSlots();
      return true;
    }
    return true;
  }
  return false;
}

// Mouse and touch clicks select existing original native menu entries.
// Convert CSS-scaled Canvas coordinates before hit testing; do not emit a
// separate virtual key or modify the user's original DOS save.
// Sea press/hold reuses the existing atomic voyage and helm controls.
const seaHold=createNativeSeaHold({onRepeat:point=>{
  if(viewMode!=="sea"||!seaRuntime||!selected||checkpointInFlight)return false;
  const command=nativeSeaPointerCommand(point,seaRuntime.snapshot());
  if(!command)return false;
  if(seaAutoActive)stopSeaAuto("auto-manual");
  if(command.kind==="turn")seaRuntime.turn(command.delta);
  else if(command.kind==="forward"){
    const result=tickSeaWithBankInterest();
    if(!result.advanced){renderSeaScreen();return false;}
  }else return false;
  renderSeaScreen();return true;
}});
let seaPortHoverMarker=null;
canvas.addEventListener("pointermove",event=>{
  const point=nativeCanvasPointerPoint(event,canvas);
  const hovering=viewMode==="sea"&&!checkpointInFlight&&
    nativeSeaPortMarkerContains(point,seaPortHoverMarker);
  canvas.style.cursor=hovering?"pointer":"default";
  if(hovering)canvas.title=marker.portName+" · 클릭하여 기항";
  else canvas.removeAttribute("title");
});
canvas.addEventListener("pointerleave",()=>{
  canvas.style.cursor="default";canvas.removeAttribute("title");
});
canvas.addEventListener("pointerdown",event=>{
  if(viewMode!=="sea"||!seaRuntime||checkpointInFlight||
     event.isPrimary===false||event.button!==0)return;
  const point=nativeCanvasPointerPoint(event,canvas);
  if(!point)return;
  const st=seaRuntime.snapshot(),nearbyPort=findReadyNativePortCall(st);
  // A harbor marker is a scene transition, not a sea helm hold gesture.
  if(nativeReadySeaPortPointerHit(point,st,nearbyPort)){seaHold.cancel();return;}
  if(nativeSeaPointerCommand(point,st))
    seaHold.begin(event.pointerId,point);
});
window.addEventListener("pointerup",event=>seaHold.release(event.pointerId));
window.addEventListener("pointercancel",()=>seaHold.cancel());
window.addEventListener("blur",()=>seaHold.cancel());
document.addEventListener("visibilitychange",()=>{
  if(document.hidden)seaHold.cancel();
});
canvas.addEventListener("click", event => {
  if(seaHold.consumeClick())return;
  if(checkpointInFlight)return;
  const point=nativeCanvasPointerPoint(event,canvas);
  if(!point)return;
  if(viewMode==="system-menu"){
    const hit=nativeSystemMenuPointerHit(point,
      menuDefs[ORIGINAL_SYSTEM_MENU_INDEX]?.options?.length??0);
    if(hit===null)return;
    systemUi.cursor=hit;
    handleSystemKey({key:"Enter",preventDefault(){}});
  }else if(viewMode==="new-game-select"){
    const hit=nativeNewGameHeroPointerHit(point);
    if(hit===null)return;
    // The original MAIN.EXE six-rectangle selector commits the selected
    // portrait on the first click. Do not require a second synthetic click.
    newGameHeroCursor=hit;
    newGameHeroNotice="";
    handleSystemKey({key:"Enter",preventDefault(){}});
  }else if(viewMode==="load-select"){
    const hit=nativeLoadSlotPointerHit(point);
    if(hit===null)return;
    systemUi.slot=hit;
    handleSystemKey({key:"Enter",preventDefault(){}});
  }else if(viewMode==="load-confirm"){
    // The verified source GRAPH #0 says YES left / NO right.
    // Only the existing load-confirm keyboard route may commit a save.
    const hit=nativeYesNoPointerHit(point);
    if(hit!==null)
      handleSystemKey({key:hit==="yes"?"Enter":"Escape",preventDefault(){}});
  }else if(viewMode==="quit-ended"){
    const b=SYSTEM_UI_LAYOUT.emptySlot;
    if(point.x>=b.x&&point.x<b.x+b.w&&point.y>=b.y-20&&
       point.y<b.y+b.h+12)
      handleSystemKey({key:"Enter",preventDefault(){}});
  }else if(viewMode==="load-empty"){
    // Click only the displayed source empty-slot parchment to dismiss.
    const b=SYSTEM_UI_LAYOUT.emptySlot;
    if(point.x>=b.x&&point.x<b.x+b.w&&point.y>=b.y&&point.y<b.y+b.h)
      handleSystemKey({key:"Enter",preventDefault(){}});
  }else if(viewMode==="sea"&&seaRuntime){
    const st=seaRuntime.snapshot(),nearbyPort=findReadyNativePortCall(st);
    // Clicking the actually visible source-catalog harbor uses the same
    // existing P-key atomic port arrival, never a guessed map teleport.
    if(nativeReadySeaPortPointerHit(point,st,nearbyPort)){
      seaHold.cancel();
      callNearbyPort();
      return;
    }
    // Other sea clicks retain the existing single helm/tick transaction.
    const command=nativeSeaPointerCommand(point,st);
    if(command===null)return;
    // Manual Canvas command takes exclusive control before the next AUTO tick.
    // No 20-minute voyage is charged by stopping the browser-only timer.
    if(seaAutoActive)stopSeaAuto("auto-manual");
    if(command.kind==="turn")seaRuntime.turn(command.delta);
    else if(command.kind==="forward")tickSeaWithBankInterest();
    renderSeaScreen();
  }else if(viewMode==="town"&&townRuntime){
    // Use the same source-backed town/building state machines as the keyboard.
    // Never let a canvas click bypass checkout, debit or departure confirmation.
    if(townRuntime.talk){
      if(nativeDialoguePointerInside(point)){
        townRuntime.dismissTalk();
        renderTownScreen();
      }
      return;
    }
    const building=townRuntime.insideBuilding;
    if(!building){
      // Click-to-walk issues only the existing atomic original town steps.
      startTownClickRoute(point);
      return;
    }
    const ui=ensureBuildingUi(building.id);
    if(ui.mode==="sail-confirm"||ui.mode==="item-buy-confirm"||
       ui.mode==="item-sell-offer"||ui.mode==="item-sell-counter"){
      const hit=nativeYesNoPointerHit(point);
      if(hit!==null)
        handleBuildingKey({key:hit==="yes"?"Enter":"Escape",preventDefault(){}});
      return;
    }
    if(ui.mode==="menu"){
      const options=buildingOptions(building.id);
      const hit=nativeBuildingMenuPointerHit(point,options.length||1);
      if(hit===null)return;
      ui.cursor=hit;
      handleBuildingKey({key:"Enter",preventDefault(){}});
      return;
    }
    if(ui.mode==="message"||ui.mode==="support"||ui.mode==="market-rates"){
      if(nativeDialoguePointerInside(point))
        handleBuildingKey({key:"Enter",preventDefault(){}});
      return;
    }
    // Read-only row selection in trade, ship and crew lists. A further
    // explicit Enter from the existing controls is required to transact.
    let count=0,field=null;
    if(ui.mode==="dock-transfer"){
      count=selected?.fleet?.ships?.length??0;field="ship";
    }else if(ui.mode==="supply"||ui.mode==="pub-recruit"||ui.mode==="pub-dismiss"){
      count=selected?.fleet?.ships?.length??0;
      field="ship";
    }else if(ui.mode==="market-buy"||ui.mode==="market-sell"){
      count=ui.mode==="market-buy"
        ?(currentPortMarket(selected,marketAssets)?.buy?.length??0)
        :carriedGoodsRows(selected,marketAssets,{shipIndex:ui.ship}).length;
      field="item";
    }else if(ui.mode==="item-buy"||ui.mode==="item-sell"){
      const stock=itemShopStock(selected);
      if(stock.mode==="closed")return;
      count=ui.mode==="item-buy"?stock.items.length:carriedItems(selected).length;
      field="item";
    }
    if(!field)return;
    const hit=nativeModalRowPointerHit(point,{
      rowCount:count,selectedIndex:ui[field],title:true
    });
    if(hit===null)return;
    ui[field]=hit;
    renderTownScreen();
  }
});

function drawOriginalDatePanel(date, label = "") {
  if (!date) return;
  drawOriginalPanelText(`${date.year}.${date.month}.${date.day}`, 505, 26, {size:12,bold:true});
  drawOriginalPanelText(`${String(date.hour).padStart(2,"0")}:${String(date.minute).padStart(2,"0")}`, 555, 45, {size:11});
  if (label) drawOriginalPanelText(label, 500, 65, {size:11,bold:true});
}

function tickSeaWithBankInterest() {
  if(checkpointInFlight)
    return {advanced:false,reason:"browser-checkpoint-in-flight"};
  const result=advanceNativeSeaVoyageStep({session:selected,runtime:seaRuntime});
  if(!result.advanced){
    if(seaRuntime)seaRuntime.lastEvent=result.reason;
    return result;
  }
  // Commit the calendar, fleet, bank and sea position together.
  selected=result.session;
  seaRuntime=result.sea;
  return result;
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
  const verified = await prepareOriginalOpgraphArchive(new Uint8Array(buf),{
    expectedSha256:koeiGraphEvidence.sourceSha256,
    expectedPartCount:koeiGraphEvidence.partCount,
    expectedDecodedSha256:koeiGraphEvidence.decodedSha256.slice(),
    maxFileBytes:1024*1024,maxPartBytes:8*1024*1024,
    maxTotalDecodedBytes:64*1024*1024
  });
  if(verified.fileBytes!==koeiGraphEvidence.originalFileBytes||
     verified.totalRecords!==koeiGraphEvidence.totalRecords||
     verified.totalDecodedBytes!==koeiGraphEvidence.totalDecodedBytes)
    throw new Error("Korean OPGRAPH decoded metadata differs from verified original baseline");
  openingData = decodeOpeningVerifiedArchive(verified);
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
  // Keep #6..#21: normal building records are id+6, and MAIN.EXE can
  // substitute #20 for building id 10 when CHIP_NO[currentPort] == 2.
  buildingImages = records.slice(6, 22).map(decodeGraphRecord);
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
      selected = openNativeSaveSession(slot);
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
  const verified = await readVerifiedKoreanSaveSource(new Uint8Array(buf));
  // All screen data is sourced from the SHA-bound snapshot, never from
  // a caller-owned async fetch buffer that can change during WebCrypto.
  originalSaveSha256 = verified.sourceSha256;
  saveBuffer = verified.copyBytes().buffer;
  slots = verified.slots;
  originalHeroNames = verified.heroNames;
  verifiedReferencePortCatalog = verified.portCatalog;
  portCatalog = verified.portCatalog;
  $("save-status").textContent =
    `KOUKAI2.DAT ${fmtBytes(verified.byteLength)} · SHA 확인 · 슬롯당 33,340 bytes`;
  selected = null;
  $("run-button").disabled = true;
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
  // Prevent stale "opening" controller mode and lingering ESC skip button
  // while the source title is waiting for MAIN's resources to finish.
  publishControllerState();
}

function completeOpening(reason = "complete") {
  // OPEN.EXE owns boot until its last scene (or an intentional user skip).
  // MAIN resources finishing independently never opens the menu early.
  if (bootGate.finishOpening()) enterSystemMenu(0);
  else if (bootGate.opening === "finished") {
    drawOpeningTitleHold(reason);
    if (gameResourceFailure) $("runtime-status").textContent = gameResourceFailure;
  }
}

function stopOpening(showTitle = false) {
  if (openingPlayer) openingPlayer.stop();
  if (showTitle && openingTitle) completeOpening("skip");
}

function startOpeningPlayback() {
  if (!openingData || !openingTitle || !bootGate.startOpening()) return;
  if (openingPlayer) openingPlayer.stop();

  viewMode = "opening";
  setMusicForMode("opening");
  publishControllerState();
  const openingSpeed = Math.max(0.05, Number(fidelityParams.get("openingSpeed")) || 1);
  openingPlayer = new KoreanOpeningPlayer(openingData, canvas, {
    speed: openingSpeed,
    loop: false,
    allowApproximate: allowApproximateOpening,
    onScene: (scene, cycle = 0) => {
      viewMode = "opening";
      $("runtime-status").textContent = scene.fidelity === "blocked-unverified"
        ? "오프닝 엄격 검증 모드 · 미확정 프레임 재현 대기"
        : `원본 OPEN.EXE 장면 복원 · ${scene.scene + 1}/${KOREAN_OPENING_SCENE_PLAN.length} · ${scene.name}`;
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
      completeOpening("complete");
    },
  });
  openingPlayer.play().catch(err => {
    bootGate.failOpening();
    $("runtime-status").textContent = "오프닝 재생 오류: " + err.message;
    $("debug").textContent = err.stack || String(err);
    reportOriginalBootFailure("OPEN 재생", err);
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
      dockTarget: 1,
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
  return stripUw2MessageControls(text);
}


function drawOriginalModalRows(rows, selectedIndex = -1, title = "") {
  const { x, y, w, h } = UI_LAYOUT.dialogue;
  drawOriginalParchment(x, y, w, h);
  const maxRows = 7;
  let start = selectedIndex >= maxRows ? selectedIndex - maxRows + 1 : 0;
  const visible = rows.slice(start, start + maxRows);
  if (title) drawOriginalPanelText(title, x + 16, y + 30, { color: "#24160c" });
  const baseY = title ? y + 46 : y + 30;
  visible.forEach((line, i) => {
    const absolute = start + i;
    const active = absolute === selectedIndex;
    drawOriginalPanelText(line, x + 16, baseY + i * 16, {
      color: active ? "#8a2d13" : "#24160c"
    });
  });
  return { start, visible: visible.length };
}

function drawBox(x, y, w, h, fill = "rgba(7,21,34,.97)") {
  drawOriginalParchment(x, y, w, h);
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
  const resource = RESOURCE_KEYS[ui.resource];
  const ship = ships[ui.ship];
  const rows = ships.length ? ships.map(sh => {
    const qty = RESOURCE_KEYS.map(k => resourceUnitsAboard(sh,k)).join("/");
    return sh.name + " " + qty;
  }) : ["함선 없음"];
  const price = prices[resource];
  const title = (ui.loadMode ? "적재 " : "하역 ") + RESOURCE_NAMES[ui.resource] + (price == null ? "" : " " + price + "G");
  drawOriginalModalRows(rows, ships.length ? ui.ship : -1, title);
  if (ship) {
    const max = ui.loadMode ? maxSupplyLoad(selected,ship,resource) : resourceUnitsAboard(ship,resource);
    drawOriginalPanelText(resourceUnitsAboard(ship,resource) + "/" + max, UI_LAYOUT.dialogue.x + 272, UI_LAYOUT.dialogue.y + 30, {color:"#24160c"});
  }
}


function drawHarborDock(ui){
 const ships=selected?.fleet?.ships??[];
 ui.ship=Math.max(0,Math.min(ui.ship??0,Math.max(0,ships.length-1)));
 ui.dockTarget=Math.max(0,Math.min(ui.dockTarget??0,Math.max(0,ships.length-1)));
 ui.resource=Math.max(0,Math.min(ui.resource??0,3));
 const resource=RESOURCE_KEYS[ui.resource];
 const rows=ships.length?ships.map((ship,i)=>{
  const stock=resourceUnitsAboard(ship,resource),used=shipCargoUsed(ship);
  return (i===ui.dockTarget?"→":"  ")+ship.name+" "+stock+" / "+used+"/"+ship.cargo;
 }):["함선 없음"];
 const max=nativeDockTransferMaximum(selected,ui.ship,ui.dockTarget,resource);
 const title="도크 "+RESOURCE_NAMES[ui.resource]+" "+(ui.ship+1)+"→"+(ui.dockTarget+1)+" / 최대 "+max;
 drawOriginalModalRows(rows,ships.length?ui.ship:-1,title);
 if(ui.last)drawOriginalPanelText(ui.last.slice(0,40),
  UI_LAYOUT.dialogue.x+16,UI_LAYOUT.dialogue.y+140,{color:"#8a2d13"});
}

function drawItemShopTrade(ui, selling = false) {
  const shop=itemShopStock(selected);
  const rows=selling
    ? carriedItems(selected).map(x=>({inventorySlot:x.slot,id:x.id,item:x.item,name:x.item.name,price:itemSellStatus(selected,x.slot).offer ?? 0}))
    : shop.items.map(item=>({id:item.id,item,name:item.name,price:item.price}));
  ui.item=Math.max(0,Math.min(ui.item??0,Math.max(0,rows.length-1)));
  if(shop.mode==="closed"){
    drawOriginalModalRows(["현재 영업 시간이 아닙니다."],-1,"아이템 상점");
    return;
  }
  const lines=rows.length ? rows.map(it=>it.name + " " + it.price + "G")
    : [selling?"매각할 물품이 없습니다.":"판매 물품이 없습니다."];
  drawOriginalModalRows(lines,rows.length?ui.item:-1,selling?"매각":"구입");
}


function drawItemShopDecision(ui) {
  const p=ui.itemPending;
  if(!p) return;
  let text="";
  if(ui.mode==="item-buy-confirm"){
    text=formattedMessage(240,[p.item.name]) + Number(p.item.price).toLocaleString() + formattedMessage(241);
  }else if(ui.mode==="item-sell-offer"){
    text=formattedMessage(245,[p.item.name]) + Number(p.offer).toLocaleString() + formattedMessage(247);
  }else if(ui.mode==="item-sell-counter"){
    text=formattedMessage(246) + Number(p.counter?.offer??0).toLocaleString() + formattedMessage(247);
  }else return;
  drawOriginalModalRows(wrapTownMessage(text,31).slice(0,5),-1,"");
  const yn=UI_LAYOUT.yesNo;
  drawOriginalGraph(uiGraph?.yesNo,yn.x,yn.y,yn.w,yn.h);
}

function itemShopFailureText(status) {
  if(!status) return "";
  return formattedMessage(status.messageId) || status.reason || "거래할 수 없습니다.";
}


function drawMarketTrade(ui, selling = false) {
  const ships=selected?.fleet?.ships ?? [];
  ui.ship=Math.max(0,Math.min(ui.ship,Math.max(0,ships.length-1)));
  const pm=currentPortMarket(selected,marketAssets);
  const rows=selling
    ? carriedGoodsRows(selected,marketAssets,{shipIndex:ui.ship})
    : (pm?.buy ?? []);
  ui.item=Math.max(0,Math.min(ui.item ?? 0,Math.max(0,rows.length-1)));
  const lines=rows.length ? rows.map(it=> selling
    ? it.name+" "+it.quantity+" "+it.sellPrice+"G"
    : it.name+" "+it.price+"G"+(it.specialty?" *":""))
    : [selling?"이 함선에 매각할 교역품이 없습니다.":"상품이 없습니다."];
  const shipName=ships[ui.ship]?.name??"함선 없음";
  const shipLabel=ships.length?` · ${ui.ship+1}/${ships.length} ${shipName}`:"";
  drawOriginalModalRows(lines,rows.length?ui.item:-1,
    (selling?"교역품 매각":"교역품 구입")+shipLabel);
}


function drawMarketRates(ui) {
  const pm=currentPortMarket(selected,marketAssets);
  const lines=GOODS_CATEGORY_NAMES.map((name,i)=>name+" "+(pm?.rates?.[i] ?? 0));
  drawOriginalModalRows(lines,-1,"시세");
}


function drawPubCrew(ui, dismissing = false) {
  const ships=selected?.fleet?.ships ?? [];
  ui.ship=Math.max(0,Math.min(ui.ship,Math.max(0,ships.length-1)));
  const offer=pubRecruitOffer(selected,ui.pubEnthusiasm);
  const lines=ships.length ? ships.map(sh=>sh.name+" "+sh.currentCrew+"/"+sh.maxCrew) : ["함선 없음"];
  drawOriginalModalRows(lines,ships.length?ui.ship:-1,dismissing?"선원 해고":"선원 고용 "+offer.unitPrice+"G");
}


function drawBankAmount(ui) {
  const meta={
    "bank-deposit":{title:"예금",max:bankDepositMaximum(selected)},
    "bank-withdraw":{title:"인출",max:bankWithdrawMaximum(selected)},
    "bank-borrow":{title:"대출",max:bankBorrowMaximum(selected)},
    "bank-repay":{title:"상환",max:bankRepayMaximum(selected)}
  }[ui.mode];
  if(!meta) return;
  ui.bankAmount=Math.max(0,Math.min(meta.max,Math.floor(ui.bankAmount||0)));
  const lines=[
    "소지금 "+Number(selected?.money??0).toLocaleString()+"G",
    "잔액 "+Math.trunc(selected?.bankBalance??0).toLocaleString()+"G",
    "신용 "+bankCreditLine(selected).toLocaleString()+"G",
    "금액 "+ui.bankAmount.toLocaleString()+"G"
  ];
  if(ui.last) lines.push(ui.last);
  drawOriginalModalRows(lines,-1,meta.title);
}


function drawPubTreat(ui) {
  const spec=pubSpecialty(selected);
  const max=pubTreatMaximum(selected);
  ui.pubAmount=Math.max(0,Math.min(max,ui.pubAmount||1));
  const economy=Math.max(1,selected?.portMeta?.economy??0);
  const strength=Math.floor(ui.pubAmount*200/economy);
  const gain=Math.floor(strength*(selected?.charm??0)/10);
  const next=Math.min(100,ui.pubEnthusiasm+gain);
  drawOriginalModalRows([
    "특산주 "+spec.name+" "+spec.price+"G",
    "병수 "+ui.pubAmount+"/"+max,
    "비용 "+(ui.pubAmount*spec.price)+"G",
    "열의 "+ui.pubEnthusiasm+" -> "+next
  ],-1,"한턱내기");
}


function drawPortSupport(ui) {
  const support=selected?.portMeta?.support ?? [];
  const lines=NATION_NAMES.map((name,i)=>name+" "+String(support[i] ?? 0)+"%");
  drawOriginalModalRows(lines,-1,"항구의 지지율");
}

function renderBuildingInterface(s) {
  const ui=ensureBuildingUi(s.building.id);
  const options=buildingOptions(s.building.id);

  if(ui.mode==="dock-transfer"){
    drawHarborDock(ui);
    $("runtime-status").textContent="도크 · 선단 보급품 함선 간 이송 · 웹 전용";
    return;
  }
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
    $("runtime-status").textContent = ui.last ||
      "교역소 · 구입 · DATA1 시장/항구 시세 적용";
    return;
  }
  if (ui.mode === "market-sell") {
    drawMarketTrade(ui,true);
    $("runtime-status").textContent = ui.last ||
      "교역소 · 매각 · 함선 교역품 5칸 적용";
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
        opt,
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

function exitNativeTownBuilding(kind,ticks) {
  const tx=prepareNativeTownBuildingExit({
    session:selected,runtime:townRuntime,assets:portAssets,kind,ticks
  });
  if(!tx.allowed){
    $("runtime-status").textContent="건물 퇴장 보류: "+tx.reason;
    return false;
  }
  commitNativeTownBuildingExit(tx);
  buildingUi=null;
  renderTownScreen();
  return true;
}
function exitBuildingWithVisitTime() {
  return exitNativeTownBuilding("visit",buildingUi?.visitTicks);
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
    // Browser-only source-vessel supply distribution. Original DOS spare
    // vessel and docking fee logic is not reconstructed; no fake buying.
    ui.mode="dock-transfer";ui.ship=0;ui.dockTarget=1;ui.resource=0;ui.last="";
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
      exitNativeTownBuilding("lodge");
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
      if(!startSeaFromPort(ui.visitTicks)){
        ui.mode="message";
        ui.messageId=null;
        ui.messageText="출항 보류: 유효한 해상 위치·날짜·선단 상태를 확인할 수 없습니다.";
        renderTownScreen();
      }
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
        const tx=p ? confirmNativeItemPurchase(selected,p) : {quantity:0,reason:"missing-pending"};
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
        const tx=p ? confirmNativeItemSale(selected,p,p.offer) : {quantity:0,reason:"missing-pending"};
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
        const tx=p ? confirmNativeItemSale(selected,p,p.counter?.offer??p.offer) : {quantity:0,reason:"missing-pending"};
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
              mode:shop.mode,
            };
            ui.mode="item-sell-offer";
            ui.last="";
          }else ui.last=itemShopFailureText(st);
        }else{
          const st=itemBuyStatus(selected,row.id);
          if(st.allowed){
            ui.itemPending={id:row.id,item:st.item,price:st.price,mode:shop.mode};
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
    ui.ship=Math.max(0,Math.min(ui.ship??0,Math.max(0,ships.length-1)));
    const rows=selling
      ? carriedGoodsRows(selected,marketAssets,{shipIndex:ui.ship})
      : (pm?.buy ?? []);
    ui.item=Math.max(0,Math.min(ui.item??0,Math.max(0,rows.length-1)));

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
    if (key === "arrowleft" || key === "a") {
      event.preventDefault();
      ui.ship=Math.max(0,ui.ship-1);
      ui.item=0; ui.last="";
      renderTownScreen();
      return true;
    }
    if (key === "arrowright" || key === "d") {
      event.preventDefault();
      ui.ship=Math.min(Math.max(0,ships.length-1),ui.ship+1);
      ui.item=0; ui.last="";
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

  if(ui.mode==="dock-transfer"){
    const ships=selected?.fleet?.ships??[];
    const count=ships.length;
    if(key==="escape"){
      event.preventDefault();ui.mode="menu";ui.last="";renderTownScreen();return true;
    }
    if(key==="arrowup"||key==="w")ui.ship=Math.max(0,ui.ship-1);
    else if(key==="arrowdown"||key==="s")ui.ship=Math.min(Math.max(0,count-1),ui.ship+1);
    else if(key==="arrowleft"||key==="a")ui.dockTarget=Math.max(0,ui.dockTarget-1);
    else if(key==="arrowright"||key==="d")ui.dockTarget=Math.min(Math.max(0,count-1),ui.dockTarget+1);
    else if(key==="r")ui.resource=(ui.resource+1)%4;
    else if(key==="enter"||key==="m"){
      const resource=RESOURCE_KEYS[ui.resource];
      const q=key==="m"
        ?nativeDockTransferMaximum(selected,ui.ship,ui.dockTarget,resource)
        :(event.shiftKey?10:1);
      const tx=transferNativeDockSupply(selected,ui.ship,ui.dockTarget,resource,q);
      ui.last=tx.quantity
        ?RESOURCE_NAMES[ui.resource]+" "+tx.quantity+" 이송 · "+(ui.ship+1)+"→"+(ui.dockTarget+1)
        :"이송 불가: "+(tx.reason??"unknown");
    }else return true;
    event.preventDefault();renderTownScreen();return true;
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
  return stripUw2MessageControls(
    raw.replace(/%[-+0-9.]*[sd]/g, "…")
  );
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
  const committed=syncNativeTownSession(selected,st,portAssets);
  if(!committed.updated){
    $("runtime-status").textContent="원본 항구 상태 정합성 검증 실패 · 갱신 보류";
    publishControllerState({nativeTownHold:committed.reason});
    return;
  }
  drawOriginalSceneFrame("town");
  // These original GRAPH #5 margin labels are baked into GRAPH.DAT. Fill
  // only their empty value locations from the CURRENT mutable web session.
  // Draw on every town repaint, including transactions and building visits.
  for(const line of originalTownHudEntries(selected))
    drawOriginalPanelText(line.text,line.x,line.y+14,{scale:line.scale});

  if (st.building) {
    const chipBank = portAssets.chipNo?.[st.portId];
    const graphRecord = buildingGraphRecordForPort(st.building.id, chipBank);
    const image = graphRecord == null ? null : buildingImages[graphRecord - 6];
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
    buildingUi,
    buildingGraphRecord: st.building
      ? buildingGraphRecordForPort(st.building.id, portAssets.chipNo?.[st.portId])
      : null,
    fleet: selected?.fleet ?? null, dateTime: selected?.dateTime ?? null,
  }, null, 2);
  publishControllerState();
}
function moveTown(direction) {
 if(!townRuntime||viewMode!=="town")return null;
 const step=prepareNativeTownMovement({
  session:selected,runtime:townRuntime,assets:portAssets,direction
 });
 if(!step.allowed){
  $("runtime-status").textContent="항구 이동 보류: "+step.reason;
  publishControllerState({nativeTownHold:step.reason});return null;
 }
 if(!commitNativeTownMovement(step))return null;
 renderTownScreen();return step.movement;
}

function startSeaFromPort(visitTicks) {
  const prepared=prepareNativeHarborDeparture({
    session:selected,worldAssets,windCur,visitTicks
  });
  if(!prepared.allowed){
    $("runtime-status").textContent="출항 보류: "+prepared.reason;
    return false;
  }
  // Commit all dated bank, fleet and voyage state together ONLY once the
  // browser's source-backed navigable sea and SeaRuntime are ready.
  stopSeaAuto();
  selected=prepared.session;
  seaRuntime=prepared.sea;
  buildingUi=null;
  viewMode="sea";
  setMusicForMode("sea");
  publishControllerState();
  renderSeaScreen();
  return true;
}

function callNearbyPort() {
  if (!seaRuntime || !portCatalog.length) return false;
  const s = seaRuntime.snapshot();
  const port = findReadyNativePortCall(s);
  if (!port) {
    seaRuntime.lastEvent = findPortCallTarget(s, portCatalog)
      ? "port-map-unavailable" : "no-port-call";
    renderSeaScreen();
    return false;
  }
  const prepared=prepareNativePortCall({
    session:selected,runtime:seaRuntime,portCatalog,portDoors,portAssets
  });
  if(!prepared.allowed){
    seaRuntime.lastEvent=prepared.reason;
    renderSeaScreen();
    return false;
  }
  // Commit the proven port session and fully constructed town together.
  stopSeaAuto();
  // The sea harbor hover target must not survive a completed scene switch.
  seaPortHoverMarker=null;
  canvas.style.cursor="default";
  canvas.removeAttribute("title");
  selected=prepared.session;
  townRuntime=prepared.town;
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
  renderSeaView(ctx, worldAssets, st, UI_VIEW_X, UI_VIEW_Y, UI_LAYOUT.viewport.tiles, UI_LAYOUT.viewport.tiles);
  const nearbyPort = findReadyNativePortCall(st);
  const marker=nativeReadySeaPortMarker(st,nearbyPort);
  seaPortHoverMarker=marker;
  if(!marker){
    canvas.style.cursor="default";
    canvas.removeAttribute("title");
  }
  if(marker){
    // Browser-only 16x16 golden outline on the existing original map tile.
    // Does not paint over the underlying port sprite or GRAPH #4 HUD.
    ctx.save();
    ctx.strokeStyle="rgba(248,217,122,0.95)";
    ctx.lineWidth=1;
    ctx.strokeRect(marker.x+0.5,marker.y+0.5,marker.w-1,marker.h-1);
    ctx.restore();
  }
  const env = st.environment;
  const dirNames = ["북","북동","동","남동","남","남서","서","북서"];
  // GRAPH #4 already contains the printed sea status labels. Do not
  // overwrite its wind header with an invented in-canvas '항해' label.
  drawOriginalDatePanel(st.dateTime);
  drawOriginalPanelText(dirNames[st.heading] ?? st.heading, 548, 182, {size:12,bold:true});
  drawOriginalPanelText(`${st.speed?.knots ?? 0}`, 550, 222, {size:13,bold:true});
  const seaDays=nativeSeaDayCount(st);
  if(seaDays!==null)drawOriginalPanelText(`${seaDays}`, 551, 260, {size:12});
  if (env) {
    drawOriginalPanelText(`${FLOW_DIR_NAMES[env.wind.dir]} ${env.wind.speed}`, 500, 105, {size:11});
    drawOriginalPanelText(`${FLOW_DIR_NAMES[env.current.dir]} ${env.current.speed}`, 500, 144, {size:11});
  }
  // AUTO and Port Call remain available in the external browser controller
  // and runtime-status text. GRAPH #4's bottom-right wheel is original art
  // and must not be covered by made-up overlay text.
  $("runtime-status").textContent = st.lastEvent === "auto-no-net-motion"
    ? "항해 · 자동항해 정지 (선박·해류 합산 이동량 0)"
    : nearbyPort
      ? `항해 · ${nearbyPort.name} 기항 가능 · AUTO ${seaAutoActive ? "ON" : "OFF"}`
      : `항해 · AUTO ${seaAutoActive ? "ON" : "OFF"}`;
  publishControllerState({ nearbyPort: nearbyPort?.name ?? null });
  $("debug").textContent = JSON.stringify({
    mode: "sea", fromPort: selected?.portName, portWorld: selected?.portWorld,
    nearbyPort, ...st,
  }, null, 2);
}
$("opening-button").addEventListener("click", startOpeningPlayback);

function startSelectedGame(slot=selected) {
  if (!bootGate.canShowSystemMenu() || !slot) return false;
  const stage=stageNativeTownSave(slot,{saveBuffer,portAssets,portDoors});
  if(!stage.ready){
    // No live session, catalog, town runtime or return target was modified.
    // The user's ESC -> MAIN -> ESC path can still resume the original game.
    systemUi.mode="load-select";
    viewMode="load-select";
    drawLoadSlots();
    $("runtime-status").textContent=
      stage.reason==="AT_SEA_COORDINATE_LAYOUT_UNVERIFIED"
        ?"원본 해상 세이브 좌표·방향 구조 미확인 · 복원 보류"
        :"원본 저장 데이터/항구 런타임 검증 미완료 · 복원 보류";
    publishControllerState({nativeSaveHold:stage.reason});
    return false;
  }
  // Only the fully validated, constructed source session can replace live
  // state. This is the single commit boundary for a Load Data transition.
  stopSeaAuto();
  stopOpening(false);
  selected=stage.session;
  portCatalog=stage.portCatalog;
  townRuntime=stage.town;
  systemReturnMode=null;
  viewMode="town";
  renderSlots();
  renderSelectedPortMap();
  setMusicForMode("town");
  publishControllerState();
  $("pause-button").disabled=true;
  renderTownScreen();
  return true;
}

$("run-button").addEventListener("click", () => {
  startSelectedGame();
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  // A pending asynchronous checkpoint must serialize against every
  // keyboard command, not just against Save/Load button presses.
  if(checkpointInFlight){
    event.preventDefault();
    return;
  }
  if (viewMode === "opening") {
    event.preventDefault();
    stopOpening(true);
    return;
  }

  if (handleSystemKey(event)) return;

  if (viewMode === "sea" && seaRuntime) {
    if(key==="escape"){
      event.preventDefault();
      openNativeGameSystemMenu();
      return;
    }
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
    // A real keyboard helm command cancels browser AUTO first. The single
    // manual forward command remains the only possible voyage tick this turn.
    const manualSeaKey=["arrowleft","a","4","arrowright","d","6",
      "arrowup","w","8"," "].includes(key);
    if(manualSeaKey&&seaAutoActive)stopSeaAuto("auto-manual");
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
  if(!["shift","control","alt","meta"].includes(key))stopTownClickRoute();

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

  if(key==="escape"){
    event.preventDefault();
    openNativeGameSystemMenu();
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

window.addEventListener("uw2-controller-action", async event => {
  const action = event.detail?.action;
  if (action === "controller-ready") {
    publishControllerState();
    return;
  }
  if(action==="town-door-go"){
    if(viewMode!=="town"||checkpointInFlight||!townRuntime)return;
    startTownBuildingRoute(event.detail?.buildingId);
    return;
  }
  if(action==="town-door-stop"){
    stopTownClickRoute();publishControllerState({townDoorFeedback:"이동 취소"});
    return;
  }
  // These commands are explicitly separate from the original DOS Save Data
  // menu. Only an idle source-verified native town can be checkpointed.
  if(action==="checkpoint-save"||action==="checkpoint-load"){
    stopTownClickRoute();
    // Two asynchronous WebCrypto reads/writes must NEVER race each other.
    // Otherwise a slow older Save can overwrite the newest active-mode
    // checkpoint pointer, or Load can read half of a pending Save.
    if(checkpointInFlight)return;
    checkpointInFlight=true;
    // Synchronously freeze the sailing clock BEFORE the first await.
    // Without this, the 220ms AUTO timer can change fleet, provisions,
    // money, date and sea position while SHA-256 checkpointing is pending.
    if(viewMode==="sea"&&seaAutoActive)stopSeaAuto();
    publishControllerState();
    const dependencies={
      sourceSha256:originalSaveSha256,sourceSlots:slots,
      portAssets,worldAssets,portCatalog
    };
    const sourceCatalogForSlot=index=>{
      const source=slots[index];
      if(!source||source.empty||
         !Number.isSafeInteger(source.raw?.page)||!saveBuffer)
        throw new Error("검증된 원본 슬롯 항구 테이블을 찾을 수 없습니다.");
      return parseKoreanPortTable(saveBuffer,source.raw.page);
    };
    try{
      if(!bootGate.canShowSystemMenu()||!originalSaveSha256||
         !portAssets||!portDoors||!worldAssets)
        throw new Error("원본 게임 데이터 로딩이 아직 완료되지 않았습니다.");
      const storage=window.localStorage;
      if(action==="checkpoint-save"){
        if(!selected||!Number.isSafeInteger(selected.index)||selected.index<0||selected.index>9)
          throw new Error("선택된 원본 저장 슬롯이 없습니다.");
        if(viewMode==="town"&&townRuntime){
          const result=await saveNativeTownCheckpoint({
            ...dependencies,
            storage:nativeCheckpointSlotStorage(storage,selected.index,"town",{mirrorLatest:true}),
            session:selected,town:townRuntime.snapshot()
          });
          storage.setItem(NATIVE_CHECKPOINT_CHOICE_KEY,"town");
          recordNativeCheckpointSlot(storage,result.index,"town");
          checkpointFeedback=`웹 항구 임시저장 완료 · 슬롯 ${result.index+1}`;
        }else if(viewMode==="sea"&&seaRuntime){
          const result=await saveNativeSeaCheckpoint({
            ...dependencies,
            storage:nativeCheckpointSlotStorage(storage,selected.index,"sea",{mirrorLatest:true}),
            session:selected,sea:seaRuntime.snapshot()
          });
          storage.setItem(NATIVE_CHECKPOINT_CHOICE_KEY,"sea");
          recordNativeCheckpointSlot(storage,result.index,"sea");
          checkpointFeedback=`웹 항해 임시저장 완료 · 슬롯 ${result.index+1}`;
        }else{
          throw new Error("항구 또는 항해 중에만 웹 임시저장할 수 있습니다.");
        }
        $("runtime-status").textContent=
          checkpointFeedback+" · 원본 DOS 저장 파일 미변경";
      }else{
        const requestedSlot=event.detail?.slotIndex;
        if(requestedSlot!=null&&
           (!Number.isSafeInteger(requestedSlot)||requestedSlot<0||
            requestedSlot>9||!slots[requestedSlot]||
            slots[requestedSlot].empty||slots[requestedSlot].unverified))
          throw new Error("선택한 원본 저장 슬롯이 유효하지 않습니다.");
        const activeSlot=requestedSlot!=null?requestedSlot:
          (selected&&["town","sea","system-menu"].includes(viewMode)
            &&Number.isSafeInteger(selected.index)?selected.index:null);
        const choice=resolveNativeCheckpointLoad(storage,activeSlot);
        if(!choice)throw new Error(activeSlot===null
          ?"저장된 웹 체크포인트가 없습니다."
          :`원본 슬롯 ${activeSlot+1}의 웹 체크포인트가 없습니다.`);
        if(choice.kind==="sea"){
          const restored=await loadNativeCheckpointWithRecovery({
            storage,choice,
            load:checkpointStorage=>loadNativeSeaCheckpoint({
              ...dependencies,storage:checkpointStorage,
              portCatalogForSlot:sourceCatalogForSlot
            })
          });
          if(!restored)
            throw new Error("저장된 웹 항해 체크포인트가 없습니다.");
          const nextRuntime=restoreNativeSeaRuntime({
            ...restored,worldAssets,windCur
          });
          stopSeaAuto();
          stopOpening(false);
          selected=restored.session;
          portCatalog=restored.portCatalog;
          townRuntime=null;
          seaRuntime=nextRuntime;
          viewMode="sea";
          setMusicForMode("sea");
          renderSeaScreen();
          checkpointFeedback=restored.checkpointRecovery
            ?"웹 항해 이전 정상 저장본 복구 완료 · 최신 기록 무결성 오류"
            :"웹 항해 이어하기 완료";
        }else{
          const restored=await loadNativeCheckpointWithRecovery({
            storage,choice,
            load:checkpointStorage=>loadNativeTownCheckpoint({
              ...dependencies,storage:checkpointStorage,
              portCatalogForSlot:sourceCatalogForSlot
            })
          });
          if(!restored)
            throw new Error("저장된 웹 항구 체크포인트가 없습니다.");
          const entry=classifyNativeSaveEntry(restored.session,{
            portAssets,portDoors
          });
          if(entry.route!=="town")
            throw new Error("원본 항구 좌표 복원 검증이 실패했습니다.");
          const nextRuntime=new PortWalkingRuntime(
            restored.session,portAssets,portDoors
          );
          resumeNativeTownRuntime(nextRuntime,restored.town);
          stopSeaAuto();
          stopOpening(false);
          selected=restored.session;
          portCatalog=restored.portCatalog;
          townRuntime=nextRuntime;
          seaRuntime=null;
          viewMode="town";
          setMusicForMode("town");
          renderTownScreen();
          checkpointFeedback=restored.checkpointRecovery
            ?"웹 항구 이전 정상 저장본 복구 완료 · 최신 기록 무결성 오류"
            :"웹 항구 이어하기 완료";
        }
        $("runtime-status").textContent=
          checkpointFeedback+" · 원본 DOS 저장 파일과 별개";
      }
    }catch(error){
      checkpointFeedback="웹 임시저장/복원 실패: "+
        (error?.message??String(error));
      $("runtime-status").textContent=checkpointFeedback;
    }finally{
      checkpointInFlight=false;
      publishControllerState();
    }
    return;
  }
  if (action === "auto-sail") {
    toggleSeaAuto();
    return;
  }
  if (action === "pause") {
    // PAUSE is stop-only at sea; the old toggle accidentally STARTED AUTO
    // on an idle vessel, advancing date, provisions and bank interest.
    if (viewMode === "sea") {
      if(seaAutoActive){stopSeaAuto("auto-paused");renderSeaScreen();}
    } else $("pause-button").click();
    return;
  }
  if (!musicPlayer?.songCount) {
    publishControllerState();
    return;
  }
  if (action === "sound") {
    const route = selectWebMusicRoute(viewMode, allowApproximateMusic);
    if (route.track === null) {
      publishControllerState();
      return;
    }
    musicAutostartPending = false;
    // The default mode is allowed to play only the proven OPEN.EXE song.
    if (!allowApproximateMusic) musicPlayer.setTrack(route.track);
    await musicPlayer.toggle();
    publishControllerState();
    return;
  }
  if (action === "track-prev" || action === "track-next") {
    if (!allowApproximateMusic) {
      publishControllerState({ musicFidelity: "mapping-unverified" });
      return;
    }
    musicAutostartPending = false;
    const delta = action === "track-prev" ? -1 : 1;
    await musicPlayer.next(delta);
    publishControllerState();
  }
});

// The original OPEN.EXE intro is the boot sequence.  Do not hold it behind
// unrelated save, portrait, port-map, or world-data fetches.
const openingBoot = loadOpeningGraphics().then(() => {
  if (viewMode !== "town" && viewMode !== "sea" && viewMode !== "preview") {
    startOpeningPlayback();
  }
}).catch(err => {
  bootGate.failOpening();
  $("opening-status").textContent = "오프닝 로드 오류: " + err.message;
  $("debug").textContent = err.stack || String(err);
  reportOriginalBootFailure("OPEN 원본 그래픽", err);
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
    gameResourceFailure = "게임 데이터 일부 로드 오류: " +
      failed.map(r => r.reason?.message ?? String(r.reason)).join("; ");
    bootGate.failGameResources();
    if (viewMode !== "opening") $("runtime-status").textContent = gameResourceFailure;
    reportOriginalBootFailure("MAIN 원본 리소스", new Error(gameResourceFailure));
    return; // Do not treat rejected original data as MAIN.EXE boot readiness.
  }
  if (bootGate.settleGameResources()) enterSystemMenu(0);
});

Promise.allSettled([openingBoot, gameBoot]);