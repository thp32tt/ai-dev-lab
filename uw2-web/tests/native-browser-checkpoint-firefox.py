import os,json,time,threading,subprocess,urllib.request,urllib.parse,http.server,mimetypes,traceback
from pathlib import Path
# Owner-only integration. No copyrighted game data in the repository.
PORT=int(os.environ.get('UW2_TEST_HTTP_PORT','18982'))
DRIVER=int(os.environ.get('UW2_TEST_DRIVER_PORT','4465'))
WEB=Path(__file__).resolve().parent.parent/'web'
GAME=Path(os.environ.get('UW2_GAME_DIR',
 '/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD'))
class H(http.server.BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):
  name=urllib.parse.unquote(urllib.parse.urlsplit(self.path).path)
  if name=='/api/manifest':
   files=[{'name':x.name,'size':x.stat().st_size} for x in GAME.iterdir() if x.is_file()]
   data=json.dumps({'gameDirAvailable':True,'fileCount':len(files),'files':files}).encode()
   self.send_response(200);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data);return
  if name.startswith('/game/'):
   x=name[6:]
   if not x or '/' in x or '\\' in x or '..' in x:
    self.send_error(403);return
   p=GAME/x
  else:
   p=WEB/('index.html' if name=='/' else name.lstrip('/'))
   try:
    if WEB not in p.resolve().parents and p.resolve()!=WEB:self.send_error(403);return
   except Exception:self.send_error(403);return
  if not p.is_file():self.send_error(404);return
  b=p.read_bytes()
  ct=mimetypes.guess_type(str(p))[0] or 'application/octet-stream'
  self.send_response(200);self.send_header('Content-Type',ct);self.send_header('Content-Length',str(len(b)));self.end_headers();self.wfile.write(b)
server=http.server.ThreadingHTTPServer(('127.0.0.1',PORT),H)
threading.Thread(target=server.serve_forever,daemon=True).start()
proc=None;sid=None;base=f'http://127.0.0.1:{DRIVER}'
def req(method,path,data=None):
 body=None if data is None else json.dumps(data).encode()
 q=urllib.request.Request(base+path,data=body,method=method,
     headers={'Content-Type':'application/json'})
 with urllib.request.urlopen(q,timeout=25) as resp:
  return json.loads(resp.read().decode() or '{}')
def js(script):
 return req('POST',f'/session/{sid}/execute/sync',{'script':script,'args':[]})['value']
def state():
 return js("""return {mode:window.__uw2BootState?.()?.viewMode,
      gate:window.__uw2BootState?.(),
      status:document.querySelector('#runtime-status')?.textContent,
      feedback:document.querySelector('#checkpoint-feedback')?.textContent,
      debug:(()=>{try{return JSON.parse(document.querySelector('#debug').textContent)}catch{return {}}})(),
      choice:localStorage.getItem('uw2-web-native-checkpoint-choice-v1'),
      townStored:!!localStorage.getItem('uw2-web-native-town-checkpoint-v1'),
      seaStored:!!localStorage.getItem('uw2-web-native-sea-checkpoint-v1'),
      slots:document.querySelectorAll('#save-slots button:not(:disabled)').length
    }""")
def reload_and_finish_original_intro():
 req('POST',f'/session/{sid}/url',{'url':f'http://127.0.0.1:{PORT}/'})
 last=None
 for _ in range(230):
  try:
   last=state()
   gate=last.get('gate')
   if gate and gate.get('opening')=='finished' and gate.get('gameResourcesSettled') and last.get('slots',0)>=2:
    return last
   if gate and last.get('mode') in ('opening','opening-title'):
    js("window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));return true")
  except Exception:pass
  time.sleep(.2)
 raise Exception('RELOADED_ORIGINAL_INTRO_NOT_READY '+json.dumps(last,ensure_ascii=False)[:1400])
