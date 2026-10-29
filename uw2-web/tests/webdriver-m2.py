import subprocess, json, time, urllib.request, base64, os
PORT=4455
base=f"http://127.0.0.1:{PORT}"
proc=subprocess.Popen(["/snap/bin/geckodriver","--port",str(PORT)],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
def req(method,path,data=None):
 body=None if data is None else json.dumps(data).encode()
 q=urllib.request.Request(base+path,data=body,method=method,headers={"Content-Type":"application/json"})
 with urllib.request.urlopen(q,timeout=30) as r:return json.loads(r.read().decode() or "{}")
try:
 for _ in range(80):
  try: urllib.request.urlopen(base+"/status",timeout=1).read(); break
  except: time.sleep(.1)
 ses=req("POST","/session",{"capabilities":{"alwaysMatch":{"browserName":"firefox","moz:firefoxOptions":{"args":["-headless"]}}}})
 sid=ses["value"]["sessionId"]
 req("POST",f"/session/{sid}/window/rect",{"width":1500,"height":1400})
 req("POST",f"/session/{sid}/url",{"url":"http://127.0.0.1:18082/"})
 state={}
 for _ in range(150):
  state=req("POST",f"/session/{sid}/execute/sync",{"script":"""
    return {
      ready:document.readyState,
      opening:document.getElementById('opening-status')?.textContent,
      cards:document.querySelectorAll('#opening-gallery canvas').length,
      runtime:document.getElementById('runtime-status')?.textContent,
      debug:document.getElementById('debug')?.textContent,
      port:document.getElementById('portmap-status')?.textContent,
      portraits:document.querySelectorAll('#portraits canvas').length
    };
  ""","args":[]})["value"]
  if state.get("cards",0)>=8 and "108 GRAPH" in (state.get("opening") or "") and state.get("runtime")=="원본 OPGRAPH 오프닝 화면":
    break
  time.sleep(.2)
 el=req("POST",f"/session/{sid}/element",{"using":"css selector","value":"#screen"})["value"]
 eid=el["element-6066-11e4-a52e-4f735466cecf"]
 png=req("GET",f"/session/{sid}/element/{eid}/screenshot")["value"]
 p1="/home/chatgpt-runner/uw2-web/tests/browser-opening-canvas.png";open(p1,"wb").write(base64.b64decode(png))
 # click selected save run
 req("POST",f"/session/{sid}/execute/sync",{"script":"document.getElementById('run-button').click(); return true;","args":[]})
 time.sleep(.7)
 runtime=req("POST",f"/session/{sid}/execute/sync",{"script":"return {status:document.getElementById('runtime-status').textContent,debug:document.getElementById('debug').textContent};","args":[]})["value"]
 png2=req("GET",f"/session/{sid}/element/{eid}/screenshot")["value"]
 p2="/home/chatgpt-runner/uw2-web/tests/browser-m2-runtime.png";open(p2,"wb").write(base64.b64decode(png2))
 req("DELETE",f"/session/{sid}")
 print(json.dumps({"openingState":state,"runtime":runtime,"shots":[p1,p2],"sizes":[os.path.getsize(p1),os.path.getsize(p2)]},ensure_ascii=False,indent=2))
finally:
 proc.terminate()
 try:proc.wait(timeout=5)
 except:proc.kill()