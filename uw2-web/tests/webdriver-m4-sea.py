import subprocess,json,time,urllib.request,base64,os
PORT=4459;base=f"http://127.0.0.1:{PORT}"
proc=subprocess.Popen(["/snap/bin/geckodriver","--port",str(PORT)],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
def req(method,path,data=None):
 body=None if data is None else json.dumps(data).encode()
 q=urllib.request.Request(base+path,data=body,method=method,headers={"Content-Type":"application/json"})
 with urllib.request.urlopen(q,timeout=30) as r:return json.loads(r.read().decode() or "{}")
def js(sid,script):return req("POST",f"/session/{sid}/execute/sync",{"script":script,"args":[]})["value"]
def state(sid):
 return js(sid,"return {status:document.getElementById('runtime-status').textContent,debug:document.getElementById('debug').textContent};")
try:
 for _ in range(80):
  try:urllib.request.urlopen(base+"/status",timeout=1).read();break
  except:time.sleep(.1)
 ses=req("POST","/session",{"capabilities":{"alwaysMatch":{"browserName":"firefox","moz:firefoxOptions":{"args":["-headless"]}}}})
 sid=ses["value"]["sessionId"];req("POST",f"/session/{sid}/window/rect",{"width":1500,"height":1400})
 req("POST",f"/session/{sid}/url",{"url":"http://127.0.0.1:18082/"})
 for _ in range(180):
  ready=js(sid,"return {run:!document.getElementById('run-button').disabled,slots:document.querySelectorAll('#save-slots button:not(:disabled)').length,status:document.getElementById('runtime-status').textContent};")
  if ready["run"] and ready["slots"]>=2:break
  time.sleep(.2)
 # select second populated save (Danzig)
 js(sid,"document.querySelectorAll('#save-slots button:not(:disabled)')[1].click(); return true;")
 js(sid,"document.getElementById('run-button').click(); return true;");time.sleep(.3)
 town=state(sid)
 # up into harbor
 js(sid,"window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true,cancelable:true}));return true;");time.sleep(.2)
 harbor=state(sid)
 # Enter sail
 js(sid,"window.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));return true;");time.sleep(.5)
 sea=state(sid)
 el=req("POST",f"/session/{sid}/element",{"using":"css selector","value":"#screen"})["value"];eid=el["element-6066-11e4-a52e-4f735466cecf"]
 png=req("GET",f"/session/{sid}/element/{eid}/screenshot")["value"]
 p0="/home/chatgpt-runner/uw2-web/tests/m4-sea-start.png";open(p0,"wb").write(base64.b64decode(png))
 # try directions until movement succeeds
 attempts=[]
 for k in range(8):
  js(sid,"window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true,cancelable:true}));return true;");time.sleep(.08)
  st=state(sid); d=json.loads(st["debug"]); attempts.append(d)
  if d.get("steps",0)>0: break
  js(sid,"window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));return true;");time.sleep(.05)
 moved=state(sid)
 png=req("GET",f"/session/{sid}/element/{eid}/screenshot")["value"]
 p1="/home/chatgpt-runner/uw2-web/tests/m4-sea-moved.png";open(p1,"wb").write(base64.b64decode(png))
 req("DELETE",f"/session/{sid}")
 print(json.dumps({"town":town,"harbor":harbor,"sea":sea,"moved":moved,"attempts":attempts,
   "shots":[p0,p1],"sizes":[os.path.getsize(p0),os.path.getsize(p1)]},ensure_ascii=False,indent=2))
finally:
 proc.terminate()
 try:proc.wait(timeout=5)
 except:proc.kill()