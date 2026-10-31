// Opt-in browser keyboard event -> original PC/XT-style BIOS INT16 key FIFO.
// Observations are from real KeyboardEvent.key/code; no key/scan inference
// from canvas state, auto-press, guest time, or synthetic controller events.
const alphaScan=Object.freeze({
  A:0x1e,B:0x30,C:0x2e,D:0x20,E:0x12,F:0x21,G:0x22,H:0x23,
  I:0x17,J:0x24,K:0x25,L:0x26,M:0x32,N:0x31,O:0x18,P:0x19,
  Q:0x10,R:0x13,S:0x1f,T:0x14,U:0x16,V:0x2f,W:0x11,X:0x2d,
  Y:0x15,Z:0x2c
});
const digitScan=Object.freeze([0x0b,0x02,0x03,0x04,0x05,0x06,0x07,0x08,0x09,0x0a]);
const punctuation=Object.freeze({
  Minus:0x0c,Equal:0x0d,BracketLeft:0x1a,BracketRight:0x1b,
  Backslash:0x2b,Semicolon:0x27,Quote:0x28,Backquote:0x29,
  Comma:0x33,Period:0x34,Slash:0x35,Space:0x39
});
const control=Object.freeze({
  Escape:[0x01,0x1b],Backspace:[0x0e,0x08],Tab:[0x0f,0x09],
  Enter:[0x1c,0x0d],ArrowUp:[0x48,0],ArrowDown:[0x50,0],
  ArrowLeft:[0x4b,0],ArrowRight:[0x4d,0],Home:[0x47,0],
  End:[0x4f,0],PageUp:[0x49,0],PageDown:[0x51,0],
  Insert:[0x52,0],Delete:[0x53,0]
});

export function translateBrowserBiosKey(event){
  if(!event||typeof event!=='object'||event.isTrusted!==true||
     event.type!=='keydown'||event.isComposing||event.metaKey||
     event.altKey||event.ctrlKey||typeof event.code!=='string'||
     typeof event.key!=='string')return null;
  const target=event.target;
  if(target&&(target.isContentEditable||
     ['INPUT','TEXTAREA','SELECT'].includes(String(target.tagName||'').toUpperCase())))
    return null;
  const {code,key}=event;
  if(Object.hasOwn(control,code)){
    if(key!==code)return null;
    const [scanCode,ascii]=control[code];
    return Object.freeze({ascii,scanCode});
  }
  if(/^F(?:[1-9]|10)$/.test(code)&&code===key)
    return Object.freeze({ascii:0,scanCode:0x3a+Number(code.slice(1))});
  let scanCode=null;
  if(/^Key[A-Z]$/.test(code))scanCode=alphaScan[code.slice(3)];
  else if(/^Digit[0-9]$/.test(code))scanCode=digitScan[Number(code.slice(5))];
  else if(Object.hasOwn(punctuation,code))scanCode=punctuation[code];
  if(scanCode===null||scanCode===undefined||key.length!==1)return null;
  const ascii=key.charCodeAt(0);
  // DOS code page/IME/non-ASCII characters require separate verified layout.
  if(ascii<0x20||ascii>0x7e)return null;
  return Object.freeze({ascii,scanCode});
}

export function attachBrowserBiosKeyboard({target,keyboardQueue}={}){
  if(!target||typeof target.addEventListener!=='function'||
     typeof target.removeEventListener!=='function')
    throw new TypeError('browser BIOS keyboard requires explicit event target');
  if(!keyboardQueue||typeof keyboardQueue.enqueue!=='function'||
     typeof keyboardQueue.checkKey!=='function'||
     typeof keyboardQueue.snapshot!=='function')
    throw new TypeError('browser BIOS keyboard requires source-backed FIFO');
  let accepted=0,ignored=0,overflow=0,attached=true;
  const onKeydown=event=>{
    const key=translateBrowserBiosKey(event);
    if(!key){ignored++;return;}
    // Overflow is a visible refusal rather than an overwritten or fake key.
    const state=keyboardQueue.snapshot();
    if(state.pending>=state.maxQueuedKeys){overflow++;return;}
    keyboardQueue.enqueue(key);accepted++;
    if(event.cancelable&&typeof event.preventDefault==='function')event.preventDefault();
  };
  target.addEventListener('keydown',onKeydown,{passive:false});
  return Object.freeze({
    detach(){if(attached){target.removeEventListener('keydown',onKeydown);attached=false;}},
    snapshot:()=>Object.freeze({accepted,ignored,overflow,attached,
      fidelity:'TRUSTED_HOST_KEYDOWN_ASCII_AND_PC_SCANS_ONLY__DOS_LAYOUT_UNTESTED'})
  });
}
