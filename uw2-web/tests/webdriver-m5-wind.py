import subprocess,json,time,urllib.request,base64,os
PORT=4465;base=f"http://127.0.0.1:{PORT}"
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
  if js(sid,"return !document.getElementById('run-button').disabled && document.querySelectorAll('#save-slots button:not(:disabled)').length>=2"):break
  time.sleep(.2)
 js(sid,"document.querySelectorAll('#save-slots button:not(:disabled)')[1].click();document.getElementById('run-button').click();return true;");time.sleep(.2)
 js(sid,"window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true,cancelable:true}));return true;");time.sleep(.1)
 js(sid,"window.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));return true;");time.sleep(.35)
 state=js(sid,"return {status:document.getElementById('runtime-status').textContent,debug:JSON.parse(document.getElementById('debug').textContent)};")
 el=req("POST",f"/session/{sid}/element",{"using":"css selector","value":"#screen"})["value"];eid=el["element-6066-11e4-a52e-4f735466cecf"]
 png=req("GET",f"/session/{sid}/element/{eid}/screenshot")["value"]
 p="/home/chatgpt-runner/uw2-web/tests/m5-sea-wind.png";open(p,"wb").write(base64.b64decode(png))
 req("DELETE",f"/session/{sid}")
 print(json.dumps({"state":state,"shot":p,"size":os.path.getsize(p)},ensure_ascii=False,indent=2))
finally:
 proc.terminate()
 try:proc.wait(timeout=5)
 except:proc.kill()