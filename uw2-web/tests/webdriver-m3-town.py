import subprocess, json, time, urllib.request, base64, os
PORT=4457
base=f"http://127.0.0.1:{PORT}"
proc=subprocess.Popen(["/snap/bin/geckodriver","--port",str(PORT)],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
def req(method,path,data=None):
 body=None if data is None else json.dumps(data).encode()
 q=urllib.request.Request(base+path,data=body,method=method,headers={"Content-Type":"application/json"})
 with urllib.request.urlopen(q,timeout=30) as r:return json.loads(r.read().decode() or "{}")
def js(sid,script):
 return req("POST",f"/session/{sid}/execute/sync",{"script":script,"args":[]})["value"]
try:
 for _ in range(80):
  try: urllib.request.urlopen(base+"/status",timeout=1).read(); break
  except: time.sleep(.1)
 ses=req("POST","/session",{"capabilities":{"alwaysMatch":{"browserName":"firefox","moz:firefoxOptions":{"args":["-headless"]}}}})
 sid=ses["value"]["sessionId"]
 req("POST",f"/session/{sid}/window/rect",{"width":1500,"height":1400})
 req("POST",f"/session/{sid}/url",{"url":"http://127.0.0.1:18082/"})
 state={}
 for _ in range(160):
  state=js(sid,"""
    return {
      ready:document.readyState,
      status:document.getElementById('runtime-status')?.textContent,
      runDisabled:document.getElementById('run-button')?.disabled,
      port:document.getElementById('portmap-status')?.textContent,
      opening:document.getElementById('opening-status')?.textContent
    };
  """)
  if not state.get("runDisabled",True) and "108 GRAPH" in (state.get("opening") or ""): break
  time.sleep(.2)
 js(sid,"document.getElementById('run-button').click(); return true;")
 time.sleep(.4)
 start=js(sid,"return {status:document.getElementById('runtime-status').textContent,debug:document.getElementById('debug').textContent};")
 el=req("POST",f"/session/{sid}/element",{"using":"css selector","value":"#screen"})["value"]
 eid=el["element-6066-11e4-a52e-4f735466cecf"]
 png=req("GET",f"/session/{sid}/element/{eid}/screenshot")["value"]
 p0="/home/chatgpt-runner/uw2-web/tests/m3-town-start.png"; open(p0,"wb").write(base64.b64decode(png))

 js(sid,"window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true,cancelable:true})); return true;")
 time.sleep(.25)
 building=js(sid,"return {status:document.getElementById('runtime-status').textContent,debug:document.getElementById('debug').textContent};")
 png=req("GET",f"/session/{sid}/element/{eid}/screenshot")["value"]
 p1="/home/chatgpt-runner/uw2-web/tests/m3-town-pub.png"; open(p1,"wb").write(base64.b64decode(png))

 js(sid,"window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})); return true;")
 time.sleep(.2)
 after=js(sid,"return {status:document.getElementById('runtime-status').textContent,debug:document.getElementById('debug').textContent};")
 # move left once to prove active movement
 js(sid,"window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true,cancelable:true})); return true;")
 time.sleep(.2)
 moved=js(sid,"return {status:document.getElementById('runtime-status').textContent,debug:document.getElementById('debug').textContent};")
 png=req("GET",f"/session/{sid}/element/{eid}/screenshot")["value"]
 p2="/home/chatgpt-runner/uw2-web/tests/m3-town-moved.png"; open(p2,"wb").write(base64.b64decode(png))
 req("DELETE",f"/session/{sid}")
 print(json.dumps({
   "initial":state,"townStart":start,"building":building,"afterEscape":after,"afterLeft":moved,
   "shots":[p0,p1,p2],"sizes":[os.path.getsize(p0),os.path.getsize(p1),os.path.getsize(p2)]
 },ensure_ascii=False,indent=2))
finally:
 proc.terminate()
 try:proc.wait(timeout=5)
 except:proc.kill()