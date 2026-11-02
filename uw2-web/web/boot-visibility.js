// A user-visible browser boot watchdog, independent of the large native
// JavaScript module graph. No fallback gameplay is fabricated here.
// An early error must not leave a completely black 640x400 game screen.
(function(){
  "use strict";
  const screen=document.getElementById("screen");
  const overlay=document.getElementById("boot-recovery");
  const diagnostic=document.getElementById("boot-diagnostic");
  const retry=document.getElementById("boot-retry");
  const skip=document.getElementById("boot-skip");
  let mode="loading";
  let ready=false;
  let failed=false;
  let errorText="";
  const status=()=>document.getElementById("runtime-status")?.textContent??"";
  function showError(reason,force=false){
    if(ready&&!force)return;
    failed=true;
    errorText=String(reason||"게임 실행을 시작하지 못했습니다.").slice(0,240);
    if(diagnostic)diagnostic.textContent=errorText;
    if(overlay)overlay.style.display="flex";
    document.getElementById("controller-mode").textContent="실행 오류";
  }
  // Paint an immediately visible boot state before the async module graph
  // and original game-resource fetches start, instead of an empty canvas.
  try{
    const ctx=screen?.getContext("2d");
    if(ctx){
      ctx.fillStyle="#111722";ctx.fillRect(0,0,screen.width,screen.height);
      ctx.strokeStyle="#ad9362";ctx.lineWidth=2;
      ctx.strokeRect(38,48,screen.width-76,screen.height-96);
      ctx.fillStyle="#f2dfae";ctx.font="bold 26px sans-serif";
      ctx.textAlign="center";
      ctx.fillText("대항해시대 II",screen.width/2,148);
      ctx.fillStyle="#d5dde6";ctx.font="16px sans-serif";
      ctx.fillText("게임 데이터를 불러오는 중입니다.",screen.width/2,209);
      ctx.font="12px sans-serif";
      ctx.fillText("원본 게임 파일을 확인하고 있습니다.",screen.width/2,242);
    }
  }catch(error){showError("Canvas 초기화 실패: "+error.message);}
  retry?.addEventListener("click",()=>location.reload());
  skip?.addEventListener("click",()=>{
    window.dispatchEvent(new KeyboardEvent("keydown",{
      key:"Escape",bubbles:true,cancelable:true
    }));
  });
  window.addEventListener("uw2-game-state",event=>{
    if(failed)return;
    mode=event.detail?.mode??mode;
    if(skip)skip.style.display=mode==="opening"?"block":"none";
    if(mode && mode!=="loading" && mode!=="opening-title"){
      ready=true;
      if(overlay)overlay.style.display="none";
    }
  });
  window.addEventListener("error",event=>{
    if(ready)return;
    const message=event.message||(
      event.target?.src ? "스크립트 리소스를 불러오지 못했습니다." : "실행 코드 오류");
    showError("브라우저 실행 오류: "+message);
  },true);
  window.addEventListener("unhandledrejection",event=>{
    if(!ready)showError("리소스/초기화 오류: "+(event.reason?.message||String(event.reason)));
  });
  // A partially rendered intro is NOT proof that MAIN.EXE has loaded. The
  // app reports known fatal original-file errors explicitly: unlike a generic
  // window error, those remain fatal after the opening canvas first appeared.
  window.addEventListener("uw2-boot-failure",event=>{
    const phase=String(event.detail?.phase||"원본 데이터").slice(0,48);
    const message=String(event.detail?.message||"알 수 없는 오류");
    showError(phase+": "+message,true);
  });
  // Surface hard failures even if the app swallowed resource loading errors.
  const watchdog=setInterval(()=>{
    // Opening may start before other original files finish loading. Keep
    // watching fatal resource errors until MAIN's real menu has appeared.
    if(!["loading","opening","opening-title","system-pending"].includes(mode)){
      clearInterval(watchdog);return;
    }
    const text=status();
    if(/오류|실패|불가/.test(text)){
      clearInterval(watchdog);
      showError(text,true);
    }
  },1200);
  setTimeout(()=>{
    if(ready||failed)return;
    const state=window.__uw2BootState?.();
    if(!state || state.viewMode==="loading"){
      showError("게임 화면이 시작되지 않았습니다. 새로고침을 시도하세요.");
    }
  },18000);
  window.__uw2BootDiagnostic=()=>({ready,failed,message:errorText});
})();
