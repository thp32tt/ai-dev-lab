import subprocess,json,time,urllib.request,base64,os
PORT=4496;base=f"http://127.0.0.1:{PORT}"
proc=subprocess.Popen(["/snap/bin/geckodriver","--port",str(PORT)],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
def req(method,path,data=None):
 body=None if data is None else json.dumps(data).encode()
 q=urllib.request.Request(base+path,data=body,method=method,headers={"Content-Type":"application/json"})
 with urllib.request.urlopen(q,timeout=60) as r:return json.loads(r.read().decode() or "{}")
def js(sid,s):return req("POST",f"/session/{sid}/execute/sync",{"script":s,"args":[]})["value"]
def key(sid,k):return js(sid,f"window.dispatchEvent(new KeyboardEvent('keydown',{{key:{json.dumps(k)},bubbles:true,cancelable:true}}));return true;")
def shot(sid,name):
 el=req("POST",f"/session/{sid}/element",{"using":"css selector","value":"#screen"})["value"]["element-6066-11e4-a52e-4f735466cecf"]
 png=req("GET",f"/session/{sid}/element/{el}/screenshot")["value"];p=f"/home/chatgpt-runner/uw2-web/tests/{name}.png";open(p,"wb").write(base64.b64decode(png));return p
try:
 for _ in range(100):
  try:urllib.request.urlopen(base+"/status",timeout=1).read();break
  except:time.sleep(.08)
 ses=req("POST","/session",{"capabilities":{"alwaysMatch":{"browserName":"firefox","moz:firefoxOptions":{"args":["-headless"],"prefs":{"media.autoplay.default":0,"media.autoplay.blocking_policy":0}}}}})
 sid=ses["value"]["sessionId"];req("POST",f"/session/{sid}/window/rect",{"width":1000,"height":900})
 req("POST",f"/session/{sid}/url",{"url":"http://127.0.0.1:18082/?openingSpeed=50"})
 for _ in range(260):
  if js(sid,"return !document.getElementById(\'run-button\').disabled && !!window.__uw2MusicState && document.getElementById(\'portmap-status\').textContent.includes(\'PORTMAP\')"):break
  time.sleep(.1)
 time.sleep(.6)
 # select Danzig and enter town
 js(sid,"document.querySelectorAll('#save-slots button:not(:disabled)')[1].click();document.getElementById('run-button').click();return true;");time.sleep(.35)
 music0=js(sid,"return window.__uw2MusicState();")
 js(sid,"document.querySelector('[data-action=sound]').click();return true;");time.sleep(.3)
 music1=js(sid,"return window.__uw2MusicState();")
 time.sleep(1.0)
 music2=js(sid,"return window.__uw2MusicState();")
 town=shot(sid,"m11-original-town")
 hidden=js(sid,"return getComputedStyle(document.getElementById('runtime-status')).display;")
 key(sid,"ArrowUp");time.sleep(.2)
 menu=shot(sid,"m11-original-menu")
 key(sid,"Enter");time.sleep(.2)
 dialogue=shot(sid,"m11-original-dialogue")
 mode=js(sid,"return {controller:document.getElementById('controller-mode').textContent,musicLabel:document.getElementById('controller-music').textContent,status:document.getElementById('runtime-status').textContent};")
 req("DELETE",f"/session/{sid}")
 print(json.dumps({"music0":music0,"music1":music1,"music2":music2,"advanced":music2.get("currentTime",0)>music1.get("currentTime",0)+0.5,"statusDisplay":hidden,"mode":mode,"town":town,"menu":menu,"dialogue":dialogue},ensure_ascii=False,indent=2))
finally:
 proc.terminate()
 try:proc.wait(timeout=5)
 except:proc.kill()