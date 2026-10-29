import subprocess,json,time,urllib.request,base64,os
from pathlib import Path
PORT=4498;base=f"http://127.0.0.1:{PORT}"
proc=subprocess.Popen(["/snap/bin/geckodriver","--port",str(PORT)],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
def req(method,path,data=None):
 body=None if data is None else json.dumps(data).encode()
 q=urllib.request.Request(base+path,data=body,method=method,headers={"Content-Type":"application/json"})
 with urllib.request.urlopen(q,timeout=60) as r:return json.loads(r.read().decode() or "{}")
def js(sid,s):return req("POST",f"/session/{sid}/execute/sync",{"script":s,"args":[]})["value"]
def key(sid,k):return js(sid,f"window.dispatchEvent(new KeyboardEvent('keydown',{{key:{json.dumps(k)},bubbles:true,cancelable:true}}));return true;")
def canvas(sid,name):
 b64=js(sid,"return document.getElementById('screen').toDataURL('image/png').split(',')[1];")
 p=Path("/home/chatgpt-runner/uw2-web/tests")/(name+".png");p.write_bytes(base64.b64decode(b64));return str(p)
try:
 for _ in range(100):
  try:urllib.request.urlopen(base+"/status",timeout=1).read();break
  except:time.sleep(.08)
 ses=req("POST","/session",{"capabilities":{"alwaysMatch":{"browserName":"firefox","moz:firefoxOptions":{"args":["-headless"],"prefs":{"media.autoplay.default":0,"media.autoplay.blocking_policy":0}}}}})
 sid=ses["value"]["sessionId"];req("POST",f"/session/{sid}/window/rect",{"width":1000,"height":900})
 req("POST",f"/session/{sid}/url",{"url":"http://127.0.0.1:18082/?openingSpeed=50"})
 for _ in range(300):
  ok=js(sid,"return !document.getElementById('run-button').disabled && document.getElementById('portmap-status').textContent.includes('PORTMAP');")
  if ok:break
  time.sleep(.1)
 time.sleep(.8)
 js(sid,"document.querySelectorAll('#save-slots button:not(:disabled)')[1].click();document.getElementById('run-button').click();return true;");time.sleep(.35)
 town=canvas(sid,"m13-town")
 townState=js(sid,"return {mode:document.getElementById('controller-mode').textContent,status:document.getElementById('runtime-status').textContent};")
 key(sid,"ArrowUp");time.sleep(.2)
 menu=canvas(sid,"m13-harbor-menu")
 menuState=js(sid,"return {mode:document.getElementById('controller-mode').textContent,status:document.getElementById('runtime-status').textContent};")
 key(sid,"Enter");time.sleep(.2)
 confirm=canvas(sid,"m13-sail-confirm")
 confirmState=js(sid,"return {mode:document.getElementById('controller-mode').textContent,status:document.getElementById('runtime-status').textContent};")
 key(sid,"Enter");time.sleep(.3)
 sea=canvas(sid,"m13-sea")
 seaState=js(sid,"return {mode:document.getElementById('controller-mode').textContent,status:document.getElementById('runtime-status').textContent,sea:window.__uw2SeaState?.()};")
 req("DELETE",f"/session/{sid}")
 print(json.dumps({"town":town,"menu":menu,"confirm":confirm,"sea":sea,"states":{"town":townState,"menu":menuState,"confirm":confirmState,"sea":seaState}},ensure_ascii=False,indent=2))
finally:
 proc.terminate()
 try:proc.wait(timeout=5)
 except:proc.kill()