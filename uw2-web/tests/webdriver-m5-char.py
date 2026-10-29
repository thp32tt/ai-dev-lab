import subprocess,json,time,urllib.request,base64,os
PORT=4463;base=f"http://127.0.0.1:{PORT}"
proc=subprocess.Popen(["/snap/bin/geckodriver","--port",str(PORT)],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
def req(method,path,data=None):
 body=None if data is None else json.dumps(data).encode()
 q=urllib.request.Request(base+path,data=body,method=method,headers={"Content-Type":"application/json"})
 with urllib.request.urlopen(q,timeout=30) as r:return json.loads(r.read().decode() or "{}")
def js(sid,script):return req("POST",f"/session/{sid}/execute/sync",{"script":script,"args":[]})["value"]
try:
 for _ in range(80):
  try:urllib.request.urlopen(base+"/status",timeout=1).read();break
  except:time.sleep(.1)
 ses=req("POST","/session",{"capabilities":{"alwaysMatch":{"browserName":"firefox","moz:firefoxOptions":{"args":["-headless"]}}}})
 sid=ses["value"]["sessionId"];req("POST",f"/session/{sid}/window/rect",{"width":1500,"height":1400})
 req("POST",f"/session/{sid}/url",{"url":"http://127.0.0.1:18082/"})
 for _ in range(180):
  ok=js(sid,"return !document.getElementById('run-button').disabled && document.querySelectorAll('#save-slots button:not(:disabled)').length>=2")
  if ok:break
  time.sleep(.2)
 # first save, Catalina/Tunis
 js(sid,"document.querySelectorAll('#save-slots button:not(:disabled)')[0].click();document.getElementById('run-button').click();return true;")
 time.sleep(.35)
 el=req("POST",f"/session/{sid}/element",{"using":"css selector","value":"#screen"})["value"];eid=el["element-6066-11e4-a52e-4f735466cecf"]
 def shot(path):
  png=req("GET",f"/session/{sid}/element/{eid}/screenshot")["value"];open(path,"wb").write(base64.b64decode(png))
 p0="/home/chatgpt-runner/uw2-web/tests/m5-town-char-start.png";shot(p0)
 start=js(sid,"return {status:document.getElementById('runtime-status').textContent,debug:document.getElementById('debug').textContent};")
 # move left (safe from prior validation)
 js(sid,"window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true,cancelable:true}));return true;");time.sleep(.2)
 p1="/home/chatgpt-runner/uw2-web/tests/m5-town-char-left.png";shot(p1)
 moved=js(sid,"return {status:document.getElementById('runtime-status').textContent,debug:document.getElementById('debug').textContent};")
 req("DELETE",f"/session/{sid}")
 print(json.dumps({"start":start,"moved":moved,"shots":[p0,p1],"sizes":[os.path.getsize(p0),os.path.getsize(p1)]},ensure_ascii=False,indent=2))
finally:
 proc.terminate()
 try:proc.wait(timeout=5)
 except:proc.kill()