try:
 proc=subprocess.Popen([os.environ.get('UW2_GECKODRIVER','/snap/bin/geckodriver'),'--port',str(DRIVER)],
  stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 for _ in range(120):
  try:urllib.request.urlopen(base+'/status',timeout=.5);break
  except Exception:time.sleep(.1)
 session=req('POST','/session',{'capabilities':{'alwaysMatch':{
  'browserName':'firefox','moz:firefoxOptions':{'args':['-headless']}}}})
 sid=session['value']['sessionId']
 req('POST',f'/session/{sid}/window/rect',{'width':1500,'height':1000})
 req('POST',f'/session/{sid}/url',{'url':f'http://127.0.0.1:{PORT}/'})
 samples=[]
 for n in range(200):
  a=state()
  if n%25==0:samples.append({k:a.get(k) for k in ('mode','status','slots')})
  if a['gate'].get('gameResourcesSettled') and a['slots']>=2:break
  if a['mode']=='opening':
   js("window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));return true")
  time.sleep(.2)
 ready=state()
 if not ready['gate'].get('gameResourcesSettled') or ready['slots']<2:
  raise Exception('ORIGINAL_WEB_BOOT_NOT_READY '+json.dumps({'last':ready,'samples':samples},ensure_ascii=False)[:1700])
 # The original OPEN.EXE intro owns boot until finish/intentional skip.
 # Never bypass this gate; first request an explicit key-based skip.
 for _ in range(70):
  ready=state()
  if ready['gate'].get('opening')=='finished':break
  if ready['mode'] in ('opening','opening-title'):
   js("window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));return true")
  time.sleep(.2)
 if ready['gate'].get('opening')!='finished':
  raise Exception('ORIGINAL_INTRO_NOT_FINISHED '+json.dumps(ready,ensure_ascii=False)[:1200])
 js("document.querySelectorAll('#save-slots button:not(:disabled)')[1].click();document.getElementById('run-button').click();return true;")
 time.sleep(.5)
 started=state()
 if started['mode']!='town':
  raise Exception('START_NOT_TOWN '+json.dumps(started,ensure_ascii=False)[:1200])
 js("document.querySelector('[data-action=checkpoint-save]').click();return true;")
 for _ in range(30):
  time.sleep(.1)
  z=state()
  if z['townStored']:break
 saved=state()
 if not saved['townStored'] or saved['choice']!='town':
  raise Exception('TOWN_SAVE_FAILED '+json.dumps(saved,ensure_ascii=False)[:1300])
 reloadTown=reload_and_finish_original_intro()
 if reloadTown['choice']!='town' or not reloadTown['townStored']:
  raise Exception('TOWN_STORAGE_LOST_AFTER_BROWSER_RELOAD')
 js("document.querySelector('[data-action=checkpoint-load]').click();return true;")
 time.sleep(.4)
 afterTownReload=state()
 if afterTownReload['mode']!='town' or afterTownReload['debug'].get('mapX')!=22:
  raise Exception('TOWN_RELOAD_RESTORE_FAIL '+json.dumps(afterTownReload,ensure_ascii=False)[:1300])
 js("window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));return true;")
 time.sleep(.2)
 moved=state()
 js("document.querySelector('[data-action=checkpoint-load]').click();return true;")
 time.sleep(.4)
 restored=state()
 if moved['debug'].get('mapX')!=23 or restored['debug'].get('mapX')!=22:
  raise Exception('SOURCE_TOWN_STEP_RESTORE_MISMATCH '+json.dumps({'moved':moved,'restored':restored},ensure_ascii=False)[:1100])
 if restored['mode']!='town' or not restored['feedback'].startswith('웹 항구 이어하기 완료'):
  raise Exception('TOWN_RESTORE_FAILED '+json.dumps(restored,ensure_ascii=False)[:1400])
 # Source-backed Danzig: press Up into original harbor, Enter to confirm sail.
 js("window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true,cancelable:true}));return true;")
 time.sleep(.2)
 harbor=state()
 js("window.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));return true;")
 time.sleep(.4)
 seaStart=state()
 if seaStart['mode']=='town' and '출항 확인' in (seaStart['status'] or ''):
  js("window.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));return true;")
  time.sleep(.4)
  seaStart=state()
 if seaStart['mode']=='sea':
  js("window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));return true;")
  js("window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true,cancelable:true}));return true;")
  time.sleep(.2)
  js("document.querySelector('[data-action=checkpoint-save]').click();return true;")
  time.sleep(.3)
  seaSaved=state()
  reloadSea=reload_and_finish_original_intro()
  if reloadSea['choice']!='sea' or not reloadSea['seaStored']:
   raise Exception('SEA_STORAGE_LOST_AFTER_BROWSER_RELOAD')
  js("document.querySelector('[data-action=checkpoint-load]').click();return true;")
  time.sleep(.4)
  afterSeaReload=state()
  if afterSeaReload['mode']!='sea' or afterSeaReload['debug'].get('ticks')!=seaSaved['debug'].get('ticks'):
   raise Exception('SEA_RELOAD_RESTORE_FAIL '+json.dumps(afterSeaReload,ensure_ascii=False)[:1300])
  js("window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true,cancelable:true}));return true;")
  time.sleep(.2)
  js("document.querySelector('[data-action=checkpoint-load]').click();return true;")
  time.sleep(.4)
  seaRestored=state()
  if seaSaved['choice']!='sea' or seaRestored['mode']!='sea' or seaRestored['choice']!='sea':
   raise Exception('NATIVE_SEA_MODE_CHECKPOINT_MISMATCH '+json.dumps({'saved':seaSaved,'restored':seaRestored},ensure_ascii=False)[:1400])
  for field in ('x','y','heading','steps','ticks','accX','accY'):
   if seaSaved['debug'].get(field)!=seaRestored['debug'].get(field):
    raise Exception('NATIVE_SEA_RESTORED_STATE_MISMATCH '+field)
  if not seaRestored['feedback'].startswith('웹 항해 이어하기 완료'):
   raise Exception('NATIVE_SEA_RESTORE_UI_MISMATCH')
 else:
  raise Exception('ORIGINAL_HARBOR_SAIL_CONFIRM_NOT_ENTERED_SEA '+json.dumps(seaStart,ensure_ascii=False)[:1100])
 result={'result':'BROWSER_REAL_ORIGINAL_KOREAN_NATIVE_CHECKPOINT_SMOKE',
  'ready':{'mode':ready['mode'],'slots':ready['slots']},
  'start':{'mode':started['mode'],'position':[started['debug'].get('mapX'),started['debug'].get('mapY')]},
  'townSave':{'feedback':saved['feedback'],'choice':saved['choice']},
  'moved':{'mode':moved['mode'],'position':[moved['debug'].get('mapX'),moved['debug'].get('mapY')]},
  'townRestored':{'mode':restored['mode'],'feedback':restored['feedback'],'position':[restored['debug'].get('mapX'),restored['debug'].get('mapY')]},
  'harbor':{'mode':harbor['mode'],'status':harbor['status']},
  'seaStart':{'mode':seaStart['mode'],'status':seaStart['status']},
  'seaSaved':None if seaSaved is None else {'mode':seaSaved['mode'],'choice':seaSaved['choice'],'feedback':seaSaved['feedback'],'x':seaSaved['debug'].get('x'),'ticks':seaSaved['debug'].get('ticks')},
  'seaRestored':None if seaRestored is None else {'mode':seaRestored['mode'],'choice':seaRestored['choice'],'feedback':seaRestored['feedback'],'x':seaRestored['debug'].get('x'),'ticks':seaRestored['debug'].get('ticks')},
  'reloadTown':{'mode':afterTownReload['mode'],'x':afterTownReload['debug'].get('mapX')},
  'reloadSea':{'mode':afterSeaReload['mode'],'ticks':afterSeaReload['debug'].get('ticks')},
  'boundary':'REAL_FIREFOX_NATIVE_WEB_BROWSER__NOT_DOS_REFERENCE_FRAME_PARITY'}
 print(json.dumps(result,ensure_ascii=False))
except Exception as ex:
 print(json.dumps({'result':'BROWSER_SMOKE_ERROR','exception':str(ex),'traceback':traceback.format_exc()[-800:]},ensure_ascii=False))
 raise
finally:
 if sid:
  try:req('DELETE',f'/session/{sid}')
  except:pass
 if proc:
  proc.terminate()
  try:proc.wait(timeout=3)
  except:proc.kill()
 server.shutdown();server.server_close()